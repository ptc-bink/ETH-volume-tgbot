import TelegramBot from 'node-telegram-bot-api';
import {
  InlineKeyboardMarkup,
  InlineKeyboardButton,
  Message,
  CallbackQuery,
} from 'node-telegram-bot-api';
import cron from "node-cron";

import {
  isExistUser,
  insertUser,
  getUser,
  checkTokenAddress,
  updateEthBoostingList,
  updateUserFee,
  getBoostingList,
} from './db'; // Assuming API helper methods are available
import { API_TOKEN, MEV_BLOCK_RPC_ENDPOINT, MongoDbURL } from './utils/constant';
import { connectMongoDB } from './utils/db';
import { getEstimateGas } from './chain/ether/utils';
// import * as bsc from './chain/bsc/wallet';
// import * as bscUtil from './chain/bsc/utils';
// import * as bscBot from './bot/bsc';
import {
  homePage,
  timePage,
  mainMenu,
  confirmPage,
  selectTimePage,
  startBoost,
  packTypePage,
  startPage,
  allWithdrawPage,
} from './bot';
import { inputAmountPage, withdrawPage } from './bot/withdrawPage';
import { inputToken, tokenPage } from './bot/tokenPage';
import { runLoop } from './boost';
import Web3 from 'web3';

export const w3 = new Web3(new Web3.providers.HttpProvider(MEV_BLOCK_RPC_ENDPOINT));
export const bot = new TelegramBot(API_TOKEN, { polling: true });

bot.on(`message`, async (msg) => {
  if (msg.text!) {
    console.log(`query : ${msg?.chat.id!} => ${msg?.text}`);
  }
  try {
    switch (msg.text!) {
      case `/start`:
        await mainMenu(bot, msg);
        break;

      default:
        break;
    }
  } catch (e) {
    console.log('error -> \n', e);
  }
});

bot.on('callback_query', async (call: CallbackQuery) => {
  let currentUser = await getUser(call.message!.chat.id.toString());

  console.log(`query : ${call.message?.chat.id!} -> ${call.data!}`);

  switch (call.data!) {
    case 'ethereum':
      await startPage(call.message!, 'eth');
      break;

    case 'solana':
      await startPage(call.message!, 'sol');
      return;

    case 'bsc':
      await startPage(call.message!, 'bsc');
      break;

    case 'all':
      await allWithdrawPage(call.message!);
      break;

    case 'withdraw':
      await withdrawPage(call.message!);
      break;

    case 'input_amount':
      await inputAmountPage(call.message!);
      break;

    case 'confirm':
      await confirmPage(call.message!);
      break;

    case 'pack_type_0.2':
      await packTypePage(call.message!, 0.2)
      break;

    case 'pack_type_0.35':
      await packTypePage(call.message!, 0.35)
      break;

    case 'pack_type_0.6':
      await packTypePage(call.message!, 0.6)
      break;

    case 'pack_type_1':
      await packTypePage(call.message!, 1)
      break;

    case 'time_page':
      await homePage(call.message!);
      break;

    case 'sendTokenAddr':
      await tokenPage(call.message);
      break;

    case 'select_time_6':
      await selectTimePage(call.message!, 6);
      break;

    case 'select_time_27':
      await selectTimePage(call.message!, 27);
      break;

    case 'select_time_7':
      await selectTimePage(call.message!, 7);
      break;

    case 'token_page':
      await tokenPage(call.message);
      break;

    case 'server':
      const boostingList = await getBoostingList();

      console.log('response.busy :>> ', boostingList.length);
      if (boostingList.length) {
        await bot.deleteMessage(
          call.message!.chat.id,
          call.message!.message_id
        );

        await inputToken(call.message, currentUser);
        return;
      }
      await startBoost(call.message);
      break;
  }
});

// Load environment variables
connectMongoDB(MongoDbURL as string);
console.log('MongoDB connected ❤❤❤');

bot.startPolling();
console.log('Bot started ❤❤❤');

// tokenAddressPage('0x7D216a0392ebB008795053d19E881a67A72367d8');
cron.schedule("*/1 * * * *", async() => {
  console.log("running a task every 1 minute ❤❤❤");
  await runLoop();
})
