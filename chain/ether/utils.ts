import axios from 'axios';
import { Web3 } from 'web3';
import {
  get_factory_v2_abi,
  get_factory_v3_abi,
  get_router_abi,
} from '../../utils/fetchAbi';
import {
  PRIMARY_KEY,
  ETHERSCAN_API_KEY,
  WETH_ADDRESS,
  MEV_BLOCK_RPC_ENDPOINT,
  UNISWAP_FACTORY_V2,
  ETH_RPC_ENDPOINT,
} from '../../utils/constant';
import { EstimateGas, TokenTaxInfo } from '../../utils/types';
import { ethers } from 'ethers';
import { w3 } from '../../main';

const headers = {
  "Content-Type": "application/json"
};

async function getTokenTaxInfo(
  chain1: string,
  tokenAddress: string
): Promise<TokenTaxInfo | false> {
  try {
    const headers = {
      'Cache-Control': 'no-cache',
      'X-QKNTL-KEY': PRIMARY_KEY,
    };

    let chain = '';
    if (chain1 === 'eth') {
      chain = 'eth';
    }
    // if (chain1 === 'bsc') {
    //   chain = 'bsc';
    // }

    const response = await axios.get(
      `https://api.quickintel.io/v1/honeypot/${chain}/${tokenAddress}`,
      { headers }
    );

    if (response.status === 200) {
      const data = response.data;

      console.log('data :>> ', data);
      if (
        data.tokenDynamicDetails?.buy_Tax == null ||
        data.tokenDynamicDetails?.sell_Tax == null
      ) {
        return { buy: 0, sell: 0 };
      }

      return {
        buy: parseFloat(data.tokenDynamicDetails.buy_Tax),
        sell: parseFloat(data.tokenDynamicDetails.sell_Tax),
      };
    }

    return false;
  } catch (error) {
    return false;
  }
}

async function sendETHToWallet(
  sender: string,
  receiver: string,
  amount: number,
  priv_key: string
) {
  try {
    const from_addr = ethers.getAddress(sender);
    const to_addr = ethers.getAddress(receiver);

    const nonce = await w3.eth.getTransactionCount(from_addr);

    const tx = {
      nonce: Number(nonce),
      to: to_addr,
      value: ethers.parseUnits(amount.toString(), 'ether'),
      gasLimit: 21000,
      gasPrice:
        ethers.parseUnits('40', 'gwei') + ethers.parseUnits('2', 'gwei'),
      chainId: 1,
    };

    const wallet = new ethers.Wallet(priv_key);
    const signed_tx = await wallet.signTransaction(tx);

    const data = {
      jsonrpc: '2.0',
      method: 'eth_sendRawTransaction',
      params: [signed_tx],
      id: 1,
    };

    const response = await axios.post(ETH_RPC_ENDPOINT, JSON.stringify(data), {
      headers,
    });
    if (response.status !== 200) {
      return null;
    }
    const tx_hash = response.data.result;

    // const tx_receipt = await w3.eth.trans(tx_hash, 1200);
    return tx_hash;
  } catch (e) {
    console.error(`sendETHToWallet error: ${e}`);
    return null;
  }
}

async function getWalletBalance(address: string) {
  const balance_wei = await w3.eth.getBalance(address);
  return {
    eth: ethers.formatUnits(balance_wei, 'ether'),
    wei: balance_wei,
  };
}

async function getTokenEthPair(tokenAddress: string) {
  const abi = get_factory_v2_abi();
  const factoryContract = new w3.eth.Contract(abi, UNISWAP_FACTORY_V2);

  const pair = await factoryContract.methods
    .getPair(tokenAddress, WETH_ADDRESS)
    .call();

  console.log('pair address:>> ', pair);
  if (pair) {
    return true;
  } else false;
}

async function getTokenInfo(tokenAddress: string) {
  try {
    const response = await axios.get(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
    );
    const data = response.data;

    if (!data.pairs || data.pairs.length === 0) {
      return null;
    }
    return data.pairs;
  } catch (error) {
    return null;
  }
}

async function getTokenEthPool(tokenAddress: string) {
  const abi = get_factory_v3_abi();
  const factoryContract = new w3.eth.Contract(abi, UNISWAP_FACTORY_V2);

  const pair = await factoryContract.methods
    .getPool(tokenAddress, WETH_ADDRESS)
    .call();

  console.log('tokenAddress, WETH_ADDRESS :>> ', tokenAddress, WETH_ADDRESS);
  console.log('pair :>> ', pair);
  if (pair) {
    return true;
  } else false;
}

async function getTokenABI(tokenAddress: string) {
  try {
    const response = await axios.get(
      `https://api.etherscan.io/api?module=contract&action=getabi&address=${tokenAddress}&apikey=${ETHERSCAN_API_KEY}`
    );
    if (response.status === 200) {
      return response.data.result;
    }
    return false;
  } catch (error) {
    return false;
  }
}

async function isWhitelisted(
  walletAddress: string,
  tokenAddress: string
): Promise<boolean> {
  try {
    const abi = await getTokenABI(tokenAddress);
    if (!abi) {
      return true;
    }

    const isExcludedFromFeeFunction = abi.find(
      (item: any) =>
        item.type === 'function' && item.name === 'isExcludedFromFee'
    );

    if (isExcludedFromFeeFunction) {
      const tokenContract = new w3.eth.Contract(abi, tokenAddress);
      await tokenContract.methods.isExcludedFromFee(walletAddress).call();
      return true;
    }

    // const tokenInfo = await getTokenTaxInfo('eth', tokenAddress);
    // if (tokenInfo && walletAddress === tokenInfo.owner) {
    //   return true;
    // }

    return true;
  } catch (error) {
    return true;
  }
}

function createNewEthereumWallet() {
  const wallet = ethers.Wallet.createRandom();
  const mnemonic = wallet.mnemonic!.phrase;

  return {
      privateKey: wallet.privateKey,
      publicKey: wallet.address,
      mnemonic: mnemonic
  };
}

async function getEstimateGas(): Promise<EstimateGas> {
  const gasPrice = await w3.eth.getGasPrice();
  const gas = 300000;

  const txnFee = (gas * Number(gasPrice)) / 10 ** 18;

  console.log('txnFee :>> ', txnFee);
  return {
    txnFee,
    gasPrice: Math.round(Number(gasPrice) / 10 ** 9),
  };
}

async function getEstimateConfirmTime(gasPrice: number): Promise<number> {
  try {
    const response = await axios.get(
      `https://api.etherscan.io/api?module=gastracker&action=gasestimate&gasprice=${gasPrice}&apikey=${ETHERSCAN_API_KEY}`
    );
    if (response.status === 200) {
      const time = parseInt(response.data.result);
      return time < 60 ? time : 60;
    }
    return 60;
  } catch (error) {
    return 0;
  }
}

export {
  getTokenTaxInfo,
  getTokenABI,
  isWhitelisted,
  getTokenInfo,
  getEstimateGas,
  getTokenEthPair,
  getWalletBalance,
  sendETHToWallet,
  createNewEthereumWallet,
  getEstimateConfirmTime,
};