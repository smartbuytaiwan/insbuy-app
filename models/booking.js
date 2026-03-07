import mongoose from 'mongoose';

// 1. 員工 (Staff) 模型
const staffSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  shop_id: { type: String, required: true },
  linked_user_id: { type: String }, // 可綁定現有買家帳號為員工
  name: { type: String, required: true },
  nickname: { type: String },
  avatar_url: { type: String },
  bio: { type: String },
  service_ids: [{ type: String }], // 該員工可執行的服務項目 ID
  work_schedule: { type: Object, default: {} }, // 營業與排班時間設定
  // ★ 新增：排班與請假系統所需欄位 (確保 Mongoose 能正確儲存資料)
  shifts: { type: Array, default: [] },
  leave_records: { type: Array, default: [] },
  leave_templates: { type: Array, default: [] },
  shift_assignments: { type: Object, default: {} },
  created_at: { type: String }
});

// 2. 服務項目 (Service) 模型
const serviceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  shop_id: { type: String, required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  duration_minutes: { type: Number, required: true, default: 60 }, // 預計施作時長
  buffer_minutes: { type: Number, required: true, default: 15 },   // 緩衝清理時間
  requires_deposit: { type: Boolean, default: false }, // 是否需要定金
  deposit_amount: { type: Number, default: 0 },
  image_url: { type: String }, // ★ 新增：服務宣傳照
  category: { type: String, default: '未分類' }, // ★ 新增：大分類項目
  allowed_payment_methods: { type: Array, default: ['PAY_ON_SITE', 'FULL'] }, // ★ 新增：允許的結帳方式
  allowed_times: [{ type: String }], // ★ 新增：限定此服務可預約的特定時間 (如 10:00, 13:00)
  staff_ids: [{ type: String }], // ★ 新增：可執行此服務的指定員工 ID 列表
  addons: [{
    name: { type: String, required: true },
    price: { type: Number, required: true },
    duration_minutes: { type: Number, default: 0 }
  }], // ★ 新增：加購項目設定
  resource_ids: [{ type: String }], // 綁定的設備/包廂 ID
  form_id: { type: String }, // 術前同意書 ID
  is_active: { type: Boolean, default: true }
});

// 3. 設備與資源 (Resource) 模型
const resourceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  shop_id: { type: String, required: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, default: 1 }
});

// 4. 預約單 (Booking) 模型
const bookingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  shop_id: { type: String, required: true },
  buyer_id: { type: String, required: true }, // 顧客 ID
  buyer_name: { type: String },  // ★ 新增：顧客姓名 (直接紀錄方便行事曆讀取)
  buyer_phone: { type: String }, // ★ 新增：顧客電話
  buyer_email: { type: String }, // ★ 新增：顧客信箱
  service_name: { type: String },// ★ 新增：服務名稱
  staff_id: { type: String }, // 指定員工 (可為空，代表不指定)
  service_id: { type: String, required: true },
  start_time: { type: String, required: true }, // ISO 格式時間字串
  end_time: { type: String, required: true },   // ISO 格式時間字串
  memo: { type: String }, // 顧客備註
  status: { 
    type: String, 
    enum: ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'], 
    default: 'PENDING' 
  },
  deposit_status: { 
    type: String, 
    enum: ['UNPAID', 'PAID', 'REFUNDED', 'FORFEITED'], 
    default: 'UNPAID' 
  },
  used_voucher_id: { type: String }, // 若使用套券，紀錄套券 ID
  // ★ 新增：金流與折抵相關欄位
  payment_method: { type: String, enum: ['FULL', 'DEPOSIT', 'PAY_ON_SITE'], default: 'PAY_ON_SITE' }, // 付款方式：全額/訂金/現場付款
  payable_amount: { type: Number, default: 0 }, // 最終應付總額 (扣除折抵後)
  discount_amount: { type: Number, default: 0 }, // 總折抵金額
  used_wallet_amount: { type: Number, default: 0 }, // 儲值金回用扣抵金額
  used_coupon_id: { type: String }, // 使用的優惠券 ID
  created_at: { type: String }
});

// 5. 顧客標籤與 CRM (CustomerProfile) 模型
const customerProfileSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  shop_id: { type: String, required: true },
  buyer_id: { type: String, required: true },
  tags: [{ type: String }], // 自訂標籤 (如 VIP)
  private_notes: { type: String }, // 商家私密備註
  no_show_count: { type: Number, default: 0 } // 爽約次數
});

// 6. 套券/儲值金 (Voucher) 模型
const voucherSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  code: { type: String, required: true, unique: true }, // 核銷條碼
  shop_id: { type: String, required: true },
  buyer_id: { type: String, required: true },
  service_id: { type: String }, // 綁定的服務 (若是儲值金可為空)
  total_count: { type: Number, required: true },
  remaining_count: { type: Number, required: true },
  expire_at: { type: String },
  created_at: { type: String }
});

// 7. 店家營業時間與公休設定 (StoreBookingSetting) 模型
const storeBookingSettingSchema = new mongoose.Schema({
  shop_id: { type: String, required: true, unique: true },
  default_open_time: { type: String, default: "10:00" }, 
  default_close_time: { type: String, default: "21:00" }, 
  weekly_schedule: { type: Object, default: {} }, 
  closed_dates: [{ type: String }], 
  special_dates: { type: Object, default: {} }, 
  service_categories: [{ type: String }], 
  auto_assign_rule: { type: String, enum: ['LEAST_BOOKINGS', 'LEAST_REVENUE', 'PRIORITY'], default: 'LEAST_BOOKINGS' }, 
  priority_staff_id: { type: String }, 
  updated_at: { type: String },
  
  // ★ 關鍵修復：必須在這裡完整宣告所有欄位，Mongoose 才不會把前端傳來的資料丟掉！
  storefront_name: { type: String },
  storefront_avatar: { type: String }, 
  storefront_banner: { type: String },
  storefront_address: { type: String },
  storefront_notices: { type: String }
});

export const Staff = mongoose.model('Staff', staffSchema);
export const Service = mongoose.model('Service', serviceSchema);
export const Resource = mongoose.model('Resource', resourceSchema);
export const Booking = mongoose.model('Booking', bookingSchema);
export const CustomerProfile = mongoose.model('CustomerProfile', customerProfileSchema);
export const Voucher = mongoose.model('Voucher', voucherSchema);
export const StoreBookingSetting = mongoose.model('StoreBookingSetting', storeBookingSettingSchema);