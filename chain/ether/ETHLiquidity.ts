import axios from 'axios';
import { Web3 } from 'web3';
import {
  get_router_v3_abi,
  get_router_abi,
  get_erc20_abi,
} from '../../utils/utils'; // import utilities
import {
  MEV_BLOCK_RPC_ENDPOINT,
  WETH_ADDRESS,
  UNISWAP_ROUTER_V3,
  UNISWAP_ROUTER_V2,
} from '../../utils/constant'; // import constants
import { getEstimateConfirmTime } from './utils';

const w3 = new Web3(new Web3.providers.HttpProvider(MEV_BLOCK_RPC_ENDPOINT));

interface Balance {
  eth: number;
  wei: number;
  token: number;
  decimals: number;
}

class ETHLiquidity {
  id: string;
  token_addr: string;
  wallet_addr: string;
  dexId: string;
  owner: string;
  createAt: number;
  txn: number;
  speed: string;
  calc_time: number;
  isBoost: boolean;
  isWorking: boolean;
  trade: number;

  constructor(
    userId: string,
    dexId: string,
    tokenAddress: string,
    walletAddress: string,
    secret_key: string,
    txn: number,
    speed: string,
    tradeAmount: number
  ) {
    this.id = userId;
    this.token_addr = tokenAddress;
    this.wallet_addr = walletAddress;
    this.dexId = dexId;
    this.owner = secret_key;
    this.createAt = Date.now() / 1000;
    this.txn = txn;
    this.speed = speed;
    this.calc_time = 0;
    this.isBoost = true;
    this.isWorking = false;
    this.trade = tradeAmount;
  }

  async swapETHToToken(amount: number): Promise<number | boolean> {
    console.log('ETH ---->>>> TOKEN');

    try {
      let routerContract;
      let abi;

      if (this.dexId === 'v3') {
        abi = get_router_v3_abi();
        routerContract = new w3.eth.Contract(abi, UNISWAP_ROUTER_V3);
      } else if (this.dexId === 'v2') {
        abi = get_router_abi();
        routerContract = new w3.eth.Contract(abi, UNISWAP_ROUTER_V2);
      } else {
        this.isBoost = false;
        return false;
      }

      const slippage = 0.03;
      const deadline = Math.floor(Date.now() / 1000) + 1200;
      const to_address = this.wallet_addr;
      const amount_in_wei = w3.utils.toWei(amount.toString(), 'ether');

      const expectedAmountOut = await routerContract.methods
        .getAmountsOut(amount_in_wei, [
          w3.utils.toChecksumAddress(WETH_ADDRESS),
          w3.utils.toChecksumAddress(this.token_addr),
        ])
        .call();

      let amount_out_min =
        expectedAmountOut[expectedAmountOut.length - 1] * (1 - slippage);
      amount_out_min = parseFloat(
        w3.utils.toWei(amount_out_min.toString(), 'wei')
      );
      if (amount_out_min <= 0) {
        return false;
      }

      console.log(amount_out_min);
      console.log(deadline);

      const swapFunction = routerContract.methods.swapExactETHForTokens(
        amount_out_min,
        [
          w3.utils.toChecksumAddress(WETH_ADDRESS),
          w3.utils.toChecksumAddress(this.token_addr),
        ],
        w3.utils.toChecksumAddress(to_address),
        deadline
      );

      const gas = await swapFunction.estimateGas({
        from: w3.utils.toChecksumAddress(this.wallet_addr),
        value: amount_in_wei,
      });

      const gasPrice = await w3.eth.getGasPrice();

      console.log(`gas: ${gas}`);

      const tx = await swapFunction.buildTransaction({
        from: w3.utils.toChecksumAddress(this.wallet_addr),
        value: amount_in_wei,
        gas,
        gasPrice: w3.utils.toWei((Number(gasPrice) + 2).toString(), 'gwei'),
        nonce: await w3.eth.getTransactionCount(
          w3.utils.toChecksumAddress(this.wallet_addr)
        ),
        chainId: 1,
      });

      const time = getEstimateConfirmTime(
        Number(w3.utils.toWei((Number(gasPrice) + 2).toString(), 'gwei'))
      );

      const signedTx = await w3.eth.accounts.signTransaction(tx, this.owner);
      let txHash = '';
      const data = {
        jsonrpc: '2.0',
        method: 'eth_sendRawTransaction',
        params: [w3.utils.toHex(signedTx.rawTransaction)],
        id: 1,
      };

      const response = await axios.post(MEV_BLOCK_RPC_ENDPOINT, data);
      if (response.status !== 200) {
        return false;
      }
      txHash = response.data.result;

      const txReceipt = await w3.eth.getTransactionReceipt(txHash);
      this.txn -= 1;
      const balance = await this.getBalance();
      if (balance.token > 10 ** (balance.decimals / 2)) {
        await this.swapTokenToETH(balance.token);
      }

      return time;
    } catch (e) {
      this.isBoost = false;
      this.isWorking = false;
      console.error('error:', e);
      return false;
    }
  }

