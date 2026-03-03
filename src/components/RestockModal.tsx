import React, { useState, useMemo } from 'react';
import { Product, StockLog, Order } from '../types';
import API from '../api';

interface RestockModalProps {
    product: Product;
    variantIndex: number; // ★ 改為接收特定規格索引
    allOrders: Order[];
    onClose: () => void;
    onUpdateProduct: (updatedProduct: Product) => void;
}

const RestockModal: React.FC<RestockModalProps> = ({ product, variantIndex, allOrders, onClose, onUpdateProduct }) => {
    const variant = product.variants[variantIndex];
    const variantName = variant.name || '單一規格';
    
    const [type, setType] = useState<'ADD' | 'MINUS'>('ADD');
    const [amount, setAmount] = useState<string>('');
    const [unitCost, setUnitCost] = useState<string>('');
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showLogs, setShowLogs] = useState(false);

    const variantCost = variant.cost || product.average_cost || product.cost || 0;

    // ★ 過濾出專屬於此規格的歷史紀錄，並自動合併買家下單的「銷售紀錄」
    const variantLogs = useMemo(() => {
        // 1. 取得手動盤點與初始化的紀錄
        const manualLogs = product.stock_logs?.filter(log => log.variant_name === variantName) || [];
        
        // 2. 將訂單的銷售轉換為出庫紀錄
        const orderLogs: any[] = [];
        allOrders.forEach(o => {
            if (o.status !== 'CANCELLED') {
                o.items.forEach(item => {
                    const itemVariant = item.selectedVariant || '單一規格';
                    if (item.id === product.id && itemVariant === variantName) {
                        orderLogs.push({
                            id: `order-log-${o.id}-${item.id}`,
                            variant_name: variantName,
                            change_amount: -item.qty, // 銷售視為負數 (出庫)
                            reason: `商品售出 (訂單: #${o.id.slice(-6)})`,
                            created_at: o.created_at,
                            unit_cost: variantCost, // 銷售當下的成本認列
                            isOrder: true, // 標記為訂單自動產生的紀錄
                            orderObj: o
                        });
                    }
                });
            }
        });

        // 3. 合併並依時間從新到舊排序
        const combinedLogs = [...manualLogs, ...orderLogs];
        return combinedLogs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [product.stock_logs, variantName, allOrders, product.id, variantCost]);

    const handleSubmit = async () => {
        if (!amount || Number(amount) <= 0) return alert('請輸入大於 0 的調整數量！');
        if (!reason.trim()) return alert('請填寫異動原因！');

        const numAmount = Number(amount);
        const actualChange = type === 'ADD' ? numAmount : -numAmount;
        
        if (type === 'MINUS' && variant.stock < numAmount) {
            return alert(`庫存不足以扣除！目前僅剩 ${variant.stock} 件`);
        }

        // ★ 計算移動加權平均成本
        const oldStock = variant.stock;
        let newAverageCostForVariant = variantCost;

        if (type === 'ADD' && unitCost !== '') {
            const newStockAmount = numAmount;
            const newUnitCost = Number(unitCost);
            const totalStockAfterAdd = oldStock + newStockAmount;
            
            if (totalStockAfterAdd > 0) {
                newAverageCostForVariant = ((oldStock * variantCost) + (newStockAmount * newUnitCost)) / totalStockAfterAdd;
            }
        }

        const updatedVariants = [...product.variants];
        updatedVariants[variantIndex] = { 
            ...variant, 
            stock: oldStock + actualChange,
            cost: newAverageCostForVariant 
        };
        
        const newLog: StockLog = {
            id: `log-${Date.now()}-${variantIndex}`,
            variant_name: variantName,
            change_amount: actualChange,
            reason: reason.trim(),
            created_at: new Date().toISOString(),
            // ★ 減少庫存時，自動帶入當下成本，讓整體利潤報表可以將其視作「已實現成本 (虧損)」扣除
            unit_cost: type === 'ADD' && unitCost !== '' ? Number(unitCost) : variantCost 
        };

        setIsSubmitting(true);
        try {
            const newTotalStock = updatedVariants.reduce((sum, v) => sum + v.stock, 0);
            
            let overallAverageCost = product.average_cost || product.cost || 0;
            if (newTotalStock > 0) {
                const totalInventoryValue = updatedVariants.reduce((sum, v) => sum + (v.stock * (v.cost || 0)), 0);
                overallAverageCost = totalInventoryValue / newTotalStock;
            }

            const updatedProduct: Product = {
                ...product,
                variants: updatedVariants,
                total_stock: newTotalStock,
                average_cost: overallAverageCost,
                stock_logs: [newLog, ...(product.stock_logs || [])]
            };

            await API.updateProduct(updatedProduct);
            onUpdateProduct(updatedProduct);
            alert('庫存盤點與異動成功！');
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
            <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
                <div className="bg-[#EE4D2D] p-5 flex justify-between items-center text-white rounded-t-3xl shrink-0">
                    <h3 className="font-black text-lg"><i className="fa-solid fa-boxes-stacked mr-2"></i>庫存盤點與補貨 (單一規格操作)</h3>
                    <button onClick={onClose} className="hover:text-red-200 transition"><i className="fa-solid fa-xmark text-xl"></i></button>
                </div>
                
                <div className="p-4 md:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                    {/* 上方商品與規格資訊摘要 */}
                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100 gap-4">
                        <div className="flex items-center gap-4">
                            <img src={product.images[0] || 'https://placehold.co/100'} className="w-14 h-14 rounded-lg object-cover border shrink-0 bg-white" />
                            <div>
                                <div className="font-bold text-slate-800 text-sm md:text-base">{product.name}</div>
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                    <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-[#EE4D2D] font-bold text-xs">規格: {variantName}</span>
                                    <span className="text-xs text-slate-500 font-bold border-l pl-2">目前單位成本: ${Number(variantCost.toFixed(1)).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        <div className="text-left md:text-right bg-white p-3 rounded-xl border border-slate-100 shadow-sm w-full md:w-auto">
                            <div className="text-[10px] text-slate-500 font-bold mb-1">目前規格庫存 / 總成本</div>
                            <div className="text-lg font-black text-slate-800">{variant.stock} <span className="text-xs font-normal text-slate-500">件</span> / <span className="text-blue-600">${Number((variant.stock * variantCost).toFixed(1)).toLocaleString()}</span></div>
                        </div>
                    </div>

                    <div className="flex gap-2 bg-slate-100 p-1 rounded-xl w-fit mb-4">
                        <button onClick={() => setShowLogs(false)} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${!showLogs ? 'bg-white shadow-sm text-[#EE4D2D]' : 'text-slate-500 hover:text-slate-700'}`}>新增異動</button>
                        <button onClick={() => setShowLogs(true)} className={`px-4 py-2 rounded-lg text-sm font-bold transition ${showLogs ? 'bg-white shadow-sm text-[#EE4D2D]' : 'text-slate-500 hover:text-slate-700'}`}><i className="fa-solid fa-file-invoice-dollar mr-1"></i>專業會計歷史報表</button>
                    </div>

                    {showLogs ? (
                        <div className="space-y-3 animate-fade-in border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto w-full">
                                <table className="w-full text-left border-collapse text-xs md:text-sm whitespace-nowrap">
                                    <thead>
                                        <tr className="bg-slate-100 text-slate-600 border-b border-slate-200">
                                            <th className="p-3 font-bold">日期時間</th>
                                            <th className="p-3 font-bold min-w-[150px]">異動原因 / 關聯紀錄</th>
                                            <th className="p-3 font-bold text-right text-green-600 bg-green-50/50">入庫 (+)</th>
                                            <th className="p-3 font-bold text-right text-red-500 bg-red-50/50">出庫 (-)</th>
                                            <th className="p-3 font-bold text-right">當下單位成本</th>
                                            <th className="p-3 font-bold text-right text-green-600 bg-green-50/50">成本增加</th>
                                            <th className="p-3 font-bold text-right text-red-500 bg-red-50/50">成本減少</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {variantLogs.length === 0 ? (
                                            <tr><td colSpan={7} className="p-8 text-center text-slate-400 font-bold">尚無異動紀錄</td></tr>
                                        ) : (
                                            variantLogs.map(log => {
                                                const isAdd = log.change_amount > 0;
                                                const absChange = Math.abs(log.change_amount);
                                                const uCost = log.unit_cost !== undefined ? log.unit_cost : variantCost;
                                                const totalVal = absChange * uCost;
                                                const canceledOrder = log.order_id ? allOrders.find(o => o.id === log.order_id) : null;

                                                return (
                                                    <tr key={log.id} className={`border-b border-slate-100 hover:bg-slate-50 transition ${log.isOrder ? 'bg-blue-50/20' : ''}`}>
                                                        <td className="p-3 text-[10px] md:text-xs text-slate-500 font-mono">{new Date(log.created_at).toLocaleString('zh-TW')}</td>
                                                        <td className="p-3 text-slate-700 font-bold max-w-[250px] truncate" title={log.reason}>
                                                            {log.isOrder && <i className="fa-solid fa-receipt text-blue-500 mr-1"></i>}
                                                            {log.reason}
                                                            {log.isOrder && <div className="text-[10px] text-slate-500 font-mono mt-0.5 ml-4">買家: {log.orderObj.receiver_name}</div>}
                                                            {canceledOrder && <div className="text-[10px] text-red-500 font-mono mt-0.5"><i className="fa-solid fa-ban"></i> 退單 #{canceledOrder.id.slice(-6)}</div>}
                                                        </td>
                                                        <td className="p-3 text-right font-black text-green-600 bg-green-50/10">{isAdd ? `+${absChange}` : '-'}</td>
                                                        <td className="p-3 text-right font-black text-red-500 bg-red-50/10">{!isAdd ? `-${absChange}` : '-'}</td>
                                                        <td className="p-3 text-right text-slate-600">${Number(uCost.toFixed(1)).toLocaleString()}</td>
                                                        <td className="p-3 text-right font-bold text-green-700 bg-green-50/10">{isAdd ? `+$${Number(totalVal.toFixed(1)).toLocaleString()}` : '-'}</td>
                                                        <td className="p-3 text-right font-bold text-red-600 bg-red-50/10">{!isAdd ? `-$${Number(totalVal.toFixed(1)).toLocaleString()}` : '-'}</td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-5 animate-fade-in bg-white p-5 md:p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 block mb-2">1. 異動類型與數量</label>
                                    <div className="flex items-center gap-2">
                                        <select 
                                            className="h-12 border border-slate-200 rounded-xl px-3 outline-none focus:border-[#EE4D2D] bg-white cursor-pointer font-bold text-slate-700 w-1/3"
                                            value={type}
                                            onChange={(e) => setType(e.target.value as any)}
                                        >
                                            <option value="ADD">➕ 增加庫存</option>
                                            <option value="MINUS">➖ 減少庫存</option>
                                        </select>
                                        <input 
                                            type="number" 
                                            className="h-12 flex-1 border border-slate-200 rounded-xl px-4 outline-none focus:border-[#EE4D2D] font-black text-slate-700"
                                            placeholder="輸入數量"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value === '' ? '' : Math.abs(Number(e.target.value)).toString())}
                                            min="1"
                                        />
                                    </div>
                                </div>
                                
                                {type === 'ADD' ? (
                                    <div>
                                        <label className="text-xs font-bold text-slate-500 block mb-2">本次進貨「單件成本」 (將自動加權平均)</label>
                                        <input 
                                            type="number" 
                                            className="h-12 w-full border border-slate-200 rounded-xl px-4 outline-none focus:border-green-500 font-black text-green-700 bg-green-50/30"
                                            placeholder="例如: 150 (未填則沿用原成本)"
                                            value={unitCost}
                                            onChange={(e) => setUnitCost(e.target.value === '' ? '' : Math.abs(Number(e.target.value)).toString())}
                                            min="0"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex flex-col justify-center bg-red-50 p-3 rounded-xl border border-red-100">
                                        <div className="text-xs font-bold text-red-600 mb-1"><i className="fa-solid fa-circle-info mr-1"></i>減少庫存說明</div>
                                        <div className="text-[10px] text-red-500 leading-relaxed">
                                            減少庫存 (如盤點短少、損壞) 將自動以目前平均成本 <b>${Number(variantCost.toFixed(1)).toLocaleString()}</b> 計算。<br/>
                                            此部分金額會被系統認列為<b>「已實現成本 (無收入虧損)」</b>，從而降低該商品的整體利潤率。
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 block mb-2">2. 異動原因 (必填，將顯示於會計報表)</label>
                                <textarea 
                                    className="w-full h-24 border border-slate-200 rounded-xl p-4 outline-none focus:border-[#EE4D2D] text-sm resize-none bg-slate-50"
                                    placeholder="例如：廠商進貨 50 件、瑕疵報廢 2 件、月底盤點誤差短少..."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                ></textarea>
                            </div>

                            <button onClick={handleSubmit} disabled={isSubmitting} className="w-full bg-[#EE4D2D] text-white py-4 rounded-xl font-black shadow-lg hover:bg-[#d73211] transition active:scale-95 disabled:opacity-50 text-lg">
                                {isSubmitting ? '處理中...' : '確認儲存異動紀錄'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default RestockModal;