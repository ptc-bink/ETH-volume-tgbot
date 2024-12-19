import TelegramBot, { InlineKeyboardMarkup, InlineKeyboardButton } from "node-telegram-bot-api";
import { isExistUser } from "../db/helper";
import { getWalletBalance } from "../chain/ether/wallet";
import Web3 from "web3";
import { MEV_BLOCK_RPC_ENDPOINT } from "..//utils/constant";

export const w3 = new Web3(new Web3.providers.HttpProvider(MEV_BLOCK_RPC_ENDPOINT));

// Function to generate the main menu
export function mainMenu(bot: TelegramBot, message: TelegramBot.Message): void {
  const buttons: InlineKeyboardButton[][] = [
    [
      { text: "Ethereum", callback_data: "ethereum" },
      { text: "Solana (soon)", callback_data: "solana" },
    ],
    [{ text: "Binance Smart Chain", callback_data: "bsc" }],
  ];
  const keyboard: InlineKeyboardMarkup = { inline_keyboard: buttons };

  if (message.from?.is_bot) {
    bot.editMessageText("<b>Welcome to Mind Boost Bot</b>", {
      chat_id: message.chat.id,
      message_id: message.message_id,
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
  } else {
    bot.sendMessage(message.chat.id, "<b>Welcome to Mind Boost Bot</b>", {
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
  }
}

// Function to render the home page
export async function homePage(bot: TelegramBot, message: TelegramBot.Message): Promise<void> {
  bot.clearReplyListeners();
  const user = await isExistUser(message.chat.id.toString());
  if (!user) return;

  const wallet = user.wallets.ether.publicKey;
  const balance = await getWalletBalance(wallet);

  const buttons: InlineKeyboardButton[][] = [
    [{ text: "⭐ 0.2 ETH (Volume: 100 ETH)", callback_data: "select_time_0.2" }],
    [{ text: "⭐ 0.35 ETH (Volume: 175 ETH)", callback_data: "select_time_0.35" }],
    [{ text: "⭐ 0.6 ETH (Volume: 300 ETH)", callback_data: "select_time_0.6" }],
    [{ text: "⭐ 1 ETH (Volume: 500 ETH)", callback_data: "select_time_1" }],
    [{ text: "🏧 Withdraw", callback_data: "withdraw" }],
    [{ text: "👈 Return", callback_data: "ethereum" }],
  ];
  const keyboard: InlineKeyboardMarkup = { inline_keyboard: buttons };

  const messageText = `<b>Wallet Address</b>\n🔗 <code>${wallet}</code>\n\n<b>Balance</b>\n${balance.eth} ETH`;

  if (message.from?.is_bot) {
    bot.editMessageText(messageText, {
      chat_id: message.chat.id,
      message_id: message.message_id,
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
  } else {
    bot.sendMessage(message.chat.id, messageText, {
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
  }
}

// Function to render the time selection page
export async function timePage(bot: TelegramBot, message: TelegramBot.Message): Promise<void> {
  bot.clearReplyListeners();
  const user = await isExistUser(message.chat.id.toString());
  if (!user) return;

  const wallet = user.wallets.ether.publicKey;
  const balance = await getWalletBalance(wallet);

  const buttons: InlineKeyboardButton[][] = [
    [{ text: "⚡⚡⚡ Fast Mode 8 hours", callback_data: "token_address_6" }],
    [{ text: "⚡⚡ Normal Mode 24 hours", callback_data: "token_address_27" }],
    [{ text: "⚡ Steady Mode 7 days", callback_data: "token_address_7" }],
  ];
  const keyboard: InlineKeyboardMarkup = { inline_keyboard: buttons };

  const messageText = `<b>Wallet Address</b>\n🔗 <code>${wallet}</code>\n\n<b>Balance</b>\n${balance.eth} ETH`;

  if (message.from?.is_bot) {
    bot.editMessageText(messageText, {
      chat_id: message.chat.id,
      message_id: message.message_id,
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
  } else {
    bot.sendMessage(message.chat.id, messageText, {
      reply_markup: keyboard,
      parse_mode: "HTML",
    });
  }
}
