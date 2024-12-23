import * as dotenv from 'dotenv';
import axios from 'axios';
import {
  isExistUser,
  insertUser,
  getUsers,
  checkTokenAddress,
} from './db/helper'; // Assuming API helper methods are available
import { getWalletBalance, sendETHToWallet } from './chain/ether/wallet';
import TelegramBot, {
  InlineKeyboardMarkup,
  InlineKeyboardButton,
  Message,
  CallbackQuery,
} from 'node-telegram-bot-api';
import {
  getTokenTaxInfo,
  isWhitelisted,
  getEstimateGas,
  getTokenEthPair,
  getTokenInfo,
} from './chain/ether/utils';
import { calculateTxnAndSpeed, calcToVolTax } from './utils/utils';
import { SERVER_LIST } from './utils/constant';
// import * as bsc from './chain/bsc/wallet';
// import * as bscUtil from './chain/bsc/utils';
// import * as bscBot from './bot/bsc';
import { homePage, timePage, mainMenu, w3 } from './bot/eth';
import { Address } from 'web3';

dotenv.config();

const API_TOKEN = process.env.BOT_TOKEN!;
const tradeAmount = 0.01;

const bot = new TelegramBot(API_TOKEN, { polling: true });
let currentUserList: Array<any> = [];

bot.on(`message`, async (msg) => {
  const chatId = msg.chat.id!;
  const text = msg.text!;
  const msgId = msg.message_id!;
  const username = msg.from!.username!;

  if (text) console.log(`message : ${chatId} -> ${text}`);
  else return;

  try {
    switch (text) {
      case `/start`:
        const userExists = await isExistUser(msg.chat.id.toString()); // Await the check

        if (!userExists) {
          currentUserList = await insertUser(msg.chat.id.toString());
        } else {
          currentUserList = await getUsers();
        }

        mainMenu(bot, msg);
        break;

      default:
        break;
    }
  } catch (e) {
    console.log('error -> \n', e);
  }
});

