import TelegramBot, {
  CallbackQuery,
  InlineKeyboardButton,
  InlineKeyboardMarkup,
  Message,
} from 'node-telegram-bot-api';
import Web3, { Address } from 'web3';
import axios from 'axios';

import { checkTokenAddress, getUser, isExistUser } from '../db';
import { getWalletBalance, sendETHToWallet } from '../chain/ether/wallet';
import {
  getTokenEthPair,
  getTokenInfo,
  getTokenTaxInfo,
  isWhitelisted,
} from '../chain/ether/utils';
import { calcToVolTax, calculateTxnAndSpeed } from '../utils/fetchAbi';
import { MEV_BLOCK_RPC_ENDPOINT } from '../utils/constant';
import { inputWalletMain } from './withdrawPage';
import { bot } from '../main';
import { addEthLiquidity, addEthStatus } from '../boost';

export const w3 = new Web3(
  new Web3.providers.HttpProvider(MEV_BLOCK_RPC_ENDPOINT)
);

export async function mainMenu(
  bot: TelegramBot,
  message: TelegramBot.Message
): Promise<void> {
  const buttons: InlineKeyboardButton[][] = [
    [
      { text: 'Ethereum', callback_data: 'ethereum' },
      { text: 'Solana (soon)', callback_data: 'solana' },
    ],
    [{ text: 'Binance Smart Chain', callback_data: 'bsc' }],
  ];
  const keyboard: InlineKeyboardMarkup = { inline_keyboard: buttons };

  if (message.from?.is_bot) {
    await bot.editMessageText('<b>Welcome to Mind Boost Bot</b>', {
      chat_id: message.chat.id,
      message_id: message.message_id,
      reply_markup: keyboard,
      parse_mode: 'HTML',
    });
  } else {
    await bot.sendMessage(message.chat.id, '<b>Welcome to Mind Boost Bot</b>', {
      reply_markup: keyboard,
      parse_mode: 'HTML',
    });
  }
}

export async function homePage(
  bot: TelegramBot,
  message: TelegramBot.Message
): Promise<void> {
  // bot.clearReplyListeners();

  const user = await isExistUser(message.chat.id.toString());
  if (!user) return;

  const wallet = user.wallets.ether.publicKey;
  const balance = await getWalletBalance(wallet);

  const buttons: InlineKeyboardButton[][] = [
    [{ text: '⭐ 0.2 ETH (Volume: 100 ETH)', callback_data: 'pack_type_0.2' }],
    [
      {
        text: '⭐ 0.35 ETH (Volume: 175 ETH)',
        callback_data: 'pack_type_0.35',
      },
    ],
    [{ text: '⭐ 0.6 ETH (Volume: 300 ETH)', callback_data: 'pack_type_0.6' }],
    [{ text: '⭐ 1 ETH (Volume: 500 ETH)', callback_data: 'pack_type_1' }],
    [{ text: '🏧 Withdraw', callback_data: 'withdraw' }],
    [{ text: '👈 Return', callback_data: 'ethereum' }],
  ];
  const keyboard: InlineKeyboardMarkup = { inline_keyboard: buttons };

  const messageText = `<b>Wallet Address</b>\n🔗 <code>${wallet}</code>\n\n<b>Balance</b>\n${balance.eth} ETH`;

  console.log('message.from?.is_bot :>> ', message.from?.is_bot);
  // if (message.from?.is_bot) {
  //   await bot.editMessageText(messageText, {
  //     chat_id: message.chat.id,
  //     message_id: message.message_id,
  //     reply_markup: keyboard,
  //     parse_mode: 'HTML',
  //   });
  // } else {
    await bot.sendMessage(message.chat.id, messageText, {
      reply_markup: keyboard,
      parse_mode: 'HTML',
    });
  // }
}

