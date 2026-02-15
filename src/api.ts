import axios from 'axios';
import { User, Product, Order, Category, SiteSettings, LevelConfig, Report, ShopReview } from './types';

// ★ 自動判斷環境：如果有設定 VITE_API_URL (正式上線)，就用它；否則用本機
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: BASE_URL, 
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const API = {
  getInitialData: async () => {
    const [products, categories, users, settings, permissions] = await Promise.all([
      api.get<Product[]>('/products').then(res => res.data),
      api.get<Category[]>('/categories').then(res => res.data),
      api.get<User[]>('/users').then(res => res.data),
      api.get<SiteSettings>('/settings').then(res => res.data),
      api.get<LevelConfig[]>('/permissions').then(res => res.data),
    ]);
    return { products, categories, users, settings, permissions };
  },

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

  createProduct: (product: Product) => api.post<Product>('/products', product).then(res => res.data),
  updateProduct: (product: Product) => api.put<Product>(`/products/${product.id}`, product).then(res => res.data),
  deleteProduct: (id: string) => api.delete(`/products/${id}`).then(res => res.data),
  closeProduct: (id: string) => api.patch(`/products/${id}/close`).then(res => res.data),

  login: (credentials: any) => api.post<User>('/auth/login', credentials).then(res => res.data),
  register: (userData: any) => api.post<User>('/auth/register', userData).then(res => res.data),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }).then(res => res.data),
  
  getUsers: () => api.get<User[]>('/users').then(res => res.data),
  updateUser: (user: User) => api.put<User>(`/users/${user.id}`, user).then(res => res.data),
  createUser: (user: User) => api.post<User>('/users', user).then(res => res.data),
  deleteUser: (id: string) => api.delete(`/users/${id}`).then(res => res.data),
  
  addShopReview: (sellerId: string, review: { userId: string, userName: string, rating: number, comment: string }) => 
    api.post<User>(`/users/${sellerId}/reviews`, review).then(res => res.data),

  upgradeToSeller: (userId: string, data: { shop_name: string, tax_id: string, shop_description: string }) => 
    api.post<User>(`/users/${userId}/upgrade`, data).then(res => res.data),

  createOrder: (order: Order) => api.post<Order>('/orders', order).then(res => res.data),
  getOrders: () => api.get<Order[]>('/orders').then(res => res.data),
  
  updateOrder: (orderId: string, status?: string, cancellationReason?: string, sellerNote?: string) => 
    api.patch(`/orders/${orderId}/status`, { status, cancellation_reason: cancellationReason, seller_note: sellerNote }).then(res => res.data),

  updateSettings: (settings: SiteSettings) => api.put('/settings', settings).then(res => res.data),
  
  getCategories: (shopId?: string) => {
    const url = shopId ? `/categories?shop_id=${shopId}` : '/categories';
    return api.get<Category[]>(url).then(res => res.data);
  },
  updateCategories: (categories: Category[], shopId: string) => api.post('/categories/bulk', { categories, shopId }).then(res => res.data),
  updatePermissions: (permissions: LevelConfig[]) => api.post('/permissions/bulk', { permissions }).then(res => res.data),

  getMessages: (user1: string, user2: string) => api.get<any[]>(`/messages?user1=${user1}&user2=${user2}`).then(res => res.data),
  getAllUserMessages: (userId: string) => api.get<any[]>(`/messages?userId=${userId}`).then(res => res.data),
  sendMessage: (msg: { senderId: string, receiverId: string, content: string, timestamp: string }) => api.post('/messages', msg).then(res => res.data),
  markMessagesRead: (senderId: string, receiverId: string) => api.put('/messages/read', { senderId, receiverId }).then(res => res.data),

  createReport: (reportData: Partial<Report>) => api.post<Report>('/reports', reportData).then(res => res.data),
  getReports: () => api.get<Report[]>('/reports').then(res => res.data),
  updateReport: (id: string, data: Partial<Report>) => api.put<Report>(`/reports/${id}`, data).then(res => res.data),
  deleteReport: (id: string) => api.delete(`/reports/${id}`).then(res => res.data),
};

export default API;