import React, { useState } from 'react';
import API from '../../api';

export default function BuyerVouchersView({ vouchers, currentUser, onBack, onRefresh }: { vouchers: any[], currentUser: any, onBack: () => void, onRefresh: () => void }) {
  const [transferModal, setTransferModal] = useState<string | null>(null);
  const [friendId, setFriendId] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const handleTransfer = async () => {
    if (!friendId.trim()) return alert('請輸入好友的會員 ID');
    if (friendId === currentUser.id) return alert('不能轉贈給自己喔！');
    
    setIsTransferring(true);
    try {
      const res = await API.transferVoucher({ voucher_id: transferModal!, from_buyer_id: currentUser.id, to_buyer_id: friendId.trim() });
      alert(res.message || '🎉 轉贈成功！');
      setTransferModal(null);
      setFriendId('');
      onRefresh(); // ★ 重新撈取資料，畫面會即時更新
    } catch (e: any) {
      alert(e.response?.data?.message || '轉贈失敗，請檢查好友 ID 是否正確。');
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="w-full bg-[#F5F5F5] min-h-screen relative flex justify-center animate-fade-in">
      
      {/* 贈送好友 Modal */}
      {transferModal && (
         <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-fade-in-up">
               <h3 className="font-black text-lg text-slate-800 mb-2">🎁 贈送票券給好友</h3>
               <p className="text-xs text-slate-500 mb-4 leading-relaxed">請輸入好友的會員 ID (可在好友的「我的帳戶」中查看)，請注意轉贈後將無法復原。</p>
               <input 
                 type="text" 
                 placeholder="請輸入好友 ID" 
                 value={friendId} 
                 onChange={e => setFriendId(e.target.value)} 
                 className="w-full h-12 border-2 border-slate-200 rounded-xl px-4 outline-none focus:border-[#EE4D2D] font-bold text-slate-700 mb-6" 
               />
               <div className="flex gap-3">
                  <button onClick={handleTransfer} disabled={isTransferring} className="flex-1 bg-[#EE4D2D] text-white font-bold py-3 rounded-xl disabled:opacity-50 shadow-md">確認送出</button>
                  <button onClick={() => setTransferModal(null)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200">取消</button>
               </div>
            </div>
         </div>
      )}

      {/* 票券列表主畫面 */}
      <div className="w-full max-w-md bg-white min-h-screen shadow-md flex flex-col">
        <div className="flex items-center px-4 py-4 border-b border-slate-100 sticky top-0 bg-white z-10 gap-4">
          <button onClick={onBack} className="text-slate-500 hover:text-[#EE4D2D] transition"><i className="fa-solid fa-chevron-left text-xl"></i></button>
          <h2 className="text-lg font-black text-slate-800">票券管理</h2>
        </div>
        
        <div className="p-4 space-y-4 bg-slate-50 flex-1">
          {vouchers.length === 0 ? (
            <div className="text-center text-slate-400 py-10 font-bold"><i className="fa-solid fa-ticket text-4xl mb-3 opacity-30 block"></i>目前無任何可用票券</div>
          ) : (
            vouchers.map((v: any) => (
              <div key={v.id} className="bg-white rounded-2xl shadow-sm border border-orange-100 overflow-hidden relative transition hover:shadow-md">
                <div className="absolute top-0 bottom-0 left-0 w-2 bg-[#EE4D2D]"></div>
                <div className="p-5 pl-6 flex justify-between items-center">
                  <div>
                    <div className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full inline-block mb-2 border border-orange-100">有效票券</div>
                    <div className="font-black text-slate-800 text-lg mb-1">{v.service_id ? '專屬服務套券' : '通用折扣票券'}</div>
                    <div className="text-xs text-slate-500 font-mono flex items-center gap-1"><i className="fa-solid fa-barcode"></i> {v.code}</div>
                    {v.expire_at && <div className="text-xs text-red-500 mt-1 font-bold">期限: {new Date(v.expire_at).toLocaleDateString()}</div>}
                  </div>
                  <div className="text-center flex flex-col items-center gap-2 shrink-0">
                    <div className="text-3xl font-black text-[#EE4D2D]">{v.remaining_count}<span className="text-sm text-slate-400 font-bold"> / {v.total_count}</span></div>
                    <button onClick={() => setTransferModal(v.id)} className="text-[11px] bg-orange-50 text-[#EE4D2D] hover:bg-[#EE4D2D] hover:text-white transition px-3 py-1.5 rounded-full font-bold border border-orange-200 flex items-center gap-1"><i className="fa-solid fa-gift"></i> 贈送朋友</button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}