import axios from 'axios';
import { User, Product, Order, Category, SiteSettings, LevelConfig, Report, ShopReview, AffiliateLink } from './types';

// ★ 關鍵修正：將 'localhost' 改為 '127.0.0.1' 
const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3001/api';

const api = axios.create({
  baseURL: BASE_URL, 
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.code, error.message);
    return Promise.reject(error);
  }
);

export const API = {
  // ★ 新增：提交商家評價 API
  addShopReview: (shopId: string, reviewData: any) => api.post(`/users/${shopId}/reviews`, reviewData).then(res => res.data),

  // ★ 新增：綁定 Google 日曆 (取得永久 Token)
  bindGoogleCalendar: (userId: string, code: string) => api.post('/google/auth', { userId, code }).then(res => res.data),

 // ★ 新增：讓日曆元件能抓取/新增 Google 行程的 API
  getGoogleEvents: (userId: string) => api.get(`/google/events?userId=${userId}`).then(res => res.data),
  addGoogleEvent: (eventData: any) => api.post('/google/events', eventData).then(res => res.data),

  
  // 支援傳遞搜尋關鍵字 q
  getProducts: (shopId?: string, query?: string) => {
    let url = '/products';
    const params = new URLSearchParams();
    if (shopId) params.append('shop_id', shopId);
    if (query) params.append('q', query);
    const queryString = params.toString();
    if (queryString) url += `?${queryString}`;
    
    return api.get<Product[]>(url).then(res => res.data);
  },

  createProduct: (product: Product) => api.post('/products', product).then(res => res.data),
  // ★ 新增功能 4：Excel 批次快速上架 API
  createProductsBulk: (products: Product[]) => api.post('/products/bulk', { products }).then(res => res.data),
  updateProduct: (product: Partial<Product>) => api.put(`/products/${product.id}`, product).then(res => res.data),
  deleteProduct: (id: string) => api.delete(`/products/${id}`).then(res => res.data),
  
  login: (credentials: any) => api.post('/auth/login', credentials).then(res => res.data),
  register: (userData: any) => api.post('/auth/register', userData).then(res => res.data),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }).then(res => res.data),
  
  getUsers: () => api.get<User[]>('/users').then(res => res.data),
  updateUser: (user: Partial<User>) => api.put(`/users/${user.id}`, user).then(res => res.data),
  createUser: (user: Partial<User>) => api.post('/users', user).then(res => res.data), // ★ 補上新增使用者的 API
  deleteUser: (id: string) => api.delete(`/users/${id}`).then(res => res.data), // ★ 補上刪除使用者的 API
  
  createOrder: (order: Order) => api.post('/orders', order).then(res => res.data),
  getOrders: () => api.get<Order[]>('/orders').then(res => res.data),
  
  updateOrder: (id: string, status?: Order['status'], cancellationReason?: string, sellerNote?: string) => 
    api.patch(`/orders/${id}/status`, { status, cancellation_reason: cancellationReason, seller_note: sellerNote }).then(res => res.data),

  getSettings: () => api.get<SiteSettings>('/settings').then(res => res.data),

  updateSettings: (settings: SiteSettings) => api.put('/settings', settings).then(res => res.data),
  
  getCategories: (shopId?: string) => {
    const url = shopId ? `/categories?shop_id=${shopId}` : '/categories';
    return api.get<Category[]>(url).then(res => res.data);
  },
  
  updateCategories: (categories: Category[], shopId: string) => api.post('/categories/bulk', { categories, shopId }).then(res => res.data),
  getPermissions: () => api.get<LevelConfig[]>('/permissions').then(res => res.data),
  updatePermissions: (permissions: LevelConfig[]) => api.post('/permissions/bulk', { permissions }).then(res => res.data),
  
  getMessages: (user1: string, user2: string) => api.get<any[]>(`/messages?user1=${user1}&user2=${user2}`).then(res => res.data),
  getAllUserMessages: (userId: string) => api.get<any[]>(`/messages?userId=${userId}`).then(res => res.data),
  sendMessage: (msg: { senderId: string, receiverId: string, content: string, timestamp: string }) => api.post('/messages', msg).then(res => res.data),
  markMessagesRead: (senderId: string, receiverId: string) => api.put('/messages/read', { senderId, receiverId }).then(res => res.data),

  createReport: (reportData: Partial<Report>) => api.post<Report>('/reports', reportData).then(res => res.data),
  getReports: () => api.get<Report[]>('/reports').then(res => res.data),
  updateReport: (id: string, updates: any) => api.put(`/reports/${id}`, updates).then(res => res.data),
  deleteReport: (id: string) => api.delete(`/reports/${id}`).then(res => res.data),

  // ★ 新增：申訴機制 API
  createAppeal: (appealData: any) => api.post('/appeals', appealData).then(res => res.data),
  getAppeals: () => api.get('/appeals').then(res => res.data),
  updateAppeal: (id: string, updates: any) => api.put(`/appeals/${id}`, updates).then(res => res.data),

  // ==========================================
  // ★ 新增：黑名單與瀏覽量 API
  // ==========================================
  getPlatformViews: () => api.get('/platform-views').then(res => res.data),
  blacklistUser: (targetUserId: string, sellerId: string) => api.post(`/users/${targetUserId}/blacklist`, { sellerId }).then(res => res.data),
  recordProductView: (productId: string) => api.post(`/products/${productId}/view`).then(res => res.data),
  recordPlatformView: () => api.post('/settings/view').then(res => res.data),
  
  // ★ 新增：跨網購比價收藏夾的標題抓取 API
  fetchMetadata: (url: string) => api.get(`/fetch-metadata?url=${encodeURIComponent(url)}`).then(res => res.data),

  // ==========================================
  // 以下為專業版分潤系統與補充 API
  // ==========================================
  closeProduct: (id: string) => api.patch(`/products/${id}/close`).then(res => res.data), // ★ 修復：下架商品 API

  // 網紅獨立帳號系統
  registerInfluencer: (data: any) => api.post('/influencers/register', data).then(res => res.data),
  loginInfluencer: (credentials: any) => api.post('/influencers/login', credentials).then(res => res.data),
  getInfluencerByAccount: (account: string) => api.get(`/influencers/account/${account}`).then(res => res.data),
  
  // 分潤連結管理
  getAffiliateLinks: (shopId: string) => api.get<any[]>(`/affiliate-links?shop_id=${shopId}`).then(res => res.data),
  getAllAffiliateLinks: () => api.get<any[]>('/affiliate-links/all').then(res => res.data),
  createAffiliateLink: (link: any) => api.post('/affiliate-links', link).then(res => res.data),
  updateAffiliateLink: (id: string, updates: any) => api.put(`/affiliate-links/${id}`, updates).then(res => res.data),
  recordAffiliateClick: (clickData: any) => api.post('/affiliate-clicks', clickData).then(res => res.data),
  
  // ==========================================
  // ★ 新增：買家預約與折抵資產 API
  // ==========================================
  getBuyerBookings: (buyerId: string) => api.get(`/booking/list?buyer_id=${buyerId}`).then(res => res.data),
  getBuyerVouchers: (buyerId: string) => api.get(`/booking/vouchers/buyer/${buyerId}`).then(res => res.data),
  getBuyerWallet: (buyerId: string) => api.get(`/booking/wallet/buyer/${buyerId}`).then(res => res.data),
  
  // ★ 新增：票券轉贈好友 API
  transferVoucher: (data: { voucher_id: string, from_buyer_id: string, to_buyer_id: string }) => api.post('/booking/vouchers/transfer', data).then(res => res.data),
};

export default API;