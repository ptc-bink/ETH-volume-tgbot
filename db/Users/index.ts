import mongoose from 'mongoose';

const Users = new mongoose.Schema({
  id: { type: String, require: true },
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
