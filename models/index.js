// models/index.js
import mongoose from 'mongoose';

// --- Database Schemas ---
const messageSchema = new mongoose.Schema({
  senderId: String,
  receiverId: String,
  content: String, 
  timestamp: String,
  isRead: { type: Boolean, default: false }
});

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  blacklisted_by: [String],
  name: String,
  failed_login_attempts: { type: Number, default: 0 },
  lockout_until: { type: Date, default: null },
  violation_points: { type: Number, default: 0 },
  has_excellent_badge: { type: Boolean, default: false },
  excellent_badge_expire_at: String,
  report_trust_score: { type: Number, default: 100 },
  shop_name: String,
  shop_description: String,
  tax_id: String, 
  phone: String,
  email: String,
  password: { type: String, required: true },
  plain_password: { type: String }, 
  role: String,
  level: Number,
  level_expire_at: String,
  shop_id: String,
  created_at: String,
  logo: String,
  banner: String,
  stats: {
    ratingCount: Number,
    productCount: Number,
    followerCount: Number,
    responseRate: Number,
    responseTime: String,
    joinTime: String,
    averageRating: Number
  },
  following: [String],
  bookmarks: { type: Array, default: [] },
  folders: { type: Array, default: [] },
  is_suspended: { type: Boolean, default: false },
  google_map_url: String,
  // ★ 新增：金物流設定與藍新串接資料
  payment_settings: {
    newebpay_merchant_id: String,
    newebpay_hash_key: String,
    newebpay_hash_iv: String,
    bank_info: {
      bank_name: String,
      bank_code: String,
      account_name: String,
      account_number: String
    },
    pickup_address: String
  },
  line_url: String,
  facebook_url: String,
  instagram_url: String,
  threads_url: String,
  welcome_message: String,
  google_calendar_token: String, 
  google_calendar_refresh_token: String,
  google_calendar_email: String,
  shop_reviews: [{ id: String, userId: String, userName: String, rating: Number, comment: String, createdAt: String }]
});

const productSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  views: { type: Object, default: {} },
  shop_id: String,
  category_ids: [String],
  category_id: String,
  name: String,
  description: String,
  custom_html: { type: String, default: "" }, // ★ 新增：進階 HTML 排版原始碼
  seo_title: { type: String, default: "" },   // ★ 新增：自訂 SEO 網頁標題
  seo_description: { type: String, default: "" }, // ★ 新增：自訂 SEO 網頁描述
  images: [String],
  price: Number,
  original_price: Number,
  is_preorder: { type: Boolean, default: false },
  preorder_end_date: String,
  preorder_arrival_date: String,
  status: String,
  product_type: String,
  digital_files: [String],
  variants: [{ name: String, price: Number, stock: Number, cost: Number }],
  cost: Number,
  average_cost: Number,
  stock_logs: Array,
  shipping_rules: [{ name: String, fee: Number, free_threshold: Number, limit_qty: Number, pickup_address: String }],
  payment_methods: [String],
  bank_info: { bank_name: String, bank_code: String, account_name: String, account_number: String },
  end_time: String,
  target_amount: Number,
  current_amount: Number,
  total_stock: Number,
  is_pinned: Boolean,
  pin_rank: { type: Number, default: null },
  origin: String,
  shipping_origin: String, 
  keywords: [String], 
  is_hidden: { type: Boolean, default: false },
  is_under_review: { type: Boolean, default: false },
  is_banned: { type: Boolean, default: false },
  report_count: { type: Number, default: 0 },
  view_password: { type: String, default: '' },
  questions: [{ title: String, required: Boolean }],
  reviews: [{ id: String, userId: String, userName: String, rating: Number, comment: String, createdAt: String }]
});

const orderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  items: Array,
  total_amount: Number,
  shipping_fee: Number,
  payment_method: String,
  pickup_datetime: String,
  status: String,
  cancellation_reason: String,
  seller_note: String,
  created_at: String,
  receiver_name: String,
  receiver_phone: String,
  ship_method: String,
  store_name: String,
  payment_note: String,
  remarks: String, 
  affiliate_info: {
    code: String,          
    influencer_id: String, 
    influencer_name: String,
    total_commission: Number, 
    status: { type: String, default: 'ESTIMATED' },
    details: Array
  },
  answers: [{ question: String, answer: String }], 
  shop_id: String
});

const categorySchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  shop_id: String,
  name: String,
  parent_id: { type: String, "default": null }, 
  image: String,
  type: { type: String, "default": 'MANUAL' },
  product_ids: [String],
  auto_rules: {
    keyword: String,
    price_min: Number,
    price_max: Number,
    is_discount: Boolean
  },
  sort_order: { type: Number, "default": 0 },
  is_active: { type: Boolean, "default": true },
  layout_style: { type: String, "default": 'STANDARD' },
  banner: String
});

const settingSchema = new mongoose.Schema({
  key: { type: String, default: 'main' },
  termsOfService: String,
  privacyPolicy: String,
  disclaimer: String,
  helpCenter: String,
  announcement: String,
  announcementImage: String,
  announcementActive: Boolean,
  registrationEnabled: { type: Boolean, default: true }, 
  antiScamMessage: String,
  // ★ 新增：將金流與付款選項的開關加入資料庫欄位，並預設為開啟
  enable_online_payment: { type: Boolean, default: true },
  enable_cod: { type: Boolean, default: true },
  enable_booking: { type: Boolean, default: true } // ★ 新增：預約系統開關
});

const permissionSchema = new mongoose.Schema({
  target_role: String,
  level: Number,
  role_name: String,
  max_products: Number,
  max_images_per_product: Number,
  max_variants_per_product: Number,
  can_edit_active_product: Boolean,
  point_feedback_rate: Number,
  discount_rate: Number,
  can_use_preorder: Boolean,
  max_drafts: Number,
  can_view_stats: Boolean,
  can_edit_banner: Boolean,
  can_edit_logo: Boolean,
  can_use_calendar: { type: Boolean, default: false }, // ★ 新增：行事曆權限
  can_use_booking: { type: Boolean, default: false }   // ★ 新增：預約系統權限
});

const reportSchema = new mongoose.Schema({
  id: String,
  type: String, 
  targetId: String,
  targetName: String,
  subject: String,
  reason: String,
  reporterId: String,
  reporterName: String,
  status: { type: String, default: 'PENDING' },
  created_at: String
});

const siteSettingsSchema = new mongoose.Schema({
  platform_views: { type: Object, default: {} } 
});

const influencerSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  account: { type: String, required: true, unique: true },
  name: String,
  email: String,
  phone: String,
  password: { type: String, required: true },
  created_at: String
});

const affiliateLinkSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  shop_id: String,
  influencer_id: String,
  influencer_name: String,
  product_id: String,
  primary_rate: Number,
  secondary_rate: Number,
  code: { type: String, required: true, unique: true },
  start_date: String,
  end_date: String,
  created_at: String
});

const affiliateClickSchema = new mongoose.Schema({
  id: String,
  link_id: String,
  shop_id: String,
  influencer_id: String,
  code: String,
  clicked_at: String
});

const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);
const Order = mongoose.model('Order', orderSchema);
const Category = mongoose.model('Category', categorySchema);
const Settings = mongoose.model('Settings', settingSchema);
const Permission = mongoose.model('Permission', permissionSchema);
const Message = mongoose.model('Message', messageSchema);
const Report = mongoose.model('Report', reportSchema);
const Influencer = mongoose.model('Influencer', influencerSchema);
const AffiliateLink = mongoose.model('AffiliateLink', affiliateLinkSchema);
const AffiliateClick = mongoose.model('AffiliateClick', affiliateClickSchema);

// ★ 將這些模型匯出，讓 server.js 可以使用
export {
  User, Product, SiteSettings, Order, Category, Settings, Permission, 
  Message, Report, Influencer, AffiliateLink, AffiliateClick
};

// ==========================================
// ★ 新增：匯出實體預約系統專屬模型 (來自 booking.js)
// ==========================================
export { 
  Staff, Service, Resource, Booking, CustomerProfile, Voucher, StoreBookingSetting 
} from './booking.js';

// ==========================================
// ★ 新增：匯出金流與折抵擴充模型
// ==========================================
export { Wallet } from './wallet.js';
export { Coupon } from './coupon.js';
export { VoucherPlan } from './voucherPlan.js'; // ★ 新增：販售套券方案模型