bot.on('callback_query', async (call: CallbackQuery) => {
  if (!currentUserList) {
    const userExists = await isExistUser(call.message!.chat.id.toString()); // Await the check

    if (!userExists) {
      currentUserList = await insertUser(call.message!.chat.id.toString());
    } else {
      currentUserList = await getUsers();
    }
    console.log('currentUserList :>> ', currentUserList);
  }

  console.log(`query : ${call.message?.chat.id!} -> ${call.data!}`);

  switch (call.data!) {
    case 'ethereum':
      for (let item of currentUserList) {
        if (item.id === call.message!.chat.id.toString()) {
          item.chain = 'eth';
          timePage(bot, call.message!);
          return;
        }
      }

      console.log(
        'call.message!.chat.id.toString() :>> ',
        call.message!.chat.id.toString()
      );
      console.log('currentUserList :>> ', currentUserList);
      break;

    // case 'solana':
    //   return;

    // case 'bsc':
    //   for (let item of currentUserList) {
    //     if (item.id === call.message!.chat.id) {
    //       item.chain = 'bsc';
    //       bscBot.timePage(bot, call.message);
    //       return;
    //     }
    //   }
    //   break;

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
      withdrawPage(call.message!);
      return;

    case 'delete':
      bot.deleteMessage(call.message!.chat.id, call.message!.message_id);
      // bot.clearStepHandlerByChatId(call.message!.chat.id);
      return;

    case 'input_amount':
      inputAmountPage(call.message!);
      return;

    case 'confirm':
      for (let item of currentUserList) {
        if (item.id === call.message!.chat.id) {
          const txHash = sendETHToWallet(
            item.wallets.ether.publicKey,
            item.receiver,
            item.withdrawAmount,
            item.wallets.ether.privateKey
          );
          if (txHash) {
            bot.sendMessage(
              call.message!.chat.id,
              `Hash: <code>${txHash}</code>`,
              { parse_mode: 'HTML' }
            );
          } else {
            bot.sendMessage(call.message!.chat.id, 'Transaction Failed!');
          }
          homePage(bot, call.message!);
          return;
        }
      }
      break;

    case 'select_time_0.2':
      for (let item of currentUserList) {
        let data,
          fee = 0,
          bal,
          wallet_bal = 0,
          symbol,
          wallet_addr;

        if (item.id == call.message?.chat.id) {
          item.amount = call.data!.split('_')[2];
          data = { txnFee: 0 };

          if (item.chain == 'eth') data = await getEstimateGas();
          // if (item.chain == 'bsc')
          // data = bsc_util.getEstimateGas()
          fee = data.txnFee;

          if (item.amount == '0.2') fee = parseFloat((fee * 100).toFixed(4));
          if (item.amount == '0.35') fee = parseFloat((fee * 175).toFixed(4));
          if (item.amount == '0.6') fee = parseFloat((fee * 300).toFixed(4));
          if (item.amount == '1') fee = parseFloat((fee * 500).toFixed(4));

          const amount = (parseFloat(item.amount) + fee).toFixed(3);

          item.fee = fee;

          if (item.chain == 'eth') {
            bal = await getWalletBalance(item.wallets.ether.publicKey);
            wallet_bal = parseFloat(bal.eth);
            symbol = 'ETH';
            wallet_addr = item.wallets.ether.publicKey;
          }
          // if (item.chain == 'bsc') {
          //   bal = bsc.getWalletBalance(item['wallets']['ether']['publicKey']);
          //   wallet_bal = bal['bnb'];
          //   symbol = 'BNB';
          //   wallet_addr = item['wallets']['ether']['publicKey'];
          // }

          bot.sendMessage(
            call.message!.chat.id,
            `🤖 Each pack is designed to give you a x500 the volume you pay (excluding tx fee).\n` +
            `🤖 You don’t have to deposit funds for the tx, we will use our funds to generate the volume, you just have to pay the service fee + the tx fee.\n` +
            `🤖 If you have tax in the contract then you will receive less volume because you will receive some money back, we will automatically use 100% of the funds as if it were 0% tax.\n` +
            `🤖 Honeypot detector.\n` +
            `🤖 Liquidity pool need to be locked for at least 30 days or burned.\n` +
            `🤖 Only contracts with less than 10% tax fee are accepted, any interactions with the functions of the token contract will stop the bot and you will lose your funds, if we evaluate that it was a non-malignant function then we will restart the bot.\n` +
            `❗️ If you have a token with tax then exclude these wallet from the tx fees in your contract:\n` +
            `Send to the wallet address below the total funds that are told to you based on the pack you choose and the gas fees.\n` +
            `<i>You choose the ${item.amount} ${symbol} pack, send this ${symbol} + Tx Fee in one Tx.</i>\n` +
            `<i>${item.amount} ${symbol} + ${fee} ${symbol} = ${amount} ${symbol}</i>\n` +
            `Mode ${item.mode}\n` +
            `🔗 <b>Wallet Address</b> : <code>${wallet_addr}</code>\n` +
            `<b>Balance</b>: ${wallet_bal}\n` +
            `<b>Gas Price</b>: <i>${data.gasPrice} GWEI</i>\n` +
            `<i>Gas price are updated in real time.</i>\n` +
            `<b>Tx Fee</b>: <i>${fee} ${symbol}</i>\n` +
            `<i>If the gas fees will go lower than when you paid then you will receive more volume, if they go higher you will receive less, when we make the swaps we use the gas fees in real time, you can check on etherscan or here in the bot.</i>\n`,
            { parse_mode: 'HTML' }
          );

          await timePage(bot, call.message!);
          tokenPage(call.message);

          bot.once(`message`, async (msg) => {
            if (msg.text) {
              const address = msg.text;

              if (w3.utils.isAddress(address)) {
                await tokenAddressPage(call.message, address);
              } else {
                await bot.sendMessage(call.message!.chat.id, `❗️ Type correct Token address ❗️`)
                tokenPage(call.message);
              }
            }
          });
        }
      }

      break;

    case 'time_page':
      homePage(bot, call.message!);
      return;

    case 'sendTokenAddr':
      tokenPage(call.message);

      bot.once('message', async (msg) => {

      })
      return;

    case 'token_address_6':
      console.log('currentUserList :>> ', currentUserList);
      console.log('call.message!.chat.id :>> ', call.message!.chat.id);
      console.log('call.data?.split', call.data?.split('_')[2]);
      for (let item of currentUserList) {
        if (item.id === call.message!.chat.id.toString()) {
          item.time = call.data?.split('_')[2];

          item.mode = '⚡⚡⚡ Fast Mode 8 hours selected';

          if (item.chain === 'eth') {
            homePage(bot, call.message!);
          }

          // if (item.chain === 'bsc') {
          // bscbot.homePage(bot,call.message!)
          // }

          return;
        }
      }
      break;

    case 'token_address_24':
      for (let item of currentUserList) {
        if (item.id === call.message!.chat.id) {
          item.time = call.data?.split('_')[2];

          item.mode = '⚡⚡ Normal Mode 24 hours selected';

          if (item.chain === 'eth') {
            homePage(bot, call.message!);
          }
          return;
        }
      }
      break;

    case 'token_address_7':
      for (let item of currentUserList) {
        if (item.id === call.message!.chat.id) {
          item.time = call.data?.split('_')[2];

          console.log('item.mode :>> ', item.mode);

          item.mode = '⚡ Steady Mode 7 days selected';

          if (item.chain === 'eth') {
            homePage(bot, call.message!);
          }
          return;
        }
      }
      break;

    // case 'token_address':
    //   console.log('token_address currentUserList :>> ', currentUserList);
    //   for (let item of currentUserList) {
    //     if (item.id === call.message!.chat.id) {
    //       item.time = call.data?.split('_')[2];

    //       console.log('item.mode :>> ', item.mode);

    //       switch (item.time) {
    //         case '6':
    //           item.mode = '⚡⚡⚡ Fast Mode 8 hours selected';
    //           break;
    //         case '27':
    //           item.mode = '⚡⚡ Normal Mode 24 hours selected';
    //           break;
    //         case '7':
    //           item.mode = '⚡ Steady Mode 7 days selected';
    //           break;
    //       }
    //       if (item.chain === 'eth') {
    //         homePage(bot, call.message!);
    //       }
    //       // else if (item.chain === 'bsc') {
    //       //   bscBot.homePage(bot, call.message);
    //       // }
    //       return;
    //     }
    //   }
    //   break;

    case 'token_page':
      tokenPage(call.message);
      return;

    case 'server':
      const index = parseInt(call.data?.split('_')[1] as string, 10);
      const response = await fetch(`{SERVER_LIST[index]}/api/eth/status`, {
        method: 'GET',
        headers: { accept: 'application/json' },
      });
      if ((await response.json()).busy) {
        bot.deleteMessage(call.message!.chat.id, call.message!.message_id);
        inputToken(call.message);
        return;
      }
      startBoost(call.message, index);
      return;
  }
});

