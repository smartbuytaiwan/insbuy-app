import React, { useState, useEffect } from 'react';
import { Product, StockLog, Order } from '../types';
import API from '../api';

interface RestockModalProps {
    product: Product;
    allOrders: Order[]; // 傳入所有訂單以顯示取消的訂單卡片
    onClose: () => void;
    onUpdateProduct: (updatedProduct: Product) => void;
}

const RestockModal: React.FC<RestockModalProps> = ({ product, allOrders, onClose, onUpdateProduct }) => {
    // 儲存每個規格的調整狀態：{ 索引: { 類型, 數量 } }
    const [adjustments, setAdjustments] = useState<Record<number, { type: 'ADD' | 'MINUS', amount: string }>>({});
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showLogs, setShowLogs] = useState(false);

    useEffect(() => {
        const initialAdj: any = {};
        product.variants.forEach((_, idx) => {
            initialAdj[idx] = { type: 'ADD', amount: '' };
        });
        setAdjustments(initialAdj);
    }, [product]);

    const handleAmountChange = (idx: number, field: 'type' | 'amount', val: any) => {
        setAdjustments(prev => ({ ...prev, [idx]: { ...prev[idx], [field]: val } }));
    };

    const handleSubmit = async () => {
        let hasChanges = false;
        const newLogs: StockLog[] = [];
        const updatedVariants = [...product.variants];

        for (let i = 0; i < product.variants.length; i++) {
            const adj = adjustments[i];
            if (adj.amount && Number(adj.amount) > 0) {
                hasChanges = true;
                const amount = Number(adj.amount);
                const actualChange = adj.type === 'ADD' ? amount : -amount;
                
                if (adj.type === 'MINUS' && updatedVariants[i].stock < amount) {
                    return alert(`「${updatedVariants[i].name}」的庫存不足以扣除！目前僅剩 ${updatedVariants[i].stock} 件`);
                }

                updatedVariants[i] = { ...updatedVariants[i], stock: updatedVariants[i].stock + actualChange };
                
                newLogs.push({
                    id: `log-${Date.now()}-${i}`,
                    variant_name: updatedVariants[i].name,
                    change_amount: actualChange,
                    reason: reason.trim() || '日常盤點調整',
                    created_at: new Date().toISOString()
                });
            }
        }

        if (!hasChanges) return alert('請至少輸入一項大於 0 的調整數量！');
        if (!reason.trim()) return alert('請填寫異動原因！');

        setIsSubmitting(true);
        try {
            const newTotalStock = updatedVariants.reduce((sum, v) => sum + v.stock, 0);
            const updatedProduct: Product = {
                ...product,
                variants: updatedVariants,
                total_stock: newTotalStock,
                stock_logs: [...newLogs, ...(product.stock_logs || [])]
            };

            await API.updateProduct(updatedProduct);
            onUpdateProduct(updatedProduct);
            alert('庫存批次異動成功！');
            onClose();
        } catch (error) {
            console.error('Update stock error:', error);
            alert('更新失敗，請檢查網路連線');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="bg-[#EE4D2D] p-5 flex justify-between items-center text-white rounded-t-3xl shrink-0">
                    <h3 className="font-black text-lg"><i className="fa-solid fa-boxes-stacked mr-2"></i>庫存盤點與補貨 (批次調整)</h3>
                    <button onClick={onClose} className="hover:text-red-200 transition"><i className="fa-solid fa-xmark text-xl"></i></button>
                </div>
                
                <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                    <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <img src={product.images[0] || 'https://placehold.co/100'} className="w-12 h-12 rounded-lg object-cover border shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-slate-800 text-sm truncate">{product.name}</div>
                            <div className="text-xs text-slate-500 mt-1">目前總庫存: <span className="font-black text-slate-700">{product.total_stock}</span> 件</div>
                        </div>
                        <button onClick={() => setShowLogs(!showLogs)} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition shrink-0 ${showLogs ? 'bg-[#EE4D2D] text-white border-[#EE4D2D]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>
                            <i className="fa-solid fa-clock-rotate-left mr-1"></i>歷史紀錄
                        </button>
                    </div>

                    {showLogs ? (
                        <div className="space-y-3 animate-fade-in">
                            <h4 className="font-bold text-slate-700 text-sm border-b pb-2">庫存異動紀錄</h4>
                            {(!product.stock_logs || product.stock_logs.length === 0) ? (
                                <div className="text-center text-slate-400 py-6 text-sm font-bold bg-slate-50 rounded-xl border border-dashed border-slate-200">尚無異動紀錄</div>
                            ) : (
                                <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                                    {product.stock_logs.map(log => {
                                        const canceledOrder = log.order_id ? allOrders.find(o => o.id === log.order_id) : null;
                                        return (
                                            <div key={log.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm text-sm">
                                                <div className="flex justify-between items-start mb-2 gap-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs w-fit">{log.variant_name}</span>
                                                        <span className="text-[10px] text-slate-400 font-mono">{new Date(log.created_at).toLocaleString('zh-TW')}</span>
                                                    </div>
                                                    {/* 取消 absolute 定位，改為 flex 佈局，避免卡到文字 */}
                                                    <div className={`font-black text-xl shrink-0 mt-1 ${log.change_amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                                        {log.change_amount > 0 ? '+' : ''}{log.change_amount}
                                                    </div>
                                                </div>
                                                <div className="text-slate-600 font-bold border-t border-slate-50 pt-2">{log.reason}</div>
                                                
                                                {/* 若是因為訂單取消而自動加回的紀錄，顯示訂單卡片 */}
                                                {canceledOrder && (
                                                    <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-lg">
                                                        <div className="text-[10px] font-black text-red-500 mb-1 flex items-center gap-1"><i className="fa-solid fa-ban"></i> 關聯之取消訂單</div>
                                                        <div className="text-xs text-red-900 font-mono">#{canceledOrder.id}</div>
                                                        <div className="flex justify-between mt-1 text-xs text-red-800">
                                                            <span>買家: {canceledOrder.receiver_name}</span>
                                                            <span className="font-bold">金額: ${canceledOrder.total_amount.toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-5 animate-fade-in">
                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-2">1. 批次調整規格數量 (留空代表不異動)</label>
                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                    {product.variants.map((v, idx) => (
                                        <div key={idx} className="flex flex-wrap md:flex-nowrap items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                                            <div className="w-full md:w-2/5 flex flex-col">
                                                <span className="text-sm font-bold text-slate-700 truncate" title={v.name}>{v.name}</span>
                                                <span className="text-[10px] text-slate-400">目前庫存: {v.stock}</span>
                                            </div>
                                            <div className="w-full md:flex-1 flex items-center gap-2">
                                                <select 
                                                    className="h-10 border border-slate-200 rounded-lg px-2 outline-none focus:border-[#EE4D2D] bg-white cursor-pointer font-bold text-slate-700 text-xs shrink-0"
                                                    value={adjustments[idx]?.type || 'ADD'}
                                                    onChange={(e) => handleAmountChange(idx, 'type', e.target.value)}
                                                >
                                                    <option value="ADD">➕ 增加</option>
                                                    <option value="MINUS">➖ 減少</option>
                                                </select>
                                                <input 
                                                    type="number" 
                                                    className="h-10 flex-1 border border-slate-200 rounded-lg px-3 outline-none focus:border-[#EE4D2D] font-black text-slate-700 placeholder:text-slate-300"
                                                    placeholder="輸入數量"
                                                    value={adjustments[idx]?.amount || ''}
                                                    onChange={(e) => handleAmountChange(idx, 'amount', e.target.value === '' ? '' : Math.abs(Number(e.target.value)))}
                                                    min="1"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-2">2. 異動原因 (必填，寫入後不可修改)</label>
                                <textarea 
                                    className="w-full h-20 border border-slate-200 rounded-xl p-3 outline-none focus:border-[#EE4D2D] text-sm resize-none bg-yellow-50/30"
                                    placeholder="例如：廠商進貨 50 件、瑕疵報廢 2 件、月底盤點誤差..."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                ></textarea>
                            </div>

                            <button onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-[#EE4D2D] text-white py-3.5 rounded-xl font-black shadow-md hover:bg-[#d73211] transition active:scale-95 disabled:opacity-50">
                                {isSubmitting ? '處理中...' : '確認批次儲存異動'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RestockModal;