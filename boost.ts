import { setTimeout } from 'timers';
import express from 'express';
// import * as uvicorn from 'uvicorn';
import { ETHLiquidity } from './chain/ether/ETHLiquidity';
import { getPairAddress } from './chain/ether/utils';
import { sendETHToWallet } from './chain/ether/wallet';
import { BASE_WALLET_ADDRESS, BASE_WALLET_PRIVATE_KEY } from './utils/constant';
import { saveNewWallet } from './db/helper';

let solBoost: any[] = [];
let ethBoost: any[] = [];
let bscBoost: any[] = [];
let eventEth = true;
let eventSol = true;

interface EthItem {
  userId: string;
  tokenAddress: string;
  walletAddress: string;
  privateKey: string;
  totalTxns: number;
  speed: number;
  serviceFee: number;
  amount: number;
  tradeAmount: number;
}

const PORT = process.env.PORT || 9030;

const processSolana = () => {
  while (eventSol) {
    for (let item of solBoost) {
      try {
        if (item.isBoost) {
          item.processTransaction();
        } else {
          const index = solBoost.indexOf(item);
          if (index !== -1) solBoost.splice(index, 1);
        }
      } catch (e) {
        console.log(`Error processing Solana transaction: ${e}`);
      }
    }
    console.log('sol');
    setTimeout(() => {}, 5000); // Delay for 5 seconds
  }
};

const processEthereum = async () => {
  while (eventEth) {
    for (let item of [...ethBoost]) {
      try {
        console.log('item: ', item.isBoost);
        item.calcTime += 1;
        if (item.txn === 0) {
          console.log('txn: 0');
          item.isBoost = false;
          ethBoost = ethBoost.filter((el) => el !== item);
        }
        if (item.calcTime % item.speed === 0 && item.txn !== 0) {
          if (item.isBoost) {
            console.log('item working: ', item.isWorking);
            if (!item.isWorking) {
              await item.processTransaction();
            }
          } else {
            ethBoost = ethBoost.filter((el) => el !== item);
          }
        }
      } catch (e) {
        ethBoost = ethBoost.filter((el) => el !== item);
        console.log(`Error processing Ethereum transaction: ${e}`);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 120000)); // 2 minutes sleep
  }
};

const stopEthBoostItem = (userId: string) => {
  for (let item of ethBoost) {
    if (item.id === userId) {
      item.isBoost = false;
      return;
    }
  }
};

const app = express();

const runLoop = async () => {
  // await Promise.all([processEthereum(), processBSC()]);
  await Promise.all([processEthereum()]);
};

const startServer = async (app: express.Express) => {
  try {
    const threadEth = new Thread(() => runLoop());
    threadEth.start();
    console.log('start...');
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });

    while (true) {
      setTimeout(() => {}, 100); // Sleep for 100ms
    }
  } catch (error) {
    eventEth = false;
    console.error('Error starting the server: ', error);
  }
};

app.get('/', async (request: Request, reply: Response) => {
  return { message: 'Hello World' };
});

app.post('/api/eth/add', async (request: Request, reply: Response) => {
  const item: EthItem = request.body as EthItem;
  const pair = getPairAddress(item.tokenAddress);
  if (!pair) {
    return { success: false };
  }
  sendETHToWallet(
    item.walletAddress,
    BASE_WALLET_ADDRESS,
    item.amount.toString(),
    item.privateKey
  );
  const boost = new ETHLiquidity(
    item.userId,
    'v2',
    item.tokenAddress,
    BASE_WALLET_ADDRESS,
    BASE_WALLET_PRIVATE_KEY,
    item.totalTxns,
    item.speed.toString(),
    item.tradeAmount
  );
  if (ethBoost.length > 0) {
    return { success: false };
  }
  ethBoost.push(boost);
  return { success: true };
});

app.get('/api/eth/status', async (request: Request, reply: Response) => {
  const num = ethBoost.length;
  return { busy: num >= 1 };
});

const main = () => {
  startServer(app);
};

main();
