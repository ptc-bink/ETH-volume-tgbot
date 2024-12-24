import {
  InlineKeyboardButton,
  InlineKeyboardMarkup,
  Message,
} from 'node-telegram-bot-api';
import { bot } from '../main';
import { mainMenu, w3 } from '.';
import { getWalletBalance } from '../chain/ether/wallet';
import { getUser, updateUserReceiver } from '../db';

export async function inputWalletMain(message: Message, currentUser: any) {
  if (currentUser.id === message.chat.id) {
    // bot.clearStepHandlerByChatId(message.chat.id);
    if (message.text === '/start') {
      await mainMenu(bot, message);
      return;
    }
    if (!w3.utils.isAddress(message.text as string)) {
      const button: InlineKeyboardButton[] = [
        { text: '👈 Return', callback_data: 'ethereum' },
      ];
      const keyboard: InlineKeyboardMarkup = { inline_keyboard: [button] };

      await bot.sendMessage(
        message.chat.id,
        'Invalid address. Please enter the recipient wallet address again.',
        {
          reply_markup: keyboard,
        }
      );

      bot.once('message', async (msg) => {
        await inputWalletMain(msg, currentUser);
      });
      return;
    }

    await updateUserReceiver(currentUser.id, message.text as string);
    await inputAmountPage(message, currentUser);
  }
}

export async function inputAmountPage(message: Message, currentUser: any) {
  const buttons: InlineKeyboardButton[][] = [
    [
      { text: 'All', callback_data: 'all' },
      { text: '👈 Return', callback_data: 'withdraw' },
    ],
  ];

  const keyboard: InlineKeyboardMarkup = { inline_keyboard: buttons };

  await bot.sendMessage(message.chat.id, 'Please enter the amount', {
    reply_markup: keyboard,
  });

  bot.once('message', async (msg) => {
    await inputAmount(msg, currentUser);
  });
}

export async function inputAmount(message: Message, currentUser: any) {
  if (currentUser.id === message.chat.id) {
    if (message.text === '/start') {
      await mainMenu(bot, message);
      return;
    }

    const balance = await getWalletBalance(currentUser.wallets.ether.publicKey);

    if (parseFloat(balance.eth) <= parseFloat(message.text as string)) {
      await bot.sendMessage(message.chat.id, 'Insufficient funds');
      await inputAmountPage(message, currentUser);
      return;
    }

    currentUser.withdrawAmount = message.text;

    const buttons: InlineKeyboardButton[][] = [
      [{ text: '✅ Confirm', callback_data: 'confirm' }],
      [{ text: '👈 Return', callback_data: 'input_amount' }],
    ];

    const keyboard: InlineKeyboardMarkup = { inline_keyboard: buttons };

    await bot.sendMessage(
      message.chat.id,
      `<b>Recipient Address</b>\n${currentUser.receiver}\n\n<b>Amount</b>\n${message.text}`,
      {
        reply_markup: keyboard,
        parse_mode: 'HTML',
      }
    );
  }
}