function withdrawPage(message: Message) {
  // bot.clearStepHandlerByChatId(message.chat.id);
  const buttons: InlineKeyboardButton[][] = [
    [{ text: '👈 Return', callback_data: 'time_page' }],
  ];
  const keyboard: InlineKeyboardMarkup = { inline_keyboard: buttons };

  bot.sendMessage(
    message.chat.id,
    'Please enter the recipient wallet address.',
    {
      reply_markup: keyboard,
    }
  );
  // bot.registerNextStepHandlerByChatId(message.chat.id, inputWalletMain);
}

function inputWalletMain(message: Message) {
  for (let item of currentUserList) {
    if (item.id === message.chat.id) {
      // bot.clearStepHandlerByChatId(message.chat.id);
      if (message.text === '/start') {
        mainMenu(bot, message);
        return;
      }
      // if (!w3.isChecksumAddress(message.text)) {
      //   const button: InlineKeyboardButton[] = [
      //     { text: '👈 Return', callback_data: 'ethereum' },
      //   ];
      //   const keyboard: InlineKeyboardMarkup = { inline_keyboard: [button] };
      //   bot.sendMessage(
      //     message.chat.id,
      //     'Invalid address. Please enter the recipient wallet address again.',
      //     {
      //       reply_markup: keyboard,
      //     }
      //   );
      //   bot.registerNextStepHandlerByChatId(message.chat.id, inputWalletMain);
      //   return;
      // }
      item.receiver = message.text;
      inputAmountPage(message);
    }
  }
}

