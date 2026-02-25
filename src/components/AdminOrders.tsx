import React from 'react';
import { Order, User, View } from '../types';

const SELLER_ORDER_STATUS_OPTIONS = [
  { value: 'ALL', label: '全部' },
  { value: 'PENDING', label: '待付款' },
  { value: 'CONFIRMED', label: '待出貨' },
  { value: 'SHIPPED', label: '待收貨' }, 
  { value: 'COMPLETED', label: '已完成' },
  { value: 'CANCELLED', label: '取消/退款' }
];

const STATUS_FLOW = ['PENDING', 'CONFIRMED', 'SHIPPED', 'COMPLETED', 'CANCELLED'];

interface AdminOrdersProps {
  allOrders?: Order[];
  orderRange: { start: string; end: string };
  setOrderRange: (range: { start: string; end: string }) => void;
  orderStatusFilter: string;
  setOrderStatusFilter: (filter: string) => void;
  orderSearchTerm: string;
  setOrderSearchTerm: (term: string) => void;
  orderViewMode: 'CARD' | 'LIST';
  setOrderViewMode: (mode: 'CARD' | 'LIST') => void;
  setShowExportModal: (show: boolean) => void;
  filteredOrders: Order[];
  paginatedOrders: Order[];
  totalOrderPages: number;
  orderPage: number;
  setOrderPage: React.Dispatch<React.SetStateAction<number>>;
  expandedOrderId: string | null;
  setExpandedOrderId: React.Dispatch<React.SetStateAction<string | null>>;
  onMarkAsViewed?: (id: string) => void;
  allUsers?: User[];
  onNavigate: (view: View, product?: any, targetId?: string) => void;
  handleUpdateOrderStatus: (orderId: string, newStatus: Order['status']) => void;
  handleTogglePaid: (order: Order) => void;
  tempSellerNotes: Record<string, string>;
  setTempSellerNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleSaveSellerNote: (orderId: string) => void;
  localPaidIds: Set<string>;
  viewedOrderIds?: string[];
}

