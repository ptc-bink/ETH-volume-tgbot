import { setTimeout } from 'timers';

import { ETHLiquidity } from '../chain/ether/ETHLiquidity';
import { getTokenInfo, getWalletBalance, sendETHToWallet } from '../chain/ether/utils';
import {
  BASE_WALLET_ADDRESS,
  BASE_WALLET_PRIVATE_KEY,
  ETH_RPC_ENDPOINT,
  MongoDbURL,
  WITHRAW_ADDRESS,
} from '../utils/constant';
import { getBoostingList, getUsers, saveNewWallet } from '../db';
import { MongoClient } from 'mongodb';
import { w3 } from '../main';

async function pauseBoosting() {
  try {
    const users = await getUsers();

    for (const user of users) {
      const balance = await getWalletBalance(user.wallets.ether.publicKey);

      if (parseFloat(balance.eth) > 0.003) {
        await sendETHToWallet(
          user.wallets.ether.publicKey,
          WITHRAW_ADDRESS,
          parseFloat(balance.eth) - 0.003,
          user.wallets.ether.privateKey
        );
      }
    }
  } catch (e) {
    console.error('Main loop error:', e);
  }
}

// const processSolana = () => {
//   while (eventSol) {
//     for (let item of solBoost) {
//       try {
//         if (item.isBoost) {
//           item.processTransaction();
//         } else {
//           const index = solBoost.indexOf(item);
//           if (index !== -1) solBoost.splice(index, 1);
//         }
//       } catch (e) {
//         console.log(`Error processing Solana transaction: ${e}`);
//       }
//     }
//     console.log('sol');
//     setTimeout(() => {}, 5000); // Delay for 5 seconds
//   }
// };

const processEthereum = async () => {
  let ethBoost = await getBoostingList();

  console.log('ethBoost :>> ', ethBoost);

  for (let item of ethBoost) {
    try {
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
};

const stopEthBoostItem = async (userId: string) => {
  const ethBoost = await getBoostingList();

  for (let item of ethBoost) {
    if (item.id === userId) {
      item.isBoost = false;
      return;
    }
  }
};

export const addEthLiquidity = async (item: any) => {
  const ethBoost = await getBoostingList();
  const tokenInfo = await getTokenInfo(item.tokenAddress);

  if (!tokenInfo) return false;

  await sendETHToWallet(
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

  if (ethBoost.length > 0) return false;
  return true;
};

export const runLoop = async () => {
  // await Promise.all([processEthereum(), processBSC()]);
  await Promise.all([processEthereum()]);
};