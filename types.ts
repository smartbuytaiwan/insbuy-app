
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
  CHAT = 'chat'
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

export interface Product {
  id: string;
  shop_id: string;
  name: string;
  description: string;
  images: string[];
  price: number;
  original_price: number;
  status: 'OPEN' | 'CLOSED' | 'REMOVED';
  variants: ProductVariant[];
  shipping_rules: ShippingRule[];
  bank_info?: BankInfo;
  end_time: string;
  target_amount: number;
  total_stock: number;
  is_pinned: boolean;
  questions?: ProductQuestion[];
}

export interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: 'BUYER' | 'SELLER';
  shop_id?: string;
}

export interface CartItem extends Product {
  selectedVariant?: string;
  qty: number;
  finalPrice: number;
  answers: Record<number, string>;
}

export interface Order {
  id: string;
  items: CartItem[];
  total_amount: number;
  shipping_fee: number;
  payment_method: 'TRANSFER' | 'COD';
  status: 'PENDING' | 'PAID' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
  created_at: string;
  receiver_name: string;
  receiver_phone: string;
  ship_method: string;
  store_name: string;
  payment_note?: string;
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
