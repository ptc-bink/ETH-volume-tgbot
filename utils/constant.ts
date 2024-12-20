import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Reading environment variables
export const RPC_ENDPOINT = process.env.RPC_ENDPOINT || '';
export const RPC_WEBSOCKET_ENDPOINT = process.env.RPC_WEBSOCKET_ENDPOINT || '';
export const SOL_RPC_ENDPOINT = process.env.SOL_RPC_ENDPOINT || '';
export const SOL_ALCHEMY_RPC_ENDPOINT = process.env.SOL_ALCHEMY_RPC_ENDPOINT || '';
export const SOLANA_NET_RPC_ENDPOINT = process.env.SOLANA_NET_RPC_ENDPOINT || '';
export const ETH_RPC_ENDPOINT = process.env.ETH_RPC_ENDPOINT || '';
export const ETH_SEPOLIA_RPC_ENDPOINT = process.env.ETH_SEPOLIA_RPC_ENDPOINT || '';
export const BSC_RPC_ENDPOINT = process.env.BSC_RPC_ENDPOINT || '';
export const ARBITRUM_RPC_ENDPOINT = process.env.ARBITRUM_RPC_ENDPOINT || '';
export const MEV_BLOCK_RPC_ENDPOINT = process.env.MEV_BLOCK_RPC_ENDPOINT || '';

// Constant variables
export const SWAP_ROUTING = '';
export const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
export const WBNB_ADDRESS = "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c";
export const ARB_WETH_ADDRESS = "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1";
export const UNISWAP_ROUTER_V2 = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
export const PANCAKE_ROUTER_V2 = "0x10ED43C718714eb63d5aA57B78B54704E256024E";
export const PANCAKE_FACTORY_V2 = "0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73";
export const UNISWAP_ROUTER_V3 = "0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45";

// Static values
export const DISTRIBUTION_AMOUNT = 0.01;
export const BUY_AMOUNT = 0.01;
export const BUY_UPPER_AMOUNT = 0.002;
export const BUY_LOWER_AMOUNT = 0.01;
export const SLIPPAGE = 0.03

let poolID: string | null = null;

// Reading sensitive data from environment variables
export const PRIMARY_KEY = process.env.PRIMARY_KEY || '';
export const SECONDARY_KEY = process.env.SECONDARY_KEY || '';
export const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY || '';
export const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY || '';

// Server configuration
export const BOOST_SERVER_ENDPOINT = "http://127.0.0.1:8000";

// Wallet addresses and keys
export const BASE_WALLET_ADDRESS = process.env.BASE_WALLET_ADDRESS || '';
export const BASE_WALLET_PRIVATE_KEY = process.env.BASE_WALLET_PRIVATE_KEY || '';
export const SERVICE_WALLET_ADDRESS = process.env.SERVICE_WALLET_ADDRESS || '';

// List of server endpoints
export const SERVER_LIST: string[] = [
  "http://127.0.0.1:8000"
  // You can uncomment additional servers if necessary
  // "http://139.59.156.44:8000",
  // "http://64.226.93.252:8000",
  // "http://64.226.109.227:8000",
];