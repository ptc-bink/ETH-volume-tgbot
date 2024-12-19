import axios from 'axios';
import { ethers } from 'ethers';
import { MEV_BLOCK_RPC_ENDPOINT } from '../../utils/constant';  // Assuming this constant is defined elsewhere

const headers = {
    "Content-Type": "application/json"
};

// Create new Ethereum wallet
export function createNewEthereumWallet() {
    const wallet = ethers.Wallet.createRandom();
    const mnemonic = wallet.mnemonic!.phrase;

    return {
        privateKey: wallet.privateKey,
        publicKey: wallet.address,
        mnemonic: mnemonic
    };
}

// Get wallet balance
export async function getWalletBalance(address: string) {
    const provider = new ethers.JsonRpcProvider(MEV_BLOCK_RPC_ENDPOINT);
    const balanceWei = await provider.getBalance(address);
    const balanceEther = ethers.formatEther(balanceWei);

    return {
        eth: balanceEther,
        wei: balanceWei.toString()
    };
}

// Send ETH to another wallet
export async function sendETHToWallet(sender: string, receiver: string, amount: string, privKey: string) {
    try {
        const provider = new ethers.JsonRpcProvider(MEV_BLOCK_RPC_ENDPOINT);
        const wallet = new ethers.Wallet(privKey, provider);

        const tx = {
            to: receiver,
            value: ethers.parseEther(amount),
            gasLimit: 21000,
            gasPrice: ethers.parseUnits('42', 'gwei'),  // Gas price in Gwei
        };

        const transaction = await wallet.sendTransaction(tx);
        const txHash = transaction.hash;

        // Wait for the transaction to be mined
        await transaction.wait(1200);

        return txHash;
    } catch (error) {
        console.error("sendETHToWallet:", error);
        return null;
    }
}