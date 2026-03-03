import React, { useState, useEffect, useMemo } from 'react';
import { Report, User, Product, View } from '../types';
import API from '../api';

interface AdminReportsProps {
  allUsers: User[];
  allProducts: Product[];
  onNavigate: (view: View, product?: Product, targetId?: string) => void;
}

const AdminReports: React.FC<AdminReportsProps> = ({ allUsers, allProducts, onNavigate }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [appeals, setAppeals] = useState<any[]>([]);
  // ★ 新增 USER_POINTS Tab 頁籤
  const [activeTab, setActiveTab] = useState<'REPORTS' | 'APPEALS' | 'EXCELLENT_SHOPS' | 'USER_POINTS'>('REPORTS');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'REVIEWING' | 'OBSERVING' | 'RESOLVED' | 'DISMISSED'>('PENDING');
  
  // 優良商家手動賦予狀態
  const [searchShopId, setSearchShopId] = useState('');
  const [badgeExpireDate, setBadgeExpireDate] = useState(''); // ★ 新增：優良標章到期日

  // 違規記點查詢狀態
  const [searchUserId, setSearchUserId] = useState('');
  const [queriedUser, setQueriedUser] = useState<User | null>(null);

  useEffect(() => {
    API.getReports().then(res => {
        setReports(res);
        // ★ 自動修復舊資料：將所有還在 PENDING 狀態的檢舉商品，強制同步加上隱藏與審核中標記
        res.forEach((r: any) => {
            if (r.status === 'PENDING' && r.type === 'PRODUCT') {
                const targetId = r.target_id || r.targetId;
                const targetP = allProducts.find(p => p.id === targetId);
                if (targetP && !(targetP as any).is_under_review) {
                     if (API.updateProduct) {
                         API.updateProduct({ ...targetP, is_under_review: true, is_hidden: true } as any).catch(()=>{});
                     }
                }
            }
        });
    }).catch(console.error);
    if (API.getAppeals) API.getAppeals().then(setAppeals).catch(console.error);
  }, [allProducts]);

  // 1. 優先計算賣家總銷售額，作為排序權重
  const sortedReports = useMemo(() => {
    let list = reports;
    if (filterStatus !== 'ALL') {
      list = list.filter(r => r.status === filterStatus);
    }

    return list.sort((a, b) => {
      const sellerA_Id = a.type === 'SHOP' ? a.target_id : allProducts.find(p => p.id === a.target_id)?.shop_id;
      const sellerB_Id = b.type === 'SHOP' ? b.target_id : allProducts.find(p => p.id === b.target_id)?.shop_id;
      
      const sellerA = allUsers.find(u => u.shop_id === sellerA_Id || u.id === sellerA_Id);
      const sellerB = allUsers.find(u => u.shop_id === sellerB_Id || u.id === sellerB_Id);

      const badgeA = sellerA?.has_excellent_badge ? 1 : 0;
      const badgeB = sellerB?.has_excellent_badge ? 1 : 0;

      if (badgeA !== badgeB) return badgeB - badgeA; 

      const levelA = sellerA?.level || 1;
      const levelB = sellerB?.level || 1;

      if (levelA !== levelB) return levelB - levelA; 

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [reports, filterStatus, allUsers, allProducts]);

  // ★ 新增操作：列入觀察 (暫時結案)
  const handleObserveReport = async (report: Report) => {
    if (!confirm('確定要將此檢舉「列入觀察」嗎？\n此操作不會扣除買家信用，也不會警告賣家，案件將移至暫時觀察區。')) return;
    try {
      await API.updateReport(report.id, { status: 'OBSERVING' });
      setReports(reports.map(r => r.id === report.id ? { ...r, status: 'OBSERVING' } : r));
      
      // ★ 恢復商品顯示：同步解除審核中狀態與隱藏狀態
      if (report.type === 'PRODUCT') {
          const targetProduct = allProducts.find(p => p.id === report.target_id || p.id === (report as any).targetId);
          if (targetProduct && API.updateProduct) {
              await API.updateProduct({ ...targetProduct, is_under_review: false, is_hidden: false } as any);
          }
      }
      alert('已成功列入觀察！商品已恢復正常顯示。');
    } catch (e) { alert('操作失敗'); }
  };

  // 操作：駁回檢舉 (處理惡意買家)
  const handleDismissReport = async (report: Report) => {
    if (!confirm('確定要「駁回」此檢舉嗎？\n系統將會自動扣除檢舉人信用評分，若低於0分將被 Shadowban。')) return;
    try {
      await API.updateReport(report.id, { status: 'DISMISSED' });
      setReports(reports.map(r => r.id === report.id ? { ...r, status: 'DISMISSED' } : r));

      // ★ 恢復商品顯示：同步解除審核中狀態與隱藏狀態
      if (report.type === 'PRODUCT') {
          const targetProduct = allProducts.find(p => p.id === report.target_id || p.id === (report as any).targetId);
          if (targetProduct && API.updateProduct) {
              await API.updateProduct({ ...targetProduct, is_under_review: false, is_hidden: false } as any);
          }
      }

      const reporter = allUsers.find(u => u.id === report.reporter_id);
      if (reporter && API.updateUser) {
         const newScore = (reporter.report_trust_score !== undefined ? reporter.report_trust_score : 100) - 20;
         await API.updateUser({ ...reporter, report_trust_score: newScore });
         if (newScore <= 0) alert('【系統通知】該檢舉人信用評分已歸零，已進入 Shadowban 狀態，其未來的檢舉將自動視為無效。');
      }
    } catch (e) { alert('操作失敗'); }
  };

  // 操作：警告賣家 (發送愛聊並記點)
  const handleWarnSeller = async (report: Report) => {
    if (!confirm('確定要「警告」此賣家嗎？\n系統將透過愛聊發送通知，並增加違規記點 1 點。')) return;
    try {
      await API.updateReport(report.id, { status: 'RESOLVED' });
      setReports(reports.map(r => r.id === report.id ? { ...r, status: 'RESOLVED' } : r));

      const sellerId = report.type === 'SHOP' ? report.target_id : allProducts.find(p => p.id === report.target_id)?.shop_id;
      const seller = allUsers.find(u => u.shop_id === sellerId || u.id === sellerId);
      
      if (seller && API.updateUser) {
         const newPoints = (seller.violation_points || 0) + 1;
         await API.updateUser({ ...seller, violation_points: newPoints });

         await API.sendMessage({
             senderId: 'ADMIN',
             receiverId: seller.id,
             content: `[系統警告] 您的${report.type === 'SHOP' ? '賣場' : '商品'}「${report.target_name}」遭檢舉違規已查證屬實。目前累計違規記點：${newPoints} 點。請限期改善，若達3點將遭到停權處分。`,
             timestamp: new Date().toISOString()
         });
         alert('已成功記點並發送警告通知。');
      }
    } catch (e) { alert('操作失敗'); }
  };

  // 操作：強制下架 (針對嚴重違規商品)
  const handleTakedownProduct = async (report: Report) => {
     if (report.type !== 'PRODUCT') return alert('此操作僅適用於商品');
     if (!confirm('確定要「強制下架」此商品嗎？')) return;
     try {
       await API.updateReport(report.id, { status: 'RESOLVED' });
       setReports(reports.map(r => r.id === report.id ? { ...r, status: 'RESOLVED' } : r));

       const targetProduct = allProducts.find(p => p.id === report.target_id);
       if (targetProduct && API.updateProduct) {
           await API.updateProduct({ ...targetProduct, is_banned: true, is_hidden: true, status: 'CLOSED' });
           alert('商品已強制下架，並標記為違規！');
       }
     } catch (e) { alert('操作失敗'); }
  };

  // 操作：手動賦予/拔除優良標章 (包含到期日)
  const handleToggleBadge = async (user: User, isAdding: boolean) => {
     if (isAdding && !badgeExpireDate) return alert('請選擇優良標章的到期日');
     try {
         // ★ 終極修正 3：PostgreSQL 的 TIMESTAMP 欄位不接受空字串 ""，必須明確給予 null 才能清空或表示永久有效
         const finalExpireDate = (isAdding && badgeExpireDate) ? badgeExpireDate : null;
         
         await API.updateUser({ 
             ...user, 
             has_excellent_badge: isAdding,
             hasExcellentBadge: isAdding,
             excellent_badge_expire_at: finalExpireDate,
             excellentBadgeExpireAt: finalExpireDate
         } as any);
         alert(`已${isAdding ? '賦予' : '拔除'}「${user.shop_name || user.name}」的優良標章！`);
         window.location.reload();
     } catch (e) { alert('設定失敗'); }
  };

  const handleSearchUser = () => {
     const target = allUsers.find(u => u.id === searchUserId || u.phone === searchUserId || u.shop_id === searchUserId);
     if (target) {
         setQueriedUser(target);
     } else {
         alert('找不到該使用者，請確認 ID 或手機號碼是否正確。');
         setQueriedUser(null);
     }
  };

  const handleViewReportTarget = (rpt: Report) => {
      const actualTargetId = (rpt as any).targetId || rpt.target_id;
      if (rpt.type === 'PRODUCT') {
          const targetProduct = allProducts.find(p => p.id === actualTargetId);
          if (targetProduct) {
              onNavigate(View.PRODUCT, targetProduct);
          } else {
              alert('找不到該商品，可能已被刪除或下架。');
          }
      } else {
          onNavigate(View.SHOP, undefined, actualTargetId);
      }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 md:p-8 animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
          <i className="fa-solid fa-gavel text-red-500"></i> 智慧檢舉與審核中心
        </h2>
      </div>

      {/* ★ 導覽列：新增使用者記點查詢 Tab */}
      <div className="flex gap-4 mb-6 border-b border-slate-100 pb-2 overflow-x-auto no-scrollbar">
        <button onClick={() => setActiveTab('REPORTS')} className={`font-bold pb-2 border-b-2 transition whitespace-nowrap ${activeTab === 'REPORTS' ? 'text-red-500 border-red-500' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>檢舉案件 ({reports.filter(r => r.status === 'PENDING').length})</button>
        <button onClick={() => setActiveTab('APPEALS')} className={`font-bold pb-2 border-b-2 transition whitespace-nowrap ${activeTab === 'APPEALS' ? 'text-blue-500 border-blue-500' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>申訴案件 ({appeals.filter(a => a.status === 'PENDING').length})</button>
        <button onClick={() => setActiveTab('EXCELLENT_SHOPS')} className={`font-bold pb-2 border-b-2 transition whitespace-nowrap ${activeTab === 'EXCELLENT_SHOPS' ? 'text-yellow-500 border-yellow-500' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>優良商家白名單</button>
        <button onClick={() => setActiveTab('USER_POINTS')} className={`font-bold pb-2 border-b-2 transition whitespace-nowrap ${activeTab === 'USER_POINTS' ? 'text-slate-800 border-slate-800' : 'text-slate-400 border-transparent hover:text-slate-600'}`}>違規記點查詢</button>
      </div>

      {/* 檢舉列表 */}
      {activeTab === 'REPORTS' && (
        <div className="space-y-4">
           {/* ★ 狀態過濾：新增 OBSERVING */}
           <div className="flex gap-2 mb-4 flex-wrap">
              {['ALL', 'PENDING', 'REVIEWING', 'OBSERVING', 'RESOLVED', 'DISMISSED'].map(s => (
                <button key={s} onClick={() => setFilterStatus(s as any)} className={`px-3 py-1 rounded-full text-xs font-bold transition ${filterStatus === s ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-50 border border-slate-100 text-slate-500 hover:bg-slate-100'}`}>{s}</button>
              ))}
           </div>

           {sortedReports.map(rpt => {
              const actualTargetId = (rpt as any).targetId || rpt.target_id;
              
              // ★ 修正 3：若 target_name 遺失，主動從商品庫或會員庫找回，修復「未知目標」與點擊失效問題
              let actualTargetName = (rpt as any).targetName || rpt.target_name;
              if (!actualTargetName || actualTargetName === '未知目標') {
                  if (rpt.type === 'PRODUCT') {
                      const p = allProducts.find(p => p.id === actualTargetId);
                      actualTargetName = p ? p.name : '未知商品';
                  } else {
                      const u = allUsers.find(u => u.id === actualTargetId || u.shop_id === actualTargetId);
                      actualTargetName = u ? (u.shop_name || u.name) : '未知賣場';
                  }
              }

              // ★ 修正 2：若 reporter_name 遺失，主動從會員庫找回真實姓名
              let actualReporterName = (rpt as any).reporterName || rpt.reporter_name;
              if (!actualReporterName || actualReporterName === '未知檢舉人') {
                  const rUser = allUsers.find(u => u.id === (rpt as any).reporterId || u.id === rpt.reporter_id);
                  actualReporterName = rUser ? rUser.name : '未知檢舉人';
              }
              
              const actualCategory = rpt.category || '一般違規';
              
              const sellerId = rpt.type === 'SHOP' ? actualTargetId : allProducts.find(p => p.id === actualTargetId)?.shop_id;
              const seller = allUsers.find(u => u.shop_id === sellerId || u.id === sellerId);
              
              // ★ 解析我們寫入 reason 中的備用圖片網址
              const rawReason = rpt.reason || '無詳細說明';
              const hasEmbeddedImages = rawReason.includes('[佐證圖片連結]:');
              const displayReason = hasEmbeddedImages ? rawReason.split('\n\n[佐證圖片連結]:')[0] : rawReason;
              const embeddedImagesString = hasEmbeddedImages ? rawReason.split('\n\n[佐證圖片連結]:')[1] : '';
              
              // ★ 修正 1：修復圖片無法顯示問題 (改用 ', ' 分割，避免切斷 Base64 圖片編碼自帶的逗號)
              const rptImages = (rpt as any).proof_images && (rpt as any).proof_images.length > 0 ? (rpt as any).proof_images 
                              : (rpt.images && rpt.images.length > 0 ? rpt.images 
                              : (embeddedImagesString ? embeddedImagesString.split(', ').map(s => s.trim()).filter(Boolean) : []));

              return (
                <div key={rpt.id} className="border border-slate-200 rounded-2xl p-5 hover:border-red-200 transition bg-white shadow-sm flex flex-col md:flex-row gap-4">
                   <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                         <span className={`px-2 py-0.5 rounded text-[10px] font-black ${rpt.status === 'PENDING' ? 'bg-yellow-100 text-yellow-600' : rpt.status === 'OBSERVING' ? 'bg-blue-100 text-blue-600' : rpt.status === 'DISMISSED' ? 'bg-slate-200 text-slate-500' : 'bg-green-100 text-green-600'}`}>{rpt.status}</span>
                         <span className="text-xs text-slate-400 font-mono">{new Date(rpt.created_at).toLocaleString()}</span>
                         {seller?.has_excellent_badge && <span className="bg-yellow-50 text-yellow-600 border border-yellow-200 text-[10px] px-2 py-0.5 rounded font-black flex items-center gap-1 shadow-sm"><i className="fa-solid fa-medal"></i> 優良標章豁免審核中</span>}
                      </div>
                      
                      {/* ★ 商品名稱點擊跳轉修復 */}
                      <div 
                         className="font-black text-lg text-slate-800 flex items-center gap-2 cursor-pointer hover:text-[#EE4D2D] transition w-fit"
                         onClick={() => handleViewReportTarget(rpt)}
                         title="點擊前往該商品/賣場頁面"
                      >
                         <i className="fa-solid fa-arrow-up-right-from-square text-xs text-slate-400"></i>
                         {actualTargetName} 
                         <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded ml-2">[{actualCategory}]</span>
                      </div>
                      
                      <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-3 rounded-xl border border-slate-100 whitespace-pre-wrap">{displayReason}</p>
                      
                      {/* ★ 修復圖片顯示 (支援外連點擊) */}
                      {rptImages.length > 0 && (
                         <div className="flex gap-2 mt-3 flex-wrap">
                            {rptImages.map((img: string, i: number) => {
                               if(!img) return null;
                               return (
                                 <a key={i} href={img} target="_blank" rel="noreferrer" className="block w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-slate-200 hover:border-[#EE4D2D] transition shadow-sm">
                                     <img src={img} className="w-full h-full object-cover" />
                                 </a>
                               );
                            })}
                         </div>
                      )}
                      
                      <div className="mt-3 text-[10px] text-slate-400 flex items-center gap-4">
                         <span>檢舉人: {actualReporterName} (IP: {rpt.ip_address || '未知'})</span>
                         <span className="text-red-400 font-bold">賣家累計記點: {seller?.violation_points || 0}</span>
                      </div>
                   </div>

                   <div className="flex flex-col gap-2 shrink-0 md:w-36 justify-center border-t md:border-t-0 md:border-l border-slate-100 pt-3 md:pt-0 md:pl-4">
                      {rpt.status === 'PENDING' && (
                         <>
                            <button onClick={() => handleObserveReport(rpt)} className="w-full py-2 bg-blue-50 text-blue-600 border border-blue-200 font-bold rounded-lg text-xs hover:bg-blue-100 transition"><i className="fa-regular fa-eye mr-1"></i> 列入觀察</button>
                            <button onClick={() => handleDismissReport(rpt)} className="w-full py-2 bg-slate-100 text-slate-600 font-bold rounded-lg text-xs hover:bg-slate-200 transition">駁回 (扣買家信用)</button>
                            <button onClick={() => handleWarnSeller(rpt)} className="w-full py-2 bg-orange-50 text-orange-600 border border-orange-200 font-bold rounded-lg text-xs hover:bg-orange-100 transition">警告 (發訊+記點)</button>
                            {rpt.type === 'PRODUCT' && (
                               <button onClick={() => handleTakedownProduct(rpt)} className="w-full py-2 bg-red-600 text-white font-bold rounded-lg text-xs hover:bg-red-700 shadow-sm shadow-red-200 transition">強制下架商品</button>
                            )}
                         </>
                      )}
                      {rpt.status !== 'PENDING' && (
                         <button onClick={() => handleViewReportTarget(rpt)} className="w-full py-2 bg-slate-800 text-white font-bold rounded-lg text-xs hover:bg-slate-700 transition">進入商品頁查看</button>
                      )}
                   </div>
                </div>
              );
           })}
        </div>
      )}

      {/* 優良商家白名單 */}
      {activeTab === 'EXCELLENT_SHOPS' && (
         <div className="space-y-6">
            <div className="bg-slate-50 p-4 md:p-6 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center gap-4">
               <input 
                  type="text" 
                  placeholder="輸入賣場 ID 進行授權..." 
                  className="w-full md:flex-1 border border-slate-300 rounded-xl px-4 py-3 outline-none focus:border-yellow-500 font-bold"
                  value={searchShopId}
                  onChange={e => setSearchShopId(e.target.value)}
               />
               <div className="w-full md:w-auto flex items-center gap-2 bg-white px-3 py-1 rounded-xl border border-slate-300">
                  <span className="text-xs text-slate-500 font-bold whitespace-nowrap">到期日:</span>
                  <input 
                     type="date" 
                     className="border-none outline-none font-bold text-slate-700 py-2 w-full"
                     value={badgeExpireDate}
                     onChange={e => setBadgeExpireDate(e.target.value)}
                  />
               </div>
               <button 
                  onClick={() => {
                     const user = allUsers.find(u => u.shop_id === searchShopId || u.id === searchShopId);
                     if (!user) return alert('找不到該賣家帳號，請確認 ID 是否正確');
                     
                     // ★ 修正 4：新增確認彈窗，明確顯示賣場資訊與到期日防呆
                     const confirmMsg = `請確認是否確定賦予優良標章？\n\n賣場名稱：${user.shop_name || user.name}\n賣場 ID：${user.shop_id || user.id}\n到期日：${badgeExpireDate || '未設定 (永久有效)'}`;
                     if (window.confirm(confirmMsg)) {
                         handleToggleBadge(user, true);
                     }
                  }}
                  className="w-full md:w-auto bg-yellow-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-yellow-600 shadow-md flex items-center justify-center gap-2"
               >
                  <i className="fa-solid fa-medal"></i> 賦予標章
               </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {allUsers.filter(u => u.has_excellent_badge || (u as any).excellent_badge_expire_at).length === 0 ? (
                   <div className="col-span-1 md:col-span-2 text-center text-slate-400 py-10 font-bold">
                      <i className="fa-solid fa-medal text-4xl mb-3 opacity-20 block"></i>
                      目前尚無優良商家名單
                   </div>
               ) : (
                 allUsers.filter(u => u.has_excellent_badge || (u as any).excellent_badge_expire_at).map(u => (
                    <div key={u.id} className="border border-yellow-200 bg-yellow-50/30 p-4 rounded-2xl flex flex-col gap-3">
                        
                     <div className="flex items-center justify-between border-b border-yellow-200/50 pb-2">
                        <div className="flex items-center gap-3">
                           <div className="w-10 h-10 bg-white rounded-full border-2 border-yellow-400 overflow-hidden flex items-center justify-center shadow-sm shrink-0">
                              <i className="fa-solid fa-medal text-yellow-500 text-lg"></i>
                           </div>
                           <div className="min-w-0">
                              <div className="font-black text-slate-800 truncate">{u.shop_name || u.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono truncate">ID: {u.shop_id || u.id}</div>
                           </div>
                        </div>
                        <button onClick={() => handleToggleBadge(u, false)} className="text-red-500 text-xs font-bold hover:underline px-3 py-1 bg-white rounded-lg border border-red-100 shrink-0">拔除資格</button>
                     </div>
                     <div className="text-xs text-yellow-700 font-bold flex items-center gap-2">
                        <i className="fa-regular fa-calendar-check"></i> 標章效期至：{u.excellent_badge_expire_at || '未設定到期日 (永久有效)'}
                     </div>
                  </div>
                 ))
               )}
            </div>
         </div>
      )}

      {/* ★ 全新功能：使用者記點查詢 */}
      {activeTab === 'USER_POINTS' && (
         <div className="space-y-6">
            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center gap-4">
               <div className="flex-1 w-full relative">
                  <i className="fa-solid fa-magnifying-glass absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                  <input 
                     type="text" 
                     placeholder="輸入使用者 ID、手機號碼或賣場 ID 查詢..." 
                     className="w-full border border-slate-300 rounded-xl pl-10 pr-4 py-3 outline-none focus:border-slate-800 font-bold"
                     value={searchUserId}
                     onChange={e => setSearchUserId(e.target.value)}
                     onKeyDown={e => e.key === 'Enter' && handleSearchUser()}
                  />
               </div>
               <button 
                  onClick={handleSearchUser}
                  className="w-full md:w-auto bg-slate-800 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-700 shadow-md flex items-center justify-center gap-2 transition"
               >
                  查詢記點
               </button>
            </div>

            {queriedUser && (
               <div className="p-6 border-2 border-slate-200 rounded-3xl bg-white shadow-sm flex flex-col md:flex-row gap-8 items-center md:items-start animate-fade-in-up">
                  <div className="w-24 h-24 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center text-3xl text-slate-400 shrink-0">
                     {queriedUser.logo ? <img src={queriedUser.logo} className="w-full h-full rounded-full object-cover" /> : queriedUser.name.charAt(0)}
                  </div>
                  
                  <div className="flex-1 w-full space-y-4">
                     <div className="border-b border-slate-100 pb-4">
                        <div className="text-2xl font-black text-slate-800 mb-1">{queriedUser.name} {queriedUser.shop_name && `(${queriedUser.shop_name})`}</div>
                        <div className="text-sm text-slate-500 font-mono">ID: {queriedUser.id} | 手機: {queriedUser.phone}</div>
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                           <div className="text-xs text-orange-500 font-bold mb-1">身分：賣家 (違規記點)</div>
                           <div className="flex items-end gap-2">
                              <span className="text-4xl font-black text-[#EE4D2D] leading-none">{queriedUser.violation_points || 0}</span>
                              <span className="text-sm text-orange-600 font-bold mb-1">/ 3 點 (達3點即停權)</span>
                           </div>
                           <div className="mt-2 text-[10px] text-orange-400">系統每年會自動歸零記點。</div>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                           <div className="text-xs text-blue-500 font-bold mb-1">身分：買家 (信用評分)</div>
                           <div className="flex items-end gap-2">
                              <span className="text-4xl font-black text-blue-600 leading-none">{queriedUser.report_trust_score !== undefined ? queriedUser.report_trust_score : 100}</span>
                              <span className="text-sm text-blue-600 font-bold mb-1">分 (低於0分即 Shadowban)</span>
                           </div>
                           <div className="mt-2 text-[10px] text-blue-400">滿分 100，惡意檢舉每次扣除 20 分。</div>
                        </div>
                     </div>
                  </div>
               </div>
            )}
         </div>
      )}
    </div>
  );
};

export default AdminReports;