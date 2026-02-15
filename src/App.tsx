
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
  const [dashboardTab, setDashboardTab] = useState<string | null>(null);
  
  // 系統分類使用 Category[] 以支援結構化
  const [systemCategories, setSystemCategories] = useState<Category[]>([]);

  const [showAnnouncement, setShowAnnouncement] = useState(false);
  const [announcementText, setAnnouncementText] = useState('');
  const [modalContent, setModalContent] = useState<{title: string, content: string} | null>(null);
  const [permissions, setPermissions] = useState<LevelConfig[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    termsOfService: '', disclaimer: '', helpCenter: '', announcement: '', announcementActive: false
  });

  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [fetchError, setFetchError] = useState(false);

  // 未讀訊息計數
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setFetchError(false);
        const savedUser = localStorage.getItem('insbuy_user');
        if (savedUser) setUser(JSON.parse(savedUser));
        
        const savedCart = localStorage.getItem('insbuy_cart');
        if (savedCart) setCart(JSON.parse(savedCart));
        
        // 初始化系統分類
        const savedSysCats = localStorage.getItem('insbuy_system_categories_v2');
        if (savedSysCats) {
          setSystemCategories(JSON.parse(savedSysCats));
        } else {
          // 將預設字串轉為 Category 物件
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

        const data = await API.getInitialData();
        setProducts(data.products);
        setCategories(data.categories);
        setAllUsers(data.users);
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
    if (systemCategories.length > 0) {
      localStorage.setItem('insbuy_system_categories_v2', JSON.stringify(systemCategories));
    }
  }, [systemCategories]);

  useEffect(() => {
    if (isDataLoaded && !fetchError && siteSettings.announcementActive && siteSettings.announcement) {
      const today = new Date().toISOString().split('T')[0];
      const lastViewedDate = localStorage.getItem('insbuy_last_announcement_date');

      if (lastViewedDate !== today) {
        setAnnouncementText(siteSettings.announcement);
        setShowAnnouncement(true);
      }
    }
  }, [siteSettings, isDataLoaded, fetchError]);

  const handleCloseAnnouncement = () => {
    setShowAnnouncement(false);
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('insbuy_last_announcement_date', today);
  };

  useEffect(() => {
    localStorage.setItem('insbuy_cart', JSON.stringify(cart));
  }, [cart]);

  // 定期檢查未讀訊息
  useEffect(() => {
    const checkUnread = () => {
      if (!user) {
        setUnreadCount(0);
        return;
      }
      try {
        const msgs = JSON.parse(localStorage.getItem('insbuy_chat_messages') || '[]');
        // 計算發給當前使用者且未讀的訊息
        const count = msgs.filter((m: any) => m.receiverId === user.id && !m.isRead).length;
        setUnreadCount(count);
      } catch (e) {
        // ignore parsing error
      }
    };

    checkUnread(); // 立即檢查一次
    const interval = setInterval(checkUnread, 2000); // 每2秒檢查一次
    return () => clearInterval(interval);
  }, [user]);

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
      } else if (newView === View.BUYER_DASHBOARD) {
        setDashboardTab(targetId);
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
      const updatedUsers = await API.getUsers();
      setAllUsers(updatedUsers);
      
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
        p.reviews.forEach(r => {
          totalRatings++;
          sumRating += r.rating;
        });
      }
    });

    // 修正：如果沒有評價，顯示 0.0
    const averageRating = totalRatings > 0 ? (sumRating / totalRatings).toFixed(1) : "0.0";
    
    const followerCount = allUsers.filter(u => u.following?.includes(shopId)).length;
    const shopUser = allUsers.find(u => u.shop_id === shopId || u.id === shopId);
    const joinTime = shopUser?.created_at ? calculateJoinTime(shopUser.created_at) : '近期';

    return {
      productCount,
      ratingCount: totalRatings,
      averageRating: parseFloat(averageRating),
      followerCount,
      responseRate: 95 + Math.floor(Math.random() * 5),
      responseTime: '幾小時內',
      joinTime
    };
  };

  const handleFollowShop = async (shopId: string) => {
    if (!user) return showToast('請先登入會員', 'error');
    // 修正：賣家也要可以追蹤別人，移除 BUYER 角色限制
    
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

  const currentShop = useMemo(() => {
    if (!currentShopId) return null;
    const shopUser = allUsers.find(u => (u.shop_id === currentShopId || u.id === currentShopId));
    if (!shopUser) return null;

    const dynamicStats = calculateShopStats(shopUser.shop_id || shopUser.id);
    return {
      ...shopUser,
      stats: { ...shopUser.stats, ...dynamicStats }
    };
  }, [currentShopId, allUsers, products]);

  // Handle Update Order Status Logic
  const handleUpdateOrderStatus = async (id: string, status: Order['status'], cancellationReason?: string) => {
    await API.updateOrder(id, status, cancellationReason);
    setOrders(prev => prev.map(o => o.id === id ? {...o, status, cancellation_reason: cancellationReason} : o));
  };

  if (fetchError) {
    return (
      <div className="min-h-screen flex flex-col bg-[#F5F5F5]">
        <Header 
          user={user} 
          cartCount={cart.length} 
          onNavigate={navigateTo} 
          onLogout={logout} 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          onShowHelp={() => setModalContent({ title: '幫助中心', content: '請檢查伺服器連線' })}
        />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <i className="fa-solid fa-server text-4xl text-red-500"></i>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">無法連接到伺服器</h2>
          <p className="text-slate-500 mb-8 max-w-md">
            系統無法取得資料。這可能是因為後端伺服器 (server.js) 尚未啟動，或是網路連線中斷。
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-[#EE4D2D] text-white rounded-xl font-bold hover:bg-[#d73211] transition shadow-lg flex items-center gap-2"
          >
            <i className="fa-solid fa-rotate-right"></i> 重新連線
          </button>
        </div>
      </div>
    );
  }

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
              <button onClick={handleCloseAnnouncement} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-900 transition shadow-lg">
                我知道了
              </button>
            </div>
          </div>
        </div>
      )}

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
            <i className="fa-solid fa-circle-notch fa-spin mr-3"></i>
            正在連接伺服器載入資料...
          </div>
        ) : (
          <>
            {view === View.SHOP && (
              <Shop 
                products={filteredProducts} 
                categories={categories.filter(c => currentShopId ? c.shop_id === currentShopId : true)} 
                systemCategories={systemCategories}
                currentShop={currentShop || undefined}
                currentUser={user}
                orders={orders} 
                onOpenProduct={(p) => navigateTo(View.PRODUCT, p)} 
                onFollowShop={handleFollowShop}
                onNavigate={navigateTo}
              />
            )}
            
            {view === View.PRODUCT && selectedProduct && (
              <ProductDetail 
                product={selectedProduct} 
                allSellers={allUsers}
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
                    const n = [...cart]; n[idx].qty = newQty; setCart(n); 
                  }
                }} 
                onRemove={(idx) => { 
                  setCart(cart.filter((_, i) => i !== idx)); 
                  showToast('商品已移除', 'error'); 
                }} 
                onCheckout={() => navigateTo(View.CHECKOUT)} 
                onClear={() => { setCart([]); showToast('購物車已清空'); }} 
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
                    // Redirect to ORDERS tab in Buyer Dashboard
                    navigateTo(View.BUYER_DASHBOARD, undefined, 'ORDERS');
                  } catch(e) {
                    showToast('訂單提交失敗', 'error');
                  }
                }} 
              />
            )}

            {view === View.AUTH && <AuthHub onLogin={QC_login} onNavigate={navigateTo} />}
            {view === View.REGISTER_BUYER && <RegisterBuyer onComplete={handleRegisterUser} onShowTerms={() => setModalContent({ title: '會員服務條款', content: siteSettings.termsOfService })} onShowDisclaimer={() => setModalContent({ title: '平台免責聲明', content: siteSettings.disclaimer })} />}
            {view === View.REGISTER_SELLER && <RegisterSeller onComplete={handleRegisterUser} />}
            
            {view === View.ADMIN_HOME && user && (user.role === 'SELLER' || user.role === 'ADMIN') && (
              <AdminDashboard 
                user={user} 
                products={products.filter(p => p.shop_id === (user.shop_id || user.id))}
                // 賣家看到的銷售訂單
                orders={orders.filter(o => o.shop_id === (user.shop_id || user.id))}
                // ★ 新增：賣家自己的購買訂單 (買家功能整合)
                buyOrders={orders.filter(o => o.receiver_phone === user.phone)}
                
                categories={categories.filter(c => c.shop_id === (user.shop_id || user.id))}
                systemCategories={systemCategories}
                onUpdateSystemCategories={(newCats) => setSystemCategories(newCats as Category[])}
                
                onUpdateProducts={async (newProducts) => {
                  const latestProducts = await API.getProducts();
                  setProducts(latestProducts);
                }}
                onUpdateCategories={async (newCategories) => {
                  try {
                    const freshData = await API.getInitialData();
                    setCategories(freshData.categories); 
                    showToast('分類與伺服器同步成功');
                  } catch (e) {
                    showToast('同步失敗，請檢查網路', 'error');
                  }
                }}
                onUpdateUser={async (updatedUser) => {
                  await API.updateUser(updatedUser);
                  const others = allUsers.filter(u => u.id !== updatedUser.id);
                  setAllUsers([...others, updatedUser]);
                  setUser(updatedUser);
                  localStorage.setItem('insbuy_user', JSON.stringify(updatedUser));
                }}
                onUpdateOrderStatus={handleUpdateOrderStatus}
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
                onUpdateOrderStatus={handleUpdateOrderStatus}
                initialTab={dashboardTab || 'ACCOUNT'} 
              />
            )}
            
            {view === View.CHAT && (
              <ChatRoom 
                currentUser={user}
                targetId={chatTarget} 
                allUsers={allUsers}
              />
            )}
            
            {view === View.USER_MANAGEMENT && (
              <UserManagement 
                currentUser={user} 
                users={allUsers} 
                orders={orders} // Pass orders
                permissions={permissions}
                siteSettings={siteSettings}
                onUpdateUsers={async (updatedUsers) => { setAllUsers(updatedUsers); }}
                onUpdatePermissions={async (updatedPermissions) => {
                  await API.updatePermissions(updatedPermissions);
                  setPermissions(updatedPermissions);
                }}
                onUpdateSiteSettings={async (updatedSettings) => {
                  await API.updateSettings(updatedSettings);
                  setSiteSettings(updatedSettings);
                }}
                onNavigate={navigateTo}
                onUpdateOrderStatus={handleUpdateOrderStatus} // Pass handler
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
        
        {/* ★ 更新：將 AI 助理按鈕替換為聊聊按鈕，並新增未讀訊息提醒 */}
        <button 
          onClick={() => navigateTo(View.CHAT)}
          className="w-16 h-16 primary-gradient rounded-full shadow-[0_10px_40px_rgba(238,77,45,0.4)] border-4 border-white flex flex-col items-center justify-center text-white hover:scale-110 hover:-translate-y-2 transition-all duration-300 active:scale-95 group relative"
        >
          {unreadCount > 0 && (
            <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full border-2 border-white flex items-center justify-center animate-bounce z-10 shadow-sm">
              <span className="text-[10px] text-white font-black">{unreadCount > 99 ? '99+' : unreadCount}</span>
            </div>
          )}
          <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-white animate-bounce shadow-sm flex items-center justify-center opacity-0">
            <span className="text-[8px] text-white font-black"><i className="fa-solid fa-comment-dots"></i></span>
          </div>
          <i className="fa-regular fa-comments text-2xl"></i>
          <span className="text-[10px] font-black tracking-tighter mt-0.5">聊聊客服</span>
        </button>
      </div>
    </div>
  );
};

export default App;