const AdminOrders: React.FC<AdminOrdersProps> = ({
  allOrders = [],
  orderRange, setOrderRange, orderStatusFilter, setOrderStatusFilter, orderSearchTerm,
  setOrderSearchTerm, orderViewMode, setOrderViewMode, setShowExportModal, filteredOrders,
  paginatedOrders, totalOrderPages, orderPage, setOrderPage, expandedOrderId, setExpandedOrderId,
  onMarkAsViewed, allUsers, onNavigate, handleUpdateOrderStatus, handleTogglePaid,
  tempSellerNotes, setTempSellerNotes, handleSaveSellerNote, localPaidIds, viewedOrderIds
}) => {

  // 依據目前日期區間過濾出的所有訂單，用來計算看板與角標數量
  const dateFilteredOrders = React.useMemo(() => {
    const s = orderRange.start ? new Date(orderRange.start).setHours(0,0,0,0) : 0;
    const e = orderRange.end ? new Date(orderRange.end).setHours(23,59,59,999) : Infinity;
    return allOrders.filter(o => {
      const t = new Date(o.created_at).getTime();
      return t >= s && t <= e;
    });
  }, [allOrders, orderRange]);

  const stats = React.useMemo(() => {
     const counts: Record<string, number> = { PENDING: 0, CONFIRMED: 0, SHIPPED: 0, COMPLETED: 0, CANCELLED: 0, ALL: dateFilteredOrders.length };
     dateFilteredOrders.forEach(o => {
         if (counts[o.status] !== undefined) counts[o.status]++;
     });
     return counts;
  }, [dateFilteredOrders]);
  
  const toShipCount = stats.PENDING + stats.CONFIRMED;
  const shippedCount = stats.SHIPPED + stats.COMPLETED;
  const cancelledCount = stats.CANCELLED;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 md:p-8">
       {/* ★ 新增：頂部四大數據面板 */}
       <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-slate-100 shadow-sm">
             <div className="text-2xl md:text-3xl font-black text-[#EE4D2D] mb-1">{toShipCount}</div>
             <div className="text-xs md:text-sm font-bold text-slate-500">待出貨</div>
             <div className="text-[10px] text-slate-400 mt-1">(待付款 + 待出貨)</div>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-slate-100 shadow-sm">
             <div className="text-2xl md:text-3xl font-black text-slate-700 mb-1">{shippedCount}</div>
             <div className="text-xs md:text-sm font-bold text-slate-500">已出貨</div>
             <div className="text-[10px] text-slate-400 mt-1">(待收貨 + 已完成)</div>
          </div>
          <div className="bg-slate-50 rounded-2xl p-4 flex flex-col items-center justify-center border border-slate-100 shadow-sm">
             <div className="text-2xl md:text-3xl font-black text-slate-700 mb-1">{cancelledCount}</div>
             <div className="text-xs md:text-sm font-bold text-slate-500">取消/退款</div>
             <div className="text-[10px] text-slate-400 mt-1">&nbsp;</div>
          </div>
       </div>

       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4 pb-6 border-b border-slate-100">
        <h2 className="text-xl font-bold text-slate-800 ">訂單管理系統 (銷售)</h2>
        
        <div className="flex items-center gap-2 text-sm bg-slate-50 p-2 rounded-xl w-full md:w-auto">
           <span className="text-slate-500 font-bold px-2 hidden md:inline">訂單日期:</span>
           <input type="date" value={orderRange.start || ''} onChange={e => setOrderRange({...orderRange, start: e.target.value})} className="flex-1 border border-slate-300 rounded-lg px-2 py-1 outline-none text-slate-600 font-bold" />
           <span className="text-slate-300">-</span>
           <input type="date" value={orderRange.end || ''} onChange={e => setOrderRange({...orderRange, end: e.target.value})} className="flex-1 border border-slate-300 rounded-lg px-2 py-1 outline-none text-slate-600 font-bold" />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
         <div className="w-full md:flex-1">
            <div className="md:hidden relative">
               <select value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-[#EE4D2D] appearance-none">
                 {SELLER_ORDER_STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
               </select>
               <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
            </div>
            <div className="hidden md:flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
              {SELLER_ORDER_STATUS_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setOrderStatusFilter(opt.value)} className={`relative px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition flex items-center gap-2 ${orderStatusFilter === opt.value ? 'bg-[#EE4D2D] text-white shadow-md' : 'text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200'}`}>
                  {opt.label}
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${orderStatusFilter === opt.value ? 'bg-white text-[#EE4D2D]' : 'bg-slate-200 text-slate-500'}`}>
                    {stats[opt.value] || 0}
                  </span>
                </button>
              ))}
            </div>
         </div>
         
         <div className="flex gap-2 w-full md:w-auto">
           <div className="relative flex-1 md:flex-none">
              <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-sm"></i>
              <input type="text" placeholder="搜尋..." className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#EE4D2D] w-full md:w-48 lg:w-64" value={orderSearchTerm} onChange={e => setOrderSearchTerm(e.target.value)} />
           </div>
           <div className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-lg shrink-0 mr-2">
               <button onClick={() => setOrderViewMode('CARD')} className={`p-1.5 rounded transition ${orderViewMode === 'CARD' ? 'bg-white shadow-sm text-[#EE4D2D]' : 'text-slate-400 hover:text-slate-600'}`} title="卡片顯示"><i className="fa-solid fa-border-all"></i></button>
               <button onClick={() => setOrderViewMode('LIST')} className={`p-1.5 rounded transition ${orderViewMode === 'LIST' ? 'bg-white shadow-sm text-[#EE4D2D]' : 'text-slate-400 hover:text-slate-600'}`} title="列表顯示"><i className="fa-solid fa-list"></i></button>
           </div>
           <button onClick={() => setShowExportModal(true)} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm shadow-sm flex items-center gap-2 whitespace-nowrap"><i className="fa-solid fa-file-excel"></i> <span className="hidden md:inline">匯出</span></button>
         </div>
      </div>

      <div className={orderViewMode === 'LIST' ? "hidden md:block overflow-x-auto" : "space-y-4"}>
        {filteredOrders.length === 0 ? (
          <div className="py-20 text-center text-slate-300">
            <i className="fa-regular fa-calendar-xmark text-4xl mb-4 block opacity-20"></i>
            該日期區間或狀態下無訂單資料
          </div>
        ) : orderViewMode === 'LIST' ? (
           <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
              <thead>
                 <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                    <th className="p-3 font-bold">訂單編號/時間</th>
                    <th className="p-3 font-bold">買家資訊</th>
                    <th className="p-3 font-bold text-right">訂單金額</th>
                    <th className="p-3 font-bold text-center">狀態操作</th>
                    <th className="p-3 font-bold text-center">收款狀態</th>
                 </tr>
              </thead>
              <tbody>
                 {paginatedOrders.map(o => {
                    const isPaid = (o as any).is_paid || (o.seller_note && o.seller_note.includes('[已收款]')) || localPaidIds.has(o.id);
                    return (
                    <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50 transition cursor-pointer" onClick={() => { if (onMarkAsViewed) onMarkAsViewed(o.id); setExpandedOrderId(expandedOrderId === o.id ? null : o.id); }}>
                       <td className="p-3">
                          <div className="font-mono text-slate-600 font-bold">#{o.id.slice(-6)}</div>
                          <div className="text-[10px] text-slate-400">{new Date(o.created_at).toLocaleString('zh-TW')}</div>
                       </td>
                       <td className="p-3">
                          <div className="font-bold text-slate-800">{o.receiver_name}</div>
                          <div className="text-xs text-slate-500 font-mono">{o.receiver_phone}</div>
                       </td>
                       <td className="p-3 text-right font-black text-[#EE4D2D]">
                          ${o.total_amount.toLocaleString()}
                       </td>
                       <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                          <select 
                            className={`text-xs font-bold px-3 py-1.5 rounded outline-none border-none cursor-pointer text-center ${
                              o.status === 'PENDING' ? 'bg-orange-100 text-orange-600' : 
                              o.status === 'CONFIRMED' ? 'bg-indigo-100 text-indigo-600' :
                              o.status === 'SHIPPED' ? 'bg-blue-100 text-blue-600' : 
                              o.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'
                            }`}
                            value={o.status}
                            onChange={e => handleUpdateOrderStatus(o.id, e.target.value as any)}
                          >
                            {SELLER_ORDER_STATUS_OPTIONS.filter(opt => opt.value !== 'ALL' && opt.value !== 'NEW').map(opt => {
                               const currentIdx = STATUS_FLOW.indexOf(o.status);
                               const optIdx = STATUS_FLOW.indexOf(opt.value);
                               const isDisabled = opt.value !== 'CANCELLED' && optIdx < currentIdx;
                               return ( <option key={opt.value} value={opt.value} disabled={isDisabled}>{opt.label}</option> );
                            })}
                          </select>
                       </td>
                       <td className="p-3 text-center" onClick={e => e.stopPropagation()}>
                          <label className={`flex items-center justify-center gap-1 px-2 py-1 rounded border w-fit mx-auto transition select-none ${isPaid ? 'bg-green-50 border-green-200 cursor-default' : 'bg-slate-50 border-slate-200 cursor-pointer hover:bg-slate-100'}`}>
                             <div className={`w-3 h-3 rounded border flex items-center justify-center transition ${isPaid ? 'bg-green-500 border-green-500' : 'bg-white border-slate-300'}`} onClick={() => !isPaid && handleTogglePaid(o)}>
                                {isPaid && <i className="fa-solid fa-check text-white text-[8px]"></i>}
                             </div>
                             <span className={`text-[10px] font-bold ${isPaid ? 'text-green-700' : 'text-slate-600'}`}>{isPaid ? '已收' : '標記'}</span>
                          </label>
                       </td>
                    </tr>
                    );
                 })}
              </tbody>
           </table>
        ) : (
          paginatedOrders.map(o => {
            const isPaid = (o as any).is_paid || (o.seller_note && o.seller_note.includes('[已收款]')) || localPaidIds.has(o.id);
            
            return (
            <div key={o.id} onClick={() => { if (onMarkAsViewed) onMarkAsViewed(o.id); setExpandedOrderId(expandedOrderId === o.id ? null : o.id); }} className={`p-4 md:p-5 border rounded-3xl transition shadow-sm bg-white relative overflow-hidden group cursor-pointer ${expandedOrderId === o.id ? 'border-[#EE4D2D] ring-1 ring-[#EE4D2D]' : 'border-slate-100 hover:bg-slate-50'}`}>
              {!viewedOrderIds?.includes(o.id) && (
                <div className="absolute top-0 right-0 bg-[#EE4D2D] text-white text-[10px] font-black px-3 py-1 rounded-bl-xl shadow-md z-10 animate-pulse">NEW</div>
              )}

              <div className="flex flex-col md:flex-row justify-between items-start mb-2 gap-2">
                <div className="w-full md:w-auto">

                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 shrink-0">#{o.id.slice(-6)}</span>
                    <span className="font-bold text-slate-800">{o.receiver_name}</span>
                    
                    <span className="text-[10px] text-slate-400 font-mono ml-1">
                      <i className="fa-regular fa-clock mr-1"></i>{new Date(o.created_at).toLocaleString('zh-TW')}
                    </span>
                    
                    <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            const buyer = allUsers?.find(u => u.phone === o.receiver_phone);
                            const targetId = buyer ? (buyer.shop_id || buyer.id) : o.receiver_phone;
                            onNavigate(View.CHAT, undefined, targetId); 
                        }} 
                        className="text-[#EE4D2D] text-[10px] px-2 py-0.5 rounded bg-orange-50 hover:bg-orange-100 font-bold border border-orange-100 ml-1 transition"
                    >
                        <i className="fa-regular fa-comments mr-1"></i>聯繫買家
                    </button>
                  </div>
                  
                  <div className="mt-2" onClick={e => e.stopPropagation()}>
                      <label className={`flex items-center gap-2 px-3 py-1 rounded-lg border w-fit transition select-none ${
                         isPaid 
                           ? 'bg-green-50 border-green-200 cursor-default' 
                           : 'bg-slate-50 border-slate-200 cursor-pointer hover:bg-slate-100'
                      }`}>
                         <div 
                           className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                             isPaid ? 'bg-green-500 border-green-500' : 'bg-white border-slate-300'
                           }`}
                           onClick={() => !isPaid && handleTogglePaid(o)}
                         >
                            {isPaid && <i className="fa-solid fa-check text-white text-[10px]"></i>}
                         </div>
                         <span className={`text-xs font-bold ${isPaid ? 'text-green-700' : 'text-slate-600'}`}>
                            {isPaid ? '已收到貨款' : '標記收款'}
                         </span>
                      </label>
                  </div>
                </div>
                
                <div className="w-full md:w-auto flex justify-end mt-2 md:mt-0">
                  <select 
                    className={`text-xs font-bold px-4 py-2 rounded-full outline-none border-none cursor-pointer w-full md:w-auto text-center ${
                      o.status === 'PENDING' ? 'bg-orange-100 text-orange-600' : 
                      o.status === 'CONFIRMED' ? 'bg-indigo-100 text-indigo-600' :
                      o.status === 'SHIPPED' ? 'bg-blue-100 text-blue-600' : 
                      o.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'
                    }`}
                    value={o.status}
                    onClick={e => e.stopPropagation()} 
                    onChange={e => handleUpdateOrderStatus(o.id, e.target.value as any)}
                  >
                    {SELLER_ORDER_STATUS_OPTIONS.filter(opt => opt.value !== 'ALL' && opt.value !== 'NEW').map(opt => {
                       const currentIdx = STATUS_FLOW.indexOf(o.status);
                       const optIdx = STATUS_FLOW.indexOf(opt.value);
                       const isDisabled = opt.value !== 'CANCELLED' && optIdx < currentIdx;
                       return ( <option key={opt.value} value={opt.value} disabled={isDisabled}>{opt.label}</option> );
                    })}
                  </select>
                </div>
              </div>

              <div className="space-y-1 mb-2">
                {o.items.map((it, i) => (
                  <div key={i} className="flex gap-3 mb-2 bg-slate-50 p-2 rounded-lg items-center">
                     <div className="w-10 h-10 rounded overflow-hidden shrink-0 border border-slate-200 bg-white">
                        <img src={it.images?.[0] || 'https://placehold.co/100'} className="w-full h-full object-cover" alt={it.name} />
                     </div>
                     <div className="flex-1 min-w-0">
                         <div className="text-xs font-bold text-slate-700 truncate">{it.name}</div>
                         <div className="text-[10px] text-slate-500 flex justify-between mt-1">
                            <span className="truncate pr-2">{it.selectedVariant ? `規格: ${it.selectedVariant}` : '單一規格'}</span>
                            <span className="shrink-0">x {it.qty}</span>
                         </div>
                     </div>
                  </div>
                ))}
              </div>

              <div className="text-right font-black text-[#EE4D2D] text-lg">
                  ${o.total_amount.toLocaleString()}
              </div>

              {expandedOrderId === o.id && (
                 <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-600 space-y-3 bg-slate-50/50 -mx-4 -mb-4 md:-mx-5 md:-mb-5 p-4 md:p-5 animate-fade-in" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-2"><span className="font-bold min-w-[50px] md:min-w-[70px]">電話：</span><span className="truncate">{o.receiver_phone}</span></div>
                    <div className="flex gap-2"><span className="font-bold min-w-[50px] md:min-w-[70px]">寄送：</span><span className="truncate">{o.ship_method} - {o.store_name}</span></div>
                    <div className="flex gap-2 flex-wrap">
                       <span className="font-bold min-w-[50px] md:min-w-[70px]">付款：</span>
                       <span>{o.payment_method === 'TRANSFER' ? '銀行匯款' : o.payment_method === 'COD' ? '貨到付款' : '面交/現金'} {o.payment_method === 'TRANSFER' && o.payment_note && <span className="text-[#EE4D2D] font-mono ml-2">(末五碼: {o.payment_note})</span>}</span>
                    </div>
                    
                    {o.remarks && <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100"><div className="font-bold text-yellow-700 mb-1">買家備註：</div><div className="text-yellow-900 text-xs md:text-sm">{o.remarks}</div></div>}
                    {o.answers && o.answers.length > 0 && (
                       <div className="bg-blue-50 p-3 rounded-lg border border-blue-100"><div className="font-bold text-blue-700 mb-1">問卷回答：</div><ul className="list-disc pl-4 text-blue-900 space-y-1 text-xs md:text-sm">{o.answers.map((a, idx) => <li key={idx}><span className="font-bold">{a.question}:</span> {a.answer}</li>)}</ul></div>
                    )}

                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm mt-3">
                       <div className="text-xs font-bold text-slate-500 mb-1">📝 賣家內部備註 (僅自己可見)</div>
                       <div className="flex flex-col md:flex-row gap-2">
                          <textarea 
                            className="w-full md:flex-1 border border-slate-200 rounded px-2 py-2 text-sm outline-none focus:border-[#EE4D2D] resize-none min-h-[40px]"
                            placeholder="填寫備註 (可換行)..."
                            rows={2}
                            value={tempSellerNotes[o.id] !== undefined ? tempSellerNotes[o.id] : (o.seller_note || '')}
                            onChange={e => setTempSellerNotes({...tempSellerNotes, [o.id]: e.target.value})}
                          />
                          <button onClick={() => handleSaveSellerNote(o.id)} className="w-full md:w-auto bg-slate-800 text-white px-4 py-2 rounded text-xs h-fit self-end md:self-stretch">儲存</button>
                       </div>
                    </div>
                    <div className="text-[10px] md:text-xs text-slate-400 text-right pt-2 border-t border-slate-200/50">下單時間：{new Date(o.created_at).toLocaleString()}</div>
                 </div>
              )}
              {expandedOrderId !== o.id && ( <div className="text-center text-[10px] text-slate-400 mt-2"><i className="fa-solid fa-chevron-down mr-1"></i> 點擊查看詳細資訊</div> )}
            </div>
          );
        })
        )}
      </div>
      {totalOrderPages > 1 && ( <div className="flex justify-center items-center gap-2 md:gap-4 mt-8"> <button onClick={() => setOrderPage(p => Math.max(1, p - 1))} disabled={orderPage === 1} className="px-3 md:px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50 text-xs md:text-sm"><i className="fa-solid fa-chevron-left"></i></button> <span className="text-xs md:text-sm font-bold text-slate-600">第 {orderPage}/{totalOrderPages} 頁</span> <button onClick={() => setOrderPage(p => Math.min(totalOrderPages, p + 1))} disabled={orderPage === totalOrderPages} className="px-3 md:px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50 text-xs md:text-sm"><i className="fa-solid fa-chevron-right"></i></button> </div> )}
    </div>
  );
};

export default AdminOrders;