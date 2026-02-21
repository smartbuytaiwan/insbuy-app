import React, { useState, useEffect, useMemo } from 'react';
import { CartItem, User, Order, ShippingRule, BankInfo, Product } from '../types';
import API from '../api';

interface CheckoutProps {
  cart: CartItem[];
  user: User | null;
  products: Product[]; // ★ 新增：接收最新商品列表以進行庫存檢查
  onSubmit: (order: Order) => void;
  onCancel: () => void; // ★ 新增：返回上一步的功能
}

const Checkout: React.FC<CheckoutProps> = ({ cart, user, products, onSubmit, onCancel }) => {
  // 檢查是否為純電子商品訂單
  const isDigitalOrder = useMemo(() => cart.every(item => item.product_type === 'DIGITAL'), [cart]);

  // 從第一件商品取得賣家設定的運費規則
  const availableRules = useMemo(() => {
    if (isDigitalOrder) return [];
    return cart[0]?.shipping_rules && cart[0].shipping_rules.length > 0 
      ? cart[0].shipping_rules 
      : [{ name: '宅配', fee: 100, free_threshold: 2000 }];
  }, [cart, isDigitalOrder]);

  // ★ 取得商品設定的付款方式
  const allowedPaymentMethods = useMemo(() => {
    const methods = cart[0]?.payment_methods;
    if (!methods || methods.length === 0) return ['BANK', 'COD']; 
    return methods;
  }, [cart]);

  // ★ 取得商品設定的問卷問題
  const questions = useMemo(() => {
    return cart[0]?.questions || [];
  }, [cart]);

  // 設定預設選中的付款方式
  const getDefaultPaymentMethod = () => {
    if (allowedPaymentMethods.includes('BANK')) return 'TRANSFER';
    if (allowedPaymentMethods.includes('COD') && !isDigitalOrder) return 'COD';
    if (allowedPaymentMethods.includes('CASH')) return 'CASH';
    return 'TRANSFER'; // Fallback
  };

  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    method: isDigitalOrder ? '電子傳輸' : availableRules[0]?.name || '',
    store: isDigitalOrder ? '線上' : '',
    payment_method: getDefaultPaymentMethod() as 'TRANSFER' | 'COD' | 'CASH', 
    payment_note: ''
  });

  // ★ 新增：備註與問卷回答狀態
  const [remarks, setRemarks] = useState('');
  const [answers, setAnswers] = useState<Record<string, string>>({});