  async swapTokenToETH(amount: number): Promise<void> {
    console.log('TOKEN ---->>>> ETH');

    try {
      let routerContract;
      let abi;

      if (this.dexId === 'v3') {
        abi = get_router_v3_abi();
        routerContract = new w3.eth.Contract(abi, UNISWAP_ROUTER_V3);
      } else if (this.dexId === 'v2') {
        abi = get_router_abi();
        routerContract = new w3.eth.Contract(abi, UNISWAP_ROUTER_V2);
      } else {
        this.isBoost = false;
        return;
      }

      let tokenAbi;
      const amountIn = amount;
      const deadline = Math.floor(Date.now() / 1000) + 1200;
      const toAddress = this.wallet_addr;

      const expectedAmountOut = await routerContract.methods
        .getAmountsOut(amountIn, [
          w3.utils.toChecksumAddress(this.token_addr),
          w3.utils.toChecksumAddress(WETH_ADDRESS),
        ])
        .call();

      tokenAbi = get_erc20_abi();
      const tokenContract = new w3.eth.Contract(
        tokenAbi,
        w3.utils.toChecksumAddress(this.token_addr)
      );

      const allowance = await tokenContract.methods.allowance(
          w3.utils.toChecksumAddress(this.wallet_addr),
          UNISWAP_ROUTER_V2
        )
        .call();

      if (allowance < amountIn) {
        const approveAmount = 1000000000000000000000000;
        const decimal = await tokenContract.methods.decimals().call();
        const approveFunction = tokenContract.methods.approve(
          UNISWAP_ROUTER_V2,
          approveAmount * 10 ** decimal
        );

        const gas = await approveFunction.estimateGas({
          from: w3.utils.toChecksumAddress(this.wallet_addr),
        });
        const gasPrice = await w3.eth.getGasPrice();

        const approveTx = await approveFunction.buildTransaction({
          gas,
          gasPrice: w3.utils.toWei((Number(gasPrice) + 2).toString(), 'gwei'),
          nonce: await w3.eth.getTransactionCount(
            w3.utils.toChecksumAddress(this.wallet_addr)
          ),
          chainId: 1,
        });

        const signedApproveTx = await w3.eth.accounts.signTransaction(
          approveTx,
          this.owner
        );
        const data = {
          jsonrpc: '2.0',
          method: 'eth_sendRawTransaction',
          params: [w3.utils.toHex(signedApproveTx.rawTransaction)],
          id: 1,
        };

        const response = await axios.post(MEV_BLOCK_RPC_ENDPOINT, data);
        if (response.status !== 200) {
          return;
        }
        const approveTxHash = response.data.result;
        await w3.eth.getTransactionReceipt(approveTxHash);
      }

      const swapFunction =
        routerContract.methods.swapExactTokensForETHSupportingFeeOnTransferTokens(
          amountIn,
          0,
          [
            w3.utils.toChecksumAddress(this.token_addr),
            w3.utils.toChecksumAddress(WETH_ADDRESS),
          ],
          toAddress,
          deadline
        );

      const gas = await swapFunction.estimateGas({
        from: w3.utils.toChecksumAddress(this.wallet_addr),
      });
      const gasPrice = await w3.eth.getGasPrice();

      const tx = await swapFunction.buildTransaction({
        gas,
        gasPrice: w3.utils.toWei((Number(gasPrice) + 2).toString(), 'gwei'),
        nonce: await w3.eth.getTransactionCount(
          w3.utils.toChecksumAddress(this.wallet_addr)
        ),
        chainId: 1,
      });

      const signedTx = await w3.eth.accounts.signTransaction(tx, this.owner);

      const data = {
        jsonrpc: '2.0',
        method: 'eth_sendRawTransaction',
        params: [w3.utils.toHex(signedTx.rawTransaction)],
        id: 1,
      };

      const response = await axios.post(MEV_BLOCK_RPC_ENDPOINT, data);
      if (response.status !== 200) {
        return;
      }

      const txHash = response.data.result;
      await w3.eth.getTransactionReceipt(txHash);
    } catch (e) {
      this.isBoost = false;
      this.isWorking = false;
      console.error('error:', e);
    }
  }

  async getBalance(): Promise<Balance> {
    let abi;
    const balanceWei = await w3.eth.getBalance(
      w3.utils.toChecksumAddress(this.wallet_addr)
    );

    abi = get_erc20_abi();
    const tokenContract = new w3.eth.Contract(
      abi,
      w3.utils.toChecksumAddress(this.token_addr)
    );

    const balance = await tokenContract.methods
      .balanceOf(w3.utils.toChecksumAddress(this.wallet_addr))
      .call();
    const decimal = await tokenContract.methods.decimals().call();

    return {
      eth: parseFloat(w3.utils.fromWei(balanceWei, 'ether')),
      wei: Number(balanceWei),
      token: Number(balance),
      decimals: Number(decimal),
    };
  }

  async waitForUpdateBalance(balanceBefore: Balance): Promise<void> {
    let balanceAfter = await this.getBalance();
    while (
      balanceAfter.token === balanceBefore.token &&
      balanceAfter.eth === balanceBefore.eth
    ) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      balanceAfter = await this.getBalance();
    }
  }
}

export { ETHLiquidity };
