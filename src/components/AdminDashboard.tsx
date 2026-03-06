import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Product, View, Order, ShippingRule, ProductVariant, BankInfo, Category, Report } from '../types'; 
import { generateMarketingCopy } from '../geminiService'; 
import API from '../api'; 
import CategoryManagement from './CategoryManagement';
import ShopSettings from './ShopSettings';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { uploadImageToSupabase } from '../supabaseClient';
import AdminProducts from './AdminProducts';
import AdminOrders from './AdminOrders';
import AdminCustomers from './AdminCustomers';
import AdminAffiliate from './AdminAffiliate';
import ProductImageCropper from './ProductImageCropper';
import AdminOverview from './AdminOverview';
import { SELLER_ORDER_STATUS_OPTIONS, BUYER_ORDER_STATUS_OPTIONS, COLORS } from '../constants';
import AdminProductForm from './AdminProductForm';
import BuyerReport from './BuyerReport'; // ★ 引入全新的買家報表
import AdminAnnouncement from './AdminAnnouncement'; // ★ 新增：引入全站公告後台管理元件
import AdminReports from './AdminReports'; // ★ 新增：引入全站檢舉審核面板
import SellerBookingDashboard from '../booking-crm/SellerBookingDashboard'; // ★ 新增：引入預約系統後台元件


interface AdminDashboardProps {
  user: User;
  permissions?: any[]; // ★ 新增：接收來自系統的會員權限設定表
  siteSettings?: any; // ★ 新增：接收全站設定
  onUpdateSiteSettings?: (settings: any) => void; // ★ 新增：更新全站設定的函式
  products: Product[];
  orders: Order[];
  buyOrders?: Order[];
  categories: Category[];
  systemCategories?: Category[];
  allUsers?: User[]; 
  onUpdateSystemCategories?: (cats: Category[]) => void;
  onUpdateProducts: (products: Product[]) => void;
  onUpdateOrderStatus: (orderId: string, status: Order['status'], cancellationReason?: string, sellerNote?: string) => void;
  onUpdateCategories: (categories: Category[]) => void;
  onUpdateUser: (user: User) => void;
  onNavigate: (view: View, product?: Product, targetId?: string) => void;
  initialTab?: string | null;
  viewedOrderIds?: string[];
  onMarkAsViewed?: (id: string) => void;
  onLogout?: () => void;
}


