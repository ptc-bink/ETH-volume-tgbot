export interface TokenPair {
  pairAddress: string;
  base_mint: string;
  quote_mint: string;
  dexId: string;
}

export interface TokenTaxInfo {
  buy: number;
  sell: number;
}

export interface EstimateGas {
  txnFee: number;
  gasPrice: number;
}