import React, { useState } from 'react';
import { Category, Product } from '../types';
import API from '../api';

interface CategoryManagementProps {
  shopId: string;
  categories: Category[];
  products: Product[];
  onUpdateCategories: (categories: Category[]) => void;
}

const CategoryManagement: React.FC<CategoryManagementProps> = ({ shopId, categories, products, onUpdateCategories }) => {
  // 控制新增輸入框的狀態: parentId 為 'ROOT' 代表主分類，為具體 ID 代表子分類
  const [addingState, setAddingState] = useState<{ parentId: string | null; name: string } | null>(null);
  
  // 控制編輯名稱的狀態
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [tempName, setTempName] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

// ★ 新增功能：手動重新整理分類
  const handleRefresh = async () => {
    if (shopId === 'SYSTEM') return; // ★ 防呆：系統分類不呼叫此 API
    try {
      setIsRefreshing(true);
      const freshCategories = await API.getCategories(shopId);
      onUpdateCategories(freshCategories);
    } catch (e) {
      alert('重新整理失敗，請檢查網路連線');
    } finally {
      setIsRefreshing(false);
    }
  };

  // 處理新增分類 (核心修復邏輯)
  const handleConfirmAdd = async () => {
    if (!addingState || !addingState.name.trim()) return;

    // 1. 建立新分類物件
    const newCat: Category = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      shop_id: shopId, 
      name: addingState.name,
      parent_id: addingState.parentId === 'ROOT' ? null : addingState.parentId,
      type: 'MANUAL',
      product_ids: [],
      auto_rules: {},
      sort_order: categories.length, // 放在最後
      is_active: true,
      layout_style: 'STANDARD'
    };
    
    // 2. 建構新的分類陣列
    const newCategories = [...categories, newCat];
    
    try {
      // 3. 先更新畫面 (解決消失問題)
      onUpdateCategories(newCategories);
      
      // 4. 清除輸入狀態
      setAddingState(null);

      // 5. ★ 防呆：徹底清洗資料，確保不會將 MongoDB 內部的 _id 和 __v 送回後端導致衝突
      if (shopId !== 'SYSTEM') {
         const cleanCategories = newCategories.map(c => {
             const { _id, __v, ...cleanCat } = c as any;
             return cleanCat;
         });
         await API.updateCategories(cleanCategories, shopId);
      }
    } catch (e) {
      alert('儲存失敗，請檢查網路連線');
      console.error(e);
    }
  };

  // 處理刪除
  const handleDeleteCategory = async (id: string) => {
    if (!confirm('確定要刪除此分類嗎？(包含其子分類也會一併刪除)')) return;
    
    // 遞迴找出所有子分類 ID
    const getAllChildIds = (pId: string): string[] => {
      const children = categories.filter(c => c.parent_id === pId);
      let ids = children.map(c => c.id);
      children.forEach(c => ids = [...ids, ...getAllChildIds(c.id)]);
      return ids;
    };

    const idsToRemove = [id, ...getAllChildIds(id)];
    const filteredCategories = categories.filter(c => !idsToRemove.includes(c.id));
    
    try {
      onUpdateCategories(filteredCategories); // 先更新畫面
      // ★ 防呆
      if (shopId !== 'SYSTEM') {
         const cleanCategories = filteredCategories.map(c => {
             const { _id, __v, ...cleanCat } = c as any;
             return cleanCat;
         });
         await API.updateCategories(cleanCategories, shopId);
      }
    } catch (e) {
      alert('刪除失敗');
    }
  };

  // 處理更名
  const handleRename = async (id: string) => {
    if (!tempName.trim()) return;
    const updatedCategories = categories.map(c => c.id === id ? { ...c, name: tempName } : c);
    
    try {
      onUpdateCategories(updatedCategories);
      setEditingNameId(null);
      // ★ 防呆
      if (shopId !== 'SYSTEM') {
         const cleanCategories = updatedCategories.map(c => {
             const { _id, __v, ...cleanCat } = c as any;
             return cleanCat;
         });
         await API.updateCategories(cleanCategories, shopId);
      }
    } catch (e) {
      alert('更新失敗');
    }
  };

  // 處理排序 (上移/下移)
  const handleMove = async (id: string, direction: 'UP' | 'DOWN') => {
    const target = categories.find(c => c.id === id);
    if (!target) return;

    // 找出同層級的分類並排序
    const siblings = categories
      .filter(c => c.parent_id === target.parent_id)
      .sort((a, b) => a.sort_order - b.sort_order);
    
    const currentIndex = siblings.findIndex(c => c.id === id);
    if (currentIndex === -1) return;

    let swapTarget: Category | null = null;
    if (direction === 'UP' && currentIndex > 0) {
      swapTarget = siblings[currentIndex - 1];
    } else if (direction === 'DOWN' && currentIndex < siblings.length - 1) {
      swapTarget = siblings[currentIndex + 1];
    }

    if (swapTarget) {
      const newCategories = categories.map(c => {
        if (c.id === id) return { ...c, sort_order: swapTarget!.sort_order };
        if (c.id === swapTarget!.id) return { ...c, sort_order: target.sort_order };
        return c;
      });
      
      try {
        onUpdateCategories(newCategories);
        // ★ 防呆
        if (shopId !== 'SYSTEM') {
           const cleanCategories = newCategories.map(c => {
               const { _id, __v, ...cleanCat } = c as any;
               return cleanCat;
           });
           await API.updateCategories(cleanCategories, shopId);
        }
      } catch (e) { /* ignore */ }
    }
  };

  // 渲染樹狀結構
  const renderCategoryTree = (parentId: string | null, level = 0) => {
    const nodes = categories
      .filter(c => c.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order);

    // 如果沒有子節點且不是正在新增子節點，則不渲染容器
    if (nodes.length === 0 && parentId !== null && addingState?.parentId !== parentId) {
        return null;
    }

    return (
        <div className={`${level > 0 ? 'ml-6 border-l-2 border-slate-100 pl-4 mt-2' : 'space-y-3'}`}>
            {nodes.map(node => (
                <div key={node.id} className="group">
                    {/* 分類行本身 */}
                    <div className={`flex items-center p-3 rounded-xl border transition-all bg-white hover:shadow-sm ${editingNameId === node.id ? 'border-[#EE4D2D]' : 'border-slate-200'}`}>
                        <div className="mr-3 text-slate-300 cursor-move">
                            <i className="fa-solid fa-grip-vertical"></i>
                        </div>
                        
                        <div className="flex-1">
                            {editingNameId === node.id ? (
                                <div className="flex items-center gap-2">
                                    <input 
                                        autoFocus
                                        className="border border-slate-300 rounded px-2 py-1 text-sm w-full outline-none focus:border-[#EE4D2D]"
                                        value={tempName}
                                        onChange={e => setTempName(e.target.value)}
                                        onKeyDown={e => { if(e.key === 'Enter') handleRename(node.id); }}
                                    />
                                    <button onClick={() => handleRename(node.id)} className="text-green-600 hover:bg-green-50 p-1 rounded"><i className="fa-solid fa-check"></i></button>
                                    <button onClick={() => setEditingNameId(null)} className="text-slate-400 hover:bg-slate-50 p-1 rounded"><i className="fa-solid fa-xmark"></i></button>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="font-bold text-slate-700 text-sm">{node.name}</div>
                                        <div className="text-[10px] text-slate-400">
                                            {node.type === 'MANUAL' ? '手動' : '自動'} • {node.is_active ? '顯示中' : '隱藏'}
                                        </div>
                                    </div>
                                    <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setEditingNameId(node.id); setTempName(node.name); }} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded" title="編輯"><i className="fa-solid fa-pen text-xs"></i></button>
                                        <button onClick={() => handleMove(node.id, 'UP')} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded"><i className="fa-solid fa-chevron-up text-xs"></i></button>
                                        <button onClick={() => handleMove(node.id, 'DOWN')} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded"><i className="fa-solid fa-chevron-down text-xs"></i></button>
                                        <button onClick={() => handleDeleteCategory(node.id)} className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded" title="刪除"><i className="fa-solid fa-trash-can text-xs"></i></button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 子分類區域 */}
                    <div className="mb-2">
                        {/* 遞迴渲染子節點 */}
                        {renderCategoryTree(node.id, level + 1)}

                        {/* 如果正在此節點下新增 */}
                        {addingState?.parentId === node.id && (
                            <div className={`mt-2 ml-6 p-2 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 animate-fade-in`}>
                                <div className="text-blue-300 pl-2"><i className="fa-solid fa-turn-up rotate-90"></i></div>
                                <input 
                                    autoFocus
                                    type="text" 
                                    placeholder={`輸入 [${node.name}] 的子分類名稱...`}
                                    className="flex-1 bg-white border border-blue-200 rounded px-2 py-1 text-sm outline-none focus:border-blue-400"
                                    value={addingState.name}
                                    onChange={e => setAddingState({ ...addingState, name: e.target.value })}
                                    onKeyDown={e => e.key === 'Enter' && handleConfirmAdd()}
                                />
                                <button onClick={handleConfirmAdd} className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded font-bold hover:bg-blue-600">確認</button>
                                <button onClick={() => setAddingState(null)} className="text-slate-400 hover:text-slate-600 px-2"><i className="fa-solid fa-xmark"></i></button>
                            </div>
                        )}

                        {/* 新增子分類按鈕 (僅在非編輯狀態且是主分類時顯示) */}
                        {parentId === null && addingState?.parentId !== node.id && (
                            <button 
                                onClick={() => setAddingState({ parentId: node.id, name: '' })}
                                className="ml-6 mt-1 text-xs text-slate-400 hover:text-[#EE4D2D] font-bold flex items-center gap-1 transition-colors px-2 py-1 rounded hover:bg-orange-50 w-fit"
                            >
                                <i className="fa-solid fa-plus"></i> 新增子分類
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 min-h-[600px]">
      <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <i className="fa-solid fa-list-ul text-[#EE4D2D]"></i>
            商家分類管理
          </h2>
          <p className="text-xs text-slate-400 mt-1">建立您的專屬分類，方便買家搜尋商品</p>
        </div>
        
        <div className="flex gap-2">
            {/* ★ 新增：重新整理按鈕 */}
            <button 
                onClick={handleRefresh}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition flex items-center gap-2"
                disabled={isRefreshing}
            >
                <i className={`fa-solid fa-rotate-right ${isRefreshing ? 'animate-spin' : ''}`}></i>
                {isRefreshing ? '讀取中...' : '重新整理'}
            </button>

            {/* 新增主分類按鈕 */}
            {addingState?.parentId !== 'ROOT' && (
            <button 
                onClick={() => setAddingState({ parentId: 'ROOT', name: '' })}
                className="px-5 py-2.5 bg-[#EE4D2D] text-white rounded-xl font-bold shadow-md hover:bg-[#d73211] transition flex items-center gap-2"
            >
                <i className="fa-solid fa-plus"></i> 新增主分類
            </button>
            )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        {/* 新增主分類的輸入框 (顯示在最上方) */}
        {addingState?.parentId === 'ROOT' && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-xl animate-fade-in shadow-sm">
            <label className="text-xs font-bold text-[#EE4D2D] mb-2 block uppercase tracking-wider"><i className="fa-solid fa-layer-group mr-1"></i>建立新的主分類</label>
            <div className="flex gap-3">
                <input 
                autoFocus
                type="text" 
                placeholder="請輸入主分類名稱..."
                className="flex-1 border border-orange-200 rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-orange-200 text-slate-700 font-bold"
                value={addingState.name}
                onChange={e => setAddingState({ ...addingState, name: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && handleConfirmAdd()}
                />
                <button onClick={handleConfirmAdd} className="px-6 py-2 bg-[#EE4D2D] text-white rounded-lg font-bold hover:shadow-lg transition">確認新增</button>
                <button onClick={() => setAddingState(null)} className="px-4 py-2 bg-white text-slate-500 border border-slate-200 rounded-lg font-bold hover:bg-slate-50">取消</button>
            </div>
            </div>
        )}

        {/* 分類列表區 */}
        {categories.length === 0 && !addingState ? (
            <div className="py-20 text-center text-slate-300 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <i className="fa-regular fa-folder-open text-4xl mb-3"></i>
            <p>您尚未建立任何分類</p>
            <p className="text-xs mt-1">點擊右上方按鈕開始建立</p>
            </div>
        ) : (
            <div className="custom-scrollbar pr-2">
                {renderCategoryTree(null)}
            </div>
        )}
      </div>
    </div>
  );
};

export default CategoryManagement;