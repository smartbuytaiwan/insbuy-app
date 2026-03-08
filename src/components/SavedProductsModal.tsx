import React, { useState, useEffect } from 'react';
import { User, Product, View } from '../types';
import API from '../api';

interface SavedProductsModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: User | null;
    onNavigate: (view: View, product?: Product) => void;
}

const SavedProductsModal: React.FC<SavedProductsModalProps> = ({ isOpen, onClose, user, onNavigate }) => {
    const [savedIds, setSavedIds] = useState<string[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    // 依據是否登入，設定對應的儲存 Key
    const storageKey = user ? `insbuy_saved_products_${user.id}` : 'insbuy_saved_products_guest';

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            const ids = JSON.parse(localStorage.getItem(storageKey) || '[]');
            setSavedIds(ids);
            
            // 取得最新商品資料以顯示商品卡片
            API.getProducts().then(res => {
                setProducts(res);
                setLoading(false);
            }).catch(() => setLoading(false));
        }
    }, [isOpen, user]);

    const handleRemove = (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // 避免觸發跳轉
        const newIds = savedIds.filter(savedId => savedId !== id);
        setSavedIds(newIds);
        localStorage.setItem(storageKey, JSON.stringify(newIds));
    };

    const handleNavigate = (product: Product) => {
        onNavigate(View.PRODUCT, product);
        onClose();
    };

    // 找出在清單中的商品
    const displayProducts = savedIds.map(id => products.find(p => p.id === id)).filter(Boolean) as Product[];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[85vh] animate-fade-in-up" onClick={e => e.stopPropagation()}>
                {/* 標題列 */}
                <div className="flex justify-between items-center p-5 border-b border-slate-100 shrink-0">
                    <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                        <i className="fa-solid fa-heart text-[#EE4D2D]"></i> 關注商品
                    </h3>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 transition">
                        <i className="fa-solid fa-xmark"></i>
                    </button>
                </div>
                
                {/* 列表區塊 */}
                <div className="p-5 overflow-y-auto flex-1 scrollbar-hide space-y-3">
                    {loading ? (
                        <div className="text-center py-10 text-slate-400 font-bold"><i className="fa-solid fa-spinner fa-spin mr-2"></i>載入中...</div>
                    ) : displayProducts.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                            <i className="fa-regular fa-heart text-5xl mb-4 opacity-20 block"></i>
                            <p className="font-bold">您目前沒有關注任何商品</p>
                        </div>
                    ) : (
                        displayProducts.map(product => (
                            <div 
                                key={product.id} 
                                onClick={() => handleNavigate(product)}
                                className="flex items-center gap-4 p-3 bg-white border border-slate-200 rounded-2xl hover:border-[#EE4D2D] hover:shadow-md transition cursor-pointer group"
                            >
                                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-100">
                                    <img src={product.images[0] || 'https://placehold.co/100'} className="w-full h-full object-cover group-hover:scale-105 transition" alt={product.name} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-700 text-sm truncate group-hover:text-[#EE4D2D] transition">{product.name}</h4>
                                    <div className="text-[#EE4D2D] font-black text-sm mt-1">${product.price.toLocaleString()}</div>
                                </div>
                                <button 
                                    onClick={(e) => handleRemove(product.id, e)}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition shrink-0"
                                    title="取消關注"
                                >
                                    <i className="fa-solid fa-trash-can text-xs"></i>
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default SavedProductsModal;