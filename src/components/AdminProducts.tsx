import React from 'react';
import { Product, Category, View } from '../types';

interface AdminProductsProps {
  paginatedProducts: Product[];
  categories: Category[];
  systemCategories?: Category[];
  productViewMode: 'CARD' | 'LIST';
  setProductViewMode: (mode: 'CARD' | 'LIST') => void;
  totalProductPages: number;
  productPage: number;
  setProductPage: React.Dispatch<React.SetStateAction<number>>;
  onNavigate: (view: View, product?: Product, targetId?: string) => void;
  setActiveTab: (tab: any) => void;
  setEditingId: (id: string | null) => void;
  setForm: (form: Partial<Product>) => void;
  getInitialForm: () => Partial<Product>;
  handleDeleteProduct: (id: string) => void;
}

const AdminProducts: React.FC<AdminProductsProps> = ({
  paginatedProducts, categories, systemCategories, productViewMode, setProductViewMode,
  totalProductPages, productPage, setProductPage, onNavigate, setActiveTab,
  setEditingId, setForm, getInitialForm, handleDeleteProduct
}) => {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 md:p-8">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
         <h2 className="text-xl font-bold text-slate-800 ">您的商品列表</h2>
         <div className="flex items-center gap-3 w-full md:w-auto">
             <div className="hidden md:flex items-center gap-1 bg-slate-50 p-1 rounded-lg">
                 <button onClick={() => setProductViewMode('CARD')} className={`p-1.5 rounded transition ${productViewMode === 'CARD' ? 'bg-white shadow-sm text-[#EE4D2D]' : 'text-slate-400 hover:text-slate-600'}`} title="卡片顯示"><i className="fa-solid fa-border-all"></i></button>
                 <button onClick={() => setProductViewMode('LIST')} className={`p-1.5 rounded transition ${productViewMode === 'LIST' ? 'bg-white shadow-sm text-[#EE4D2D]' : 'text-slate-400 hover:text-slate-600'}`} title="列表顯示"><i className="fa-solid fa-list"></i></button>
             </div>
             <button onClick={() => setActiveTab('create')} className="w-full md:w-auto px-5 py-3 md:py-2 primary-gradient text-white rounded-xl text-sm md:text-xs font-bold shadow-md">+ 新增團購</button>
         </div>
       </div>
       <div className="space-y-4">
          {paginatedProducts.length === 0 ? <div className="py-20 text-center text-slate-300">目前沒有商品</div> : 
          paginatedProducts.map(p => (
             <div key={p.id} className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition group">
                 <div className="flex gap-4 w-full md:w-auto md:flex-1 items-center">
                     <div className="w-16 h-16 rounded-xl overflow-hidden border bg-slate-100 shrink-0"><img src={p.images[0] || 'https://placehold.co/100'} className="w-full h-full object-cover" /></div>
                     <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2">
                             <div className="font-bold text-slate-800 text-sm truncate hover:text-[#EE4D2D] cursor-pointer" onClick={() => onNavigate(View.PRODUCT, p)} title="前往商品頁面">{p.name}</div>
                             {(p as any).is_hidden && <span className="bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded font-bold shrink-0">隱藏銷售</span>}
                         </div>
                         <div className="text-[10px] text-slate-400 mt-1 truncate">分類: {p.category_ids?.map(id => categories.find(c => c.id === id)?.name || systemCategories?.find(c => c.id === id)?.name || id).join(', ') || '未分類'}</div>
                         <div className="text-xs text-[#EE4D2D] font-black mt-1">${p.price.toLocaleString()}</div>
                         {p.variants && p.variants.length > 0 && (
                             <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                 {p.variants.map((v, vIdx) => (
                                     <div key={vIdx} className="flex justify-between items-center bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-[10px]">
                                         <span className="text-slate-600 font-bold truncate pr-2" title={v.name}>{v.name}</span>
                                         <span className={`shrink-0 font-mono font-black ${v.stock <= 5 ? 'text-red-500' : 'text-slate-500'}`}>
                                             庫存: {v.stock}
                                         </span>
                                     </div>
                                 ))}
                             </div>
                         )}
                     </div>
                 </div>
                 <div className="flex gap-2 w-full md:w-auto justify-end mt-2 md:mt-0 md:opacity-0 group-hover:opacity-100 transition border-t md:border-t-0 pt-2 md:pt-0 shrink-0">
                     <button onClick={() => { setEditingId(p.id); setForm({...getInitialForm(), ...p}); setActiveTab('create'); }} className="px-4 py-2 md:p-2 bg-blue-50 md:bg-transparent text-blue-500 rounded-lg md:rounded-none font-bold text-xs"><i className="fa-solid fa-pen-to-square mr-1 md:mr-0"></i><span className="md:hidden">編輯</span></button>
                     <button onClick={() => handleDeleteProduct(p.id)} className="px-4 py-2 md:p-2 bg-red-50 md:bg-transparent text-red-500 rounded-lg md:rounded-none font-bold text-xs"><i className="fa-solid fa-trash-can mr-1 md:mr-0"></i><span className="md:hidden">刪除</span></button>
                 </div>
             </div>
          ))}
       </div>
       
       {totalProductPages > 1 && (
         <div className="flex justify-center items-center gap-2 md:gap-4 mt-8">
           <button onClick={() => setProductPage(p => Math.max(1, p - 1))} disabled={productPage === 1} className="px-3 md:px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50 text-xs md:text-sm"><i className="fa-solid fa-chevron-left"></i></button>
           <span className="text-xs md:text-sm font-bold text-slate-600">第 {productPage} / {totalProductPages} 頁</span>
           <button onClick={() => setProductPage(p => Math.min(totalProductPages, p + 1))} disabled={productPage === totalProductPages} className="px-3 md:px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50 text-xs md:text-sm"><i className="fa-solid fa-chevron-right"></i></button>
         </div>
       )}
    </div>
  );
};

export default AdminProducts;