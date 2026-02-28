import React, { useState, useEffect, useMemo } from 'react';
import { View, Product, User, CartItem, Order, LevelConfig, SiteSettings, Category, Review, SYSTEM_CATEGORIES as DEFAULT_SYSTEM_STRINGS } from './types';
import Header from './components/Header';
import Shop from './components/Shop';
import ProductDetail from './components/ProductDetail';
import Cart from './components/Cart';
import Checkout from './components/Checkout';
import AuthHub from './components/AuthHub';
import RegisterBuyer from './components/RegisterBuyer';
import RegisterSeller from './components/RegisterSeller';
import AdminDashboard from './components/AdminDashboard';
import BuyerDashboard from './components/BuyerDashboard';
import ChatRoom from './components/ChatRoom';
import UserManagement from './components/UserManagement';
import API from './api';
import InfluencerDashboard from './components/InfluencerDashboard';
import PrivacyPolicy from './components/PrivacyPolicy';
import TermsOfService from './components/TermsOfService';

// ★ 新增：圖形驗證碼元件
const CaptchaModal = ({ onVerify, onCancel }: { onVerify: () => void, onCancel: () => void }) => {
  const [code, setCode] = useState('');
  const [input, setInput] = useState('');
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 4; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    setCode(result);
  };

  useEffect(() => { generateCode(); }, []);

  useEffect(() => {
    if (canvasRef.current && code) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, 120, 40);
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(0, 0, 120, 40);
        ctx.font = 'bold 24px monospace';
        ctx.fillStyle = '#334155';
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        // 加入干擾線
        for(let i=0; i<5; i++) {
           ctx.strokeStyle = `rgba(0,0,0,0.1)`;
           ctx.beginPath();
           ctx.moveTo(Math.random()*120, Math.random()*40);
           ctx.lineTo(Math.random()*120, Math.random()*40);
           ctx.stroke();
        }
        ctx.fillText(code, 60, 20);
      }
    }
  }, [code]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.toUpperCase() === code) onVerify();
    else { alert('驗證碼錯誤，請重新輸入'); generateCode(); setInput(''); }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-scale-up">
        <h3 className="font-bold text-lg mb-4 text-center">安全驗證</h3>
        <p className="text-xs text-slate-500 mb-4 text-center">為了確保您的帳號安全，請輸入下方驗證碼</p>
        <div className="flex justify-center mb-4 cursor-pointer" onClick={generateCode} title="點擊更換">
           <canvas ref={canvasRef} width={120} height={40} className="rounded border border-slate-200" />
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
           <input 
             autoFocus
             type="text" 
             className="w-full border border-slate-200 rounded-xl px-4 py-3 text-center font-bold outline-none focus:border-[#EE4D2D] tracking-widest uppercase"
             placeholder="輸入驗證碼"
             value={input}
             onChange={e => setInput(e.target.value)}
           />
           <div className="flex gap-2">
             <button type="button" onClick={onCancel} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold">取消</button>
             <button type="submit" className="flex-1 py-3 bg-[#EE4D2D] text-white rounded-xl font-bold shadow-md">確認登入</button>
           </div>
        </form>
      </div>
    </div>
  );
};

const SYSTEM_ADMIN_USER: User = {
  id: 'ADMIN',
  name: 'InsBuy 系統管理員',
  role: 'ADMIN',
  level: 99,
  email: 'admin@insbuy.com',
  phone: '0900000000',
  created_at: new Date().toISOString(),
  is_suspended: false,
  logo: 'https://cdn-icons-png.flaticon.com/512/9322/9322127.png', 
  stats: { ratingCount: 0, productCount: 0, followerCount: 0, responseRate: 100, responseTime: '即時', joinTime: '', averageRating: 0 }
};

