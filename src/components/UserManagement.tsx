
import React, { useState, useMemo } from 'react';
import { User, View, LevelConfig, SiteSettings, Order } from '../types'; 
import API from '../api';

interface UserManagementProps {
  currentUser: User | null;
  users: User[];
  orders: Order[]; // 新增：接收全部訂單資料
  permissions: LevelConfig[];
  siteSettings: SiteSettings;
  onUpdateUsers: (users: User[]) => void;
  onUpdatePermissions: (permissions: LevelConfig[]) => void;
  onUpdateSiteSettings: (settings: SiteSettings) => void;
  onNavigate: (view: View) => void;
  onUpdateOrderStatus: (orderId: string, status: Order['status'], cancellationReason?: string) => void; // 新增：取消訂單用
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUser, users, orders, permissions, siteSettings, onUpdateUsers, onUpdatePermissions, onUpdateSiteSettings, onNavigate, onUpdateOrderStatus }) => {
  const [activeTab, setActiveTab] = useState<'ADMIN' | 'SELLER' | 'BUYER' | 'PERMISSIONS' | 'WEBSITE' | 'FINANCE'>('ADMIN');
  
  // 權限設定頁面內部的分頁狀態
  const [permissionType, setPermissionType] = useState<'SELLER' | 'BUYER'>('SELLER');

  // 網站設定內部的分頁狀態
  const [websiteSettingType, setWebsiteSettingType] = useState<'ANNOUNCEMENT' | 'TOS' | 'DISCLAIMER' | 'HELP'>('ANNOUNCEMENT');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [searchTerm, setSearchTerm] = useState('');
  
  // 權限表格編輯狀態
  const [editingLevelKey, setEditingLevelKey] = useState<string | null>(null);
  const [permissionForm, setPermissionForm] = useState<Partial<LevelConfig>>({});
  
  // 網站設定編輯狀態
  const [settingsForm, setSettingsForm] = useState<SiteSettings>(siteSettings);

  // 財務管理相關狀態
  const [financeTimeRange, setFinanceTimeRange] = useState<'ALL' | 'YEAR' | 'MONTH' | 'TODAY'>('ALL');
  const [expandedSellerId, setExpandedSellerId] = useState<string | null>(null);

  // 新增帳號相關 State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState<Partial<User>>({
    name: '',
    phone: '',
    email: '',
    password: '',
    level: 1,
    role: 'BUYER'
  });

  // ID 生成邏輯
  const generateUserId = (role: 'BUYER' | 'SELLER' | 'ADMIN') => {
    const HZPrefix = role === 'BUYER' ? 'B' : role === 'SELLER' ? 'S' : 'A';
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`; 

    const todayPrefix = `${HZPrefix}${dateStr}`;
    const existingIds = users
      .map(u => u.id)
      .filter(id => id.startsWith(todayPrefix));

    let sequence = 1;
    if (existingIds.length > 0) {
      const maxSeq = Math.max(...existingIds.map(id => parseInt(id.slice(-4)) || 0));
      sequence = maxSeq + 1;
    }

    return `${todayPrefix}${String(sequence).padStart(4, '0')}`;
  };

  // 使用者編輯功能 (開始編輯)
  const handleStartEdit = (user: User) => {
    setEditingId(user.id);
    setEditForm(user);
  };

  const handleSave = async (id: string) => {
    if (!editForm.name) return;
    try {
      const userToUpdate = users.find(u => u.id === id);
      if (userToUpdate) {
         await API.updateUser({ ...userToUpdate, ...editForm });
         const freshUsers = await API.getUsers();
         onUpdateUsers(freshUsers);
         setEditingId(null);
         alert('更新成功！');
      }
    } catch (error) {
      console.error(error);
      alert('更新失敗，請檢查後端連線');
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleDelete = (id: string) => {
    if (currentUser && id === currentUser.id) return alert('無法刪除當前登入的帳號');
    if (confirm('確定要刪除此資料列嗎？')) {
      onUpdateUsers(users.filter(u => u.id !== id));
    }
  };

  // 權限表格編輯功能
  const handleStartPermissionEdit = (config: LevelConfig) => {
    setEditingLevelKey(`${config.target_role}-${config.level}`);
    setPermissionForm(config);
  };

  const handleSavePermission = () => {
    if (!editingLevelKey) return;
    
    const [role, levelStr] = editingLevelKey.split('-');
    const level = parseInt(levelStr);

    const updated = permissions.map(p => 
      (p.target_role === role && p.level === level) 
        ? { ...p, ...permissionForm } 
        : p
    );
    onUpdatePermissions(updated);
    setEditingLevelKey(null);
  };

  const handleAddLevel = () => {
    const currentTypeConfigs = permissions.filter(p => p.target_role === permissionType);
    const maxLevel = currentTypeConfigs.length > 0 
      ? Math.max(...currentTypeConfigs.map(p => p.level)) 
      : 0;
    
    const newLevelNum = maxLevel + 1;

    if (permissionType === 'SELLER' && newLevelNum > 10) return alert('商家等級上限為 10');
    if (permissionType === 'BUYER' && newLevelNum > 5) return alert('會員等級上限為 5');
    
    const newLevelConfig: LevelConfig = {
      target_role: permissionType,
      level: newLevelNum,
      role_name: `新${permissionType === 'SELLER' ? '商家' : '會員'}等級`,
      max_products: permissionType === 'SELLER' ? 5 : 0,
      max_images_per_product: 3,
      max_variants_per_product: 3,
      can_edit_active_product: false,
      point_feedback_rate: 0,
      discount_rate: 1
    };

    onUpdatePermissions([...permissions, newLevelConfig]);
    setEditingLevelKey(`${permissionType}-${newLevelNum}`);
    setPermissionForm(newLevelConfig);
  };

  // 網站設定儲存
  const handleSaveSettings = () => {
    onUpdateSiteSettings(settingsForm);
    alert('網站資料設定已更新！\n公告將在使用者下次每天首次登入時顯示。');
  };

  // 新增帳號相關功能
  const openCreateModal = () => {
    const defaultRole = (activeTab === 'PERMISSIONS' || activeTab === 'WEBSITE' || activeTab === 'FINANCE') ? 'BUYER' : activeTab;
    setNewUser({
      name: '',
      phone: '',
      email: '',
      password: '',
      role: defaultRole,
      level: defaultRole === 'ADMIN' ? 99 : (defaultRole === 'SELLER' ? 1 : 1)
    });
    setShowCreateModal(true);
  };

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.phone || !newUser.password) {
      alert('請填寫姓名、電話與密碼');
      return;
    }

    try {
      const role = newUser.role as 'ADMIN' | 'SELLER' | 'BUYER';
      const newId = generateUserId(role);

      const createdUser: User = {
        id: newId,
        name: newUser.name!,
        phone: newUser.phone!,
        email: newUser.email || '',
        password: newUser.password!,
        role: role,
        level: newUser.level || 1,
        shop_id: role === 'SELLER' ? `S-${Date.now()}` : undefined,
        created_at: new Date().toISOString(),
        stats: { ratingCount: 0, productCount: 0, followerCount: 0, responseRate: 100, responseTime: '1小時內', joinTime: new Date().toISOString(), averageRating: 0 },
        following: []
      };

      await API.createUser(createdUser);
      const freshUsers = await API.getUsers();
      onUpdateUsers(freshUsers);

      setShowCreateModal(false);
      alert('帳號建立成功！');
      
    } catch (error) {
      console.error('建立失敗:', error);
      alert('建立失敗，請查看 Console (F12)');
    }
  };

  // --- 財務/營收相關邏輯 (Hooks 必須在 return 前執行) ---
  
  // 1. 根據時間範圍篩選訂單
  const filteredFinanceOrders = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const thisMonthStr = todayStr.slice(0, 7);
    const thisYearStr = todayStr.slice(0, 4);

    return orders.filter(o => {
      // 僅計算非取消且非待處理的訂單 (假設 CONFIRMED/SHIPPED/COMPLETED 算入業績)
      if (o.status === 'CANCELLED') return false; 
      
      const dateStr = o.created_at.split('T')[0];
      if (financeTimeRange === 'TODAY') return dateStr === todayStr;
      if (financeTimeRange === 'MONTH') return dateStr.startsWith(thisMonthStr);
      if (financeTimeRange === 'YEAR') return dateStr.startsWith(thisYearStr);
      return true;
    });
  }, [orders, financeTimeRange]);

  // 2. 依照賣家 ID 聚合資料
  const aggregatedFinanceData = useMemo(() => {
    const map: Record<string, {
      shopId: string;
      sellerName: string;
      orderCount: number;
      totalRevenue: number;
      orders: Order[];
    }> = {};

    // 初始化所有賣家 (避免沒有訂單的賣家不顯示)
    users.filter(u => u.role === 'SELLER').forEach(seller => {
      const sId = seller.shop_id || seller.id;
      map[sId] = {
        shopId: sId,
        sellerName: seller.shop_name || seller.name,
        orderCount: 0,
        totalRevenue: 0,
        orders: []
      };
    });

    // 填入訂單數據
    filteredFinanceOrders.forEach(o => {
      if (map[o.shop_id]) {
        map[o.shop_id].orderCount += 1;
        map[o.shop_id].totalRevenue += o.total_amount;
        map[o.shop_id].orders.push(o);
      }
    });

    return Object.values(map);
  }, [filteredFinanceOrders, users]);

  // 3. 匯出 CSV 功能
  const handleExportCSV = () => {
    const bom = '\uFEFF';
    let csvContent = bom + "商家名稱,商家ID,訂單總數,總銷售額,統計區間\n";
    
    aggregatedFinanceData.forEach(row => {
      csvContent += `"${row.sellerName}","${row.shopId}",${row.orderCount},${row.totalRevenue},${financeTimeRange}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `sales_report_${financeTimeRange}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 4. 管理員強制取消訂單
  const handleAdminCancelOrder = (orderId: string) => {
    const reason = prompt('請輸入取消原因 (將發送通知給買賣雙方):');
    if (reason) {
      onUpdateOrderStatus(orderId, 'CANCELLED', `[管理員操作] ${reason}`);
      alert('訂單已強制取消');
    }
  };

  const filteredUsers = users
    .filter(u => u.role === activeTab)
    .filter(u => 
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.phone.includes(searchTerm)
    );

  const filteredPermissions = permissions
    .filter(p => p.target_role === permissionType)
    .sort((a, b) => a.level - b.level);

  // 權限檢查 (移到底部，確保所有 Hooks 都已經執行過)
  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-xl border border-slate-100">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 text-3xl"><i className="fa-solid fa-lock"></i></div>
        <h2 className="text-xl font-black text-slate-800 mb-2">存取受限</h2>
        <p className="text-slate-400 text-sm mb-8">請先登入後存取檔案。</p>
        <button onClick={() => onNavigate(View.AUTH)} className="px-10 py-3 primary-gradient text-white font-bold rounded-2xl shadow-lg">前往登入</button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4 pb-20">
      {/* 頂部工具列 */}
      <div className="bg-slate-800 p-4 rounded-t-xl text-white shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <i className="fa-solid fa-users-gear text-[#EE4D2D]"></i>
              使用者管理中心
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-1">系統總人數: {users.length}</p>
          </div>
          
          <div className="flex gap-3">
             <div className="flex gap-2 items-center bg-slate-700 p-2 rounded-lg border border-slate-600">
              <i className="fa-solid fa-magnifying-glass text-slate-400 text-xs ml-1"></i>
              <input 
                type="text" 
                placeholder="搜尋姓名/電話/Email..." 
                className="bg-transparent text-sm text-white placeholder-slate-500 outline-none w-48 font-mono"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <button 
              onClick={openCreateModal}
              className="px-4 py-2 bg-[#EE4D2D] hover:bg-[#d73211] text-white rounded-lg font-bold text-sm flex items-center gap-2 transition shadow-md"
            >
              <i className="fa-solid fa-user-plus"></i> 新增帳號
            </button>
          </div>
        </div>
      </div>

      {/* 分頁籤 (Tabs) */}
      <div className="flex bg-white border-b border-slate-200 overflow-x-auto">
        <button 
          onClick={() => setActiveTab('ADMIN')}
          className={`flex-1 py-3 px-4 min-w-[120px] text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'ADMIN' ? 'border-[#EE4D2D] text-[#EE4D2D] bg-orange-50/20' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <i className="fa-solid fa-user-shield"></i> 管理員
        </button>
        <button 
          onClick={() => setActiveTab('SELLER')}
          className={`flex-1 py-3 px-4 min-w-[120px] text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'SELLER' ? 'border-[#EE4D2D] text-[#EE4D2D] bg-orange-50/20' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <i className="fa-solid fa-store"></i> 商家夥伴
        </button>
        <button 
          onClick={() => setActiveTab('BUYER')}
          className={`flex-1 py-3 px-4 min-w-[120px] text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'BUYER' ? 'border-[#EE4D2D] text-[#EE4D2D] bg-orange-50/20' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <i className="fa-solid fa-users"></i> 一般會員
        </button>
        <button 
          onClick={() => setActiveTab('FINANCE')}
          className={`flex-1 py-3 px-4 min-w-[120px] text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'FINANCE' ? 'border-[#EE4D2D] text-[#EE4D2D] bg-orange-50/20' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <i className="fa-solid fa-coins"></i> 營收與訂單
        </button>
        <button 
          onClick={() => setActiveTab('PERMISSIONS')}
          className={`flex-1 py-3 px-4 min-w-[120px] text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'PERMISSIONS' ? 'border-[#EE4D2D] text-[#EE4D2D] bg-orange-50/20' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <i className="fa-solid fa-sliders"></i> 權限設定
        </button>
        <button 
          onClick={() => setActiveTab('WEBSITE')}
          className={`flex-1 py-3 px-4 min-w-[120px] text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'WEBSITE' ? 'border-[#EE4D2D] text-[#EE4D2D] bg-orange-50/20' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <i className="fa-solid fa-globe"></i> 網站設定
        </button>
      </div>

      {/* 財務與訂單管理 Tab */}
      {activeTab === 'FINANCE' && (
        <div className="bg-white border border-slate-300 shadow-sm min-h-[300px]">
           <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex gap-2">
                 {['ALL', 'YEAR', 'MONTH', 'TODAY'].map(t => (
                   <button 
                     key={t}
                     onClick={() => setFinanceTimeRange(t as any)}
                     className={`px-4 py-2 text-xs font-bold rounded-lg border transition ${financeTimeRange === t ? 'bg-[#EE4D2D] text-white border-[#EE4D2D]' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}`}
                   >
                     {t === 'ALL' ? '全部時段' : t === 'YEAR' ? '本年度' : t === 'MONTH' ? '本月' : '今日'}
                   </button>
                 ))}
              </div>
              <button 
                onClick={handleExportCSV}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-xs flex items-center gap-2 shadow-sm"
              >
                <i className="fa-solid fa-file-csv"></i> 下載報表 (管理費計算)
              </button>
           </div>

           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse font-mono text-sm">
               <thead>
                 <tr className="bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
                   <th className="border border-slate-300 px-4 py-3">商家名稱</th>
                   <th className="border border-slate-300 px-4 py-3 text-center">訂單數</th>
                   <th className="border border-slate-300 px-4 py-3 text-right">總銷售額</th>
                   <th className="border border-slate-300 px-4 py-3 text-center">操作</th>
                 </tr>
               </thead>
               <tbody>
                 {aggregatedFinanceData.map((data, idx) => (
                   <React.Fragment key={data.shopId}>
                     <tr className={`hover:bg-blue-50/50 transition ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                        <td className="border border-slate-300 px-4 py-3 font-bold text-slate-700">
                           {data.sellerName} <span className="text-xs text-slate-400 font-normal">({data.shopId})</span>
                        </td>
                        <td className="border border-slate-300 px-4 py-3 text-center">{data.orderCount}</td>
                        <td className="border border-slate-300 px-4 py-3 text-right font-bold text-[#EE4D2D]">
                           ${data.totalRevenue.toLocaleString()}
                        </td>
                        <td className="border border-slate-300 px-4 py-3 text-center">
                           <button 
                             onClick={() => setExpandedSellerId(expandedSellerId === data.shopId ? null : data.shopId)}
                             className="text-blue-500 hover:text-blue-700 font-bold text-xs"
                           >
                             {expandedSellerId === data.shopId ? '收起訂單' : '查看訂單'}
                           </button>
                        </td>
                     </tr>
                     {expandedSellerId === data.shopId && (
                       <tr>
                         <td colSpan={4} className="border border-slate-300 bg-slate-50 p-4">
                            <div className="max-h-60 overflow-y-auto">
                              <table className="w-full text-xs bg-white rounded-lg overflow-hidden shadow-sm">
                                <thead className="bg-slate-200 text-slate-600 font-bold">
                                  <tr>
                                    <th className="p-2">訂單編號</th>
                                    <th className="p-2">日期</th>
                                    <th className="p-2">狀態</th>
                                    <th className="p-2 text-right">金額</th>
                                    <th className="p-2 text-center">管理</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {data.orders.length === 0 ? (
                                    <tr><td colSpan={5} className="p-4 text-center text-slate-400">無訂單資料</td></tr>
                                  ) : (
                                    data.orders.map(o => (
                                      <tr key={o.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                        <td className="p-2 font-mono">{o.id}</td>
                                        <td className="p-2">{new Date(o.created_at).toLocaleDateString()}</td>
                                        <td className="p-2">
                                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                                            o.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                            o.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                            'bg-yellow-100 text-yellow-700'
                                          }`}>
                                            {o.status}
                                          </span>
                                        </td>
                                        <td className="p-2 text-right font-bold">${o.total_amount.toLocaleString()}</td>
                                        <td className="p-2 text-center">
                                          {o.status !== 'CANCELLED' && o.status !== 'COMPLETED' && (
                                            <button 
                                              onClick={() => handleAdminCancelOrder(o.id)}
                                              className="text-red-500 hover:text-red-700 border border-red-200 px-2 py-0.5 rounded hover:bg-red-50 transition"
                                            >
                                              取消
                                            </button>
                                          )}
                                        </td>
                                      </tr>
                                    ))
                                  )}
                                </tbody>
                              </table>
                            </div>
                         </td>
                       </tr>
                     )}
                   </React.Fragment>
                 ))}
                 {aggregatedFinanceData.length === 0 && (
                   <tr><td colSpan={4} className="p-8 text-center text-slate-400">目前無銷售數據</td></tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {/* 內容區域 - 網站設定 */}
      {activeTab === 'WEBSITE' && (
        <div className="bg-white p-8 border border-slate-300 shadow-sm min-h-[300px] animate-fade-in">
          {/* ... (Existing website settings content) ... */}
          {/* 為了節省篇幅，此處省略未變動的 JSX 結構，與上方原始碼保持一致 */}
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center gap-4">
              <label className="font-bold text-slate-600 text-sm whitespace-nowrap">
                <i className="fa-solid fa-gear mr-2"></i>選擇設定項目：
              </label>
              <select 
                className="flex-1 h-12 border border-slate-300 rounded-lg px-4 text-slate-700 font-bold outline-none focus:border-[#EE4D2D] bg-white cursor-pointer"
                value={websiteSettingType}
                onChange={(e) => setWebsiteSettingType(e.target.value as any)}
              >
                <option value="ANNOUNCEMENT">🔔 首頁全站公告設定 (Announcement)</option>
                <option value="TOS">📜 會員服務條款 (Terms)</option>
                <option value="DISCLAIMER">⚠️ 平台免責聲明 (Disclaimer)</option>
                <option value="HELP">❓ 幫助中心內容 (Help Center)</option>
              </select>
            </div>

            <div className="bg-white rounded-xl border border-slate-100 p-1">
              {websiteSettingType === 'ANNOUNCEMENT' && (
                <div className="space-y-6 p-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">全站公告設定</h3>
                      <p className="text-xs text-slate-400">此公告將在使用者每天<span className="text-[#EE4D2D] font-bold">第一次</span>進入網站時彈出顯示。</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${settingsForm.announcementActive ? 'text-green-500' : 'text-slate-400'}`}>
                        {settingsForm.announcementActive ? '啟用中' : '已停用'}
                      </span>
                      <button 
                        onClick={() => setSettingsForm({...settingsForm, announcementActive: !settingsForm.announcementActive})}
                        className={`w-12 h-6 rounded-full relative transition-colors duration-300 ${settingsForm.announcementActive ? 'bg-green-500' : 'bg-slate-300'}`}
                      >
                        <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all duration-300 ${settingsForm.announcementActive ? 'left-7' : 'left-1'}`}></div>
                      </button>
                    </div>
                  </div>
                  <textarea 
                    className="w-full h-48 p-4 border border-slate-200 rounded-xl text-sm focus:border-[#EE4D2D] outline-none resize-none bg-yellow-50/30"
                    value={settingsForm.announcement || ''}
                    onChange={e => setSettingsForm({...settingsForm, announcement: e.target.value})}
                    placeholder="請輸入公告內容... 例如：系統將於今晚 00:00 進行維護，造成不便敬請見諒。"
                  ></textarea>
                </div>
              )}
              {websiteSettingType === 'TOS' && (
                <div className="space-y-2 p-4 animate-fade-in">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                    <i className="fa-solid fa-file-contract mr-2"></i> 會員服務條款內容
                  </label>
                  <textarea 
                    className="w-full h-96 p-4 border border-slate-200 rounded-xl text-sm focus:border-[#EE4D2D] outline-none resize-none"
                    value={settingsForm.termsOfService}
                    onChange={e => setSettingsForm({...settingsForm, termsOfService: e.target.value})}
                    placeholder="輸入會員服務條款..."
                  ></textarea>
                </div>
              )}
              {websiteSettingType === 'DISCLAIMER' && (
                <div className="space-y-2 p-4 animate-fade-in">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                    <i className="fa-solid fa-triangle-exclamation mr-2"></i> 平台免責聲明內容
                  </label>
                  <textarea 
                    className="w-full h-96 p-4 border border-slate-200 rounded-xl text-sm focus:border-[#EE4D2D] outline-none resize-none"
                    value={settingsForm.disclaimer}
                    onChange={e => setSettingsForm({...settingsForm, disclaimer: e.target.value})}
                    placeholder="輸入平台免責聲明..."
                  ></textarea>
                </div>
              )}
              {websiteSettingType === 'HELP' && (
                <div className="space-y-2 p-4 animate-fade-in">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">
                    <i className="fa-solid fa-circle-question mr-2"></i> 幫助中心 (Q&A) 內容
                  </label>
                  <textarea 
                    className="w-full h-96 p-4 border border-slate-200 rounded-xl text-sm focus:border-[#EE4D2D] outline-none resize-none"
                    value={settingsForm.helpCenter}
                    onChange={e => setSettingsForm({...settingsForm, helpCenter: e.target.value})}
                    placeholder="輸入幫助中心 Q&A..."
                  ></textarea>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button 
                onClick={handleSaveSettings}
                className="px-8 py-3 primary-gradient text-white rounded-xl font-black shadow-lg hover:scale-[1.02] active:scale-95 transition flex items-center gap-2"
              >
                <i className="fa-solid fa-floppy-disk"></i> 儲存所有設定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 權限表格內容 */}
      {activeTab === 'PERMISSIONS' && (
        <div className="bg-white border border-slate-300 shadow-sm overflow-x-auto min-h-[300px]">
           {/* ... (Permission Tab Content) ... */}
           {/* 為了節省篇幅，此處省略未變動的 JSX 結構，與上方原始碼保持一致 */}
           <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
             <div className="flex gap-2">
               <button 
                 onClick={() => { setPermissionType('SELLER'); setEditingLevelKey(null); }}
                 className={`px-4 py-2 text-xs font-bold rounded-lg transition border ${permissionType === 'SELLER' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}`}
               >
                 <i className="fa-solid fa-store mr-2"></i> 商家等級設定 (1-10)
               </button>
               <button 
                 onClick={() => { setPermissionType('BUYER'); setEditingLevelKey(null); }}
                 className={`px-4 py-2 text-xs font-bold rounded-lg transition border ${permissionType === 'BUYER' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}`}
               >
                 <i className="fa-solid fa-users mr-2"></i> 會員等級設定 (1-5)
               </button>
             </div>
             
             <button onClick={handleAddLevel} className="text-xs font-bold bg-[#EE4D2D] text-white px-3 py-2 rounded-lg hover:bg-[#d73211] transition flex items-center gap-1 shadow-sm">
               <i className="fa-solid fa-plus"></i> 新增等級 (Next Level)
             </button>
           </div>

           <table className="w-full text-left border-collapse font-mono text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
                <th className="border border-slate-300 px-4 py-2 w-16 text-center">Level</th>
                <th className="border border-slate-300 px-4 py-2 w-48">等級名稱</th>
                {permissionType === 'SELLER' ? (
                  <>
                    <th className="border border-slate-300 px-4 py-2 w-32 text-center">最大銷售商品數</th>
                    <th className="border border-slate-300 px-4 py-2 w-32 text-center">單品圖片上限</th>
                    <th className="border border-slate-300 px-4 py-2 w-32 text-center">單品規格上限</th>
                    <th className="border border-slate-300 px-4 py-2 w-32 text-center">修改銷售中商品</th>
                  </>
                ) : (
                  <>
                    <th className="border border-slate-300 px-4 py-2 w-40 text-center">點數回饋比率</th>
                    <th className="border border-slate-300 px-4 py-2 w-40 text-center">消費折扣比率</th>
                    <th className="border border-slate-300 px-4 py-2 w-auto"></th>
                    <th className="border border-slate-300 px-4 py-2 w-auto"></th>
                  </>
                )}
                <th className="border border-slate-300 px-4 py-2 w-24 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredPermissions.map((p, index) => {
                const currentKey = `${p.target_role}-${p.level}`;
                const isEditing = editingLevelKey === currentKey;
                return (
                  <tr key={currentKey} className={`hover:bg-blue-50/50 transition ${isEditing ? 'bg-yellow-50' : index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                    <td className="border border-slate-300 px-2 py-2 text-center font-bold text-slate-500">{p.level}</td>
                    <td className="border border-slate-300 px-0 py-0 relative">
                        {isEditing ? (
                        <input 
                          type="text"
                          className="w-full h-full px-3 py-2 bg-yellow-50 outline-none text-blue-700 font-bold inset-0 absolute"
                          value={permissionForm.role_name}
                          onChange={e => setPermissionForm({...permissionForm, role_name: e.target.value})}
                        />
                        ) : (
                        <div className="px-3 py-2 font-bold text-slate-700">{p.role_name}</div>
                        )}
                    </td>
                    {permissionType === 'SELLER' && (
                      <>
                        <td className="border border-slate-300 px-0 py-0 relative">
                           {isEditing ? (
                            <input 
                              type="number"
                              className="w-full h-full px-2 text-center bg-yellow-50 outline-none text-blue-700 font-bold inset-0 absolute"
                              value={permissionForm.max_products}
                              onChange={e => setPermissionForm({...permissionForm, max_products: parseInt(e.target.value) || 0})}
                            />
                           ) : (
                            <div className="px-3 py-2 text-center text-slate-800">{p.max_products}</div>
                           )}
                        </td>
                        <td className="border border-slate-300 px-0 py-0 relative">
                           {isEditing ? (
                            <input 
                              type="number"
                              className="w-full h-full px-2 text-center bg-yellow-50 outline-none text-blue-700 font-bold inset-0 absolute"
                              value={permissionForm.max_images_per_product}
                              onChange={e => setPermissionForm({...permissionForm, max_images_per_product: parseInt(e.target.value) || 0})}
                            />
                           ) : (
                            <div className="px-3 py-2 text-center text-slate-800">{p.max_images_per_product}</div>
                           )}
                        </td>
                        <td className="border border-slate-300 px-0 py-0 relative">
                           {isEditing ? (
                            <input 
                              type="number"
                              className="w-full h-full px-2 text-center bg-yellow-50 outline-none text-blue-700 font-bold inset-0 absolute"
                              value={permissionForm.max_variants_per_product}
                              onChange={e => setPermissionForm({...permissionForm, max_variants_per_product: parseInt(e.target.value) || 0})}
                            />
                           ) : (
                            <div className="px-3 py-2 text-center text-slate-800">{p.max_variants_per_product}</div>
                           )}
                        </td>
                        <td className="border border-slate-300 px-0 py-0 relative text-center">
                           {isEditing ? (
                            <input 
                              type="checkbox"
                              className="w-5 h-5 accent-blue-600 mt-2"
                              checked={permissionForm.can_edit_active_product}
                              onChange={e => setPermissionForm({...permissionForm, can_edit_active_product: e.target.checked})}
                            />
                           ) : (
                            <div className="px-3 py-2 text-center">
                              {p.can_edit_active_product ? <i className="fa-solid fa-check text-green-500"></i> : <i className="fa-solid fa-xmark text-slate-300"></i>}
                            </div>
                           )}
                        </td>
                      </>
                    )}
                    {permissionType === 'BUYER' && (
                      <>
                        <td className="border border-slate-300 px-0 py-0 relative">
                           {isEditing ? (
                            <input 
                              type="number"
                              step="0.01"
                              className="w-full h-full px-2 text-center bg-yellow-50 outline-none text-blue-700 font-bold inset-0 absolute"
                              value={permissionForm.point_feedback_rate}
                              onChange={e => setPermissionForm({...permissionForm, point_feedback_rate: parseFloat(e.target.value) || 0})}
                            />
                           ) : (
                            <div className="px-3 py-2 text-center text-slate-800">{(p.point_feedback_rate * 100).toFixed(0)}%</div>
                           )}
                        </td>
                        <td className="border border-slate-300 px-0 py-0 relative">
                           {isEditing ? (
                            <input 
                              type="number"
                              step="0.01"
                              className="w-full h-full px-2 text-center bg-yellow-50 outline-none text-blue-700 font-bold inset-0 absolute"
                              value={permissionForm.discount_rate}
                              onChange={e => setPermissionForm({...permissionForm, discount_rate: parseFloat(e.target.value) || 1})}
                            />
                           ) : (
                            <div className="px-3 py-2 text-center text-slate-800">{(p.discount_rate * 100).toFixed(0)}% ({(100 - p.discount_rate * 100).toFixed(0)}% OFF)</div>
                           )}
                        </td>
                        <td className="border border-slate-300 bg-slate-50"></td>
                        <td className="border border-slate-300 bg-slate-50"></td>
                      </>
                    )}
                    <td className="border border-slate-300 px-2 py-1 text-center">
                      {isEditing ? (
                        <div className="flex gap-1 justify-center">
                          <button onClick={handleSavePermission} className="w-6 h-6 bg-green-500 text-white rounded hover:bg-green-600 flex items-center justify-center shadow-sm"><i className="fa-solid fa-check text-xs"></i></button>
                          <button onClick={() => setEditingLevelKey(null)} className="w-6 h-6 bg-slate-400 text-white rounded hover:bg-slate-500 flex items-center justify-center shadow-sm"><i className="fa-solid fa-xmark text-xs"></i></button>
                        </div>
                      ) : (
                        <button onClick={() => handleStartPermissionEdit(p)} className="w-6 h-6 text-blue-500 hover:bg-blue-50 rounded flex items-center justify-center transition"><i className="fa-solid fa-pen text-xs"></i></button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
           </table>
        </div>
      )}

      {/* 使用者列表 (Admin, Seller, Buyer) */}
      {(activeTab === 'ADMIN' || activeTab === 'SELLER' || activeTab === 'BUYER') && (
        <div className="bg-white border border-slate-300 shadow-sm overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse font-mono text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
                <th className="border border-slate-300 px-4 py-2 w-32">編號 (ID)</th>
                <th className="border border-slate-300 px-4 py-2 w-32">姓名 (Name)</th>
                <th className="border border-slate-300 px-4 py-2 w-24">角色</th>
                <th className="border border-slate-300 px-4 py-2 w-20 text-center">Lv</th>
                <th className="border border-slate-300 px-4 py-2 w-48">Email</th>
                <th className="border border-slate-300 px-4 py-2 w-36">電話 (Phone)</th>
                <th className="border border-slate-300 px-4 py-2 w-32">密碼 (Pwd)</th>
                <th className="border border-slate-300 px-4 py-2 w-24 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    沒有符合條件的資料
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, index) => {
                  const isEditing = editingId === u.id;
                  const isRowAdmin = u.level === 99;
                  return (
                    <tr key={u.id} className={`hover:bg-blue-50/50 transition ${isEditing ? 'bg-yellow-50' : index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                      <td className="border border-slate-300 px-2 py-1 text-center text-slate-600 text-xs select-all font-bold">{u.id}</td>
                      <td className="border border-slate-300 px-0 py-0 relative">
                        {isEditing ? (
                          <input className="w-full h-full px-3 py-2 bg-yellow-50 outline-none text-blue-700 font-bold inset-0 absolute" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} autoFocus />
                        ) : (
                          <div className="px-3 py-2 text-slate-800 font-medium truncate">{u.name}</div>
                        )}
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-xs font-bold text-slate-500">{u.role}</td>
                      <td className="border border-slate-300 px-0 py-0 relative text-center">
                        {isEditing ? (
                          <input type="number" min="1" max="99" className="w-full h-full text-center bg-yellow-50 outline-none font-bold text-slate-800 inset-0 absolute" value={editForm.level} onChange={e => setEditForm({...editForm, level: parseInt(e.target.value) || 1})} />
                        ) : (
                          <div className="px-3 py-2 flex justify-center items-center gap-1">
                            {isRowAdmin && <i className="fa-solid fa-crown text-yellow-500 text-xs animate-pulse"></i>}
                            <span className={`font-bold ${isRowAdmin ? 'text-[#EE4D2D]' : 'text-slate-600'}`}>{u.level}</span>
                          </div>
                        )}
                      </td>
                      <td className="border border-slate-300 px-0 py-0 relative">
                        {isEditing ? (
                          <input className="w-full h-full px-3 bg-yellow-50 outline-none text-slate-700 inset-0 absolute" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} />
                        ) : (
                          <div className="px-3 py-2 text-slate-600 truncate text-xs">{u.email}</div>
                        )}
                      </td>
                      <td className="border border-slate-300 px-0 py-0 relative">
                        {isEditing ? (
                          <input className="w-full h-full px-3 bg-yellow-50 outline-none text-slate-700 inset-0 absolute" value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                        ) : (
                          <div className="px-3 py-2 text-slate-600 font-mono text-xs">{u.phone}</div>
                        )}
                      </td>
                      <td className="border border-slate-300 px-0 py-0 relative">
                        {isEditing ? (
                          <input type="text" className="w-full h-full px-3 bg-yellow-50 outline-none text-red-600 font-mono inset-0 absolute" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} />
                        ) : (
                          <div className="px-3 py-2 group cursor-pointer relative">
                            <span className="text-slate-400 tracking-widest text-xs group-hover:hidden">********</span>
                            <span className="hidden group-hover:block text-red-500 font-mono font-bold text-xs bg-red-50 px-1 rounded">{u.password}</span>
                          </div>
                        )}
                      </td>
                      <td className="border border-slate-300 px-2 py-1 text-center">
                        {isEditing ? (
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => handleSave(u.id)} className="w-6 h-6 bg-green-500 text-white rounded hover:bg-green-600 flex items-center justify-center shadow-sm"><i className="fa-solid fa-check text-xs"></i></button>
                            <button onClick={handleCancel} className="w-6 h-6 bg-slate-400 text-white rounded hover:bg-slate-500 flex items-center justify-center shadow-sm"><i className="fa-solid fa-xmark text-xs"></i></button>
                          </div>
                        ) : (
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => handleStartEdit(u)} className="w-6 h-6 text-blue-500 hover:bg-blue-50 rounded flex items-center justify-center transition"><i className="fa-solid fa-pen text-xs"></i></button>
                            <button onClick={() => handleDelete(u.id)} className="w-6 h-6 text-red-400 hover:bg-red-50 rounded flex items-center justify-center transition"><i className="fa-solid fa-trash text-xs"></i></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 新增帳號彈窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 z-[1100] flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
            <div className="bg-slate-800 p-4 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg"><i className="fa-solid fa-user-plus mr-2"></i>新增帳號</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white transition"><i className="fa-solid fa-xmark text-xl"></i></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">角色權限</label>
                <div className="grid grid-cols-3 gap-2">
                  {['ADMIN', 'SELLER', 'BUYER'].map(r => (
                    <button key={r} onClick={() => setNewUser({...newUser, role: r as any, level: r==='ADMIN'?99:1})} className={`py-2 text-xs font-bold rounded-lg border transition ${newUser.role === r ? 'bg-[#EE4D2D] text-white border-[#EE4D2D]' : 'border-slate-200 text-slate-400 hover:bg-slate-50'}`}>{r}</button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">姓名</label>
                  <input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#EE4D2D]" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} placeholder="輸入姓名" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">電話 (帳號)</label>
                  <input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#EE4D2D]" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} placeholder="09xxxxxxxx" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500">電子信箱</label>
                <input type="email" className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#EE4D2D]" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} placeholder="example@email.com" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">密碼</label>
                  <input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#EE4D2D] font-mono" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} placeholder="設定密碼" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500">等級 (Level)</label>
                  <input type="number" className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#EE4D2D] text-center font-bold" value={newUser.level} onChange={e => setNewUser({...newUser, level: parseInt(e.target.value) || 1})} />
                </div>
              </div>
              <div className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded">
                <i className="fa-solid fa-circle-info mr-1"></i> ID 將依規則自動生成：{newUser.role?.charAt(0)}YYYYMMDD流水號
              </div>
              <button onClick={handleCreateUser} className="w-full py-3 mt-4 primary-gradient text-white rounded-xl font-black shadow-lg hover:scale-[1.02] active:scale-95 transition">確認建立帳號</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
