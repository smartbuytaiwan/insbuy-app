
import axios from 'axios';
import { User, Product, Order, Category, SiteSettings, LevelConfig } from './types';

// 設定後端連線基礎網址
const api = axios.create({
  baseURL: 'http://localhost:3001/api', 
  headers: {
    'Content-Type': 'application/json',
  },
});

// 回應攔截器 (方便除錯)
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
  // 修正：支援 shopId 參數
  getProducts: (shopId?: string) => {
    const url = shopId ? `/products?shop_id=${shopId}` : '/products';
    return api.get<Product[]>(url).then(res => res.data);
  },
  createProduct: (product: Product) => api.post<Product>('/products', product).then(res => res.data),
  updateProduct: (product: Product) => api.put<Product>(`/products/${product.id}`, product).then(res => res.data),
  deleteProduct: (id: string) => api.delete(`/products/${id}`),

  // 使用者相關
  login: (credentials: { phoneOrEmail: string; password: string; role: string }) => 
    api.post<User>('/auth/login', credentials).then(res => res.data),
    
  register: (user: User) => api.post<User>('/auth/register', user).then(res => res.data),
  
  // ★★★ 關鍵修正：您剛剛缺的就是這一行！ ★★★
  createUser: (user: User) => api.post<User>('/users', user).then(res => res.data),
  
  updateUser: (user: User) => api.put<User>(`/users/${user.id}`, user).then(res => res.data),
  getUsers: () => api.get<User[]>('/users').then(res => res.data), 

  // 訂單相關
  createOrder: (order: Order) => api.post<Order>('/orders', order).then(res => res.data),
  getOrders: () => api.get<Order[]>('/orders').then(res => res.data),
  updateOrder: (orderId: string, status: string, cancellationReason?: string) => 
    api.patch(`/orders/${orderId}/status`, { status, cancellation_reason: cancellationReason }).then(res => res.data),

  // 設定與分類
  updateSettings: (settings: SiteSettings) => api.put('/settings', settings).then(res => res.data),
  
  // 修正：獨立的 getCategories，支援 shopId
  getCategories: (shopId?: string) => {
    const url = shopId ? `/categories?shop_id=${shopId}` : '/categories';
    return api.get<Category[]>(url).then(res => res.data);
  },

  // 更新分類列表 (包含新增、修改、排序、刪除)
  // 修正：增加 shopId 參數，避免空列表時無法識別商家
  updateCategories: (categories: Category[], shopId: string) => api.post('/categories/bulk', { categories, shopId }).then(res => res.data),
  updatePermissions: (permissions: LevelConfig[]) => api.post('/permissions/bulk', { permissions }).then(res => res.data),
};

export default API;
