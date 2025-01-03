// import * as SolanaWallet from '../chain/solana/wallet'; // Assuming you have this module in TypeScript
import * as etherUtils from '../chain/ether/utils'; // Assuming these are utility functions in TypeScript

import WalletsModal from './Wallets';
import BoostingListModal from './BoostingList';
import UsersModal from './Users';
// import * as solanaUtils from '../chain/solana/utils'; // Assuming these are utility functions in TypeScript
// import * as bsc from '../chain/bsc/utils'; // Assuming this is a utility module for BSC

// Check if a user exists
export async function isExistUser(userId: string): Promise<any | boolean> {
  try {
    // const userDB = getUserDB();
    const user = await UsersModal.findOne({ id: userId });
    if (user) {
      return user;
    } else {
      return false;
    }
  } catch {
    return false;
  }
}

export async function updateUserToken(
  userId: string,
  tokenAddress: string
): Promise<any> {
  try {
    const user = await UsersModal.findOneAndUpdate(
      { id: userId },
      { token: tokenAddress }
    );

    return user;
  } catch (error) {
    return error;
  }
}

export async function updateUserWithdraw(
  userId: string,
  withdrawAmount: string
): Promise<any> {
  try {
    const user = await UsersModal.findOneAndUpdate(
      { id: userId },
      { withdrawAmount: withdrawAmount }
    );

    return user;
  } catch (error) {
    return error;
  }
}

export async function updateUserReceiver(
  userId: string,
  receiverAddress: string
): Promise<any> {
  try {
    const user = await UsersModal.findOneAndUpdate(
      { id: userId },
      { receiver: receiverAddress }
    );

    return user;
  } catch (error) {
    return error;
  }
}

export async function updateUserMode(userId: string, mode: string): Promise<any> {
  try {
    const user = await UsersModal.findOneAndUpdate(
      { id: userId },
      { mode: mode }
    )

    return user
  } catch (error) {
    return error
  }
}

export async function updateUserAmount(userId: string, amount: number): Promise<any> {
  try {
    const user = await UsersModal.findOneAndUpdate(
      { id: userId },
      { amount: amount }
    )

    return user
  } catch (error) {
    return error
  }
}

export async function updateUserTime(userId: string, time: number): Promise<any> {
  try {
    const user = await UsersModal.findOneAndUpdate(
      { id: userId },
      { time: time }
    )

    return user
  } catch (error) {
    return error
  }
}

export async function updateUserFee(userId: string, fee: number): Promise<any> {
  try {
    const user = await UsersModal.findOneAndUpdate(
      { id: userId },
      { fee: fee }
    );

    return user;
  } catch (error) {
    return error;
  }
}

export async function insertUser(userId: string): Promise<any> {
  try {
    // const userDB = getUserDB();
    const ether = etherUtils.createNewEthereumWallet();
    // const solana = SolanaWallet.createNewSolanaWallet();

    const newUser = new UsersModal({
      id: userId,
      wallets: {
        ether: ether,
        // solana: solana
      },
      setting: {
        eth: true,
        sol: false,
      },
      chain: 'eth',
      mode: '⚡⚡⚡ Fast Mode 8 hours selected',
      amount: 0.2,
    });

    await newUser.save();

    const user = await UsersModal.findOne({ id: userId });
    return user;
  } catch {
    return [];
  }
}

export async function getUser(userId: string): Promise<any> {
  try {
    if (await isExistUser(userId)) {
      const user = await UsersModal.findOne({ id: userId });
      return user;
    }

    const user = await insertUser(userId);
    return user;
  } catch {
    return undefined;
  }
}

export async function getUsers(): Promise<any[]> {
  try {
    const users = await UsersModal.find();

    return users;
  } catch {
    return [];
  }
}

export async function addBoosting(
  userId: string,
  tokenAddress: string,
  walletAddress: string,
  privateKey: string,
  totalTxns: number,
  speed: number,
  serviceFee: number,
  amount: number,
  tradeAmount: number,
): Promise<any> {
  try {
    const newBoosting = await new BoostingListModal({
      userId: userId,
      tokenAddress: tokenAddress,
      walletAddress: walletAddress,
      privateKey: privateKey,
      totalTxns: totalTxns,
      speed: speed,
      serviceFee: serviceFee,
      amount: amount,
      tradeAmount: tradeAmount
    }).save();

    const boost = BoostingListModal.findOne({ id: userId });

    return boost;
  } catch (error) {
    return undefined
  }
}

export async function getBoostingList(): Promise<any[]> {
  try {
    const boostingList = await BoostingListModal.find();

    return boostingList;
  } catch (error) {
    return [];
  }
}

// Update Boosting server List
export async function updateEthBoostingList(
  userId: string,
  tokenType?: string,
  selectTime?: number,
  packType?: number,
  tokenAddress?: string
): Promise<any | false> {
  try {
    const list = await BoostingListModal.findOne({ id: userId });

    if (!list) {
      await new BoostingListModal({
        tokenAddress: tokenAddress,
        selectTime: selectTime,
        packType: packType,
        tokenType: tokenType,
      }).save();
    }

    await BoostingListModal.findOneAndUpdate(
      { id: userId },
      {
        tokenAddress: tokenAddress,
        selectTime: selectTime,
        packType: packType,
        tokenType: tokenType,
      }
    );

    return await BoostingListModal.findOne({ id: userId });
  } catch (error) { }
}

// Change chain preference for a user
export async function changeChain(
  userId: string,
  chain: string
): Promise<any | false> {
  try {
    const user = await UsersModal.findOne({ id: userId });
    if (!user) return false;

    let updateFlag = false;
    if (chain === 'eth' && user.setting!.eth === false) {
      updateFlag = true;
      user.setting!.eth = true;
      user.setting!.sol = false;
    }
    // if (chain === 'sol' && user.setting!.sol === false) {
    //   updateFlag = true;
    //   user.setting!.eth = false;
    //   user.setting!.sol = true;
    // }

    if (updateFlag) {
      await UsersModal.updateOne(
        { id: userId },
        { $set: { setting: user.setting } }
      );
    }
    return user;
  } catch {
    return false;
  }
}

// Check if a token address is valid
export async function checkTokenAddress(
  chain: string,
  address: string
): Promise<boolean> {
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
export async function saveNewWallet(
  userId: string,
  publicKey: string,
  privateKey: string,
  mnemonic: string,
  chain: string
): Promise<boolean> {
  try {
    // const wallets = getWalletDB();
    const newWallet = new WalletsModal({
      userId,
      publicKey,
      privateKey,
      mnemonic,
      chain,
      status: true,
    });

    await newWallet.save();
    return true;
  } catch {
    return false;
  }
}

// Check if an Ethereum token address is valid
export async function checkETHTokenAddress(address: string): Promise<boolean> {
  const data = await etherUtils.getTokenInfo(address);
  return data !== null;
}

// // Check if a BNB token address is valid
// async function checkBNBTokenAddress(address: string): Promise<boolean> {
//     const data = await bsc.checkToken(address);
//     return data !== false;
// }
