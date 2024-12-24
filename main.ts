import TelegramBot from 'node-telegram-bot-api';
import {
  InlineKeyboardMarkup,
  InlineKeyboardButton,
  Message,
  CallbackQuery,
} from 'node-telegram-bot-api';

import {
  isExistUser,
  insertUser,
  getUser,
  checkTokenAddress,
  updateEthBoostingList,
  updateUserFee,
} from './db'; // Assuming API helper methods are available
import { getWalletBalance, sendETHToWallet } from './chain/ether/wallet';
import { API_TOKEN, MongoDbURL } from './utils/constant';
import { connectMongoDB } from './utils/db';
import { getEstimateGas } from './chain/ether/utils';
// import * as bsc from './chain/bsc/wallet';
// import * as bscUtil from './chain/bsc/utils';
// import * as bscBot from './bot/bsc';
import {
  homePage,
  timePage,
  mainMenu,
  w3,
  confirmPage,
  selectTimePage,
  startBoost,
  tokenAddressPage,
  packTypePage,
  startPage,
} from './bot';
import { inputAmountPage, withdrawPage } from './bot/withdrawPage';
import { inputToken, tokenPage } from './bot/tokenPage';
import { addEthStatus } from './boost';

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
      return;

    case 'bsc':
      break;

    // case 'all':
    //   // bot.clearStepHandlerByChatId(call.message!.chat.id);
    //   for (let item of currentUserList) {
    //     if (item.id === call.message!.chat.id) {
    //       let balance = 0;
    //       let symbol = '';
    //       let bal: any;
    //       if (item.chain === 'eth') {
    //         const bal = await getWalletBalance(item.wallets.ether.publicKey);
    //         balance = parseFloat(bal.eth);
    //         symbol = 'ETH';
    //       }
    //       // if (item.chain === 'bsc') {
    //       //   const bal = bsc.getWalletBalance(item.wallets.ether.publicKey);
    //       //   balance = bal.bsc;
    //       //   symbol = 'BNB';
    //       // }
    //       if (parseFloat(bal.eth) - 0.003 <= 0) {
    //         bot.sendMessage(call.message!.chat.id, 'Insufficient funds');
    //         homePage(bot, call.message!);
    //         return;
    //       }
    //       item.withdrawAmount = balance - 0.003;
    //       const buttons: InlineKeyboardButton[][] = [
    //         [{ text: '✅ Confirm', callback_data: 'confirm' }],
    //         [{ text: '👈 Return', callback_data: 'input_amount' }],
    //       ];
    //       const keyboard: InlineKeyboardMarkup = { inline_keyboard: buttons };
    //       bot.sendMessage(
    //         call.message!.chat.id,
    //         `<b>Recipient Address</b>\n${item.receiver}\n\n<b>Amount</b>\n${balance} ${symbol}`,
    //         {
    //           reply_markup: keyboard,
    //           parse_mode: 'HTML',
    //         }
    //       );
    //       return;
    //     }
    //   }
    //   break;

    case 'withdraw':
      await withdrawPage(call.message!);
      break;

    case 'input_amount':
      await inputAmountPage(call.message!, currentUser);
      break;

    case 'confirm':
      await confirmPage(call.message!, currentUser);
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

    case 'select_time_24':
      await selectTimePage(call.message!, 24);
      break;

    case 'select_time_7':
      await selectTimePage(call.message!, 7);
      break;

    case 'token_page':
      await tokenPage(call.message);
      break;

    case 'server':
      const response = addEthStatus();

      console.log('response.busy :>> ', response.busy);
      if (response.busy) {
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

// bot.startPolling();
// console.log('Bot started ❤❤❤');

// tokenAddressPage('0x7D216a0392ebB008795053d19E881a67A72367d8');
// cron.schedule("*/1 * * *", async() => {
//   console.log("running a task every 1 minute ❤❤❤");

// })
