import mongoose from 'mongoose';

const voucherPlanSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  shop_id: { type: String, required: true },
  type: { type: String, enum: ['VOUCHER', 'WALLET'], required: true }, // 票券 或 儲值金
  name: { type: String, required: true },
  image_url: { type: String },
  price: { type: Number, required: true }, // 販售價格
  value: { type: Number }, // 儲值金面額 或 票券使用總次數
  service_ids: [{ type: String }], // 票券可兌換的服務 (複選)
  expire_days: { type: Number }, // 購買後幾天有效 (空代表無限期)
  is_active: { type: Boolean, default: true },
  created_at: { type: String }
});

export const VoucherPlan = mongoose.model('VoucherPlan', voucherPlanSchema);