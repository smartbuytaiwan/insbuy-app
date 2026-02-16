import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Product, View, Order, ShippingRule, ProductVariant, BankInfo, Category, Report } from '../types'; 
import { generateMarketingCopy } from '../geminiService'; 
import API from '../api'; 
import CategoryManagement from './CategoryManagement';
import ShopSettings from './ShopSettings';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface AdminDashboardProps {
  user: User;
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
}

const TAIWAN_BANKS = [
  { code: '004', name: '臺灣銀行' },
  { code: '005', name: '臺灣土地銀行' },
  { code: '006', name: '合作金庫商業銀行' },
  { code: '007', name: '第一商業銀行' },
  { code: '008', name: '華南商業銀行' },
  { code: '009', name: '彰化商業銀行' },
  { code: '011', name: '上海商業儲蓄銀行' },
  { code: '012', name: '台北富邦商業銀行' },
  { code: '013', name: '國泰世華商業銀行' },
  { code: '017', name: '兆豐國際商業銀行' },
  { code: '021', name: '花旗(台灣)商業銀行' },
  { code: '048', name: '王道商業銀行' },
  { code: '050', name: '臺灣中小企業銀行' },
  { code: '052', name: '渣打國際商業銀行' },
  { code: '053', name: '台中商業銀行' },
  { code: '054', name: '京城商業銀行' },
  { code: '081', name: '滙豐(台灣)商業銀行' },
  { code: '102', name: '華泰商業銀行' },
  { code: '103', name: '臺灣新光商業銀行' },
  { code: '108', name: '陽信商業銀行' },
  { code: '147', name: '三信商業銀行' },
  { code: '700', name: '中華郵政 (郵局)' },
  { code: '803', name: '聯邦商業銀行' },
  { code: '805', name: '遠東國際商業銀行' },
  { code: '806', name: '元大商業銀行' },
  { code: '807', name: '永豐商業銀行' },
  { code: '808', name: '玉山商業銀行' },
  { code: '809', name: '凱基商業銀行' },
  { code: '810', name: '星展(台灣)商業銀行' },
  { code: '812', name: '台新國際商業銀行' },
  { code: '816', name: '安泰商業銀行' },
  { code: '822', name: '中國信託商業銀行' },
];

const COMMON_ORIGINS = ["台灣", "美國", "日本", "韓國", "中國", "馬來西亞", "越南", "印尼", "印度"];

const TAIWAN_DISTRICTS: Record<string, string[]> = {
    "基隆市": ["仁愛區", "信義區", "中正區", "中山區", "安樂區", "暖暖區", "七堵區"],
    "台北市": ["中正區", "大同區", "中山區", "松山區", "大安區", "萬華區", "信義區", "士林區", "北投區", "內湖區", "南港區", "文山區"],
    "新北市": ["板橋區", "新莊區", "中和區", "永和區", "土城區", "樹林區", "三峽區", "鶯歌區", "三重區", "蘆洲區", "五股區", "泰山區", "林口區", "淡水區", "金山區", "八里區", "萬里區", "石門區", "三芝區", "瑞芳區", "汐止區", "平溪區", "貢寮區", "雙溪區", "深坑區", "石碇區", "新店區", "坪林區", "烏來區"],
    "桃園市": ["桃園區", "中壢區", "平鎮區", "八德區", "楊梅區", "蘆竹區", "大溪區", "龍潭區", "龜山區", "大園區", "觀音區", "新屋區", "復興區"],
    "新竹市": ["東區", "北區", "香山區"],
    "新竹縣": ["竹北市", "竹東鎮", "新埔鎮", "關西鎮", "湖口鄉", "新豐鄉", "芎林鄉", "橫山鄉", "北埔鄉", "寶山鄉", "峨眉鄉", "尖石鄉", "五峰鄉"],
    "苗栗縣": ["苗栗市", "頭份市", "竹南鎮", "後龍鎮", "通霄鎮", "苑裡鎮", "卓蘭鎮", "造橋鄉", "西湖鄉", "頭屋鄉", "公館鄉", "銅鑼鄉", "三義鄉", "大湖鄉", "獅潭鄉", "三灣鄉", "南庄鄉", "泰安鄉"],
    "台中市": ["中區", "東區", "南區", "西區", "北區", "北屯區", "西屯區", "南屯區", "太平區", "大里區", "霧峰區", "烏日區", "豐原區", "后里區", "石岡區", "東勢區", "和平區", "新社區", "潭子區", "大雅區", "神岡區", "大肚區", "沙鹿區", "龍井區", "梧棲區", "清水區", "大甲區", "外埔區", "大安區"],
    "彰化縣": ["彰化市", "員林市", "和美鎮", "鹿港鎮", "溪湖鎮", "二林鎮", "田中鎮", "北斗鎮", "花壇鄉", "芬園鄉", "大村鄉", "永靖鄉", "伸港鄉", "線西鄉", "福興鄉", "秀水鄉", "埔心鄉", "埔鹽鄉", "大城鄉", "芳苑鄉", "二水鄉", "社頭鄉", "田尾鄉", "埤頭鄉", "溪州鄉", "竹塘鄉"],
    "南投縣": ["南投市", "埔里鎮", "草屯鎮", "竹山鎮", "集集鎮", "名間鄉", "鹿谷鄉", "中寮鄉", "魚池鄉", "國姓鄉", "水里鄉", "信義鄉", "仁愛鄉"],
    "雲林縣": ["斗六市", "斗南鎮", "虎尾鎮", "西螺鎮", "土庫鎮", "北港鎮", "林內鄉", "古坑鄉", "大埤鄉", "莿桐鄉", "褒忠鄉", "二崙鄉", "崙背鄉", "麥寮鄉", "臺西鄉", "東勢鄉", "元長鄉", "四湖鄉", "口湖鄉", "水林鄉"],
    "嘉義市": ["東區", "西區"],
    "嘉義縣": ["太保市", "朴子市", "布袋鎮", "大林鎮", "民雄鄉", "溪口鄉", "新港鄉", "六腳鄉", "東石鄉", "義竹鄉", "鹿草鄉", "水上鄉", "中埔鄉", "竹崎鄉", "梅山鄉", "番路鄉", "大埔鄉", "阿里山鄉"],
    "台南市": ["中西區", "東區", "南區", "北區", "安平區", "安南區", "永康區", "歸仁區", "新化區", "左鎮區", "玉井區", "楠西區", "南化區", "仁德區", "關廟區", "龍崎區", "官田區", "麻豆區", "佳里區", "西港區", "七股區", "將軍區", "學甲區", "北門區", "新營區", "後壁區", "白河區", "東山區", "六甲區", "下營區", "柳營區", "鹽水區", "善化區", "大內區", "山上區", "新市區", "安定區"],
    "高雄市": ["楠梓區", "左營區", "鼓山區", "三民區", "鹽埕區", "前金區", "新興區", "苓雅區", "前鎮區", "旗津區", "小港區", "鳳山區", "大寮區", "鳥松區", "林園區", "仁武區", "大樹區", "大社區", "岡山區", "路竹區", "橋頭區", "梓官區", "彌陀區", "永安區", "燕巢區", "田寮區", "阿蓮區", "茄萣區", "湖內區", "旗山區", "美濃區", "內門區", "杉林區", "甲仙區", "六龜區", "茂林區", "桃源區", "那瑪夏區"],
    "屏東縣": ["屏東市", "潮州鎮", "東港鎮", "恆春鎮", "萬丹鄉", "長治鄉", "麟洛鄉", "九如鄉", "里港鄉", "鹽埔鄉", "高樹鄉", "萬巒鄉", "內埔鄉", "竹田鄉", "新埤鄉", "枋寮鄉", "新園鄉", "崁頂鄉", "林邊鄉", "南州鄉", "佳冬鄉", "琉球鄉", "車城鄉", "滿州鄉", "枋山鄉", "霧台鄉", "瑪家鄉", "泰武鄉", "來義鄉", "春日鄉", "獅子鄉", "牡丹鄉", "三地門鄉"],
    "宜蘭縣": ["宜蘭市", "羅東鎮", "蘇澳鎮", "頭城鎮", "礁溪鄉", "壯圍鄉", "員山鄉", "冬山鄉", "五結鄉", "三星鄉", "大同鄉", "南澳鄉"],
    "花蓮縣": ["花蓮市", "鳳林鎮", "玉里鎮", "新城鄉", "吉安鄉", "壽豐鄉", "光復鄉", "豐濱鄉", "瑞穗鄉", "富里鄉", "秀林鄉", "萬榮鄉", "卓溪鄉"],
    "台東縣": ["台東市", "成功鎮", "關山鎮", "長濱鄉", "池上鄉", "東河鄉", "鹿野鄉", "卑南鄉", "大武鄉", "綠島鄉", "太麻里鄉", "海端鄉", "延平鄉", "金峰鄉", "達仁鄉", "蘭嶼鄉"],
    "澎湖縣": ["馬公市", "湖西鄉", "白沙鄉", "西嶼鄉", "望安鄉", "七美鄉"],
    "金門縣": ["金城鎮", "金湖鎮", "金沙鎮", "金寧鄉", "烈嶼鄉", "烏坵鄉"],
    "連江縣": ["南竿鄉", "北竿鄉", "莒光鄉", "東引鄉"]
};

const SHIPPING_PRESETS = [
  { name: '7-11', fee: 60 },
  { name: '全家', fee: 60 },
  { name: '萊爾富', fee: 60 },
  { name: 'OK超商', fee: 60 },
  { name: '蝦皮店到店', fee: 45 },
  { name: '中華郵政', fee: 80 },
  { name: '黑貓宅急便', fee: 170 },
  { name: '賣家宅配', fee: 100 },
  { name: '面交/自取', fee: 0 }
];

