import { setTimeout } from 'timers';
import express from 'express';
import { ETHLiquidity } from '../chain/ether/ETHLiquidity';
import { getTokenInfo } from '../chain/ether/utils';
import { sendETHToWallet } from '../chain/ether/wallet';
import {
  BASE_WALLET_ADDRESS,
  BASE_WALLET_PRIVATE_KEY,
} from '../utils/constant';
import { saveNewWallet } from '../db';

// let solBoost: any[] = [];
let ethBoost: any[] = [];
// let bscBoost: any[] = [];
let eventEth = true;
// let eventSol = true;

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

export const addEthLiquidity = async (item: any) => {
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

  ethBoost.push(boost);

  return true;
};

export const addEthStatus = () => {
  const num = ethBoost.length;

  return { busy: num >= 1 };
};

export const runLoop = async () => {
  // await Promise.all([processEthereum(), processBSC()]);
  await Promise.all([processEthereum()]);
};
