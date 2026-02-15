
import React, { useState, useEffect, useMemo } from 'react';
import { Category, Product } from '../types';
import API from '../api';

interface CategoryManagementProps {
  shopId: string;
  categories: Category[];
  products: Product[];
  onUpdateCategories: (categories: Category[]) => void;
  onNavigate?: (view: any) => void;
}

const CategoryManagement: React.FC<CategoryManagementProps> = ({ 
  shopId,
  categories, 
  products, 
  onUpdateCategories 
}) => {
  const [localCategories, setLocalCategories] = useState<Category[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [editTab, setEditTab] = useState<'BASIC' | 'PRODUCTS' | 'LAYOUT'>('BASIC');
  
  const handleImageUpload = (file: File, field: 'image' | 'banner') => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (selectedCatId && reader.result) {
        updateLocalCategory(selectedCatId, { [field]: reader.result as string });
      }
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    setLocalCategories([...categories].sort((a, b) => a.sort_order - b.sort_order));
  }, [categories]);

  const activeCategory = useMemo(() => 
    localCategories.find(c => c.id === selectedCatId), 
  [localCategories, selectedCatId]);

  const updateLocalCategory = (id: string, data: Partial<Category>) => {
    setLocalCategories(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
  };

  const handleAddCategory = (parentId: string | null = null) => {
    if (parentId) {
      const subCount = localCategories.filter(c => c.parent_id === parentId).length;
      if (subCount >= 10) return alert('子分類最多只能有 10 個');
    }

    const newCat: Category = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      shop_id: shopId, 
      name: parentId ? '新子分類' : '新主分類',
      parent_id: parentId,
      type: 'MANUAL',
      product_ids: [],
      auto_rules: {},
      sort_order: localCategories.length,
      is_active: true,
      layout_style: 'STANDARD'
    };
    
    setLocalCategories([...localCategories, newCat]);
    setSelectedCatId(newCat.id);
  };

  const handleDeleteCategory = (id: string) => {
    if (!confirm('確定要刪除此分類嗎？')) return;
    setLocalCategories(prev => prev.filter(c => c.id !== id && c.parent_id !== id));
    if (selectedCatId === id) setSelectedCatId(null);
  };

  const handleMove = (id: string, direction: 'UP' | 'DOWN') => {
    const currentIndex = localCategories.findIndex(c => c.id === id);
    if (currentIndex === -1) return;
    
    const target = localCategories[currentIndex];
    const siblings = localCategories.filter(c => c.parent_id === target.parent_id);
    const siblingIndex = siblings.findIndex(c => c.id === id);
    
    if (direction === 'UP' && siblingIndex > 0) {
      const prevSibling = siblings[siblingIndex - 1];
      updateLocalCategory(id, { sort_order: prevSibling.sort_order });
      updateLocalCategory(prevSibling.id, { sort_order: target.sort_order });
    } else if (direction === 'DOWN' && siblingIndex < siblings.length - 1) {
      const nextSibling = siblings[siblingIndex + 1];
      updateLocalCategory(id, { sort_order: nextSibling.sort_order });
      updateLocalCategory(nextSibling.id, { sort_order: target.sort_order });
    }
  };

  const handleSaveAll = async () => {
    if (!shopId) {
      alert('錯誤：找不到商店 ID，無法儲存分類。');
      return;
    }
    
    try {
      const sanitizedCategories = localCategories.map(c => ({
        ...c,
        shop_id: shopId
      }));

      // 1. 呼叫 API 儲存
      await API.updateCategories(sanitizedCategories, shopId);
      
      // 2. 關鍵：立即更新上層組件的狀態，讓變更即時反映在 APP 中
      onUpdateCategories(sanitizedCategories);
      
      alert('分類設定已儲存！');
    } catch (error) {
      console.error('儲存失敗', error);
      alert('儲存失敗，請檢查網路連線或稍後再試。');
    }
  };

  const renderCategoryTree = (parentId: string | null) => {
    const nodes = localCategories
      .filter(c => c.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order);

    return nodes.map(node => (
      <div key={node.id} className="ml-4 mb-2">
        <div 
          className={`flex items-center p-3 rounded-lg border cursor-pointer transition ${selectedCatId === node.id ? 'border-[#EE4D2D] bg-orange-50' : 'border-slate-200 hover:bg-slate-50'}`}
          onClick={() => setSelectedCatId(node.id)}
        >
          <div className="mr-3 text-slate-400">
             <i className="fa-solid fa-bars cursor-move"></i>
          </div>
          <div className="flex-1">
             <div className="font-bold text-sm text-slate-700">{node.name}</div>
             <div className="text-xs text-slate-400">
               {node.type === 'MANUAL' ? '手動' : '自動'} • {node.is_active ? '顯示中' : '隱藏'}
             </div>
          </div>
          <div className="flex gap-1" onClick={e => e.stopPropagation()}>
             <button onClick={() => handleMove(node.id, 'UP')} className="p-1 text-slate-400 hover:text-blue-500"><i className="fa-solid fa-chevron-up"></i></button>
             <button onClick={() => handleMove(node.id, 'DOWN')} className="p-1 text-slate-400 hover:text-blue-500"><i className="fa-solid fa-chevron-down"></i></button>
             <button onClick={() => handleDeleteCategory(node.id)} className="p-1 text-slate-400 hover:text-red-500"><i className="fa-solid fa-trash"></i></button>
          </div>
        </div>
        {parentId === null && (
          <div className="border-l-2 border-slate-100 ml-4 mt-2">
            {renderCategoryTree(node.id)}
            <button 
              onClick={() => handleAddCategory(node.id)}
              className="ml-4 mt-2 text-xs text-[#EE4D2D] font-bold flex items-center gap-1 hover:underline"
            >
              <i className="fa-solid fa-plus"></i> 新增子分類
            </button>
          </div>
        )}
      </div>
    ));
  };

  const toggleProduct = (prodId: string) => {
    if (!activeCategory) return;
    const currentIds = activeCategory.product_ids || [];
    if (currentIds.includes(prodId)) {
      updateLocalCategory(activeCategory.id, { product_ids: currentIds.filter(id => id !== prodId) });
    } else {
      updateLocalCategory(activeCategory.id, { product_ids: [...currentIds, prodId] });
    }
  };

  return (
    <div className="flex h-[calc(100vh-100px)] gap-4">
      <div className="w-1/4 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
           <h3 className="font-bold text-slate-700">分類列表</h3>
           <button onClick={() => handleAddCategory(null)} className="text-xs bg-[#EE4D2D] text-white px-2 py-1 rounded hover:bg-[#d73211]">
             <i className="fa-solid fa-plus mr-1"></i>主分類
           </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
           {renderCategoryTree(null)}
        </div>
        <div className="p-4 border-t border-slate-100">
           <button onClick={handleSaveAll} className="w-full py-2 bg-slate-800 text-white rounded-lg font-bold">儲存變更</button>
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        {activeCategory ? (
          <>
            <div className="flex border-b border-slate-100">
               <button onClick={() => setEditTab('BASIC')} className={`flex-1 py-3 text-sm font-bold border-b-2 ${editTab === 'BASIC' ? 'border-[#EE4D2D] text-[#EE4D2D]' : 'border-transparent text-slate-500'}`}>基本設定</button>
               <button onClick={() => setEditTab('PRODUCTS')} className={`flex-1 py-3 text-sm font-bold border-b-2 ${editTab === 'PRODUCTS' ? 'border-[#EE4D2D] text-[#EE4D2D]' : 'border-transparent text-slate-500'}`}>商品選擇</button>
               {!activeCategory.parent_id && (
                 <button onClick={() => setEditTab('LAYOUT')} className={`flex-1 py-3 text-sm font-bold border-b-2 ${editTab === 'LAYOUT' ? 'border-[#EE4D2D] text-[#EE4D2D]' : 'border-transparent text-slate-500'}`}>賣場佈置</button>
               )}
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
               {editTab === 'BASIC' && (
                 <div className="space-y-4 max-w-lg mx-auto">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">分類名稱</label>
                      <input 
                        type="text" 
                        value={activeCategory.name} 
                        onChange={e => updateLocalCategory(activeCategory.id, { name: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded focus:border-[#EE4D2D] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">啟用狀態</label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={activeCategory.is_active} 
                          onChange={e => updateLocalCategory(activeCategory.id, { is_active: e.target.checked })}
                          className="accent-[#EE4D2D]"
                        />
                        <span className="text-sm">在前台顯示此分類</span>
                      </label>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">分類封面圖</label>
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 bg-slate-100 rounded border border-slate-200 flex items-center justify-center overflow-hidden relative group">
                          {activeCategory.image ? (
                            <img src={activeCategory.image} className="w-full h-full object-cover" />
                          ) : (
                            <i className="fa-regular fa-image text-2xl text-slate-300"></i>
                          )}
                           <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'image')} />
                        </div>
                        <div className="text-xs text-slate-400">
                          {/* ★ 建議尺寸 */}
                          <p className="font-bold text-[#EE4D2D]">建議尺寸: 500 x 500 px (正方形)</p>
                          <p>支援 JPG, PNG</p>
                        </div>
                      </div>
                    </div>
                 </div>
               )}

               {editTab === 'PRODUCTS' && (
                 <div className="space-y-6">
                    <div className="flex gap-4 mb-4">
                       <label className="flex items-center gap-2">
                         <input type="radio" name="ctype" checked={activeCategory.type === 'MANUAL'} onChange={() => updateLocalCategory(activeCategory.id, { type: 'MANUAL' })} className="accent-[#EE4D2D]" />
                         <span className="font-bold text-sm">手動選擇</span>
                       </label>
                       <label className="flex items-center gap-2">
                         <input type="radio" name="ctype" checked={activeCategory.type === 'AUTO'} onChange={() => updateLocalCategory(activeCategory.id, { type: 'AUTO' })} className="accent-[#EE4D2D]" />
                         <span className="font-bold text-sm">自動篩選</span>
                       </label>
                    </div>

                    {activeCategory.type === 'MANUAL' ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {products.map(p => (
                          <div 
                            key={p.id} 
                            onClick={() => toggleProduct(p.id)}
                            className={`p-2 border rounded-lg cursor-pointer flex items-center gap-2 transition ${activeCategory.product_ids?.includes(p.id) ? 'border-[#EE4D2D] bg-orange-50' : 'border-slate-200'}`}
                          >
                             <div className="w-10 h-10 bg-slate-200 rounded shrink-0 overflow-hidden">
                               {p.images?.[0] && <img src={p.images[0]} className="w-full h-full object-cover"/>}
                             </div>
                             <div className="flex-1 min-w-0">
                               <div className="text-xs font-bold truncate">{p.name}</div>
                               <div className="text-xs text-slate-400">${p.price}</div>
                             </div>
                             {activeCategory.product_ids?.includes(p.id) && <i className="fa-solid fa-check-circle text-[#EE4D2D]"></i>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-slate-50 p-4 rounded-lg space-y-4">
                        <div className="text-sm font-bold text-slate-700">自動篩選條件：</div>
                        <div className="grid grid-cols-2 gap-4">
                           <input 
                             placeholder="關鍵字 (包含...)" 
                             className="p-2 border rounded text-sm" 
                             value={activeCategory.auto_rules?.keyword || ''}
                             onChange={e => updateLocalCategory(activeCategory.id, { auto_rules: { ...activeCategory.auto_rules, keyword: e.target.value }})}
                           />
                           <div className="flex items-center gap-2">
                             <input 
                               type="number" 
                               placeholder="最低價" 
                               className="p-2 border rounded text-sm w-full" 
                               value={activeCategory.auto_rules?.price_min || ''}
                               onChange={e => updateLocalCategory(activeCategory.id, { auto_rules: { ...activeCategory.auto_rules, price_min: Number(e.target.value) }})}
                             />
                             <span>-</span>
                             <input 
                               type="number" 
                               placeholder="最高價" 
                               className="p-2 border rounded text-sm w-full" 
                               value={activeCategory.auto_rules?.price_max || ''}
                               onChange={e => updateLocalCategory(activeCategory.id, { auto_rules: { ...activeCategory.auto_rules, price_max: Number(e.target.value) }})}
                             />
                           </div>
                        </div>
                        <p className="text-xs text-slate-400">* 符合以上條件的商品將自動加入此分類</p>
                      </div>
                    )}
                 </div>
               )}

               {editTab === 'LAYOUT' && !activeCategory.parent_id && (
                 <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                       {[
                         { id: 'STANDARD', name: '標準列表', icon: 'fa-list' },
                         { id: 'TWO_COL', name: '雙欄圖片', icon: 'fa-table-cells-large' },
                         { id: 'THREE_COL', name: '三欄圖片', icon: 'fa-table-cells' },
                         { id: 'PRODUCT_LIST', name: '分類商品', icon: 'fa-layer-group' },
                       ].map(layout => (
                         <div 
                           key={layout.id}
                           onClick={() => updateLocalCategory(activeCategory.id, { layout_style: layout.id as any })}
                           className={`p-4 border rounded-xl cursor-pointer text-center transition hover:shadow-md ${activeCategory.layout_style === layout.id ? 'border-[#EE4D2D] bg-orange-50 text-[#EE4D2D]' : 'border-slate-200 text-slate-500'}`}
                         >
                            <i className={`fa-solid ${layout.icon} text-2xl mb-2`}></i>
                            <div className="font-bold text-sm">{layout.name}</div>
                         </div>
                       ))}
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                       <label className="block text-xs font-bold text-slate-500 mb-2">分類橫幅 (Banner)</label>
                       <div className="w-full h-32 bg-slate-100 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center relative overflow-hidden group hover:border-[#EE4D2D] transition">
                          {activeCategory.banner ? (
                            <img src={activeCategory.banner} className="w-full h-full object-cover" />
                          ) : (
                            <div className="text-center text-slate-400">
                              <i className="fa-solid fa-cloud-arrow-up text-2xl mb-1"></i>
                              <div className="text-xs">點擊上傳橫幅圖片</div>
                            </div>
                          )}
                          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'banner')} />
                       </div>
                       {/* ★ 建議尺寸 */}
                       <p className="text-xs text-slate-500 mt-2 font-bold"><i className="fa-solid fa-circle-info mr-1"></i>建議尺寸: 800 x 300 px (長方形)</p>
                    </div>
                 </div>
               )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
             <i className="fa-solid fa-arrow-left text-4xl mb-4 animate-bounce-x"></i>
             <p className="font-bold">請從左側選擇一個分類開始編輯</p>
          </div>
        )}
      </div>

      <div className="w-[300px] bg-slate-800 rounded-[2rem] border-8 border-slate-900 shadow-2xl overflow-hidden relative hidden xl:block">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-6 bg-slate-900 rounded-b-xl z-10"></div>
        <div className="h-full bg-white overflow-y-auto hide-scrollbar">
           <div className="h-12 bg-[#EE4D2D] text-white flex items-center px-4 pt-4 text-sm font-bold shadow-md relative z-10">
             {activeCategory ? activeCategory.name : '預覽賣場'}
           </div>
           {activeCategory?.banner && <img src={activeCategory.banner} className="w-full h-auto" />}
           <div className="p-2 grid grid-cols-2 gap-2">
             {[1,2,3,4].map(i => (
               <div key={i} className="bg-white border border-slate-100 rounded shadow-sm overflow-hidden pb-2">
                 <div className="h-24 bg-slate-200"></div>
                 <div className="p-1">
                   <div className="h-3 w-3/4 bg-slate-100 rounded mb-1"></div>
                   <div className="h-3 w-1/2 bg-[#EE4D2D]/20 rounded"></div>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryManagement;
