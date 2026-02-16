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
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // 功能按鈕展開狀態
  const [isFabOpen, setIsFabOpen] = useState(false);
  
  // ★ 新增：商店重置 Key，用於強制刷新 Shop 元件回到預設狀態
  const [shopRefreshKey, setShopRefreshKey] = useState(0);

  const [viewedOrderIds, setViewedOrderIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('insbuy_viewed_orders');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetchError(false);
        const savedUser = localStorage.getItem('insbuy_user');
        if (savedUser) setUser(JSON.parse(savedUser));
        
        const savedCart = localStorage.getItem('insbuy_cart');
        if (savedCart) setCart(JSON.parse(savedCart));
        
        try {
           const sysCatRes = await fetch('http://localhost:3001/api/categories?shop_id=SYSTEM');
           const sysCats = await sysCatRes.json();
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
        } catch (e) {
           console.warn('Failed to fetch system categories', e);
        }

        const data = await API.getInitialData();
        setProducts(data.products);
        setCategories(data.categories);
        
        setAllUsers([...data.users, SYSTEM_ADMIN_USER]);
        
        setSiteSettings(data.settings);
        setPermissions(data.permissions);
        
        const orderData = await API.getOrders();
        setOrders(orderData);

        setIsDataLoaded(true);
      } catch (error) {
        console.error("Failed to connect to backend:", error);
        showToast('無法連接伺服器，請確保後端已啟動', 'error');
        setFetchError(true);
        setIsDataLoaded(true);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!user) return; 

    const syncOrders = async () => {
      try {
        const latestOrders = await API.getOrders();
        setOrders(latestOrders);
      } catch (e) {
        // 靜默失敗
      }
    };

    const intervalId = setInterval(syncOrders, 3000);
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
    if (isDataLoaded && !fetchError && siteSettings.announcementActive) {
      const today = new Date().toISOString().split('T')[0];
      const lastViewedDate = localStorage.getItem('insbuy_last_announcement_date');
      if (lastViewedDate !== today && (siteSettings.announcement || siteSettings.announcementImage)) {
        setAnnouncementText(siteSettings.announcement);
        setAnnouncementImage(siteSettings.announcementImage || null);
        setShowAnnouncement(true);
      }
    }
  }, [siteSettings, isDataLoaded, fetchError]);

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
      console.error('LocalStorage Quota Exceeded:', error);
      if (cart.length > 0) {
        showToast('警告：瀏覽器儲存空間已滿，購物車可能無法保存', 'error');
      }
    }
  }, [cart]);

  useEffect(() => {
    if (chatTarget && user) {
      const myId = user.shop_id || user.id;
      API.markMessagesRead(chatTarget, myId).then(() => {
         const event = new Event('insbuy_message_read');
         window.dispatchEvent(event);
      }).catch(() => {});
    }
  }, [chatTarget, user]);

  useEffect(() => {
    const checkUnread = async () => {
      if (!user) {
        setUnreadCount(0);
        return;
      }
      try {
        const myId = user.role === 'ADMIN' ? SYSTEM_ADMIN_USER.id : (user.shop_id || user.id);
        const allMsgs = await API.getAllUserMessages(myId);
        
        const count = allMsgs.filter((m: any) => {
           if (m.receiverId !== myId) return false;
           // 正在聊天的對象不計入未讀
           if (chatTarget && m.senderId === chatTarget) return false;
           
           if (m.isRead) return false;

           // ★ 嚴格檢查本地最後讀取時間
           const lastRead = localStorage.getItem(`insbuy_last_read_${myId}_${m.senderId}`);
           if (lastRead && new Date(m.timestamp) <= new Date(lastRead)) {
               return false; 
           }
           return true; 
        }).length;

        setUnreadCount(count);
      } catch (e) {
        // ignore
      }
    };

    checkUnread();
    const interval = setInterval(checkUnread, 3000); 
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
    const parts = hash.split('/');
    const viewName = parts[0] as View;
    const id = parts[1];

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
    if(isDataLoaded) {
      handleHashRouting(products);
      const onHashChange = () => handleHashRouting();
      window.addEventListener('hashchange', onHashChange);
      return () => window.removeEventListener('hashchange', onHashChange);
    }
  }, [isDataLoaded, products]);

  const navigateTo = (newView: View, product?: Product, targetId?: string) => {
    let hash = `#/${newView}`;
    
    if (product) {
      setSelectedProduct(product);
      if (newView === View.PRODUCT) {
         hash += `/${product.id}`;
      }
    }

    if (targetId) {
      if (newView === View.SHOP) setCurrentShopId(targetId);
      else if (newView === View.CHAT) setChatTarget(targetId);
      else if (newView === View.BUYER_DASHBOARD) setDashboardTab(targetId);
      else if (newView === View.ADMIN_HOME) setAdminTab(targetId);

      if (newView !== View.PRODUCT) {
           hash += `/${targetId}`;
      }
    } else if (newView === View.SHOP) {
      setCurrentShopId(null);
      // 如果回到首頁且沒有指定 ID，清空搜尋
      if (!targetId) {
        setSearchQuery('');
        setAppliedSearch(''); // 重置搜尋
      }
    }
    
    window.location.hash = hash;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearch = async (query: string) => {
    try {
      setIsDataLoaded(false); 
      
      setAppliedSearch(query); 
      setSearchQuery(query); 
      
      setCurrentShopId(null);
      setView(View.SHOP);

      const searchResults = await API.getProducts(undefined, query);
      
      setProducts(searchResults); 
      showToast(query ? `搜尋完成：${query}` : '已顯示所有商品');
    } catch (e) {
      showToast('搜尋發生錯誤', 'error');
    } finally {
      setIsDataLoaded(true);
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
    try {
      if ((u.phone === '1' || u.email === '1') && u.password === '1') {
         setUser(SYSTEM_ADMIN_USER);
         localStorage.setItem('insbuy_user', JSON.stringify(SYSTEM_ADMIN_USER));
         showToast(`歡迎回來，${SYSTEM_ADMIN_USER.name}！(超級管理員模式)`);
         navigateTo(View.ADMIN_HOME);
         return;
      }

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
    let list = products.filter(p => p.status === 'OPEN' && p.total_stock > 0);
    if (currentShopId) list = list.filter(p => p.shop_id === currentShopId);
    return list;
  }, [products, currentShopId]);

  const currentShop = useMemo(() => {
    if (!currentShopId) return null;
    const shopUser = allUsers.find(u => (u.shop_id === currentShopId || u.id === currentShopId));
    if (!shopUser) return null;
    const dynamicStats = calculateShopStats(shopUser.shop_id || shopUser.id);
    return { ...shopUser, stats: { ...shopUser.stats, ...dynamicStats } };
  }, [currentShopId, allUsers, products]);

  const handleUpdateOrderStatus = async (id: string, status: Order['status'], cancellationReason?: string) => {
    await API.updateOrder(id, status, cancellationReason);
    setOrders(prev => prev.map(o => o.id === id ? {...o, status, cancellation_reason: cancellationReason} : o));
  };

  if (fetchError) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F5F5F5] items-center justify-center p-8 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">無法連接到伺服器</h2>
        <button onClick={() => window.location.reload()} className="px-8 py-3 bg-[#EE4D2D] text-white rounded-xl font-bold mt-4">重新連線</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F5]">
      {toast && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-fade-in-up border bg-white ${toast.type === 'success' ? 'text-green-600 border-green-100' : 'text-red-600 border-red-100'}`}>
          <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
          <span className="font-bold text-sm">{toast.message}</span>
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
            <div className="bg-[#EE4D2D] p-5 flex justify-between items-center text-white">
              <h3 className="font-black text-lg">{modalContent.title}</h3>
              <button onClick={() => setModalContent(null)}><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="p-8 overflow-y-auto whitespace-pre-wrap font-sans text-slate-600">
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
            </div>
          </div>
        </div>
      )}

      {/* Header 接收 searchQuery (輸入框顯示) 與 handleSearch (按下搜尋) */}
      <Header 
         user={user} 
         cartCount={cart.length} 
         onNavigate={navigateTo} 
         onLogout={logout} 
         searchQuery={searchQuery} 
         setSearchQuery={setSearchQuery} 
         onShowHelp={() => setModalContent({ title: '幫助中心', content: siteSettings.helpCenter || '暫無內容' })} 
         onSearch={handleSearch}
         onReset={() => setShopRefreshKey(prev => prev + 1)} // ★ 點擊 Logo 時更新 Key
      />

      <main className="container mx-auto px-4 py-8 flex-1 max-w-7xl pb-32">
        {!isDataLoaded ? (
          <div className="flex justify-center items-center h-64 text-slate-400 font-bold animate-pulse">正在載入資料...</div>
        ) : (
          <>
            {/* ★ 關鍵：使用 key 強制重置 Shop 元件狀態 */}
            {view === View.SHOP && <Shop key={currentShopId || `home-${shopRefreshKey}`} products={filteredProducts} categories={categories.filter(c => currentShopId ? c.shop_id === currentShopId : true)} systemCategories={systemCategories} currentShop={currentShop || undefined} currentUser={user} orders={orders} searchQuery={appliedSearch} onOpenProduct={(p) => navigateTo(View.PRODUCT, p)} onFollowShop={handleFollowShop} onNavigate={navigateTo} />}
            
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
                        setCart([...cart, item]); 
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
                onUpdateQty={(idx, newQty) => { if (newQty < 1) { setCart(cart.filter((_, i) => i !== idx)); showToast('商品已移除'); } else { const n = [...cart]; n[idx].qty = newQty; setCart(n); } }} 
                onRemove={(idx) => { setCart(cart.filter((_, i) => i !== idx)); showToast('商品已移除'); }} 
                onCheckout={(selectedItems) => { 
                   setCheckoutItems(selectedItems);
                   navigateTo(View.CHECKOUT); 
                }} 
                onClear={() => { setCart([]); showToast('購物車已清空'); }} 
              />
            )}
            
            {view === View.CHECKOUT && (
              <Checkout 
                cart={checkoutItems.length > 0 ? checkoutItems : cart} 
                user={user} 
                products={products} 
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
                products={user.role === 'ADMIN' ? products : products.filter(p => p.shop_id === (user.shop_id || user.id))} 
                orders={orders.filter(o => o.shop_id === (user.shop_id || user.id))} 
                buyOrders={orders.filter(o => o.receiver_phone === user.phone)} 
                categories={categories.filter(c => c.shop_id === (user.shop_id || user.id))} 
                systemCategories={systemCategories} 
                allUsers={allUsers}
                onUpdateSystemCategories={async (newCats) => { 
                   setSystemCategories(newCats as Category[]);
                   try {
                       await fetch('http://localhost:3001/api/categories/bulk', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ categories: newCats, shopId: 'SYSTEM' })
                       });
                   } catch(e) {
                       console.error('Failed to save system categories', e);
                   }
                }} 
                onUpdateProducts={async () => { setProducts(await API.getProducts()); }} 
                onUpdateCategories={async (newCategories) => { try { const freshData = await API.getInitialData(); setCategories(freshData.categories); showToast('分類同步成功'); } catch(e) { showToast('同步失敗','error'); } }} 
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
          </>
        )}
      </main>
      
      <div className="fixed bottom-8 right-8 z-[999] flex flex-col gap-4 items-end">
        {/* 管理員按鈕 (維持獨立) */}
        {user && user.role === 'ADMIN' && <button onClick={() => navigateTo(View.USER_MANAGEMENT)} className="px-4 py-2 bg-slate-800 text-white rounded-full text-[10px] font-black shadow-xl hover:bg-slate-700 transition flex items-center gap-2 mb-2"><i className="fa-solid fa-users-gear"></i> 使用者管理 (ADMIN)</button>}
        
        {/* 整合功能選單 */}
        <div className="relative flex flex-col items-end gap-3">
            
            {/* 展開的子按鈕 */}
            {isFabOpen && (
               <>
                  {/* 上架按鈕 */}
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

                  {/* 訂單通知按鈕 */}
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

                  {/* 愛聊按鈕 */}
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

            {/* 主功能開關按鈕 */}
            <button 
                onClick={() => setIsFabOpen(!isFabOpen)} 
                className={`w-16 h-16 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.3)] border-4 border-white flex flex-col items-center justify-center text-white hover:scale-110 transition-all z-20 ${isFabOpen ? 'bg-slate-800' : 'primary-gradient'}`}
            >
              {/* 如果收合時有通知，在主按鈕顯示紅點 */}
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