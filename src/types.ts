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
  payment_methods?: string[]; 
  bank_info?: BankInfo;
  end_time?: string;
  target_amount?: number;
  current_amount?: number;
  total_stock: number;
  is_pinned?: boolean;
  pin_rank?: number; // 1-99
  origin?: string;
  // ★ 新增：詳細出貨地點 (如：台北市中山區)
  shipping_origin?: string;
  questions?: { title: string, required: boolean }[];
  reviews?: Review[];
}

export interface OrderItem extends Product {
  qty: number;
  selectedVariant?: string; 
  finalPrice: number;
  isReviewed?: boolean;
}

export interface Order {
  id: string;
  items: OrderItem[];
  total_amount: number;
  shipping_fee: number;
  payment_method: 'TRANSFER' | 'COD' | 'CASH';
  status: 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
  cancellation_reason?: string;
  seller_note?: string; 
  created_at: string;
  receiver_name: string;
  receiver_phone: string;
  ship_method: string;
  store_name?: string; 
  payment_note?: string; 
  remarks?: string; 
  answers?: { question: string, answer: string }[]; 
  shop_id: string; 
}

export interface CartItem extends Product {
  qty: number;
  selectedVariant?: string; 
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  password?: string; 
  role: 'BUYER' | 'SELLER' | 'ADMIN' | 'PERMISSION_EDITOR';
  level: number;
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
}

export interface SiteSettings {
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
  targetId: string;
  targetName: string;
  subject: string;
  reason: string;
  reporterId: string;
  reporterName: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
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
  USER_MANAGEMENT = 'USER_MANAGEMENT'
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