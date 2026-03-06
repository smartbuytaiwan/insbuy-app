export interface Staff {
  id: string;
  shop_id: string;
  linked_user_id?: string;
  name: string;
  nickname?: string;
  avatar_url?: string;
  bio?: string;
  service_ids?: string[];
  work_schedule?: Record<string, any>;
  created_at?: string;
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
  created_at?: string;
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