function inputAmountPage(message: Message) {
  const buttons: InlineKeyboardButton[][] = [
    [
      { text: 'All', callback_data: 'all' },
      { text: '👈 Return', callback_data: 'withdraw' },
    ],
  ];

  const keyboard: InlineKeyboardMarkup = { inline_keyboard: buttons };

  bot.sendMessage(message.chat.id, 'Please enter the amount', {
    reply_markup: keyboard,
  });

  // bot.registerNextStepHandlerByChatId(message.chat.id, inputAmount);
}

async function inputAmount(message: Message) {
  for (let item of currentUserList) {
    if (item.id === message.chat.id) {
      // bot.clearStepHandlerByChatId(message.chat.id);
      if (message.text === '/start') {
        mainMenu(bot, message);
        return;
      }
      const balance = await getWalletBalance(item.wallets.ether.publicKey);
      if (parseFloat(balance.eth) <= parseFloat(message.text as string)) {
        bot.sendMessage(message.chat.id, 'Insufficient funds');
        inputAmountPage(message);
        return;
      }
      item.withdrawAmount = message.text;
      const buttons: InlineKeyboardButton[][] = [
        [{ text: '✅ Confirm', callback_data: 'confirm' }],
        [{ text: '👈 Return', callback_data: 'input_amount' }],
      ];
      const keyboard: InlineKeyboardMarkup = { inline_keyboard: buttons };
      bot.sendMessage(
        message.chat.id,
        `<b>Recipient Address</b>\n${item.receiver}\n\n<b>Amount</b>\n${message.text}`,
        {
          reply_markup: keyboard,
          parse_mode: 'HTML',
        }
      );
    }
  }
}

// Token page handler
function tokenPage(message: any): void {
  const buttons = [[{ text: '👈 Return', callback_data: 'time_page' }]];
  const keyboard = { inline_keyboard: buttons };

  bot.sendMessage(message.chat.id, 'Please enter the token address.', {
    reply_markup: keyboard,
  });

  bot.on('text', inputToken);
}

// Input token handler
async function inputToken(message: any) {
  if (message.text === '/start') {
    mainMenu(bot, message);
    return;
  }

  const user = currentUserList.find((item) => item.id === message.chat.id);

  if (user) {
    if ((await checkTokenAddress(user.chain, message.text)) === false) {
      bot.sendMessage(message.chat.id, 'Invalid token address.');
      tokenPage(message);
      return;
    }

    user.token = message.text;
    showServerList(message);
  }
}

async function tokenAddressPage(message: any, tokenAddress: Address) {
  const tokenInfo = await getTokenInfo(tokenAddress);
  const pairNum = {
    v2: 0,
    v3: 0
  }

  for (let pairInfo of tokenInfo.pairs) {
    if (pairInfo.chainId == 'ethereum' && pairInfo.dexId == 'uniswap' && pairInfo.quoteToken.symbol == 'WETH' && pairInfo.liquidity.quote > 5 && pairInfo.marketCap > 250000) {
      switch (pairInfo.labels[0]) {
        case "v2":
          pairNum.v2++;
          break;

        case "v3":
          pairNum.v3++;
          break;

        default:
          break;
      }
    }
  }
  const isPoolWithWeth = await getTokenEthPair(tokenAddress);

  console.log('isPoolWithWeth :>> ', isPoolWithWeth);
}

