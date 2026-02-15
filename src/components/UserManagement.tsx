import React, { useState, useMemo, useEffect } from 'react';
import { User, View, LevelConfig, SiteSettings, Order } from '../types'; 
import API from '../api';
import ChatRoom from './ChatRoom';

interface UserManagementProps {
  currentUser: User | null;
  users: User[];
  orders: Order[];
  permissions: LevelConfig[];
  siteSettings: SiteSettings;
  onUpdateUsers: (users: User[]) => void;
  onUpdatePermissions: (permissions: LevelConfig[]) => void;
  onUpdateSiteSettings: (settings: SiteSettings) => void;
  onNavigate: (view: View) => void;
  onUpdateOrderStatus: (orderId: string, status: Order['status'], cancellationReason?: string) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ currentUser, users, orders, permissions, siteSettings, onUpdateUsers, onUpdatePermissions, onUpdateSiteSettings, onNavigate, onUpdateOrderStatus }) => {
  const [activeTab, setActiveTab] = useState<'ADMIN' | 'SELLER' | 'BUYER' | 'PERMISSIONS' | 'WEBSITE' | 'FINANCE'>('ADMIN');
  
  const [permissionType, setPermissionType] = useState<'SELLER' | 'BUYER'>('SELLER');

  const [websiteSettingType, setWebsiteSettingType] = useState<'ANNOUNCEMENT' | 'TOS' | 'PRIVACY' | 'DISCLAIMER' | 'HELP' | 'SCAM'>('ANNOUNCEMENT');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<User>>({});
  const [searchTerm, setSearchTerm] = useState('');
  
  const [userPage, setUserPage] = useState(1);
  const USERS_PER_PAGE = 10;

  const [editingLevelKey, setEditingLevelKey] = useState<string | null>(null);
  const [permissionForm, setPermissionForm] = useState<Partial<LevelConfig>>({});
  
  const [settingsForm, setSettingsForm] = useState<SiteSettings>(siteSettings);

  const [financeTimeRange, setFinanceTimeRange] = useState<'ALL' | 'YEAR' | 'MONTH' | 'TODAY' | 'LAST_MONTH' | 'CUSTOM'>('ALL');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [expandedSellerId, setExpandedSellerId] = useState<string | null>(null);

  const [sortField, setSortField] = useState<'REVENUE' | 'ORDERS' | 'CANCELLED'>('REVENUE');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');

  const [settlementRate, setSettlementRate] = useState<number>(5); 
  const [settlementMsg, setSettlementMsg] = useState<string>('這是本月的結算單，請於 5 日內完成繳費。');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState<Partial<User>>({
    name: '',
    phone: '',
    email: '',
    password: '',
    level: 1,
    role: 'BUYER'
  });

  // ★ 新增：用於調閱對話紀錄的使用者狀態
  const [inspectChatUser, setInspectChatUser] = useState<User | null>(null);

  useEffect(() => {
    setUserPage(1);
  }, [activeTab, searchTerm]);

  // 當外部 settings 更新時同步
  useEffect(() => {
    setSettingsForm(siteSettings);
  }, [siteSettings]);

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

  const handleDelete = async (id: string) => {
    if (currentUser && id === currentUser.id) return alert('無法刪除當前登入的帳號');
    if (confirm('確定要刪除此資料列嗎？(此操作無法復原)')) {
      try {
        await API.deleteUser(id);
        const freshUsers = await API.getUsers();
        onUpdateUsers(freshUsers);
        alert('刪除成功');
      } catch (e) {
        console.error(e);
        alert('刪除失敗，請檢查後端連線');
      }
    }
  };

  const handleShowPassword = (user: User) => {
    const plain = (user as any).plain_password;
    if (plain) {
      alert(`用戶 [${user.name}] 的原始密碼為：\n\n${plain}`);
    } else {
      alert('此帳號無原始密碼紀錄。\n(可能是舊帳號，或尚未重設過密碼)');
    }
  };

  const handleTriggerForgotPassword = async (user: User) => {
    if (!user.email) return alert('此用戶未設定 Email，無法寄送密碼信。');
    if (!confirm(`確定要寄送密碼信給 ${user.email} 嗎？`)) return;
    
    try {
      if (API.forgotPassword) {
        await API.forgotPassword(user.email);
        alert(`已寄送密碼信至 ${user.email}！`);
      } else {
        alert('API 尚未支援 forgotPassword 功能，請確認 api.ts 是否已更新。');
      }
    } catch (e) {
      alert('寄送失敗，請檢查後端 Log 或確認 Email 是否正確。');
    }
  };

  const handleToggleSuspend = async (user: User) => {
    if (currentUser && user.id === currentUser.id) return alert('無法停用自己');
    const newStatus = !user.is_suspended;
    const action = newStatus ? '停用' : '啟用';
    
    if (confirm(`確定要${action} [${user.name}] 嗎？\n停用後該帳號將無法登入，且商品會被隱藏。`)) {
        try {
            await API.updateUser({ ...user, is_suspended: newStatus });
            const freshUsers = await API.getUsers();
            onUpdateUsers(freshUsers);
            alert(`已${action}該帳號`);
        } catch (e) {
            alert('操作失敗');
        }
    }
  };

  const handleSendSettlement = async (sellerId: string, sellerName: string, revenue: number) => {
      const fee = Math.round(revenue * (settlementRate / 100));
      const rangeText = financeTimeRange === 'CUSTOM' ? `${customStartDate} ~ ${customEndDate}` : financeTimeRange;
      const chatMessage = `本期系統維護費用為 $${fee.toLocaleString()}\n${settlementMsg}`;
      const confirmMessage = `【系統結算通知】\n商家：${sellerName}\n統計區間：${rangeText}\n總營收(不含取消)：$${revenue.toLocaleString()}\n平台抽成 (${settlementRate}%)：$${fee.toLocaleString()}\n\n將發送以下聊聊訊息給商家：\n----------------\n${chatMessage}\n----------------`;

      if (confirm(confirmMessage)) {
          try {
             await API.sendMessage({
                 senderId: 'ADMIN', 
                 receiverId: sellerId,
                 content: chatMessage,
                 timestamp: new Date().toISOString()
             });
             alert('結算單與聊聊通知已發送成功！');
          } catch (e) {
             console.error(e);
             alert('發送失敗，請檢查 API 連線');
          }
      }
  };

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

  const handleSaveSettings = () => {
    onUpdateSiteSettings(settingsForm);
    alert('網站資料與註冊設定已更新！');
  };

  const handleAnnouncementImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 2 * 1024 * 1024) return alert('圖片大小不能超過 2MB');
          const reader = new FileReader();
          reader.onloadend = () => {
              setSettingsForm(prev => ({ ...prev, announcementImage: reader.result as string }));
          };
          reader.readAsDataURL(file);
      }
  };

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
      const createdUser: User = {
        id: '', 
        name: newUser.name!,
        phone: newUser.phone!,
        email: newUser.email || '',
        password: newUser.password!,
        role: role,
        level: newUser.level || 1,
        shop_id: role === 'SELLER' ? `S-${Date.now()}` : undefined,
        created_at: new Date().toISOString(),
        stats: { ratingCount: 0, productCount: 0, followerCount: 0, responseRate: 100, responseTime: '1小時內', joinTime: new Date().toISOString(), averageRating: 0 },
        following: [],
        is_suspended: false
      };
      await API.createUser(createdUser);
      const freshUsers = await API.getUsers();
      onUpdateUsers(freshUsers);
      setShowCreateModal(false);
      alert('帳號建立成功！ID 已由系統自動產生');
    } catch (error) {
      console.error('建立失敗:', error);
      alert('建立失敗，可能是電話或信箱重複');
    }
  };

  const filteredFinanceOrders = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const thisMonthStr = todayStr.slice(0, 7);
    const thisYearStr = todayStr.slice(0, 4);
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonthStr = lastMonthDate.toISOString().slice(0, 7);

    return orders.filter(o => {
      const dateStr = o.created_at.split('T')[0];
      if (financeTimeRange === 'TODAY') return dateStr === todayStr;
      if (financeTimeRange === 'MONTH') return dateStr.startsWith(thisMonthStr);
      if (financeTimeRange === 'LAST_MONTH') return dateStr.startsWith(lastMonthStr);
      if (financeTimeRange === 'YEAR') return dateStr.startsWith(thisYearStr);
      if (financeTimeRange === 'CUSTOM' && (customStartDate || customEndDate)) {
          if (customStartDate && dateStr < customStartDate) return false;
          if (customEndDate && dateStr > customEndDate) return false;
          return true;
      }
      return true;
    });
  }, [orders, financeTimeRange, customStartDate, customEndDate]);

  const aggregatedFinanceData = useMemo(() => {
    const map: Record<string, any> = {};
    users.filter(u => u.role === 'SELLER').forEach(seller => {
      const sId = seller.shop_id || seller.id;
      map[sId] = { shopId: sId, sellerName: seller.shop_name || seller.name, orderCount: 0, totalRevenue: 0, cancelledCount: 0, orders: [] };
    });
    filteredFinanceOrders.forEach(o => {
      if (map[o.shop_id]) {
        if (o.status === 'CANCELLED') { map[o.shop_id].cancelledCount += 1; } 
        else { map[o.shop_id].orderCount += 1; map[o.shop_id].totalRevenue += o.total_amount; }
        map[o.shop_id].orders.push(o);
      }
    });
    let result = Object.values(map);
    result.sort((a: any, b: any) => {
        let valA = 0, valB = 0;
        if (sortField === 'REVENUE') { valA = a.totalRevenue; valB = b.totalRevenue; }
        else if (sortField === 'ORDERS') { valA = a.orderCount; valB = b.orderCount; }
        else if (sortField === 'CANCELLED') { valA = a.cancelledCount; valB = b.cancelledCount; }
        return sortOrder === 'ASC' ? valA - valB : valB - valA;
    });
    return result;
  }, [filteredFinanceOrders, users, sortField, sortOrder]);

  const handleExportCSV = () => {
    const bom = '\uFEFF';
    let csvContent = bom + "商家名稱,商家ID,有效訂單數,取消訂單數,總銷售額(不含取消),系統維護費(預估),統計區間\n";
    aggregatedFinanceData.forEach((row: any) => {
      const estimatedFee = Math.round(row.totalRevenue * (settlementRate / 100));
      csvContent += `"${row.sellerName}","${row.shopId}",${row.orderCount},${row.cancelledCount},${row.totalRevenue},${estimatedFee},${financeTimeRange}\n`;
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

  const handleAdminCancelOrder = (orderId: string) => {
    const reason = prompt('請輸入取消原因 (將發送通知給買賣雙方):');
    if (reason) {
      onUpdateOrderStatus(orderId, 'CANCELLED', `[管理員操作] ${reason}`);
      alert('訂單已強制取消');
    }
  };

  const filteredUsers = useMemo(() => {
     return users
      .filter(u => u.role === activeTab)
      .filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.phone?.includes(searchTerm)
      )
      .sort((a, b) => {
         if (a.created_at && b.created_at) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
         return (b.id > a.id ? 1 : -1);
      });
  }, [users, activeTab, searchTerm]);

  const paginatedUsers = useMemo(() => {
    const startIndex = (userPage - 1) * USERS_PER_PAGE;
    return filteredUsers.slice(startIndex, startIndex + USERS_PER_PAGE);
  }, [filteredUsers, userPage]);

  const totalUserPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);


  const filteredPermissions = permissions
    .filter(p => p.target_role === permissionType)
    .sort((a, b) => a.level - b.level);

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

  // ★ 如果正在查看對話，顯示 ChatRoom
  if (inspectChatUser) {
    return (
        <div className="animate-fade-in space-y-4">
             <div className="flex items-center justify-between mb-4">
                 <h2 className="text-xl font-bold flex items-center gap-2">
                     <i className="fa-regular fa-comments text-[#EE4D2D]"></i>
                     調閱對話紀錄：{inspectChatUser.shop_name || inspectChatUser.name}
                 </h2>
                 <button 
                     onClick={() => setInspectChatUser(null)} 
                     className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300 transition"
                 >
                     <i className="fa-solid fa-arrow-left mr-2"></i> 返回列表
                 </button>
             </div>
             {/* 這裡我們將 inspectChatUser 作為 currentUser 傳入，
                讓 ChatRoom 認為當前用戶是該使用者，從而拉取其對話紀錄。
                並開啟 readOnly 模式。
             */}
             <ChatRoom 
                currentUser={inspectChatUser} 
                targetId={null} 
                allUsers={users} 
                siteSettings={siteSettings}
                readOnly={true}
             />
        </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-4 pb-20">
      <div className="bg-slate-800 p-4 rounded-t-xl text-white shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <i className="fa-solid fa-users-gear text-[#EE4D2D]"></i>
              使用者管理中心
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-1">系統總人數: {users.length}</p>
          </div>
          
          <div className="flex gap-3 items-center">
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
              onClick={() => onNavigate(View.CHAT)}
              className="px-4 py-2 bg-slate-700 text-white rounded-lg font-bold text-sm flex items-center gap-2 transition hover:bg-slate-600 border border-slate-600"
            >
              <i className="fa-regular fa-comments"></i> 管理員聊聊
            </button>

            <button 
              onClick={openCreateModal}
              className="px-4 py-2 bg-[#EE4D2D] hover:bg-[#d73211] text-white rounded-lg font-bold text-sm flex items-center gap-2 transition shadow-md"
            >
              <i className="fa-solid fa-user-plus"></i> 新增帳號
            </button>
          </div>
        </div>
      </div>

      <div className="flex bg-white border-b border-slate-200 overflow-x-auto">
        {['ADMIN', 'SELLER', 'BUYER', 'FINANCE', 'PERMISSIONS', 'WEBSITE'].map(tab => (
           <button 
             key={tab}
             onClick={() => setActiveTab(tab as any)}
             className={`flex-1 py-3 px-4 min-w-[120px] text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === tab ? 'border-[#EE4D2D] text-[#EE4D2D] bg-orange-50/20' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
           >
             {tab === 'ADMIN' && <i className="fa-solid fa-user-shield"></i>}
             {tab === 'SELLER' && <i className="fa-solid fa-store"></i>}
             {tab === 'BUYER' && <i className="fa-solid fa-users"></i>}
             {tab === 'FINANCE' && <i className="fa-solid fa-coins"></i>}
             {tab === 'PERMISSIONS' && <i className="fa-solid fa-sliders"></i>}
             {tab === 'WEBSITE' && <i className="fa-solid fa-globe"></i>}
             {tab === 'ADMIN' ? '管理員' : tab === 'SELLER' ? '商家夥伴' : tab === 'BUYER' ? '一般會員' : tab === 'FINANCE' ? '營收與訂單' : tab === 'PERMISSIONS' ? '權限設定' : '網站設定'}
           </button>
        ))}
      </div>

      {activeTab === 'FINANCE' && (
        <div className="bg-white border border-slate-300 shadow-sm min-h-[300px]">
           <div className="p-6 bg-slate-50 border-b border-slate-200">
              <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><i className="fa-solid fa-calculator"></i> 結算設定</h3>
              <div className="flex flex-col md:flex-row gap-4 mb-4">
                 <div className="flex-1">
                    <label className="text-xs font-bold text-slate-500 mb-1 block">平台抽成比例 (%)</label>
                    <input type="number" className="w-full border border-slate-300 rounded-lg p-2" value={settlementRate} onChange={e => setSettlementRate(Number(e.target.value))} />
                 </div>
                 <div className="flex-[3]">
                    <label className="text-xs font-bold text-slate-500 mb-1 block">結算通知訊息</label>
                    <input type="text" className="w-full border border-slate-300 rounded-lg p-2" value={settlementMsg} onChange={e => setSettlementMsg(e.target.value)} />
                 </div>
              </div>
           </div>
           
           <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
              <div className="flex gap-2">
                 {['ALL', 'YEAR', 'MONTH', 'TODAY', 'LAST_MONTH', 'CUSTOM'].map(range => (
                    <button key={range} onClick={() => setFinanceTimeRange(range as any)} className={`px-3 py-1 rounded text-xs font-bold ${financeTimeRange === range ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'}`}>
                       {range === 'ALL' ? '全部' : range === 'YEAR' ? '今年' : range === 'MONTH' ? '本月' : range === 'TODAY' ? '今日' : range === 'LAST_MONTH' ? '上月' : '自訂區間'}
                    </button>
                 ))}
              </div>
              {financeTimeRange === 'CUSTOM' && (
                 <div className="flex gap-2 text-xs items-center">
                    <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="border rounded p-1" />
                    <span>~</span>
                    <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="border rounded p-1" />
                 </div>
              )}
              <div className="flex gap-2">
                 <select className="border rounded px-2 py-1 text-xs outline-none" value={sortField} onChange={e => setSortField(e.target.value as any)}>
                    <option value="REVENUE">排序: 總營收</option>
                    <option value="ORDERS">排序: 訂單數</option>
                    <option value="CANCELLED">排序: 取消數</option>
                 </select>
                 <select className="border rounded px-2 py-1 text-xs outline-none" value={sortOrder} onChange={e => setSortOrder(e.target.value as any)}>
                    <option value="DESC">降序 (高到低)</option>
                    <option value="ASC">升序 (低到高)</option>
                 </select>
                 <button onClick={handleExportCSV} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold hover:bg-green-700">匯出 CSV</button>
              </div>
           </div>

           <div className="overflow-x-auto">
             <table className="w-full text-left border-collapse font-mono text-sm">
               <thead>
                 <tr className="bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
                   <th className="border border-slate-300 px-4 py-3">商家名稱</th>
                   <th className="border border-slate-300 px-4 py-3 text-center">訂單數</th>
                   <th className="border border-slate-300 px-4 py-3 text-center">取消數</th>
                   <th className="border border-slate-300 px-4 py-3 text-right">總營收</th>
                   <th className="border border-slate-300 px-4 py-3 text-right">系統維護費</th>
                   <th className="border border-slate-300 px-4 py-3 text-center">結算操作</th>
                 </tr>
               </thead>
               <tbody>
                 {aggregatedFinanceData.map((data: any, idx: number) => {
                    const isExpanded = expandedSellerId === data.shopId;
                    const estimatedFee = Math.round(data.totalRevenue * (settlementRate / 100));
                    return (
                    <React.Fragment key={data.shopId}>
                      <tr className={`hover:bg-slate-50 transition cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`} onClick={() => setExpandedSellerId(isExpanded ? null : data.shopId)}>
                        <td className="border border-slate-300 px-4 py-3 font-bold text-slate-700">
                           <div className="flex items-center gap-2">
                              {isExpanded ? <i className="fa-solid fa-chevron-down text-slate-400"></i> : <i className="fa-solid fa-chevron-right text-slate-400"></i>}
                              {data.sellerName}
                              <span className="text-[10px] text-slate-400 font-mono ml-1">({data.shopId})</span>
                           </div>
                        </td>
                        <td className="border border-slate-300 px-4 py-3 text-center font-bold text-blue-600">{data.orderCount}</td>
                        <td className="border border-slate-300 px-4 py-3 text-center font-bold text-red-500">{data.cancelledCount}</td>
                        <td className="border border-slate-300 px-4 py-3 text-right font-black text-slate-800">${data.totalRevenue.toLocaleString()}</td>
                        <td className="border border-slate-300 px-4 py-3 text-right font-bold text-green-600">${estimatedFee.toLocaleString()}</td>
                        <td className="border border-slate-300 px-4 py-3 text-center">
                           <button onClick={(e) => { e.stopPropagation(); handleSendSettlement(data.shopId, data.sellerName, data.totalRevenue); }} className="bg-slate-800 text-white px-3 py-1 rounded text-xs hover:bg-slate-700">
                              發送結算單
                           </button>
                        </td>
                      </tr>
                      {isExpanded && (
                         <tr>
                            <td colSpan={6} className="bg-slate-50 p-4 border border-slate-300 shadow-inner">
                               <div className="text-xs font-bold text-slate-500 mb-2">訂單明細 ({data.orders.length} 筆)</div>
                               <div className="max-h-64 overflow-y-auto border rounded bg-white">
                                  <table className="w-full text-xs">
                                     <thead>
                                        <tr className="bg-slate-100 text-slate-500">
                                           <th className="p-2 text-left">訂單編號</th>
                                           <th className="p-2 text-left">日期</th>
                                           <th className="p-2 text-right">金額</th>
                                           <th className="p-2 text-center">狀態</th>
                                           <th className="p-2 text-center">操作</th>
                                        </tr>
                                     </thead>
                                     <tbody>
                                        {data.orders.map((o: Order) => (
                                           <tr key={o.id} className="border-b last:border-0 hover:bg-blue-50">
                                              <td className="p-2 font-mono">{o.id}</td>
                                              <td className="p-2">{new Date(o.created_at).toLocaleDateString()}</td>
                                              <td className="p-2 text-right font-bold">${o.total_amount.toLocaleString()}</td>
                                              <td className="p-2 text-center">
                                                 <span className={`px-2 py-0.5 rounded ${o.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : o.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                                                    {o.status}
                                                 </span>
                                              </td>
                                              <td className="p-2 text-center">
                                                 {o.status !== 'CANCELLED' && o.status !== 'COMPLETED' && (
                                                    <button onClick={() => handleAdminCancelOrder(o.id)} className="text-red-500 hover:underline">強制取消</button>
                                                 )}
                                              </td>
                                           </tr>
                                        ))}
                                     </tbody>
                                  </table>
                                </div>
                            </td>
                         </tr>
                      )}
                    </React.Fragment>
                 )})}
                 {aggregatedFinanceData.length === 0 && (
                    <tr><td colSpan={6} className="p-8 text-center text-slate-400">尚無營收資料</td></tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {activeTab === 'WEBSITE' && (
        <div className="bg-white p-8 border border-slate-300 shadow-sm min-h-[300px] animate-fade-in">
           <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center gap-4">
              <label className="font-bold text-slate-600 text-sm whitespace-nowrap"><i className="fa-solid fa-gear mr-2"></i>選擇設定項目：</label>
              <select className="flex-1 h-12 border border-slate-300 rounded-lg px-4 text-slate-700 font-bold outline-none" value={websiteSettingType} onChange={(e) => setWebsiteSettingType(e.target.value as any)}>
                <option value="ANNOUNCEMENT">🔔 首頁全站公告設定</option>
                <option value="TOS">📜 會員服務條款</option>
                <option value="PRIVACY">🔒 隱私權條款</option> 
                <option value="DISCLAIMER">⚖️ 免責聲明</option>
                <option value="HELP">❓ 幫助中心與常見問題</option>
                <option value="SCAM">🛡️ 聊聊防詐騙警語</option>
              </select>
            </div>

            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 flex flex-col gap-3">
                <h4 className="font-bold text-slate-700 flex items-center gap-2">
                    <i className="fa-solid fa-user-lock"></i>
                    會員/商家註冊功能控制
                </h4>
                <p className="text-xs text-slate-500">
                    控制是否開放新使用者註冊。關閉後，登入頁面的註冊按鈕將會顯示暫停服務。
                </p>
                <div className="flex gap-3 mt-2">
                    <button 
                        onClick={() => setSettingsForm({...settingsForm, registrationEnabled: true})}
                        className={`flex-1 py-3 rounded-xl font-black transition flex items-center justify-center gap-2 ${settingsForm.registrationEnabled !== false ? 'bg-green-500 text-white shadow-lg scale-[1.02]' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                    >
                        <i className="fa-solid fa-circle-check"></i> 開放註冊
                    </button>
                    <button 
                        onClick={() => setSettingsForm({...settingsForm, registrationEnabled: false})}
                        className={`flex-1 py-3 rounded-xl font-black transition flex items-center justify-center gap-2 ${settingsForm.registrationEnabled === false ? 'bg-red-500 text-white shadow-lg scale-[1.02]' : 'bg-white border border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                    >
                        <i className="fa-solid fa-ban"></i> 暫停註冊
                    </button>
                </div>
                <div className="text-center mt-2">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${settingsForm.registrationEnabled !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        目前狀態：{settingsForm.registrationEnabled !== false ? '開放中' : '已暫停'}
                    </span>
                </div>
            </div>

            {websiteSettingType === 'ANNOUNCEMENT' && (
               <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center gap-2 mb-2">
                     <input type="checkbox" id="annoActive" checked={settingsForm.announcementActive} onChange={e => setSettingsForm({...settingsForm, announcementActive: e.target.checked})} className="w-5 h-5 accent-[#EE4D2D]" />
                     <label htmlFor="annoActive" className="font-bold text-slate-700 cursor-pointer">啟用全站公告彈窗 (使用者每天首次進入時顯示)</label>
                  </div>
                  
                  <div>
                     <label className="block text-xs font-bold text-slate-500 mb-1">公告圖片 (可選)</label>
                     <div className="flex items-center gap-4">
                        {settingsForm.announcementImage && (
                           <img src={settingsForm.announcementImage} className="h-20 w-20 object-cover rounded border" alt="Preview" />
                        )}
                        <input type="file" accept="image/*" onChange={handleAnnouncementImageUpload} className="text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                        {settingsForm.announcementImage && (
                           <button onClick={() => setSettingsForm({...settingsForm, announcementImage: ''})} className="text-red-500 text-xs hover:underline">移除圖片</button>
                        )}
                     </div>
                  </div>

                  <textarea className="w-full h-64 border border-slate-300 rounded-xl p-4 outline-none focus:border-[#EE4D2D]" value={settingsForm.announcement} onChange={e => setSettingsForm({...settingsForm, announcement: e.target.value})} placeholder="請輸入公告內容 (支援簡單 HTML)..." />
               </div>
            )}

            {websiteSettingType === 'TOS' && (
               <div className="space-y-4 animate-fade-in">
                  <label className="font-bold text-slate-700 block">服務條款內容</label>
                  <textarea className="w-full h-96 border border-slate-300 rounded-xl p-4 outline-none focus:border-[#EE4D2D] font-mono text-sm" value={settingsForm.termsOfService} onChange={e => setSettingsForm({...settingsForm, termsOfService: e.target.value})} />
               </div>
            )}

            {websiteSettingType === 'PRIVACY' && (
               <div className="space-y-4 animate-fade-in">
                  <label className="font-bold text-slate-700 block">隱私權條款內容</label>
                  <textarea className="w-full h-96 border border-slate-300 rounded-xl p-4 outline-none focus:border-[#EE4D2D] font-mono text-sm" value={settingsForm.privacyPolicy} onChange={e => setSettingsForm({...settingsForm, privacyPolicy: e.target.value})} />
               </div>
            )}

            {websiteSettingType === 'DISCLAIMER' && (
               <div className="space-y-4 animate-fade-in">
                  <label className="font-bold text-slate-700 block">免責聲明內容</label>
                  <textarea className="w-full h-96 border border-slate-300 rounded-xl p-4 outline-none focus:border-[#EE4D2D] font-mono text-sm" value={settingsForm.disclaimer} onChange={e => setSettingsForm({...settingsForm, disclaimer: e.target.value})} />
               </div>
            )}

            {websiteSettingType === 'HELP' && (
               <div className="space-y-4 animate-fade-in">
                  <label className="font-bold text-slate-700 block">幫助中心內容 (HTML)</label>
                  <textarea className="w-full h-96 border border-slate-300 rounded-xl p-4 outline-none focus:border-[#EE4D2D] font-mono text-sm" value={settingsForm.helpCenter} onChange={e => setSettingsForm({...settingsForm, helpCenter: e.target.value})} />
               </div>
            )}

            {websiteSettingType === 'SCAM' && (
               <div className="space-y-4 animate-fade-in">
                  <label className="font-bold text-slate-700 block">防詐騙警語 (顯示於聊聊視窗頂部)</label>
                  <input type="text" className="w-full h-12 border border-slate-300 rounded-xl px-4 outline-none focus:border-[#EE4D2D]" value={settingsForm.antiScamMessage || ''} onChange={e => setSettingsForm({...settingsForm, antiScamMessage: e.target.value})} placeholder="例如: 本平台不會要求您操作 ATM 解除分期付款..." />
               </div>
            )}

             <div className="flex justify-end pt-4 border-t border-slate-100">
              <button onClick={handleSaveSettings} className="px-8 py-3 primary-gradient text-white rounded-xl font-black shadow-lg">儲存所有設定</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'PERMISSIONS' && (
        <div className="bg-white border border-slate-300 shadow-sm overflow-x-auto min-h-[300px]">
           <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center sticky left-0">
              <div className="flex gap-2">
                 <button onClick={() => setPermissionType('SELLER')} className={`px-4 py-2 rounded-lg font-bold text-sm ${permissionType === 'SELLER' ? 'bg-[#EE4D2D] text-white' : 'bg-white border text-slate-600'}`}>商家等級設定</button>
                 <button onClick={() => setPermissionType('BUYER')} className={`px-4 py-2 rounded-lg font-bold text-sm ${permissionType === 'BUYER' ? 'bg-blue-600 text-white' : 'bg-white border text-slate-600'}`}>會員等級設定</button>
              </div>
              <button onClick={handleAddLevel} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-700">+ 新增等級</button>
           </div>
           <table className="w-full text-left border-collapse font-mono text-sm">
             <thead>
               <tr className="bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
                 <th className="border border-slate-300 px-4 py-2 w-16 text-center">等級</th>
                 <th className="border border-slate-300 px-4 py-2 w-32">名稱</th>
                 <th className="border border-slate-300 px-4 py-2 w-24 text-center">商品上限</th>
                 <th className="border border-slate-300 px-4 py-2 w-24 text-center">圖片/品</th>
                 <th className="border border-slate-300 px-4 py-2 w-24 text-center">規格/品</th>
                 <th className="border border-slate-300 px-4 py-2 w-24 text-center">修改架上</th>
                 <th className="border border-slate-300 px-4 py-2 w-24 text-center">點數回饋</th>
                 <th className="border border-slate-300 px-4 py-2 w-24 text-center">折扣率</th>
                 <th className="border border-slate-300 px-4 py-2 w-24 text-center">操作</th>
               </tr>
             </thead>
             <tbody>{filteredPermissions.map(p => {
                const isEditing = editingLevelKey === `${p.target_role}-${p.level}`;
                return (
                   <tr key={`${p.target_role}-${p.level}`} className={isEditing ? 'bg-yellow-50' : 'bg-white'}>
                      <td className="border border-slate-300 px-2 py-2 text-center font-bold">{p.level}</td>
                      <td className="border border-slate-300 px-2 py-2">
                         {isEditing ? <input className="w-full border rounded px-2 py-1" value={permissionForm.role_name} onChange={e => setPermissionForm({...permissionForm, role_name: e.target.value})} /> : p.role_name}
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-center">
                         {isEditing ? <input type="number" className="w-full border rounded px-2 py-1 text-center" value={permissionForm.max_products} onChange={e => setPermissionForm({...permissionForm, max_products: parseInt(e.target.value)})} /> : (p.max_products === 0 ? '無限制' : p.max_products)}
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-center">
                         {isEditing ? <input type="number" className="w-full border rounded px-2 py-1 text-center" value={permissionForm.max_images_per_product} onChange={e => setPermissionForm({...permissionForm, max_images_per_product: parseInt(e.target.value)})} /> : p.max_images_per_product}
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-center">
                         {isEditing ? <input type="number" className="w-full border rounded px-2 py-1 text-center" value={permissionForm.max_variants_per_product} onChange={e => setPermissionForm({...permissionForm, max_variants_per_product: parseInt(e.target.value)})} /> : p.max_variants_per_product}
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-center">
                         {isEditing ? <input type="checkbox" checked={permissionForm.can_edit_active_product} onChange={e => setPermissionForm({...permissionForm, can_edit_active_product: e.target.checked})} /> : (p.can_edit_active_product ? '✅' : '❌')}
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-center">
                         {isEditing ? <input type="number" step="0.01" className="w-full border rounded px-2 py-1 text-center" value={permissionForm.point_feedback_rate} onChange={e => setPermissionForm({...permissionForm, point_feedback_rate: parseFloat(e.target.value)})} /> : `${(p.point_feedback_rate * 100).toFixed(1)}%`}
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-center">
                         {isEditing ? <input type="number" step="0.01" className="w-full border rounded px-2 py-1 text-center" value={permissionForm.discount_rate} onChange={e => setPermissionForm({...permissionForm, discount_rate: parseFloat(e.target.value)})} /> : `${(p.discount_rate * 100).toFixed(0)}%`}
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-center">
                         {isEditing ? (
                            <button onClick={handleSavePermission} className="bg-green-500 text-white px-3 py-1 rounded text-xs">儲存</button>
                         ) : (
                            <button onClick={() => handleStartPermissionEdit(p)} className="bg-blue-500 text-white px-3 py-1 rounded text-xs">編輯</button>
                         )}
                      </td>
                   </tr>
                );
             })}</tbody>
           </table>
        </div>
      )}

      {(activeTab === 'ADMIN' || activeTab === 'SELLER' || activeTab === 'BUYER') && (
        <div className="bg-white border border-slate-300 shadow-sm overflow-x-auto min-h-[300px]">
          <table className="w-full text-left border-collapse font-mono text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">
                <th className="border border-slate-300 px-4 py-2 w-32">編號 (ID)</th>
                <th className="border border-slate-300 px-4 py-2 w-32">姓名 (Name)</th>
                <th className="border border-slate-300 px-4 py-2 w-24">角色</th>
                <th className="border border-slate-300 px-4 py-2 w-20 text-center">狀態</th>
                <th className="border border-slate-300 px-4 py-2 w-20 text-center">Lv</th>
                <th className="border border-slate-300 px-4 py-2 w-48">Email</th>
                <th className="border border-slate-300 px-4 py-2 w-36">電話 (Phone)</th>
                <th className="border border-slate-300 px-4 py-2 w-32">密碼 (Pwd)</th>
                <th className="border border-slate-300 px-4 py-2 w-48 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400">
                    沒有符合條件的資料
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((u, index) => {
                  const isEditing = editingId === u.id;
                  const isRowAdmin = u.level === 99;
                  return (
                    <tr key={u.id} className={`hover:bg-blue-50/50 transition ${u.is_suspended ? 'bg-red-50' : index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
                      <td className="border border-slate-300 px-2 py-1 text-center text-slate-600 text-xs select-all font-bold">{u.id}</td>
                      <td className="border border-slate-300 px-0 py-0 relative align-top">
                        {isEditing ? (
                          <div className="space-y-1 p-1">
                             <input 
                               className="w-full px-2 py-1 bg-yellow-50 outline-none text-blue-700 font-bold border border-yellow-200 rounded text-xs" 
                               value={editForm.name} 
                               onChange={e => setEditForm({...editForm, name: e.target.value})} 
                               autoFocus 
                               placeholder="姓名"
                             />
                             {u.role === 'SELLER' && (
                               <input 
                                 className="w-full px-2 py-1 bg-orange-50 outline-none text-[#EE4D2D] font-bold border border-orange-200 rounded text-xs" 
                                 value={editForm.shop_name !== undefined ? editForm.shop_name : (u.shop_name || '')} 
                                 onChange={e => setEditForm({...editForm, shop_name: e.target.value})} 
                                 placeholder="商店名稱"
                               />
                             )}
                          </div>
                        ) : (
                          <div className="px-3 py-2">
                             <div className="text-slate-800 font-medium truncate">{u.name}</div>
                             {u.role === 'SELLER' && u.shop_name && (
                                <div className="text-[10px] text-[#EE4D2D] font-bold mt-1">
                                   <i className="fa-solid fa-store mr-1"></i>{u.shop_name}
                                </div>
                             )}
                          </div>
                        )}
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-xs font-bold text-slate-500">{u.role}</td>
                      <td className="border border-slate-300 px-3 py-2 text-center">
                         {u.is_suspended ? (
                            <span className="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">已停用</span>
                         ) : (
                            <span className="bg-green-100 text-green-600 px-2 py-1 rounded text-xs font-bold">正常</span>
                         )}
                      </td>
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
                            {/* ★ 新增：查看對話按鈕 */}
                            <button onClick={() => setInspectChatUser(u)} className="w-6 h-6 text-teal-500 hover:bg-teal-50 rounded flex items-center justify-center transition" title="查看對話紀錄"><i className="fa-regular fa-comments text-xs"></i></button>

                            <button onClick={() => handleStartEdit(u)} className="w-6 h-6 text-blue-500 hover:bg-blue-50 rounded flex items-center justify-center transition" title="編輯"><i className="fa-solid fa-pen text-xs"></i></button>
                            
                            <button onClick={() => handleShowPassword(u)} className="w-6 h-6 text-purple-500 hover:bg-purple-50 rounded flex items-center justify-center transition" title="查看原始密碼"><i className="fa-regular fa-eye text-xs"></i></button>

                            <button onClick={() => handleTriggerForgotPassword(u)} className="w-6 h-6 text-orange-500 hover:bg-orange-50 rounded flex items-center justify-center transition" title="寄送密碼信"><i className="fa-solid fa-paper-plane text-xs"></i></button>

                            {u.role !== 'ADMIN' && (
                                <button onClick={() => handleToggleSuspend(u)} className={`w-6 h-6 rounded flex items-center justify-center transition ${u.is_suspended ? 'text-green-500 hover:bg-green-50' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`} title={u.is_suspended ? '解除停用' : '停用帳號'}>
                                   <i className={`fa-solid ${u.is_suspended ? 'fa-unlock' : 'fa-ban'}`}></i>
                                </button>
                            )}

                            <button onClick={() => handleDelete(u.id)} className="w-6 h-6 text-red-400 hover:bg-red-50 rounded flex items-center justify-center transition" title="刪除"><i className="fa-solid fa-trash text-xs"></i></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {totalUserPages > 1 && (
            <div className="flex justify-center items-center gap-4 py-4 bg-white border-t border-slate-200">
              <button 
                onClick={() => setUserPage(p => Math.max(1, p - 1))}
                disabled={userPage === 1}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50 text-xs font-bold"
              >
                <i className="fa-solid fa-chevron-left mr-1"></i> 上一頁
              </button>
              <span className="text-xs font-bold text-slate-600">
                  第 {userPage} 頁 / 共 {totalUserPages} 頁
              </span>
              <button 
                onClick={() => setUserPage(p => Math.min(totalUserPages, p + 1))}
                disabled={userPage === totalUserPages}
                className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50 text-xs font-bold"
              >
                下一頁 <i className="fa-solid fa-chevron-right ml-1"></i>
              </button>
            </div>
          )}
        </div>
      )}

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
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">姓名</label><input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#EE4D2D]" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} placeholder="輸入姓名" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">電話 (帳號)</label><input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#EE4D2D]" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} placeholder="09xxxxxxxx" /></div>
              </div>
              <div className="space-y-1"><label className="text-xs font-bold text-slate-500">電子信箱</label><input type="email" className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#EE4D2D]" value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})} placeholder="example@email.com" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">密碼</label><input type="text" className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#EE4D2D] font-mono" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} placeholder="設定密碼" /></div>
                <div className="space-y-1"><label className="text-xs font-bold text-slate-500">等級 (Level)</label><input type="number" className="w-full p-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#EE4D2D] text-center font-bold" value={newUser.level} onChange={e => setNewUser({...newUser, level: parseInt(e.target.value) || 1})} /></div>
              </div>
              <div className="text-[10px] text-slate-400 bg-slate-50 p-2 rounded">
                <i className="fa-solid fa-circle-info mr-1"></i> ID 將由系統自動生成：YYYYMMDD流水號
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