const App: React.FC = () => {
  const [view, setView] = useState<View>(View.SHOP);
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]); 
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkoutItems, setCheckoutItems] = useState<CartItem[]>([]); 
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  
  const [searchQuery, setSearchQuery] = useState(''); 
  const [appliedSearch, setAppliedSearch] = useState(''); 

  const [chatTarget, setChatTarget] = useState<string | null>(null);
  const [currentShopId, setCurrentShopId] = useState<string | null>(null); 
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [dashboardTab, setDashboardTab] = useState<string | null>(null);
  const [adminTab, setAdminTab] = useState<string | null>(null);
  const [systemCategories, setSystemCategories] = useState<Category[]>([]);
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementImage, setAnnouncementImage] = useState<string | null>(null);
  const [modalContent, setModalContent] = useState<{title: string, content: string} | null>(null);
  const [permissions, setPermissions] = useState<LevelConfig[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    termsOfService: '', privacyPolicy: '', disclaimer: '', helpCenter: '', announcement: '', announcementImage: '', announcementActive: false, antiScamMessage: '', registrationEnabled: true
  });
  
  // 預設為 true，讓 UI 直接顯示，不要等待 API
  const [isDataLoaded, setIsDataLoaded] = useState(true);
  
  const [fetchError, setFetchError] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const [isFabOpen, setIsFabOpen] = useState(false);
  const [shopRefreshKey, setShopRefreshKey] = useState(0);
  const [pendingLoginUser, setPendingLoginUser] = useState<any>(null); // ★ 新增：暫存登入資訊
  
  // ★ 新增：購物車遺忘提醒狀態
  const [showCartReminder, setShowCartReminder] = useState(false);

  const [viewedOrderIds, setViewedOrderIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('insbuy_viewed_orders');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    if (modalContent) {
      const modalContainer = document.getElementById('modal-scroll-container');
      if (modalContainer) {
        modalContainer.scrollTop = 0;
      }
    }
  }, [modalContent]);

  const handleMarkAsViewed = (orderId: string) => {
    if (!viewedOrderIds.includes(orderId)) {
      const newIds = [...viewedOrderIds, orderId];
      setViewedOrderIds(newIds);
      try {
        localStorage.setItem('insbuy_viewed_orders', JSON.stringify(newIds));
      } catch (e) {
        console.warn('LocalStorage full, viewed status not saved locally.');
      }
    }
  };

  // ★ 新增：當商品切換時，自動觸發該商品的瀏覽量 +1
  useEffect(() => {
      if (view === View.PRODUCT && selectedProduct && API.recordProductView) {
          API.recordProductView(selectedProduct.id).catch(() => {});
      }
  }, [view, selectedProduct?.id]);

  // ★ 新增：購物車遺忘提醒邏輯
  useEffect(() => {
      // 如果購物車有東西，且目前不在購物車或結帳頁面，延遲3秒後顯示提示
      if (cart.length > 0 && view !== View.CART && view !== View.CHECKOUT) {
          const timer = setTimeout(() => {
              setShowCartReminder(true);
          }, 3000); 
          return () => clearTimeout(timer);
      } else {
          setShowCartReminder(false);
      }
  }, [cart.length, view]);

  // ★ 新增：當切換回賣家後台時，重新拉取最新商品資料 (讓瀏覽量數字馬上更新)
  useEffect(() => {
      if (view === View.ADMIN_HOME) {
          API.getProducts().then(setProducts).catch(console.error);
      }
  }, [view]);

  useEffect(() => {
    const initApp = async () => {
        setFetchError(false);
        const savedUser = localStorage.getItem('insbuy_user');
        if (savedUser) setUser(JSON.parse(savedUser));
        
        const savedCart = localStorage.getItem('insbuy_cart');
        if (savedCart) setCart(JSON.parse(savedCart));

        // ★ 新增：紀錄平台首頁與總體瀏覽量
        if (API.recordPlatformView) {
            API.recordPlatformView().catch(() => {});
        }

        // 平行載入所有資料
        API.getSettings().then(setSiteSettings).catch(console.error);
        API.getProducts().then(setProducts).catch(console.error);
        API.getCategories().then(setCategories).catch(console.error);
        API.getUsers().then(users => {
            setAllUsers([...users, SYSTEM_ADMIN_USER]);
            // 確保每次重整頁面時，同步更新當前使用者的最新等級與權限
            if (savedUser) {
                const parsedUser = JSON.parse(savedUser);
                const freshUser = users.find(u => u.id === parsedUser.id);
                if (freshUser) {
                    setUser(freshUser);
                    localStorage.setItem('insbuy_user', JSON.stringify(freshUser));
                }
            }
        }).catch(console.error);
        API.getPermissions().then(setPermissions).catch(console.error);
        API.getOrders().then(setOrders).catch(console.error);

        fetch('http://127.0.0.1:3001/api/categories?shop_id=SYSTEM')
           .then(res => res.json())
           .then(sysCats => {
               if (Array.isArray(sysCats) && sysCats.length > 0) {
                  setSystemCategories(sysCats);
               } else {
                  const initialSysCats: Category[] = DEFAULT_SYSTEM_STRINGS.map((name, index) => ({
                    id: `sys_${index}`,
                    shop_id: 'SYSTEM',
                    name: name,
                    parent_id: null,
                    type: 'MANUAL',
                    product_ids: [],
                    auto_rules: {},
                    sort_order: index,
                    is_active: true,
                    layout_style: 'STANDARD'
                  }));
                  setSystemCategories(initialSysCats);
               }
           })
           .catch(() => {});
    };
    initApp();
  }, []);

  // ★ 新增：當商品切換時，自動觸發該商品的瀏覽量 +1
  useEffect(() => {
      if (view === View.PRODUCT && selectedProduct && API.recordProductView) {
          API.recordProductView(selectedProduct.id).catch(() => {});
      }
  }, [view, selectedProduct?.id]);

  // ★ 新增：當切換回賣家後台時，重新拉取最新商品資料 (讓瀏覽量數字馬上更新)
  useEffect(() => {
      if (view === View.ADMIN_HOME) {
          API.getProducts().then(setProducts).catch(console.error);
      }
  }, [view]);

  // 訂單輪詢：每 60 秒一次
  useEffect(() => {
    if (!user) return; 
    const syncOrders = async () => {
      try {
        const latestOrders = await API.getOrders();
        setOrders(latestOrders);
      } catch (e) {}
    };
    const intervalId = setInterval(syncOrders, 60000); 
    return () => clearInterval(intervalId);
  }, [user]);

  const pendingOrderCount = useMemo(() => {
    if (!user || (user.role !== 'SELLER' && user.role !== 'ADMIN')) return 0;
    return orders.filter(o => {
       const isMyOrder = user.role === 'ADMIN' || o.shop_id === (user.shop_id || user.id);
       const isActive = o.status === 'PENDING' || o.status === 'CONFIRMED';
       const isNotViewed = !viewedOrderIds.includes(o.id);
       return isMyOrder && isActive && isNotViewed;
    }).length;
  }, [orders, user, viewedOrderIds]);

  useEffect(() => {
    if (siteSettings.announcementActive) {
      const today = new Date().toISOString().split('T')[0];
      const lastViewedDate = localStorage.getItem('insbuy_last_announcement_date');
      if (lastViewedDate !== today && (siteSettings.announcement || siteSettings.announcementImage)) {
        setAnnouncementText(siteSettings.announcement);
        setAnnouncementImage(siteSettings.announcementImage || null);
        setShowAnnouncement(true);
      }
    }
  }, [siteSettings]);

  const handleCloseAnnouncement = () => {
    setShowAnnouncement(false);
    const today = new Date().toISOString().split('T')[0];
    try {
      localStorage.setItem('insbuy_last_announcement_date', today);
    } catch (e) {}
  };

  useEffect(() => {
    try {
      localStorage.setItem('insbuy_cart', JSON.stringify(cart));
    } catch (error) {
      console.error('LocalStorage Quota Exceeded');
    }
  }, [cart]);

  // ★ 整合愛聊：自動幫忙轉換，找出最原始的帳號 ID
  const getUnifiedChatId = (id: string, users: User[]) => {
      const found = users.find(u => u.id === id || u.shop_id === id || u.phone === id);
      return found ? found.id : id;
  };

  // ★ 愛聊全域整合：統一轉換為底層帳號 ID
  const resolveGlobalChatId = (id: string | null, users: User[]) => {
      if (!id) return null;
      if (id === 'ADMIN') return id;
      const found = users.find(u => u.id === id || u.shop_id === id || u.phone === id);
      return found ? found.id : id;
  };

  useEffect(() => {
    if (chatTarget && user) {
      const myId = user.role === 'ADMIN' ? 'ADMIN' : user.id;
      const trueTarget = resolveGlobalChatId(chatTarget, allUsers);
      if (trueTarget) {
          API.markMessagesRead(trueTarget, myId).then(() => {
             const event = new Event('insbuy_message_read');
             window.dispatchEvent(event);
          }).catch(() => {});
      }
    }
  }, [chatTarget, user, allUsers]);

  // 訊息輪詢：每 10 秒一次
  useEffect(() => {
    const checkUnread = async () => {
      if (!user) {
        setUnreadCount(0);
        return;
      }
      try {
        const myId = user.role === 'ADMIN' ? SYSTEM_ADMIN_USER.id : user.id;
        const allMsgs = await API.getAllUserMessages(myId);
        const trueTarget = resolveGlobalChatId(chatTarget, allUsers);
        
        // 改為計算「有未讀訊息的對話(發送者)數量」，讓外部數字與對話列表的紅點數量一致
              const unreadSenders = new Set();

              allMsgs.forEach((m: any) => {
                 if (m.receiverId !== myId && m.receiverId !== user?.shop_id && m.receiverId !== user?.phone) return;
                 if (m.isRead) return;
                 // ★ 排除自己發給自己的訊息
                 if (m.senderId === myId || m.senderId === user?.shop_id || m.senderId === user?.phone) return;
                 
                 const senderObj = allUsers.find(u => u.id === m.senderId || u.shop_id === m.senderId || u.phone === m.senderId);
                 
                 // ★ 排除已經不存在的使用者 (幽靈訊息)，不再計入全域未讀數字
                 if (!senderObj && m.senderId !== 'SYSTEM' && m.senderId !== 'ADMIN') return;

                 const senderIds = [m.senderId];
                 if (senderObj) {
                     if (senderObj.id) senderIds.push(senderObj.id);
                     if (senderObj.shop_id) senderIds.push(senderObj.shop_id);
                     if (senderObj.phone) senderIds.push(senderObj.phone);
                 }
                 
                 if (trueTarget && senderIds.includes(trueTarget)) return;
                 
                 const msgTime = new Date(m.timestamp).getTime();
                 let isReallyUnread = true;
                 for (const sId of senderIds) {
                     const lastRead = localStorage.getItem(`insbuy_last_read_${myId}_${sId}`);
                     if (lastRead && msgTime <= new Date(lastRead).getTime()) {
                         isReallyUnread = false; 
                         break;
                     }
                 }
                 
                 if (isReallyUnread) {
                     // 記錄不重複的發送者 ID
                     unreadSenders.add(senderObj ? senderObj.id : m.senderId);
                 }
              });

              setUnreadCount(unreadSenders.size);
      } catch (e) {}
    };

    checkUnread();
    const interval = setInterval(checkUnread, 10000); 
    window.addEventListener('insbuy_message_read', checkUnread);
    return () => {
        clearInterval(interval);
        window.removeEventListener('insbuy_message_read', checkUnread);
    };
  }, [user, chatTarget]);

  const handleHashRouting = (currentProducts?: Product[]) => {
    const hash = window.location.hash.replace('#/', '');
    if (!hash) {
      setView(View.SHOP);
      setCurrentShopId(null);
      return;
    }
    // ★ 修復：將網址的路徑與參數 (?ref=...) 分開，避免找錯商品 ID 導致白畫面
    const pathString = hash.split('?')[0];
    const parts = pathString.split('/');
    const viewName = parts[0] as View;
    const id = parts[1];

    if (parts[0] === 'privacy') {
      setView('PRIVACY' as any);
      return;
    }
    if (parts[0] === 'terms') {
      setView('TERMS' as any);
      return;
    }

    if (Object.values(View).includes(viewName)) {
      setView(viewName);
      if (viewName === View.PRODUCT && id) {
        const pool = currentProducts || products;
        const p = pool.find(item => item.id === id);
        if (p) setSelectedProduct(p);
      } else if (viewName === View.SHOP && id) {
        setCurrentShopId(id);
      } else if (viewName === View.SHOP && !id) {
        setCurrentShopId(null);
      }
      if (viewName === View.CHAT && id) setChatTarget(id);
      
      if (viewName === View.BUYER_DASHBOARD && id) {
        setDashboardTab(id);
      } else if (viewName !== View.BUYER_DASHBOARD) {
        setDashboardTab(null);
      }
      
      if (viewName === View.ADMIN_HOME && id) {
        setAdminTab(id);
      } else if (viewName !== View.ADMIN_HOME) {
        setAdminTab(null);
      }
    }
  };

  useEffect(() => {
      if(products.length > 0) {
        handleHashRouting(products);
      }
      const onHashChange = () => handleHashRouting(products);
      window.addEventListener('hashchange', onHashChange);
      return () => window.removeEventListener('hashchange', onHashChange);
  }, [products]);

  const navigateTo = (newView: View, product?: Product, targetId?: string) => {
    let hash = `#/${newView}`;
    
    if (product) {
      setSelectedProduct(product);
      if (newView === View.PRODUCT) hash += `/${product.id}`;
    }

    if (targetId) {
      if (newView === View.SHOP) setCurrentShopId(targetId);
      else if (newView === View.CHAT) setChatTarget(targetId);
      else if (newView === View.BUYER_DASHBOARD) setDashboardTab(targetId);
      else if (newView === View.ADMIN_HOME) setAdminTab(targetId);

      if (newView !== View.PRODUCT) hash += `/${targetId}`;
    } else if (newView === View.SHOP) {
      setCurrentShopId(null);
      if (!targetId) {
        setSearchQuery('');
        setAppliedSearch(''); 
      }
    }
    
    window.location.hash = hash;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = async (query: string) => {
    try {
      setAppliedSearch(query); 
      setSearchQuery(query); 
      setCurrentShopId(null);
      setView(View.SHOP);
      const searchResults = await API.getProducts(undefined, query);
      setProducts(searchResults); 
      showToast(query ? `搜尋完成：${query}` : '已顯示所有商品');
    } catch (e) {
      showToast('搜尋發生錯誤', 'error');
    }
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('insbuy_user');
    navigateTo(View.SHOP);
    setCart([]);
    showToast('已安全登出');
  };

  const QC_login = async (u: any) => {
    // 觸發驗證碼 Modal，將使用者資料暫存
    setPendingLoginUser(u);
  };

  const finalizeLogin = async () => {
    const u = pendingLoginUser;
    setPendingLoginUser(null); // 清除暫存
    if (!u) return;

    try {
      const loggedInUser = await API.login({
        phoneOrEmail: u.phone || u.email,
        password: u.password,
        role: u.role
      });
      setUser(loggedInUser);
      localStorage.setItem('insbuy_user', JSON.stringify(loggedInUser));
      showToast(`歡迎回來，${loggedInUser.name}！`);
      const freshOrders = await API.getOrders();
      setOrders(freshOrders);
      navigateTo((loggedInUser.role === 'SELLER' || loggedInUser.role === 'ADMIN') ? View.ADMIN_HOME : View.SHOP);
    } catch (e: any) {
      showToast(e.response?.data?.message || '帳號或密碼錯誤', 'error');
    }
  }

  const handleRegisterUser = async (newUser: User) => {
    try {
      const createdUser = await API.register(newUser);
      const updatedUsers = await API.getUsers();
      setAllUsers([...updatedUsers, SYSTEM_ADMIN_USER]);
      showToast(`註冊成功！您的 ID 為 ${createdUser.id}`);
      navigateTo(View.AUTH);
    } catch (e) {
      showToast('註冊失敗，請稍後再試', 'error');
    }
  };

  const calculateJoinTime = (createdAt: string) => {
    const start = new Date(createdAt);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days < 30) return `${days}天 前`;
    const months = Math.floor(days / 30);
    if (months < 12) return `${months}個月 前`;
    const years = Math.floor(months / 12);
    return `${years}年 前`;
  };

  const calculateShopStats = (shopId: string) => {
    const shopProducts = products.filter(p => p.shop_id === shopId);
    const productCount = shopProducts.length;
    let totalRatings = 0;
    let sumRating = 0;
    shopProducts.forEach(p => {
      if (p.reviews) {
        p.reviews.forEach(r => { totalRatings++; sumRating += r.rating; });
      }
    });
    const averageRating = totalRatings > 0 ? (sumRating / totalRatings).toFixed(1) : "0.0";
    const followerCount = allUsers.filter(u => u.following?.includes(shopId)).length;
    const shopUser = allUsers.find(u => u.shop_id === shopId || u.id === shopId);
    const joinTime = shopUser?.created_at ? calculateJoinTime(shopUser.created_at) : '近期';
    return { productCount, ratingCount: totalRatings, averageRating: parseFloat(averageRating), followerCount, responseRate: 95, responseTime: '幾小時內', joinTime };
  };

  const handleFollowShop = async (shopId: string) => {
    if (!user) return showToast('請先登入會員', 'error');
    let updatedFollowing = [...(user.following || [])];
    if (updatedFollowing.includes(shopId)) {
      updatedFollowing = updatedFollowing.filter(id => id !== shopId);
      showToast('已取消關注');
    } else {
      updatedFollowing.push(shopId);
      showToast('已關注賣場！');
    }
    const updatedUser = { ...user, following: updatedFollowing };
    setUser(updatedUser);
    localStorage.setItem('insbuy_user', JSON.stringify(updatedUser));
    await API.updateUser(updatedUser);
    setAllUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
  };

  const handleSubmitReview = async (orderId: string, itemIndex: number, rating: number, comment: string) => {
    if (!user) return;
    const targetOrderIndex = orders.findIndex(o => o.id === orderId);
    if (targetOrderIndex === -1) return;
    const targetOrder = orders[targetOrderIndex];
    const targetItem = targetOrder.items[itemIndex];
    const updatedOrderItems = [...targetOrder.items];
    updatedOrderItems[itemIndex] = { ...targetItem, isReviewed: true };
    const updatedOrders = [...orders];
    updatedOrders[targetOrderIndex] = { ...targetOrder, items: updatedOrderItems };
    setOrders(updatedOrders);

    const newReview: Review = { id: `rev-${Date.now()}`, userId: user.id, userName: user.name, rating, comment, createdAt: new Date().toISOString() };
    const productToUpdate = products.find(p => p.id === targetItem.id);
    if (productToUpdate) {
      const updatedProduct = { ...productToUpdate, reviews: [newReview, ...(productToUpdate.reviews || [])] };
      try {
        await API.updateProduct(updatedProduct);
        setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
        showToast('評價提交成功！');
      } catch (e) { showToast('評價提交失敗', 'error'); }
    }
  };

  const filteredProducts = useMemo(() => {
    // ★ 徹底排除已隱藏的商品，不論在首頁還是搜尋都不會出現
    let list = products.filter(p => p.status === 'OPEN' && p.total_stock > 0 && !(p as any).is_hidden);
    
    // ★ 新增：過濾黑名單商品 (買家被賣家黑名單後，買家將看不到該賣家的商品)
    if (user && user.blacklisted_by && user.blacklisted_by.length > 0) {
        list = list.filter(p => !user.blacklisted_by!.includes(p.shop_id));
    }

    if (currentShopId) list = list.filter(p => p.shop_id === currentShopId);
    return list;
  }, [products, currentShopId, user]);

  const currentShop = useMemo(() => {
    if (!currentShopId) return null;
    const shopUser = allUsers.find(u => (u.shop_id === currentShopId || u.id === currentShopId));
    if (!shopUser) return null;
    const dynamicStats = calculateShopStats(shopUser.shop_id || shopUser.id);
    return { ...shopUser, stats: { ...shopUser.stats, ...dynamicStats } };
  }, [currentShopId, allUsers, products]);

  const handleUpdateOrderStatus = async (id: string, status: Order['status'], cancellationReason?: string, sellerNote?: string) => {
    await API.updateOrder(id, status, cancellationReason, sellerNote);
    setOrders(prev => prev.map(o => {
      if (o.id === id) {
         return {
            ...o,
            ...(status !== undefined && { status }),
            ...(cancellationReason !== undefined && { cancellation_reason: cancellationReason }),
            ...(sellerNote !== undefined && { seller_note: sellerNote })
         };
      }
      return o;
    }));
  };

  // 如果後端完全沒回應 (例如沒開)，才顯示錯誤
  if (fetchError) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F5F5F5] items-center justify-center p-8 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">無法連接到伺服器</h2>
        <p className="text-slate-500 mb-4">請確認後端程式 (node server.js) 是否正在執行。</p>
        <button onClick={() => window.location.reload()} className="px-8 py-3 bg-[#EE4D2D] text-white rounded-xl font-bold mt-4">重新連線</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F5] overflow-x-hidden w-full relative">
      {toast && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-fade-in-up border bg-white ${toast.type === 'success' ? 'text-green-600 border-green-100' : 'text-red-600 border-red-100'}`}>
          <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
          <span className="font-bold text-sm">{toast.message}</span>
        </div>
      )}

      {/* ★ 新增：登入驗證碼 Modal */}
      {pendingLoginUser && (
        <CaptchaModal onVerify={finalizeLogin} onCancel={() => setPendingLoginUser(null)} />
      )}

      {/* ★ 新增：購物車「遺忘提醒」微互動 */}
      {showCartReminder && cart.length > 0 && view !== View.CART && view !== View.CHECKOUT && (
         <div className="fixed top-24 right-4 md:right-8 z-[1001] animate-bounce">
            <div className="bg-[#EE4D2D] text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] relative border-2 border-white flex items-center gap-3">
               <div className="absolute -top-1.5 right-6 w-3 h-3 bg-[#EE4D2D] border-t-2 border-l-2 border-white transform rotate-45"></div>
               <span className="relative z-10 flex items-center gap-2">
                  <i className="fa-solid fa-cart-shopping text-base"></i>
                  您的購物車裡還有商品等著結帳喔！
               </span>
               <button onClick={() => setShowCartReminder(false)} className="ml-1 text-white/70 hover:text-white transition bg-white/20 w-5 h-5 rounded-full flex items-center justify-center">
                  <i className="fa-solid fa-xmark"></i>
               </button>
            </div>
         </div>
      )}
      
      {showAnnouncement && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl p-8">
            <h3 className="text-2xl font-black mb-4">平台公告</h3>
            {announcementImage && (
               <div className="mb-4 rounded-xl overflow-hidden shadow-sm">
                  <img src={announcementImage} alt="Announcement" className="w-full h-auto object-cover" />
               </div>
            )}
            <div className="text-slate-600 mb-6 whitespace-pre-wrap">{announcementText}</div>
            <button onClick={handleCloseAnnouncement} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold">我知道了</button>
          </div>
        </div>
      )}
      {modalContent && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[85vh]">
            <div className="bg-[#EE4D2D] p-5 flex justify-between items-center text-white shrink-0">
              <h3 className="font-black text-lg">{modalContent.title}</h3>
              <button onClick={() => setModalContent(null)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            
            <div id="modal-scroll-container" className="p-8 overflow-y-auto whitespace-pre-wrap font-sans text-slate-600 flex-1">
               {modalContent.content}
               
               {modalContent.title === '幫助中心' && (
                  <div className="mt-6 mb-2">
                      <button 
                         onClick={() => {
                            setModalContent(null);
                            navigateTo(View.CHAT, undefined, 'ADMIN');
                         }}
                         className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-700 transition shadow-md"
                      >
                         <i className="fa-regular fa-comments"></i> 聯繫平台管理員
                      </button>
                  </div>
               )}
               
               {modalContent.title === '幫助中心' && (
                  <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-3">
                     <h4 className="font-bold text-slate-700">其他條款與說明</h4>
                     <div className="flex gap-2 flex-wrap">
                        <button 
                           onClick={() => setModalContent({ title: '服務條款', content: siteSettings.termsOfService || '暫無內容' })}
                           className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 transition"
                        >
                           服務條款
                        </button>
                        <button 
                           onClick={() => setModalContent({ title: '隱私權條款', content: siteSettings.privacyPolicy || '暫無內容' })}
                           className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 transition"
                        >
                           隱私權條款
                        </button>
                        <button 
                           onClick={() => setModalContent({ title: '平台免責聲明', content: siteSettings.disclaimer || '暫無內容' })}
                           className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 transition"
                        >
                           平台免責聲明
                        </button>
                     </div>
                  </div>
               )}

               {['服務條款', '隱私權條款', '平台免責聲明'].includes(modalContent.title) && (
                  <div className="mt-12 pt-6 border-t border-slate-100">
                     <button 
                        onClick={() => setModalContent(null)}
                        className="w-full py-3 bg-[#EE4D2D] text-white rounded-xl font-bold hover:bg-red-600 transition shadow-lg"
                     >
                        我已全部了解，回上一頁
                     </button>
                  </div>
               )}
            </div>
          </div>
        </div>
      )}

      <Header 
         user={user} 
         cartCount={cart.length} 
         onNavigate={navigateTo} 
         onLogout={logout} 
         searchQuery={searchQuery} 
         setSearchQuery={setSearchQuery} 
         onShowHelp={() => setModalContent({ title: '幫助中心', content: siteSettings.helpCenter || '暫無內容' })} 
         onSearch={handleSearch}
         onReset={() => setShopRefreshKey(prev => prev + 1)} 
      />

      <main className="container mx-auto px-4 pt-2 pb-8 md:py-8 flex-1 max-w-7xl w-full overflow-hidden">
        {/* 取消了 isDataLoaded 的等待畫面，直接渲染內容 */}
        <>{view === 'PRIVACY' as any && <PrivacyPolicy siteSettings={siteSettings} />}
            {view === 'TERMS' as any && <TermsOfService siteSettings={siteSettings} />}
            {view === View.SHOP && <Shop key={currentShopId || `home-${shopRefreshKey}`} products={filteredProducts} categories={categories.filter(c => currentShopId ? c.shop_id === currentShopId : true)} systemCategories={systemCategories} currentShop={currentShop || undefined} currentUser={user} orders={orders} allSellers={allUsers.filter(u => u.role === 'SELLER')} searchQuery={appliedSearch} onOpenProduct={(p) => navigateTo(View.PRODUCT, p)} onFollowShop={handleFollowShop} onNavigate={navigateTo} />}
            
            {view === View.PRODUCT && selectedProduct && (
                <ProductDetail 
                    product={selectedProduct} 
                    allSellers={allUsers} 
                    currentUser={user} 
                    orders={orders}
                    onAddToCart={(item) => { 
                        if(!user) {
                           alert('請先登入或註冊會員！');
                           navigateTo(View.REGISTER_BUYER);
                           return;
                        }
                        
                        // 檢查購物車內是否已有相同商品與規格
                        const existingIndex = cart.findIndex(c => c.id === item.id && c.selectedVariant === item.selectedVariant);
                        const maxStock = item.variants?.find(v => v.name === item.selectedVariant)?.stock || item.total_stock;

                        if (existingIndex > -1) {
                            const currentQty = cart[existingIndex].qty;
                            if (currentQty + item.qty > maxStock) {
                                alert(`庫存不足！該規格目前僅剩 ${maxStock} 件，您購物車中已有 ${currentQty} 件。`);
                                return;
                            }
                            const newCart = [...cart];
                            newCart[existingIndex].qty += item.qty;
                            setCart(newCart);
                        } else {
                            if (item.qty > maxStock) {
                                alert(`庫存不足！該規格目前僅剩 ${maxStock} 件`);
                                return;
                            }
                            setCart([...cart, item]); 
                        }
                        showToast('已加入購物車！'); 
                    }} 
                    onNavigate={navigateTo} 
                    onFollowShop={handleFollowShop} 
                    calculateShopStats={calculateShopStats} 
                />
            )}

            {view === View.CART && (
              <Cart 
                items={cart} 
                allUsers={allUsers} 
                onUpdateQty={(idx, newQty) => { 
                   if (newQty < 1) { 
                      setCart(cart.filter((_, i) => i !== idx)); 
                      showToast('商品已移除'); 
                   } else { 
                      const item = cart[idx];
                      const productInfo = products.find(p => p.id === item.id);
                      const maxStock = productInfo?.variants?.find(v => v.name === item.selectedVariant)?.stock ?? productInfo?.total_stock ?? item.total_stock;
                      
                      if (newQty > maxStock) {
                          alert(`庫存不足！該規格目前僅剩 ${maxStock} 件`);
                          return;
                      }
                      
                      const n = [...cart]; 
                      n[idx].qty = newQty; 
                      setCart(n); 
                   } 
                }} 
                onRemove={(idx) => { setCart(cart.filter((_, i) => i !== idx)); showToast('商品已移除'); }} 
                onCheckout={(selectedItems) => { 
                   // ★ 新增：結帳前加總相同商品規格的數量，進行終極庫存防呆
                   const sumMap: Record<string, {qty: number, maxStock: number, name: string, variant: string}> = {};
                   for (const item of selectedItems) {
                       const key = `${item.id}-${item.selectedVariant || ''}`;
                       const productInfo = products.find(p => p.id === item.id);
                       if (!productInfo) {
                           alert(`商品 [${item.name}] 已失效或下架`);
                           return;
                       }
                       const maxStock = productInfo.variants?.find(v => v.name === item.selectedVariant)?.stock ?? productInfo.total_stock;
                       
                       if (!sumMap[key]) {
                           sumMap[key] = { qty: 0, maxStock, name: item.name, variant: item.selectedVariant || '單一規格' };
                       }
                       sumMap[key].qty += item.qty;
                   }
                   
                   // ★ 檢查總數量是否大於庫存
                   for (const key in sumMap) {
                       if (sumMap[key].qty > sumMap[key].maxStock) {
                           alert(`庫存不足！\n商品 [${sumMap[key].name}] - [${sumMap[key].variant}]\n您總共勾選了 ${sumMap[key].qty} 件，但目前庫存僅剩 ${sumMap[key].maxStock} 件。\n請在購物車內調整數量或刪除重複項目後再結帳。`);
                           return; // 阻擋進入結帳頁面
                       }
                   }

                   setCheckoutItems(selectedItems);
                   navigateTo(View.CHECKOUT); 
                }} 
                onClear={() => { setCart([]); showToast('購物車已清空'); }} 
                // ★ 修正 1：讓購物車返回上一頁 (利用瀏覽器歷史紀錄，完美記住是從商品還是首頁來的)
                onCancel={() => window.history.back()} 
              />
            )}
            
            {view === View.CHECKOUT && (
              <Checkout 
                cart={checkoutItems.length > 0 ? checkoutItems : cart} 
                user={user} 
                products={products} 
                // ★ 修正 2：傳入 onCancel 給 Checkout，讓它退回購物車
                onCancel={() => navigateTo(View.CART)} 
                onSubmit={async (order) => { 
                  try { 
                    await API.createOrder(order); 
                    
                    const updatedProducts = [...products];
                    for (const item of order.items) {
                        const pIndex = updatedProducts.findIndex(p => p.id === item.id);
                        if (pIndex > -1) {
                            const p = updatedProducts[pIndex];
                            let newVariants = [...(p.variants || [])];
                            if (item.selectedVariant) {
                                const vIndex = newVariants.findIndex(v => v.name === item.selectedVariant);
                                if (vIndex > -1) {
                                    newVariants[vIndex] = { ...newVariants[vIndex], stock: Math.max(0, newVariants[vIndex].stock - item.qty) };
                                }
                            }
                            let newTotalStock = p.total_stock;
                            if (newVariants.length > 0) {
                                newTotalStock = newVariants.reduce((sum, v) => sum + v.stock, 0);
                            } else {
                                newTotalStock = Math.max(0, p.total_stock - item.qty);
                            }
                            const updatedProduct = { ...p, total_stock: newTotalStock, variants: newVariants };
                            updatedProducts[pIndex] = updatedProduct;
                            await API.updateProduct(updatedProduct);
                        }
                    }
                    setProducts(updatedProducts);

                    setOrders([order, ...orders]); 
                    const boughtIds = checkoutItems.map(ci => ci.id + (ci.selectedVariant || ''));
                    const remainingCart = cart.filter(c => !boughtIds.includes(c.id + (c.selectedVariant || '')));
                    setCart(remainingCart);
                    setCheckoutItems([]);

                    showToast('訂單已提交！'); 
                    
                    if (user && (user.role === 'SELLER' || user.role === 'ADMIN')) {
                       navigateTo(View.ADMIN_HOME, undefined, 'buying_orders');
                    } else {
                       navigateTo(View.BUYER_DASHBOARD, undefined, 'ORDERS'); 
                    }

                  } catch(e) { 
                    showToast('訂單提交失敗', 'error'); 
                  } 
                }} 
              />
            )}
            
            {view === View.AUTH && <AuthHub onLogin={QC_login} onNavigate={navigateTo} />}
            
            {view === View.REGISTER_BUYER && <RegisterBuyer siteSettings={siteSettings} onComplete={handleRegisterUser} onShowTerms={() => setModalContent({ title: '服務條款', content: siteSettings.termsOfService || '暫無內容' })} onShowDisclaimer={() => setModalContent({ title: '免責聲明', content: siteSettings.disclaimer || '暫無內容' })} onShowPrivacy={() => setModalContent({ title: '隱私權條款', content: siteSettings.privacyPolicy || '暫無內容' })} />}
            
            {view === View.REGISTER_SELLER && <RegisterSeller siteSettings={siteSettings} onComplete={handleRegisterUser} onShowTerms={() => setModalContent({ title: '服務條款', content: siteSettings.termsOfService || '暫無內容' })} onShowDisclaimer={() => setModalContent({ title: '免責聲明', content: siteSettings.disclaimer || '暫無內容' })} onShowPrivacy={() => setModalContent({ title: '隱私權條款', content: siteSettings.privacyPolicy || '暫無內容' })} />}
            
            {view === View.ADMIN_HOME && user && (user.role === 'SELLER' || user.role === 'ADMIN') && (
              <AdminDashboard 
                user={user} 
                permissions={permissions}
                products={user.role === 'ADMIN' ? products : products.filter(p => p.shop_id === (user.shop_id || user.id))} 
                orders={orders.filter(o => o.shop_id === (user.shop_id || user.id))} 
                buyOrders={orders.filter(o => o.receiver_phone === user.phone)} 
                categories={categories.filter(c => c.shop_id === (user.shop_id || user.id))} 
                systemCategories={systemCategories} 
                allUsers={allUsers}
                onUpdateSystemCategories={async (newCats) => { 
                   setSystemCategories(newCats as Category[]);
                   try {
                       await fetch('http://127.0.0.1:3001/api/categories/bulk', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ categories: newCats, shopId: 'SYSTEM' })
                       });
                   } catch(e) {
                       console.error('Failed to save system categories', e);
                   }
                }} 
                onUpdateProducts={async () => { setProducts(await API.getProducts()); }} 
                onUpdateCategories={async (newCategories) => { 
                   try { 
                       const shopId = user.shop_id || user.id;
                       await API.updateCategories(newCategories, shopId); 
                       const freshCategories = await API.getCategories(); 
                       setCategories(freshCategories); 
                       showToast('分類同步成功'); 
                   } catch(e) { 
                       showToast('同步失敗','error'); 
                   } 
                }}
                onUpdateUser={async (updatedUser) => { await API.updateUser(updatedUser); const others = allUsers.filter(u => u.id !== updatedUser.id); setAllUsers([...others, updatedUser]); setUser(updatedUser); localStorage.setItem('insbuy_user', JSON.stringify(updatedUser)); }} 
                onUpdateOrderStatus={handleUpdateOrderStatus} 
                onNavigate={navigateTo} 
                initialTab={adminTab}
                viewedOrderIds={viewedOrderIds}
                onMarkAsViewed={handleMarkAsViewed}
                onLogout={logout} 
              />
            )}
            
            {view === View.BUYER_DASHBOARD && user && (
                <BuyerDashboard 
                    user={user} 
                    orders={orders.filter(o => o.receiver_phone === user.phone)} 
                    allSellers={allUsers.filter(u => u.role === 'SELLER')} 
                    siteSettings={siteSettings}
                    onNavigate={navigateTo} 
                    onSubmitReview={handleSubmitReview} 
                    onUpdateOrderStatus={handleUpdateOrderStatus} 
                    onUpdateUser={async (updatedUser) => {
                       await API.updateUser(updatedUser);
                       const others = allUsers.filter(u => u.id !== updatedUser.id);
                       setAllUsers([...others, updatedUser]);
                       setUser(updatedUser);
                       localStorage.setItem('insbuy_user', JSON.stringify(updatedUser));
                    }}
                    initialTab={dashboardTab || 'ACCOUNT'} 
                />
            )}
            
            {view === View.CHAT && <ChatRoom currentUser={user?.role === 'ADMIN' ? SYSTEM_ADMIN_USER : user} targetId={chatTarget} allUsers={allUsers} currentProduct={selectedProduct} siteSettings={siteSettings} />}
            
            {view === View.USER_MANAGEMENT && <UserManagement currentUser={user} users={allUsers} orders={orders} permissions={permissions} siteSettings={siteSettings} onUpdateUsers={async (updatedUsers) => { setAllUsers([...updatedUsers, SYSTEM_ADMIN_USER]); }} onUpdatePermissions={async (updatedPermissions) => { await API.updatePermissions(updatedPermissions); setPermissions(updatedPermissions); }} onUpdateSiteSettings={async (updatedSettings) => { await API.updateSettings(updatedSettings); setSiteSettings(updatedSettings); }} onNavigate={navigateTo} onUpdateOrderStatus={handleUpdateOrderStatus} />}
            
            {/* ★ 網紅專屬後台渲染 */}
            {view === View.INFLUENCER_DASHBOARD && (
               <InfluencerDashboard currentUser={user} onNavigate={navigateTo} />
            )}
          </>
      </main>
      <footer className="w-full text-center pb-28 pt-4 text-slate-400 text-xs relative z-10"> {/* 加上 relative z-10 確保不被其他元素遮擋，並增加一點底部空間 pb-28 */}
         <a href="#/privacy" className="hover:text-slate-600 mx-2 transition-colors p-2 inline-block">隱私權政策</a>
         <span>|</span>
         <a href="#/terms" className="hover:text-slate-600 mx-2 transition-colors p-2 inline-block">服務條款</a>
      </footer>
      <div className="fixed bottom-8 right-8 z-[999] flex flex-col gap-4 items-end">
        {user && user.role === 'ADMIN' && <button onClick={() => navigateTo(View.USER_MANAGEMENT)} className="px-4 py-2 bg-slate-800 text-white rounded-full text-[10px] font-black shadow-xl hover:bg-slate-700 transition flex items-center gap-2 mb-2"><i className="fa-solid fa-users-gear"></i> 使用者管理 (ADMIN)</button>}
        
        <div className="relative flex flex-col items-end gap-3">
            {isFabOpen && (
               <>
                  {user && (user.role === 'SELLER' || user.role === 'ADMIN') && (
                    <button 
                        onClick={() => {
                            navigateTo(View.ADMIN_HOME, undefined, 'create');
                            setIsFabOpen(false);
                        }} 
                        className="w-12 h-12 bg-white text-slate-700 rounded-full shadow-lg border border-slate-200 flex flex-col items-center justify-center hover:scale-110 transition-all animate-fade-in-up"
                    >
                        <i className="fa-solid fa-plus text-lg text-[#EE4D2D]"></i>
                        <span className="text-[8px] font-bold">上架</span>
                    </button>
                  )}

                  {user && (user.role === 'SELLER' || user.role === 'ADMIN') && (
                    <button 
                        onClick={() => {
                            navigateTo(View.ADMIN_HOME, undefined, 'orders');
                            setIsFabOpen(false);
                        }} 
                        className="w-12 h-12 bg-white text-slate-700 rounded-full shadow-lg border border-slate-200 flex flex-col items-center justify-center hover:scale-110 transition-all relative animate-fade-in-up"
                    >
                        {pendingOrderCount > 0 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border border-white flex items-center justify-center animate-bounce z-10 shadow-sm"><span className="text-[8px] text-white font-black">{pendingOrderCount > 99 ? '99+' : pendingOrderCount}</span></div>}
                        <i className="fa-solid fa-clipboard-list text-lg text-[#EE4D2D]"></i>
                        <span className="text-[8px] font-bold">訂單</span>
                    </button>
                  )}

                  <button 
                      onClick={() => {
                          navigateTo(View.CHAT);
                          setIsFabOpen(false);
                      }} 
                      className="w-12 h-12 bg-white text-slate-700 rounded-full shadow-lg border border-slate-200 flex flex-col items-center justify-center hover:scale-110 transition-all relative animate-fade-in-up"
                  >
                    {unreadCount > 0 && <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border border-white flex items-center justify-center animate-bounce z-10 shadow-sm"><span className="text-[8px] text-white font-black">{unreadCount > 99 ? '99+' : unreadCount}</span></div>}
                    <i className="fa-regular fa-comments text-lg text-[#EE4D2D]"></i><span className="text-[8px] font-bold">愛聊</span>
                  </button>
               </>
            )}

            <button 
                onClick={() => setIsFabOpen(!isFabOpen)} 
                className={`w-16 h-16 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.3)] border-4 border-white flex flex-col items-center justify-center text-white hover:scale-110 transition-all z-20 ${isFabOpen ? 'bg-slate-800' : 'primary-gradient'}`}
            >
              {!isFabOpen && (pendingOrderCount > 0 || unreadCount > 0) && (
                  <div className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full border border-white animate-pulse"></div>
              )}
              <i className={`fa-solid ${isFabOpen ? 'fa-xmark' : 'fa-bars'} text-2xl`}></i>
              <span className="text-[10px] font-black mt-0.5">{isFabOpen ? '關閉' : '功能'}</span>
            </button>
        </div>
      </div>
    </div>
  );
};

export default App;