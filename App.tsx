
import React, { useState, useEffect, useMemo } from 'react';
import { View, Product, User, CartItem, Order } from './types';
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
import { MOCK_PRODUCTS } from './constants';

const App: React.FC = () => {
  const [view, setView] = useState<View>(View.SHOP);
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [chatTarget, setChatTarget] = useState<string | null>(null);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // 初始載入與 Hash 路由監聽
  useEffect(() => {
    const savedUser = localStorage.getItem('insbuy_user');
    if (savedUser) setUser(JSON.parse(savedUser));

    const savedProducts = localStorage.getItem('insbuy_products');
    const initialProducts = savedProducts ? JSON.parse(savedProducts) : MOCK_PRODUCTS;
    setProducts(initialProducts);

    const savedOrders = localStorage.getItem('insbuy_orders');
    if (savedOrders) setOrders(JSON.parse(savedOrders));

    const savedCart = localStorage.getItem('insbuy_cart');
    if (savedCart) setCart(JSON.parse(savedCart));

    // 處理初始 URL Hash
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 當 products 改變時同步到 localStorage
  useEffect(() => {
    if (products.length > 0) {
      localStorage.setItem('insbuy_products', JSON.stringify(products));
    }
  }, [products]);

  // 當 cart 改變時同步到 localStorage
  useEffect(() => {
    localStorage.setItem('insbuy_cart', JSON.stringify(cart));
  }, [cart]);

  // 當 orders 改變時同步
  useEffect(() => {
    localStorage.setItem('insbuy_orders', JSON.stringify(orders));
  }, [orders]);

  const handleHashChange = () => {
    const hash = window.location.hash.replace('#/', '');
    if (!hash) {
      setView(View.SHOP);
      return;
    }

    const [viewName, id] = hash.split('/');
    if (Object.values(View).includes(viewName as View)) {
      const targetView = viewName as View;
      setView(targetView);

      // 如果是產品頁，根據 ID 找商品
      if (targetView === View.PRODUCT && id) {
        const savedProducts = JSON.parse(localStorage.getItem('insbuy_products') || '[]');
        const p = savedProducts.find((item: Product) => item.id === id);
        if (p) setSelectedProduct(p);
      }
      
      // 如果是聊天室
      if (targetView === View.CHAT && id) {
        setChatTarget(id);
      }
    }
  };

  const navigateTo = (newView: View, product?: Product, targetId?: string) => {
    let hash = `#/${newView}`;
    if (product) {
      setSelectedProduct(product);
      hash += `/${product.id}`;
    } else if (targetId) {
      setChatTarget(targetId);
      hash += `/${targetId}`;
    } else {
      setChatTarget(null);
    }
    
    window.location.hash = hash;
    setView(newView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('insbuy_user');
    setCart([]);
    navigateTo(View.SHOP);
    showToast('已安全登出');
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.status === 'OPEN' && 
      (p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
       p.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [products, searchQuery]);

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

      <Header 
        user={user} 
        cartCount={cart.length} 
        onNavigate={navigateTo} 
        onLogout={logout}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      <main className="container mx-auto px-4 py-8 flex-1 max-w-6xl pb-32">
        {view === View.SHOP && <Shop products={filteredProducts} onOpenProduct={(p) => navigateTo(View.PRODUCT, p)} />}
        {view === View.PRODUCT && selectedProduct && (
          <ProductDetail 
            product={selectedProduct} 
            onAddToCart={(item) => { 
              setCart(prev => [...prev, item]); 
              showToast('已加入購物車！'); 
            }} 
            onNavigate={navigateTo} 
          />
        )}
        {view === View.CART && <Cart items={cart} onRemove={(idx) => { setCart(cart.filter((_, i) => i !== idx)); showToast('商品已移除', 'error'); }} onCheckout={() => navigateTo(View.CHECKOUT)} onClear={() => { setCart([]); showToast('購物車已清空'); }} />}
        {view === View.CHECKOUT && <Checkout cart={cart} user={user} onSubmit={(order) => { setOrders([order, ...orders]); setCart([]); showToast('訂單已提交！'); navigateTo(View.BUYER_DASHBOARD); }} />}
        {view === View.AUTH && <AuthHub onLogin={(u) => { setUser(u); localStorage.setItem('insbuy_user', JSON.stringify(u)); showToast(`歡迎回來，${u.name}！`); navigateTo(u.role === 'SELLER' ? View.ADMIN_HOME : View.SHOP); }} onNavigate={navigateTo} />}
        {view === View.REGISTER_BUYER && <RegisterBuyer onComplete={() => navigateTo(View.AUTH)} />}
        {view === View.REGISTER_SELLER && <RegisterSeller onComplete={() => navigateTo(View.AUTH)} />}
        {view === View.ADMIN_HOME && user && user.role === 'SELLER' && (
          <AdminDashboard 
            user={user} 
            products={products.filter(p => p.shop_id === user.shop_id)}
            orders={orders.filter(o => o.items.some(i => i.shop_id === user.shop_id))}
            onUpdateProducts={(newProducts) => {
              const otherShopsProducts = products.filter(p => p.shop_id !== user.shop_id);
              const updatedAll = [...otherShopsProducts, ...newProducts];
              setProducts(updatedAll);
              // 強制寫入一次確保及時性
              localStorage.setItem('insbuy_products', JSON.stringify(updatedAll));
            }}
            onUpdateOrderStatus={(id, status) => setOrders(prev => prev.map(o => o.id === id ? {...o, status} : o))}
            onNavigate={navigateTo}
          />
        )}
        {view === View.BUYER_DASHBOARD && user && <BuyerDashboard user={user} orders={orders.filter(o => o.receiver_phone === user.phone)} />}
        {view === View.CHAT && <ChatRoom targetId={chatTarget} currentProduct={selectedProduct} />}
      </main>

      <div className="fixed bottom-8 right-8 z-[999] flex flex-col gap-4 items-end">
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
