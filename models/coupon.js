import mongoose from 'mongoose';

// 優惠券 (Coupon) 模型
const couponSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  shop_id: { type: String, required: true },
  code: { type: String, required: true }, // 優惠碼
  discount_type: { type: String, enum: ['PERCENTAGE', 'FIXED'], required: true }, // 折扣類型：%數 或 固定金額
  discount_value: { type: Number, required: true }, // 折扣值 (例如 90 代表 9折，100 代表折抵 100元)
  min_spend: { type: Number, default: 0 }, // 最低消費門檻
  valid_until: { type: String }, // 使用期限
  is_active: { type: Boolean, default: true } // 是否開放使用
});

export const Coupon = mongoose.model('Coupon', couponSchema);