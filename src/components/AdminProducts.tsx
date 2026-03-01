import React, { useState } from 'react';
import { Product, Category, View, Order } from '../types';
import RestockModal from './RestockModal';
import SalesDetailModal from './SalesDetailModal'; // 引入銷售明細視窗

interface AdminProductsProps {
  paginatedProducts: Product[];
  allOrders: Order[]; // ★ 新增：接收所有訂單來計算銷量
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
  paginatedProducts, allOrders, categories, systemCategories, productViewMode, setProductViewMode,
  totalProductPages, productPage, setProductPage, onNavigate, setActiveTab,
  setEditingId, setForm, getInitialForm, handleDeleteProduct
}) => {
  const [restockingProduct, setRestockingProduct] = useState<Product | null>(null);
  // ★ 修改：狀態中多儲存一個 variantName 以供明細視窗顯示
  const [showSalesForProduct, setShowSalesForProduct] = useState<{product: Product, variantName?: string, buyers: any[]} | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [, setForceRender] = useState(0);

  // ★ 修改：改為計算「特定商品」下「特定規格」的銷售數據
  const getVariantSalesData = (productId: string, variantName: string) => {
      let total = 0;
      const buyers: { order: Order, item: any }[] = [];
      allOrders.forEach(o => {
          if (o.status !== 'CANCELLED') {
              o.items.forEach(i => {
                  // 判斷商品 ID 相同，且規格名稱相同（或者商品只有單一規格且未選擇規格時的容錯處理）
                  const itemVariant = i.selectedVariant || '單一規格';
                  if (i.id === productId && itemVariant === variantName) {
                      total += i.qty;
                      buyers.push({ order: o, item: i });
                  }
              });
          }
      });
      return { total, buyers };
  };

  const handleExportInventory = () => {
      let content = "data:text/csv;charset=utf-8,\uFEFF";
      content += "商品ID,商品名稱,狀態,總銷量,規格名稱,目前庫存\n";
      
      paginatedProducts.forEach(p => {
          const safeName = p.name.replace(/"/g, '""');
          const statusStr = p.status === 'OPEN' ? '上架中' : '已下架';
          
          if (p.variants && p.variants.length > 0) {
              p.variants.forEach(v => {
                  const safeVarName = v.name.replace(/"/g, '""');
                  // ★ 修正：針對每個規格獨立去抓取銷售量
                  const vSalesData = getVariantSalesData(p.id, v.name || '單一規格');
                  content += `"${p.id}","${safeName}","${statusStr}",${vSalesData.total},"${safeVarName}",${v.stock}\n`;
              });
          } else {
              // ★ 修正：處理完全沒有 variants 的單一商品情況
              const vSalesData = getVariantSalesData(p.id, '單一規格');
              content += `"${p.id}","${safeName}","${statusStr}",${vSalesData.total},"單一規格",${p.total_stock}\n`;
          }
      });

      const encodedUri = encodeURI(content);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `inventory_page${productPage}_${new Date().getTime()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setShowExportModal(false);
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 md:p-8 animate-fade-in relative">
       
       {restockingProduct && (
           <RestockModal 
               product={restockingProduct} 
               allOrders={allOrders}
               onClose={() => setRestockingProduct(null)} 
               onUpdateProduct={(updated) => {
                   const idx = paginatedProducts.findIndex(p => p.id === updated.id);
                   if(idx !== -1) paginatedProducts[idx] = updated;
                   setForceRender(prev => prev + 1);
               }} 
           />
       )}

       {showSalesForProduct && (
           <SalesDetailModal 
               product={showSalesForProduct.product}
               variantName={showSalesForProduct.variantName}
               buyers={showSalesForProduct.buyers}
               onClose={() => setShowSalesForProduct(null)}
           />
       )}

       {showExportModal && (
           <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
               <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 animate-fade-in-up text-center">
                   <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"><i className="fa-solid fa-file-excel"></i></div>
                   <h3 className="font-black text-lg text-slate-800 mb-2">下載當頁庫存報表</h3>
                   <p className="text-sm text-slate-500 mb-6">將目前畫面上的商品與規格庫存，匯出為相容於 Excel 與 Numbers 的 CSV 檔案。</p>
                   <div className="flex gap-3">
                       <button onClick={handleExportInventory} className="flex-1 bg-green-500 text-white py-3 rounded-xl font-bold hover:bg-green-600 shadow-md">確認下載</button>
                       <button onClick={() => setShowExportModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200">取消</button>
                   </div>
               </div>
           </div>
       )}

       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-100 pb-4">
         <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
             <i className="fa-solid fa-box-open text-[#EE4D2D]"></i> 您的商品列表
         </h2>
         <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
             <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg">
                 <button onClick={() => setProductViewMode('CARD')} className={`p-1.5 rounded transition ${productViewMode === 'CARD' ? 'bg-white shadow-sm text-[#EE4D2D]' : 'text-slate-400 hover:text-slate-600'}`} title="卡片顯示"><i className="fa-solid fa-border-all"></i></button>
                 <button onClick={() => setProductViewMode('LIST')} className={`p-1.5 rounded transition ${productViewMode === 'LIST' ? 'bg-white shadow-sm text-[#EE4D2D]' : 'text-slate-400 hover:text-slate-600'}`} title="列表顯示"><i className="fa-solid fa-list"></i></button>
             </div>
             <button onClick={() => setShowExportModal(true)} className="flex-1 md:flex-none px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold shadow-md hover:bg-slate-700 transition">
                 <i className="fa-solid fa-download mr-1"></i>匯出庫存
             </button>
             <button onClick={() => setActiveTab('create')} className="flex-1 md:flex-none px-4 py-2 primary-gradient text-white rounded-xl text-sm font-bold shadow-md hover:opacity-90 transition">
                 + 新增團購
             </button>
         </div>
       </div>

       <div className="space-y-4">
          {paginatedProducts.length === 0 ? <div className="py-20 text-center text-slate-300">目前沒有商品</div> : 
          paginatedProducts.map(p => {
             return (
             <div key={p.id} className={`flex ${productViewMode === 'LIST' ? 'flex-col md:flex-row items-start md:items-center p-4 gap-4' : 'flex-col md:flex-row items-start md:items-center gap-4 p-5'} border border-slate-100 rounded-2xl hover:bg-orange-50/30 hover:border-orange-200 transition group bg-white shadow-sm`}>
                 
                 <div className={`${productViewMode === 'LIST' ? 'w-16 h-16 md:w-12 md:h-12' : 'w-20 h-20'} rounded-xl overflow-hidden border bg-slate-100 shrink-0 relative cursor-pointer`} onClick={() => onNavigate(View.PRODUCT, p)}>
                     <img src={p.images[0] || 'https://placehold.co/100'} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                 </div>

                 <div className={`flex-1 min-w-0 w-full ${productViewMode === 'LIST' ? 'flex flex-col md:flex-row md:items-center gap-4' : ''}`}>
                     <div className={productViewMode === 'LIST' ? 'flex-1 min-w-0' : ''}>
                         <div className="flex items-center gap-2">
                             <div className="font-black text-slate-800 text-base truncate hover:text-[#EE4D2D] cursor-pointer" onClick={() => onNavigate(View.PRODUCT, p)} title={p.name}>{p.name}</div>
                             {(p as any).is_hidden && <span className="bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded font-bold shrink-0">隱藏</span>}
                         </div>
                         <div className="text-sm text-[#EE4D2D] font-black mt-1">${p.price.toLocaleString()}</div>
                     </div>

                     {/* ★ 改版：各規格獨立顯示剩餘庫存與銷售量 */}
                     <div className={`w-full ${productViewMode === 'LIST' ? 'md:w-1/2' : 'mt-4'} bg-slate-50 p-3 rounded-xl border border-slate-100`}>
                         <div className="mb-2 pb-2 border-b border-slate-200">
                             <span className="text-xs font-bold text-slate-500">各規格庫存與銷售狀況</span>
                         </div>
                         <div className="flex flex-col gap-2 max-h-36 overflow-y-auto pr-1 custom-scrollbar">
                             {p.variants?.map((v, vIdx) => {
                                 // ★ 取得該規格專屬的銷售數據
                                 const vName = v.name || '單一規格';
                                 const vSalesData = getVariantSalesData(p.id, vName);
                                 
                                 return (
                                     <div key={vIdx} className="flex flex-wrap md:flex-nowrap justify-between items-center bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs gap-2">
                                         <span className="text-slate-800 font-bold truncate pr-2 w-full md:w-auto flex-1" title={vName}>{vName}</span>
                                         
                                         <div className="flex items-center gap-3 w-full md:w-auto justify-end shrink-0">
                                             <span className={`font-mono font-bold px-2 py-0.5 rounded ${v.stock <= 5 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                                                 剩餘: {v.stock}
                                             </span>
                                             
                                             <button 
                                                 onClick={() => setShowSalesForProduct({product: p, variantName: vName, buyers: vSalesData.buyers})} 
                                                 className="font-black text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded hover:bg-blue-600 hover:text-white transition shadow-sm flex items-center gap-1"
                                             >
                                                 <i className="fa-solid fa-chart-line"></i>售出: {vSalesData.total}
                                             </button>
                                         </div>
                                     </div>
                                 );
                             })}
                         </div>
                     </div>
                 </div>

                 {/* 按鈕操作區塊 */}
                 <div className="flex flex-wrap md:flex-col gap-2 shrink-0 w-full md:w-auto justify-end mt-2 md:mt-0 border-t md:border-t-0 pt-3 md:pt-0">
                     <button onClick={() => setRestockingProduct(p)} className="flex-1 md:flex-none px-4 py-2 bg-green-50 text-green-600 hover:bg-green-500 hover:text-white transition rounded-xl font-bold text-sm flex items-center justify-center border border-green-100 shadow-sm">
                         <i className="fa-solid fa-boxes-stacked mr-1"></i>批次補貨
                     </button>
                     <div className="flex gap-2 flex-1 md:flex-none">
                         <button onClick={() => { setEditingId(p.id); setForm({...getInitialForm(), ...p}); setActiveTab('create'); }} className="flex-1 px-3 py-2 bg-blue-50 text-blue-500 hover:bg-blue-500 hover:text-white transition rounded-xl font-bold text-xs flex items-center justify-center border border-blue-100 shadow-sm">
                             <i className="fa-solid fa-pen-to-square"></i>
                         </button>
                         <button onClick={() => handleDeleteProduct(p.id)} className="flex-1 px-3 py-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white transition rounded-xl font-bold text-xs flex items-center justify-center border border-red-100 shadow-sm">
                             <i className="fa-solid fa-trash-can"></i>
                         </button>
                     </div>
                 </div>
             </div>
          )})}
       </div>
       
       {totalProductPages > 1 && (
         <div className="flex justify-center items-center gap-2 md:gap-4 mt-8">
           <button onClick={() => setProductPage(p => Math.max(1, p - 1))} disabled={productPage === 1} className="px-3 md:px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50 text-xs md:text-sm shadow-sm"><i className="fa-solid fa-chevron-left"></i></button>
           <span className="text-xs md:text-sm font-bold text-slate-600 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">第 {productPage} / {totalProductPages} 頁</span>
           <button onClick={() => setProductPage(p => Math.min(totalProductPages, p + 1))} disabled={productPage === totalProductPages} className="px-3 md:px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50 text-xs md:text-sm shadow-sm"><i className="fa-solid fa-chevron-right"></i></button>
         </div>
       )}
    </div>
  );
};

export default AdminProducts;