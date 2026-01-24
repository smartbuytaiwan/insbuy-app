
import React, { useState, useEffect, useMemo } from 'react';
import { View, Product, User, CartItem, Order, LevelConfig, SiteSettings, Category, Review } from './types';
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

const App: React.FC = () => {
  const [view, setView] = useState<View>(View.SHOP);
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]); 
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatTarget, setChatTarget] = useState<string | null>(null);
  const [currentShopId, setCurrentShopId] = useState<string | null>(null); 
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  
  // 公告彈窗狀態
  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');

  const [modalContent, setModalContent] = useState<{title: string, content: string} | null>(null);

  const [permissions, setPermissions] = useState<LevelConfig[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    termsOfService: '', disclaimer: '', helpCenter: '', announcement: '', announcementActive: false
  });

  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // 初始化：從後端 API 獲取所有資料
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 先嘗試從 localStorage 恢復登入狀態 (JWT Token 架構下會存 Token，這裡暫存 User 物件)
        const savedUser = localStorage.getItem('insbuy_user');
        if (savedUser) setUser(JSON.parse(savedUser));
        
        // 恢復購物車
        const savedCart = localStorage.getItem('insbuy_cart');
        if (savedCart) setCart(JSON.parse(savedCart));

        const data = await API.getInitialData();
        setProducts(data.products);
        setCategories(data.categories);
        setAllUsers(data.users);
        setSiteSettings(data.settings);
        setPermissions(data.permissions);
        
        // 額外讀取訂單
        const orderData = await API.getOrders();
        setOrders(orderData);

        setIsDataLoaded(true);
      } catch (error) {
        console.error("Failed to connect to backend:", error);
        showToast('無法連接伺服器，請確保後端已啟動', 'error');
      }
    };
    fetchData();
  }, []);

  // 公告檢查 Effect (每日首次登入顯示)
  useEffect(() => {
    if (isDataLoaded && siteSettings.announcementActive && siteSettings.announcement) {
      const today = new Date().toISOString().split('T')[0]; // 取得 YYYY-MM-DD
      const lastViewedDate = localStorage.getItem('insbuy_last_announcement_date');

      if (lastViewedDate !== today) {
        setAnnouncementText(siteSettings.announcement);
        setShowAnnouncement(true);
      }
    }
  }, [siteSettings, isDataLoaded]);

  const handleCloseAnnouncement = () => {
    setShowAnnouncement(false);
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('insbuy_last_announcement_date', today);
  };

  // 僅保留購物車在 LocalStorage (這是純前端暫存，登出或換裝置會消失，未來可移至後端)
  useEffect(() => {
    localStorage.setItem('insbuy_cart', JSON.stringify(cart));
  }, [cart]);

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
        setCurrentShopId(id); // 設定當前瀏覽的賣場 ID
      } else if (viewName === View.SHOP && !id) {
        setCurrentShopId(null);
      }
      
      if (viewName === View.CHAT && id) setChatTarget(id);
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
      hash += `/${product.id}`;
    } else if (targetId) {
      if (newView === View.SHOP) {
        setCurrentShopId(targetId);
      } else if (newView === View.CHAT) {
        setChatTarget(targetId);
      }
      hash += `/${targetId}`;
    } else if (newView === View.SHOP) {
      setCurrentShopId(null);
    }
    window.location.hash = hash;
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      const loggedInUser = await API.login({
        phoneOrEmail: u.phone || u.email,
        password: u.password,
        role: u.role
      });
      setUser(loggedInUser);
      localStorage.setItem('insbuy_user', JSON.stringify(loggedInUser));
      showToast(`歡迎回來，${loggedInUser.name}！`);
      navigateTo((loggedInUser.role === 'SELLER' || loggedInUser.role === 'ADMIN') ? View.ADMIN_HOME : View.SHOP);
    } catch (e) {
      showToast('帳號或密碼錯誤', 'error');
    }
  }

  const handleRegisterUser = async (newUser: User) => {
    try {
      const createdUser = await API.register(newUser);
      // 重新獲取使用者列表 (Admin dashboard needs this)
      const updatedUsers = await API.getUsers();
      setAllUsers(updatedUsers);
      
      showToast(`註冊成功！您的 ID 為 ${createdUser.id}`);
      navigateTo(View.AUTH);
    } catch (e) {
      showToast('註冊失敗，請稍後再試', 'error');
    }
  };

  // Helper: 計算加入時間字串
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

  // 1. 動態計算賣家數據
  const calculateShopStats = (shopId: string) => {
    const shopProducts = products.filter(p => p.shop_id === shopId);
    const productCount = shopProducts.length;
    
    // 計算該賣場所有商品的總評價數與平均分
    let totalRatings = 0;
    let sumRating = 0;
    
    shopProducts.forEach(p => {
      if (p.reviews) {
        p.reviews.forEach(r => {
          totalRatings++;
          sumRating += r.rating;
        });
      }
    });

    const averageRating = totalRatings > 0 ? (sumRating / totalRatings).toFixed(1) : "5.0"; // 預設 5.0
    
    // 計算粉絲數 (遍歷所有使用者，看誰追蹤了此賣場)
    const followerCount = allUsers.filter(u => u.following?.includes(shopId)).length;

    // 取得賣家加入時間
    const shopUser = allUsers.find(u => u.shop_id === shopId);
    const joinTime = shopUser?.created_at ? calculateJoinTime(shopUser.created_at) : '近期';

    return {
      productCount,
      ratingCount: totalRatings, // 這裡借用 ratingCount 欄位存總評價數
      averageRating: parseFloat(averageRating),
      followerCount,
      responseRate: 95 + Math.floor(Math.random() * 5), // 模擬
      responseTime: '幾小時內',
      joinTime
    };
  };

  // 2. 追蹤/取消追蹤功能
  const handleFollowShop = async (shopId: string) => {
    if (!user) return showToast('請先登入會員', 'error');
    if (user.role !== 'BUYER') return showToast('僅買家可追蹤賣場', 'error');

    let updatedFollowing = [...(user.following || [])];
    const isFollowing = updatedFollowing.includes(shopId);

    if (isFollowing) {
      updatedFollowing = updatedFollowing.filter(id => id !== shopId);
      showToast('已取消關注');
    } else {
      updatedFollowing.push(shopId);
      showToast('已關注賣場！');
    }

    const updatedUser = { ...user, following: updatedFollowing };
    setUser(updatedUser);
    localStorage.setItem('insbuy_user', JSON.stringify(updatedUser));
    
    // Sync with backend
    await API.updateUser(updatedUser);
    
    // 同步更新 allUsers 以便其他組件能計算粉絲數
    setAllUsers(prev => prev.map(u => u.id === user.id ? updatedUser : u));
  };

  // 3. 提交評價功能
  const handleSubmitReview = async (orderId: string, itemIndex: number, rating: number, comment: string) => {
    if (!user) return;

    const targetOrderIndex = orders.findIndex(o => o.id === orderId);
    if (targetOrderIndex === -1) return;

    const targetOrder = orders[targetOrderIndex];
    const targetItem = targetOrder.items[itemIndex];

    // 更新訂單狀態 (標記該項目已評價) - 這部分理想上後端要有專門的 API，這裡先模擬更新整張訂單
    const updatedOrderItems = [...targetOrder.items];
    updatedOrderItems[itemIndex] = { ...targetItem, isReviewed: true };
    // 此處後端尚未實作更新訂單內容的 API，我們主要更新商品評價
    // 實務上這會透過 updateOrder API，這裡暫時略過訂單內部的狀態持久化，只更新前端顯示

    // 更新前端訂單顯示
    const updatedOrders = [...orders];
    updatedOrders[targetOrderIndex] = { ...targetOrder, items: updatedOrderItems };
    setOrders(updatedOrders);

    // 將評價寫入商品資料
    const newReview: Review = {
      id: `rev-${Date.now()}`,
      userId: user.id,
      userName: user.name,
      rating,
      comment,
      createdAt: new Date().toISOString()
    };

    const productToUpdate = products.find(p => p.id === targetItem.id);
    if (productToUpdate) {
      const updatedProduct = { 
        ...productToUpdate, 
        reviews: [newReview, ...(productToUpdate.reviews || [])] 
      };
      
      // Call Backend
      try {
        await API.updateProduct(updatedProduct);
        setProducts(prev => prev.map(p => p.id === updatedProduct.id ? updatedProduct : p));
        showToast('評價提交成功！感謝您的回饋');
      } catch (e) {
        showToast('評價提交失敗', 'error');
      }
    }
  };

  const filteredProducts = useMemo(() => {
    let list = products.filter(p => p.status === 'OPEN');
    
    // 如果在特定賣場模式
    if (currentShopId) {
      list = list.filter(p => p.shop_id === currentShopId);
    }

    if (searchQuery) {
      list = list.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return list;
  }, [products, searchQuery, currentShopId]);

  // 取得當前賣場資訊 (包含動態計算的 stats)
  const currentShop = useMemo(() => {
    if (!currentShopId) return null;
    const shopUser = allUsers.find(u => u.shop_id === currentShopId && u.role === 'SELLER');
    if (!shopUser) return null;

    const dynamicStats = calculateShopStats(currentShopId);
    // 合併既有資料與動態計算的資料
    return {
      ...shopUser,
      stats: {
        ...shopUser.stats, // 保留一些 mock 或預設值
        ...dynamicStats,   // 覆蓋動態計算值
      }
    };
  }, [currentShopId, allUsers, products]);

  // 管理者/賣家後台更新 callback
  const handleAdminUpdateProducts = async (newProducts: Product[]) => {
    // 這裡 newProducts 通常是全部列表，我們需要找出差異並更新後端
    // 簡化起見，假設是單一新增或修改。實際 AdminDashboard 傳回的是完整列表。
    // 在真實後端架構下，AdminDashboard 應該直接呼叫 API.create/update，然後這裡只負責 refresh。
    // 為了相容現有程式碼結構：
    // 我們重新 fetch 最新資料即可
    // 但 AdminDashboard 目前是樂觀更新，我們這裡先 setProducts，後端同步部分需由 AdminDashboard 內部處理
    // (為了不重寫 AdminDashboard 太多，我們假設 AdminDashboard 內部會呼叫 onUpdateProducts，我們在這裡呼叫 API)
    
    // **注意**：因為 AdminDashboard 的邏輯是操作整包陣列，我們這裡比較難逐一 API 請求。
    // 理想做法是重構 AdminDashboard。
    // 折衷做法：我們只更新 state，但實際的 API 呼叫我會建議您在 AdminDashboard 中實作 (見下一步說明)。
    // 在此演示中，我們假設 AdminDashboard 已經呼叫了 API，這裡只是更新前端 State。
    setProducts(newProducts);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F5]">
      {toast && (
        <div className={`fixed top-24 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-fade-in-up border bg-white ${
          toast.type === 'success' ? 'text-green-600 border-green-100' : 'text-red-600 border-red-100'
        }`}>
          <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}`}></i>
          <span className="font-bold text-sm">{toast.message}</span>
        </div>
      )}

      {/* 公告彈窗 */}
      {showAnnouncement && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col relative animate-fade-in-up">
            <div className="h-24 bg-[#EE4D2D] relative overflow-hidden flex items-center justify-center">
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
               <h3 className="text-3xl font-black text-white tracking-widest relative z-10 flex items-center gap-3">
                 <i className="fa-solid fa-bullhorn animate-bounce"></i> 平台公告
               </h3>
            </div>
            <div className="p-8">
              <div className="text-slate-600 leading-relaxed whitespace-pre-wrap font-medium">
                {announcementText}
              </div>
            </div>
            <div className="p-6 pt-0 text-center">
              <button 
                onClick={handleCloseAnnouncement} 
                className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition shadow-lg"
              >
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 全域資訊彈窗 */}
      {modalContent && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="bg-[#EE4D2D] p-5 flex justify-between items-center text-white shrink-0">
              <h3 className="font-black text-lg tracking-wide"><i className="fa-solid fa-circle-info mr-2"></i>{modalContent.title}</h3>
              <button onClick={() => setModalContent(null)} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center transition">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="p-8 overflow-y-auto">
              <pre className="whitespace-pre-wrap font-sans text-slate-600 leading-relaxed text-sm">
                {modalContent.content}
              </pre>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 text-center shrink-0">
              <button onClick={() => setModalContent(null)} className="px-8 py-2 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition">
                關閉視窗
              </button>
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
        onShowHelp={() => setModalContent({ title: '幫助中心 (Help Center)', content: siteSettings.helpCenter })}
      />

      <main className="container mx-auto px-4 py-8 flex-1 max-w-7xl pb-32">
        {!isDataLoaded ? (
          <div className="flex justify-center items-center h-64 text-slate-400 font-bold animate-pulse">
            正在連接伺服器載入資料...
          </div>
        ) : (
          <>
            {view === View.SHOP && (
              <Shop 
                products={filteredProducts} 
                categories={categories.filter(c => currentShopId ? c.shop_id === currentShopId : true)} 
                currentShop={currentShop || undefined}
                currentUser={user}
                onOpenProduct={(p) => navigateTo(View.PRODUCT, p)} 
                onFollowShop={handleFollowShop}
              />
            )}
            
            {view === View.PRODUCT && selectedProduct && (
              <ProductDetail 
                product={selectedProduct} 
                allSellers={allUsers.filter(u => u.role === 'SELLER')}
                currentUser={user}
                onAddToCart={(item) => { 
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
                onUpdateQty={(idx, newQty) => { 
                  if (newQty < 1) {
                    setCart(cart.filter((_, i) => i !== idx));
                    showToast('商品已從購物車移除', 'error');
                  } else {
                    const n = [...cart]; 
                    n[idx].qty = newQty; 
                    setCart(n); 
                  }
                }} 
                onRemove={(idx) => { 
                  setCart(cart.filter((_, i) => i !== idx)); 
                  showToast('商品已移除', 'error'); 
                }} 
                onCheckout={() => navigateTo(View.CHECKOUT)} 
                onClear={() => { 
                  setCart([]); 
                  showToast('購物車已清空'); 
                }} 
              />
            )}

            {view === View.CHECKOUT && (
              <Checkout 
                cart={cart} 
                user={user} 
                onSubmit={async (order) => { 
                  try {
                    await API.createOrder(order);
                    setOrders([order, ...orders]); 
                    setCart([]); 
                    showToast('訂單已提交！'); 
                    navigateTo(View.BUYER_DASHBOARD); 
                  } catch(e) {
                    showToast('訂單提交失敗', 'error');
                  }
                }} 
              />
            )}

            {view === View.AUTH && (
              <AuthHub onLogin={QC_login} onNavigate={navigateTo} />
            )}

            {view === View.REGISTER_BUYER && (
              <RegisterBuyer 
                onComplete={handleRegisterUser} 
                onShowTerms={() => setModalContent({ title: '會員服務條款', content: siteSettings.termsOfService })}
                onShowDisclaimer={() => setModalContent({ title: '平台免責聲明', content: siteSettings.disclaimer })}
              />
            )}
            
            {view === View.REGISTER_SELLER && <RegisterSeller onComplete={handleRegisterUser} />}
            
            {view === View.ADMIN_HOME && user && (user.role === 'SELLER' || user.role === 'ADMIN') && (
              <AdminDashboard 
                user={user} 
                products={products.filter(p => p.shop_id === user.shop_id)}
                orders={orders.filter(o => o.shop_id === user.shop_id)}
                categories={categories.filter(c => c.shop_id === user.shop_id)}
                onUpdateProducts={async (newProducts) => {
                  const others = products.filter(p => p.shop_id !== user.shop_id);
                  setProducts([...others, ...newProducts]);
                  
                  // *真實對接後端邏輯應由 AdminDashboard 直接呼叫 API，然後在此重新 fetch*
                  const latestProducts = await API.getProducts();
                  setProducts(latestProducts);
                }}
                onUpdateCategories={async (newCategories) => {
                  await API.updateCategories(newCategories);
                  const others = categories.filter(c => c.shop_id !== user.shop_id);
                  setCategories([...others, ...newCategories]);
                }}
                onUpdateUser={async (updatedUser) => {
                  await API.updateUser(updatedUser);
                  const others = allUsers.filter(u => u.id !== updatedUser.id);
                  setAllUsers([...others, updatedUser]);
                  setUser(updatedUser);
                  localStorage.setItem('insbuy_user', JSON.stringify(updatedUser));
                }}
                onUpdateOrderStatus={async (id, status) => {
                  await API.updateOrder(id, status);
                  setOrders(prev => prev.map(o => o.id === id ? {...o, status} : o));
                }}
                onNavigate={navigateTo}
              />
            )}

            {view === View.BUYER_DASHBOARD && user && (
              <BuyerDashboard 
                user={user} 
                orders={orders.filter(o => o.receiver_phone === user.phone)} 
                allSellers={allUsers.filter(u => u.role === 'SELLER')}
                onNavigate={navigateTo}
                onSubmitReview={handleSubmitReview}
              />
            )}
            {view === View.CHAT && <ChatRoom targetId={chatTarget} currentProduct={selectedProduct} />}
            
            {view === View.USER_MANAGEMENT && (
              <UserManagement 
                currentUser={user} 
                users={allUsers} 
                permissions={permissions}
                siteSettings={siteSettings}
                onUpdateUsers={async (updatedUsers) => {
                  setAllUsers(updatedUsers);
                }}
                onUpdatePermissions={async (updatedPermissions) => {
                  await API.updatePermissions(updatedPermissions);
                  setPermissions(updatedPermissions);
                }}
                onUpdateSiteSettings={async (updatedSettings) => {
                  await API.updateSettings(updatedSettings);
                  setSiteSettings(updatedSettings);
                }}
                onNavigate={navigateTo}
              />
            )}
          </>
        )}
      </main>

      <div className="fixed bottom-8 right-8 z-[999] flex flex-col gap-4 items-end">
        {user && user.role === 'ADMIN' && (
          <button 
            onClick={() => navigateTo(View.USER_MANAGEMENT)}
            className="px-4 py-2 bg-slate-800 text-white rounded-full text-[10px] font-black shadow-xl hover:bg-slate-700 transition flex items-center gap-2 mb-2"
          >
            <i className="fa-solid fa-users-gear"></i> 使用者管理 (ADMIN)
          </button>
        )}
        
        <button 
          onClick={() => navigateTo(View.CHAT)}
          className="w-16 h-16 primary-gradient rounded-full shadow-[0_10px_40px_rgba(238,77,45,0.4)] border-4 border-white flex flex-col items-center justify-center text-white hover:scale-110 hover:-translate-y-2 transition-all duration-300 active:scale-95 group relative"
        >
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 rounded-full border-2 border-white animate-bounce shadow-sm flex items-center justify-center">
            <span className="text-[8px] text-slate-800 font-black">AI</span>
          </div>
          <i className="fa-solid fa-wand-magic-sparkles text-2xl"></i>
          <span className="text-[10px] font-black tracking-tighter mt-0.5">智能助教</span>
        </button>
      </div>
    </div>
  );
};

export default App;