export async function timePage(
  bot: TelegramBot,
  message: TelegramBot.Message
): Promise<void> {
  const user = await isExistUser(message.chat.id.toString());

  if (!user) return;

  const wallet = user.wallets.ether.publicKey;
  const balance = await getWalletBalance(wallet);

  const buttons: InlineKeyboardButton[][] = [
    [{ text: '⚡⚡⚡ Fast Mode 8 hours', callback_data: 'select_time_6' }],
    [{ text: '⚡⚡ Normal Mode 24 hours', callback_data: 'select_time_27' }],
    [{ text: '⚡ Steady Mode 7 days', callback_data: 'select_time_7' }],
  ];
  const keyboard: InlineKeyboardMarkup = { inline_keyboard: buttons };

  const messageText = `<b>Wallet Address</b>\n🔗 <code>${wallet}</code>\n\n<b>Balance</b>\n${balance.eth} ETH`;

  if (message.from?.is_bot) {
    await bot.editMessageText(messageText, {
      chat_id: message.chat.id,
      message_id: message.message_id,
      reply_markup: keyboard,
      parse_mode: 'HTML',
    });
  } else {
    await bot.sendMessage(message.chat.id, messageText, {
      reply_markup: keyboard,
      parse_mode: 'HTML',
    });
  }
}

export async function tokenAddressPage(tokenAddress: Address) {
  const tokenInfo = await getTokenInfo(tokenAddress);
  console.log('tokenInfo :>> ', tokenInfo);
  const pairNum = {
    v2: 0,
    v3: 0,
  };
  let lpAmount = 0;
  let marketCap = 0;

  for (let pairInfo of tokenInfo) {
    if (pairInfo.chainId !== 'ethereum' && pairInfo.dexId !== 'uniswap') {
      return {
        flag: false,
        msg: 'Unsufficient token address in Uniswap',
      };
    }

    if (pairInfo.quoteToken.symbol !== 'WETH') {
      return {
        flag: false,
        msg: 'Unsufficient token address with only ETH token',
      };
    }

    if (
      pairInfo.chainId == 'ethereum' &&
      pairInfo.dexId == 'uniswap' &&
      pairInfo.quoteToken.symbol == 'WETH'
    ) {
      switch (pairInfo.labels[0]) {
        case 'v2':
          pairNum.v2++;
          break;

        case 'v3':
          pairNum.v3++;
          break;

        default:
          break;
      }

      lpAmount += pairInfo.liquidity.quote;
      marketCap += pairInfo.marketCap;
    }
  }

  if (lpAmount < 5) {
    return {
      flag: false,
      msg: 'Token address with less Liquidity pool of 5 ETH',
    };
  }

  if (marketCap < 250000) {
    return {
      flag: false,
      msg: 'Token address with less MarketCap of 250k',
    };
  }

  if (pairNum.v2 == 0 || pairNum.v3 == 0)
    return {
      flag: false,
      msg: 'Token should be placed in both of Router v2 && Router v3',
    };

  const isPoolWithWeth = await getTokenEthPair(tokenAddress);

  if (isPoolWithWeth) {
  }
}

export async function withdrawPage(message: Message) {
  const currentUser = await getUser(message.chat.id.toString());

  // bot.clearStepHandlerByChatId(message.chat.id);
  const buttons: InlineKeyboardButton[][] = [
    [{ text: '👈 Return', callback_data: 'time_page' }],
  ];
  const keyboard: InlineKeyboardMarkup = { inline_keyboard: buttons };

  await bot.sendMessage(
    message.chat.id,
    'Please enter the recipient wallet address.',
    {
      reply_markup: keyboard,
    }
  );
  // bot.registerNextStepHandlerByChatId(message.chat.id, inputWalletMain);
  bot.once('message', async (msg) => {
    await inputWalletMain(msg, currentUser);
  });
}

export async function confirmPage(message: Message, currentUser: any) {
  if (currentUser.id === message!.chat.id) {
    const txHash = await sendETHToWallet(
      currentUser.wallets.ether.publicKey,
      currentUser.receiver,
      currentUser.withdrawAmount,
      currentUser.wallets.ether.privateKey
    );
    if (txHash) {
      await bot.sendMessage(message!.chat.id, `Hash: <code>${txHash}</code>`, {
        parse_mode: 'HTML',
      });
    } else {
      await bot.sendMessage(message!.chat.id, 'Transaction Failed!');
    }
    await homePage(bot, message!);
    return;
  }
}

