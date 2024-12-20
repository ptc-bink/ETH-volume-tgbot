import * as fs from 'fs';

interface Abi {
  // Define the structure of your ABI if you know it, for now we keep it as any.
  [key: string]: any;
}

export function get_bsc_factory_abi(): Abi {
  const data = fs.readFileSync('abi/bsc_factory_v2.json', 'utf8');
  return JSON.parse(data);
}

export function get_router_abi(): Abi {
  const data = fs.readFileSync('abi/router_v2.json', 'utf8');
  return JSON.parse(data);
}

export function get_bsc_router_abi(): Abi {
  const data = fs.readFileSync('abi/bsc_router_v2.json', 'utf8');
  return JSON.parse(data);
}

export function get_router_v3_abi(): Abi {
  const data = fs.readFileSync('abi/router_v3.json', 'utf8');
  return JSON.parse(data);
}

export function get_pair_abi(): Abi {
  const data = fs.readFileSync('abi/pair.json', 'utf8');
  return JSON.parse(data);
}

export function get_erc20_abi(): Abi {
  const data = fs.readFileSync('abi/erc20.json', 'utf8');
  return JSON.parse(data);
}

export function calculateTxnAndSpeed(time: string, amount: string) {
  let totalTxn = 0;
  let speed = 0;

  if (amount === '0.2') {
    totalTxn = 100;
    if (time === '6') speed = 5;
    if (time === '24') speed = 15;
    if (time === '7') speed = 100;
  }

  if (amount === '0.35') {
    totalTxn = 175;
    if (time === '6') speed = 3;
    if (time === '24') speed = 8;
    if (time === '7') speed = 60;
  }

  if (amount === '0.6') {
    totalTxn = 300;
    if (time === '6') speed = 2;
    if (time === '24') speed = 5;
    if (time === '7') speed = 33;
  }

  if (amount === '1') {
    totalTxn = 500;
    if (time === '6') speed = 1;
    if (time === '24') speed = 3;
    if (time === '7') speed = 20;
  }

  return {totalTxn, speed};
}

export function calcToVolTax(amount: string): number {
  if (amount === '0.2') return 100;
  if (amount === '0.35') return 175;
  if (amount === '0.6') return 300;
  if (amount === '1') return 500;
  return 0; // return default value if none match
}
