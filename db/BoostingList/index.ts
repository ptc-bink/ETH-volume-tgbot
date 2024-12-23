import mongoose, { mongo } from 'mongoose';

const BoostingList = new mongoose.Schema({
  userId: { type: String, require: true },
  tokenAddress: { type: String, require: false },
  selectTime: { type: Number, require: false }, //8 hr, 24 hr, 7 day
  packType: { type: Number, require: false }, //0.2, 0.35, 0.6, 1
  tokenType: { type: String, require: true }, // "Eth", "Sol"
  createdAt: {type: Date, default: new Date(new Date().toUTCString())}
});

const BoostingListModal = mongoose.model('BoostingList', BoostingList);

export default BoostingListModal;
