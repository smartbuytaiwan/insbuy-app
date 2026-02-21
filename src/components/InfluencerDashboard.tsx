import React, { useState, useEffect, useMemo } from 'react';
import { View, Order } from '../types';
import API from '../api';

interface InfluencerDashboardProps {
  currentUser: any;
  onNavigate: (view: View) => void;
}

const InfluencerDashboard: React.FC<InfluencerDashboardProps> = ({ onNavigate }) => {
  // === 登入與註冊狀態 ===
  const [isRegistering, setIsRegistering] = useState(false);
  const [authForm, setAuthForm] = useState({ account: '', password: '', name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [influencer, setInfluencer] = useState<any>(null);

  // === 資料狀態 ===
  const [allLinks, setAllLinks] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [shopMap, setShopMap] = useState<Record<string, string>>({});

  // === 介面控制狀態 ===
  const [tab, setTab] = useState<'ACTIVE' | 'ENDED'>('ACTIVE');
  const [selectedLink, setSelectedLink] = useState<any>(null); 
  const [linkPage, setLinkPage] = useState(1); 
  const [detailOrderPage, setDetailOrderPage] = useState(1); // ★ 新增：專案內「訂單明細」的分頁狀態
  
  const [dateRange, setDateRange] = useState({
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
  });

  const filteredLinks = useMemo(() => {
      const todayStr = new Date().toISOString().split('T')[0];
      let list = allLinks.filter(l => {
          const isActive = todayStr >= l.start_date && todayStr <= l.end_date;
          return tab === 'ACTIVE' ? isActive : !isActive;
      });
      return list.sort((a, b) => {
          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return timeB - timeA;
      });
  }, [allLinks, tab]);

  const paginatedLinks = useMemo(() => {
      const startIndex = (linkPage - 1) * 8;
      return filteredLinks.slice(startIndex, startIndex + 8);
  }, [filteredLinks, linkPage]);

  const totalLinkPages = Math.ceil(filteredLinks.length / 8);

  const handleRegister = async () => {
      if (!authForm.account || !authForm.password || !authForm.name || !authForm.email || !authForm.phone) {
          return alert('請填寫所有註冊欄位！');
      }
      setLoading(true);
      try {
          await API.registerInfluencer(authForm);
          alert('註冊成功！請使用剛才設定的帳號密碼登入。');
          setIsRegistering(false);
          setAuthForm({ ...authForm, password: '' }); 
      } catch (e: any) {
          alert(e.response?.data?.message || '註冊失敗，帳號或信箱可能已存在。');
      } finally {
          setLoading(false);
      }
  };

  const handleLogin = async () => {
      if (!authForm.account || !authForm.password) return alert('請輸入帳號與密碼');
      setLoading(true);
      try {
          const res = await API.loginInfluencer({ account: authForm.account, password: authForm.password });
          setInfluencer(res);
          loadDashboardData(res.id);
      } catch (e: any) {
          alert(e.response?.data?.message || '登入失敗，請檢查帳號密碼。');
      } finally {
          setLoading(false);
      }
  };

  const loadDashboardData = async (infId: string) => {
      try {
          const [linksRes, ordersRes, usersRes] = await Promise.all([
              API.getAllAffiliateLinks(),
              API.getOrders(),
              fetch('http://127.0.0.1:3001/api/users').then(res => res.json()).catch(() => [])
          ]);
          
          setAllLinks(linksRes.filter((l: any) => l.influencer_id === infId));
          setAllOrders(ordersRes);

          const mapping: Record<string, string> = {};
          usersRes.forEach((u: any) => {
              if (u.shop_id) mapping[u.shop_id] = u.shop_name || u.name;
              mapping[u.id] = u.shop_name || u.name;
          });
          setShopMap(mapping);
      } catch (e) {
          console.error("載入資料失敗", e);
      }
  };

  const periodStats = useMemo(() => {
      let totalEstimated = 0;
      let totalConfirmed = 0;
      let totalSales = 0;
      let orderCount = 0;

      const sDate = new Date(dateRange.start).getTime();
      const eDate = new Date(dateRange.end).setHours(23, 59, 59, 999);

      allOrders.forEach(o => {
          if (o.status === 'CANCELLED') return;
          const info: any = o.affiliate_info;
          if (info && info.influencer_id === influencer?.id) {
              const oTime = new Date(o.created_at).getTime();
              if (oTime >= sDate && oTime <= eDate) {
                  totalSales += o.total_amount;
                  const comm = info.total_commission || 0;
                  if (o.status === 'COMPLETED') {
                      totalConfirmed += comm;
                  } else {
                      totalEstimated += comm;
                  }
                  orderCount++;
              }
          }
      });
      return { totalEstimated, totalConfirmed, totalSales, orderCount };
  }, [allOrders, dateRange, influencer?.id]);

  if (!influencer) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 animate-fade-in">
              <div className="bg-white w-full max-w-md p-6 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-100 text-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 primary-gradient"></div>
                  <div className="w-16 h-16 bg-orange-100 text-[#EE4D2D] rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-inner">
                      <i className="fa-solid fa-bullhorn"></i>
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 mb-6">網紅夥伴專屬後台</h2>
                  
                  <div className="flex bg-slate-100 rounded-2xl p-1 mb-8 shadow-inner">
                      <button 
                          onClick={() => { setIsRegistering(false); setAuthForm({...authForm, password: ''}); }}
                          className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${!isRegistering ? 'bg-white text-[#EE4D2D] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                          帳號登入
                      </button>
                      <button 
                          onClick={() => { setIsRegistering(true); setAuthForm({...authForm, password: ''}); }}
                          className={`flex-1 py-3 text-sm font-black rounded-xl transition-all ${isRegistering ? 'bg-white text-[#EE4D2D] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                          註冊新帳號
                      </button>
                  </div>
                  
                  <div className="space-y-4 mb-8 text-left animate-fade-in-up">
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1">登入帳號 (自訂英文/數字)</label>
                          <input type="text" placeholder="例如：danny_kol" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-[#EE4D2D] focus:bg-white transition" value={authForm.account} onChange={e => setAuthForm({...authForm, account: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1">密碼</label>
                          <input type="password" placeholder="請輸入密碼" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-[#EE4D2D] focus:bg-white transition" value={authForm.password} onChange={e => setAuthForm({...authForm, password: e.target.value})} />
                      </div>
                      
                      {isRegistering && (
                          <div className="space-y-4 pt-2">
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1">顯示名稱 (網紅/頻道名)</label>
                                  <input type="text" placeholder="例如：丹妮婊姐" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-[#EE4D2D] focus:bg-white transition" value={authForm.name} onChange={e => setAuthForm({...authForm, name: e.target.value})} />
                              </div>
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1">聯絡信箱</label>
                                  <input type="email" placeholder="輸入Email" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-[#EE4D2D] focus:bg-white transition" value={authForm.email} onChange={e => setAuthForm({...authForm, email: e.target.value})} />
                              </div>
                              <div>
                                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1">手機號碼</label>
                                  <input type="tel" placeholder="輸入手機號碼" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:border-[#EE4D2D] focus:bg-white transition" value={authForm.phone} onChange={e => setAuthForm({...authForm, phone: e.target.value})} />
                              </div>
                          </div>
                      )}
                  </div>
                  
                  <button onClick={isRegistering ? handleRegister : handleLogin} disabled={loading} className="w-full py-4 primary-gradient text-white rounded-2xl font-black hover:scale-[1.02] active:scale-95 transition shadow-xl disabled:opacity-50 text-lg">
                      {loading ? '處理中...' : (isRegistering ? '立即註冊開通' : '安全登入')}
                  </button>
                  
                  <button onClick={() => onNavigate(View.SHOP)} className="mt-8 text-slate-400 text-xs font-bold hover:text-slate-600 flex items-center justify-center gap-1 mx-auto">
                      <i className="fa-solid fa-arrow-left"></i> 暫不登入，回首頁
                  </button>
              </div>
          </div>
      );
  }

  // ==========================================
  // 介面渲染：已登入 - 活動詳情模式
  // ==========================================
  if (selectedLink) {
      // ★ 核心修復：讓詳細訂單也依照「最新建立時間」降冪排序
      const linkOrders = allOrders
          .filter(o => o.affiliate_info?.code === selectedLink.code && o.status !== 'CANCELLED')
          .sort((a, b) => {
              const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
              const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
              return timeB - timeA;
          });
          
      // ★ 計算訂單明細分頁
      const totalDetailOrderPages = Math.ceil(linkOrders.length / 8);
      const paginatedLinkOrders = linkOrders.slice((detailOrderPage - 1) * 8, detailOrderPage * 8);
          
      let totalEstimated = 0;
      let totalConfirmed = 0;
      linkOrders.forEach(o => {
          const comm = o.affiliate_info?.total_commission || 0;
          if (o.status === 'COMPLETED') totalConfirmed += comm;
          else totalEstimated += comm;
      });

      return (
          <div className="min-h-screen bg-[#F8F9FA] pb-20 animate-fade-in">
              <div className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 py-4 md:px-8 flex justify-between items-center shadow-sm">
                  <button onClick={() => { setSelectedLink(null); setDetailOrderPage(1); }} className="flex items-center gap-2 text-slate-600 font-bold hover:text-[#EE4D2D] transition">
                      <i className="fa-solid fa-arrow-left"></i> 返回總覽
                  </button>
                  <div className="text-sm font-black text-slate-800">活動詳情報表</div>
              </div>

              <div className="container mx-auto px-4 py-8 max-w-4xl space-y-6">
                  {/* 活動摘要卡片 */}
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                          <div className="text-xs text-slate-400 font-bold mb-1">合作商家：{shopMap[selectedLink.shop_id] || '未知賣場'}</div>
                          <h2 className="text-xl font-black text-slate-800 mb-2">專屬代碼：<span className="text-[#EE4D2D]">{selectedLink.code}</span></h2>
                          <div className="text-sm text-slate-500 font-mono"><i className="fa-regular fa-calendar mr-1"></i> {selectedLink.start_date} ~ {selectedLink.end_date}</div>
                      </div>
                      <div className="flex gap-2 w-full md:w-auto">
                          <div className="flex-1 md:flex-none bg-orange-50 px-4 py-3 rounded-2xl border border-orange-100 text-center md:text-right">
                              <div className="text-[10px] md:text-xs text-orange-600 font-bold mb-1">目前預計分潤</div>
                              <div className="text-xl md:text-2xl font-black text-orange-500">${totalEstimated.toLocaleString()}</div>
                          </div>
                          <div className="flex-1 md:flex-none bg-green-50 px-4 py-3 rounded-2xl border border-green-100 text-center md:text-right">
                              <div className="text-[10px] md:text-xs text-green-700 font-bold mb-1">確定總分潤</div>
                              <div className="text-xl md:text-2xl font-black text-green-600">${totalConfirmed.toLocaleString()}</div>
                          </div>
                      </div>
                  </div>

                  {/* 訂單明細列表 (支援分頁) */}
                  <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col max-h-[800px]">
                      <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                          <h3 className="font-black text-slate-700">訂單明細與分潤算式</h3>
                          <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">共 {linkOrders.length} 筆</span>
                      </div>
                      <div className="p-4 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                          {linkOrders.length === 0 ? <div className="text-center text-slate-400 py-10">此活動尚未產生訂單</div> : 
                           (
                               <>
                                   {/* ★ 這裡改用 paginatedLinkOrders 渲染 */}
                                   {paginatedLinkOrders.map(o => {
                                      const statusMap: Record<string, string> = { 'PENDING': '待付款', 'CONFIRMED': '待出貨', 'SHIPPED': '待收貨', 'COMPLETED': '已完成', 'CANCELLED': '已取消' };
                                      const statusLabel = statusMap[o.status] || o.status;

                                      return (
                                      <div key={o.id} className="border border-slate-200 rounded-2xl p-4 hover:border-orange-200 transition bg-white shadow-sm flex flex-col gap-2">
                                          <div className="flex flex-col md:flex-row justify-between md:items-center gap-2 border-b border-slate-100 pb-3">
                                              <div className="flex items-center gap-3">
                                                  <span className="bg-slate-100 text-slate-600 font-mono text-xs px-2 py-1 rounded font-bold">#{o.id.slice(-6)}</span>
                                                  <span className="text-xs text-slate-400">{new Date(o.created_at).toLocaleString()}</span>
                                              </div>
                                              <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                                                  <span className={`text-[10px] font-bold px-2 py-1 rounded ${o.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : o.status === 'CANCELLED' ? 'bg-slate-200 text-slate-500' : 'bg-orange-100 text-orange-500'}`}>{statusLabel}</span>
                                                  <span className="text-xs font-black text-slate-700 bg-slate-50 px-2 py-1 rounded">訂單總額: ${(o.total_amount || 0).toLocaleString()}</span>
                                                  <span className={`text-xs font-black px-2 py-1 rounded ${o.status === 'COMPLETED' ? 'text-green-600 bg-green-50' : 'text-orange-500 bg-orange-50'}`}>
                                                      {o.status === 'COMPLETED' ? '確定分潤' : '預計分潤'}: ${(o.affiliate_info?.total_commission || 0).toLocaleString()}
                                                  </span>
                                              </div>
                                          </div>
                                          
                                          <div className="bg-slate-50 p-3 rounded-lg space-y-2 mt-1">
                                              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 border-b border-slate-200 pb-1">分潤計算明細 (全品項)</div>
                                              {o.affiliate_info?.details?.length > 0 ? (
                                                  o.affiliate_info.details.map((dt: any, idx: number) => (
                                                      <div key={idx} className="flex flex-col md:flex-row justify-between text-xs text-slate-600 border-b border-slate-200/50 last:border-0 pb-2 last:pb-0 gap-1 md:gap-0 items-start md:items-center">
                                                          <div className="font-bold truncate w-full md:w-1/2 pr-2">{dt.name}</div>
                                                          <div className="font-mono text-slate-500 flex items-center justify-end gap-1 w-full md:w-auto">
                                                              <span>${dt.price}</span>
                                                              <span className="text-[10px]">x</span>
                                                              <span>{dt.qty}件</span>
                                                              <span className="text-[10px]">x</span>
                                                              <span className="text-blue-500 font-bold">{dt.rate}%</span>
                                                              <span className="text-[10px]">=</span>
                                                              <span className={`font-black ${dt.commission > 0 ? 'text-slate-800' : 'text-slate-400'}`}>${dt.commission}</span>
                                                          </div>
                                                      </div>
                                                  ))
                                              ) : (
                                                  <div className="text-[10px] text-slate-400 italic">此為舊版訂單，無保存詳細算式</div>
                                              )}
                                          </div>
                                      </div>
                                      );
                                   })}
                                   
                                   {/* ★ 新增：訂單明細的換頁按鈕 */}
                                   {totalDetailOrderPages > 1 && (
                                       <div className="flex justify-center items-center gap-2 md:gap-4 mt-6 pt-4 border-t border-slate-100">
                                           <button onClick={() => setDetailOrderPage(p => Math.max(1, p - 1))} disabled={detailOrderPage === 1} className="px-3 md:px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50 text-xs md:text-sm shadow-sm"><i className="fa-solid fa-chevron-left"></i></button>
                                           <span className="text-xs md:text-sm font-bold text-slate-600">第 {detailOrderPage} / {totalDetailOrderPages} 頁</span>
                                           <button onClick={() => setDetailOrderPage(p => Math.min(totalDetailOrderPages, p + 1))} disabled={detailOrderPage === totalDetailOrderPages} className="px-3 md:px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50 text-xs md:text-sm shadow-sm"><i className="fa-solid fa-chevron-right"></i></button>
                                       </div>
                                   )}
                               </>
                           )}
                      </div>
                  </div>
              </div>
          </div>
      );
  }

  // ==========================================
  // 介面渲染：已登入 - 儀表板總覽
  // ==========================================
  return (
    <div className="min-h-screen bg-[#F8F9FA] pb-20 animate-fade-in">
        <div className="bg-white border-b border-slate-200 sticky top-0 z-10 px-4 py-4 md:px-8 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 primary-gradient text-white rounded-xl flex items-center justify-center font-bold shadow-md">
                    <i className="fa-solid fa-star"></i>
                </div>
                <div>
                    <h1 className="font-black text-slate-800 text-lg leading-tight">{influencer.name} 的後台</h1>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5 flex items-center gap-1">
                        系統綁定ID: <span className="font-bold text-slate-700 bg-slate-100 px-1 py-0.5 rounded">{influencer.id}</span>
                        <button onClick={() => { navigator.clipboard.writeText(influencer.id); alert('ID已複製！請將此ID提供給賣家進行綁定'); }} className="text-blue-500 hover:text-blue-700" title="複製ID"><i className="fa-regular fa-copy"></i></button>
                    </div>
                </div>
            </div>
            <button onClick={() => setInfluencer(null)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition flex items-center gap-2">
                <i className="fa-solid fa-right-from-bracket"></i> <span className="hidden md:inline">登出</span>
            </button>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-100 pb-4">
                    <h3 className="font-black text-slate-800 text-lg flex items-center gap-2"><i className="fa-solid fa-chart-line text-[#EE4D2D]"></i> 區間成效總覽</h3>
                    <div className="flex items-center gap-2 text-sm bg-slate-50 p-2 rounded-xl">
                        <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="border border-slate-200 rounded-lg px-2 py-1 outline-none font-bold text-slate-600" />
                        <span className="text-slate-400">~</span>
                        <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="border border-slate-200 rounded-lg px-2 py-1 outline-none font-bold text-slate-600" />
                    </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-100 text-center">
                        <div className="text-slate-500 text-[10px] md:text-xs font-bold mb-2 uppercase tracking-wide">區間推廣訂單數</div>
                        <div className="text-xl md:text-3xl font-black text-slate-800">{periodStats.orderCount} <span className="text-xs md:text-sm font-normal text-slate-400">筆</span></div>
                    </div>
                    <div className="bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-100 text-center">
                        <div className="text-slate-500 text-[10px] md:text-xs font-bold mb-2 uppercase tracking-wide">區間帶來總營業額</div>
                        <div className="text-xl md:text-3xl font-black text-slate-800">${periodStats.totalSales.toLocaleString()}</div>
                    </div>
                    <div className="bg-orange-50 p-4 md:p-6 rounded-2xl border border-orange-100 text-center relative overflow-hidden">
                        <div className="text-orange-500 text-[10px] md:text-xs font-bold mb-2 uppercase tracking-wide">目前預計分潤</div>
                        <div className="text-xl md:text-3xl font-black text-orange-500">${periodStats.totalEstimated.toLocaleString()}</div>
                    </div>
                    <div className="bg-green-50 p-4 md:p-6 rounded-2xl border border-green-100 text-center relative overflow-hidden">
                        <div className="text-green-600 text-[10px] md:text-xs font-bold mb-2 uppercase tracking-wide">確定總分潤</div>
                        <div className="text-xl md:text-3xl font-black text-green-600">${periodStats.totalConfirmed.toLocaleString()}</div>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden p-6">
                <div className="flex gap-4 mb-6 border-b border-slate-100 pb-2">
                    <button onClick={() => { setTab('ACTIVE'); setLinkPage(1); }} className={`font-black text-lg px-2 py-2 transition ${tab === 'ACTIVE' ? 'text-[#EE4D2D] border-b-2 border-[#EE4D2D]' : 'text-slate-400 hover:text-slate-600'}`}>
                        進行中的活動
                    </button>
                    <button onClick={() => { setTab('ENDED'); setLinkPage(1); }} className={`font-black text-lg px-2 py-2 transition ${tab === 'ENDED' ? 'text-slate-800 border-b-2 border-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>
                        已結束的活動
                    </button>
                </div>

                {filteredLinks.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 font-bold border-2 border-dashed border-slate-100 rounded-2xl">
                        <i className="fa-solid fa-folder-open text-4xl mb-3 opacity-30 block"></i>
                        目前沒有相關的分潤活動
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {paginatedLinks.map(link => {
                                const linkOrders = allOrders.filter(o => o.affiliate_info?.code === link.code && o.status !== 'CANCELLED');
                                let linkEstimated = 0;
                                let linkConfirmed = 0;
                                linkOrders.forEach(o => {
                                    const comm = o.affiliate_info?.total_commission || 0;
                                    if (o.status === 'COMPLETED') linkConfirmed += comm;
                                    else linkEstimated += comm;
                                });
                                
                                return (
                                    <div key={link.id} className={`border-2 p-5 rounded-2xl transition cursor-pointer flex flex-col gap-4 shadow-sm hover:shadow-md ${tab === 'ACTIVE' ? 'bg-white border-orange-100 hover:border-[#EE4D2D]' : 'bg-slate-50 border-slate-200 grayscale-[50%]'}`} onClick={() => setSelectedLink(link)}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="text-xs text-slate-400 font-bold mb-1 flex items-center gap-1"><i className="fa-solid fa-store"></i> {shopMap[link.shop_id] || '合作商家'}</div>
                                                <div className="font-black text-slate-800 text-lg">代碼: {link.code}</div>
                                                <div className="text-[10px] text-slate-400 mt-1"><i className="fa-regular fa-clock"></i> 建立於: {new Date(link.created_at).toLocaleDateString()}</div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] text-slate-400 font-bold">確定總分潤</div>
                                                <div className="font-black text-xl text-green-600">${linkConfirmed.toLocaleString()}</div>
                                                <div className="text-[10px] text-orange-500 font-bold mt-1">預估: ${linkEstimated.toLocaleString()}</div>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-slate-100 rounded-lg p-3 text-xs text-slate-600 font-mono grid grid-cols-2 gap-2">
                                            <div>主打商品: <span className="font-bold text-slate-800">{link.primary_rate}%</span></div>
                                            <div>其他商品: <span className="font-bold text-slate-800">{link.secondary_rate}%</span></div>
                                            <div className="col-span-2 pt-2 border-t border-slate-200 mt-1 flex items-center gap-1">
                                                <i className="fa-regular fa-calendar text-slate-400"></i> {link.start_date} ~ {link.end_date}
                                            </div>
                                        </div>

                                        <div className="mt-auto pt-2">
                                            <button className="w-full py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-700 transition">
                                                查看訂單明細 <i className="fa-solid fa-arrow-right ml-1"></i>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        
                        {/* 分頁按鈕 */}
                        <div className="flex justify-center items-center gap-2 md:gap-4 mt-8 pt-6 border-t border-slate-100">
                            <button 
                                onClick={() => setLinkPage(p => Math.max(1, p - 1))} 
                                disabled={linkPage === 1} 
                                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition shadow-sm font-bold"
                            >
                                <i className="fa-solid fa-chevron-left mr-2"></i> 上一頁
                            </button>
                            
                            <span className="text-sm font-black text-slate-700 px-4 py-2 bg-slate-100 rounded-xl">
                                {linkPage} / {Math.max(1, totalLinkPages)}
                            </span>
                            
                            <button 
                                onClick={() => setLinkPage(p => Math.min(totalLinkPages, p + 1))} 
                                disabled={linkPage >= totalLinkPages} 
                                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition shadow-sm font-bold"
                            >
                                下一頁 <i className="fa-solid fa-chevron-right ml-2"></i>
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    </div>
  );
};

export default InfluencerDashboard;