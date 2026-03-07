export interface Staff {
  id: string;
  shop_id: string;
  linked_user_id?: string;
  name: string;
  nickname?: string;
  avatar_url?: string;
  bio?: string;
  service_ids?: string[];
  work_schedule?: Record<string, any>; // ★ 保留這行即可
  created_at?: string;
  
  // ★ 新增這兩行告訴 TypeScript 有這兩個新資料
  shifts?: any[]; 
  leave_records?: any[];
  // ★ 新增：自訂假別模板與每日排班對應紀錄
  leave_templates?: any[];
  shift_assignments?: Record<string, string>;
}

export interface Service {
  id: string;
  shop_id: string;
  name: string;
  price: number;
  duration_minutes: number;
  buffer_minutes: number;
  requires_deposit: boolean;
  deposit_amount?: number;
  image_url?: string; 
  category?: string; 
  allowed_payment_methods?: string[]; // ★ 新增：允許的結帳方式
  allowed_times?: string[]; // ★ 新增：限定可預約時段
  staff_ids?: string[]; // ★ 新增：綁定的服務人員 ID 列表
  addons?: { name: string; price: number; duration_minutes: number; }[];
  resource_ids?: string[];
  form_id?: string;
  is_active: boolean;
}

export interface Resource {
  id: string;
  shop_id: string;
  name: string;
  quantity: number;
}

export interface Booking {
  id: string;
  shop_id: string;
  buyer_id: string;
  buyer_name?: string;  // ★ 新增
  buyer_phone?: string; // ★ 新增
  buyer_email?: string; // ★ 新增
  service_name?: string;// ★ 新增
  staff_id?: string;
  service_id: string;
  start_time: string;
  end_time: string;
  memo?: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
  deposit_status: 'UNPAID' | 'PAID' | 'REFUNDED' | 'FORFEITED';
  used_voucher_id?: string;
  // ★ 新增：金流與折抵相關欄位
  payment_method?: 'FULL' | 'DEPOSIT' | 'PAY_ON_SITE' | 'VOUCHER' | 'WALLET';
  payable_amount?: number;
  discount_amount?: number;
  used_wallet_amount?: number;
  used_coupon_id?: string;
  created_at?: string;
}

// ★ 新增：儲值金 (Wallet) 介面
export interface Wallet {
  id: string;
  shop_id: string;
  buyer_id: string;
  balance: number;
  created_at?: string;
  updated_at?: string;
}

// ★ 新增：優惠券 (Coupon) 介面
export interface Coupon {
  id: string;
  shop_id: string;
  code: string;
  discount_type: 'PERCENTAGE' | 'FIXED';
  discount_value: number;
  min_spend?: number;
  valid_until?: string;
  is_active: boolean;
}

export interface CustomerProfile {
  id: string;
  shop_id: string;
  buyer_id: string;
  tags?: string[];
  private_notes?: string;
  no_show_count: number;
}

export interface Voucher {
  id: string;
  code: string;
  shop_id: string;
  buyer_id: string;
  service_id?: string;
  total_count: number;
  remaining_count: number;
  expire_at?: string;
  created_at?: string;
}

export interface DaySchedule {
  isOpen: boolean;
  open: string;
  close: string;
  breakStart: string;
  breakEnd: string;
  slot_interval?: number;     // 新增：該日的預約間隔 (15, 30, 45, 60)
  disabled_slots?: string[];  // 新增：手動關閉的特定時段
}