// Show server list handler
function showServerList(message: any): void {
  const user = currentUserList.find((item) => item.id === message.chat.id);
  if (user) {
    const serverList: any[] = [];
    SERVER_LIST.forEach((ele, index) => {
      let url = '';
      if (user.chain === 'eth') {
        url = `${ele}/api/eth/status`;
      }
      if (user.chain === 'bsc') {
        url = `${ele}/api/bsc/status`;
      }

      axios
        .get(url)
        .then((response) => {
          serverList.push({
            text: response.data.busy
              ? `Server${index + 1} 🔴`
              : `Server${index + 1} 🟢`,
            index: index,
          });
        })
        .catch(() => {
          console.log('Error fetching server status');
        });
    });

    const buttons = [
      ...serverList.map((ele) => [
        { text: ele.text, callback_data: `server_${ele.index}` },
      ]),
      [{ text: '👈 Return', callback_data: 'token_page' }],
    ];
    const keyboard = { inline_keyboard: buttons };
    bot.sendMessage(
      message.chat.id,
      'Would you like to start Boost bot? 🚀📈',
      { reply_markup: keyboard, parse_mode: 'HTML' }
    );
  }
}

// Start boost handler
async function startBoost(message: any, index: number) {
  const user = currentUserList.find((item) => item.id === message.chat.id);
  if (user) {
    const balance = await getWalletBalance(user.wallets.ether.publicKey);
    const taxInfo = await getTokenTaxInfo(user.chain, user.token);
    // let totalTxn = 0;
    let speed = 0;

    const { totalTxn, speed: calcSpeed } = calculateTxnAndSpeed(
      user.amount,
      user.time
    );
    // totalTxn = totalTxns;
    speed = calcSpeed;

    const gasFee = user.fee;
    const serviceFee = parseFloat(user.amount.toString());

    if (parseFloat(balance.eth) === 0) {
      bot.deleteMessage(message.chat.id, message.message_id);
      bot.sendMessage(
        message.chat.id,
        `Insufficient funds, please send all the funds in the wallet that are indicated below.\n\n<i>${serviceFee} + ${gasFee} = ${gasFee + serviceFee
        }</i>\n\n<i>To this address:</i>\n<code>${user.wallets.ether.publicKey
        }</code>`,
        { parse_mode: 'HTML' }
      );
      showServerList(message);
      return;
    }

    if (taxInfo) {
      if (taxInfo.buy === 0 && taxInfo.sell === 0) {
        startVolumeBoost(
          message,
          index,
          user,
          totalTxn,
          speed,
          gasFee,
          serviceFee
        );
        return;
      }

      const tax = taxInfo.buy + taxInfo.sell;
      const whitelisted = await isWhitelisted(
        user.wallets.ether.publicKey,
        user.token
      );

      if (whitelisted) {
        startVolumeBoost(
          message,
          index,
          user,
          totalTxn,
          speed,
          gasFee,
          serviceFee
        );
      } else {
        const totVolumeTax = (calcToVolTax(user.amount) * tax) / 100;
        startVolumeBoost(
          message,
          index,
          user,
          totalTxn,
          speed,
          gasFee + totVolumeTax,
          serviceFee
        );
      }
    }
  }
}

// Start volume boost helper
function startVolumeBoost(
  message: any,
  index: number,
  user: any,
  totalTxn: number,
  speed: number,
  amount: number,
  serviceFee: number
): void {
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

  let url = '';
  if (user.chain === 'eth') {
    url = `${SERVER_LIST[index]}/api/eth/add`;
  }
  // if (user.chain === 'bsc') {
  //   url = `${SERVER_LIST[index]}/api/bsc/add`;
  // }

  axios
    .post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
      },
    })
    .then((response) => {
      if (response.status === 200 && response.data.success) {
        bot.editMessageText(
          'Start volume boost. You can check the transactions in DexTools.'
          // message.chat.id,
          // message.message_id,
        );
      } else {
        bot.editMessageText(
          'Volume boost failed. Please try again.'
          // message.chat.id,
          // message.message_id,
        );
      }
    })
    .catch(() => {
      bot.editMessageText(
        'Volume boost failed. Please try again.'
        // message.chat.id,
        // message.message_id,
      );
    });
}

bot.startPolling();
