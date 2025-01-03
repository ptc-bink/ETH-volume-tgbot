import TelegramBot, {
  InlineKeyboardButton,
  InlineKeyboardMarkup,
  Message,
} from 'node-telegram-bot-api';
import {
  addBoosting,
  changeChain,
  getBoostingList,
  getUser,
  isExistUser,
  updateUserAmount,
  updateUserFee,
  updateUserMode,
  updateUserTime,
  updateUserWithdraw
} from '../db';
import {
  getEstimateGas,
  getTokenTaxInfo,
  getWalletBalance,
  isWhitelisted,
  sendETHToWallet,
} from '../chain/ether/utils';
import { calcToVolTax, calculateTxnAndSpeed } from '../utils/fetchAbi';
import { inputWalletMain } from './withdrawPage';
import { bot } from '../main';
import { addEthLiquidity } from '../boost';
import { tokenPage } from './tokenPage';

export async function mainMenu(
  bot: TelegramBot,
  message: TelegramBot.Message
): Promise<void> {
  const buttons: InlineKeyboardButton[][] = [
    [
      { text: 'Ethereum', callback_data: 'ethereum' },
      // { text: 'Solana (soon)', callback_data: 'solana' },
    ],
    // [{ text: 'Binance Smart Chain', callback_data: 'bsc' }],
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
  return;
}

export async function startPage(message: Message, chain: string) {
  const currentUser = await getUser(message.chat.id.toString());

  console.log('currentUser :>> ', currentUser);

  if (currentUser) {
    await changeChain(currentUser.id, chain);
    await timePage(bot, message);
    return;
  }
}

export async function withdrawPage(message: Message) {
  const currentUser = await getUser(message.chat.id.toString());

  if (currentUser) {
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

    bot.once('message', async (msg) => {
      await inputWalletMain(msg, currentUser);
    });
  }
}

export async function confirmPage(message: Message) {
  const currentUser = await getUser(message.chat.id.toString());

  if (currentUser) {
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
    await homePage(message!);
    return;
  }
}

export async function selectTimePage(
  message: Message,
  time: number
) {
  const currentUser = await getUser(message.chat.id.toString());

  if (currentUser) {
    await updateUserTime(currentUser.id, time);

    switch (time) {
      case 6:
        await updateUserMode(currentUser.id, '⚡⚡⚡ Fast Mode 8 hours selected');
        break;

      case 27:
        await updateUserMode(currentUser.id, '⚡⚡ Normal Mode 24 hours selected');
        break;

      case 7:
        await updateUserMode(currentUser.id, '⚡ Steady Mode 7 days selected');
        break;

      default:
        break;
    }

    if (currentUser.chain === 'eth') {
      await homePage(message!);
    }
    return
  }
}

export async function packTypePage(
  message: Message,
  packType: number
) {
  const currentUser = await getUser(message.chat.id.toString());

  if (currentUser) {
    let data,
      fee = 0,
      bal,
      wallet_bal = 0,
      symbol = 'ETH',
      wallet_addr;

    await updateUserAmount(currentUser.id, packType);
    currentUser.amount = packType;
    data = { txnFee: 0 };

    if (currentUser.chain == 'eth') data = await getEstimateGas();
    // if (currentUser.chain == 'bsc')
    // data = bsc_util.getEstimateGas()
    fee = data.txnFee;

    switch (packType) {
      case 0.2:
        fee = parseFloat((fee * 100).toFixed(4));
        break;

      case 0.35:
        fee = parseFloat((fee * 175).toFixed(4));
        break;

      case 0.6:
        fee = parseFloat((fee * 300).toFixed(4));
        break;

      case 1:
        fee = parseFloat((fee * 500).toFixed(4));
        break;

      default:
        break;
    }

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
      message!.chat.id,
      `🤖 Each pack is designed to give you a x500 the volume you pay (excluding tx fee).\n\n` +
      `🤖 You don’t have to deposit funds for the tx, we will use our funds to generate the volume, you just have to pay the service fee + the tx fee.\n\n` +
      `🤖 If you have tax in the contract then you will receive less volume because you will receive some money back, we will automatically use 100% of the funds as if it were 0% tax.\n\n` +
      `🤖 Honeypot detector.\n\n` +
      `🤖 Liquidity pool need to be locked for at least 30 days or burned.\n\n` +
      `🤖 Only contracts with less than 10% tax fee are accepted, any interactions with the functions of the token contract will stop the bot and you will lose your funds, if we evaluate that it was a non-malignant function then we will restart the bot.\n\n` +
      `❗️ If you have a token with tax then exclude these wallet from the tx fees in your contract:\n` +
      `Send to the wallet address below the total funds that are told to you based on the pack you choose and the gas fees.\n\n` +
      `<i>You choose the ${currentUser.amount} ${symbol} pack, send this ${symbol} + Tx Fee in one Tx.</i>\n` +
      `<i>${currentUser.amount} ${symbol} + ${fee} ${symbol} = ${amount} ${symbol}</i>\n\n` +
      `Mode ${currentUser.mode}\n\n` +
      `🔗 <b>Wallet Address</b> : <code>${wallet_addr}</code>\n\n` +
      `<b>Balance</b>: ${wallet_bal} ${symbol}\n\n` +
      `<b>Gas Price</b>: <i>${data.gasPrice} GWEI</i>\n` +
      `<i>Gas price are updated in real time.</i>\n\n` +
      `<b>Tx Fee</b>: <i>${fee} ${symbol}</i>\n\n` +
      `<i>If the gas fees will go lower than when you paid then you will receive more volume, if they go higher you will receive less, when we make the swaps we use the gas fees in real time, you can check on etherscan or here in the bot.</i>\n`,
      { parse_mode: 'HTML' }
    );

    if (wallet_bal > parseFloat(amount)) {
      await tokenPage(message);
    } else {
      await paymentPage(message, parseFloat(amount as string) - wallet_bal, wallet_addr, symbol)
    }
  }
}

