
import axios from 'axios';
import { User, Product, Order, Category, SiteSettings, LevelConfig } from './types';

// 修改這裡：優先讀取環境變數 VITE_API_URL (正式站)，如果沒有則使用 /api (本地開發 Proxy)
const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 回應攔截器 (可選：處理全域錯誤)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const API = {
  // 初始化資料
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

  // 商品相關
  getProducts: () => api.get<Product[]>('/products').then(res => res.data),
  createProduct: (product: Product) => api.post<Product>('/products', product).then(res => res.data),
  updateProduct: (product: Product) => api.put<Product>(`/products/${product.id}`, product).then(res => res.data),
  deleteProduct: (id: string) => api.delete(`/products/${id}`),

  // 使用者相關
  login: (credentials: { phoneOrEmail: string; password: string; role: string }) => 
    api.post<User>('/auth/login', credentials).then(res => res.data),
  register: (user: User) => api.post<User>('/auth/register', user).then(res => res.data),
  updateUser: (user: User) => api.put<User>(`/users/${user.id}`, user).then(res => res.data),
  getUsers: () => api.get<User[]>('/users').then(res => res.data), // Admin用

  // 訂單相關
  createOrder: (order: Order) => api.post<Order>('/orders', order).then(res => res.data),
  getOrders: () => api.get<Order[]>('/orders').then(res => res.data),
  updateOrder: (orderId: string, status: string) => api.patch(`/orders/${orderId}/status`, { status }).then(res => res.data),

  // 設定與分類
  updateSettings: (settings: SiteSettings) => api.put('/settings', settings).then(res => res.data),
  updateCategories: (categories: Category[]) => api.post('/categories/bulk', { categories }).then(res => res.data),
  updatePermissions: (permissions: LevelConfig[]) => api.post('/permissions/bulk', { permissions }).then(res => res.data),
};

export default API;
