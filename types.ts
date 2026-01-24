
export enum View {
  SHOP = 'shop',
  PRODUCT = 'product',
  CART = 'cart',
  CHECKOUT = 'checkout',
  AUTH = 'auth',
  REGISTER_BUYER = 'register-buyer',
  REGISTER_SELLER = 'register-seller',
  ADMIN_HOME = 'admin-home',
  BUYER_DASHBOARD = 'buyer-dashboard',
  CHAT = 'chat',
  USER_MANAGEMENT = 'user-management'
}

export interface BankInfo {
  bank_name: string;
  bank_code: string;
  account_name: string;
  account_number: string;
}

export interface ShippingRule {
  name: string;
  fee: number;
  free_threshold: number;
  limit_qty?: number;
  pickup_address?: string;
}

export interface ProductVariant {
  name: string;
  price: number;
  stock: number;
}

export interface ProductQuestion {
  title: string;
  required: boolean;
}

export interface Category {
  id: string;
  shop_id: string; // 歸屬於哪個賣家，若是全域分類則為 ADMIN
  name: string;
}

export interface Review {
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
  category_id?: string;
  name: string;
  description: string;
  images: string[];
  price: number;
  original_price: number;
  status: 'OPEN' | 'CLOSED' | 'REMOVED';
  
  // 新增商品類型與檔案
  product_type: 'PHYSICAL' | 'DIGITAL';
  digital_files?: string[]; // 數位檔案連結 (圖片/影片/PDF)

  variants: ProductVariant[];
  shipping_rules: ShippingRule[];
  bank_info?: BankInfo;
  end_time: string;
  target_amount: number;
  current_amount: number;
  total_stock: number;
  is_pinned: boolean;
  questions?: ProductQuestion[];
  
  // 新增評價列表
  reviews?: Review[];
}

export interface UserStats {
  ratingCount: number;
  productCount: number;
  followerCount: number;
  responseRate: number; // 百分比
  responseTime: string; // e.g., "幾小時內"
  joinTime: string;
  averageRating?: number; // 新增平均評分
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  password?: string;
  role: 'BUYER' | 'SELLER' | 'ADMIN';
  level: number;
  shop_id?: string;
  created_at?: string;
  // 新增商店外觀設定
  logo?: string;
  banner?: string; // 商店看板圖片
  // 新增商店數據 (唯讀統計用，實際計算由 App 端處理)
  stats?: UserStats;
  // 新增追蹤名單 (買家追蹤了哪些店鋪 ID)
  following?: string[];
}

export interface LevelConfig {
  target_role: 'SELLER' | 'BUYER' | 'ADMIN';
  level: number;
  role_name: string;
  
  // 商家專屬權限
  max_products: number;
  max_images_per_product: number;
  max_variants_per_product: number;
  can_edit_active_product: boolean;
  
  // 會員專屬優惠
  point_feedback_rate: number;
  discount_rate: number;
}

export interface SiteSettings {
  termsOfService: string;
  disclaimer: string;
  helpCenter: string;
  // 新增公告功能
  announcement?: string;
  announcementActive?: boolean;
}

export interface CartItem extends Product {
  selectedVariant?: string;
  qty: number;
  finalPrice: number;
  answers: Record<number, string>;
  isReviewed?: boolean; // 是否已評價
}

export interface Order {
  id: string;
  items: CartItem[];
  total_amount: number;
  shipping_fee: number;
  payment_method: 'TRANSFER' | 'COD';
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  receiver_name: string;
  receiver_phone: string;
  ship_method: string;
  store_name: string;
  payment_note?: string;
  shop_id: string;
}

export interface ChatMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  text: string;
  timestamp: string;
  product_id?: string;
}

export interface ChatThread {
  contact_id: string;
  contact_name: string;
  last_message: string;
  unread: boolean;
}
