import React from 'react';
import { Product, Order } from '../types';

const SELLER_ORDER_STATUS_OPTIONS = [
  { value: 'ALL', label: '全部' },
  { value: 'PENDING', label: '待付款' },
  { value: 'CONFIRMED', label: '待出貨' },
  { value: 'SHIPPED', label: '待收貨' }, 
  { value: 'COMPLETED', label: '已完成' },
  { value: 'CANCELLED', label: '取消/退款' }
];

interface AdminAffiliateProps {
  newLinkData: any;
  setNewLinkData: React.Dispatch<React.SetStateAction<any>>;
  myShopProducts: Product[];
  handleCreateAffiliateLink: () => void;
  selectedInfluencerId: string | null;
  setSelectedInfluencerId: React.Dispatch<React.SetStateAction<string | null>>;
  affiliatePage: number;
  setAffiliatePage: React.Dispatch<React.SetStateAction<number>>;
  affiliateTab: 'ACTIVE' | 'ENDED';
  setAffiliateTab: React.Dispatch<React.SetStateAction<'ACTIVE' | 'ENDED'>>;
  affiliateViewMode: 'CARD' | 'LIST';
  setAffiliateViewMode: React.Dispatch<React.SetStateAction<'CARD' | 'LIST'>>;
  filteredAffiliateLinks: any[];
  paginatedAffiliateLinks: any[];
  localOrders: Order[];
  handleTerminateLink: (linkId: string) => void;
  expandedLinkId: string | null;
  setExpandedLinkId: React.Dispatch<React.SetStateAction<string | null>>;
  expandedOrderPage: number;
  setExpandedOrderPage: React.Dispatch<React.SetStateAction<number>>;
  totalAffiliatePages: number;
}