const PAYMENT_OPTIONS = [
  { value: 'BANK', label: '銀行匯款' },
  { value: 'COD', label: '貨到付款' },
  { value: 'CASH', label: '面交/現金付款' }
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#EE4D2D'];

const SELLER_ORDER_STATUS_OPTIONS = [
  { value: 'ALL', label: '全部' },
  { value: 'NEW', label: '新訂單' }, 
  { value: 'PENDING', label: '待付款' },
  { value: 'CONFIRMED', label: '待出貨' },
  { value: 'SHIPPED', label: '待收貨' }, 
  { value: 'COMPLETED', label: '已完成' },
  { value: 'CANCELLED', label: '取消/退款' }
];

const BUYER_ORDER_STATUS_OPTIONS = [
  { value: 'ALL', label: '全部' },
  { value: 'PENDING', label: '待付款' },
  { value: 'CONFIRMED', label: '待出貨' },
  { value: 'SHIPPED', label: '已出貨' }, 
  { value: 'COMPLETED', label: '已完成' },
  { value: 'CANCELLED', label: '取消/退款' }
];

// WYSIWYG 商品圖片裁切器
const ProductImageCropper = ({ src, onComplete, onCancel }: { src: string, onComplete: (blob: string) => void, onCancel: () => void }) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const startRef = useRef({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);

  // 固定參數
  const containerW = 400; 
  const containerH = 400; // 1:1

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [src]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    setOffset({ x: e.clientX - startRef.current.x, y: e.clientY - startRef.current.y });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleSave = () => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    
    const outputSize = 800; // 輸出解析度
    const scaleFactor = outputSize / containerW; 

    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, outputSize, outputSize);

    const ratioW = containerW / img.naturalWidth;
    const ratioH = containerH / img.naturalHeight;
    const baseScale = Math.min(ratioW, ratioH);

    const renderW = img.naturalWidth * baseScale;
    const renderH = img.naturalHeight * baseScale;

    ctx.save();
    ctx.translate(outputSize / 2, outputSize / 2);
    ctx.translate(offset.x * scaleFactor, offset.y * scaleFactor);
    ctx.scale(zoom, zoom);
    
    ctx.drawImage(
      img,
      -renderW * scaleFactor / 2,
      -renderH * scaleFactor / 2,
      renderW * scaleFactor,
      renderH * scaleFactor
    );
    
    ctx.restore();
    
    onComplete(canvas.toDataURL('image/jpeg', 0.9));
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
       <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
          <h3 className="font-bold text-lg mb-4 text-slate-800">編輯商品圖片 (1:1)</h3>
          
          <div 
             className="bg-slate-900 overflow-hidden relative mx-auto mb-4 cursor-move border-2 border-slate-200 rounded-lg shadow-inner flex items-center justify-center"
             style={{ width: containerW, height: containerH }}
             onMouseDown={handleMouseDown}
             onMouseMove={handleMouseMove}
             onMouseUp={handleMouseUp}
             onMouseLeave={handleMouseUp}
          >
             <img 
               ref={imgRef}
               src={src} 
               className="max-w-none absolute select-none origin-center"
               style={{ 
                 transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                 maxWidth: '100%',
                 maxHeight: '100%',
                 objectFit: 'contain' 
               }}
               draggable={false}
             />
             
             {/* 輔助線 */}
             <div className="absolute inset-0 pointer-events-none opacity-30 border border-white/50">
                 <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/50"></div>
                 <div className="absolute right-1/3 top-0 bottom-0 w-px bg-white/50"></div>
                 <div className="absolute top-1/3 left-0 right-0 h-px bg-white/50"></div>
                 <div className="absolute bottom-1/3 left-0 right-0 h-px bg-white/50"></div>
             </div>
          </div>

          <div className="flex items-center gap-4 mb-6">
             <i className="fa-solid fa-magnifying-glass-minus text-slate-400 text-xs"></i>
             <input 
               type="range" 
               min="0.5" 
               max="3" 
               step="0.05" 
               value={zoom} 
               onChange={e => setZoom(parseFloat(e.target.value))}
               className="flex-1 accent-[#EE4D2D] h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
             />
             <i className="fa-solid fa-magnifying-glass-plus text-slate-600 text-lg"></i>
          </div>

          <div className="flex gap-3">
             <button onClick={handleSave} className="flex-1 py-3 bg-[#EE4D2D] text-white rounded-xl font-bold hover:bg-[#d73211] transition">確認裁切</button>
             <button onClick={onCancel} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition">取消</button>
          </div>
       </div>
    </div>
  );
};

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
     // 支援匯出 ALL 時的分頁邏輯
     let sheetOrders: Order[] = [];
     if (status === 'ALL') {
         // 不會發生，因為在呼叫前會轉換
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
  viewedOrderIds = [], onMarkAsViewed
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'products' | 'create' | 'categories' | 'settings' | 'system_cats' | 'buying_account' | 'buying_orders' | 'buying_reports' | 'reports'>('overview');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cropModal, setCropModal] = useState<{ isOpen: boolean, src: string, editIndex: number | null }>({ isOpen: false, src: '', editIndex: null });

  const [reports, setReports] = useState<Report[]>([]);
  const [reportPage, setReportPage] = useState(1);
  const REPORTS_PER_PAGE = 10;

  const [orderPage, setOrderPage] = useState(1);
  const [productPage, setProductPage] = useState(1);
  const ORDERS_PER_PAGE = 8;
  const PRODUCTS_PER_PAGE = 8;

  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStatuses, setExportStatuses] = useState<Set<string>>(new Set(['ALL']));
  const [exportAsPickingList, setExportAsPickingList] = useState(false);
  
  const [tempSellerNotes, setTempSellerNotes] = useState<Record<string, string>>({});

  // 出貨地點與區域設定狀態
  const [originSelect, setOriginSelect] = useState('台北市');
  const [originDistrictSelect, setOriginDistrictSelect] = useState('');
  const [originManual, setOriginManual] = useState('');

  // 全域商品搜尋 ID
  const [globalSearchId, setGlobalSearchId] = useState('');

  // 修正 1：只顯示自己的商品 (myShopProducts)
  const myShopProducts = useMemo(() => {
      // 否則只顯示自己的商品
      return products.filter(p => p.shop_id === (user.shop_id || user.id));
  }, [products, user]);

  // 庫存警示：計算已售完的商品
  const outOfStockProducts = useMemo(() => {
      return myShopProducts.filter(p => p.total_stock <= 0 && p.status === 'OPEN');
  }, [myShopProducts]);

  useEffect(() => {
    if (initialTab && (
      initialTab === 'overview' || initialTab === 'orders' || initialTab === 'products' || 
      initialTab === 'create' || initialTab === 'categories' || initialTab === 'settings'
    )) {
      setActiveTab(initialTab as any);
    }
  }, [initialTab]);

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
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [orderSearchTerm, setOrderSearchTerm] = useState('');

  useEffect(() => {
    setOrderPage(1);
  }, [orderStatusFilter, orderSearchTerm, orderRange]);

  const [buyOrderStatusFilter, setBuyOrderStatusFilter] = useState<string>('ALL');
  const [reportStartDate, setReportStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]
  );
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [newSystemCatName, setNewSystemCatName] = useState('');

  const shopId = user.shop_id || user.id;

  const overviewData = useMemo(() => {
    const salesTrend = [];
    const statusCount: Record<string, number> = {};
    let totalSales = 0;
    let totalOrders = 0;

    const startDate = new Date(overviewRange.start);
    const endDate = new Date(overviewRange.end);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dailyOrders = orders.filter(o => o.created_at.startsWith(dateStr) && o.status !== 'CANCELLED');
      const dailyTotal = dailyOrders.reduce((sum, o) => sum + o.total_amount, 0);
      salesTrend.push({ name: dateStr.slice(5), sales: dailyTotal, fullDate: dateStr });
      totalSales += dailyTotal;
      totalOrders += dailyOrders.length;
    }

    orders.forEach(o => {
      const oDate = o.created_at.split('T')[0];
      if (oDate >= overviewRange.start && oDate <= overviewRange.end) {
        statusCount[o.status] = (statusCount[o.status] || 0) + 1;
      }
    });
    
    const pieData = Object.keys(statusCount).map(key => {
        const label = SELLER_ORDER_STATUS_OPTIONS.find(opt => opt.value === key)?.label || key;
        return { name: label, value: statusCount[key] };
    });

    return { salesTrend, pieData, totalSales, totalOrders };
  }, [orders, overviewRange]);

  const filteredOrders = useMemo(() => {
    const s = new Date(orderRange.start).setHours(0,0,0,0);
    const e = new Date(orderRange.end).setHours(23,59,59,999);
    
    let list = orders.filter(o => {
      const t = new Date(o.created_at).getTime();
      return t >= s && t <= e;
    });

    if (orderStatusFilter === 'NEW') {
        list = list.filter(o => o.status === 'PENDING' || o.status === 'CONFIRMED');
    } else if (orderStatusFilter !== 'ALL') {
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
  }, [orders, orderRange, orderStatusFilter, orderSearchTerm]);

  const paginatedOrders = useMemo(() => {
    const startIndex = (orderPage - 1) * ORDERS_PER_PAGE;
    return filteredOrders.slice(startIndex, startIndex + ORDERS_PER_PAGE);
  }, [filteredOrders, orderPage]);

  const totalOrderPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE);

  // 修正 3：新訂單紅點計算 (只算自己的 + 未讀的 + 待處理的)
  const pendingNotificationCount = useMemo(() => {
      return orders.filter(o => 
          (o.shop_id === (user.shop_id || user.id)) && 
          (o.status === 'PENDING' || o.status === 'CONFIRMED') &&
          !viewedOrderIds?.includes(o.id)
      ).length;
  }, [orders, user, viewedOrderIds]);

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
                const key = `${item.name}${item.variantName ? ` (${item.variantName})` : ''}`;
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
        
        exportToExcelXML(ordersToExport, statusesToExport, `orders_${orderRange.start}_${orderRange.end}`);
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

  const buyReportData = useMemo(() => {
    const s = new Date(reportStartDate).getTime();
    const e = new Date(reportEndDate).getTime() + 86400000;
    const validOrders = buyOrders.filter(o => {
      const time = new Date(o.created_at).getTime();
      return time >= s && time < e && o.status !== 'CANCELLED';
    });
    const totalSpending = validOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const dailyData: Record<string, number> = {};
    validOrders.forEach(o => {
      const dateStr = o.created_at.split('T')[0];
      dailyData[dateStr] = (dailyData[dateStr] || 0) + o.total_amount;
    });
    const chartData = Object.keys(dailyData).sort().map(date => ({
      date: date.slice(5),
      amount: dailyData[date]
    }));
    return { totalSpending, chartData };
  }, [buyOrders, reportStartDate, reportEndDate]);

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
          const targetProduct = products.find(p => p.id === rpt.targetId);
          if (targetProduct) {
              onNavigate(View.PRODUCT, targetProduct);
          } else {
              alert('找不到該商品，可能已被刪除或下架。');
          }
      } else {
          onNavigate(View.SHOP, undefined, rpt.targetId);
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
      variants: [{ name: '預設', price: 0, stock: 100 }],
      shipping_rules: [],
      payment_methods: ['BANK', 'COD', 'CASH'], 
      bank_info: bankInfo,
      questions: [],
      origin: '台灣',
      shipping_origin: '台北市', 
      target_amount: 50000,
      current_amount: 0,
      end_time: new Date(Date.now() + 86400000 * 7).toISOString(),
      is_pinned: false
    };
  };

  const [form, setForm] = useState<Partial<Product>>(getInitialForm());
  const [saveBank, setSaveBank] = useState(!!localStorage.getItem('insbuy_saved_bank'));
  const [isCustomBank, setIsCustomBank] = useState(false);
  const [selectedMainCat, setSelectedMainCat] = useState<string>('');
  const [selectedSubCat, setSelectedSubCat] = useState<string>('');
  const [selectedShopMainCat, setSelectedShopMainCat] = useState<string>('');
  const [selectedShopSubCat, setSelectedShopSubCat] = useState<string>('');

  const addVariant = () => {
    setForm(prev => ({ ...prev, variants: [...(prev.variants || []), { name: '', price: 0, stock: 0 }] }));
  };

  const removeVariant = (index: number) => {
    setForm(prev => {
      const newVariants = [...(prev.variants || [])];
      newVariants.splice(index, 1);
      return { ...prev, variants: newVariants };
    });
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: any) => {
    setForm(prev => {
      const newVariants = [...(prev.variants || [])];
      newVariants[index] = { ...newVariants[index], [field]: value };
      return { ...prev, variants: newVariants };
    });
  };

  const addShippingRule = (customName?: string, customFee?: number) => {
    const name = customName || '新運送方式';
    if (form.shipping_rules?.some(rule => rule.name === name)) {
        alert(`運送方式「${name}」已存在，請勿重複新增。`);
        return;
    }
    const fee = customFee !== undefined ? customFee : 60;
    const newRule: ShippingRule = { name, fee, free_threshold: 1000, limit_qty: 0, pickup_address: '' };
    setForm(prev => ({ ...prev, shipping_rules: [...(prev.shipping_rules || []), newRule] }));
  };

  const updateShippingRule = (index: number, field: keyof ShippingRule, value: any) => {
    setForm(prev => {
      const newRules = [...(prev.shipping_rules || [])];
      newRules[index] = { ...newRules[index], [field]: value };
      return { ...prev, shipping_rules: newRules };
    });
  };

  const removeShippingRule = (index: number) => {
     setForm(prev => {
      const newRules = [...(prev.shipping_rules || [])];
      newRules.splice(index, 1);
      return { ...prev, shipping_rules: newRules };
    });
  };

  const addQuestion = () => {
    setForm(prev => ({ ...prev, questions: [...(prev.questions || []), { title: '', required: false }] }));
  };

  const updateQuestion = (index: number, field: 'title' | 'required', value: any) => {
    setForm(prev => {
      const newQs = [...(prev.questions || [])];
      newQs[index] = { ...newQs[index], [field]: value };
      return { ...prev, questions: newQs };
    });
  };

  const removeQuestion = (index: number) => {
    setForm(prev => {
      const newQs = [...(prev.questions || [])];
      newQs.splice(index, 1);
      return { ...prev, questions: newQs };
    });
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.size > 10 * 1024 * 1024) return alert(`檔案 ${file.name} 太大`); 
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setCropModal({ isOpen: true, src: reader.result as string, editIndex: null });
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (croppedBase64: string) => {
     if (cropModal.editIndex !== null) {
        const newImages = [...(form.images || [])];
        newImages[cropModal.editIndex] = croppedBase64;
        setForm(prev => ({ ...prev, images: newImages }));
     } else {
        setForm(prev => ({ ...prev, images: [...(prev.images || []), croppedBase64] }));
     }
     setCropModal({ isOpen: false, src: '', editIndex: null });
  };

  const handleAddCategoryTag = (source: 'SYSTEM' | 'SHOP') => {
    let targetId = '';
    if (source === 'SYSTEM') {
        targetId = selectedSubCat || selectedMainCat;
        if (!targetId) return;
        setSelectedSubCat('');
        setSelectedMainCat('');
    } else {
        targetId = selectedShopSubCat || selectedShopMainCat;
        if (!targetId) return;
        setSelectedShopSubCat('');
        setSelectedShopMainCat('');
    }
    if (!form.category_ids?.includes(targetId)) {
      setForm(prev => ({ ...prev, category_ids: [...(prev.category_ids || []), targetId] }));
    }
  };

  const removeCategoryTag = (idToRemove: string) => {
    setForm(prev => ({
      ...prev,
      category_ids: prev.category_ids?.filter(id => id !== idToRemove)
    }));
  };

  const getCategoryName = (id: string) => {
    const shopCat = categories.find(c => c.id === id);
    if (shopCat) return shopCat.name;
    const sysCat = systemCategories.find(c => c.id === id);
    if (sysCat) return sysCat.name;
    return id; 
  };

  const handleSaveProduct = async () => {
    if (!form.name || !form.price) return alert('請填寫商品名稱與價格');
    if (form.product_type === 'PHYSICAL' && (!form.shipping_rules || form.shipping_rules.length === 0)) {
       if(!confirm('您尚未設定任何運送方式，確定要發布嗎？')) return;
    }

    if (saveBank && form.bank_info) {
      localStorage.setItem('insbuy_saved_bank', JSON.stringify(form.bank_info));
    } else if (!saveBank) {
      localStorage.removeItem('insbuy_saved_bank');
    }

    let finalOrigin = originSelect;
    if (originSelect === '手動填寫') {
        finalOrigin = originManual;
    } else if (originDistrictSelect) {
        finalOrigin = `${originSelect}${originDistrictSelect}`;
    }

    const productData: Product = {
      ...getInitialForm(),
      ...form,
      shipping_origin: finalOrigin, 
      id: editingId || `p-${Date.now()}`,
      shop_id: shopId,
      category_id: form.category_ids?.[0] || '',
      total_stock: form.variants?.reduce((sum, v) => sum + v.stock, 0) || 0
    } as Product;

    try {
      if (editingId) {
        await API.updateProduct(productData);
        onUpdateProducts(products.map(p => p.id === editingId ? productData : p));
      } else {
        await API.createProduct(productData);
        onUpdateProducts([productData, ...products]);
      }
      resetForm();
      alert(editingId ? '商品修改成功！' : '商品已成功發布！');
    } catch (error) {
      alert('儲存失敗，請檢查後端連線');
    }
  };

  const resetForm = () => {
    setForm(getInitialForm());
    setOriginSelect('台北市');
    setOriginDistrictSelect('');
    setOriginManual('');
    setEditingId(null);
    setGlobalSearchId(''); // 搜尋結束
    setActiveTab('products'); 
  };

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

  const notifyBuyer = (orderId: string, newStatus: string, receiverPhone: string) => {
    const msgs = JSON.parse(localStorage.getItem('insbuy_chat_messages') || '[]');
    const statusLabel = SELLER_ORDER_STATUS_OPTIONS.find(opt => opt.value === newStatus)?.label || newStatus;
    const targetOrder = orders.find(o => o.id === orderId);
    let itemsList = '';
    if (targetOrder) {
      itemsList = targetOrder.items.map(i => `• ${i.name} ${i.selectedVariant ? `(${i.selectedVariant})` : ''} x${i.qty}`).join('\n');
    }

    let text = `[系統通知]\n訂單編號：#${orderId.slice(-6)}\n目前狀態：${statusLabel}\n商品資訊：\n${itemsList}`;
    if (newStatus === 'COMPLETED') text += '\n\n感謝您的購買！收到商品後，請記得給予我們評價喔！';

    const newMessage = {
      id: `sys_${Date.now()}`,
      senderId: user.shop_id || user.id, 
      receiverId: receiverPhone,
      text,
      timestamp: new Date().toISOString(),
      isRead: false
    };

    msgs.push(newMessage);
    localStorage.setItem('insbuy_chat_messages', JSON.stringify(msgs));
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: Order['status']) => {
    let cancellationReason = '';
    if (newStatus === 'CANCELLED') {
      const input = prompt('請輸入取消原因：');
      if (input === null) return;
      cancellationReason = input;
    }
    onUpdateOrderStatus(orderId, newStatus, cancellationReason);
    
    const targetOrder = orders.find(o => o.id === orderId);
    if (targetOrder) {
      notifyBuyer(orderId, newStatus, targetOrder.receiver_phone);
    }
    
    if (newStatus === 'COMPLETED') {
      alert(`訂單 ${orderId} 已完成！\n系統已自動發送愛聊訊息通知買家。`);
    }
  };

  const handleSaveSellerNote = (orderId: string) => {
    const note = tempSellerNotes[orderId];
    if (note === undefined) return;
    onUpdateOrderStatus(orderId, undefined as any, undefined, note);
    alert('備註已更新');
  };

  // ★ 新增：切換是否已收到貨款
  const handleTogglePaid = async (orderId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    try {
        // 呼叫後端 API 更新
        await API.updateOrder(orderId, { is_paid: newStatus } as any);
        // 因為無法直接更新 props 的 orders，呼叫 onUpdateOrderStatus 觸發上層刷新 (傳入原本的 status)
        const currentOrder = orders.find(o => o.id === orderId);
        if (currentOrder) {
            onUpdateOrderStatus(orderId, currentOrder.status); 
        }
    } catch (e) {
        console.error(e);
        alert('更新付款狀態失敗');
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

  // ★ 修改：全域商品搜尋處理 (Fix 2: 改為跳轉到商品詳情頁)
  const handleGlobalProductSearch = () => {
      if(!globalSearchId) return alert('請輸入商品編號');
      const target = products.find(p => p.id === globalSearchId);
      if(target) {
          // 直接導航到前台商品頁
          onNavigate(View.PRODUCT, target);
      } else {
          alert('找不到該商品編號，請確認後再試。');
      }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6 animate-fade-in pb-20">
      
      {cropModal.isOpen && (
         <ProductImageCropper 
            src={cropModal.src} 
            onComplete={handleCropComplete} 
            onCancel={() => setCropModal({ isOpen: false, src: '', editIndex: null })} 
         />
      )}

      <aside className="w-full md:w-64 space-y-2 shrink-0">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 sticky top-24">
          <div className="flex items-center gap-3 mb-6">
            <img src={user.logo || 'https://placehold.co/100'} className="w-10 h-10 rounded-xl object-cover bg-slate-100 border" />
            <div>
              <div className="font-bold text-slate-800 text-sm truncate">{user.shop_name || user.name}</div>
              <div className="text-[10px] text-slate-400 font-mono">ID: {shopId}</div>
            </div>
          </div>
          <nav className="space-y-1">
            {[
              { id: 'overview', icon: 'fa-chart-pie', label: '經營概況' },
              { id: 'orders', icon: 'fa-receipt', label: '訂單管理' },
              { id: 'products', icon: 'fa-box-open', label: '商品管理' },
              { id: 'categories', icon: 'fa-list-ul', label: '分類管理' },
              { id: 'settings', icon: 'fa-store', label: '商店設定' },
              { id: 'create', icon: 'fa-plus-circle', label: editingId ? '編輯商品' : '新增商品' },
            ].map(item => (
              <button 
                key={item.id}
                onClick={() => { 
                    if(item.id === 'create') {
                        setForm(getInitialForm());
                        setOriginSelect('台北市');
                        setOriginDistrictSelect('');
                        setOriginManual('');
                        setEditingId(null);
                        setGlobalSearchId('');
                        setActiveTab('create');
                    } else {
                        setActiveTab(item.id as any); 
                        if(item.id !== 'create') setEditingId(null); 
                    }
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all relative ${activeTab === item.id ? 'bg-[#EE4D2D] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {/* 修正 3：訂單管理紅點 */}
                {item.id === 'orders' && pendingNotificationCount > 0 && (
                    <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 border border-white rounded-full"></div>
                )}
                <i className={`fa-solid ${item.icon} w-5`}></i>
                {item.label}
              </button>
            ))}
            
            {user.role === 'ADMIN' && (
              <>
                <button 
                    onClick={() => setActiveTab('system_cats')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'system_cats' ? 'bg-[#EE4D2D] text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <i className="fa-solid fa-sitemap w-5"></i>
                    平台分類管理
                </button>
                <button 
                    onClick={() => setActiveTab('reports')}
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
                   onClick={() => setActiveTab(item.id as any)}
                   className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === item.id ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
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
          </nav>
        </div>
      </aside>

      <div className="flex-1 space-y-6">
        
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

        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-2">
               <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-2 md:mb-0">
                 <i className="fa-solid fa-chart-simple text-[#EE4D2D]"></i> 經營概況
               </h2>
               <div className="flex items-center gap-2 text-sm bg-slate-50 p-2 rounded-xl">
                  <span className="text-slate-500 font-bold px-2">統計區間:</span>
                  <input type="date" value={overviewRange.start} onChange={e => setOverviewRange({...overviewRange, start: e.target.value})} className="border border-slate-300 rounded-lg px-2 py-1 outline-none text-slate-600 font-bold" />
                  <span className="text-slate-300">~</span>
                  <input type="date" value={overviewRange.end} onChange={e => setOverviewRange({...overviewRange, end: e.target.value})} className="border border-slate-300 rounded-lg px-2 py-1 outline-none text-slate-600 font-bold" />
               </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">區間總銷售額</div>
                <div className="text-2xl font-black text-[#EE4D2D]">${overviewData.totalSales.toLocaleString()}</div>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">區間訂單數</div>
                <div className="text-2xl font-black text-slate-800">{overviewData.totalOrders} <span className="text-sm text-slate-400">筆</span></div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><i className="fa-solid fa-arrow-trend-up text-[#EE4D2D]"></i> 銷售趨勢</h3>
                  <div className="h-64 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={overviewData.salesTrend}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                        <Tooltip labelFormatter={(label, payload) => payload[0]?.payload.fullDate} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                        <Line type="monotone" dataKey="sales" stroke="#EE4D2D" strokeWidth={3} dot={{r: 4, fill: '#EE4D2D', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
               </div>
               
               <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                  <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2"><i className="fa-solid fa-chart-pie text-blue-500"></i> 訂單狀態 (區間內)</h3>
                  <div className="h-64 w-full min-w-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={overviewData.pieData}
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {overviewData.pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
               </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && <ShopSettings user={user} onUpdateUser={onUpdateUser} />}
        {activeTab === 'categories' && <CategoryManagement shopId={shopId} categories={categories} products={products} onUpdateCategories={onUpdateCategories} />}
        
        {activeTab === 'system_cats' && user.role === 'ADMIN' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><i className="fa-solid fa-sitemap text-[#EE4D2D]"></i> 平台首頁分類管理</h2>
            <div className="mb-6 flex gap-2">
               <input type="text" placeholder="輸入主分類名稱..." className="flex-1 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-[#EE4D2D]" value={newSystemCatName} onChange={e => setNewSystemCatName(e.target.value)}/>
               <button onClick={() => handleAddSystemCategory(null)} className="px-6 py-3 bg-[#EE4D2D] text-white rounded-xl font-bold hover:bg-[#d73211] transition"><i className="fa-solid fa-plus mr-2"></i>新增主分類</button>
            </div>
            <div className="space-y-2">{renderSystemCategoryTree(null)}</div>
          </div>
        )}
        {activeTab === 'reports' && user.role === 'ADMIN' && (
           <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><i className="fa-solid fa-triangle-exclamation text-red-500"></i> 檢舉案件管理</h2>
              <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                    <thead>
                       <tr className="bg-slate-100 text-slate-600 text-sm">
                          <th className="p-3 rounded-tl-xl">日期</th>
                          <th className="p-3">類型</th>
                          <th className="p-3">被檢舉對象</th>
                          <th className="p-3">主題</th>
                          <th className="p-3">檢舉人</th>
                          <th className="p-3">狀態</th>
                          <th className="p-3 rounded-tr-xl">操作</th>
                       </tr>
                    </thead>
                    <tbody>
                       {paginatedReports.length === 0 ? (
                         <tr><td colSpan={7} className="p-8 text-center text-slate-400">目前沒有檢舉案件</td></tr>
                       ) : (
                          paginatedReports.map(rpt => (
                             <tr key={rpt.id} className="border-b border-slate-50 hover:bg-red-50/30">
                                <td className="p-3 text-sm text-slate-500">{new Date(rpt.created_at).toLocaleDateString()}</td>
                                <td className="p-3 text-sm font-bold">
                                   <span className={`px-2 py-1 rounded text-xs ${rpt.type === 'SHOP' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}`}>{rpt.type === 'SHOP' ? '商家' : '商品'}</span>
                                </td>
                                <td className="p-3 text-sm font-bold text-slate-800">
                                   {rpt.targetName}
                                   <div className="text-[10px] text-slate-400 font-mono">{rpt.targetId}</div>
                                </td>
                                <td className="p-3 text-sm text-slate-700">
                                   <div className="font-bold">{rpt.subject}</div>
                                   <div className="text-xs text-slate-500 truncate max-w-[200px]">{rpt.reason}</div>
                                </td>
                                <td className="p-3 text-sm text-slate-600">{rpt.reporterName}</td>
                                <td className="p-3">
                                   <select 
                                      className={`text-xs font-bold px-2 py-1 rounded border-none outline-none cursor-pointer ${rpt.status === 'PENDING' ? 'bg-yellow-100 text-yellow-600' : rpt.status === 'RESOLVED' ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-600'}`}
                                      value={rpt.status}
                                      onChange={(e) => handleUpdateReportStatus(rpt.id, e.target.value as any)}
                                   >
                                      <option value="PENDING">待處理</option>
                                      <option value="RESOLVED">已處理</option>
                                      <option value="DISMISSED">忽略</option>
                                   </select>
                                </td>
                                <td className="p-3 flex gap-2">
                                   <button onClick={() => handleViewReportTarget(rpt)} className="px-3 py-1 bg-slate-800 text-white rounded text-xs hover:bg-slate-700">查看</button>
                                   <button onClick={() => handleDeleteReport(rpt.id)} className="px-3 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200">刪除</button>
                                </td>
                             </tr>
                          ))
                       )}
                    </tbody>
                 </table>
              </div>
              {totalReportPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8">
                  <button onClick={() => setReportPage(p => Math.max(1, p - 1))} disabled={reportPage === 1} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50"><i className="fa-solid fa-chevron-left mr-1"></i> 上一頁</button>
                  <span className="text-sm font-bold text-slate-600">第 {reportPage} 頁 / 共 {totalReportPages} 頁</span>
                  <button onClick={() => setReportPage(p => Math.min(totalReportPages, p + 1))} disabled={reportPage === totalReportPages} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50">下一頁 <i className="fa-solid fa-chevron-right ml-1"></i></button>
                </div>
              )}
           </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4 pb-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 font-black">訂單管理系統 (銷售)</h2>
              <div className="flex items-center gap-2 text-sm bg-slate-50 p-2 rounded-xl">
                  <span className="text-slate-500 font-bold px-2">訂單日期:</span>
                  <input type="date" value={orderRange.start} onChange={e => setOrderRange({...orderRange, start: e.target.value})} className="border border-slate-300 rounded-lg px-2 py-1 outline-none text-slate-600 font-bold" />
                  <span className="text-slate-300">~</span>
                  <input type="date" value={orderRange.end} onChange={e => setOrderRange({...orderRange, end: e.target.value})} className="border border-slate-300 rounded-lg px-2 py-1 outline-none text-slate-600 font-bold" />
               </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
               <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide flex-1">
                 {SELLER_ORDER_STATUS_OPTIONS.map(opt => (
                   <button
                     key={opt.value}
                     onClick={() => setOrderStatusFilter(opt.value)}
                     className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition ${orderStatusFilter === opt.value ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                   >
                     {opt.label}
                   </button>
                 ))}
               </div>
               
               <div className="flex gap-2">
                 <div className="relative">
                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-sm"></i>
                    <input 
                      type="text" 
                      placeholder="搜尋商品/訂單/客戶..." 
                      className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#EE4D2D] w-64"
                      value={orderSearchTerm}
                      onChange={e => setOrderSearchTerm(e.target.value)}
                    />
                 </div>
                 <button 
                   onClick={() => setShowExportModal(true)}
                   className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm shadow-sm flex items-center gap-2 whitespace-nowrap"
                 >
                   <i className="fa-solid fa-file-excel"></i> 匯出 Excel
                 </button>
               </div>
            </div>

            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="py-20 text-center text-slate-300">
                  <i className="fa-regular fa-calendar-xmark text-4xl mb-4 block opacity-20"></i>
                  該日期區間或狀態下無訂單資料
                </div>
              ) : (
                paginatedOrders.map(o => (
                  <div 
                    key={o.id} 
                    onClick={() => {
                       if (onMarkAsViewed) onMarkAsViewed(o.id);
                       setExpandedOrderId(expandedOrderId === o.id ? null : o.id);
                    }}
                    className={`p-5 border rounded-3xl transition shadow-sm bg-white relative overflow-hidden group cursor-pointer ${expandedOrderId === o.id ? 'border-[#EE4D2D] ring-1 ring-[#EE4D2D]' : 'border-slate-100 hover:bg-slate-50'}`}
                  >
                    {!viewedOrderIds?.includes(o.id) && (
                      <div className="absolute top-0 right-0 bg-[#EE4D2D] text-white text-[10px] font-black px-3 py-1 rounded-bl-xl shadow-md z-10 animate-pulse">NEW</div>
                    )}

                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-500">訂單編號 #{o.id.slice(-6)}</span>
                          <span className="font-bold text-slate-800">{o.receiver_name}</span>
                        </div>
                        {/* ★ 新增：已收到貨款勾選 */}
                        <label className="flex items-center gap-2 cursor-pointer bg-slate-50 px-3 py-1 rounded-lg border border-slate-200 w-fit mt-2 hover:bg-slate-100" onClick={e => e.stopPropagation()}>
                           <input 
                              type="checkbox" 
                              className="accent-green-600 w-4 h-4 cursor-pointer"
                              checked={(o as any).is_paid || false}
                              onChange={(e) => handleTogglePaid(o.id, (o as any).is_paid)}
                           />
                           <span className="text-xs font-bold text-slate-600">已收到貨款</span>
                        </label>
                      </div>
                      <select 
                        className={`text-xs font-bold px-4 py-2 rounded-full outline-none border-none cursor-pointer ${
                          o.status === 'PENDING' ? 'bg-orange-100 text-orange-600' : 
                          o.status === 'CONFIRMED' ? 'bg-indigo-100 text-indigo-600' :
                          o.status === 'SHIPPED' ? 'bg-blue-100 text-blue-600' : 
                          o.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'
                        }`}
                        value={o.status}
                        onClick={e => e.stopPropagation()} 
                        onChange={e => handleUpdateOrderStatus(o.id, e.target.value as any)}
                      >
                        {SELLER_ORDER_STATUS_OPTIONS.filter(opt => opt.value !== 'ALL' && opt.value !== 'NEW').map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1 mb-2">
                      {o.items.map((it, i) => (
                        <div key={i} className="flex gap-3 mb-2 bg-slate-50 p-2 rounded-lg items-center">
                           <div className="w-10 h-10 rounded overflow-hidden shrink-0 border border-slate-200 bg-white">
                              <img src={it.image || it.images?.[0] || 'https://placehold.co/100'} className="w-full h-full object-cover" alt={it.name} />
                           </div>
                           <div className="flex-1 min-w-0">
                               <div className="text-xs font-bold text-slate-700 truncate">{it.name}</div>
                               <div className="text-[10px] text-slate-500 flex justify-between mt-1">
                                  <span>{it.selectedVariant ? `規格: ${it.selectedVariant}` : '單一規格'}</span>
                                  <span>x {it.qty}</span>
                               </div>
                           </div>
                        </div>
                      ))}
                    </div>

                    <div className="text-right font-black text-[#EE4D2D] text-lg">
                        ${o.total_amount.toLocaleString()}
                    </div>

                    {expandedOrderId === o.id && (
                       <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-600 space-y-3 bg-slate-50/50 -mx-5 -mb-5 p-5 animate-fade-in" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-2"><span className="font-bold min-w-[70px]">電話：</span><span>{o.receiver_phone}</span></div>
                          <div className="flex gap-2"><span className="font-bold min-w-[70px]">寄送：</span><span>{o.ship_method} - {o.store_name}</span></div>
                          <div className="flex gap-2">
                             <span className="font-bold min-w-[70px]">付款：</span>
                             <span>{o.payment_method === 'TRANSFER' ? '銀行匯款' : o.payment_method === 'COD' ? '貨到付款' : '面交/現金'} {o.payment_method === 'TRANSFER' && o.payment_note && <span className="text-[#EE4D2D] font-mono ml-2">(末五碼: {o.payment_note})</span>}</span>
                          </div>
                          
                          {o.remarks && <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100"><div className="font-bold text-yellow-700 mb-1">買家備註：</div><div className="text-yellow-900">{o.remarks}</div></div>}
                          {o.answers && o.answers.length > 0 && (
                             <div className="bg-blue-50 p-3 rounded-lg border border-blue-100"><div className="font-bold text-blue-700 mb-1">問卷回答：</div><ul className="list-disc pl-4 text-blue-900 space-y-1">{o.answers.map((a, idx) => <li key={idx}><span className="font-bold">{a.question}:</span> {a.answer}</li>)}</ul></div>
                          )}

                          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm mt-3">
                             <div className="text-xs font-bold text-slate-500 mb-1">📝 賣家內部備註 (僅自己可見)</div>
                             <div className="flex gap-2">
                                <input 
                                  type="text" 
                                  className="flex-1 border border-slate-200 rounded px-2 py-1 text-sm outline-none focus:border-[#EE4D2D]"
                                  placeholder="填寫備註..."
                                  value={tempSellerNotes[o.id] !== undefined ? tempSellerNotes[o.id] : (o.seller_note || '')}
                                  onChange={e => setTempSellerNotes({...tempSellerNotes, [o.id]: e.target.value})}
                                />
                                <button onClick={() => handleSaveSellerNote(o.id)} className="bg-slate-800 text-white px-3 py-1 rounded text-xs">儲存</button>
                             </div>
                          </div>

                          <div className="text-xs text-slate-400 text-right pt-2 border-t border-slate-200/50">
                             下單時間：{new Date(o.created_at).toLocaleString()}
                          </div>
                       </div>
                    )}
                    
                    {expandedOrderId !== o.id && (
                       <div className="text-center text-[10px] text-slate-400 mt-2">
                          <i className="fa-solid fa-chevron-down mr-1"></i> 點擊查看詳細資訊
                       </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {totalOrderPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <button onClick={() => setOrderPage(p => Math.max(1, p - 1))} disabled={orderPage === 1} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50"><i className="fa-solid fa-chevron-left mr-1"></i> 上一頁</button>
                <span className="text-sm font-bold text-slate-600">第 {orderPage} 頁 / 共 {totalOrderPages} 頁</span>
                <button onClick={() => setOrderPage(p => Math.min(totalOrderPages, p + 1))} disabled={orderPage === totalOrderPages} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50">下一頁 <i className="fa-solid fa-chevron-right ml-1"></i></button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'products' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800 font-black">您的商品列表</h2>
              <button onClick={() => setActiveTab('create')} className="px-5 py-2 primary-gradient text-white rounded-xl text-xs font-bold shadow-md">+ 新增團購</button>
            </div>

            {/* 新增：管理員全域搜尋商品功能 (Fix 2: 改為跳轉) */}
            <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
               <div className="text-xs font-bold text-slate-500 mb-2">🔍 管理員全域搜尋 (輸入商品編號)</div>
               <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="輸入商品 ID (如: p-173...)" 
                    className="flex-1 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-[#EE4D2D]"
                    value={globalSearchId}
                    onChange={e => setGlobalSearchId(e.target.value)}
                  />
                  <button 
                    onClick={handleGlobalProductSearch}
                    className="px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-bold hover:bg-slate-700 transition"
                  >
                    搜尋並前往
                  </button>
               </div>
            </div>
            
            <div className="space-y-4">
              {/* 修正 1：只顯示自己的商品 (myShopProducts) */}
              {myShopProducts.length === 0 ? <div className="py-20 text-center text-slate-300">目前沒有商品</div> : 
              myShopProducts.slice((productPage - 1) * PRODUCTS_PER_PAGE, productPage * PRODUCTS_PER_PAGE).map(p => (
                  <div key={p.id} className="flex items-center gap-4 p-4 border border-slate-50 rounded-2xl hover:bg-slate-50 transition group">
                    <div className="w-16 h-16 rounded-xl overflow-hidden border bg-slate-100"><img src={p.images[0] || 'https://placehold.co/100'} className="w-full h-full object-cover" /></div>
                    <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-800 text-sm truncate">{p.name}</div>
                        <div className="text-[10px] text-slate-400 mt-1">分類: {p.category_ids?.map(id => {
                            const shopCat = categories.find(c => c.id === id);
                            if(shopCat) return shopCat.name;
                            const sysCat = systemCategories?.find(c => c.id === id);
                            if(sysCat) return sysCat.name;
                            return id;
                        }).join(', ') || '未分類'}</div>
                        <div className="text-xs text-[#EE4D2D] font-black mt-1">${p.price.toLocaleString()}</div>
                        {p.total_stock <= 0 && <span className="text-[10px] bg-red-100 text-red-600 px-1 rounded font-bold">已售完</span>}
                        <div className="text-[9px] text-slate-300 font-mono mt-1">ID: {p.id}</div>
                        
                        {p.variants && p.variants.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                                {p.variants.map((v, idx) => (
                                    <span key={idx} className="text-[10px] bg-slate-100 px-2 py-1 rounded text-slate-600 border border-slate-200">
                                        {v.name}: <b className={v.stock > 0 ? 'text-slate-800' : 'text-red-500'}>{v.stock}</b>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => { 
                          setEditingId(p.id); 
                          setForm({ ...p, payment_methods: p.payment_methods && p.payment_methods.length > 0 ? p.payment_methods : ['BANK', 'COD', 'CASH'] }); 
                          
                          if (p.shipping_origin && !COMMON_ORIGINS.includes(p.shipping_origin)) {
                              let foundCity = '';
                              for (const city of Object.keys(TAIWAN_DISTRICTS)) {
                                  if (p.shipping_origin.startsWith(city)) {
                                      foundCity = city;
                                      break;
                                  }
                              }
                              if (foundCity) {
                                  setOriginSelect(foundCity);
                                  setOriginDistrictSelect(p.shipping_origin.replace(foundCity, ''));
                                  setOriginManual('');
                              } else {
                                  setOriginSelect('手動填寫');
                                  setOriginManual(p.shipping_origin);
                                  setOriginDistrictSelect('');
                              }
                          } else {
                              setOriginSelect('台北市');
                              setOriginDistrictSelect('');
                              setOriginManual('');
                          }

                          setActiveTab('create'); 
                      }} className="p-2 text-slate-400 hover:text-blue-500"><i className="fa-solid fa-pen-to-square"></i></button>
                      <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-slate-400 hover:text-red-500"><i className="fa-solid fa-trash-can"></i></button>
                    </div>
                  </div>
              ))}
            </div>
            {Math.ceil(myShopProducts.length / PRODUCTS_PER_PAGE) > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8">
                <button onClick={() => setProductPage(p => Math.max(1, p - 1))} disabled={productPage === 1} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50"><i className="fa-solid fa-chevron-left mr-1"></i> 上一頁</button>
                <span className="text-sm font-bold text-slate-600">第 {productPage} 頁 / 共 {Math.ceil(myShopProducts.length / PRODUCTS_PER_PAGE)} 頁</span>
                <button onClick={() => setProductPage(p => Math.min(Math.ceil(myShopProducts.length / PRODUCTS_PER_PAGE), p + 1))} disabled={productPage === Math.ceil(myShopProducts.length / PRODUCTS_PER_PAGE)} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50">下一頁 <i className="fa-solid fa-chevron-right ml-1"></i></button>
              </div>
            )}
          </div>
        )}

        {/* ... (其餘 activeTab 保持不變，包含 create, buying_account 等，因用戶要求完整代碼，以下保留原代碼) ... */}
        {activeTab === 'create' && (
           <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
             <h2 className="text-2xl font-black text-slate-800 mb-8 border-l-4 border-[#EE4D2D] pl-4">{editingId ? '編輯商品資訊' : '發布新的團購'}</h2>
             
             {/* 確保 Create 表單內容與之前一致 (省略重複代碼，因為用戶要求完整代碼，這裡直接展開) */}
             <div className="max-w-3xl space-y-10">
                <section className="space-y-6"><div className="text-sm font-black text-[#EE4D2D] uppercase tracking-widest border-b pb-2">Step 1. 商品基本資訊</div><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="md:col-span-2"><label className="text-xs font-bold text-slate-500 mb-2 block">商品名稱</label><input type="text" className="w-full h-12 border border-slate-200 rounded-2xl px-5 text-sm outline-none focus:border-[#EE4D2D]" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                <div className="md:col-span-2"><label className="text-xs font-bold text-slate-500 mb-2 block">商品分類 (可多選)</label><div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-6"><div><label className="text-[10px] font-bold text-slate-400 mb-1 block uppercase tracking-wider">平台全域分類</label><div className="flex flex-col md:flex-row gap-3"><select className="flex-1 h-10 border border-slate-300 rounded-lg px-3 text-sm outline-none" value={selectedMainCat} onChange={(e) => { setSelectedMainCat(e.target.value); setSelectedSubCat(''); }}><option value="">選擇主分類...</option>{systemCategories?.filter(c => !c.parent_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>{selectedMainCat && (<select className="flex-1 h-10 border border-slate-300 rounded-lg px-3 text-sm outline-none" value={selectedSubCat} onChange={(e) => setSelectedSubCat(e.target.value)}><option value="">選擇子分類 (可選)</option>{systemCategories?.filter(c => c.parent_id === selectedMainCat).map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}</select>)}<button onClick={() => handleAddCategoryTag('SYSTEM')} className="px-4 py-2 bg-slate-800 text-white rounded-lg font-bold text-sm hover:bg-slate-700 disabled:opacity-50" disabled={!selectedMainCat}>加入平台分類</button></div></div><div className="pt-4 border-t border-slate-200"><label className="text-[10px] font-bold text-slate-400 mb-1 block uppercase tracking-wider">我的賣場分類</label>{categories.length > 0 ? (<div className="flex flex-col md:flex-row gap-3"><select className="flex-1 h-10 border border-slate-300 rounded-lg px-3 text-sm outline-none" value={selectedShopMainCat} onChange={(e) => { setSelectedShopMainCat(e.target.value); setSelectedShopSubCat(''); }}><option value="">選擇自訂分類...</option>{categories.filter(c => !c.parent_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>{selectedShopMainCat && (<select className="flex-1 h-10 border border-slate-300 rounded-lg px-3 text-sm outline-none" value={selectedShopSubCat} onChange={(e) => setSelectedShopSubCat(e.target.value)}><option value="">選擇子分類 (可選)</option>{categories.filter(c => c.parent_id === selectedShopMainCat).map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}</select>)}<button onClick={() => handleAddCategoryTag('SHOP')} className="px-4 py-2 bg-[#EE4D2D] text-white rounded-lg font-bold text-sm hover:bg-[#d73211] disabled:opacity-50" disabled={!selectedShopMainCat}>加入自訂分類</button></div>) : (<div className="text-sm text-slate-400">您尚未建立自訂分類，請至「分類管理」新增。</div>)}</div><div className="flex flex-wrap gap-2 pt-2">{form.category_ids?.map(id => (<div key={id} className="bg-white border border-[#EE4D2D] text-[#EE4D2D] px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm"><span>{categories.find(c=>c.id===id)?.name || systemCategories?.find(c=>c.id===id)?.name || id}</span><button onClick={() => removeCategoryTag(id)} className="hover:text-red-500"><i className="fa-solid fa-xmark"></i></button></div>))}</div></div></div>
                <div className="md:col-span-2"><label className="text-xs font-bold text-slate-500 mb-2 block">商品產地</label><div className="flex flex-wrap gap-2 mb-2">{COMMON_ORIGINS.map(origin => (<button key={origin} onClick={() => setForm({ ...form, origin })} className={`px-4 py-2 rounded-lg text-xs font-bold border transition ${form.origin === origin ? 'border-[#EE4D2D] bg-[#FFEEEC] text-[#EE4D2D]' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>{origin}</button>))}<button onClick={() => setForm({ ...form, origin: '' })} className={`px-4 py-2 rounded-lg text-xs font-bold border transition ${!COMMON_ORIGINS.includes(form.origin || '') ? 'border-[#EE4D2D] bg-[#FFEEEC] text-[#EE4D2D]' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>其他</button></div>{!COMMON_ORIGINS.includes(form.origin || '') && (<input type="text" placeholder="請輸入產地" className="w-full h-10 border border-slate-200 rounded-xl px-4 text-xs outline-none focus:border-[#EE4D2D]" value={form.origin || ''} onChange={e => setForm({ ...form, origin: e.target.value })} />)}</div>
                
                {/* ★ 修改：優化價格輸入，若為 0 顯示空白，避免卡住 */}
                <div>
                   <label className="text-xs font-bold text-slate-500 mb-2 block">團購基礎價</label>
                   <input 
                      type="number" 
                      className="w-full h-12 border border-slate-200 rounded-2xl px-5 text-sm font-black text-[#EE4D2D]" 
                      value={form.price || ''} 
                      onChange={e => setForm({...form, price: parseInt(e.target.value) || 0})} 
                   />
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-500 mb-2 block">市場參考價</label>
                   <input 
                      type="number" 
                      className="w-full h-12 border border-slate-200 rounded-2xl px-5 text-sm text-slate-400 line-through" 
                      value={form.original_price || ''} 
                      onChange={e => setForm({...form, original_price: parseInt(e.target.value) || 0})} 
                   />
                </div>
                
                <div className="md:col-span-2">
                   <label className="text-xs font-bold text-slate-500 mb-2 block">商品詳情文案</label>
                   <div className="relative">
                      {/* ★ 修改：移除 AI 修飾按鈕 */}
                      <textarea 
                         className="w-full h-40 border border-slate-200 rounded-2xl p-5 text-sm outline-none resize-none" 
                         value={form.description} 
                         onChange={e => setForm({...form, description: e.target.value})} 
                      />
                   </div>
                </div>
                
                </div></section>
                <section className="space-y-6"><div className="flex justify-between items-center border-b pb-2"><div className="text-sm font-black text-[#EE4D2D] uppercase tracking-widest">Step 2. 規格與庫存設定</div><button onClick={addVariant} className="text-[11px] font-bold text-blue-500 hover:underline">+ 新增規格選項</button></div><div className="space-y-3">{form.variants?.map((v, i) => (<div key={i} className="flex flex-wrap md:flex-nowrap gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 items-center"><input type="text" className="flex-1 h-10 border border-slate-200 rounded-xl px-4 text-xs" value={v.name} onChange={e => updateVariant(i, 'name', e.target.value)} placeholder="規格名稱" /><input type="number" className="w-32 h-10 border border-slate-200 rounded-xl px-4 text-xs" value={v.price === 0 ? '' : v.price} onChange={e => updateVariant(i, 'price', e.target.value === '' ? 0 : parseInt(e.target.value))} placeholder="加價" /><input type="number" className="w-32 h-10 border border-slate-200 rounded-xl px-4 text-xs" value={v.stock === 0 ? '' : v.stock} onChange={e => updateVariant(i, 'stock', e.target.value === '' ? 0 : parseInt(e.target.value))} placeholder="庫存" /><button onClick={() => removeVariant(i)} className="text-slate-400 hover:text-red-500"><i className="fa-solid fa-xmark"></i></button></div>))}</div></section>
                <section className="space-y-6">
                 <div className="text-sm font-black text-[#EE4D2D] uppercase tracking-widest">Step 3. 商品圖片與影片</div>
                 <div className="text-xs text-slate-400 mb-2 font-bold">
                    <i className="fa-solid fa-circle-info mr-1"></i> 
                    建議圖片尺寸：800x800 px (1:1) 。點擊已上傳的圖片可重新裁切。
                 </div>
                 <div className="flex flex-wrap gap-4">
                   {form.images?.map((img, i) => (
                     <div 
                        key={i} 
                        className="w-24 h-24 border rounded-xl overflow-hidden relative group bg-slate-100 cursor-pointer"
                        onClick={() => setCropModal({ isOpen: true, src: img, editIndex: i })} 
                     >
                       <img src={img} className="w-full h-full object-cover group-hover:opacity-80 transition" />
                       <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <i className="fa-solid fa-pen text-white drop-shadow-md"></i>
                       </div>
                       <button onClick={(e) => { e.stopPropagation(); const newImgs = [...(form.images || [])]; newImgs.splice(i, 1); setForm({...form, images: newImgs}); }} className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500"><i className="fa-solid fa-xmark text-xs"></i></button>
                     </div>
                   ))}
                   <button onClick={() => fileInputRef.current?.click()} className="w-24 h-24 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-[#EE4D2D] hover:text-[#EE4D2D] gap-1 hover:bg-slate-50 transition">
                     <i className="fa-solid fa-crop-simple text-xl"></i>
                     <span className="text-[10px] text-center">選取並裁切<br/>照片</span>
                     <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleMediaUpload} />
                   </button>
                 </div>
               </section>

               <section className="space-y-6">
                   <div className="flex justify-between items-center border-b pb-2"><div className="text-sm font-black text-[#EE4D2D] uppercase tracking-widest">Step 4. 運送方式與費用</div></div>
                   
                   <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 mb-4">
                       <label className="text-xs font-bold text-slate-500 mb-2 block"><i className="fa-solid fa-location-dot mr-1"></i> 出貨地址 (Shipping Origin)</label>
                       <div className="flex flex-col md:flex-row gap-2">
                            <select 
                                className="md:w-1/3 h-10 border border-slate-200 rounded-xl px-3 text-xs outline-none bg-white"
                                value={originSelect}
                                onChange={e => {
                                    setOriginSelect(e.target.value);
                                    setOriginDistrictSelect(''); 
                                }}
                            >
                                {Object.keys(TAIWAN_DISTRICTS).map(city => <option key={city} value={city}>{city}</option>)}
                                <option value="手動填寫">手動填寫</option>
                            </select>

                            {originSelect !== '手動填寫' && TAIWAN_DISTRICTS[originSelect] && (
                                <select 
                                    className="md:w-1/3 h-10 border border-slate-200 rounded-xl px-3 text-xs outline-none bg-white"
                                    value={originDistrictSelect}
                                    onChange={e => setOriginDistrictSelect(e.target.value)}
                                >
                                    <option value="">選擇區域...</option>
                                    {TAIWAN_DISTRICTS[originSelect].map(dist => <option key={dist} value={dist}>{dist}</option>)}
                                </select>
                            )}

                            {originSelect === '手動填寫' && (
                                <input 
                                    type="text" 
                                    className="flex-1 h-10 border border-slate-200 rounded-xl px-3 text-xs outline-none focus:border-[#EE4D2D]"
                                    placeholder="請輸入詳細地址..."
                                    value={originManual}
                                    onChange={e => setOriginManual(e.target.value)}
                                />
                            )}
                       </div>
                       <div className="text-[10px] text-slate-400 mt-1">此地址將顯示於商品頁面，讓買家知道商品從何處發貨。</div>
                   </div>

                   <div className="flex flex-wrap gap-2 mb-4">{SHIPPING_PRESETS.map((preset) => <button key={preset.name} onClick={() => addShippingRule(preset.name, preset.fee)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition flex items-center gap-1"><i className="fa-solid fa-plus"></i> {preset.name}</button>)}<button onClick={() => addShippingRule()} className="px-3 py-1.5 border border-dashed border-slate-300 text-slate-500 rounded-lg text-xs font-bold hover:border-slate-400 transition">+ 自訂物流</button></div><div className="space-y-4">{form.shipping_rules?.map((rule, i) => (<div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3"><div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end"><div className="md:col-span-4"><input type="text" className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs" value={rule.name} onChange={e => updateShippingRule(i, 'name', e.target.value)} placeholder="運送名稱" /></div><div className="md:col-span-2"><input type="number" className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs" value={rule.fee} onChange={e => updateShippingRule(i, 'fee', parseInt(e.target.value))} placeholder="運費" /></div><div className="md:col-span-3"><input type="number" className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs" value={rule.free_threshold} onChange={e => updateShippingRule(i, 'free_threshold', parseInt(e.target.value))} placeholder="免運門檻" /></div><div className="md:col-span-2"><input type="number" className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs" value={rule.limit_qty} onChange={e => updateShippingRule(i, 'limit_qty', parseInt(e.target.value))} placeholder="數量限制" /></div><div className="md:col-span-1 flex justify-center pb-2"><button onClick={() => removeShippingRule(i)} className="text-slate-400 hover:text-red-500"><i className="fa-solid fa-trash-can text-lg"></i></button></div></div>{(rule.name.includes('自取') || rule.name.includes('面交')) && (<div className="pt-2 border-t border-slate-100"><input type="text" className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs" value={rule.pickup_address || ''} onChange={e => updateShippingRule(i, 'pickup_address', e.target.value)} placeholder="請輸入詳細取貨地址..." /></div>)}</div>))}</div>
                </section>
                <section className="space-y-6"><div className="text-sm font-black text-[#EE4D2D] uppercase tracking-widest">Step 5. 付款方式設定</div><div className="p-5 bg-slate-50 rounded-2xl border border-slate-100"><div className="flex flex-wrap gap-4">{PAYMENT_OPTIONS.map(opt => (<label key={opt.value} className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm hover:border-[#EE4D2D] transition"><input type="checkbox" className="accent-[#EE4D2D] w-4 h-4" checked={form.payment_methods?.includes(opt.value)} onChange={(e) => { const current = form.payment_methods || []; if (e.target.checked) setForm({ ...form, payment_methods: [...current, opt.value] }); else setForm({ ...form, payment_methods: current.filter(v => v !== opt.value) }); }} /><span className="text-sm font-bold text-slate-700">{opt.label}</span></label>))}</div></div></section>
                <section className="space-y-6"><div className="text-sm font-black text-[#EE4D2D] uppercase tracking-widest border-b pb-2">Step 6. 匯款帳戶設定</div><div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4"><div className="md:col-span-2 flex items-center gap-2 mb-2"><input type="checkbox" id="saveBank" checked={saveBank} onChange={e => setSaveBank(e.target.checked)} className="accent-[#EE4D2D]" /><label htmlFor="saveBank" className="text-xs font-bold text-slate-600 cursor-pointer">記住此帳戶資訊供下次使用</label></div><div><label className="text-xs font-bold text-slate-500 mb-1 block">銀行代碼</label>{!isCustomBank ? (<select className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs outline-none" value={form.bank_info?.bank_code} onChange={e => { if (e.target.value === 'CUSTOM') { setIsCustomBank(true); setForm(prev => ({...prev, bank_info: {...prev.bank_info!, bank_code: '', bank_name: ''}})); } else { const bank = TAIWAN_BANKS.find(b => b.code === e.target.value); setForm(prev => ({...prev, bank_info: {...prev.bank_info!, bank_code: e.target.value, bank_name: bank?.name || ''}})); } }}>{TAIWAN_BANKS.map(b => <option key={b.code} value={b.code}>{b.code} {b.name}</option>)}<option value="CUSTOM">-- 自訂/其他銀行 --</option></select>) : (<div className="flex gap-2"><input type="text" className="w-1/3 h-10 border border-slate-200 rounded-xl px-3 text-xs outline-none" value={form.bank_info?.bank_code} onChange={e => setForm(prev => ({...prev, bank_info: {...prev.bank_info!, bank_code: e.target.value}}))} placeholder="代碼" /><input type="text" className="flex-1 h-10 border border-slate-200 rounded-xl px-3 text-xs outline-none" value={form.bank_info?.bank_name} onChange={e => setForm(prev => ({...prev, bank_info: {...prev.bank_info!, bank_name: e.target.value}}))} placeholder="銀行名稱" /><button onClick={() => setIsCustomBank(false)} className="text-slate-400 hover:text-red-500 px-2"><i className="fa-solid fa-xmark"></i></button></div>)}</div><div><label className="text-xs font-bold text-slate-500 mb-1 block">銀行帳號</label><input type="text" className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs outline-none" value={form.bank_info?.account_number} onChange={e => setForm(prev => ({...prev, bank_info: {...prev.bank_info!, account_number: e.target.value}}))} placeholder="請輸入帳號" /></div><div className="md:col-span-2"><label className="text-xs font-bold text-slate-500 mb-1 block">戶名</label><input type="text" className="w-full h-10 border border-slate-200 rounded-xl px-3 text-xs outline-none" value={form.bank_info?.account_name} onChange={e => setForm(prev => ({...prev, bank_info: {...prev.bank_info!, account_name: e.target.value}}))} placeholder="請輸入戶名" /></div></div></section>
                <section className="space-y-6"><div className="flex justify-between items-center border-b pb-2"><div className="text-sm font-black text-[#EE4D2D] uppercase tracking-widest">Step 7. 顧客下單提問 (選填)</div><button onClick={addQuestion} className="text-[11px] font-bold text-blue-500 hover:underline">+ 新增問題</button></div><div className="space-y-3">{form.questions?.map((q, i) => (<div key={i} className="flex gap-3 items-center"><input type="text" className="flex-1 h-10 border border-slate-200 rounded-xl px-4 text-xs" value={q.title} onChange={e => updateQuestion(i, 'title', e.target.value)} placeholder="問題內容" /><label className="flex items-center gap-1 text-xs text-slate-500 whitespace-nowrap"><input type="checkbox" checked={q.required} onChange={e => updateQuestion(i, 'required', e.target.checked)} />必填</label><button onClick={() => removeQuestion(i)} className="text-slate-400 hover:text-red-500"><i className="fa-solid fa-trash"></i></button></div>))}</div></section>

                <div className="flex gap-4 pt-10 border-t">
                  <button onClick={resetForm} className="flex-1 h-14 rounded-2xl font-bold text-slate-400 border-2 border-slate-100 hover:bg-slate-50 transition">返回</button>
                  <button onClick={handleSaveProduct} className="flex-[2] h-14 primary-gradient text-white rounded-2xl font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-lg">{editingId ? '確認修改' : '確認發布並開始團購'}</button>
                </div>
             </div>
           </div>
        )}

        {/* ... (buying_account, buying_orders, buying_reports 保持原樣) ... */}
        {activeTab === 'buying_account' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
            <h2 className="text-2xl font-black text-slate-800 mb-8 border-l-4 border-slate-800 pl-4">我的帳戶資料 (買家)</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div><label className="text-xs font-bold text-slate-400 mb-1 block">會員名稱</label><div className="text-lg font-bold text-slate-700">{user.name}</div></div>
              <div><label className="text-xs font-bold text-slate-400 mb-1 block">手機號碼</label><div className="text-lg font-bold text-slate-700">{user.phone}</div></div>
              <div><label className="text-xs font-bold text-slate-400 mb-1 block">電子信箱</label><div className="text-lg font-bold text-slate-700">{user.email || '未設定'}</div></div>
              <div><label className="text-xs font-bold text-slate-400 mb-1 block">會員 ID</label><div className="text-sm font-mono text-slate-500 bg-slate-50 px-3 py-1 rounded inline-block">{user.id}</div></div>
            </div>
          </div>
        )}

        {activeTab === 'buying_orders' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
            <h2 className="text-2xl font-black text-slate-800 mb-8 border-l-4 border-slate-800 pl-4">我的購買清單</h2>
            <div className="flex overflow-x-auto pb-2 mb-6 gap-2 scrollbar-hide">
              {BUYER_ORDER_STATUS_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setBuyOrderStatusFilter(opt.value)} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition ${buyOrderStatusFilter === opt.value ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
            <div className="space-y-4">
              {filteredBuyOrders.map(o => (
                <div key={o.id} className="p-5 border border-slate-100 rounded-3xl bg-slate-50/50">
                  <div className="flex justify-between items-center mb-4">
                    <span className="font-bold text-slate-700 text-sm">{new Date(o.created_at).toLocaleDateString()}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${o.status==='COMPLETED'?'bg-green-100 text-green-700':'bg-slate-200 text-slate-600'}`}>{BUYER_ORDER_STATUS_OPTIONS.find(x=>x.value===o.status)?.label}</span>
                  </div>
                  {o.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-sm text-slate-600 mb-1">
                      <span>{it.name} x {it.qty}</span>
                      <span>${(it.finalPrice * it.qty).toLocaleString()}</span>
                    </div>
                  ))}
                  
                  {/* 個人買家專區的訂單聯絡賣家按鈕 */}
                  <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                        店家: {(() => {
                            const shopUser = allUsers?.find(u => u.shop_id === o.shop_id || u.id === o.shop_id);
                            return shopUser?.shop_name || shopUser?.name || o.store_name || '未知店家';
                        })()}
                        <button 
                          onClick={(e) => {
                              e.stopPropagation();
                              onNavigate(View.CHAT, undefined, o.shop_id);
                          }}
                          className="ml-2 px-3 py-1 bg-slate-200 text-slate-700 rounded-md text-xs font-bold hover:bg-slate-300 transition flex items-center gap-1"
                        >
                          <i className="fa-regular fa-comments"></i> 愛聊
                        </button>
                    </div>
                    <span className="font-black text-lg text-slate-800">${o.total_amount.toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'buying_reports' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
            <h2 className="text-2xl font-black text-slate-800 mb-8 border-l-4 border-slate-800 pl-4">個人消費報表</h2>
            <div className="flex items-center gap-2 mb-6 bg-slate-50 p-2 rounded-xl inline-flex">
              <input type="date" value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
              <span className="text-slate-400">~</span>
              <input type="date" value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none" />
            </div>
            <div className="mb-8 p-6 bg-slate-800 text-white rounded-2xl flex items-center gap-4 shadow-lg">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-xl"><i className="fa-solid fa-wallet"></i></div>
              <div className="flex-1 text-right">
                <span className="text-sm font-bold text-slate-300 mr-2">區間總消費:</span>
                <span className="text-3xl font-black">${buyReportData.totalSpending.toLocaleString()}</span>
              </div>
            </div>
            <div className="h-80 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={buyReportData.chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} />
                  <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                  <Line type="monotone" dataKey="amount" stroke="#1e293b" strokeWidth={3} dot={{r: 4, fill: '#1e293b', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in-up">
              <h3 className="font-bold text-lg mb-4 text-slate-800">匯出訂單 (Excel/CSV)</h3>
              
              <div className="space-y-4 mb-6">
                 {/* ★ 修改：改為多選 checkbox */}
                 <div>
                    <label className="text-xs font-bold text-slate-500 mb-2 block">選擇匯出狀態 (可多選)</label>
                    <div className="space-y-2 border border-slate-200 rounded-xl p-3 max-h-40 overflow-y-auto">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                className="accent-[#EE4D2D]"
                                checked={exportStatuses.has('ALL')}
                                onChange={e => {
                                    if(e.target.checked) setExportStatuses(new Set(['ALL']));
                                    else setExportStatuses(new Set());
                                }}
                            />
                            <span className="text-sm font-bold text-slate-700">全部訂單 (ALL)</span>
                        </label>
                        {['PENDING', 'CONFIRMED', 'SHIPPED', 'COMPLETED', 'CANCELLED'].map(status => {
                             const label = SELLER_ORDER_STATUS_OPTIONS.find(o => o.value === status)?.label;
                             return (
                                <label key={status} className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="accent-[#EE4D2D]"
                                        checked={exportStatuses.has(status)}
                                        onChange={e => {
                                            const newSet = new Set(exportStatuses);
                                            newSet.delete('ALL'); 
                                            if(e.target.checked) newSet.add(status);
                                            else newSet.delete(status);
                                            setExportStatuses(newSet);
                                        }}
                                    />
                                    <span className="text-sm text-slate-600">{label}</span>
                                </label>
                             );
                        })}
                    </div>
                 </div>
                 
                 {/* 撿貨單勾選 */}
                 <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <input 
                        type="checkbox" 
                        id="pickingList" 
                        className="w-5 h-5 accent-green-600 cursor-pointer"
                        checked={exportAsPickingList}
                        onChange={e => setExportAsPickingList(e.target.checked)}
                    />
                    <label htmlFor="pickingList" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
                        匯出「訂單貨品總計」(撿貨單)
                        <div className="text-[10px] text-slate-400 font-normal">勾選後將統計所有商品的總數量，方便備貨。</div>
                    </label>
                 </div>
              </div>

              <div className="flex gap-2">
                 <button onClick={handleExportConfirm} className="flex-1 bg-green-600 text-white py-2 rounded-xl font-bold hover:bg-green-700 shadow-md">
                    <i className="fa-solid fa-download mr-1"></i>確認匯出
                 </button>
                 <button onClick={() => setShowExportModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-xl font-bold hover:bg-slate-200">取消</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;