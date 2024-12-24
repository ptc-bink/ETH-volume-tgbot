import { checkTokenAddress, getUser, updateUserToken } from '../db';
import { bot } from '../main';
import { mainMenu, showServerList } from '.';

// Token page handler
export async function tokenPage(message: any): Promise<void> {
  const currentUser = await getUser(message.chat.id.toString());
  const buttons = [[{ text: '👈 Return', callback_data: 'time_page' }]];
  const keyboard = { inline_keyboard: buttons };

  await bot.sendMessage(message.chat.id, 'Please enter the token address.', {
    reply_markup: keyboard,
  });

  console.log('before input token');

  bot.once('message', async (msg) => {
    await inputToken(msg, currentUser);
  });
}

// Input token handler
export async function inputToken(message: any, currentUser: any) {
  if (message.text === '/start') {
    await mainMenu(bot, message);
    return;
  }

  if (currentUser) {
    if ((await checkTokenAddress(currentUser.chain, message.text)) === false) {
      await bot.sendMessage(message.chat.id, 'Invalid token address.');
      await tokenPage(message);
      return;
    }

    await updateUserToken(currentUser.id, message.text);
    await showServerList(message);
  }
}
