// ★ 新增：庫存異動紀錄型別
export interface StockLog {
  id: string;
  variant_name: string; // 記錄是對哪個規格進行操作
  change_amount: number; // 正數代表增加，負數代表減少
  reason: string;
  created_at: string;
  order_id?: string; // ★ 新增：用於關聯被取消的訂單
  unit_cost?: number; // ★ 新增：紀錄當次異動時的「單位成本」
}

export interface ProductVariant {
  name: string;
  price: number;
  stock: number;
  cost?: number; // ★ 新增：該規格的獨立成本
}

export interface ShippingRule {
  name: string;
  fee: number;
  free_threshold: number;
  limit_qty?: number; 
  pickup_address?: string;
  sync_calendar?: boolean; // ★ 新增：是否同步至 Google 行事曆
  reminder_minutes?: number; // ★ 新增：提前幾分鐘提醒
}

export interface BankInfo {
  bank_name: string;
  bank_code: string;
  account_name: string;
  account_number: string;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ShopReview {
  id: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
}

export interface Product {
  id: string;
  shop_id: string;
  views?: Record<string, number>; // ★ 新增：商品每日瀏覽量紀錄
  category_ids: string[]; 
  category_id?: string; 
  name: string;
  description: string;
  images: string[];
  price: number;
  original_price: number;
  cost?: number; // ★ 新增：商品初始成本
  average_cost?: number; // ★ 新增：系統自動計算的移動平均成本
  status: 'OPEN' | 'CLOSED';
  product_type: 'PHYSICAL' | 'DIGITAL';
  digital_files?: string[];
  variants: ProductVariant[];
  shipping_rules: ShippingRule[];
  payment_methods?: string[]; 
  bank_info?: BankInfo;
  end_time?: string;
  target_amount?: number;
  current_amount?: number;
  total_stock: number;
  is_pinned?: boolean;
  pin_rank?: number;
  is_hidden?: boolean; // ★ 新增：隱藏銷售
  is_banned?: boolean; // ★ 新增：是否因為違規被管理員強制下架
  report_count?: number; // ★ 新增：累計被檢舉次數 (達 5 次自動進入 is_hidden)
  view_password?: string; // ★ 新增：專屬密碼
  origin?: string;
  shipping_origin?: string; 
  keywords?: string[]; 
  questions?: { title: string, required: boolean }[];
  reviews?: Review[];
  is_preorder?: boolean; // ★ 修復預購欄位
  preorder_end_date?: string; // ★ 修復預購日期
  preorder_arrival_date?: string; // ★ 修復預計到貨日
  custom_html?: string; // 自訂 HTML 程式碼
  seo_title?: string; // 自訂 SEO 標題
  seo_description?: string; // 自訂 SEO 網頁描述
  stock_logs?: StockLog[]; // ★ 新增：庫存異動歷史紀錄
}


export interface OrderItem extends Product {
  qty: number;
  selectedVariant?: string; 
  finalPrice: number;
  isReviewed?: boolean;
}

export interface Order {
  id: string;
  items: CartItem[];
  total_amount: number;
  pickup_datetime?: string; // ★ 新增：紀錄買家面交/自取時間
  shipping_fee: number;
  payment_method: string;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
  cancellation_reason?: string;
  seller_note?: string;
  created_at: string;
  receiver_name: string;
  receiver_phone: string;
  ship_method: string;
  store_name: string;
  payment_note?: string;
  remarks?: string;
  answers?: { question: string, answer: string }[];
  shop_id: string;
  affiliate_info?: any; // ★ 修復：加入分潤資訊的型別
}

export interface CartItem extends Product {
  qty: number;
  selectedVariant?: string;
  // ★ 修正：加入 finalPrice 以解決 Checkout.tsx 的錯誤
  finalPrice: number;
  isReviewed?: boolean;
}

export interface User {
  id: string;
  blacklisted_by?: string[]; // ★ 新增：被哪些賣家加入黑名單
  name: string;
  google_calendar_token?: string; // ★ 新增：Google 行事曆授權 Token
  google_calendar_email?: string; // ★ 新增：Google 行事曆綁定信箱
  welcome_message?: string;
  phone: string;
  email?: string;
  password?: string; 
  role: 'BUYER' | 'SELLER' | 'ADMIN' | 'PERMISSION_EDITOR';
  level: number;
  level_expire_at?: string; // ★ 補上缺少的到期日定義
  shop_id?: string;
  shop_name?: string;
  shop_description?: string;
  tax_id?: string;
  created_at?: string;
  logo?: string;
  banner?: string;
  stats?: {
    ratingCount: number;
    productCount: number;
    followerCount: number;
    responseRate: number;
    responseTime: string;
    joinTime: string;
    averageRating: number;
  };
  following?: string[];
  is_suspended?: boolean;
  report_trust_score?: number; // ★ 新增：檢舉人信用評分 (低於標準即 Shadowban)
  violation_points?: number; // ★ 新增：賣家違規記點
  has_excellent_badge?: boolean; // ★ 新增：優良商家標章
  excellent_badge_expire_at?: string; // ★ 新增：優良標章到期日
  google_map_url?: string;
  line_url?: string;
  facebook_url?: string;
  instagram_url?: string;
  threads_url?: string;
  shop_reviews?: ShopReview[];
}

export interface Category {
  id: string;
  shop_id: string; 
  name: string;
  parent_id: string | null; 
  image?: string; 
  type: 'MANUAL' | 'AUTO'; 
  product_ids: string[]; 
  auto_rules: {
    keyword?: string;
    price_min?: number;
    price_max?: number;
    is_discount?: boolean;
  };
  sort_order: number;
  is_active: boolean; 
  layout_style: 'STANDARD' | 'GRID' | 'LIST';
  banner?: string;
}

export interface LevelConfig {
  target_role: string;
  level: number;
  role_name: string;
  max_products: number;
  max_images_per_product: number;
  max_variants_per_product: number;
  can_edit_active_product: boolean;
  point_feedback_rate: number;
  discount_rate: number;
  can_use_preorder: boolean;
  max_drafts: number;
  can_view_stats: boolean;
  can_edit_banner: boolean;
  can_edit_logo: boolean;
}

export interface SiteSettings {
  platform_views?: Record<string, number>;
  key?: string;
  termsOfService: string;
  privacyPolicy: string;
  disclaimer: string;
  helpCenter: string;
  announcement: string;
  announcementImage?: string;
  announcementActive: boolean;
  registrationEnabled?: boolean;
  antiScamMessage?: string;
}

export interface Report {
  id: string;
  type: 'SHOP' | 'PRODUCT';
  target_id: string; // 配合資料庫轉為 snake_case
  target_name: string;
  category: string; // ★ 新增：檢舉分類
  reason: string;
  images?: string[]; // ★ 新增：佐證照片
  reporter_id: string;
  reporter_name: string;
  ip_address?: string; // ★ 新增：檢舉人 IP
  status: 'PENDING' | 'REVIEWING' | 'OBSERVING' | 'RESOLVED' | 'DISMISSED'; // ★ 加入 OBSERVING 列入觀察狀態
  created_at: string;
}

// ★ 新增：申訴紀錄表型別
export interface Appeal {
  id: string;
  target_id: string;
  seller_id: string;
  reason: string;
  proof_images?: string[];
  status: 'PENDING' | 'RESOLVED' | 'REJECTED';
  created_at: string;
}

export enum View {
  SHOP = 'SHOP',
  PRODUCT = 'PRODUCT',
  CART = 'CART',
  CHECKOUT = 'CHECKOUT',
  AUTH = 'AUTH',
  REGISTER_BUYER = 'REGISTER_BUYER',
  REGISTER_SELLER = 'REGISTER_SELLER',
  ADMIN_HOME = 'ADMIN_HOME',
  BUYER_DASHBOARD = 'BUYER_DASHBOARD',
  CHAT = 'CHAT',
  USER_MANAGEMENT = 'USER_MANAGEMENT',
  INFLUENCER_DASHBOARD = 'INFLUENCER_DASHBOARD' // ★ 新增這個網紅後台的路由
}

export const SYSTEM_CATEGORIES = [
  '美食與伴手禮',
  '居家生活',
  '美妝保養',
  '服飾配件',
  '3C家電',
  '母嬰用品',
  '運動戶外',
  '書籍文創',
  '寵物用品',
  '其他'
];

// ==========================================
// 以下為新增的網紅分潤系統型別定義
// ==========================================
export interface Influencer {
  id: string;
  account: string;
  name: string;
  email: string;
  phone: string;
  password?: string;
  created_at: string;
}

export interface AffiliateLink {
  id: string;
  shop_id: string;
  influencer_id: string;
  influencer_name: string;
  product_id: string;
  primary_rate: number;
  secondary_rate: number;
  code: string;
  start_date: string; // ★ 修復：活動開始日期
  end_date: string;   // ★ 修復：活動結束日期
  created_at: string;
}

export interface AffiliateClick {
  id: string;
  link_id?: string;
  shop_id: string;
  influencer_id?: string;
  code: string;
  clicked_at: string;
}