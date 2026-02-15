
export interface ProductVariant {
  name: string;
  price: number;
  stock: number;
}

export interface ShippingRule {
  name: string;
  fee: number;
  free_threshold: number;
  limit_qty?: number; 
  pickup_address?: string;
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

export interface Product {
  id: string;
  shop_id: string;
  category_ids: string[]; 
  category_id?: string; 
  name: string;
  description: string;
  images: string[];
  price: number;
  original_price: number;
  status: 'OPEN' | 'CLOSED';
  product_type: 'PHYSICAL' | 'DIGITAL';
  digital_files?: string[];
  variants: ProductVariant[];
  shipping_rules: ShippingRule[];
  bank_info?: BankInfo;
  end_time?: string;
  target_amount?: number;
  current_amount?: number;
  total_stock: number;
  is_pinned?: boolean;
  origin?: string; // 產地欄位
  questions?: { title: string; required: boolean }[];
  reviews?: Review[];
}

export interface User {
  id: string;
  name: string;
  shop_name?: string;
  shop_description?: string;
  phone?: string;
  email?: string;
  password?: string;
  role: 'BUYER' | 'SELLER' | 'ADMIN' | 'PERMISSION_EDITOR';
  level: number;
  shop_id?: string;
  created_at: string;
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
}

export interface CartItem extends Product {
  qty: number;
  selectedVariant: string;
  finalPrice: number;
  isReviewed?: boolean;
}

export interface Order {
  id: string;
  items: CartItem[];
  total_amount: number;
  shipping_fee: number;
  payment_method: string;
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
  cancellation_reason?: string; // 新增：取消原因
  created_at: string;
  receiver_name: string;
  receiver_phone: string;
  ship_method: string;
  store_name: string;
  payment_note: string;
  shop_id: string;
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
  layout_style: 'STANDARD' | 'TWO_COL' | 'THREE_COL' | 'PRODUCT_LIST';
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
}

export interface SiteSettings {
  key?: string;
  termsOfService: string;
  disclaimer: string;
  helpCenter: string;
  announcement: string;
  announcementActive: boolean;
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
}

export const SYSTEM_CATEGORIES = [
  "電子數位商品",
  "3C與筆電",
  "保健、護理",
  "其他類別",
  "女生衣著",
  "女生包包/精品",
  "男生衣著",
  "男生包包與配件",
  "男女鞋",
  "女生配件/黃金",
  "娛樂、收藏",
  "嬰幼童與母親",
  "家電影音",
  "寵物",
  "居家生活",
  "戶外/旅行",
  "手機平板與周邊",
  "文創商品",
  "書籍及雜誌期刊",
  "服務、票券",
  "汽機車零件百貨",
  "美妝保養",
  "美食、伴手禮",
  "運動/健身",
  "電玩遊戲"
];
