import React from 'react';
import { Product, Order } from '../types';

interface SalesDetailModalProps {
    product: Product;
    variantName?: string; // ★ 新增：可選的規格名稱，用來顯示在標題
    buyers: { order: Order; item: any }[];
    onClose: () => void;
}

// ★ 修正：將 variantName 加入解構參數中
const SalesDetailModal: React.FC<SalesDetailModalProps> = ({ product, variantName, buyers, onClose }) => {
    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[85vh]">
                <div className="bg-[#EE4D2D] p-5 flex justify-between items-center text-white rounded-t-3xl shrink-0">
                    <h3 className="font-black text-lg flex items-center gap-2">
                        <i className="fa-solid fa-users"></i>
                        {/* ★ 動態顯示標題，若有傳入規格名稱則顯示 */}
                        銷售明細 {variantName ? ` - ${variantName}` : ''}
                    </h3>
                    <button onClick={onClose} className="hover:text-red-200 transition"><i className="fa-solid fa-xmark text-xl"></i></button>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                    <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <img src={product.images[0] || 'https://placehold.co/100'} className="w-12 h-12 rounded-lg object-cover border" />
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-slate-800 text-sm truncate">{product.name}</div>
                            <div className="text-xs text-[#EE4D2D] font-black mt-1">累積售出: {buyers.reduce((a, b) => a + b.item.qty, 0)} 件</div>
                        </div>
                    </div>

                    <h4 className="font-bold text-slate-700 text-sm border-b pb-2 mt-4">購買客單紀錄 (依時間新到舊)</h4>
                    
                    {buyers.length === 0 ? (
                        <div className="text-center text-slate-400 py-6 text-sm font-bold bg-slate-50 rounded-xl border border-dashed border-slate-200">尚無銷售紀錄</div>
                    ) : (
                        <div className="space-y-3">
                            {buyers.sort((a, b) => new Date(b.order.created_at).getTime() - new Date(a.order.created_at).getTime()).map((b, idx) => (
                                <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm hover:border-[#EE4D2D] transition relative">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-black text-xs">{b.order.receiver_name.charAt(0)}</div>
                                            <div>
                                                <div className="font-bold text-slate-700 text-sm">{b.order.receiver_name}</div>
                                                <div className="text-[10px] text-slate-400 font-mono">{b.order.receiver_phone}</div>
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-slate-400 text-right">
                                            <div>{new Date(b.order.created_at).toLocaleDateString()}</div>
                                            <div>{new Date(b.order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-2 rounded-lg flex justify-between items-center text-xs">
                                        <span className="text-slate-600 font-bold truncate pr-2">{b.item.selectedVariant || '單一規格'}</span>
                                        <span className="font-black text-[#EE4D2D] shrink-0">買了 {b.item.qty} 件</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SalesDetailModal;