import { checkTokenAddress, getUser, updateUserToken } from '../db';
import { bot } from '../main';
import { mainMenu, showServer } from '.';
import { getTokenInfo } from '../chain/ether/utils';

// Token page handler
export async function tokenPage(message: any): Promise<void> {
  const currentUser = await getUser(message.chat.id.toString());
  const buttons = [[{ text: '👈 Return', callback_data: 'time_page' }]];
  const keyboard = { inline_keyboard: buttons };

  await bot.sendMessage(message.chat.id, 'Please enter the token address.', {
    reply_markup: keyboard,
  });

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

    const tokenInfo = await getTokenInfo(message.text);
    console.log('tokenInfo :>> ', tokenInfo);

    const pairNum = {
      v2: 0,
      v3: 0,
    };
    let lpAmount = 0;
    let marketCap = 0;

    for (let pairInfo of tokenInfo) {
      if (pairInfo.chainId !== 'ethereum' && pairInfo.dexId !== 'uniswap') {
        await bot.sendMessage(message.chat.id, 'Unsufficient token address in Uniswap');
        await tokenPage(message);
        return;
      }

      if (pairInfo.quoteToken.symbol !== 'WETH') {
        await bot.sendMessage(message.chat.id, 'Unsufficient token address with only ETH token');
        await tokenPage(message);
        return;
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
      await bot.sendMessage(message.chat.id, 'Token address with less Liquidity pool of 5 ETH');
      await tokenPage(message);
      return;
    }

    if (marketCap < 250000) {
      await bot.sendMessage(message.chat.id, 'Token address with less MarketCap of 250k');
      await tokenPage(message);
      return;
    }

    if (pairNum.v2 == 0 || pairNum.v3 == 0) {
      await bot.sendMessage(message.chat.id, 'Token should be placed in both of Router v2 && Router v3');
      await tokenPage(message);
      return;
    }

    await updateUserToken(currentUser.id, message.text);
    await showServer(message);
  }
}