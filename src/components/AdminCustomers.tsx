import React from 'react';
import { View } from '../types';

interface AdminCustomersProps {
  customerRange: { start: string; end: string };
  setCustomerRange: (range: { start: string; end: string }) => void;
  customerPage: number;
  setCustomerPage: React.Dispatch<React.SetStateAction<number>>;
  expandedCustomerId: string | null;
  setExpandedCustomerId: React.Dispatch<React.SetStateAction<string | null>>;
  customerSearchTerm: string;
  setCustomerSearchTerm: (term: string) => void;
  customerSortBy: 'SPENT_DESC' | 'ORDERS_DESC';
  setCustomerSortBy: (sort: 'SPENT_DESC' | 'ORDERS_DESC') => void;
  customerData: any[];
  paginatedCustomers: any[];
  totalCustomerPages: number;
  customerDetailTab: 'ORDERS' | 'ITEMS';
  setCustomerDetailTab: (tab: 'ORDERS' | 'ITEMS') => void;
  handleBlacklist: (targetUserId: string, targetName: string, isCurrentlyBlacklisted: boolean) => void;
  onNavigate: (view: View, product?: any, targetId?: string) => void;
}

const AdminCustomers: React.FC<AdminCustomersProps> = ({
  customerRange, setCustomerRange, customerPage, setCustomerPage, expandedCustomerId, setExpandedCustomerId,
  customerSearchTerm, setCustomerSearchTerm, customerSortBy, setCustomerSortBy, customerData,
  paginatedCustomers, totalCustomerPages, customerDetailTab, setCustomerDetailTab, handleBlacklist, onNavigate
}) => {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 md:p-8 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4 pb-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-slate-800  flex items-center gap-2"><i className="fa-solid fa-users text-[#EE4D2D]"></i> 客戶管理系統</h2>
        
        <div className="flex flex-col md:flex-row items-start md:items-center gap-2 text-sm bg-slate-50 p-2 rounded-xl w-full md:w-auto">
           <span className="text-slate-500 font-bold px-2 hidden md:inline">消費日期:</span>
           <div className="flex w-full md:w-auto gap-2">
               <input type="date" value={customerRange.start} onChange={e => {setCustomerRange({...customerRange, start: e.target.value}); setCustomerPage(1); setExpandedCustomerId(null);}} className="flex-1 border border-slate-300 rounded-lg px-2 py-1 outline-none text-slate-600 font-bold min-w-[110px]" />
               <span className="text-slate-300 self-center">-</span>
               <input type="date" value={customerRange.end} onChange={e => {setCustomerRange({...customerRange, end: e.target.value}); setCustomerPage(1); setExpandedCustomerId(null);}} className="flex-1 border border-slate-300 rounded-lg px-2 py-1 outline-none text-slate-600 font-bold min-w-[110px]" />
           </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
         <div className="relative flex-1">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-sm"></i>
            <input type="text" placeholder="搜尋客戶姓名或電話..." className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#EE4D2D] w-full" value={customerSearchTerm} onChange={e => {setCustomerSearchTerm(e.target.value); setCustomerPage(1); setExpandedCustomerId(null);}} />
         </div>
         <div className="w-full md:w-auto shrink-0 relative">
            <select 
               className="w-full md:w-auto border border-slate-200 rounded-lg pl-4 pr-8 py-2 text-sm font-bold text-slate-600 outline-none focus:border-[#EE4D2D] appearance-none bg-white cursor-pointer"
               value={customerSortBy}
               onChange={e => {setCustomerSortBy(e.target.value as any); setCustomerPage(1); setExpandedCustomerId(null);}}
            >
               <option value="SPENT_DESC">排序：消費總額 (高至低)</option>
               <option value="ORDERS_DESC">排序：訂單數量 (多至少)</option>
            </select>
            <i className="fa-solid fa-sort absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
         </div>
      </div>

      <div className="space-y-4">
        {customerData.length === 0 ? (
          <div className="py-20 text-center text-slate-300">
            <i className="fa-solid fa-user-slash text-4xl mb-4 block opacity-20"></i>
            該日期區間無客戶資料
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {paginatedCustomers.map((c, i) => (
              <div key={i} className="p-4 md:p-5 border border-slate-100 rounded-2xl transition shadow-sm bg-white hover:border-[#EE4D2D] flex flex-col gap-4">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
                    <div className="flex-1 min-w-0 flex items-start gap-4 w-full">
                       <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold text-lg shrink-0">
                          {c.name.charAt(0)}
                       </div>
                       <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                             <span className="font-bold text-slate-800 text-lg truncate">{c.name}</span>
                             <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-mono">{c.phone}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600 mt-2">
                             <button 
                                onClick={() => { setExpandedCustomerId(expandedCustomerId === c.phone && customerDetailTab === 'ORDERS' ? null : c.phone); setCustomerDetailTab('ORDERS'); }} 
                                className={`flex items-center gap-1 transition px-2 py-1 rounded-md border ${expandedCustomerId === c.phone && customerDetailTab === 'ORDERS' ? 'bg-orange-50 border-orange-200 text-[#EE4D2D]' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                             >
                                <i className="fa-solid fa-receipt text-slate-400"></i> {c.totalOrders} 筆訂單 <i className="fa-solid fa-chevron-down text-[10px] ml-1"></i>
                             </button>
                             <button 
                                onClick={() => { setExpandedCustomerId(expandedCustomerId === c.phone && customerDetailTab === 'ITEMS' ? null : c.phone); setCustomerDetailTab('ITEMS'); }} 
                                className={`flex items-center gap-1 transition px-2 py-1 rounded-md border ${expandedCustomerId === c.phone && customerDetailTab === 'ITEMS' ? 'bg-orange-50 border-orange-200 text-[#EE4D2D]' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                             >
                                <i className="fa-solid fa-box-open text-slate-400"></i> {c.totalItems} 件商品 <i className="fa-solid fa-chevron-down text-[10px] ml-1"></i>
                             </button>
                             <span className="flex items-center gap-1 text-[11px] text-slate-400"><i className="fa-regular fa-calendar text-slate-300"></i> 最後購買: {new Date(c.lastOrderDate).toLocaleDateString()}</span>
                          </div>
                       </div>
                    </div>
                    
                    {/* ★ 修正 5：將右側區塊改為獨立行，並且強制換行與不壓縮按鈕 */}
                    <div className="flex flex-col items-start md:items-end justify-between w-full md:w-auto gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 mt-1 md:mt-0 shrink-0">
                           <div className="flex justify-between items-center w-full md:w-auto md:text-right">
                               <div className="md:hidden">
                                   <div className="text-[10px] text-slate-400 font-bold">區間消費總額</div>
                                   <div className="text-lg md:text-xl font-black text-[#EE4D2D]">${c.totalSpent.toLocaleString()}</div>
                               </div>
                               <div className="hidden md:block">
                                   <div className="text-[10px] text-slate-400 font-bold">區間消費總額</div>
                                   <div className="text-lg md:text-xl font-black text-[#EE4D2D]">${c.totalSpent.toLocaleString()}</div>
                               </div>
                           </div>
                           
                           <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                               <button 
                                  onClick={() => handleBlacklist(c.targetId, c.name, c.isBlacklisted)} 
                                  className={`flex-1 md:flex-none whitespace-nowrap px-4 py-2 rounded-xl font-bold text-sm transition-colors flex justify-center items-center gap-2 ${c.isBlacklisted ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200'}`}
                                  title={c.isBlacklisted ? "點擊解除黑名單" : "將此買家加入黑名單"}
                               >
                                  <i className={`fa-solid ${c.isBlacklisted ? 'fa-user-check' : 'fa-user-slash'}`}></i> 
                                  {c.isBlacklisted ? '已封鎖' : '黑名單'}
                               </button>

                               <button 
                                  onClick={() => onNavigate(View.CHAT, undefined, c.targetId)} 
                                  className="flex-1 md:flex-none whitespace-nowrap bg-orange-50 text-[#EE4D2D] hover:bg-[#EE4D2D] hover:text-white border border-orange-100 px-4 py-2 rounded-xl font-bold text-sm transition-colors flex justify-center items-center gap-2"
                               >
                                  <i className="fa-regular fa-comments"></i> 愛聊
                               </button>
                           </div>
                        </div>
                </div>

                {expandedCustomerId === c.phone && (
                  <div className="mt-2 pt-4 border-t border-slate-100 bg-slate-50/50 rounded-xl p-3 md:p-4 animate-fade-in w-full">
                     <div className="flex gap-4 mb-4 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
                        <button onClick={() => setCustomerDetailTab('ORDERS')} className={`font-bold text-sm px-2 py-1 whitespace-nowrap transition-colors ${customerDetailTab === 'ORDERS' ? 'text-[#EE4D2D] border-b-2 border-[#EE4D2D]' : 'text-slate-500 hover:text-slate-700'}`}>訂單紀錄 ({c.orders.length})</button>
                        <button onClick={() => setCustomerDetailTab('ITEMS')} className={`font-bold text-sm px-2 py-1 whitespace-nowrap transition-colors ${customerDetailTab === 'ITEMS' ? 'text-[#EE4D2D] border-b-2 border-[#EE4D2D]' : 'text-slate-500 hover:text-slate-700'}`}>購買商品統計 ({Object.keys(c.itemsSummary).length})</button>
                     </div>

                     {customerDetailTab === 'ORDERS' && (
                        <div className="space-y-3">
                           {c.orders.map((o: any) => (
                              <div key={o.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 hover:border-[#EE4D2D] transition cursor-pointer">
                                  <div className="flex flex-row justify-between items-start md:items-center border-b border-slate-100 pb-3 gap-2">
                                      <div className="flex flex-wrap items-center gap-2">
                                         <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold">#{o.id.slice(-6)}</span>
                                         <span className="text-xs text-slate-400"><i className="fa-regular fa-clock mr-1"></i>{new Date(o.created_at).toLocaleString()}</span>
                                      </div>
                                      <div className="flex items-center gap-3 shrink-0">
                                         <div className={`text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap ${o.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : o.status === 'CANCELLED' ? 'bg-slate-200 text-slate-500' : 'bg-orange-100 text-orange-500'}`}>{o.status}</div>
                                         <div className="text-sm font-black text-[#EE4D2D] whitespace-nowrap">${o.total_amount.toLocaleString()}</div>
                                      </div>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                      {o.items.map((it: any, idx: number) => (
                                          <div key={idx} className="flex justify-between items-start bg-slate-50 hover:bg-slate-100 transition p-2.5 rounded-lg border border-slate-100/50">
                                              <div className="flex-1 min-w-0 pr-3">
                                                  <div className="text-sm font-bold text-slate-700 truncate">{it.name}</div>
                                                  {it.selectedVariant && <div className="text-[11px] text-slate-500 mt-0.5">規格: {it.selectedVariant}</div>}
                                              </div>
                                              <div className="text-right shrink-0 flex flex-col items-end justify-center">
                                                  <span className="text-sm font-black text-slate-700">x {it.qty}</span>
                                                  <span className="text-[11px] text-slate-400 mt-0.5 font-bold">${(it.finalPrice || it.price).toLocaleString()}</span>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                           ))}
                        </div>
                     )}

                     {customerDetailTab === 'ITEMS' && (
                        <div className="space-y-3">
                           {Object.values(c.itemsSummary).map((item: any, idx) => (
                              <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3 hover:bg-slate-50 transition">
                                  <div className="w-12 h-12 rounded bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                                      <img src={item.image} className="w-full h-full object-cover" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <div className="text-sm font-bold text-slate-700 truncate">{item.name}</div>
                                      <div className="text-xs text-slate-500 mt-0.5">{item.variant ? `規格: ${item.variant}` : '單一規格'}</div>
                                  </div>
                                  <div className="text-right shrink-0">
                                      <div className="text-xs text-slate-500 mb-0.5">累計 <span className="font-bold text-slate-700">{item.qty}</span> 件</div>
                                      <div className="text-sm font-black text-[#EE4D2D]">${item.totalAmount.toLocaleString()}</div>
                                  </div>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {totalCustomerPages > 1 && (
        <div className="flex justify-center items-center gap-2 md:gap-4 mt-8">
          <button onClick={() => setCustomerPage(p => Math.max(1, p - 1))} disabled={customerPage === 1} className="px-3 md:px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50 text-xs md:text-sm"><i className="fa-solid fa-chevron-left"></i></button>
          <span className="text-xs md:text-sm font-bold text-slate-600">第 {customerPage}/{totalCustomerPages} 頁</span>
          <button onClick={() => setCustomerPage(p => Math.min(totalCustomerPages, p + 1))} disabled={customerPage === totalCustomerPages} className="px-3 md:px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50 text-xs md:text-sm"><i className="fa-solid fa-chevron-right"></i></button>
        </div>
      )}
    </div>
  );
};

export default AdminCustomers;