const exportToExcelXML = (orders: Order[], selectedStatuses: string[], fileName: string) => {
  let xml = '<?xml version="1.0"?>\n';
  xml += '<?mso-application progid="Excel.Sheet"?>\n';
  xml += '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">\n';
  
  xml += '<Styles>\n';
  xml += '<Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Bottom"/><Borders/><Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/><Interior/><NumberFormat/><Protection/></Style>\n';
  xml += '<Style ss:ID="Header"><Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#FFFFFF" ss:Bold="1"/><Interior ss:Color="#EE4D2D" ss:Pattern="Solid"/></Style>\n';
  xml += '</Styles>\n';

  selectedStatuses.forEach(status => {
     const statusLabel = SELLER_ORDER_STATUS_OPTIONS.find(o => o.value === status)?.label || status;
     let sheetOrders: Order[] = [];
     if (status === 'ALL') {
         sheetOrders = orders;
     } else {
         sheetOrders = orders.filter(o => o.status === status);
     }
     
     if (sheetOrders.length > 0) {
        xml += `<Worksheet ss:Name="${statusLabel}">\n`;
        xml += '<Table>\n';
        
        xml += '<Row>\n';
        ['訂單編號', '日期', '顧客姓名', '電話', '總金額', '商品內容', '賣家備註', '顧客備註'].forEach(h => {
           xml += `<Cell ss:StyleID="Header"><Data ss:Type="String">${h}</Data></Cell>\n`;
        });
        xml += '</Row>\n';

        sheetOrders.forEach(o => {
           const itemsStr = o.items.map(i => `${i.name} x${i.qty}`).join('; ');
           xml += '<Row>\n';
           xml += `<Cell><Data ss:Type="String">${o.id}</Data></Cell>\n`;
           xml += `<Cell><Data ss:Type="String">${new Date(o.created_at).toLocaleDateString()}</Data></Cell>\n`;
           xml += `<Cell><Data ss:Type="String">${o.receiver_name}</Data></Cell>\n`;
           xml += `<Cell><Data ss:Type="String">${o.receiver_phone}</Data></Cell>\n`;
           xml += `<Cell><Data ss:Type="Number">${o.total_amount}</Data></Cell>\n`;
           xml += `<Cell><Data ss:Type="String">${itemsStr}</Data></Cell>\n`;
           xml += `<Cell><Data ss:Type="String">${o.seller_note || ''}</Data></Cell>\n`;
           xml += `<Cell><Data ss:Type="String">${o.remarks || ''}</Data></Cell>\n`;
           xml += '</Row>\n';
        });

        xml += '</Table>\n';
        xml += '</Worksheet>\n';
     }
  });

  xml += '</Workbook>';
  
  const blob = new Blob([xml], { type: 'application/vnd.ms-excel' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${fileName}.xls`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  user, products, orders, buyOrders = [], categories, systemCategories = [], allUsers, onUpdateSystemCategories, 
  onUpdateProducts, onUpdateOrderStatus, onUpdateCategories, onUpdateUser, onNavigate, initialTab,
  viewedOrderIds = [], onMarkAsViewed, onLogout,
  permissions = [], // ★ 接收權限設定
  siteSettings, // ★ 新增
  onUpdateSiteSettings // ★ 新增
}) => {

  // ★ 修正：將 shopId 移到元件最上方，避免 Cannot access 'shopId' before initialization 的錯誤
  const shopId = user.shop_id || user.id;

  // ★ 終極修復：如果外部沒傳權限進來，賣家後台自己主動去後端抓！
  const [activePermissions, setActivePermissions] = useState<any[]>(permissions);

  useEffect(() => {
      if (permissions && permissions.length > 0) {
          setActivePermissions(permissions);
      } else {
          // 發現是空的，立刻自己呼叫 API 抓取最新權限
          if (API.getPermissions) {
              API.getPermissions().then(res => {
                  setActivePermissions(res || []);
              }).catch(console.error);
          }
      }
  }, [permissions]);

  // ★ 新增：即時取得目前登入賣家的所屬等級權限
  const sellerConfig = useMemo(() => {
      // 改用剛剛自己抓到的 activePermissions 來比對
      const config = activePermissions.find((p: any) => p.target_role === 'SELLER' && Number(p.level) === Number(user.level));
      
      // 💡 註：這裡的 5 就是你看到的那個 5，這是為了防止系統當機的「保底預設值」
      // 當上面找到 config 後，這個 5 就永遠不會再出現了！
      return config || {
          max_products: 5,
          max_images_per_product: 1,
          max_variants_per_product: 3,
          can_use_preorder: false,
          max_drafts: 3,
          can_view_stats: false,
          can_edit_banner: false,
          can_edit_logo: false
      };
  }, [activePermissions, user.level]);

  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'products' | 'create' | 'categories' | 'settings' | 'affiliate' | 'customers' | 'system_cats' | 'buying_account' | 'buying_orders' | 'buying_reports' | 'reports' | 'announcement' | 'seller_booking'>('overview');
  const [showMobileMenu, setShowMobileMenu] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cropModal, setCropModal] = useState<{ isOpen: boolean, src: string, editIndex: number | null }>({ isOpen: false, src: '', editIndex: null });

  const handleCropComplete = async (croppedBlob: Blob) => {
      try {
          const file = new File([croppedBlob], `product_${Date.now()}.webp`, { type: 'image/webp' });
          const publicUrl = await uploadImageToSupabase(file, 'images');

          if (!publicUrl) {
              alert('圖片上傳失敗，請檢查網路或 Supabase 設定');
              return;
          }

          if (cropModal.editIndex !== null) {
              const newImages = [...(form.images || [])];
              newImages[cropModal.editIndex] = publicUrl;
              setForm(prev => ({ ...prev, images: newImages }));
          } else {
              setForm(prev => ({ ...prev, images: [...(prev.images || []), publicUrl] }));
          }

          setCropModal({ isOpen: false, src: '', editIndex: null });
      } catch (e) {
          console.error('Supabase Upload Error:', e);
          alert('上傳發生錯誤，請稍後再試。');
      }
  };


  const [reports, setReports] = useState<Report[]>([]);
  const [reportPage, setReportPage] = useState(1);
  const REPORTS_PER_PAGE = 10;

  const [orderPage, setOrderPage] = useState(1);
  const [productPage, setProductPage] = useState(1);
  const ORDERS_PER_PAGE = 8;
  const PRODUCTS_PER_PAGE = 10; // ★ 修改：改為每頁顯示 10 個商品

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStatuses, setExportStatuses] = useState<Set<string>>(new Set(['ALL']));
  const [exportAsPickingList, setExportAsPickingList] = useState(false);
  
  const [tempSellerNotes, setTempSellerNotes] = useState<Record<string, string>>({});

  const [originSelect, setOriginSelect] = useState('台北市');
  const [originDistrictSelect, setOriginDistrictSelect] = useState('');
  const [originManual, setOriginManual] = useState('');

  const [globalSearchId, setGlobalSearchId] = useState('');
  
  // ★ 新增：各頁面的顯示模式狀態 (CARD 卡片 / LIST 列表)
  const [orderViewMode, setOrderViewMode] = useState<'CARD' | 'LIST'>('CARD');
  const [productViewMode, setProductViewMode] = useState<'CARD' | 'LIST'>('CARD');
  const [customerViewMode, setCustomerViewMode] = useState<'CARD' | 'LIST'>('CARD');
  const [affiliateViewMode, setAffiliateViewMode] = useState<'CARD' | 'LIST'>('CARD');
  // ★ 新增：匯出格式選擇
  const [exportFormat, setExportFormat] = useState<'EXCEL' | 'NUMBERS'>('EXCEL');
  // ★ 新增：控制瀏覽量明細彈跳視窗的狀態
  const [showViewsModal, setShowViewsModal] = useState(false);

  const [localPaidIds, setLocalPaidIds] = useState<Set<string>>(new Set());
  const [localOrders, setLocalOrders] = useState<Order[]>(orders);

  useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

  // ★ 新增：取得平台瀏覽量資料 (僅管理員需要)
  const [platformViews, setPlatformViews] = useState<Record<string, number>>({});
  useEffect(() => {
      if (user.role === 'ADMIN' && API.getPlatformViews) {
          API.getPlatformViews().then(res => setPlatformViews(res || {})).catch(()=>{});
      }
  }, [user.role]);

  // ★ 修改：黑名單處理函式改為切換 (Toggle) 並支援重新整理
  const handleBlacklist = async (targetUserId: string, targetName: string, isCurrentlyBlacklisted: boolean) => {
      const actionText = isCurrentlyBlacklisted ? '解除黑名單' : '加入黑名單';
      const warningText = isCurrentlyBlacklisted 
          ? `確定要將買家「${targetName}」解除黑名單嗎？`
          : `【警告】確定要將買家「${targetName}」加入黑名單嗎？\n\n加入後：\n1. 該買家將永遠無法看到您的所有商品\n2. 系統會自動記點，被3個不同賣家黑名單將被「強制停權」！`;
          
      if (!confirm(warningText)) return;
      try {
          if(API.blacklistUser) {
              await API.blacklistUser(targetUserId, shopId);
              alert(`✅ 已成功將該買家${actionText}！系統已記錄。`);
              window.location.reload(); // 讓畫面重整載入最新的權限與名單
          }
      } catch (e) {
          alert('操作失敗，請檢查網路連線。');
      }
  };
  
  const myShopProducts = useMemo(() => {
      return products.filter(p => p.shop_id === (user.shop_id || user.id));
  }, [products, user]);

  const outOfStockProducts = useMemo(() => {
      return myShopProducts.filter(p => p.total_stock <= 0 && p.status === 'OPEN');
  }, [myShopProducts]);

  useEffect(() => {
    if (initialTab && (
      initialTab === 'overview' || initialTab === 'orders' || initialTab === 'products' || 
      initialTab === 'create' || initialTab === 'categories' || initialTab === 'settings'
    )) {
      setActiveTab(initialTab as any);
      setShowMobileMenu(false); 
    }
  }, [initialTab]);

  const handleTabChange = (tab: typeof activeTab) => {
      setActiveTab(tab);
      setEditingId(null);
      setShowMobileMenu(false); 
  };

  useEffect(() => {
    if (activeTab === 'reports' && user.role === 'ADMIN') {
      API.getReports().then(setReports).catch(console.error);
    }
  }, [activeTab, user.role]);

  const [overviewRange, setOverviewRange] = useState({
    start: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  
  const [orderRange, setOrderRange] = useState({
    start: '',
    end: ''
  });

  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [customerRange, setCustomerRange] = useState({
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerPage, setCustomerPage] = useState(1);
  const CUSTOMERS_PER_PAGE = 10;
  
  // 新增：排序狀態與展開詳細資訊的狀態
  const [customerSortBy, setCustomerSortBy] = useState<'SPENT_DESC' | 'ORDERS_DESC'>('SPENT_DESC');
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);
  const [customerDetailTab, setCustomerDetailTab] = useState<'ORDERS' | 'ITEMS'>('ORDERS');

  const customerData = useMemo(() => {
    const s = new Date(customerRange.start).setHours(0,0,0,0);
    const e = new Date(customerRange.end).setHours(23,59,59,999);
    
    // 過濾區間內且未取消的訂單
    const validOrders = localOrders.filter(o => {
      const t = new Date(o.created_at).getTime();
      return t >= s && t <= e && o.status !== 'CANCELLED';
    });

    const customerMap: Record<string, any> = {};

    validOrders.forEach(o => {
      const phone = o.receiver_phone;
      if (!customerMap[phone]) {
        const matchedUser = allUsers?.find(u => u.phone === phone);
        customerMap[phone] = {
          phone: phone,
          name: o.receiver_name,
          targetId: matchedUser ? matchedUser.id : phone,
          isBlacklisted: matchedUser ? matchedUser.blacklisted_by?.includes(shopId) : false, // ★ 新增：判斷是否已被此賣家黑名單
          totalSpent: 0,
          totalOrders: 0,
          totalItems: 0,
          lastOrderDate: o.created_at,
          orders: [], // 儲存該客戶的所有訂單
          itemsSummary: {} // 儲存購買商品的統計
        };
      }

      customerMap[phone].totalSpent += o.total_amount;
      customerMap[phone].totalOrders += 1;
      customerMap[phone].totalItems += o.items.reduce((sum, item) => sum + item.qty, 0);
      
      // 將訂單完整存入陣列供展開查看
      customerMap[phone].orders.push(o);

      // 統計購買的商品詳情與數量金額
      o.items.forEach(item => {
         const key = `${item.id}-${item.selectedVariant || 'none'}`;
         if (!customerMap[phone].itemsSummary[key]) {
             customerMap[phone].itemsSummary[key] = {
                 name: item.name,
                 variant: item.selectedVariant,
                 qty: 0,
                 totalAmount: 0,
                 image: item.images?.[0] || 'https://placehold.co/100'
             };
         }
         customerMap[phone].itemsSummary[key].qty += item.qty;
         customerMap[phone].itemsSummary[key].totalAmount += (item.finalPrice || item.price) * item.qty;
      });
      
      if (new Date(o.created_at) > new Date(customerMap[phone].lastOrderDate)) {
        customerMap[phone].lastOrderDate = o.created_at;
        customerMap[phone].name = o.receiver_name;
      }
    });

    let list = Object.values(customerMap);

    if (customerSearchTerm.trim()) {
      const term = customerSearchTerm.toLowerCase();
      list = list.filter(c => 
        c.name.toLowerCase().includes(term) ||
        c.phone.includes(term)
      );
    }

    // 新增：依據選擇的排序方式進行排序
    return list.sort((a, b) => {
        if (customerSortBy === 'ORDERS_DESC') {
            return b.totalOrders - a.totalOrders; // 訂單數：多到少
        }
        return b.totalSpent - a.totalSpent; // 預設消費總額：高到低
    });
  }, [localOrders, customerRange, customerSearchTerm, allUsers, customerSortBy]);

  const paginatedCustomers = useMemo(() => {
    const startIndex = (customerPage - 1) * CUSTOMERS_PER_PAGE;
    return customerData.slice(startIndex, startIndex + CUSTOMERS_PER_PAGE);
  }, [customerData, customerPage]);

  const totalCustomerPages = Math.ceil(customerData.length / CUSTOMERS_PER_PAGE);

  useEffect(() => {
    setOrderPage(1);
  }, [orderStatusFilter, orderSearchTerm, orderRange]);

  const [buyOrderStatusFilter, setBuyOrderStatusFilter] = useState<string>('ALL');
  const [reportStartDate, setReportStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [newSystemCatName, setNewSystemCatName] = useState('');

  // ★ 升級版：網紅分潤系統相關狀態
  const [affiliateLinks, setAffiliateLinks] = useState<any[]>([]);
  const [newLinkData, setNewLinkData] = useState({ influencer_account: '', product_id: '', primary_rate: 10, secondary_rate: 5, code: '', start_date: '', end_date: '' });
  
  // 介面切換狀態
  const [affiliateTab, setAffiliateTab] = useState<'ACTIVE' | 'ENDED'>('ACTIVE');
  const [selectedInfluencerId, setSelectedInfluencerId] = useState<string | null>(null); 
  const [expandedLinkId, setExpandedLinkId] = useState<string | null>(null); 
  const [expandedOrderPage, setExpandedOrderPage] = useState(1); // ★ 新增：專案內「訂單明細」的分頁狀態
  const [affiliatePage, setAffiliatePage] = useState(1); // ★ 補回遺失的分頁狀態

  // ★ 加入：卡片過濾、排序與分頁邏輯
  const filteredAffiliateLinks = useMemo(() => {
      const today = new Date().toISOString().split('T')[0];
      let list = affiliateLinks.filter(link => {
          const isActive = today >= link.start_date && today <= link.end_date;
          if (affiliateTab === 'ACTIVE' && !isActive) return false;
          if (affiliateTab === 'ENDED' && isActive) return false;
          if (selectedInfluencerId && link.influencer_id !== selectedInfluencerId) return false;
          return true;
      });
      // 確保卡片依照建立時間(最新在最上)排序
      // 確保卡片依照建立時間(最新在最上)排序
      return list.sort((a, b) => {
          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return timeB - timeA;
      });
  }, [affiliateLinks, affiliateTab, selectedInfluencerId]);

  const paginatedAffiliateLinks = useMemo(() => {
      const startIndex = (affiliatePage - 1) * 8;
      return filteredAffiliateLinks.slice(startIndex, startIndex + 8);
  }, [filteredAffiliateLinks, affiliatePage]);
  
  const totalAffiliatePages = Math.ceil(filteredAffiliateLinks.length / 8);

  useEffect(() => {
  
      if (API.getAffiliateLinks) {
          API.getAffiliateLinks(shopId).then(setAffiliateLinks).catch(() => {});
      }
  }, [shopId]);

  const handleCreateAffiliateLink = async () => {
      if (!newLinkData.influencer_account || !newLinkData.code || !newLinkData.product_id || !newLinkData.start_date || !newLinkData.end_date) {
          return alert('請填寫完整資訊（包含網紅帳號與活動日期）！');
      }
      if (newLinkData.start_date > newLinkData.end_date) {
          return alert('活動開始日期不能晚於結束日期！');
      }
      try {
          // 1. 驗證網紅帳號是否存在，並取得其 ID 與名稱
          const influencer = await API.getInfluencerByAccount(newLinkData.influencer_account);
          
          // 2. 建立專案
          const created = await API.createAffiliateLink({
              ...newLinkData,
              shop_id: shopId,
              influencer_id: influencer.id,
              influencer_name: influencer.name
          });
          setAffiliateLinks([created, ...affiliateLinks]);
          setNewLinkData({ influencer_account: '', product_id: '', primary_rate: 10, secondary_rate: 5, code: '', start_date: '', end_date: '' });
          alert(`成功與網紅「${influencer.name}」建立分潤專案！`);
      } catch (e: any) {
          alert(e.response?.data?.message || '產生失敗，請檢查網紅帳號是否正確，或時間是否與該網紅其他專案重疊。');
      }
  };

  const handleTerminateLink = async (linkId: string) => {
      if (!confirm('確定要提前結束此分潤活動嗎？\n結束後，買家透過此連結購買將不再計算分潤給網紅。')) return;
      try {
          // 將結束日期改為昨天，強制讓專案過期
          const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
          const updated = await API.updateAffiliateLink(linkId, { end_date: yesterday });
          setAffiliateLinks(affiliateLinks.map(l => l.id === linkId ? updated : l));
          alert('已提前結束分潤活動！');
      } catch (e) {
          alert('操作失敗，請檢查網路連線。');
      }
  };

  const overviewData = useMemo(() => {
    // ★ 修復：將要分析的商品清單宣告移至最頂部，確保下方計算利潤時讀得到
    const productsToAnalyze = user.role === 'ADMIN' ? products : myShopProducts;

    // 1. 基本設定與日期區間
    const startDate = new Date(overviewRange.start);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(overviewRange.end);
    endDate.setHours(23, 59, 59, 999);
    
    const durationDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // 計算上一週期的日期 (例如選過去7天，就算上一個7天)
    const prevEndDate = new Date(startDate.getTime() - 1);
    const prevStartDate = new Date(prevEndDate.getTime() - (durationDays * 24 * 60 * 60 * 1000) + 1);
    prevStartDate.setHours(0, 0, 0, 0);

    // 2. 獲取當前週期與上一週期的有效訂單
    const currentOrders = localOrders.filter(o => {
        const t = new Date(o.created_at).getTime();
        return t >= startDate.getTime() && t <= endDate.getTime() && o.status !== 'CANCELLED';
    });
    
    const prevOrders = localOrders.filter(o => {
        const t = new Date(o.created_at).getTime();
        return t >= prevStartDate.getTime() && t <= prevEndDate.getTime() && o.status !== 'CANCELLED';
    });

    // 3. 計算當前週期核心指標
    let totalCost = 0;
    currentOrders.forEach(o => {
        o.items.forEach(item => {
            const p = productsToAnalyze.find(prod => prod.id === item.id);
            let unitCost = 0;
            if (p) {
                const v = p.variants?.find(v => v.name === item.selectedVariant);
                unitCost = v?.cost || p.average_cost || p.cost || 0;
            }
            totalCost += unitCost * item.qty;
        });
    });
    const totalSales = currentOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const totalProfit = totalSales - totalCost; // ★ 新增：計算總毛利
    const totalOrders = currentOrders.length;
    const uniqueBuyers = new Set(currentOrders.map(o => o.receiver_phone)).size;
    const aov = totalOrders > 0 ? Math.round(totalSales / totalOrders) : 0;
    const arpu = uniqueBuyers > 0 ? Math.round(totalSales / uniqueBuyers) : 0;

    // 計算上一週期核心指標 (用來算成長率)
    const prevTotalSales = prevOrders.reduce((sum, o) => sum + o.total_amount, 0);
    let prevTotalCost = 0;
    prevOrders.forEach(o => {
        o.items.forEach(item => {
            const p = productsToAnalyze.find(prod => prod.id === item.id);
            let unitCost = 0;
            if (p) {
                const v = p.variants?.find(v => v.name === item.selectedVariant);
                unitCost = v?.cost || p.average_cost || p.cost || 0;
            }
            prevTotalCost += unitCost * item.qty;
        });
    });
    const prevTotalProfit = prevTotalSales - prevTotalCost; // ★ 新增：計算上期總毛利
    const prevTotalOrders = prevOrders.length;
    const prevUniqueBuyers = new Set(prevOrders.map(o => o.receiver_phone)).size;
    const prevAov = prevTotalOrders > 0 ? Math.round(prevTotalSales / prevTotalOrders) : 0;
    const prevArpu = prevUniqueBuyers > 0 ? Math.round(prevTotalSales / prevUniqueBuyers) : 0;

    // 安全的成長率計算公式
    const calcGrowth = (current: number, prev: number) => {
        if (prev === 0) return current > 0 ? 100 : 0;
        return Number((((current - prev) / prev) * 100).toFixed(2));
    };

    const growth = {
        sales: calcGrowth(totalSales, prevTotalSales),
        profit: calcGrowth(totalProfit, prevTotalProfit), // ★ 新增：毛利成長率
        orders: calcGrowth(totalOrders, prevTotalOrders),
        buyers: calcGrowth(uniqueBuyers, prevUniqueBuyers),
        aov: calcGrowth(aov, prevAov),
        arpu: calcGrowth(arpu, prevArpu),
        ctr: 0 // 下方計算瀏覽量後補上
    };

    // 4. 趨勢圖表資料 (多維度動態走勢)
    const salesTrend = [];
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dailyOrders = currentOrders.filter(o => o.created_at.startsWith(dateStr));
      const dailySales = dailyOrders.reduce((sum, o) => sum + o.total_amount, 0);
      let dailyCost = 0;
      dailyOrders.forEach(o => {
          o.items.forEach(item => {
              const p = productsToAnalyze.find(prod => prod.id === item.id);
              let unitCost = 0;
              if (p) {
                  const v = p.variants?.find(v => v.name === item.selectedVariant);
                  unitCost = v?.cost || p.average_cost || p.cost || 0;
              }
              dailyCost += unitCost * item.qty;
          });
      });
      const dailyProfit = dailySales - dailyCost;
      const dailyBuyers = new Set(dailyOrders.map(o => o.receiver_phone)).size;
      
      salesTrend.push({ 
          name: dateStr.slice(5), 
          fullDate: dateStr,
          sales: dailySales,
          profit: dailyProfit, // ★ 新增：每日毛利推入走勢圖
          orders: dailyOrders.length,
          buyers: dailyBuyers,
          aov: dailyOrders.length > 0 ? Math.round(dailySales / dailyOrders.length) : 0,
          arpu: dailyBuyers > 0 ? Math.round(dailySales / dailyBuyers) : 0
      });
    }

    // 5. 訂單狀態圓餅圖
    const statusCount: Record<string, number> = {};
    currentOrders.forEach(o => {
        statusCount[o.status] = (statusCount[o.status] || 0) + 1;
    });
    const pieData = Object.keys(statusCount).map(key => {
        const label = SELLER_ORDER_STATUS_OPTIONS.find(opt => opt.value === key)?.label || key;
        return { name: label, value: statusCount[key] };
    });

    // 6. 熱銷商品排行榜 (Top Products)
    const productSalesMap: Record<string, {name: string, qty: number, revenue: number, image: string}> = {};
    currentOrders.forEach(o => {
        o.items.forEach(item => {
            if(!productSalesMap[item.id]) {
                productSalesMap[item.id] = { 
                    name: item.name, 
                    qty: 0, 
                    revenue: 0, 
                    image: item.images?.[0] || (item as any).image || 'https://placehold.co/100' 
                };
            }
            productSalesMap[item.id].qty += item.qty;
            productSalesMap[item.id].revenue += (item.finalPrice || item.price) * item.qty;
        });
    });
    // 依據營業額排序取前 5 名
    const topProducts = Object.values(productSalesMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // 7. 瀏覽量與轉換率計算
    const dStr = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
    const todayStr = `${dStr.getFullYear()}-${String(dStr.getMonth() + 1).padStart(2, '0')}-${String(dStr.getDate()).padStart(2, '0')}`;
    
    let intervalProductViews = 0; let prevIntervalProductViews = 0;
    let todayProductViews = 0;
    let todayProductViewsList: { name: string, views: number, shopName?: string }[] = [];
    let intervalPlatformViews = 0; let prevIntervalPlatformViews = 0;
    let todayPlatformViews = 0;

    const prevStartStr = prevStartDate.toISOString().split('T')[0];
    const prevEndStr = prevEndDate.toISOString().split('T')[0];

    productsToAnalyze.forEach(p => {
        if (p.views) {
            let pTodayViews = 0;
            Object.entries(p.views).forEach(([date, count]) => {
                if (date >= overviewRange.start && date <= overviewRange.end) intervalProductViews += Number(count);
                if (date >= prevStartStr && date <= prevEndStr) prevIntervalProductViews += Number(count);
                if (date === todayStr) { todayProductViews += Number(count); pTodayViews += Number(count); }
            });
            if (pTodayViews > 0) {
                const shopInfo = allUsers?.find(u => u.shop_id === p.shop_id || u.id === p.shop_id);
                todayProductViewsList.push({ name: p.name, views: pTodayViews, shopName: shopInfo ? (shopInfo.shop_name || shopInfo.name) : '未知商家' });
            }
        }
    });
    todayProductViewsList.sort((a, b) => b.views - a.views);

    if (user.role === 'ADMIN') {
        Object.entries(platformViews).forEach(([date, count]) => {
            if (date >= overviewRange.start && date <= overviewRange.end) intervalPlatformViews += Number(count);
            if (date >= prevStartStr && date <= prevEndStr) prevIntervalPlatformViews += Number(count);
            if (date === todayStr) todayPlatformViews += Number(count);
        });
    }

    const currentViews = user.role === 'ADMIN' ? intervalPlatformViews : intervalProductViews;
    const prevViews = user.role === 'ADMIN' ? prevIntervalPlatformViews : prevIntervalProductViews;
    
    const ctr = currentViews > 0 ? Number(((totalOrders / currentViews) * 100).toFixed(2)) : 0;
    const prevCtr = prevViews > 0 ? Number(((prevTotalOrders / prevViews) * 100).toFixed(2)) : 0;
    growth.ctr = calcGrowth(ctr, prevCtr);

    return { 
        salesTrend, pieData, totalSales, totalProfit, totalOrders, uniqueBuyers, aov, arpu, ctr, growth, topProducts,
        intervalProductViews, todayProductViews, todayProductViewsList,
        intervalPlatformViews, todayPlatformViews 
    };
  }, [localOrders, overviewRange, myShopProducts, products, platformViews, user.role, allUsers]);

  const filteredOrders = useMemo(() => {
    const s = orderRange.start ? new Date(orderRange.start).setHours(0,0,0,0) : 0;
    const e = orderRange.end ? new Date(orderRange.end).setHours(23,59,59,999) : Infinity;
    
    let list = localOrders.filter(o => {
      const t = new Date(o.created_at).getTime();
      return t >= s && t <= e;
    });

    if (orderStatusFilter !== 'ALL') {
        list = list.filter(o => o.status === orderStatusFilter);
    }

    if (orderSearchTerm.trim()) {
      const term = orderSearchTerm.toLowerCase();
      list = list.filter(o => 
        o.id.toLowerCase().includes(term) ||
        o.receiver_name.toLowerCase().includes(term) ||
        o.items.some(item => item.name.toLowerCase().includes(term))
      );
    }
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [localOrders, orderRange, orderStatusFilter, orderSearchTerm]);

  const paginatedOrders = useMemo(() => {
    const startIndex = (orderPage - 1) * ORDERS_PER_PAGE;
    return filteredOrders.slice(startIndex, startIndex + ORDERS_PER_PAGE);
  }, [filteredOrders, orderPage]);

  const totalOrderPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);

  const pendingNotificationCount = useMemo(() => {
      return localOrders.filter(o => 
          (o.shop_id === (user.shop_id || user.id)) && 
          (o.status === 'PENDING' || o.status === 'CONFIRMED') &&
          !viewedOrderIds?.includes(o.id)
      ).length;
  }, [localOrders, user, viewedOrderIds]);

  const handleExportConfirm = () => {
    let ordersToExport = filteredOrders;
    
    if (!exportStatuses.has('ALL')) {
        ordersToExport = filteredOrders.filter(o => exportStatuses.has(o.status));
    }

    if (ordersToExport.length === 0) {
        alert('沒有符合條件的訂單可匯出');
        return;
    }

    if (exportAsPickingList) {
        let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
        csvContent += "商品名稱,規格,總數量\n";
        
        const summary: Record<string, number> = {};
        ordersToExport.forEach(o => {
            o.items.forEach(item => {
                const key = `${item.name}${item.selectedVariant ? ` (${item.selectedVariant})` : ''}`;
                summary[key] = (summary[key] || 0) + item.qty;
            });
        });

        Object.entries(summary).forEach(([name, qty]) => {
            csvContent += `"${name.replace(/"/g, '""')}",${qty}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `picking_list_${orderRange.start}_${orderRange.end}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } else {
        let statusesToExport: string[] = [];
        if (exportStatuses.has('ALL')) {
             statusesToExport = ['PENDING', 'CONFIRMED', 'SHIPPED', 'COMPLETED', 'CANCELLED'];
        } else {
             statusesToExport = Array.from(exportStatuses);
        }
        
        if (exportFormat === 'NUMBERS') {
            // Apple Numbers 格式 (使用帶有 BOM 的 UTF-8 CSV，讓 Numbers 可完美開啟)
            let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
            csvContent += "狀態,訂單編號,日期,顧客姓名,電話,總金額,商品內容,賣家備註,顧客備註\n";
            
            ordersToExport.forEach(o => {
               const statusLabel = SELLER_ORDER_STATUS_OPTIONS.find(opt => opt.value === o.status)?.label || o.status;
               const itemsStr = o.items.map(i => `${i.name} x${i.qty}`).join('; ').replace(/"/g, '""');
               const safeSellerNote = (o.seller_note || '').replace(/"/g, '""');
               const safeRemarks = (o.remarks || '').replace(/"/g, '""');
               csvContent += `"${statusLabel}","${o.id}","${new Date(o.created_at).toLocaleDateString()}","${o.receiver_name}","${o.receiver_phone}",${o.total_amount},"${itemsStr}","${safeSellerNote}","${safeRemarks}"\n`;
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `orders_for_numbers_${orderRange.start}_${orderRange.end}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            // 原始 Excel 格式
            exportToExcelXML(ordersToExport, statusesToExport, `orders_${orderRange.start}_${orderRange.end}`);
        }
    }
    
    setShowExportModal(false);
  };

  const filteredBuyOrders = useMemo(() => {
    let list = [...buyOrders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (buyOrderStatusFilter !== 'ALL') {
      list = list.filter(o => o.status === buyOrderStatusFilter);
    }
    return list;
  }, [buyOrders, buyOrderStatusFilter]);

  const sortedProducts = useMemo(() => {
      return [...myShopProducts].sort((a, b) => (b.id > a.id ? 1 : -1));
  }, [myShopProducts]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (productPage - 1) * PRODUCTS_PER_PAGE;
    return sortedProducts.slice(startIndex, startIndex + PRODUCTS_PER_PAGE);
  }, [sortedProducts, productPage]);

  const totalProductPages = Math.ceil(sortedProducts.length / PRODUCTS_PER_PAGE);

  const paginatedReports = useMemo(() => {
    const startIndex = (reportPage - 1) * REPORTS_PER_PAGE;
    return reports.slice(startIndex, startIndex + REPORTS_PER_PAGE);
  }, [reports, reportPage]);

  const totalReportPages = Math.ceil(reports.length / REPORTS_PER_PAGE);

  const handleUpdateReportStatus = async (reportId: string, newStatus: 'PENDING' | 'RESOLVED' | 'DISMISSED') => {
      try {
          await API.updateReport(reportId, { status: newStatus });
          setReports(reports.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
      } catch (e) {
          alert('更新狀態失敗');
      }
  };

  const handleDeleteReport = async (reportId: string) => {
      if (!confirm('確定要刪除此檢舉紀錄嗎？')) return;
      try {
          await API.deleteReport(reportId);
          setReports(reports.filter(r => r.id !== reportId));
      } catch (e) {
          alert('刪除失敗');
      }
  };

  const handleViewReportTarget = (rpt: Report) => {
      if (rpt.type === 'PRODUCT') {
          const targetProduct = products.find(p => p.id === rpt.target_id);
          if (targetProduct) {
              onNavigate(View.PRODUCT, targetProduct);
          } else {
              alert('找不到該商品，可能已被刪除或下架。');
          }
      } else {
          onNavigate(View.SHOP, undefined, rpt.target_id);
      }
  };

  const getInitialForm = (): Partial<Product> => {
    const savedBank = localStorage.getItem('insbuy_saved_bank');
    let bankInfo: BankInfo | undefined = undefined;
    if (savedBank) {
      bankInfo = JSON.parse(savedBank);
    } else {
      bankInfo = { bank_name: '臺灣銀行', bank_code: '004', account_name: '', account_number: '' };
    }
    return {
      name: '',
      category_ids: [],
      description: '',
      price: 0,
      original_price: 0,
      images: [],
      status: 'OPEN',
      product_type: 'PHYSICAL',
      digital_files: [],
      variants: [{ name: '單一規格', price: 0, stock: 100 }],
      shipping_rules: [],
      payment_methods: ['BANK', 'COD', 'CASH'], 
      bank_info: bankInfo,
      questions: [],
      origin: '台灣',
      shipping_origin: '台北市', 
      keywords: [], 
      target_amount: 50000,
      current_amount: 0,
      end_time: new Date(Date.now() + 86400000 * 7).toISOString(),
      is_pinned: false,
      is_preorder: false,
      preorder_end_date: '',
      preorder_arrival_date: '',
      is_hidden: false,
      view_password: ''
    };
  };

  const [form, setForm] = useState<Partial<Product>>(getInitialForm());
  
  // ★ 新增：商品描述草稿功能狀態與邏輯
  

  const handleDeleteProduct = async (id: string) => {
    if (confirm('確定要刪除此商品嗎？')) {
      try {
        await API.deleteProduct(id);
        onUpdateProducts(products.filter(i => i.id !== id));
      } catch (e) {
        alert('刪除失敗');
      }
    }
  };

  const notifyBuyer = async (order: Order, newStatus: string) => {
    // ★ 優化：只在「待收貨 (SHIPPED)」與「已完成 (COMPLETED)」時發送通知
    if (newStatus !== 'SHIPPED' && newStatus !== 'COMPLETED') return;

    const statusLabel = SELLER_ORDER_STATUS_OPTIONS.find(opt => opt.value === newStatus)?.label || newStatus;

    // ★ 優化：封裝成 JSON 格式供 ChatRoom 渲染精美卡片
    const payload = {
        orderId: order.id,
        statusLabel: statusLabel,
        items: order.items.map((i: any) => ({
            name: i.name,
            variant: i.selectedVariant || '',
            qty: i.qty,
            price: i.finalPrice || i.price,
            // ★ 圖片雙重防呆：確保無論資料庫存的是單圖(image)還是多圖陣列(images)，都能準確抓到，否則給預設圖
            image: i.image || (i.images && i.images.length > 0 ? i.images[0] : null) || 'https://placehold.co/100'
        })),
        total: order.total_amount
    };

    // 使用特殊的 [SYS_ORDER_UPDATE] 前綴讓愛聊識別
    const text = `[SYS_ORDER_UPDATE]${JSON.stringify(payload)}`;

    let receiverId = (order as any).user_id || (order as any).userId; 
     
    if (!receiverId && allUsers) {
        const targetUser = allUsers.find(u => u.phone === order.receiver_phone || u.id === order.receiver_phone);
        if (targetUser) receiverId = targetUser.id;
    }

    if (!receiverId) receiverId = order.receiver_phone;

    try {
      const finalSenderId = user.role === 'ADMIN' ? 'ADMIN' : user.id;

      await API.sendMessage({
        senderId: finalSenderId, 
        receiverId: receiverId,
        content: text, 
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      console.error('Failed to send notification message', e);
    }
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    let cancellationReason = '';
    if (newStatus === 'CANCELLED') {
      const input = prompt('請輸入取消原因：');
      if (input === null) return;
      cancellationReason = input;

      // ★ 新增：訂單取消自動退回庫存並紀錄
      const targetOrder = localOrders.find(o => o.id === orderId);
      if (targetOrder && targetOrder.status !== 'CANCELLED') {
          const newProducts = [...products];
          let isProductsChanged = false;

          targetOrder.items.forEach(item => {
              const pIndex = newProducts.findIndex(p => p.id === item.id);
              if (pIndex > -1) {
                  const p = newProducts[pIndex];
                  const vIndex = p.variants.findIndex(v => v.name === item.selectedVariant || (v.name==='單一規格' && !item.selectedVariant));
                  if (vIndex > -1) {
                      const updatedVariants = [...p.variants];
                      updatedVariants[vIndex] = { ...updatedVariants[vIndex], stock: updatedVariants[vIndex].stock + item.qty };
                      
                      const newLog = {
                          id: `log-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
                          variant_name: updatedVariants[vIndex].name,
                          change_amount: item.qty,
                          reason: `買家取消訂單自動退回 (訂單編號: #${orderId.slice(-6)})`,
                          created_at: new Date().toISOString(),
                          order_id: orderId // ★ 綁定訂單ID，供歷史紀錄顯示卡片使用
                      };

                      newProducts[pIndex] = {
                          ...p,
                          variants: updatedVariants,
                          total_stock: updatedVariants.reduce((sum, v) => sum + v.stock, 0),
                          stock_logs: [newLog, ...(p.stock_logs || [])]
                      };
                      isProductsChanged = true;
                      
                      // 非同步更新資料庫
                      if (API.updateProduct) {
                          API.updateProduct(newProducts[pIndex]).catch(console.error);
                      }
                  }
              }
          });

          if (isProductsChanged) {
              onUpdateProducts(newProducts);
          }
      }
    }
    
    onUpdateOrderStatus(orderId, newStatus, cancellationReason);
    setLocalOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus, cancellation_reason: cancellationReason } : o));

    const targetOrder = localOrders.find(o => o.id === orderId);
    if (targetOrder) {
      notifyBuyer(targetOrder, newStatus);
    }
    
    if (newStatus === 'SHIPPED' || newStatus === 'COMPLETED') {
      const statusLabel = SELLER_ORDER_STATUS_OPTIONS.find(opt => opt.value === newStatus)?.label || newStatus;
      alert(`訂單狀態已更新為「${statusLabel}」！\n系統已自動發送愛聊訊息通知買家。`);
    }
  };

  const handleSaveSellerNote = (orderId: string) => {
    const note = tempSellerNotes[orderId];
    if (note === undefined) return;
    onUpdateOrderStatus(orderId, undefined as any, undefined, note);
    setLocalOrders(prev => prev.map(o => o.id === orderId ? { ...o, seller_note: note } : o));
    alert('儲存成功');
  };

  const handleTogglePaid = async (order: Order) => {
    const currentNote = order.seller_note || '';
    if (currentNote.includes('[已收款]')) return;

    if (!confirm('確認已收到此筆訂單的款項？\n此操作將在訂單備註中標記，且無法復原。')) return;

    const newNote = `${currentNote} [已收款]`.trim();

    setLocalOrders(prevOrders => 
        prevOrders.map(o => o.id === order.id ? { ...o, seller_note: newNote } : o)
    );
    setLocalPaidIds(prev => new Set(prev).add(order.id));

    try {
        if (API.updateOrder) {
             await API.updateOrder(order.id, order.status, undefined, newNote);
        }
        onUpdateOrderStatus(order.id, order.status, undefined, newNote);
        alert('已成功標記收款！');
        
    } catch (e) {
        console.error("Failed to mark as paid:", e);
        alert('標記收款失敗，請檢查網路連線');
        
        setLocalOrders(prevOrders => 
            prevOrders.map(o => o.id === order.id ? { ...o, seller_note: currentNote } : o)
        );
        setLocalPaidIds(prev => {
            const next = new Set(prev);
            next.delete(order.id);
            return next;
        });
    }
  };

  const handleAddSystemCategory = (parentId: string | null = null) => {
    const name = parentId ? prompt("請輸入子分類名稱：") : newSystemCatName;
    if (!name || !name.trim()) return;

    const newCat: Category = {
      id: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      shop_id: 'SYSTEM',
      name: name,
      parent_id: parentId,
      type: 'MANUAL',
      product_ids: [],
      auto_rules: {},
      sort_order: systemCategories.length,
      is_active: true,
      layout_style: 'STANDARD'
    };
    
    if (onUpdateSystemCategories) {
      onUpdateSystemCategories([...systemCategories, newCat]);
    }
    if (!parentId) setNewSystemCatName('');
  };

  const handleDeleteSystemCategory = (id: string) => {
    if (!confirm('確定要刪除此分類嗎？(包含其下所有子分類)')) return;
    
    const getAllChildren = (pId: string): string[] => {
      const children = systemCategories.filter(c => c.parent_id === pId);
      let ids = children.map(c => c.id);
      children.forEach(c => ids = [...ids, ...getAllChildren(c.id)]);
      return ids;
    };
    
    const idsToRemove = [id, ...getAllChildren(id)];
    const newCats = systemCategories.filter(c => !idsToRemove.includes(c.id));
    
    if (onUpdateSystemCategories) onUpdateSystemCategories(newCats);
  };

  const renderSystemCategoryTree = (parentId: string | null) => {
    const nodes = systemCategories.filter(c => c.parent_id === parentId);
    return nodes.map(node => (
      <div key={node.id} className="ml-4 mb-2">
         <div className="flex items-center gap-2 p-3 border rounded-xl bg-slate-50 hover:bg-white transition hover:shadow-sm">
            <span className="font-bold text-slate-700 flex-1">{node.name}</span>
            <button onClick={() => handleAddSystemCategory(node.id)} className="text-xs text-blue-500 hover:underline font-bold">
               + 子分類
            </button>
            <button onClick={() => handleDeleteSystemCategory(node.id)} className="text-slate-300 hover:text-red-500">
               <i className="fa-solid fa-trash-can"></i>
            </button>
         </div>
         {renderSystemCategoryTree(node.id)}
      </div>
    ));
  };

  // ★ 重構：將選單分為三大區塊
  const menuSections = [
    {
      title: '經營情況 (網購)',
      items: [
        { id: 'overview', icon: 'fa-chart-pie', label: '經營概況' },
        { id: 'orders', icon: 'fa-receipt', label: '訂單管理' },
        { id: 'products', icon: 'fa-box-open', label: '商品管理' },
        { id: 'customers', icon: 'fa-users', label: '客戶管理' },
        { id: 'categories', icon: 'fa-list-ul', label: user.role === 'ADMIN' ? '平台分類管理' : '分類管理' },
        { id: 'settings', icon: 'fa-store', label: '商店設定' },
        { id: 'affiliate', icon: 'fa-bullhorn', label: '網紅分潤設定' },
        ...(user.role === 'ADMIN' ? [{ id: 'announcement', icon: 'fa-bell', label: '全站公告設定' }] : []),
        { id: 'create', icon: 'fa-plus-circle', label: editingId ? '編輯商品' : '新增商品' },
      ]
    },
    {
      title: '預約與 CRM 管理',
      items: [
        { id: 'seller_booking', icon: 'fa-calendar-days', label: '預約與 CRM 專區' }
      ]
    }
  ];
  

  const renderSidebar = () => (
      <div className={`bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 md:sticky md:top-24 h-fit ${showMobileMenu ? 'block' : 'hidden md:block'}`}>
          <div className="flex items-center gap-3 mb-6">
            <img src={user.logo || 'https://placehold.co/100'} className="w-10 h-10 rounded-xl object-cover bg-slate-100 border" />
            <div>
              <div className="font-bold text-slate-800 text-sm truncate">{user.shop_name || user.name}</div>
              <div className="text-[10px] text-slate-400 font-mono">ID: {user.id}</div>
              {/* 新增金色會員等級標籤 */}
              <div className="flex gap-1 mt-1">
                 <span className="px-1.5 py-0.5 bg-yellow-50 text-yellow-600 rounded text-[9px] border border-yellow-200 font-bold">
                    <i className="fa-solid fa-crown mr-1 text-yellow-500"></i>Lv.{user.level || 1}
                 </span>
              </div>
            </div>
          </div>
          
          <nav className="space-y-1">
            {menuSections.map((section, sIdx) => (
              <div key={sIdx} className="mb-4">
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 px-2 mt-4">{section.title}</div>
                {section.items.map(item => (
                  <button 
                    key={item.id}
                    onClick={() => { 
                      if (item.id === 'customers' && !sellerConfig.can_view_stats && user.role !== 'ADMIN') {
                          alert('【會員等級限制】\n您目前的會員等級無法使用「客戶管理系統」。\n請升級您的會員等級以解鎖此強大功能！');
                          return;
                      }
                      if(item.id === 'create') {
                          sessionStorage.removeItem('insbuy_new_product_draft');
                          setForm(getInitialForm());
                          setEditingId(null);
                          setGlobalSearchId('');
                          setActiveTab('create');
                          setShowMobileMenu(false); 
                      } else {
                          handleTabChange(item.id as any);
                          if(item.id !== 'create') setEditingId(null); 
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all relative ${activeTab === item.id ? 'bg-[#EE4D2D] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    {item.id === 'orders' && pendingNotificationCount > 0 && (
                        <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border border-white rounded-full"></div>
                    )}
                    <i className={`fa-solid ${item.icon} w-5`}></i>
                    {item.label}
                  </button>
                ))}
              </div>
            ))}
            
            
            {user.role === 'ADMIN' && (
              <>
                <button 
                    onClick={() => handleTabChange('reports')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'reports' ? 'bg-red-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <i className="fa-solid fa-triangle-exclamation w-5"></i>
                    檢舉管理專區
                </button>
                
              </>
            )}
            
            <div className="pt-4 mt-4 border-t border-slate-100">
               <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 px-2">個人買家專區</div>
               {[
                 { id: 'buying_account', icon: 'fa-user', label: '我的帳戶' },
                 { id: 'buying_orders', icon: 'fa-bag-shopping', label: '購買清單' },
                 { id: 'buying_reports', icon: 'fa-chart-line', label: '我的報表' }
               ].map(item => (
                 <button 
                   key={item.id}
                   onClick={() => handleTabChange(item.id as any)}
                   className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === item.id ? 'bg-[#EE4D2D] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                 >
                   <i className={`fa-solid ${item.icon} w-5`}></i>
                   {item.label}
                 </button>
               ))}
            </div>

            <div className="pt-4">
              <button
                onClick={() => onNavigate(View.SHOP, undefined, shopId)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-slate-500 hover:bg-slate-50 hover:text-[#EE4D2D]"
              >
                <i className="fa-solid fa-shop w-5"></i>
                前往我的賣場
              </button>
            </div>

            <div className="pt-4 md:hidden">
              <button 
                 onClick={onLogout} 
                 className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600"
              >
                 <i className="fa-solid fa-right-from-bracket w-5"></i>
                 登出系統
              </button>
            </div>
          </nav>
        </div>
  );

  return (
    <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start animate-fade-in pb-20 w-full max-w-[100vw] overflow-x-hidden box-border px-1 md:px-0">
      {cropModal.isOpen && (
         <ProductImageCropper 
            src={cropModal.src} 
            onComplete={handleCropComplete} 
            onCancel={() => setCropModal({ isOpen: false, src: '', editIndex: null })} 
         />
      )}

      <aside className="w-full md:w-64 space-y-2 shrink-0">
        {renderSidebar()}
      </aside>

      {/* ★ 修正 1：加上 w-full max-w-full 確保在手機版時寬度能完整填滿，解決商品列表畫面偏窄的問題 */}
      {/* ★ 修正 2：在 flex-1 容器補上 overflow-x-hidden，防止內部任何大表格撐破整個手機畫面 */}
      <div className={`flex-1 w-full max-w-full space-y-6 min-w-0 overflow-x-hidden ${showMobileMenu ? 'hidden md:block' : 'block'}`}>
        
        <div className="md:hidden mb-4">
           <button 
              onClick={() => setShowMobileMenu(true)}
              className="flex items-center gap-2 text-slate-600 font-bold bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100 w-full"
           >
              <i className="fa-solid fa-chevron-left"></i>
              返回功能選單
           </button>
        </div>

        {outOfStockProducts.length > 0 && (
           <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center justify-between animate-pulse mb-6">
              <div className="flex items-center gap-3 text-red-600">
                 <i className="fa-solid fa-circle-exclamation text-xl"></i>
                 <div>
                    <div className="font-bold text-sm">庫存警示：您有 {outOfStockProducts.length} 項商品已售完！</div>
                    <div className="text-xs opacity-80">商品已自動從搜尋頁面隱藏，請盡快補貨或下架。</div>
                 </div>
              </div>
              <button onClick={() => setActiveTab('products')} className="px-4 py-1 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700">
                 前往處理
              </button>
           </div>
        )}

       {/* ★ 新增：預約系統後台 Tab */}
        {activeTab === 'seller_booking' && (
           <SellerBookingDashboard />
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <AdminOverview 
             user={user}
             allUsers={allUsers}
             overviewRange={overviewRange}
             setOverviewRange={setOverviewRange}
             overviewData={overviewData}
             setShowViewsModal={setShowViewsModal}
          />
        )}

        {/* Categories, System Cats, Settings Tabs */}
        {activeTab === 'settings' && <ShopSettings user={user} permissions={permissions} onUpdateUser={onUpdateUser} />}
        
        {/* ★ 新增：全站公告設定畫面渲染 */}
        {activeTab === 'announcement' && user.role === 'ADMIN' && (
          <AdminAnnouncement siteSettings={siteSettings} onUpdateSiteSettings={onUpdateSiteSettings!} />
        )}
       {/* ★ 專業版：獨立出來的網紅分潤設定 Tab */}
        {activeTab === 'affiliate' && (
           <AdminAffiliate 
              newLinkData={newLinkData}
              setNewLinkData={setNewLinkData}
              myShopProducts={myShopProducts}
              handleCreateAffiliateLink={handleCreateAffiliateLink}
              selectedInfluencerId={selectedInfluencerId}
              setSelectedInfluencerId={setSelectedInfluencerId}
              affiliatePage={affiliatePage}
              setAffiliatePage={setAffiliatePage}
              affiliateTab={affiliateTab}
              setAffiliateTab={setAffiliateTab}
              affiliateViewMode={affiliateViewMode}
              setAffiliateViewMode={setAffiliateViewMode}
              filteredAffiliateLinks={filteredAffiliateLinks}
              paginatedAffiliateLinks={paginatedAffiliateLinks}
              localOrders={localOrders}
              handleTerminateLink={handleTerminateLink}
              expandedLinkId={expandedLinkId}
              setExpandedLinkId={setExpandedLinkId}
              expandedOrderPage={expandedOrderPage}
              setExpandedOrderPage={setExpandedOrderPage}
              totalAffiliatePages={totalAffiliatePages}
           />
        )}

        {activeTab === 'categories' && (
          <CategoryManagement 
             shopId={user.role === 'ADMIN' ? 'SYSTEM' : shopId}
             categories={user.role === 'ADMIN' ? (systemCategories || []) : categories}
             products={products}
             onUpdateCategories={user.role === 'ADMIN' ? onUpdateSystemCategories! : onUpdateCategories}
          />
        )}
        
        {/* Reports Tab */}
        {activeTab === 'reports' && user.role === 'ADMIN' && (
           <AdminReports 
              allUsers={allUsers!} 
              allProducts={products} 
              onNavigate={onNavigate} 
           />
        )}

        {/* Orders Management Tab */}
        {activeTab === 'orders' && (
           <AdminOrders 
              products={products} // ★ 新增：將商品資料傳遞給訂單列表以計算毛利
              allOrders={localOrders}
              orderRange={orderRange}
              setOrderRange={setOrderRange}
              orderStatusFilter={orderStatusFilter}
              setOrderStatusFilter={setOrderStatusFilter}
              orderSearchTerm={orderSearchTerm}
              setOrderSearchTerm={setOrderSearchTerm}
              orderViewMode={orderViewMode}
              setOrderViewMode={setOrderViewMode}
              setShowExportModal={setShowExportModal}
              filteredOrders={filteredOrders}
              paginatedOrders={paginatedOrders}
              totalOrderPages={totalOrderPages}
              orderPage={orderPage}
              setOrderPage={setOrderPage}
              expandedOrderId={expandedOrderId}
              setExpandedOrderId={setExpandedOrderId}
              onMarkAsViewed={onMarkAsViewed}
              allUsers={allUsers}
              onNavigate={onNavigate}
              handleUpdateOrderStatus={handleUpdateOrderStatus}
              handleTogglePaid={handleTogglePaid}
              tempSellerNotes={tempSellerNotes}
              setTempSellerNotes={setTempSellerNotes}
              handleSaveSellerNote={handleSaveSellerNote}
              localPaidIds={localPaidIds}
              viewedOrderIds={viewedOrderIds}
           />
        )}

{/* Customers Management Tab */}
        {activeTab === 'customers' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 md:p-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4 pb-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800  flex items-center gap-2"><i className="fa-solid fa-users text-[#EE4D2D]"></i> 客戶管理系統</h2>
              
              <div className="flex flex-col md:flex-row items-start md:items-center gap-2 text-sm bg-slate-50 p-2 rounded-xl w-full md:w-auto">
                 <span className="text-slate-500 font-bold px-2 hidden md:inline">消費日期:</span>
                 <div className="flex w-full md:w-auto gap-2">
                     <input type="date" value={customerRange.start} onChange={e => {setCustomerRange({...customerRange, start: e.target.value}); setCustomerPage(1); setExpandedCustomerId(null);}} className="flex-1 border border-slate-300 rounded-lg px-2 py-1 outline-none text-slate-600 font-bold min-w-[110px]" />
                     <span className="text-slate-300 self-center">-</span>
                     <input type="date" value={customerRange.end} onChange={e => {setCustomerRange({...customerRange, end: e.target.value}); setCustomerPage(1); setExpandedCustomerId(null);}} className="flex-1 border border-slate-300 rounded-lg px-2 py-1 outline-none text-slate-600 font-bold min-w-[110px]" />
                 </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
               <div className="relative flex-1">
                  <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-sm"></i>
                  <input type="text" placeholder="搜尋客戶姓名或電話..." className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#EE4D2D] w-full" value={customerSearchTerm} onChange={e => {setCustomerSearchTerm(e.target.value); setCustomerPage(1); setExpandedCustomerId(null);}} />
               </div>
               {/* 新增：排序下拉選單 */}
               <div className="w-full md:w-auto shrink-0 relative">
                  <select 
                     className="w-full md:w-auto border border-slate-200 rounded-lg pl-4 pr-8 py-2 text-sm font-bold text-slate-600 outline-none focus:border-[#EE4D2D] appearance-none bg-white cursor-pointer"
                     value={customerSortBy}
                     onChange={e => {setCustomerSortBy(e.target.value as any); setCustomerPage(1); setExpandedCustomerId(null);}}
                  >
                     <option value="SPENT_DESC">排序：消費總額 (高至低)</option>
                     <option value="ORDERS_DESC">排序：訂單數量 (多至少)</option>
                  </select>
                  <i className="fa-solid fa-sort absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
               </div>
            </div>

            <div className="space-y-4">
              {customerData.length === 0 ? (
                <div className="py-20 text-center text-slate-300">
                  <i className="fa-solid fa-user-slash text-4xl mb-4 block opacity-20"></i>
                  該日期區間無客戶資料
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {paginatedCustomers.map((c, i) => (
                    <div key={i} className="p-4 md:p-5 border border-slate-100 rounded-2xl transition shadow-sm bg-white hover:border-[#EE4D2D] flex flex-col gap-4">
                      {/* 上半部：客戶摘要卡片 */}
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full">
                          <div className="flex-1 min-w-0 flex items-start gap-4 w-full">
                             <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold text-lg shrink-0">
                                {c.name.charAt(0)}
                             </div>
                             <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                   <span className="font-bold text-slate-800 text-lg truncate">{c.name}</span>
                                   <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-mono">{c.phone}</span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600 mt-2">
                                   {/* 修改：變成可點擊的按鈕以展開資訊 */}
                                   <button 
                                      onClick={() => { setExpandedCustomerId(expandedCustomerId === c.phone && customerDetailTab === 'ORDERS' ? null : c.phone); setCustomerDetailTab('ORDERS'); }} 
                                      className={`flex items-center gap-1 transition px-2 py-1 rounded-md border ${expandedCustomerId === c.phone && customerDetailTab === 'ORDERS' ? 'bg-orange-50 border-orange-200 text-[#EE4D2D]' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                                   >
                                      <i className="fa-solid fa-receipt text-slate-400"></i> {c.totalOrders} 筆訂單 <i className="fa-solid fa-chevron-down text-[10px] ml-1"></i>
                                   </button>
                                   <button 
                                      onClick={() => { setExpandedCustomerId(expandedCustomerId === c.phone && customerDetailTab === 'ITEMS' ? null : c.phone); setCustomerDetailTab('ITEMS'); }} 
                                      className={`flex items-center gap-1 transition px-2 py-1 rounded-md border ${expandedCustomerId === c.phone && customerDetailTab === 'ITEMS' ? 'bg-orange-50 border-orange-200 text-[#EE4D2D]' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                                   >
                                      <i className="fa-solid fa-box-open text-slate-400"></i> {c.totalItems} 件商品 <i className="fa-solid fa-chevron-down text-[10px] ml-1"></i>
                                   </button>
                                   <span className="flex items-center gap-1 text-[11px] text-slate-400"><i className="fa-regular fa-calendar text-slate-300"></i> 最後購買: {new Date(c.lastOrderDate).toLocaleDateString()}</span>
                                </div>
                             </div>
                          </div>
                          
                          <div className="flex flex-col md:flex-row items-center justify-between w-full md:w-auto gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 mt-1 md:mt-0 shrink-0">
                                 <div className="text-left md:text-right hidden md:block">
                                     <div className="text-[10px] text-slate-400 font-bold">區間消費總額</div>
                                     <div className="text-lg font-black text-[#EE4D2D]">${c.totalSpent.toLocaleString()}</div>
                                 </div>
                                 <div className="flex items-center gap-2 w-full md:w-auto">
                                     <div className="md:hidden flex-1">
                                         <div className="text-[10px] text-slate-400 font-bold">區間消費總額</div>
                                         <div className="text-lg font-black text-[#EE4D2D]">${c.totalSpent.toLocaleString()}</div>
                                     </div>
                                     <button 
                                        onClick={() => handleBlacklist(c.targetId, c.name, c.isBlacklisted)} 
                                        className={`flex-1 md:flex-none px-4 py-2 rounded-xl font-bold text-sm transition-colors flex justify-center items-center gap-2 ${c.isBlacklisted ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-600 border border-slate-200 hover:border-red-200'}`}
                                        title={c.isBlacklisted ? "點擊解除黑名單" : "將此買家加入黑名單"}
                                     >
                                        <i className={`fa-solid ${c.isBlacklisted ? 'fa-user-check' : 'fa-user-slash'}`}></i> 
                                        {c.isBlacklisted ? '已封鎖' : '黑名單'}
                                     </button>

                                     <button 
                                        onClick={() => onNavigate(View.CHAT, undefined, c.targetId)} 
                                        className="flex-1 md:flex-none bg-orange-50 text-[#EE4D2D] hover:bg-[#EE4D2D] hover:text-white border border-orange-100 px-4 py-2 rounded-xl font-bold text-sm transition-colors flex justify-center items-center gap-2"
                                     >
                                        <i className="fa-regular fa-comments"></i> 愛聊
                                     </button>
                                 </div>
                              </div>
                      </div>

                      {/* 下半部：展開的詳細資訊區塊 */}
                      {expandedCustomerId === c.phone && (
                        <div className="mt-2 pt-4 border-t border-slate-100 bg-slate-50/50 rounded-xl p-3 md:p-4 animate-fade-in w-full">
                           <div className="flex gap-4 mb-4 border-b border-slate-200 pb-2 overflow-x-auto no-scrollbar">
                              <button onClick={() => setCustomerDetailTab('ORDERS')} className={`font-bold text-sm px-2 py-1 whitespace-nowrap transition-colors ${customerDetailTab === 'ORDERS' ? 'text-[#EE4D2D] border-b-2 border-[#EE4D2D]' : 'text-slate-500 hover:text-slate-700'}`}>訂單紀錄 ({c.orders.length})</button>
                              <button onClick={() => setCustomerDetailTab('ITEMS')} className={`font-bold text-sm px-2 py-1 whitespace-nowrap transition-colors ${customerDetailTab === 'ITEMS' ? 'text-[#EE4D2D] border-b-2 border-[#EE4D2D]' : 'text-slate-500 hover:text-slate-700'}`}>購買商品統計 ({Object.keys(c.itemsSummary).length})</button>
                           </div>

                           {customerDetailTab === 'ORDERS' && (
                              <div className="space-y-3">
                                 {c.orders.map((o: any) => (
                                    <div key={o.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 hover:border-[#EE4D2D] transition cursor-pointer" onClick={() => { /* 這裡保留未來點擊進入特定訂單的功能彈性 */ }}>
                                        {/* 訂單標頭 (編號、時間、狀態、總金額) */}
                                        <div className="flex flex-row justify-between items-start md:items-center border-b border-slate-100 pb-3 gap-2">
                                            <div className="flex flex-wrap items-center gap-2">
                                               <span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold">#{o.id.slice(-6)}</span>
                                               <span className="text-xs text-slate-400"><i className="fa-regular fa-clock mr-1"></i>{new Date(o.created_at).toLocaleString()}</span>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                               <div className={`text-[10px] font-bold px-2 py-0.5 rounded whitespace-nowrap ${o.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : o.status === 'CANCELLED' ? 'bg-slate-200 text-slate-500' : 'bg-orange-100 text-orange-500'}`}>{o.status}</div>
                                               <div className="text-sm font-black text-[#EE4D2D] whitespace-nowrap">${o.total_amount.toLocaleString()}</div>
                                            </div>
                                        </div>
                                        
                                        {/* 訂單商品詳細清單 */}
                                        <div className="flex flex-col gap-2">
                                            {o.items.map((it: any, idx: number) => (
                                                <div key={idx} className="flex justify-between items-start bg-slate-50 hover:bg-slate-100 transition p-2.5 rounded-lg border border-slate-100/50">
                                                    <div className="flex-1 min-w-0 pr-3">
                                                        <div className="text-sm font-bold text-slate-700 truncate">{it.name}</div>
                                                        {it.selectedVariant && <div className="text-[11px] text-slate-500 mt-0.5">規格: {it.selectedVariant}</div>}
                                                    </div>
                                                    <div className="text-right shrink-0 flex flex-col items-end justify-center">
                                                        <span className="text-sm font-black text-slate-700">x {it.qty}</span>
                                                        <span className="text-[11px] text-slate-400 mt-0.5 font-bold">${(it.finalPrice || it.price).toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                 ))}
                              </div>
                           )}

                           {customerDetailTab === 'ITEMS' && (
                              <div className="space-y-3">
                                 {Object.values(c.itemsSummary).map((item: any, idx) => (
                                    <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3 hover:bg-slate-50 transition">
                                        <div className="w-12 h-12 rounded bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                                            <img src={item.image} className="w-full h-full object-cover" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-slate-700 truncate">{item.name}</div>
                                            <div className="text-xs text-slate-500 mt-0.5">{item.variant ? `規格: ${item.variant}` : '單一規格'}</div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="text-xs text-slate-500 mb-0.5">累計 <span className="font-bold text-slate-700">{item.qty}</span> 件</div>
                                            <div className="text-sm font-black text-[#EE4D2D]">${item.totalAmount.toLocaleString()}</div>
                                        </div>
                                    </div>
                                 ))}
                              </div>
                           )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {totalCustomerPages > 1 && (
              <div className="flex justify-center items-center gap-2 md:gap-4 mt-8">
                <button onClick={() => setCustomerPage(p => Math.max(1, p - 1))} disabled={customerPage === 1} className="px-3 md:px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50 text-xs md:text-sm"><i className="fa-solid fa-chevron-left"></i></button>
                <span className="text-xs md:text-sm font-bold text-slate-600">第 {customerPage}/{totalCustomerPages} 頁</span>
                <button onClick={() => setCustomerPage(p => Math.min(totalCustomerPages, p + 1))} disabled={customerPage === totalCustomerPages} className="px-3 md:px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50 text-xs md:text-sm"><i className="fa-solid fa-chevron-right"></i></button>
              </div>
            )}
          </div>
        )}

        {/* Products List Tab */}
        {activeTab === 'products' && (
           <AdminProducts 
              allOrders={localOrders} // ★ 新增：傳入所有訂單以精準計算銷售量
              paginatedProducts={paginatedProducts}
              categories={categories}
              systemCategories={systemCategories}
              productViewMode={productViewMode}
              setProductViewMode={setProductViewMode}
              totalProductPages={totalProductPages}
              productPage={productPage}
              setProductPage={setProductPage}
              onNavigate={onNavigate}
              setActiveTab={setActiveTab}
              setEditingId={setEditingId}
              setForm={setForm}
              getInitialForm={getInitialForm}
              handleDeleteProduct={handleDeleteProduct}
           />
        )}

        {/* =========================================
            ✨ 完整修復的「新增/編輯商品」區塊 ✨
           ========================================= */}
        {activeTab === 'create' && (
           <AdminProductForm
              shopId={shopId}
              sellerConfig={sellerConfig}
              products={products}
              onUpdateProducts={onUpdateProducts}
              systemCategories={systemCategories}
              categories={categories}
              form={form}
              setForm={setForm}
              editingId={editingId}
              setEditingId={setEditingId}
              getInitialForm={getInitialForm}
              setActiveTab={setActiveTab}
              setShowMobileMenu={setShowMobileMenu}
              setGlobalSearchId={setGlobalSearchId}
              setCropModal={setCropModal}
           />
        )}
        
        {/* Buyer Account / Orders (unchanged structure) */}
        {activeTab === 'buying_account' && (
           <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8"><h2 className="text-2xl font-black text-slate-800 mb-8 border-l-4 border-slate-800 pl-4">我的帳戶資料 (買家)</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div><label className="text-xs font-bold text-slate-400 mb-1 block">會員名稱</label><div className="text-lg font-bold text-slate-700">{user.name}</div></div><div><label className="text-xs font-bold text-slate-400 mb-1 block">手機號碼</label><div className="text-lg font-bold text-slate-700">{user.phone}</div></div></div></div>
        )}

        {/* 購買清單區域：新增「賣家已收款」印章 */}
        {activeTab === 'buying_orders' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 md:p-8 w-full overflow-hidden">
            <h2 className="text-2xl font-black text-slate-800 mb-6 md:mb-8 border-l-4 border-slate-800 pl-4">我的購買清單</h2>
            {/* ★ 修正：使用 grid 與 flex-wrap 讓狀態列自動換行顯示 (不需左右滑動)，並在旁邊加入訂單數量 */}
            <div className="grid grid-cols-3 md:flex md:flex-wrap gap-2 mb-6 w-full">
              {BUYER_ORDER_STATUS_OPTIONS.map(opt => {
                // 動態計算該狀態的訂單數量
                const count = opt.value === 'ALL' 
                   ? buyOrders.length 
                   : buyOrders.filter(o => o.status === opt.value).length;
                   
                return (
                  <button 
                    key={opt.value} 
                    onClick={() => setBuyOrderStatusFilter(opt.value)} 
                    className={`relative px-1 md:px-4 py-2.5 md:py-2 rounded-xl text-[11px] md:text-sm font-bold whitespace-nowrap transition flex items-center justify-center gap-1.5 ${buyOrderStatusFilter === opt.value ? 'bg-slate-800 text-white shadow-md scale-[1.02] z-10' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100'}`}
                  >
                    {opt.label}
                    {/* 數量徽章 */}
                    <span className={`px-1.5 py-0.5 rounded-full text-[9px] md:text-[10px] font-black ${buyOrderStatusFilter === opt.value ? 'bg-[#EE4D2D] text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            
            <div className="space-y-4">
              {filteredBuyOrders.length === 0 ? (
                  <div className="py-20 text-center text-slate-300"><i className="fa-solid fa-receipt text-4xl mb-4 opacity-50"></i><p className="font-bold">目前沒有相關訂單</p></div>
              ) : (
                filteredBuyOrders.map(o => {
                  const sellerNote = (o as any).seller_note || (o as any).sellerNote || '';
                  const isPaid = (o as any).is_paid || sellerNote.includes('[已收款]');
                  const shopUser = allUsers?.find(u => u.shop_id === o.shop_id || u.id === o.shop_id);
                  const sellerName = shopUser?.shop_name || shopUser?.name || o.store_name || '未知店家';

                  return (
                    <div key={o.id} className="border border-slate-100 rounded-2xl overflow-hidden hover:shadow-md transition bg-white relative">
                      
                      {isPaid && (
                        <div className="absolute top-8 right-4 md:top-10 md:right-32 z-50 pointer-events-none opacity-90">
                            <div className="border-2 border-red-600 text-red-600 rounded-lg px-2 py-1 font-black text-sm md:text-base rotate-[-15deg] uppercase tracking-widest shadow-sm flex items-center gap-1.5 bg-white/70 backdrop-blur-sm">
                                <i className="fa-solid fa-stamp text-xs"></i> 賣家已確認收款
                            </div>
                        </div>
                      )}

                      <div className="bg-slate-100/80 px-4 py-2 flex justify-between items-center text-[10px] md:text-xs text-slate-500 font-bold border-b border-slate-200/50">
                          <span className="font-mono">訂單編號：{o.id}</span>
                          <span className="flex items-center gap-1"><i className="fa-regular fa-clock"></i> {new Date(o.created_at).toLocaleString('zh-TW')}</span>
                      </div>

                      <div className="p-4 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-100 gap-2 relative z-10">
                        <div className="flex items-center gap-3 flex-wrap">
                            <button onClick={(e) => { e.stopPropagation(); onNavigate(View.SHOP, undefined, o.shop_id); }} className="font-bold text-slate-700 text-sm flex items-center gap-2 hover:text-[#EE4D2D] transition border border-transparent hover:border-slate-200 hover:bg-white px-2 py-1 rounded-lg">
                              <i className="fa-solid fa-store text-slate-400"></i> {sellerName} <i className="fa-solid fa-chevron-right text-xs opacity-50"></i>
                            </button>
                            <button onClick={() => onNavigate(View.CHAT, undefined, o.shop_id)} className="text-[#EE4D2D] text-xs px-2 py-1 rounded bg-orange-50 hover:bg-orange-100 font-bold border border-orange-100"><i className="fa-regular fa-comments mr-1"></i>愛聊</button>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
                            <span className={`text-xs font-bold px-3 py-1 rounded-full whitespace-nowrap ${o.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : o.status === 'CANCELLED' ? 'bg-slate-200 text-slate-500' : 'bg-orange-100 text-[#EE4D2D]'}`}>
                                {BUYER_ORDER_STATUS_OPTIONS.find(x => x.value === o.status)?.label}
                            </span>
                        </div>
                      </div>

                      <div className="p-4 relative z-10">
                        {o.items.map((it, idx) => (
                          <div key={idx} className="flex gap-4 mb-3 last:mb-0">
                            <div className="w-16 h-16 bg-slate-100 rounded-lg overflow-hidden shrink-0 border border-slate-200"><img src={it.images?.[0] || 'https://placehold.co/100'} className="w-full h-full object-cover" /></div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-bold text-slate-800 line-clamp-1">{it.name}</div>
                                <div className="text-xs text-slate-500 mt-1">{it.selectedVariant ? `規格: ${it.selectedVariant}` : '單一規格'} x {it.qty}</div>
                            </div>
                            <div className="text-right"><div className="text-sm font-black text-slate-700">${(it.finalPrice || it.price).toLocaleString()}</div></div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="p-4 bg-slate-50/30 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 relative z-10">
                          <div className="text-xs text-slate-500 font-bold w-full md:w-auto text-center md:text-left">共 {o.items.reduce((a,b)=>a+b.qty,0)} 件商品 • 總金額 <span className="text-lg text-[#EE4D2D] font-black ml-1">${o.total_amount.toLocaleString()}</span></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
        
        {/* ★ 替換為全新獨立的 BuyerReport 報表元件 (傳入 buyOrders 作為個人消費數據) */}
        {activeTab === 'buying_reports' && (
           <BuyerReport orders={buyOrders} />
        )}
      </div>

{/* ★ 新增：今日瀏覽量明細排行榜視窗 */}
      {showViewsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-fade-in-up max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3 shrink-0">
                    <h3 className="font-black text-xl text-slate-800"><i className="fa-solid fa-fire text-[#EE4D2D] mr-2"></i>今日瀏覽排行榜</h3>
                    <button onClick={() => setShowViewsModal(false)} className="text-slate-400 hover:text-red-500"><i className="fa-solid fa-xmark text-xl"></i></button>
                </div>
                <div className="overflow-y-auto custom-scrollbar flex-1 pr-2 space-y-3">
                    {overviewData.todayProductViewsList.length === 0 ? (
                        <div className="text-center text-slate-400 py-10 font-bold">
                            <i className="fa-solid fa-eye-slash text-4xl mb-3 opacity-20 block"></i>
                            今日尚無商品被瀏覽
                        </div>
                    ) : (
                        overviewData.todayProductViewsList.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100 hover:border-blue-200 transition">
                                <div className="flex-1 min-w-0 pr-3 flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${idx === 0 ? 'bg-yellow-100 text-yellow-600' : idx === 1 ? 'bg-slate-200 text-slate-600' : idx === 2 ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-400'}`}>
                                        {idx + 1}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-sm font-bold text-slate-700 truncate">{item.name}</div>
                                        {user.role === 'ADMIN' && <div className="text-[10px] text-slate-400 mt-0.5 truncate"><i className="fa-solid fa-store mr-1"></i>{item.shopName}</div>}
                                    </div>
                                </div>
                                <div className="text-[#EE4D2D] font-black text-lg shrink-0">{item.views} <span className="text-[10px] text-slate-500 font-normal">次</span></div>
                            </div>
                        ))
                    )}
                </div>
                <button onClick={() => setShowViewsModal(false)} className="w-full mt-4 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition shrink-0">關閉明細</button>
            </div>
        </div>
      )}
      
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-fade-in-up">
              <h3 className="font-black text-xl mb-4 text-slate-800 border-b border-slate-100 pb-3">匯出訂單設定</h3>
              
              <div className="space-y-5 mb-6">
                 <div>
                    <label className="text-sm font-bold text-slate-600 mb-2 block">1. 選擇匯出格式</label>
                    <div className="flex gap-2">
                       <button onClick={() => setExportFormat('EXCEL')} className={`flex-1 py-2 rounded-xl font-bold border transition ${exportFormat === 'EXCEL' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}><i className="fa-solid fa-file-excel mr-1"></i> Windows Excel</button>
                       <button onClick={() => setExportFormat('NUMBERS')} className={`flex-1 py-2 rounded-xl font-bold border transition ${exportFormat === 'NUMBERS' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}><i className="fa-brands fa-apple mr-1"></i> Apple Numbers</button>
                    </div>
                 </div>

                 <div>
                    <label className="text-sm font-bold text-slate-600 mb-2 block">2. 選擇匯出狀態 (分頁顯示)</label>
                    <div className="grid grid-cols-2 gap-2">
                       {SELLER_ORDER_STATUS_OPTIONS.map(opt => (
                           <label key={opt.value} className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-2 rounded-lg border border-slate-100 hover:border-[#EE4D2D]">
                              <input 
                                 type="checkbox" 
                                 className="w-4 h-4 accent-[#EE4D2D]"
                                 checked={exportStatuses.has(opt.value)}
                                 onChange={(e) => {
                                    const next = new Set(exportStatuses);
                                    if (opt.value === 'ALL') {
                                       if (e.target.checked) { next.clear(); next.add('ALL'); } 
                                       else { next.delete('ALL'); }
                                    } else {
                                       if (e.target.checked) { next.add(opt.value); next.delete('ALL'); } 
                                       else { next.delete(opt.value); }
                                    }
                                    if(next.size === 0) next.add('ALL');
                                    setExportStatuses(next);
                                 }}
                              />
                              <span className="text-sm font-bold text-slate-700">{opt.label}</span>
                           </label>
                       ))}
                    </div>
                 </div>

                 <div className="pt-2 border-t border-slate-100">
                    <label className="flex items-center gap-2 cursor-pointer">
                       <input type="checkbox" checked={exportAsPickingList} onChange={e => setExportAsPickingList(e.target.checked)} className="w-5 h-5 accent-[#EE4D2D]" />
                       <span className="text-sm font-bold text-slate-700">匯出為揀貨單 (僅統計商品總數量)</span>
                    </label>
                 </div>
              </div>

              <div className="flex gap-3">
                 <button onClick={handleExportConfirm} className="flex-1 bg-[#EE4D2D] text-white py-3 rounded-xl font-bold hover:bg-[#d73211] shadow-md flex items-center justify-center gap-2">
                    <i className="fa-solid fa-download"></i> 確認匯出
                 </button>
                 <button onClick={() => setShowExportModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200">取消</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;