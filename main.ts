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
  withdrawPage,
  confirmPage,
  selectTimePage,
  startBoost,
  tokenAddressPage,
} from './bot/utils';
import { inputAmountPage } from './bot/withdrawPage';
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
      if (currentUser.id === call.message!.chat.id.toString()) {
        currentUser.chain = 'eth';
        await timePage(bot, call.message!);
      }
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

    case 'delete':
      await bot.deleteMessage(call.message!.chat.id, call.message!.message_id);
      // bot.clearStepHandlerByChatId(call.message!.chat.id);
      break;

    case 'input_amount':
      await inputAmountPage(call.message!, currentUser);
      break;

    case 'confirm':
      await confirmPage(call.message!, currentUser);
      break;

    case 'pack_type_0.2':
      let data,
        fee = 0,
        bal,
        wallet_bal = 0,
        symbol,
        wallet_addr;

      if (currentUser.id == call.message?.chat.id) {
        await updateEthBoostingList(
          currentUser.id,
          'eth',
          undefined,
          0.2,
          undefined
        );

        currentUser.amount = call.data!.split('_')[2];
        data = { txnFee: 0 };

        if (currentUser.chain == 'eth') data = await getEstimateGas();
        // if (currentUser.chain == 'bsc')
        // data = bsc_util.getEstimateGas()
        fee = data.txnFee;

        if (currentUser.amount == 0.2) fee = parseFloat((fee * 100).toFixed(4));
        if (currentUser.amount == 0.35)
          fee = parseFloat((fee * 175).toFixed(4));
        if (currentUser.amount == 0.6) fee = parseFloat((fee * 300).toFixed(4));
        if (currentUser.amount == 1) fee = parseFloat((fee * 500).toFixed(4));

        const amount = (parseFloat(currentUser.amount) + fee).toFixed(3);

        await updateUserFee(currentUser.id, fee);

        if (currentUser.chain == 'eth') {
          bal = await getWalletBalance(currentUser.wallets.ether.publicKey);
          wallet_bal = parseFloat(bal.eth);
          symbol = 'ETH';
          wallet_addr = currentUser.wallets.ether.publicKey;
        }
        // if (currentUser.chain == 'bsc') {
        //   bal = bsc.getWalletBalance(currentUser['wallets']['ether']['publicKey']);
        //   wallet_bal = bal['bnb'];
        //   symbol = 'BNB';
        //   wallet_addr = currentUser['wallets']['ether']['publicKey'];
        // }

        await bot.sendMessage(
          call.message!.chat.id,
          `🤖 Each pack is designed to give you a x500 the volume you pay (excluding tx fee).\n` +
            `🤖 You don’t have to deposit funds for the tx, we will use our funds to generate the volume, you just have to pay the service fee + the tx fee.\n` +
            `🤖 If you have tax in the contract then you will receive less volume because you will receive some money back, we will automatically use 100% of the funds as if it were 0% tax.\n` +
            `🤖 Honeypot detector.\n` +
            `🤖 Liquidity pool need to be locked for at least 30 days or burned.\n` +
            `🤖 Only contracts with less than 10% tax fee are accepted, any interactions with the functions of the token contract will stop the bot and you will lose your funds, if we evaluate that it was a non-malignant function then we will restart the bot.\n` +
            `❗️ If you have a token with tax then exclude these wallet from the tx fees in your contract:\n` +
            `Send to the wallet address below the total funds that are told to you based on the pack you choose and the gas fees.\n` +
            `<i>You choose the ${currentUser.amount} ${symbol} pack, send this ${symbol} + Tx Fee in one Tx.</i>\n` +
            `<i>${currentUser.amount} ${symbol} + ${fee} ${symbol} = ${amount} ${symbol}</i>\n` +
            `Mode ${currentUser.mode}\n` +
            `🔗 <b>Wallet Address</b> : <code>${wallet_addr}</code>\n` +
            `<b>Balance</b>: ${wallet_bal}\n` +
            `<b>Gas Price</b>: <i>${data.gasPrice} GWEI</i>\n` +
            `<i>Gas price are updated in real time.</i>\n` +
            `<b>Tx Fee</b>: <i>${fee} ${symbol}</i>\n` +
            `<i>If the gas fees will go lower than when you paid then you will receive more volume, if they go higher you will receive less, when we make the swaps we use the gas fees in real time, you can check on etherscan or here in the bot.</i>\n`,
          { parse_mode: 'HTML' }
        );

        await tokenPage(call.message);

        // bot.once(`message`, async (msg) => {
        //   if (msg.text) {
        //     const address = msg.text;

        //     if (w3.utils.isAddress(address)) {
        //       // await tokenAddressPage(call.message, address);
        //       await tokenAddressPage(address);
        //     } else {
        //       await bot.sendMessage(
        //         call.message!.chat.id,
        //         `❗️ Type correct Token address ❗️`
        //       );
        //       await tokenPage(call.message);
        //     }
        //   }
        // });
      }
      break;

    case 'time_page':
      await homePage(bot, call.message!);
      break;

    case 'sendTokenAddr':
      await tokenPage(call.message);

      bot.once('message', async (msg) => {});
      break;

    case 'select_time_6':
      currentUser = await selectTimePage(call, currentUser, 6);
      break;

    case 'select_time_24':
      currentUser = await selectTimePage(call, currentUser, 24);
      break;

    case 'select_time_7':
      currentUser = await selectTimePage(call, currentUser, 7);
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

bot.startPolling();
console.log('Bot started ❤❤❤');

// tokenAddressPage('0x7D216a0392ebB008795053d19E881a67A72367d8');

// cron.schedule("*/1 * * *", async() => {
//   console.log("running a task every 1 minute ❤❤❤");

// })
