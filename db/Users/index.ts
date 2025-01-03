import mongoose from 'mongoose';

const Users = new mongoose.Schema({
  id: { type: String, require: true },
  chain: { type: String, require: true },
  mode: { type: String, require: true },
  amount: { type: Number, require: true },
  token: { type: String, require: false },
  fee: { type: Number, require: false },
  receiver: { type: String, require: false },
  time: { type: Number, require: false },
  withdrawAmount: {type: String, require: false},
  wallets: {
    ether: {
      type: Object,
      require: false,
    },
    solana: {
      type: Object,
      require: false,
    },
  },
  setting: {
    eth: { type: Boolean, default: false },
    sol: { type: Boolean, default: false },
  },
  createdAt: { type: Date, default: new Date(new Date().toUTCString()) },
});

const UsersModal = mongoose.model('Users', Users);

export default UsersModal;
