import axios from 'axios';
import { Web3 } from 'web3';
import { get_factory_v2_abi, get_factory_v3_abi, get_router_abi } from '../../utils/utils';
import {
  PRIMARY_KEY,
  ETHERSCAN_API_KEY,
  WETH_ADDRESS,
  MEV_BLOCK_RPC_ENDPOINT,
  UNISWAP_FACTORY_V2,
} from '../../utils/constant';

const w3 = new Web3(new Web3.providers.HttpProvider(MEV_BLOCK_RPC_ENDPOINT));

interface TokenPair {
  pairAddress: string;
  base_mint: string;
  quote_mint: string;
  dexId: string;
}

interface TokenTaxInfo {
  buy: number;
  sell: number;
}

interface EstimateGas {
  txnFee: number;
  gasPrice: number;
}

async function getPairAddress(tokenAddress: string): Promise<TokenPair | null> {
  try {
    const response = await axios.get(
      `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`
    );
    const data = response.data;

    if (!data.pairs || data.pairs.length === 0) {
      return null;
    }

    const raydiumPairs = data.pairs.filter(
      (item: any) => item.quoteToken.address === WETH_ADDRESS
    );

    if (raydiumPairs.length === 0 || data.pairs[0].chainId !== 'ethereum') {
      return null;
    }

    return {
      pairAddress: raydiumPairs[0].pairAddress,
      base_mint: raydiumPairs[0].baseToken.address,
      quote_mint: raydiumPairs[0].quoteToken.address,
      dexId: 'v2',
    };
  } catch (error) {
    return null;
  }
}

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

// Check if token + ETH pair is existed using Uniswap Factory
async function getTokenEthPair(tokenAddress: string) {
  const abi = get_factory_v2_abi();
  const factoryContract = new w3.eth.Contract(abi, UNISWAP_FACTORY_V2)

  const pair = await factoryContract.methods.getPair(
    tokenAddress, WETH_ADDRESS
  ).call();

  console.log('tokenAddress, WETH_ADDRESS :>> ', tokenAddress, WETH_ADDRESS);
  console.log('pair :>> ', pair);
  if (pair) {
    return true;
  } else false
}

async function getTokenInfo(tokenAddress: string) {
  try {
    const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`)

    if (response.status == 200) {
      return response.data;      
    } else return false
  } catch (error) {
    return false;
  }
}

// Check if token + ETH pool is existed using Uniswap Factory
async function getTokenEthPool(tokenAddress: string) {
  const abi = get_factory_v3_abi();
  const factoryContract = new w3.eth.Contract(abi, UNISWAP_FACTORY_V2)

  const pair = await factoryContract.methods.getPool(
    tokenAddress, WETH_ADDRESS
  ).call();

  console.log('tokenAddress, WETH_ADDRESS :>> ', tokenAddress, WETH_ADDRESS);
  console.log('pair :>> ', pair);
  if (pair) {
    return true;
  } else false
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
  getPairAddress,
  getTokenTaxInfo,
  getTokenABI,
  isWhitelisted,
  getTokenInfo,
  getEstimateGas,
  getTokenEthPair,
  getEstimateConfirmTime,
};