const AdminAffiliate: React.FC<AdminAffiliateProps> = ({
  newLinkData, setNewLinkData, myShopProducts, handleCreateAffiliateLink,
  selectedInfluencerId, setSelectedInfluencerId, affiliatePage, setAffiliatePage,
  affiliateTab, setAffiliateTab, affiliateViewMode, setAffiliateViewMode,
  filteredAffiliateLinks, paginatedAffiliateLinks, localOrders, handleTerminateLink,
  expandedLinkId, setExpandedLinkId, expandedOrderPage, setExpandedOrderPage, totalAffiliatePages
}) => {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 md:p-8 animate-fade-in-up">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 text-[#EE4D2D] rounded-xl flex items-center justify-center text-xl shadow-inner">
                    <i className="fa-solid fa-bullhorn"></i>
                </div>
                <div>
                    <h2 className="text-xl font-black text-slate-800">網紅分潤專案管理</h2>
                    <p className="text-xs text-slate-500 mt-1">與網紅合作建立活動，系統將自動套用分潤算式與期限</p>
                </div>
            </div>
        </div>
        
        <div className="bg-orange-50/50 border border-orange-100 p-4 md:p-6 rounded-2xl space-y-4 mb-8">
            <h3 className="text-sm font-black text-[#EE4D2D] border-b border-orange-200 pb-2 mb-4"><i className="fa-solid fa-plus-circle mr-1"></i>建立新分潤活動</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">網紅註冊帳號 (需請網紅提供)</label>
                    <input type="text" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm bg-white" value={newLinkData.influencer_account} onChange={e => setNewLinkData({...newLinkData, influencer_account: e.target.value})} placeholder="例如：danny_kol" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">自訂專屬追蹤代碼 (網址參數)</label>
                    <input type="text" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm bg-white" value={newLinkData.code} onChange={e => setNewLinkData({...newLinkData, code: e.target.value})} placeholder="例如：danny2026" />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">活動開始日期</label>
                    <input type="date" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm bg-white font-bold text-slate-700" value={newLinkData.start_date} onChange={e => setNewLinkData({...newLinkData, start_date: e.target.value})} />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">活動結束日期</label>
                    <input type="date" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm bg-white font-bold text-slate-700" value={newLinkData.end_date} onChange={e => setNewLinkData({...newLinkData, end_date: e.target.value})} />
                </div>
            </div>
            <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">選擇主打商品</label>
                <select className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm bg-white" value={newLinkData.product_id} onChange={e => setNewLinkData({...newLinkData, product_id: e.target.value})}>
                    <option value="">-- 請選擇商品 --</option>
                    {myShopProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">主打商品分潤 (%)</label>
                    <input type="number" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm bg-white" value={newLinkData.primary_rate} onChange={e => setNewLinkData({...newLinkData, primary_rate: Number(e.target.value)})} />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">全店其他分潤 (%)</label>
                    <input type="number" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm bg-white" value={newLinkData.secondary_rate} onChange={e => setNewLinkData({...newLinkData, secondary_rate: Number(e.target.value)})} />
                </div>
            </div>
            <button onClick={handleCreateAffiliateLink} className="w-full py-3 bg-[#EE4D2D] text-white rounded-xl font-bold hover:bg-[#d73211] transition shadow-md flex justify-center items-center gap-2 mt-2">
                <i className="fa-solid fa-link"></i> 驗證網紅身分並建立專案
            </button>
        </div>

        {selectedInfluencerId && (
           <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-slate-800 text-white p-3 rounded-xl mb-4 shadow-md gap-3">
              <div className="text-sm font-bold flex items-center gap-2">
                  <i className="fa-solid fa-filter text-orange-400"></i>
                  正在查看特定網紅的合作歷史
              </div>
              <button onClick={() => { setSelectedInfluencerId(null); setAffiliatePage(1); }} className="w-full md:w-auto text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition font-bold">
                  清除篩選 (查看全部)
              </button>
           </div>
        )}

        <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-2">
            <div className="flex gap-2">
                <button 
                    onClick={() => { setAffiliateTab('ACTIVE'); setAffiliatePage(1); }} 
                    className={`px-4 py-2 font-black text-sm rounded-t-lg transition ${affiliateTab === 'ACTIVE' ? 'text-[#EE4D2D] border-b-2 border-[#EE4D2D]' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    進行中的活動
                </button>
                <button 
                    onClick={() => { setAffiliateTab('ENDED'); setAffiliatePage(1); }} 
                    className={`px-4 py-2 font-black text-sm rounded-t-lg transition ${affiliateTab === 'ENDED' ? 'text-slate-800 border-b-2 border-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    已結束的活動
                </button>
            </div>
            <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                <button onClick={() => setAffiliateViewMode('CARD')} className={`p-1.5 rounded transition ${affiliateViewMode === 'CARD' ? 'bg-white shadow-sm text-[#EE4D2D]' : 'text-slate-400 hover:text-slate-600'}`} title="卡片顯示"><i className="fa-solid fa-border-all"></i></button>
                <button onClick={() => setAffiliateViewMode('LIST')} className={`p-1.5 rounded transition ${affiliateViewMode === 'LIST' ? 'bg-white shadow-sm text-[#EE4D2D]' : 'text-slate-400 hover:text-slate-600'}`} title="列表顯示"><i className="fa-solid fa-list"></i></button>
            </div>
        </div>

        {filteredAffiliateLinks.length > 0 ? (
            <>
                <div className={affiliateViewMode === 'LIST' ? "w-full overflow-x-auto bg-white rounded-xl border border-slate-100" : "space-y-4"}>
                    {affiliateViewMode === 'LIST' ? (
                        <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
                            <thead>
                                <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                                    <th className="p-3 font-bold">網紅名稱</th>
                                    <th className="p-3 font-bold">活動期間</th>
                                    <th className="p-3 font-bold">專屬代碼</th>
                                    <th className="p-3 font-bold text-right">專案業績</th>
                                    <th className="p-3 font-bold text-right">預估/確認分潤</th>
                                    <th className="p-3 font-bold text-center">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedAffiliateLinks.map(link => {
                                    const linkOrders = localOrders.filter(o => o.affiliate_info?.code === link.code && o.status !== 'CANCELLED');
                                    let totalSales = 0; let estimatedCommission = 0; let confirmedCommission = 0; 
                                    linkOrders.forEach(o => {
                                        totalSales += o.total_amount;
                                        const comm = o.affiliate_info?.total_commission || 0;
                                        if (o.status === 'COMPLETED') confirmedCommission += comm;
                                        else estimatedCommission += comm;
                                    });
                                    return (
                                        <tr key={link.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                                            <td className="p-3 font-bold text-slate-800">
                                                <button onClick={() => { setSelectedInfluencerId(link.influencer_id); setAffiliatePage(1); }} className="hover:text-[#EE4D2D] flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-orange-100 text-[#EE4D2D] flex items-center justify-center text-[10px]"><i className="fa-solid fa-user"></i></div>
                                                    {link.influencer_name}
                                                </button>
                                            </td>
                                            <td className="p-3 text-slate-600">{link.start_date} ~ {link.end_date}</td>
                                            <td className="p-3"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded font-mono text-xs">{link.code}</span></td>
                                            <td className="p-3 text-right font-black text-slate-700">${totalSales.toLocaleString()}</td>
                                            <td className="p-3 text-right">
                                                <div className="text-orange-500 font-bold">${estimatedCommission.toLocaleString()}</div>
                                                <div className="text-green-600 font-bold text-xs">${confirmedCommission.toLocaleString()}</div>
                                            </td>
                                            <td className="p-3 text-center">
                                                {affiliateTab === 'ACTIVE' && (
                                                    <button onClick={() => handleTerminateLink(link.id)} className="bg-slate-800 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-slate-700">提前結束</button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        paginatedAffiliateLinks.map(link => {
                            const shareUrl = `${window.location.origin}/#/PRODUCT/${link.product_id}?ref=${link.code}`;
                            const linkOrders = localOrders
                                .filter(o => o.affiliate_info?.code === link.code && o.status !== 'CANCELLED')
                                .sort((a, b) => {
                                    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
                                    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
                                    return timeB - timeA;
                                });
                                
                            let totalSales = 0; let estimatedCommission = 0; let confirmedCommission = 0; 
                            linkOrders.forEach(o => {
                                totalSales += o.total_amount;
                                const comm = o.affiliate_info?.total_commission || 0;
                                if (o.status === 'COMPLETED') confirmedCommission += comm;
                                else estimatedCommission += comm;
                            });

                            return (
                                <div key={link.id} className={`bg-white border-2 p-4 md:p-5 rounded-2xl shadow-sm transition relative overflow-hidden ${affiliateTab === 'ENDED' ? 'border-slate-200 opacity-80' : 'border-slate-100 hover:border-orange-200'}`}>
                                    {affiliateTab === 'ENDED' && <div className="absolute top-4 right-4 text-xs font-black bg-slate-200 text-slate-500 px-2 py-1 rounded">已結束</div>}
                                    
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 border-b border-slate-50 pb-3 gap-2">
                                        <button 
                                            onClick={() => { setSelectedInfluencerId(link.influencer_id); setAffiliatePage(1); }}
                                            className="font-black text-slate-800 text-base flex items-center gap-2 hover:text-[#EE4D2D] transition group text-left"
                                            title="點擊查看此網紅所有合作紀錄"
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${affiliateTab === 'ENDED' ? 'bg-slate-100 text-slate-400' : 'bg-orange-100 text-[#EE4D2D]'}`}><i className="fa-solid fa-user-check"></i></div>
                                            <span className="truncate">{link.influencer_name}</span>
                                            <i className="fa-solid fa-magnifying-glass text-[10px] text-slate-300 opacity-0 group-hover:opacity-100"></i>
                                        </button>
                                        <div className="flex flex-col items-start md:items-end gap-1 w-full md:w-auto mt-2 md:mt-0">
                                            <div className="text-[10px] text-slate-400 font-mono"><i className="fa-regular fa-clock"></i> 建立於: {new Date(link.created_at).toLocaleDateString()}</div>
                                            <div className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg shrink-0 flex items-center gap-1 border border-slate-200 w-full md:w-auto justify-center">
                                                <i className="fa-regular fa-calendar"></i> 活動期間: {link.start_date} ~ {link.end_date}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex gap-2 mb-4 bg-slate-50 p-3 md:p-4 rounded-xl border border-slate-100">
                                        <div className="flex-1 text-center border-r border-slate-200">
                                            <div className="text-[10px] md:text-xs text-slate-500 font-bold mb-1">專案業績</div>
                                            <div className="text-lg md:text-xl font-black text-slate-700">${totalSales.toLocaleString()}</div>
                                        </div>
                                        <div className="flex-1 text-center border-r border-slate-200">
                                            <div className="text-[10px] md:text-xs text-slate-500 font-bold mb-1">目前預計分潤</div>
                                            <div className="text-lg md:text-xl font-black text-orange-500">${estimatedCommission.toLocaleString()}</div>
                                        </div>
                                        <div className="flex-1 text-center border-r border-slate-200">
                                            <div className="text-[10px] md:text-xs text-slate-500 font-bold mb-1">確定總分潤</div>
                                            <div className="text-lg md:text-xl font-black text-green-600">${confirmedCommission.toLocaleString()}</div>
                                        </div>
                                        <div className="flex-1 text-center">
                                            <div className="text-[10px] md:text-xs text-slate-500 font-bold mb-1">成單數</div>
                                            <div className="text-lg md:text-xl font-black text-slate-700">{linkOrders.length} <span className="text-[10px] md:text-xs font-normal text-slate-400">筆</span></div>
                                        </div>
                                    </div>

                                    <div className="text-[11px] text-slate-500 mb-3 flex flex-wrap items-center gap-2">
                                        <span className="bg-white px-2 py-1 rounded font-bold border border-slate-200 shadow-sm">主打: {link.primary_rate}%</span>
                                        <span className="bg-white px-2 py-1 rounded font-bold border border-slate-200 shadow-sm">其他: {link.secondary_rate}%</span>
                                        <span className="bg-red-50 text-red-600 px-2 py-1 rounded font-black border border-red-100 shadow-sm">網址代碼: {link.code}</span>
                                        
                                        {affiliateTab === 'ACTIVE' && (
                                            <button onClick={() => handleTerminateLink(link.id)} className="ml-auto text-[10px] bg-slate-800 text-white px-3 py-1 rounded hover:bg-slate-700 font-bold shadow-sm">
                                                提前結束專案
                                            </button>
                                        )}
                                    </div>

                                    {affiliateTab === 'ACTIVE' && (
                                        <div className="flex flex-col md:flex-row gap-2 items-center mt-2 mb-4">
                                            <input type="text" readOnly value={shareUrl} className="w-full md:flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-500 outline-none truncate font-mono shadow-inner" />
                                            <button onClick={() => { navigator.clipboard.writeText(shareUrl); alert('連結已複製！'); }} className="w-full md:w-auto px-4 py-2 bg-[#EE4D2D] text-white text-xs font-bold rounded-lg hover:bg-[#d73211] shrink-0 transition flex justify-center items-center gap-2 shadow-sm">
                                                <i className="fa-regular fa-copy"></i> 複製專屬連結
                                            </button>
                                        </div>
                                    )}

                                    <div className="mt-4 pt-3 border-t border-slate-100">
                                        <button onClick={() => { setExpandedLinkId(expandedLinkId === link.id ? null : link.id); setExpandedOrderPage(1); }} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 w-full justify-center bg-blue-50 py-2 rounded-lg transition border border-blue-100">
                                            <i className={`fa-solid fa-chevron-${expandedLinkId === link.id ? 'up' : 'down'}`}></i> {expandedLinkId === link.id ? '收起訂單明細' : '展開訂單與算式明細'}
                                        </button>

                                        {expandedLinkId === link.id && (
                                            <div className="mt-3 animate-fade-in-up flex flex-col">
                                                {(() => {
                                                    const totalOrderPages = Math.ceil(linkOrders.length / 8);
                                                    const paginatedLinkOrders = linkOrders.slice((expandedOrderPage - 1) * 8, expandedOrderPage * 8);

                                                    if (linkOrders.length === 0) return <div className="text-center text-xs text-slate-400 py-4">目前尚無訂單</div>;

                                                    return (
                                                        <>
                                                            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                                                {paginatedLinkOrders.map(o => {
                                                                    const statusLabel = SELLER_ORDER_STATUS_OPTIONS.find(opt => opt.value === o.status)?.label || o.status;
                                                                    return (
                                                                    <div key={o.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2 hover:border-orange-200 transition shrink-0">
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
                                                                                            <span>${dt.price}</span><span className="text-[10px]">x</span>
                                                                                            <span>{dt.qty}件</span><span className="text-[10px]">x</span>
                                                                                            <span className="text-blue-500 font-bold">{dt.rate}%</span><span className="text-[10px]">=</span>
                                                                                            <span className={`font-black ${dt.commission > 0 ? 'text-slate-800' : 'text-slate-400'}`}>${dt.commission}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                ))
                                                                            ) : <div className="text-[10px] text-slate-400 italic">此為舊版訂單，無保存詳細算式</div>}
                                                                        </div>
                                                                    </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            {totalOrderPages > 1 && (
                                                                <div className="flex justify-center items-center gap-2 md:gap-4 mt-4 pt-4 border-t border-slate-100 bg-white sticky bottom-0 z-10 py-2">
                                                                    <button onClick={(e) => { e.stopPropagation(); setExpandedOrderPage(p => Math.max(1, p - 1)); }} disabled={expandedOrderPage === 1} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-100 text-xs shadow-sm"><i className="fa-solid fa-chevron-left"></i> 上一頁</button>
                                                                    <span className="text-xs font-bold text-slate-600">第 {expandedOrderPage} / {totalOrderPages} 頁</span>
                                                                    <button onClick={(e) => { e.stopPropagation(); setExpandedOrderPage(p => Math.min(totalOrderPages, p + 1)); }} disabled={expandedOrderPage === totalOrderPages} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-100 text-xs shadow-sm">下一頁 <i className="fa-solid fa-chevron-right"></i></button>
                                                                </div>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="flex justify-center items-center gap-2 md:gap-4 mt-8 pt-6 border-t border-slate-100">
                    <button onClick={() => setAffiliatePage(p => Math.max(1, p - 1))} disabled={affiliatePage === 1} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition shadow-sm font-bold"><i className="fa-solid fa-chevron-left mr-2"></i> 上一頁</button>
                    <span className="text-sm font-black text-slate-700 px-4 py-2 bg-slate-100 rounded-xl">{affiliatePage} / {Math.max(1, totalAffiliatePages)}</span>
                    <button onClick={() => setAffiliatePage(p => Math.min(totalAffiliatePages, p + 1))} disabled={affiliatePage >= totalAffiliatePages} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition shadow-sm font-bold">下一頁 <i className="fa-solid fa-chevron-right ml-2"></i></button>
                </div>
            </>
        ) : (
            <div className="py-20 text-center text-slate-400 font-bold">
                <i className="fa-solid fa-folder-open text-4xl mb-3 opacity-30 block"></i>
                此頁籤下目前沒有活動資料
            </div>
        )}
    </div>
  );
};

export default AdminAffiliate;