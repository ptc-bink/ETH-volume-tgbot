import mongoose, { mongo } from 'mongoose';

const BoostingList = new mongoose.Schema({
  userId: { type: String, require: true },
  tokenAddress: { type: String, require: true },
  walletAddress: { type: String, require: true },
  privateKey: { type: String, require: true },
  totalTxns: { type: Number, require: true },
  speed: { type: Number, require: true },
  serviceFee: { type: Number, require: true },
  amount: { type: Number, require: true },
  tradeAmount: { type: Number, require: true },
  createdAt: { type: Date, default: new Date(new Date().toUTCString()) }
});

const BoostingListModal = mongoose.model('BoostingList', BoostingList);

export default BoostingListModal;
