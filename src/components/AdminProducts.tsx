import React, { useState, useEffect } from 'react';
import { Product, Category, View, Order } from '../types';
import RestockModal from './RestockModal';
import SalesDetailModal from './SalesDetailModal'; // 引入銷售明細視窗
import AppealModal from './AppealModal'; // ★ 新增引入申訴彈跳視窗

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
  // ★ 升級：補貨視窗改為接收特定商品與「單一規格索引」
  const [restockData, setRestockData] = useState<{product: Product, variantIndex: number} | null>(null);
  // ★ 修改：狀態中多儲存一個 variantName 以供明細視窗顯示
  const [showSalesForProduct, setShowSalesForProduct] = useState<{product: Product, variantName?: string, buyers: any[]} | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [appealProduct, setAppealProduct] = useState<Product | null>(null);
  const [, setForceRender] = useState(0);

  // ★ 新增：商品報表日期區間與勾選狀態
  const [reportRange, setReportRange] = useState({ start: '', end: '' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ★ 自動將當前頁面的商品預設為全選
  useEffect(() => {
      setSelectedIds(new Set(paginatedProducts.map(p => p.id)));
  }, [paginatedProducts]);

  const setQuickRange = (days: number) => {
      if (days === -1) { setReportRange({ start: '', end: '' }); return; }
      const end = new Date();
      const start = new Date();
      if (days === 1) { start.setDate(start.getDate() - 1); end.setDate(end.getDate() - 1); }
      else if (days > 1) { start.setDate(start.getDate() - days + 1); }
      setReportRange({ start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] });
  };

  // ★ 全新核心：針對單一規格計算指定日期內的「財務四指標」
  const getVariantFinancials = (p: Product, vName: string, vCost: number) => {
      const sTime = reportRange.start ? new Date(reportRange.start).setHours(0,0,0,0) : 0;
      const eTime = reportRange.end ? new Date(reportRange.end).setHours(23,59,59,999) : Infinity;

      let realizedRevenue = 0;
      let realizedCost = 0;
      let salesQty = 0;
      const buyers: any[] = [];

      // 1. 訂單帶來的收入與成本
      allOrders.forEach(o => {
          const t = new Date(o.created_at).getTime();
          if (t >= sTime && t <= eTime && o.status !== 'CANCELLED') {
              o.items.forEach(i => {
                  const itemVariant = i.selectedVariant || '單一規格';
                  if (i.id === p.id && itemVariant === vName) {
                      salesQty += i.qty;
                      realizedRevenue += (i.finalPrice || i.price) * i.qty;
                      realizedCost += vCost * i.qty;
                      buyers.push({ order: o, item: i });
                  }
              });
          }
      });

      // 2. 盤點/手動扣除造成的已實現成本 (無收入)
      const logs = p.stock_logs || [];
      logs.forEach(log => {
          const t = new Date(log.created_at).getTime();
          // 若是扣除庫存(change_amount < 0)，且不是因為取消訂單退回的紀錄，就視為報廢/短少成本
          if (t >= sTime && t <= eTime && log.variant_name === vName && log.change_amount < 0 && !log.order_id) {
              realizedCost += Math.abs(log.change_amount) * (log.unit_cost || vCost);
          }
      });

      const profit = realizedRevenue - realizedCost;
      const profitMargin = realizedRevenue > 0 ? (profit / realizedRevenue) * 100 : 0;
      const costRate = realizedRevenue > 0 ? (realizedCost / realizedRevenue) * 100 : 0;

      return { salesQty, realizedRevenue, realizedCost, profit, profitMargin, costRate, buyers };
  };

  // ★ 計算頂部被勾選商品的總計數據
  const getAggregateStats = () => {
      let totalRevenue = 0;
      let totalCost = 0;
      let currentStockValue = 0;

      paginatedProducts.forEach(p => {
          if (selectedIds.has(p.id)) {
              p.variants?.forEach(v => {
                  const vName = v.name || '單一規格';
                  const vCost = v.cost || p.average_cost || p.cost || 0;
                  const stats = getVariantFinancials(p, vName, vCost);
                  totalRevenue += stats.realizedRevenue;
                  totalCost += stats.realizedCost;
                  currentStockValue += (v.stock * vCost);
              });
          }
      });

      const totalProfit = totalRevenue - totalCost;
      const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
      const costRate = totalRevenue > 0 ? (totalCost / totalRevenue) * 100 : 0;

      return { totalRevenue, totalCost, totalProfit, profitMargin, costRate, currentStockValue };
  };

  const aggStats = getAggregateStats();

  const handleExportInventory = () => {
      let content = "data:text/csv;charset=utf-8,\uFEFF";
      content += "商品ID,商品名稱,狀態,總銷量,規格名稱,目前庫存\n";
      
      paginatedProducts.forEach(p => {
          const safeName = p.name.replace(/"/g, '""');
          const statusStr = p.status === 'OPEN' ? '上架中' : '已下架';
          
          if (p.variants && p.variants.length > 0) {
              p.variants.forEach(v => {
                  const safeVarName = v.name.replace(/"/g, '""');
                  const vCost = v.cost || p.average_cost || p.cost || 0;
                  // ★ 使用新的計算引擎取得銷量
                  const vStats = getVariantFinancials(p, v.name || '單一規格', vCost);
                  content += `"${p.id}","${safeName}","${statusStr}",${vStats.salesQty},"${safeVarName}",${v.stock}\n`;
              });
          } else {
              const vCost = p.average_cost || p.cost || 0;
              const vStats = getVariantFinancials(p, '單一規格', vCost);
              content += `"${p.id}","${safeName}","${statusStr}",${vStats.salesQty},"單一規格",${p.total_stock}\n`;
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
       
       {restockData && (
           <RestockModal 
               product={restockData.product}
               variantIndex={restockData.variantIndex} // ★ 傳入特定規格
               allOrders={allOrders}
               onClose={() => setRestockData(null)}
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

       {/* ★ 新增：頂部利潤報表與日期過濾區塊 */}
       <div className="mb-6 bg-white border border-slate-200 rounded-3xl p-5 shadow-sm">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-5 border-b border-slate-100 pb-4">
               <div className="flex items-center gap-2">
                   <i className="fa-solid fa-chart-pie text-xl text-[#EE4D2D]"></i>
                   <h2 className="text-lg font-black text-slate-800">已勾選商品財務總覽</h2>
               </div>
               <div className="flex flex-col md:flex-row items-start md:items-center gap-3 w-full md:w-auto">
                   <div className="flex gap-2 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
                       <button onClick={() => setQuickRange(-1)} className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition ${!reportRange.start ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>全部</button>
                       <button onClick={() => setQuickRange(0)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg whitespace-nowrap transition">今日</button>
                       <button onClick={() => setQuickRange(1)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg whitespace-nowrap transition">昨日</button>
                       <button onClick={() => setQuickRange(7)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg whitespace-nowrap transition">近 7 天</button>
                       <button onClick={() => setQuickRange(30)} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-lg whitespace-nowrap transition">近 30 天</button>
                   </div>
                   <div className="flex items-center gap-2 text-sm bg-slate-50 p-1.5 rounded-xl border border-slate-200 w-full md:w-auto">
                       <input type="date" value={reportRange.start} onChange={e => setReportRange({...reportRange, start: e.target.value})} className="flex-1 bg-transparent border-none outline-none text-slate-700 font-bold px-1 text-xs" />
                       <span className="text-slate-300">-</span>
                       <input type="date" value={reportRange.end} onChange={e => setReportRange({...reportRange, end: e.target.value})} className="flex-1 bg-transparent border-none outline-none text-slate-700 font-bold px-1 text-xs" />
                   </div>
               </div>
           </div>

           <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
               <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                   <div className="text-xs font-bold text-slate-500 mb-1">總已實現收入</div>
                   <div className="text-xl font-black text-slate-800">${Number(aggStats.totalRevenue.toFixed(1)).toLocaleString()}</div>
               </div>
               <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 relative">
                   <div className="text-xs font-bold text-slate-500 mb-1">總已實現成本</div>
                   <div className="text-xl font-black text-slate-800">${Number(aggStats.totalCost.toFixed(1)).toLocaleString()}</div>
                   <div className="absolute top-4 right-4 text-[10px] font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">成本率 {aggStats.costRate.toFixed(1)}%</div>
               </div>
               <div className="bg-green-50 rounded-2xl p-4 border border-green-100 relative">
                   <div className="text-xs font-bold text-green-600 mb-1">總已實現利潤</div>
                   <div className="text-xl font-black text-green-700">${Number(aggStats.totalProfit.toFixed(1)).toLocaleString()}</div>
                   <div className="absolute top-4 right-4 text-[10px] font-bold bg-green-200 text-green-700 px-1.5 py-0.5 rounded">利潤率 {aggStats.profitMargin.toFixed(1)}%</div>
               </div>
               <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                   <div className="text-xs font-bold text-blue-600 mb-1">目前總庫存成本</div>
                   <div className="text-xl font-black text-blue-700">${Number(aggStats.currentStockValue.toFixed(1)).toLocaleString()}</div>
               </div>
           </div>
       </div>

       <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4 pb-2">
         <div className="flex items-center gap-3">
             <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                 <i className="fa-solid fa-box-open text-[#EE4D2D]"></i> 商品列表
             </h2>
             <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                 <button onClick={() => setSelectedIds(new Set(paginatedProducts.map(p => p.id)))} className="text-[10px] font-bold px-2 py-1 hover:bg-white rounded transition shadow-sm">全選</button>
                 <button onClick={() => setSelectedIds(new Set())} className="text-[10px] font-bold px-2 py-1 hover:bg-white rounded transition shadow-sm text-red-500">清空</button>
             </div>
         </div>
         <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
             <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg">
                 <button onClick={() => setProductViewMode('CARD')} className={`p-1.5 rounded transition ${productViewMode === 'CARD' ? 'bg-white shadow-sm text-[#EE4D2D]' : 'text-slate-400 hover:text-slate-600'}`} title="卡片顯示"><i className="fa-solid fa-border-all"></i></button>
                 <button onClick={() => setProductViewMode('LIST')} className={`p-1.5 rounded transition ${productViewMode === 'LIST' ? 'bg-white shadow-sm text-[#EE4D2D]' : 'text-slate-400 hover:text-slate-600'}`} title="列表顯示"><i className="fa-solid fa-list"></i></button>
             </div>
             <button onClick={() => setShowExportModal(true)} className="flex-1 md:flex-none px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold shadow-md hover:bg-slate-700 transition">
                 <i className="fa-solid fa-download mr-1"></i>匯出庫存
             </button>
             <button onClick={() => { 
                 sessionStorage.removeItem('insbuy_new_product_draft'); // ★ 新增：點擊新增時強制清空草稿
                 setForm(getInitialForm()); 
                 setEditingId(null);
                 setActiveTab('create'); 
             }} className="flex-1 md:flex-none px-4 py-2 primary-gradient text-white rounded-xl text-sm font-bold shadow-md hover:opacity-90 transition">
                 + 新增團購
             </button>
         </div>
       </div>

       <div className="space-y-4">
          {paginatedProducts.length === 0 ? <div className="py-20 text-center text-slate-300">目前沒有商品</div> : 
          paginatedProducts.map(p => {
             return (
             <div key={p.id} className={`flex ${productViewMode === 'LIST' ? 'flex-col md:flex-row items-start md:items-center p-4 gap-4' : 'flex-col md:flex-row items-start md:items-center gap-4 p-5'} border border-slate-100 rounded-2xl hover:bg-orange-50/30 hover:border-orange-200 transition group bg-white shadow-sm relative`}>
                 
                 <div className="flex items-center gap-3 shrink-0">
                     <input 
                         type="checkbox" 
                         className="w-5 h-5 accent-[#EE4D2D] cursor-pointer rounded"
                         checked={selectedIds.has(p.id)}
                         onChange={(e) => {
                             const next = new Set(selectedIds);
                             if (e.target.checked) next.add(p.id);
                             else next.delete(p.id);
                             setSelectedIds(next);
                         }}
                     />
                     <div className={`${productViewMode === 'LIST' ? 'w-16 h-16 md:w-12 md:h-12' : 'w-20 h-20'} rounded-xl overflow-hidden border bg-slate-100 relative cursor-pointer`} onClick={() => onNavigate(View.PRODUCT, p)}>
                         <img src={p.images[0] || 'https://placehold.co/100'} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                     </div>
                 </div>

                 <div className={`flex-1 min-w-0 w-full ${productViewMode === 'LIST' ? 'flex flex-col md:flex-row gap-4' : ''}`}>
                     <div className={productViewMode === 'LIST' ? 'w-full md:w-1/3 min-w-0 flex flex-col justify-center' : ''}>
                         <div className="flex items-center gap-2 flex-wrap">
                             <div className="font-black text-slate-800 text-base truncate hover:text-[#EE4D2D] cursor-pointer" onClick={() => onNavigate(View.PRODUCT, p)} title={p.name}>{p.name}</div>
                             {/* ★ 修正：若已經是審核中，就不顯示重複的黑色隱藏標籤 */}
                             {(p as any).is_hidden && !(p as any).is_banned && !(p as any).is_under_review && <span className="bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded font-bold shrink-0 shadow-sm">隱藏</span>}
                             
                             {/* ★ 新增：商品被檢舉隱藏中 / 違規強制下架 標籤 */}
                             {((p as any).is_under_review || (p.report_count !== undefined && p.report_count >= 5)) && !(p as any).is_banned && (
                                <span className="bg-red-50 border border-red-200 text-red-600 text-[10px] px-2 py-0.5 rounded font-black shrink-0 flex items-center gap-1 shadow-sm animate-pulse">
                                  <i className="fa-solid fa-triangle-exclamation"></i> 商品已被檢舉等待審核中
                                </span>
                             )}
                             {(p as any).is_banned && (
                                <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded font-black shrink-0 flex items-center gap-1 shadow-sm">
                                  <i className="fa-solid fa-ban"></i> 違規強制下架
                                </span>
                             )}
                         </div>
                         <div className="flex flex-wrap items-center gap-2 mt-1">
                             <div className="text-sm text-[#EE4D2D] font-black">售價: ${p.price.toLocaleString()}</div>
                             {(p.average_cost !== undefined || p.cost !== undefined) && (
                                 <>
                                     <div className="text-xs text-slate-500 font-bold border-l border-slate-300 pl-2">
                                         均成本: ${Number((p.average_cost || p.cost || 0).toFixed(1)).toLocaleString()}
                                     </div>
                                 </>
                             )}
                         </div>
                     </div>

                     {/* ★ 全新改版：各規格獨立顯示財務指標 */}
                     <div className={`w-full ${productViewMode === 'LIST' ? 'md:flex-1' : 'mt-4'} bg-slate-50 p-2 md:p-3 rounded-xl border border-slate-100`}>
                         <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                             {p.variants?.map((v, vIdx) => {
                                 const vName = v.name || '單一規格';
                                 const vCost = v.cost || p.average_cost || p.cost || 0;
                                 const vStats = getVariantFinancials(p, vName, vCost);
                                 
                                 return (
                                     <div key={vIdx} className="flex flex-col bg-white border border-slate-200 rounded-lg p-2 md:p-3 text-xs gap-2 shadow-sm relative">
                                         <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                             <span className="text-slate-800 font-bold truncate pr-2 flex-1" title={vName}>{vName}</span>
                                             <div className="flex items-center gap-2 shrink-0">
                                                 <span className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${v.stock <= 5 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                                                     庫存: {v.stock}
                                                 </span>
                                                 <span className="text-[10px] text-slate-500 font-bold bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 hidden md:block">
                                                     總成本: ${Number((v.stock * vCost).toFixed(1)).toLocaleString()}
                                                 </span>
                                                 <button 
                                                     onClick={() => setShowSalesForProduct({product: p, variantName: vName, buyers: vStats.buyers})} 
                                                     className="font-black text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded hover:bg-blue-600 hover:text-white transition shadow-sm flex items-center gap-1 text-[10px]"
                                                 >
                                                     <i className="fa-solid fa-chart-line"></i>銷量: {vStats.salesQty}
                                                 </button>
                                                 {/* ★ 新增：專屬此規格的盤點補貨按鈕 */}
                                                 <button 
                                                     onClick={() => setRestockData({product: p, variantIndex: vIdx})} 
                                                     className="font-black text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded hover:bg-green-600 hover:text-white transition shadow-sm flex items-center gap-1 text-[10px]"
                                                 >
                                                     <i className="fa-solid fa-boxes-stacked"></i>盤點補貨
                                                 </button>
                                             </div>
                                         </div>
                                         <div className="grid grid-cols-2 md:grid-cols-4 gap-1 md:gap-2 text-[10px] md:text-xs">
                                             <div className="bg-slate-50 p-1.5 rounded flex flex-col">
                                                 <span className="text-slate-400">已實現收入</span>
                                                 <span className="font-black text-slate-700">${Number(vStats.realizedRevenue.toFixed(1)).toLocaleString()}</span>
                                             </div>
                                             <div className="bg-slate-50 p-1.5 rounded flex flex-col">
                                                 <span className="text-slate-400">已實現成本</span>
                                                 <span className="font-black text-slate-700">
                                                     ${Number(vStats.realizedCost.toFixed(1)).toLocaleString()} 
                                                     <span className="text-[9px] text-slate-400 ml-1 font-normal">({vStats.costRate.toFixed(1)}%)</span>
                                                 </span>
                                             </div>
                                             <div className="bg-green-50 border border-green-100 p-1.5 rounded flex flex-col">
                                                 <span className="text-green-600">已實現利潤</span>
                                                 <span className="font-black text-green-700">${Number(vStats.profit.toFixed(1)).toLocaleString()}</span>
                                             </div>
                                             <div className="bg-green-50 border border-green-100 p-1.5 rounded flex flex-col">
                                                 <span className="text-green-600">總利潤率</span>
                                                 <span className="font-black text-green-700">{vStats.profitMargin.toFixed(1)}%</span>
                                             </div>
                                         </div>
                                     </div>
                                 );
                             })}
                         </div>
                     </div>
                 </div>

                 {/* 按鈕操作區塊 */}
                 <div className="flex flex-wrap md:flex-col gap-2 shrink-0 w-full md:w-auto justify-end mt-2 md:mt-0 border-t md:border-t-0 pt-3 md:pt-0">
                     {/* ★ 新增：我要申訴按鈕 (只有在被檢舉隱藏或強制下架時才出現) */}
                     {((p as any).is_under_review || (p.report_count !== undefined && p.report_count >= 5) || (p as any).is_banned) && (
                         <button 
                            onClick={() => setAppealProduct(p)} 
                            className="flex-1 md:flex-none px-4 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition rounded-xl font-black text-sm flex items-center justify-center border border-red-200 shadow-sm"
                         >
                             <i className="fa-solid fa-scale-balanced mr-1"></i>我要申訴
                         </button>
                     )}

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
       
       {appealProduct && (
         <AppealModal
           targetId={appealProduct.id}
           targetName={appealProduct.name}
           sellerId={appealProduct.shop_id}
           onClose={() => setAppealProduct(null)}
         />
       )}

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