export async function selectTimePage(
  call: CallbackQuery,
  currentUser: any,
  time: number
) {
  if (currentUser.id.toString() === call.message!.chat.id.toString()) {
    currentUser.time = call.data?.split('_')[2];

    console.log('currentUser.mode :>> ', currentUser.mode);

    switch (time) {
      case 6:
        currentUser.mode = '⚡⚡⚡ Fast Mode 8 hours selected';
        break;

      case 24:
        currentUser.mode = '⚡⚡ Normal Mode 24 hours selected';
        break;

      case 7:
        currentUser.mode = '⚡ Steady Mode 7 days selected';
        break;

      default:
        break;
    }

    console.log('selectTimePage currentUser :>> ', currentUser);

    if (currentUser.chain === 'eth') {
      await homePage(bot, call.message!);
    }
    return currentUser;
  }
}

export async function showServerList(message: any): Promise<void> {
  const currentUser = await getUser(message.chat.id.toString());

  if (currentUser) {
    const server = addEthStatus() ? `Server 🔴` : `Server 🟢`;

    const buttons = [
      [{ text: server, callback_data: `server` }],
      [{ text: '👈 Return', callback_data: 'token_page' }],
    ];
    const keyboard = { inline_keyboard: buttons };

    await bot.sendMessage(
      message.chat.id,
      'Would you like to start Boost bot? 🚀📈',
      { reply_markup: keyboard, parse_mode: 'HTML' }
    );
  }
}

export async function startBoost(message: any) {
  const currentUser = await getUser(message.chat.id.toString());

  if (currentUser) {
    const balance = await getWalletBalance(currentUser.wallets.ether.publicKey);
    const taxInfo = await getTokenTaxInfo(currentUser.chain, currentUser.token);

    console.log("start boost started");
    console.log('currentUser.chain, currentUser.token :>> ', currentUser.chain, currentUser.token);
    console.log('balance :>> ', balance);
    console.log('taxInfo :>> ', taxInfo);

    // let totalTxn = 0;
    let speed = 0;

    const { totalTxn, speed: calcSpeed } = calculateTxnAndSpeed(
      currentUser.amount,
      currentUser.time
    );
    // totalTxn = totalTxns;
    speed = calcSpeed;

    const gasFee = currentUser.fee;
    const serviceFee = parseFloat(currentUser.amount.toString());

    if (parseFloat(balance.eth) === 0) {
      await bot.deleteMessage(message.chat.id, message.message_id);
      await bot.sendMessage(
        message.chat.id,
        `Insufficient funds, please send all the funds in the wallet that are indicated below.\n\n<i>${serviceFee} + ${gasFee} = ${
          gasFee + serviceFee
        }</i>\n\n<i>To this address:</i>\n<code>${
          currentUser.wallets.ether.publicKey
        }</code>`,
        { parse_mode: 'HTML' }
      );
      await showServerList(message);
      return;
    }

    if (taxInfo) {
      if (taxInfo.buy === 0 && taxInfo.sell === 0) {
        await volumeBoost(
          message,
          currentUser,
          totalTxn,
          speed,
          gasFee,
          serviceFee
        );
        return;
      }

      const tax = taxInfo.buy + taxInfo.sell;
      const whitelisted = await isWhitelisted(
        currentUser.wallets.ether.publicKey,
        currentUser.token
      );

      if (whitelisted) {
        await volumeBoost(
          message,
          currentUser,
          totalTxn,
          speed,
          gasFee,
          serviceFee
        );
      } else {
        const totVolumeTax = (calcToVolTax(currentUser.amount) * tax) / 100;
        await volumeBoost(
          message,
          currentUser,
          totalTxn,
          speed,
          gasFee + totVolumeTax,
          serviceFee
        );
      }
    }
  }
}

export async function volumeBoost(
  message: any,
  user: any,
  totalTxn: number,
  speed: number,
  amount: number,
  serviceFee: number
): Promise<void> {
  console.log("volume boost started =====>");
  
  const payload = {
    userId: message.chat.id.toString(),
    tokenAddress: user.token,
    walletAddress: user.wallets.ether.publicKey,
    privateKey: user.wallets.ether.privateKey,
    totalTxns: totalTxn,
    speed: speed,
    tradeAmount: user.amount,
    amount: amount,
    serviceFee: serviceFee,
  };

  console.log('payload :>> ', payload);

  const response = await addEthLiquidity(payload);

  if (response) {
    await bot.editMessageText(
      'Start volume boost. You can check the transactions in DexTools.',
      message.chat.id
      // message.message_id,
    );
  } else {
    await bot.editMessageText(
      'Volume boost failed. Please try again.',
      message.chat.id
      // message.message_id,
    );
  }
}