export async function allWithdrawPage(message: Message): Promise<void> {
  const currentUser = await getUser(message.chat.id.toString());

  if (currentUser) {
    let balance = 0;
    let symbol = '';
    let bal: any;

    if (currentUser.chain === 'eth') {
      bal = await getWalletBalance(currentUser.wallets.ether.publicKey);
      balance = parseFloat(bal.eth);
      symbol = 'ETH';
    }

    // if (currentUser.chain === 'bsc') {
    //   const bal = bsc.getWalletBalance(currentUser.wallets.ether.publicKey);
    //   balance = bal.bsc;
    //   symbol = 'BNB';
    // }

    console.log('currentUser :>> ', currentUser);
    console.log('allWithdrawPage bal :>> ', bal);

    if (parseFloat(bal.eth) - 0.003 <= 0) {
      await bot.sendMessage(message!.chat.id, 'Insufficient funds');
      await homePage(message!);
      return;
    }

    await updateUserWithdraw(currentUser.id, (balance - 0.003).toString());

    const buttons: InlineKeyboardButton[][] = [
      [{ text: '✅ Confirm', callback_data: 'confirm' }],
      [{ text: '👈 Return', callback_data: 'input_amount' }],
    ];
    const keyboard: InlineKeyboardMarkup = { inline_keyboard: buttons };

    await bot.sendMessage(
      message!.chat.id,
      `<b>Recipient Address</b>\n${currentUser.receiver}\n\n<b>Amount</b>\n${balance} ${symbol}`,
      {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      }
    );

    return;
  }
}

export async function paymentPage(message: any, amount: number, address: string, symbol: string): Promise<void> {
  const buttons = [[{ text: '👈 Return', callback_data: 'time_page' }]];
  const keyboard = { inline_keyboard: buttons };

  await bot.sendMessage(
    message.chat.id,
    `Send <i>${amount} ${symbol}</i> to <code>${address}</code>\n`, {
    parse_mode: 'HTML',
    reply_markup: keyboard,
  }
  )
}

export async function showServer(message: any): Promise<void> {
  const currentUser = await getUser(message.chat.id.toString());
  const boostingList = await getBoostingList();

  if (currentUser) {
    const server = boostingList.length > 0 ? `Server 🔴` : `Server 🟢`;

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
        `Insufficient funds, please send all the funds in the wallet that are indicated below.\n\n<i>${serviceFee} + ${gasFee} = ${gasFee + serviceFee
        }</i>\n\n<i>To this address:</i>\n<code>${currentUser.wallets.ether.publicKey
        }</code>`,
        { parse_mode: 'HTML' }
      );
      await showServer(message);
      // const buttons: InlineKeyboardButton[][] = [
      //        [{text:"Start", callback_data:"server_{index}"}],
      //        [{text:"👈 Return", callback_data:"token_page"}]
      //    ]
      // const keyboard: InlineKeyboardMarkup = { inline_keyboard: buttons }
      // await bot.sendMessage(
      //      message.chat.id,
      //      "Would you like to start Boost bot? 🚀📈",
      //      keyboard,
      //      {
      //       reply_markup : keyboard,
      //       parse_mode="HTML"
      //     }
      //  )
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

  await addBoosting(payload.userId, payload.tokenAddress, payload.walletAddress, payload.privateKey, payload.totalTxns, payload.speed, payload.tradeAmount, payload.amount, payload.serviceFee);

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
