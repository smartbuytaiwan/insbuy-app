import mongoose from 'mongoose';

// 儲值金錢包 (Wallet) 模型
const walletSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  shop_id: { type: String, required: true },
  buyer_id: { type: String, required: true },
  balance: { type: Number, required: true, default: 0 }, // 目前可用儲值金餘額
  created_at: { type: String },
  updated_at: { type: String }
});

export const Wallet = mongoose.model('Wallet', walletSchema);