// ==========================================
  // 分潤系統：計算邏輯
  // ==========================================
  const [affiliateData, setAffiliateData] = useState<any>(null);

  useEffect(() => {
    const fetchAffiliate = async () => {
       const savedRef = localStorage.getItem('insbuy_affiliate');
       if (savedRef && cart.length > 0) {
           try {
               const parsed = JSON.parse(savedRef);
               // 檢查期限
               if (new Date().getTime() > parsed.expiry) {
                   localStorage.removeItem('insbuy_affiliate');
                   return;
               }
               
               // 根據購物車第一樣商品的 shop_id 抓取該店家的分潤連結設定
               // 註：這裡假設購物車都是同一家店的商品 (Cart.tsx 有限制)
               const shopId = cart[0].shop_id;
               const links = await API.getAffiliateLinks(shopId);
               
               // 找到對應代碼的設定
               // 找到對應代碼的設定
               const matchedLink = links.find((l: any) => l.code === parsed.code);
               if (matchedLink) {
                   // ★ 檢查專案是否在有效期限內
                   const today = new Date().toISOString().split('T')[0];
                   if (today >= matchedLink.start_date && today <= matchedLink.end_date) {
                       setAffiliateData(matchedLink);
                       console.log('已套用網紅分潤：', matchedLink.influencer_name);
                   } else {
                       console.log('該網紅分潤活動已過期或尚未開始，不計入分潤。');
                   }
               }
           } catch (e) {
               console.error('分潤讀取失敗', e);
           }
       }
    };
    fetchAffiliate();
  }, [cart]);

  // 當可用付款方式改變時，重新校正
  useEffect(() => {
    setForm(prev => {
        let isValid = false;
        if (prev.payment_method === 'TRANSFER' && allowedPaymentMethods.includes('BANK')) isValid = true;
        else if (prev.payment_method === 'COD' && allowedPaymentMethods.includes('COD') && !isDigitalOrder) isValid = true;
        else if (prev.payment_method === 'CASH' && allowedPaymentMethods.includes('CASH')) isValid = true;

        if (!isValid) {
            return { ...prev, payment_method: getDefaultPaymentMethod() as any };
        }
        return prev;
    });
  }, [allowedPaymentMethods, isDigitalOrder]);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + item.finalPrice * item.qty, 0), [cart]);

  // 計算運費：包含進階規則 (件數、免運門檻)
  const shippingFee = useMemo(() => {
    if (isDigitalOrder) return 0;
    const rule = availableRules.find(r => r.name === form.method); // ★ 修正: 將 selectedShippingMethod 改為 form.method
    if (!rule) return 0;
    
    // 1. 滿額免運檢查
    if (rule.free_threshold && cartTotal >= rule.free_threshold) return 0; // ★ 修正: 將 totalAmount 改為 cartTotal

    // 2. 幾件收一次運費檢查
    const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
    if (rule.limit_qty && rule.limit_qty > 0) {
        // 例如：limit_qty=4, totalItems=5 -> Math.ceil(5/4) = 2 趟運費
        const multiples = Math.ceil(totalItems / rule.limit_qty);
        return rule.fee * multiples;
    }

    // 3. 預設單趟運費
    return rule.fee || 0;
  }, [form.method, cartTotal, availableRules, isDigitalOrder, cart]);

  const currentRule = useMemo(() => availableRules.find(r => r.name === form.method) || availableRules[0], [form.method, availableRules]);

  const sellerBankInfo: BankInfo = cart[0]?.bank_info || {
    bank_name: '中國信託',
    bank_code: '822',
    account_name: '拍拍購科技股份有限公司',
    account_number: '901540123456'
  };

  const handleSubmit = () => {
    if (!form.name || !form.phone || (!isDigitalOrder && !form.store)) return alert('請填寫完整資訊');
    if (form.payment_method === 'TRANSFER' && form.payment_note.length < 5) {
      return alert('請填寫匯款帳號末五碼以便對帳');
    }

    // ★ 檢查必填問卷
    for (const q of questions) {
      if (q.required && (!answers[q.title] || !answers[q.title].trim())) {
        return alert(`請回答必填問題：${q.title}`);
      }
    }

    // ★ 新增功能：檢查購買數量是否超過即時庫存
    for (const item of cart) {
        const liveProduct = products.find(p => p.id === item.id);
        if (!liveProduct) {
            return alert(`商品 [${item.name}] 已下架或不存在，無法購買。`);
        }
        if (liveProduct.status !== 'OPEN') {
            return alert(`商品 [${item.name}] 目前未上架，無法購買。`);
        }

        if (item.selectedVariant) {
            // 檢查規格庫存
            const variant = liveProduct.variants.find(v => v.name === item.selectedVariant);
            if (!variant) {
                return alert(`商品 [${item.name}] 的規格 [${item.selectedVariant}] 已不存在。`);
            }
            if (variant.stock < item.qty) {
                return alert(`商品 [${item.name}] - [${item.selectedVariant}] 庫存不足 (剩餘: ${variant.stock})，請調整購買數量。`);
            }
        } else {
            // 檢查總庫存 (若無規格)
            if (liveProduct.total_stock < item.qty) {
                return alert(`商品 [${item.name}] 庫存不足 (剩餘: ${liveProduct.total_stock})，請調整購買數量。`);
            }
        }
    }
// ★ 分潤金額計算與「歷史快照算式」寫入 (送出前最後確認)
    let affiliateInfo = null;
    if (affiliateData) {
        let totalCommission = 0;
        const details: any[] = [];
        
        cart.forEach(item => {
            const itemPrice = item.finalPrice || item.price;
            const itemTotal = itemPrice * item.qty;
            const isPrimary = item.id === affiliateData.product_id;
            const rate = isPrimary ? affiliateData.primary_rate : affiliateData.secondary_rate;
            const commission = Math.round(itemTotal * (rate / 100));
            
            totalCommission += commission;
            // ★ 無論分潤是否為 0，都寫入這項商品的詳細算式快照
            details.push({
                name: item.name,
                price: itemPrice,
                qty: item.qty,
                rate: rate,
                commission: commission
            });
        });

        // 只要有觸發分潤連結，就算總分潤為 0 (例如商品全是 0 元)，也把紀錄寫入
        if (affiliateData.code) {
            affiliateInfo = {
                code: affiliateData.code,
                influencer_id: affiliateData.influencer_id,
                influencer_name: affiliateData.influencer_name,
                total_commission: totalCommission,
                status: 'ESTIMATED',
                details: details 
            };
        }
    }

    // 整理問卷回答
    const formattedAnswers = questions.map(q => ({
      question: q.title,
      answer: answers[q.title] || ''
    }));
    
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      items: cart,
      total_amount: cartTotal + shippingFee,
      shipping_fee: shippingFee,
      payment_method: form.payment_method,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      receiver_name: form.name,
      receiver_phone: form.phone,
      ship_method: form.method,
      store_name: form.store,
      payment_note: form.payment_note,
      remarks: remarks, // ★ 傳送備註
      answers: formattedAnswers, // ★ 傳送問卷回答
      shop_id: cart[0].shop_id,
      // @ts-ignore (忽略型別檢查，因為後端已經支援但前端 types.ts 可能還沒更新)
      affiliate_info: affiliateInfo
    };
    onSubmit(newOrder);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 animate-fade-in">
      {/* 1. 收件資訊 */}
      <div className="bg-white p-10 shadow-sm rounded-[2.5rem] border border-slate-100">
        <h2 className="text-xl font-black border-l-4 border-[#EE4D2D] pl-3 mb-8 text-slate-800">1. 收件資訊</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">購買人姓名</label>
            <input type="text" placeholder="全名" className="w-full h-12 border rounded-2xl px-5 outline-none focus:border-[#EE4D2D] transition shadow-sm" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">聯絡手機</label>
            <input type="tel" placeholder="09XX-XXX-XXX" className="w-full h-12 border rounded-2xl px-5 outline-none focus:border-[#EE4D2D] transition shadow-sm" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
          </div>
        </div>
        
        {isDigitalOrder ? (
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-blue-700 font-bold text-sm flex items-center gap-3">
            <i className="fa-solid fa-circle-info text-xl"></i>
            <div>
              <p>此訂單包含電子商品，無需選擇運送方式。</p>
              <p className="text-xs opacity-80 font-normal mt-1">付款完成後，賣家確認訂單即可下載檔案。</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest">選擇運送方式</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {availableRules.map(rule => (
                <button 
                  key={rule.name} 
                  onClick={() => setForm({...form, method: rule.name})} 
                  className={`p-4 border-2 rounded-2xl font-black text-xs flex flex-col items-center justify-center gap-1.5 transition-all text-center ${
                    form.method === rule.name ? 'border-[#EE4D2D] bg-[#FFEEEC] text-[#EE4D2D] shadow-md' : 'border-slate-50 text-slate-400 hover:border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-sm">{rule.name}</span>
                  <span className={`text-[10px] ${form.method === rule.name ? 'text-[#EE4D2D]' : 'text-slate-500'}`}>單趟 ${rule.fee}</span>
                  
                  {/* ★ 顯示免運門檻 */}
                  {rule.free_threshold > 0 && (
                      <span className={`text-[9px] px-2 py-0.5 rounded-full ${form.method === rule.name ? 'bg-[#EE4D2D] text-white' : 'bg-slate-200 text-slate-500'}`}>
                          滿 ${rule.free_threshold} 免運
                      </span>
                  )}
                  
                  {/* ★ 顯示計件運費規則 */}
                  {rule.limit_qty && rule.limit_qty > 0 ? (
                      <span className="text-[9px] opacity-70">每滿 {rule.limit_qty} 件收一筆</span>
                  ) : null}
                </button>
              ))}
            </div>
            
            <div className="pt-2">
              {/* ★ 新增：面交/自取地址提示 */}
              {currentRule?.pickup_address && (
                <div className="mb-3 p-4 bg-orange-50 border border-orange-100 rounded-2xl text-[11px] font-black text-[#EE4D2D] flex items-center gap-2 animate-fade-in">
                  <i className="fa-solid fa-location-dot"></i> 取貨地點：{currentRule.pickup_address}
                </div>
              )}
              <input 
                type="text" 
                placeholder={form.method.includes('自取') || form.method.includes('面交') ? "輸入您的自取聯絡資訊 (時間/備註)" : "配送門市名稱或詳細宅配地址"} 
                className="w-full h-12 border rounded-2xl px-5 outline-none focus:border-[#EE4D2D] text-sm shadow-sm" 
                value={form.store} 
                onChange={e => setForm({...form, store: e.target.value})} 
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. 付款資訊 */}
      <div className="bg-white p-10 shadow-sm rounded-[2.5rem] border border-slate-100">
        <h2 className="text-xl font-black border-l-4 border-[#EE4D2D] pl-3 mb-8 text-slate-800">2. 付款資訊</h2>
        
        <div className="flex gap-4 mb-6 flex-wrap">
          {allowedPaymentMethods.includes('BANK') && (
            <button 
              onClick={() => setForm({...form, payment_method: 'TRANSFER'})} 
              className={`flex-1 min-w-[120px] py-4 border-2 rounded-2xl font-black flex items-center justify-center gap-2 transition-all ${form.payment_method === 'TRANSFER' ? 'border-[#EE4D2D] bg-[#FFEEEC] text-[#EE4D2D] shadow-md' : 'border-slate-50 text-slate-400'}`}
            >
              <i className="fa-solid fa-building-columns"></i> 銀行匯款
            </button>
          )}
          
          {allowedPaymentMethods.includes('COD') && !isDigitalOrder && (
            <button 
              onClick={() => setForm({...form, payment_method: 'COD'})} 
              className={`flex-1 min-w-[120px] py-4 border-2 rounded-2xl font-black flex items-center justify-center gap-2 transition-all ${form.payment_method === 'COD' ? 'border-[#EE4D2D] bg-[#FFEEEC] text-[#EE4D2D] shadow-md' : 'border-slate-50 text-slate-400'}`}
            >
              <i className="fa-solid fa-truck-ramp-box"></i> 貨到付款
            </button>
          )}

          {allowedPaymentMethods.includes('CASH') && (
            <button 
              onClick={() => setForm({...form, payment_method: 'CASH'})} 
              className={`flex-1 min-w-[120px] py-4 border-2 rounded-2xl font-black flex items-center justify-center gap-2 transition-all ${form.payment_method === 'CASH' ? 'border-[#EE4D2D] bg-[#FFEEEC] text-[#EE4D2D] shadow-md' : 'border-slate-50 text-slate-400'}`}
            >
              <i className="fa-solid fa-hand-holding-dollar"></i> 面交/現金
            </button>
          )}
        </div>

        {form.payment_method === 'TRANSFER' && (
          <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl animate-scale-up space-y-6">
            <div>
              <h3 className="font-black text-slate-700 mb-4 flex items-center gap-2">商家匯款帳號</h3>
              <div className="space-y-2 text-sm text-slate-600 bg-white p-5 rounded-2xl shadow-sm font-bold">
                <div className="flex justify-between border-b border-slate-50 pb-2"><span>收款銀行：</span><span>{sellerBankInfo.bank_name} ({sellerBankInfo.bank_code})</span></div>
                <div className="flex justify-between border-b border-slate-50 pb-2"><span>戶名：</span><span>{sellerBankInfo.account_name}</span></div>
                <div className="flex justify-between pt-2"><span>帳號：</span><span className="font-mono text-[#EE4D2D] text-lg">{sellerBankInfo.account_number}</span></div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">請填寫您的匯款帳號末五碼：</label>
              <input type="text" maxLength={5} placeholder="共 5 位數字" className="w-full h-12 bg-white border border-slate-200 rounded-2xl px-4 text-center font-mono tracking-widest text-lg outline-none focus:border-[#EE4D2D]" value={form.payment_note} onChange={e => setForm({...form, payment_note: e.target.value.replace(/\D/g, '')})} />
            </div>
          </div>
        )}

        {form.payment_method === 'CASH' && (
          <div className="bg-green-50 border border-green-100 p-6 rounded-3xl animate-scale-up">
             <h3 className="font-black text-green-700 mb-2 flex items-center gap-2">
               <i className="fa-solid fa-circle-check"></i> 選擇面交/現金付款
             </h3>
             <p className="text-sm text-green-600 font-bold leading-relaxed">
               請於約定面交地點取貨時，將現金直接交付給賣家。<br/>
               <span className="text-xs opacity-80">建議您備妥剛好的金額以方便交易。</span>
             </p>
          </div>
        )}
      </div>

      {/* 3. 結帳金額 */}
      <div className="bg-white p-10 shadow-sm rounded-[2.5rem] border border-slate-100">
        <h2 className="text-xl font-black border-l-4 border-[#EE4D2D] pl-3 mb-6 text-slate-800">3. 結帳金額</h2>
        <div className="space-y-3 pb-6 border-b border-dashed border-slate-100">
          <div className="flex justify-between text-slate-400 font-bold"><span>商品總計</span><span>${cartTotal.toLocaleString()}</span></div>
          <div className="flex justify-between text-slate-400 font-bold"><span>運費 ({form.method})</span><span>{shippingFee === 0 ? '免運' : `$${shippingFee}`}</span></div>
        </div>
        <div className="flex justify-between items-center pt-8">
          <span className="font-black text-slate-800 text-xl">應付總額</span>
          <span className="text-5xl font-black text-[#EE4D2D]">${(cartTotal + shippingFee).toLocaleString()}</span>
        </div>
      </div>

      {/* ★ 4. 訂單備註與問卷 (依需求新增於結帳金額下方) */}
      <div className="bg-white p-10 shadow-sm rounded-[2.5rem] border border-slate-100">
        <h2 className="text-xl font-black border-l-4 border-[#EE4D2D] pl-3 mb-8 text-slate-800">4. 訂單備註與問卷</h2>
        
        <div className="space-y-6">
            {/* 顯示商品設定的問卷問題 */}
            {questions.map((q, idx) => (
                <div key={idx} className="space-y-2">
                    <label className="block text-sm font-bold text-slate-700">
                        {q.title} {q.required && <span className="text-red-500">*</span>}
                    </label>
                    <input 
                        type="text" 
                        placeholder="請輸入您的回答..."
                        className="w-full h-12 border border-slate-200 rounded-xl px-4 outline-none focus:border-[#EE4D2D]"
                        value={answers[q.title] || ''}
                        onChange={e => setAnswers({...answers, [q.title]: e.target.value})}
                    />
                </div>
            ))}

            {/* 買家備註 */}
            <div className="space-y-2">
                <label className="block text-sm font-bold text-slate-700">給賣家的話 (備註)</label>
                <textarea 
                    className="w-full h-32 border border-slate-200 rounded-xl p-4 outline-none focus:border-[#EE4D2D] resize-none"
                    placeholder="有什麼特別需求嗎？可以在這裡告訴賣家..."
                    value={remarks}
                    onChange={e => setRemarks(e.target.value)}
                ></textarea>
            </div>
        </div>

        <div className="flex gap-4 mt-10">
            <button 
                onClick={onCancel} 
                className="w-1/3 md:w-40 h-16 bg-white border-2 border-slate-200 text-slate-500 rounded-[1.5rem] font-bold shadow-sm hover:bg-slate-50 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
                <i className="fa-solid fa-arrow-left"></i> 回上一步
            </button>
            
            <button 
                onClick={handleSubmit} 
                className="flex-1 h-16 primary-gradient text-white rounded-[1.5rem] font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex flex-col items-center justify-center"
            >
                <div className="flex items-center gap-2 text-lg md:text-xl"><i className="fa-solid fa-check-to-slot"></i> 提交訂單</div>
                <div className="text-[10px] md:text-xs opacity-90 font-normal mt-0.5">總計 ${(cartTotal + shippingFee).toLocaleString()} {shippingFee > 0 && `(含運費 $${shippingFee})`}</div>
            </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;