import * as dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import * as EtherWallet from '../chain/ether/wallet'; // Assuming you have this module in TypeScript
// import * as SolanaWallet from '../chain/solana/wallet'; // Assuming you have this module in TypeScript
import * as etherUtils from '../chain/ether/utils'; // Assuming these are utility functions in TypeScript
// import * as solanaUtils from '../chain/solana/utils'; // Assuming these are utility functions in TypeScript
// import * as bsc from '../chain/bsc/utils'; // Assuming this is a utility module for BSC

// Load environment variables
dotenv.config();

const DB_PATH = process.env.DATABASE || '';
const client = new MongoClient(DB_PATH);
const db = client.db('BoosterBot');

// Get the user database
function getUserDB() {
    return db.collection('users');
}

// Get the wallet database
function getWalletDB() {
    return db.collection('wallets');
}

// Check if a user exists
export async function isExistUser(userId: string): Promise<any | boolean> {
    try {
        const userDB = getUserDB();
        const user = await userDB.findOne({ id: userId });
        if (user) {
            return user;
        } else {
            return false;
        }
    } catch {
        return false;
    }
}

// Insert a new user
export async function insertUser(userId: string): Promise<any[]> {
    try {
        const userDB = getUserDB();
        const ether = EtherWallet.createNewEthereumWallet();
        // const solana = SolanaWallet.createNewSolanaWallet();
        
        await userDB.insertOne({
            id: userId,
            wallets: {
                ether: ether,
                // solana: solana
            },
            setting: {
                eth: true,
                sol: false
            }
        });

        const users = await userDB.find().toArray();
        return users;
    } catch {
        return [];
    }
}

// Get all users
export async function getUsers(): Promise<any[]> {
    try {
        const userDB = getUserDB();
        return await userDB.find().toArray();
    } catch {
        return [];
    }
}

// Change chain preference for a user
export async function changeChain(userId: string, chain: string): Promise<any | false> {
    try {
        const userDB = getUserDB();
        const user = await userDB.findOne({ id: userId });
        if (!user) return false;

        let updateFlag = false;
        if (chain === 'eth' && user.setting.eth === false) {
            updateFlag = true;
            user.setting.eth = true;
            user.setting.sol = false;
        }
        if (chain === 'sol' && user.setting.sol === false) {
            updateFlag = true;
            user.setting.eth = false;
            user.setting.sol = true;
        }

        if (updateFlag) {
            await userDB.updateOne({ id: userId }, { $set: { setting: user.setting } });
        }
        return user;
    } catch {
        return false;
    }
}

// Check if a token address is valid
export async function checkTokenAddress(chain: string, address: string): Promise<boolean> {
    try {
        if (chain === 'eth') {
            return checkETHTokenAddress(address);
        }
        // if (chain === 'bsc') {
        //     return checkBNBTokenAddress(address);
        // }
        return false;
    } catch {
        return false;
    }
}

// Save a new wallet for a user
export async function saveNewWallet(userId: string, publicKey: string, privateKey: string, mnemonic: string, chain: string): Promise<boolean> {
    try {
        const wallets = getWalletDB();
        await wallets.insertOne({
            userId,
            publicKey,
            privateKey,
            mnemonic,
            chain,
            status: true
        });
        return true;
    } catch {
        return false;
    }
}

// Check if an Ethereum token address is valid
export async function checkETHTokenAddress(address: string): Promise<boolean> {
    const data = await etherUtils.getPairAddress(address);
    return data !== null;
}

// // Check if a BNB token address is valid
// async function checkBNBTokenAddress(address: string): Promise<boolean> {
//     const data = await bsc.checkToken(address);
//     return data !== false;
// }
