import React, { useState } from 'react';

export default function BuyerBookingsView({ bookings, onBack }: { bookings: any[], onBack: () => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="w-full bg-[#F5F5F5] min-h-screen relative flex justify-center animate-fade-in">
      <div className="w-full max-w-md bg-white min-h-screen shadow-md flex flex-col">
        {/* 頂部導覽 */}
        <div className="flex items-center px-4 py-4 border-b border-slate-100 sticky top-0 bg-white z-10 gap-4">
          <button onClick={onBack} className="text-slate-500 hover:text-[#EE4D2D] transition"><i className="fa-solid fa-chevron-left text-xl"></i></button>
          <h2 className="text-lg font-black text-slate-800">預約管理</h2>
        </div>
        
        {/* 預約列表區塊 */}
        <div className="p-4 space-y-4 bg-slate-50 flex-1">
          {bookings.length === 0 ? (
            <div className="text-center text-slate-400 py-10 font-bold"><i className="fa-solid fa-calendar-xmark text-4xl mb-3 opacity-30 block"></i>目前無任何預約紀錄</div>
          ) : (
            bookings.map((b: any) => (
              <div key={b.id} className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:border-[#ffbba5] transition" onClick={() => setExpandedId(expandedId === b.id ? null : b.id)}>
                <div className="p-4 flex justify-between items-center border-b border-slate-50">
                  <div>
                    <div className="text-xs text-slate-400 font-mono mb-1">{new Date(b.start_time).toLocaleString('zh-TW')}</div>
                    <div className="font-bold text-slate-800">{b.service_name || '專屬預約服務'}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                     <span className={`text-[10px] px-2 py-0.5 rounded font-bold whitespace-nowrap ${b.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : b.status === 'CANCELLED' ? 'bg-slate-200 text-slate-500' : 'bg-orange-100 text-[#EE4D2D]'}`}>
                        {b.status === 'PENDING' ? '待確認' : b.status === 'CONFIRMED' ? '已確認' : b.status === 'COMPLETED' ? '已完成' : '已取消'}
                     </span>
                     <i className={`fa-solid fa-chevron-down text-slate-300 transition-transform ${expandedId === b.id ? 'rotate-180' : ''}`}></i>
                  </div>
                </div>
                {/* 展開詳細資訊 */}
                {expandedId === b.id && (
                  <div className="p-4 bg-slate-50/50 text-sm text-slate-600 space-y-3 animate-fade-in border-t border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold">預約單號</span>
                      <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-100 text-xs">{b.id}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold">建立時間</span>
                      <span className="font-bold text-slate-700">{b.created_at ? new Date(b.created_at).toLocaleString('zh-TW', { hour12: false }) : '無紀錄'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold">付款方式/狀態</span>
                      <span className="font-bold text-slate-700 flex items-center gap-2">
                        {b.used_voucher_id ? '票券全額折抵' : b.used_wallet_amount ? '儲值金扣抵' : b.payment_method === 'FULL' ? '線上全額付清' : b.payment_method === 'DEPOSIT' ? '已付訂金' : '現場付款'}
                        <span className={`text-[10px] px-2 py-0.5 rounded ${b.deposit_status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                           {b.deposit_status === 'PAID' ? '已付款' : '待付款'}
                        </span>
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold">服務總金額</span>
                      <span className="font-black text-[#EE4D2D] text-lg">${(b.payable_amount || 0).toLocaleString()}</span>
                    </div>
                    {b.memo && (
                      <div className="pt-3 border-t border-slate-100 mt-2">
                        <span className="text-slate-400 font-bold block mb-1">您的備註</span>
                        <p className="bg-white p-3 rounded-lg border border-slate-100 text-slate-700">{b.memo}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}