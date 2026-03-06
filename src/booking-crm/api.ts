import { Service, Staff, Booking, Resource, Voucher } from './types';

const BASE_URL = 'http://127.0.0.1:3001/api/booking';

const handleResponse = async (res: Response) => {
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'API 請求發生錯誤');
  }
  return res.json();
};

export const BookingAPI = {
  // === 服務項目 (Services) ===
  getServices: (shopId: string): Promise<Service[]> => fetch(`${BASE_URL}/services/${shopId}`).then(handleResponse),
  createService: (data: Partial<Service>): Promise<Service> => fetch(`${BASE_URL}/services`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(handleResponse),
  updateService: (id: string, data: Partial<Service>): Promise<Service> => fetch(`${BASE_URL}/services/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(handleResponse),
  deleteService: (id: string): Promise<void> => fetch(`${BASE_URL}/services/${id}`, { method: 'DELETE' }).then(handleResponse),

  // === 員工管理 (Staff) ===
  getStaff: (shopId: string): Promise<Staff[]> => fetch(`${BASE_URL}/staff/${shopId}`).then(handleResponse),
  createStaff: (data: Partial<Staff>): Promise<Staff> => fetch(`${BASE_URL}/staff`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(handleResponse),
  updateStaff: (id: string, data: Partial<Staff>): Promise<Staff> => fetch(`${BASE_URL}/staff/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(handleResponse),
  deleteStaff: (id: string): Promise<void> => fetch(`${BASE_URL}/staff/${id}`, { method: 'DELETE' }).then(handleResponse),

  // === 預約單與防撞期 (Bookings) ===
  getAvailableSlots: (shopId: string, serviceId: string, staffId: string | null, date: string): Promise<any> =>
    fetch(`${BASE_URL}/available-slots`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shop_id: shopId, service_id: serviceId, staff_id: staffId, date }) }).then(handleResponse),
  createBooking: (data: Partial<Booking>): Promise<Booking> => fetch(`${BASE_URL}/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(handleResponse),
  updateBookingStatus: (id: string, status: string): Promise<Booking> => fetch(`${BASE_URL}/update-status/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }).then(handleResponse),
  getBookings: (shopId?: string, buyerId?: string): Promise<Booking[]> => {
    const params = new URLSearchParams();
    if (shopId) params.append('shop_id', shopId);
    if (buyerId) params.append('buyer_id', buyerId);
    return fetch(`${BASE_URL}/list?${params.toString()}`).then(handleResponse);
  },

  // === 設備與資源 (Resources) ===
  getResources: (shopId: string): Promise<Resource[]> => fetch(`${BASE_URL}/resources/${shopId}`).then(handleResponse),
  createResource: (data: Partial<Resource>): Promise<Resource> => fetch(`${BASE_URL}/resources`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(handleResponse),
  updateResource: (id: string, data: Partial<Resource>): Promise<Resource> => fetch(`${BASE_URL}/resources/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(handleResponse),
  deleteResource: (id: string): Promise<void> => fetch(`${BASE_URL}/resources/${id}`, { method: 'DELETE' }).then(handleResponse),

  // === 套券與儲值金 (Vouchers) ===
  getVouchers: (shopId: string): Promise<Voucher[]> => fetch(`${BASE_URL}/vouchers/${shopId}`).then(handleResponse),
  createVoucher: (data: Partial<Voucher>): Promise<Voucher> => fetch(`${BASE_URL}/vouchers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(handleResponse),
  updateVoucher: (id: string, data: Partial<Voucher>): Promise<Voucher> => fetch(`${BASE_URL}/vouchers/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }).then(handleResponse),
  deleteVoucher: (id: string): Promise<void> => fetch(`${BASE_URL}/vouchers/${id}`, { method: 'DELETE' }).then(handleResponse),

  // === 營業時間設定 (Store Settings) ===
  getStoreSettings: (shopId: string): Promise<any> => fetch(`${BASE_URL}/settings/${shopId}`).then(handleResponse),
};