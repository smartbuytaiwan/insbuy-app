import React, { useState, useMemo, useRef, useEffect } from 'react';
import { User, Product, View, Order, ShippingRule, ProductVariant, BankInfo, Category, Report } from '../types'; 
import { generateMarketingCopy } from '../geminiService'; 
import API from '../api'; 
import CategoryManagement from './CategoryManagement';
import ShopSettings from './ShopSettings';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { uploadImageToSupabase } from '../supabaseClient';

interface AdminDashboardProps {
  user: User;
  permissions?: any[]; // ★ 新增：接收來自系統的會員權限設定表
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
  { name: '7-11' },
  { name: '全家' },
  { name: '萊爾富' },
  { name: 'OK超商' },
  { name: '蝦皮店到店' },
  { name: '中華郵政' },
  { name: '黑貓宅急便' },
  { name: '賣家宅配' },
  { name: '面交/自取' }
];

const PAYMENT_OPTIONS = [
  { value: 'BANK', label: '銀行匯款' },
  { value: 'COD', label: '貨到付款' },
  { value: 'CASH', label: '面交/現金付款' }
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#EE4D2D'];

const SELLER_ORDER_STATUS_OPTIONS = [
  { value: 'ALL', label: '全部' },
  { value: 'PENDING', label: '待付款' },
  { value: 'CONFIRMED', label: '待出貨' },
  { value: 'SHIPPED', label: '待收貨' }, 
  { value: 'COMPLETED', label: '已完成' },
  { value: 'CANCELLED', label: '取消/退款' }
];

const STATUS_FLOW = ['PENDING', 'CONFIRMED', 'SHIPPED', 'COMPLETED', 'CANCELLED'];

const BUYER_ORDER_STATUS_OPTIONS = [
  { value: 'ALL', label: '全部' },
  { value: 'PENDING', label: '待付款' },
  { value: 'CONFIRMED', label: '待出貨' },
  { value: 'SHIPPED', label: '已出貨' }, 
  { value: 'COMPLETED', label: '已完成' },
  { value: 'CANCELLED', label: '取消/退款' }
];

const ProductImageCropper = ({ src, onComplete, onCancel }: { src: string, onComplete: (blob: Blob) => void, onCancel: () => void }) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const startRef = useRef({ x: 0, y: 0 });
  const imgRef = useRef<HTMLImageElement>(null);
   
  const [containerSize, setContainerSize] = useState(400);

  useEffect(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    
    const handleResize = () => {
       setContainerSize(Math.min(window.innerWidth - 80, 400));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    const touch = e.touches[0];
    startRef.current = { x: touch.clientX - offset.x, y: touch.clientY - offset.y };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setOffset({ x: touch.clientX - startRef.current.x, y: touch.clientY - startRef.current.y });
  };

  const handleTouchEnd = () => setIsDragging(false);

  const handleSave = () => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    
    const outputSize = 800; 
    const scaleFactor = outputSize / containerSize; 

    const canvas = document.createElement('canvas');
    canvas.width = outputSize;
    canvas.height = outputSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, outputSize, outputSize);

    const ratioW = containerSize / img.naturalWidth;
    const ratioH = containerSize / img.naturalHeight;
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
    
    // ★ 壓縮優化：輸出為 WebP 格式，並將畫質設為 0.7，大幅縮小圖片體積以節省 Supabase 空間
    canvas.toBlob((blob) => {
        if (blob) {
            onComplete(blob);
        }
    }, 'image/webp', 0.7);
  };

  return (
    <div className="fixed inset-0 z-[2000] bg-black/80 flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
       <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
          <h3 className="font-bold text-lg mb-4 text-slate-800">編輯商品圖片 (1:1)</h3>
          
          <div 
             className="bg-slate-900 overflow-hidden relative mx-auto mb-4 cursor-move border-2 border-slate-200 rounded-lg shadow-inner flex items-center justify-center touch-none" 
             style={{ width: containerSize, height: containerSize }}
             onMouseDown={handleMouseDown}
             onMouseMove={handleMouseMove}
             onMouseUp={handleMouseUp}
             onMouseLeave={handleMouseUp}
             onTouchStart={handleTouchStart}
             onTouchMove={handleTouchMove}
             onTouchEnd={handleTouchEnd}
          >
            <img 
               ref={imgRef}
               src={src.startsWith('http') ? `${src}${src.includes('?') ? '&' : '?'}t=${new Date().getTime()}` : src} 
               crossOrigin="anonymous" 
               className="absolute select-none pointer-events-none" 
               style={{ 
                 top: '50%',
                 left: '50%',
                 transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                 maxWidth: '100%',
                 maxHeight: '100%',
                 objectFit: 'contain'
               }}
               draggable={false}
             />
             
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
             <button onClick={handleSave} className="flex-1 py-3 bg-[#EE4D2D] text-white rounded-xl font-bold hover:bg-[#d73211] transition">確認裁切並上傳</button>
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
  permissions = [] // ★ 接收權限設定
}) => {
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

  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'products' | 'create' | 'categories' | 'settings' | 'affiliate' | 'customers' | 'system_cats' | 'buying_account' | 'buying_orders' | 'buying_reports' | 'reports'>('overview');
  const [showMobileMenu, setShowMobileMenu] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cropModal, setCropModal] = useState<{ isOpen: boolean, src: string, editIndex: number | null }>({ isOpen: false, src: '', editIndex: null });

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
  
  const [localPaidIds, setLocalPaidIds] = useState<Set<string>>(new Set());
  const [localOrders, setLocalOrders] = useState<Order[]>(orders);

  useEffect(() => {
    setLocalOrders(orders);
  }, [orders]);

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
    start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
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

  const shopId = user.shop_id || user.id;

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
    const salesTrend = [];
    const statusCount: Record<string, number> = {};
    let totalSales = 0;
    let totalOrders = 0;

    const startDate = new Date(overviewRange.start);
    const endDate = new Date(overviewRange.end);
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dailyOrders = localOrders.filter(o => o.created_at.startsWith(dateStr) && o.status !== 'CANCELLED');
      const dailyTotal = dailyOrders.reduce((sum, o) => sum + o.total_amount, 0);
      salesTrend.push({ name: dateStr.slice(5), sales: dailyTotal, fullDate: dateStr });
      totalSales += dailyTotal;
      totalOrders += dailyOrders.length;
    }

    localOrders.forEach(o => {
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
  }, [localOrders, overviewRange]);

  const filteredOrders = useMemo(() => {
    const s = new Date(orderRange.start).setHours(0,0,0,0);
    const e = new Date(orderRange.end).setHours(23,59,59,999);
    
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
      preorder_arrival_date: ''
    };
  };

  const [form, setForm] = useState<Partial<Product>>(getInitialForm());
  
  // ★ 新增：商品描述草稿功能狀態與邏輯
  const [drafts, setDrafts] = useState<{id:string, name:string, text:string}[]>(() => {
     try { return JSON.parse(localStorage.getItem('insbuy_desc_drafts') || '[]'); } catch { return []; }
  });
  
  // ★ 補上遺失的下拉選單狀態
  const [selectedDraftId, setSelectedDraftId] = useState<string>('');

  const handleSaveDraft = () => {
     if(!form.description?.trim()) return alert('請先在商品描述框內填寫內容，才能儲存為草稿！');
     // ★ 新增：擋住草稿數量限制
     if(drafts.length >= sellerConfig.max_drafts) {
         return alert(`會員等級限制：\n您最多只能儲存 ${sellerConfig.max_drafts} 組草稿。\n請先刪除舊草稿或升級會員等級！`);
     }
     const draftName = prompt('請為這個草稿命名 (例如：衣服公版說明)：');
     if(!draftName) return;
     const newDrafts = [...drafts, { id: Date.now().toString(), name: draftName, text: form.description }];
     setDrafts(newDrafts);
     localStorage.setItem('insbuy_desc_drafts', JSON.stringify(newDrafts));
     alert('草稿儲存成功！');
  };

  const applyDraft = (id: string) => {
     const draft = drafts.find(d => d.id === id);
     if(draft) setForm({...form, description: form.description ? form.description + '\n\n' + draft.text : draft.text});
  };

  const deleteDraft = (id: string) => {
     if(!confirm('確定要刪除此草稿嗎？')) return;
     const newDrafts = drafts.filter(d => d.id !== id);
     setDrafts(newDrafts);
     localStorage.setItem('insbuy_desc_drafts', JSON.stringify(newDrafts));
  };
  
  const [seoInputValue, setSeoInputValue] = useState('');

  const [saveBank, setSaveBank] = useState(!!localStorage.getItem('insbuy_saved_bank'));
  const [isCustomBank, setIsCustomBank] = useState(false);
  const [selectedMainCat, setSelectedMainCat] = useState<string>('');
  const [selectedSubCat, setSelectedSubCat] = useState<string>('');
  const [selectedShopMainCat, setSelectedShopMainCat] = useState<string>('');
  const [selectedShopSubCat, setSelectedShopSubCat] = useState<string>('');

  useEffect(() => {
      if (editingId && activeTab === 'create') {
          const p = products.find(i => i.id === editingId);
          if(p) setSeoInputValue(p.keywords?.join(', ') || '');
      }
  }, [editingId, products, activeTab]);

  const addVariant = () => {
    // ★ 新增：檢查規格數量限制
    if ((form.variants?.length || 0) >= sellerConfig.max_variants_per_product) {
        return alert(`會員等級限制：\n每個商品最多只能設定 ${sellerConfig.max_variants_per_product} 個規格。\n請升級會員等級以新增更多規格！`);
    }
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
      newVariants.splice(index, 1);
      newVariants.splice(index, 0, { ...prev.variants![index], [field]: value });
      return { ...prev, variants: newVariants };
    });
  };

  const addShippingRule = (customName?: string) => {
    const name = customName || '新運送方式';
    if (form.shipping_rules?.some(rule => rule.name === name)) {
        alert(`運送方式「${name}」已存在，請勿重複新增。`);
        return;
    }
    // 運費預設為空白，讓賣家自己填寫
    const newRule: ShippingRule = { name, fee: '' as any, free_threshold: 0, limit_qty: 0, pickup_address: '' };
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
      
      // ★ 修改：嚴格限制商品圖片上傳大小為 1MB
      if (file.size > 1 * 1024 * 1024) {
          alert(`圖片過大！檔案 ${file.name} 超過 1MB 限制。`);
          if (fileInputRef.current) fileInputRef.current.value = ''; // 清空錯誤的檔案
          return;
      }
      
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

  // ★ 修改：處理裁切後的圖片上傳
  const handleCropComplete = async (croppedBlob: Blob) => {
      try {
          // ★ 轉換成 File 並使用 .webp 副檔名，確保 Supabase 存為最省空間的壓縮格式
          const file = new File([croppedBlob], `product_${Date.now()}.webp`, { type: 'image/webp' });
          
          // 上傳到 Supabase，Bucket 名稱設為 'images'
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

  const handleSaveProduct = async () => {
    if (!form.name || !form.price) return alert('請填寫商品名稱與價格');
    if (form.product_type === 'PHYSICAL') {
       if (!form.shipping_rules || form.shipping_rules.length === 0) {
           if(!confirm('您尚未設定任何運送方式，確定要發布嗎？')) return;
       } else if (form.shipping_rules.some(r => r.fee === '' as any || r.fee === undefined || isNaN(r.fee))) {
           return alert('請完整填寫各運送方式的「單趟運費」金額！');
       }
    }

    // ★ 新增：檢查最多同時刊登數量限制 (狀態為 OPEN，且是新增商品，或是原本下架改為上架時檢查)

    // ★ 新增：檢查最多同時刊登數量限制 (狀態為 OPEN，且是新增商品，或是原本下架改為上架時檢查)
    if (form.status === 'OPEN') {
        const currentActiveProducts = products.filter(p => p.shop_id === shopId && p.status === 'OPEN');
        const isCreatingNewActive = !editingId;
        const isChangingToActive = editingId && products.find(p => p.id === editingId)?.status !== 'OPEN';
        
        if (isCreatingNewActive || isChangingToActive) {
            if (currentActiveProducts.length >= sellerConfig.max_products) {
                return alert(`會員等級限制：\n您最多只能同時刊登銷售 ${sellerConfig.max_products} 個商品。\n請先下架其他商品或升級您的會員等級！`);
            }
        }
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
      alert('儲存失敗，請檢查網路或系統連線。');
    }
  };

  const resetForm = () => {
    setForm(getInitialForm());
    setSeoInputValue(''); 
    setOriginSelect('台北市');
    setOriginDistrictSelect('');
    setOriginManual('');
    setEditingId(null);
    setGlobalSearchId(''); 
    setActiveTab('products'); 
    setShowMobileMenu(false); 
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

  const navItems = [
    { id: 'overview', icon: 'fa-chart-pie', label: '經營概況' },
    { id: 'orders', icon: 'fa-receipt', label: '訂單管理' },
    { id: 'products', icon: 'fa-box-open', label: '商品管理' },
    { id: 'customers', icon: 'fa-users', label: '客戶管理' }, // ★ 改為常駐顯示
    { id: 'categories', icon: 'fa-list-ul', label: user.role === 'ADMIN' ? '平台分類管理' : '分類管理' },
    { id: 'settings', icon: 'fa-store', label: '商店設定' },
    { id: 'affiliate', icon: 'fa-bullhorn', label: '網紅分潤設定' }, // ★ 新增分潤獨立頁面
    { id: 'create', icon: 'fa-plus-circle', label: editingId ? '編輯商品' : '新增商品' },
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
            {navItems.map(item => (
              <button 
                key={item.id}
                onClick={() => { 
                  // ★ 新增：無權限點擊客戶管理時的阻擋與升級提示
                    if (item.id === 'customers' && !sellerConfig.can_view_stats && user.role !== 'ADMIN') {
                        alert('【會員等級限制】\n您目前的會員等級無法使用「客戶管理系統」。\n請升級您的會員等級以解鎖此強大功能！');
                        return;
                    }

                    if(item.id === 'create') {
                        setForm(getInitialForm());
                        setSeoInputValue('');
                        setOriginSelect('台北市');
                        setOriginDistrictSelect('');
                        setOriginManual('');
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
    <div className="flex flex-col md:flex-row gap-6 items-start animate-fade-in pb-20 w-full overflow-x-hidden">
      
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

      <div className={`flex-1 space-y-6 min-w-0 ${showMobileMenu ? 'hidden md:block' : 'block'}`}>
        
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

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-2 gap-4">
               <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 mb-2 md:mb-0">
                 <i className="fa-solid fa-chart-simple text-[#EE4D2D]"></i> 經營概況
               </h2>
               <div className="flex flex-wrap items-center gap-2 text-sm bg-slate-50 p-2 rounded-xl w-full md:w-auto">
                  <span className="text-slate-500 font-bold px-2 hidden md:block">統計區間:</span>
                  <input type="date" value={overviewRange.start} onChange={e => setOverviewRange({...overviewRange, start: e.target.value})} className="flex-1 border border-slate-300 rounded-lg px-2 py-1 outline-none text-slate-600 font-bold min-w-[120px]" />
                  <span className="text-slate-300">~</span>
                  <input type="date" value={overviewRange.end} onChange={e => setOverviewRange({...overviewRange, end: e.target.value})} className="flex-1 border border-slate-300 rounded-lg px-2 py-1 outline-none text-slate-600 font-bold min-w-[120px]" />
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
                    <ResponsiveContainer width="99%" height="99%">
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
                    <ResponsiveContainer width="99%" height="99%">
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

        {/* Categories, System Cats, Settings Tabs */}
        {activeTab === 'settings' && <ShopSettings user={user} permissions={permissions} onUpdateUser={onUpdateUser} />}
       {/* ★ 專業版：獨立出來的網紅分潤設定 Tab */}
        {activeTab === 'affiliate' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 md:p-8 animate-fade-in-up">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 text-[#EE4D2D] rounded-xl flex items-center justify-center text-xl shadow-inner">
                          <i className="fa-solid fa-bullhorn"></i>
                      </div>
                      <div>
                          <h2 className="text-xl font-black text-slate-800">網紅分潤專案管理</h2>
                          <p className="text-xs text-slate-500 mt-1">與網紅合作建立活動，系統將自動套用分潤算式與期限</p>
                      </div>
                  </div>
              </div>
              
              {/* 建立專案表單 */}
              <div className="bg-orange-50/50 border border-orange-100 p-4 md:p-6 rounded-2xl space-y-4 mb-8">
                  <h3 className="text-sm font-black text-[#EE4D2D] border-b border-orange-200 pb-2 mb-4"><i className="fa-solid fa-plus-circle mr-1"></i>建立新分潤活動</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">網紅註冊帳號 (需請網紅提供)</label>
                          <input type="text" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm bg-white" value={newLinkData.influencer_account} onChange={e => setNewLinkData({...newLinkData, influencer_account: e.target.value})} placeholder="例如：danny_kol" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">自訂專屬追蹤代碼 (網址參數)</label>
                          <input type="text" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm bg-white" value={newLinkData.code} onChange={e => setNewLinkData({...newLinkData, code: e.target.value})} placeholder="例如：danny2026" />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">活動開始日期</label>
                          <input type="date" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm bg-white font-bold text-slate-700" value={newLinkData.start_date} onChange={e => setNewLinkData({...newLinkData, start_date: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">活動結束日期</label>
                          <input type="date" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm bg-white font-bold text-slate-700" value={newLinkData.end_date} onChange={e => setNewLinkData({...newLinkData, end_date: e.target.value})} />
                      </div>
                  </div>
                  <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">選擇主打商品</label>
                      <select className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm bg-white" value={newLinkData.product_id} onChange={e => setNewLinkData({...newLinkData, product_id: e.target.value})}>
                          <option value="">-- 請選擇商品 --</option>
                          {myShopProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">主打商品分潤 (%)</label>
                          <input type="number" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm bg-white" value={newLinkData.primary_rate} onChange={e => setNewLinkData({...newLinkData, primary_rate: Number(e.target.value)})} />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">全店其他分潤 (%)</label>
                          <input type="number" className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:border-orange-500 text-sm bg-white" value={newLinkData.secondary_rate} onChange={e => setNewLinkData({...newLinkData, secondary_rate: Number(e.target.value)})} />
                      </div>
                  </div>
                  <button onClick={handleCreateAffiliateLink} className="w-full py-3 bg-[#EE4D2D] text-white rounded-xl font-bold hover:bg-[#d73211] transition shadow-md flex justify-center items-center gap-2 mt-2">
                      <i className="fa-solid fa-link"></i> 驗證網紅身分並建立專案
                  </button>
              </div>

              {/* 網紅歷史過濾列 */}
              {selectedInfluencerId && (
                 <div className="flex flex-col md:flex-row items-start md:items-center justify-between bg-slate-800 text-white p-3 rounded-xl mb-4 shadow-md gap-3">
                    <div className="text-sm font-bold flex items-center gap-2">
                        <i className="fa-solid fa-filter text-orange-400"></i>
                        正在查看特定網紅的合作歷史
                    </div>
                    <button onClick={() => { setSelectedInfluencerId(null); setAffiliatePage(1); }} className="w-full md:w-auto text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg transition font-bold">
                        清除篩選 (查看全部)
                    </button>
                 </div>
              )}

              {/* 活動頁籤 */}
              <div className="flex gap-2 mb-4 border-b border-slate-200 pb-2">
                  <button 
                      onClick={() => { setAffiliateTab('ACTIVE'); setAffiliatePage(1); }} 
                      className={`px-4 py-2 font-black text-sm rounded-t-lg transition ${affiliateTab === 'ACTIVE' ? 'text-[#EE4D2D] border-b-2 border-[#EE4D2D]' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                      進行中的活動
                  </button>
                  <button 
                      onClick={() => { setAffiliateTab('ENDED'); setAffiliatePage(1); }} 
                      className={`px-4 py-2 font-black text-sm rounded-t-lg transition ${affiliateTab === 'ENDED' ? 'text-slate-800 border-b-2 border-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                      已結束的活動
                  </button>
              </div>

              {/* 已產生的連結列表與成效總覽 */}
              {filteredAffiliateLinks.length > 0 ? (
                  <>
                      <div className="space-y-4">
                          {/* ★ 修正：這裡使用 paginatedAffiliateLinks 渲染 */}
                          {paginatedAffiliateLinks.map(link => {
                              const shareUrl = `${window.location.origin}/#/PRODUCT/${link.product_id}?ref=${link.code}`;
                              
                              // ★ 核心修復：強制讓訂單依照「最新建立時間」降冪排列
                              const linkOrders = localOrders
                                  .filter(o => o.affiliate_info?.code === link.code && o.status !== 'CANCELLED')
                                  .sort((a, b) => {
                                      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
                                      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
                                      return timeB - timeA;
                                  });
                                  
                              let totalSales = 0;
                              let estimatedCommission = 0; 
                              let confirmedCommission = 0; 
                              linkOrders.forEach(o => {
                                  totalSales += o.total_amount;
                                  const comm = o.affiliate_info?.total_commission || 0;
                                  if (o.status === 'COMPLETED') confirmedCommission += comm;
                                  else estimatedCommission += comm;
                              });

                              return (
                                  <div key={link.id} className={`bg-white border-2 p-4 md:p-5 rounded-2xl shadow-sm transition relative overflow-hidden ${affiliateTab === 'ENDED' ? 'border-slate-200 opacity-80' : 'border-slate-100 hover:border-orange-200'}`}>
                                      {affiliateTab === 'ENDED' && <div className="absolute top-4 right-4 text-xs font-black bg-slate-200 text-slate-500 px-2 py-1 rounded">已結束</div>}
                                      
                                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 border-b border-slate-50 pb-3 gap-2">
                                          <button 
                                              onClick={() => { setSelectedInfluencerId(link.influencer_id); setAffiliatePage(1); }}
                                              className="font-black text-slate-800 text-base flex items-center gap-2 hover:text-[#EE4D2D] transition group text-left"
                                              title="點擊查看此網紅所有合作紀錄"
                                          >
                                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${affiliateTab === 'ENDED' ? 'bg-slate-100 text-slate-400' : 'bg-orange-100 text-[#EE4D2D]'}`}><i className="fa-solid fa-user-check"></i></div>
                                              <span className="truncate">{link.influencer_name}</span>
                                              <i className="fa-solid fa-magnifying-glass text-[10px] text-slate-300 opacity-0 group-hover:opacity-100"></i>
                                          </button>
                                          <div className="flex flex-col items-start md:items-end gap-1 w-full md:w-auto mt-2 md:mt-0">
                                              <div className="text-[10px] text-slate-400 font-mono"><i className="fa-regular fa-clock"></i> 建立於: {new Date(link.created_at).toLocaleDateString()}</div>
                                              <div className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg shrink-0 flex items-center gap-1 border border-slate-200 w-full md:w-auto justify-center">
                                                  <i className="fa-regular fa-calendar"></i> 活動期間: {link.start_date} ~ {link.end_date}
                                              </div>
                                          </div>
                                      </div>
                                      
                                      <div className="flex gap-2 mb-4 bg-slate-50 p-3 md:p-4 rounded-xl border border-slate-100">
                                          <div className="flex-1 text-center border-r border-slate-200">
                                              <div className="text-[10px] md:text-xs text-slate-500 font-bold mb-1">專案業績</div>
                                              <div className="text-lg md:text-xl font-black text-slate-700">${totalSales.toLocaleString()}</div>
                                          </div>
                                          <div className="flex-1 text-center border-r border-slate-200">
                                              <div className="text-[10px] md:text-xs text-slate-500 font-bold mb-1">目前預計分潤</div>
                                              <div className="text-lg md:text-xl font-black text-orange-500">${estimatedCommission.toLocaleString()}</div>
                                          </div>
                                          <div className="flex-1 text-center border-r border-slate-200">
                                              <div className="text-[10px] md:text-xs text-slate-500 font-bold mb-1">確定總分潤</div>
                                              <div className="text-lg md:text-xl font-black text-green-600">${confirmedCommission.toLocaleString()}</div>
                                          </div>
                                          <div className="flex-1 text-center">
                                              <div className="text-[10px] md:text-xs text-slate-500 font-bold mb-1">成單數</div>
                                              <div className="text-lg md:text-xl font-black text-slate-700">{linkOrders.length} <span className="text-[10px] md:text-xs font-normal text-slate-400">筆</span></div>
                                          </div>
                                      </div>

                                      <div className="text-[11px] text-slate-500 mb-3 flex flex-wrap items-center gap-2">
                                          <span className="bg-white px-2 py-1 rounded font-bold border border-slate-200 shadow-sm">主打: {link.primary_rate}%</span>
                                          <span className="bg-white px-2 py-1 rounded font-bold border border-slate-200 shadow-sm">其他: {link.secondary_rate}%</span>
                                          <span className="bg-red-50 text-red-600 px-2 py-1 rounded font-black border border-red-100 shadow-sm">網址代碼: {link.code}</span>
                                          
                                          {affiliateTab === 'ACTIVE' && (
                                              <button onClick={() => handleTerminateLink(link.id)} className="ml-auto text-[10px] bg-slate-800 text-white px-3 py-1 rounded hover:bg-slate-700 font-bold shadow-sm">
                                                  提前結束專案
                                              </button>
                                          )}
                                      </div>

                                      {affiliateTab === 'ACTIVE' && (
                                          <div className="flex flex-col md:flex-row gap-2 items-center mt-2 mb-4">
                                              <input type="text" readOnly value={shareUrl} className="w-full md:flex-1 p-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-500 outline-none truncate font-mono shadow-inner" />
                                              <button onClick={() => { navigator.clipboard.writeText(shareUrl); alert('連結已複製！'); }} className="w-full md:w-auto px-4 py-2 bg-[#EE4D2D] text-white text-xs font-bold rounded-lg hover:bg-[#d73211] shrink-0 transition flex justify-center items-center gap-2 shadow-sm">
                                                  <i className="fa-regular fa-copy"></i> 複製專屬連結
                                              </button>
                                          </div>
                                      )}

                                      {/* ★ 訂單詳細算式區塊 (修復分頁與排序) */}
                                      <div className="mt-4 pt-3 border-t border-slate-100">
                                          <button onClick={() => { setExpandedLinkId(expandedLinkId === link.id ? null : link.id); setExpandedOrderPage(1); }} className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 w-full justify-center bg-blue-50 py-2 rounded-lg transition border border-blue-100">
                                              <i className={`fa-solid fa-chevron-${expandedLinkId === link.id ? 'up' : 'down'}`}></i> {expandedLinkId === link.id ? '收起訂單明細' : '展開訂單與算式明細'}
                                          </button>

                                          {expandedLinkId === link.id && (
                                              <div className="mt-3 animate-fade-in-up flex flex-col">
                                                  {(() => {
                                                      // ★ 確保訂單依照最新建立時間排序
                                                      const sortedLinkOrders = [...linkOrders].sort((a, b) => {
                                                          const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
                                                          const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
                                                          return timeB - timeA;
                                                      });

                                                      // ★ 計算訂單分頁
                                                      const totalOrderPages = Math.ceil(sortedLinkOrders.length / 8);
                                                      const paginatedLinkOrders = sortedLinkOrders.slice((expandedOrderPage - 1) * 8, expandedOrderPage * 8);

                                                      if (sortedLinkOrders.length === 0) {
                                                          return <div className="text-center text-xs text-slate-400 py-4">目前尚無訂單</div>;
                                                      }

                                                      return (
                                                          <>
                                                              {/* 訂單明細列表 (帶捲軸) */}
                                                              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                                                  {paginatedLinkOrders.map(o => {
                                                                      const statusLabel = SELLER_ORDER_STATUS_OPTIONS.find(opt => opt.value === o.status)?.label || o.status;
                                                                      
                                                                      return (
                                                                      <div key={o.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2 hover:border-orange-200 transition shrink-0">
                                                                          <div className="flex flex-col md:flex-row justify-between md:items-center gap-2 border-b border-slate-100 pb-3">
                                                                              <div className="flex items-center gap-3">
                                                                                  <span className="bg-slate-100 text-slate-600 font-mono text-xs px-2 py-1 rounded font-bold">#{o.id.slice(-6)}</span>
                                                                                  <span className="text-xs text-slate-400">{new Date(o.created_at).toLocaleString()}</span>
                                                                              </div>
                                                                              <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
                                                                                  <span className={`text-[10px] font-bold px-2 py-1 rounded ${o.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : o.status === 'CANCELLED' ? 'bg-slate-200 text-slate-500' : 'bg-orange-100 text-orange-500'}`}>{statusLabel}</span>
                                                                                  <span className="text-xs font-black text-slate-700 bg-slate-50 px-2 py-1 rounded">訂單總額: ${(o.total_amount || 0).toLocaleString()}</span>
                                                                                  <span className={`text-xs font-black px-2 py-1 rounded ${o.status === 'COMPLETED' ? 'text-green-600 bg-green-50' : 'text-orange-500 bg-orange-50'}`}>
                                                                                      {o.status === 'COMPLETED' ? '確定分潤' : '預計分潤'}: ${(o.affiliate_info?.total_commission || 0).toLocaleString()}
                                                                                  </span>
                                                                              </div>
                                                                          </div>
                                                                          <div className="bg-slate-50 p-3 rounded-lg space-y-2 mt-1">
                                                                              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1 border-b border-slate-200 pb-1">分潤計算明細 (全品項)</div>
                                                                              {o.affiliate_info?.details?.length > 0 ? (
                                                                                  o.affiliate_info.details.map((dt: any, idx: number) => (
                                                                                      <div key={idx} className="flex flex-col md:flex-row justify-between text-xs text-slate-600 border-b border-slate-200/50 last:border-0 pb-2 last:pb-0 gap-1 md:gap-0 items-start md:items-center">
                                                                                          <div className="font-bold truncate w-full md:w-1/2 pr-2">{dt.name}</div>
                                                                                          <div className="font-mono text-slate-500 flex items-center justify-end gap-1 w-full md:w-auto">
                                                                                              <span>${dt.price}</span>
                                                                                              <span className="text-[10px]">x</span>
                                                                                              <span>{dt.qty}件</span>
                                                                                              <span className="text-[10px]">x</span>
                                                                                              <span className="text-blue-500 font-bold">{dt.rate}%</span>
                                                                                              <span className="text-[10px]">=</span>
                                                                                              <span className={`font-black ${dt.commission > 0 ? 'text-slate-800' : 'text-slate-400'}`}>${dt.commission}</span>
                                                                                          </div>
                                                                                      </div>
                                                                                  ))
                                                                              ) : (
                                                                                  <div className="text-[10px] text-slate-400 italic">此為舊版訂單，無保存詳細算式</div>
                                                                              )}
                                                                          </div>
                                                                      </div>
                                                                      );
                                                                  })}
                                                              </div>
                                                              
                                                              {/* ★ 展開訂單的換頁按鈕 */}
                                                              {totalOrderPages > 1 && (
                                                                  <div className="flex justify-center items-center gap-2 md:gap-4 mt-4 pt-4 border-t border-slate-100 bg-white sticky bottom-0 z-10 py-2">
                                                                      <button onClick={(e) => { e.stopPropagation(); setExpandedOrderPage(p => Math.max(1, p - 1)); }} disabled={expandedOrderPage === 1} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-100 text-xs shadow-sm"><i className="fa-solid fa-chevron-left"></i> 上一頁</button>
                                                                      <span className="text-xs font-bold text-slate-600">第 {expandedOrderPage} / {totalOrderPages} 頁</span>
                                                                      <button onClick={(e) => { e.stopPropagation(); setExpandedOrderPage(p => Math.min(totalOrderPages, p + 1)); }} disabled={expandedOrderPage === totalOrderPages} className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-100 text-xs shadow-sm">下一頁 <i className="fa-solid fa-chevron-right"></i></button>
                                                                  </div>
                                                              )}
                                                          </>
                                                      );
                                                  })()}
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              );
                          })}
                      </div>

                      {/* ★ 修復：分頁按鈕 (強制顯示) */}
                      <div className="flex justify-center items-center gap-2 md:gap-4 mt-8 pt-6 border-t border-slate-100">
                          <button 
                              onClick={() => setAffiliatePage(p => Math.max(1, p - 1))} 
                              disabled={affiliatePage === 1} 
                              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition shadow-sm font-bold"
                          >
                              <i className="fa-solid fa-chevron-left mr-2"></i> 上一頁
                          </button>
                          
                          <span className="text-sm font-black text-slate-700 px-4 py-2 bg-slate-100 rounded-xl">
                              {affiliatePage} / {Math.max(1, totalAffiliatePages)}
                          </span>
                          
                          <button 
                              onClick={() => setAffiliatePage(p => Math.min(totalAffiliatePages, p + 1))} 
                              disabled={affiliatePage >= totalAffiliatePages} 
                              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition shadow-sm font-bold"
                          >
                              下一頁 <i className="fa-solid fa-chevron-right ml-2"></i>
                          </button>
                      </div>
                  </>
              ) : (
                  <div className="py-20 text-center text-slate-400 font-bold">
                      <i className="fa-solid fa-folder-open text-4xl mb-3 opacity-30 block"></i>
                      此頁籤下目前沒有活動資料
                  </div>
              )}
          </div>
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
           <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 md:p-8">
              <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2"><i className="fa-solid fa-triangle-exclamation text-red-500"></i> 檢舉案件管理</h2>
              <div className="overflow-x-auto w-full">
                 <table className="w-full text-left border-collapse whitespace-nowrap min-w-[600px]">
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
                  <button onClick={() => setReportPage(p => Math.max(1, p - 1))} disabled={reportPage === 1} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50"><i className="fa-solid fa-chevron-left mr-1"></i></button>
                  <span className="text-sm font-bold text-slate-600">第 {reportPage} 頁 / 共 {totalReportPages} 頁</span>
                  <button onClick={() => setReportPage(p => Math.min(totalReportPages, p + 1))} disabled={reportPage === totalReportPages} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50"><i className="fa-solid fa-chevron-right ml-1"></i></button>
                </div>
              )}
           </div>
        )}

        {/* Orders Management Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 md:p-8">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4 pb-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 font-black">訂單管理系統 (銷售)</h2>
              
              <div className="flex items-center gap-2 text-sm bg-slate-50 p-2 rounded-xl w-full md:w-auto">
                 <span className="text-slate-500 font-bold px-2 hidden md:inline">訂單日期:</span>
                 <input type="date" value={orderRange.start} onChange={e => setOrderRange({...orderRange, start: e.target.value})} className="flex-1 border border-slate-300 rounded-lg px-2 py-1 outline-none text-slate-600 font-bold" />
                 <span className="text-slate-300">-</span>
                 <input type="date" value={orderRange.end} onChange={e => setOrderRange({...orderRange, end: e.target.value})} className="flex-1 border border-slate-300 rounded-lg px-2 py-1 outline-none text-slate-600 font-bold" />
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
               <div className="w-full md:flex-1">
                  <div className="md:hidden relative">
                     <select value={orderStatusFilter} onChange={(e) => setOrderStatusFilter(e.target.value)} className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 outline-none focus:border-[#EE4D2D] appearance-none">
                       {SELLER_ORDER_STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                     </select>
                     <i className="fa-solid fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"></i>
                  </div>
                  <div className="hidden md:flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
                    {SELLER_ORDER_STATUS_OPTIONS.map(opt => (
                      <button key={opt.value} onClick={() => setOrderStatusFilter(opt.value)} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition ${orderStatusFilter === opt.value ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{opt.label}</button>
                    ))}
                  </div>
               </div>
               
               <div className="flex gap-2 w-full md:w-auto">
                 <div className="relative flex-1 md:flex-none">
                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-slate-400 text-sm"></i>
                    <input type="text" placeholder="搜尋..." className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#EE4D2D] w-full md:w-48 lg:w-64" value={orderSearchTerm} onChange={e => setOrderSearchTerm(e.target.value)} />
                 </div>
                 <button onClick={() => setShowExportModal(true)} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm shadow-sm flex items-center gap-2 whitespace-nowrap"><i className="fa-solid fa-file-excel"></i> <span className="hidden md:inline">匯出</span></button>
               </div>
            </div>

            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="py-20 text-center text-slate-300">
                  <i className="fa-regular fa-calendar-xmark text-4xl mb-4 block opacity-20"></i>
                  該日期區間或狀態下無訂單資料
                </div>
              ) : (
                paginatedOrders.map(o => {
                  const isPaid = (o as any).is_paid || (o.seller_note && o.seller_note.includes('[已收款]')) || localPaidIds.has(o.id);
                  
                  return (
                  <div key={o.id} onClick={() => { if (onMarkAsViewed) onMarkAsViewed(o.id); setExpandedOrderId(expandedOrderId === o.id ? null : o.id); }} className={`p-4 md:p-5 border rounded-3xl transition shadow-sm bg-white relative overflow-hidden group cursor-pointer ${expandedOrderId === o.id ? 'border-[#EE4D2D] ring-1 ring-[#EE4D2D]' : 'border-slate-100 hover:bg-slate-50'}`}>
                    {!viewedOrderIds?.includes(o.id) && (
                      <div className="absolute top-0 right-0 bg-[#EE4D2D] text-white text-[10px] font-black px-3 py-1 rounded-bl-xl shadow-md z-10 animate-pulse">NEW</div>
                    )}

                    <div className="flex flex-col md:flex-row justify-between items-start mb-2 gap-2">
                      <div className="w-full md:w-auto">

                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 shrink-0">#{o.id.slice(-6)}</span>
                          <span className="font-bold text-slate-800">{o.receiver_name}</span>
                          
                          {/* 新增：訂單成立時間 */}
                          <span className="text-[10px] text-slate-400 font-mono ml-1">
                            <i className="fa-regular fa-clock mr-1"></i>{new Date(o.created_at).toLocaleString('zh-TW')}
                          </span>
                          
                          {/* 修正：聯繫買家愛聊按鈕 */}
                          <button 
                              onClick={(e) => { 
                                  e.stopPropagation(); 
                                  const buyer = allUsers?.find(u => u.phone === o.receiver_phone);
                                  // ★ 關鍵修正：若買家同時是賣家，需傳遞 shop_id 給 ChatRoom 才能正確匹配
                                  const targetId = buyer ? (buyer.shop_id || buyer.id) : o.receiver_phone;
                                  onNavigate(View.CHAT, undefined, targetId); 
                              }} 
                              className="text-[#EE4D2D] text-[10px] px-2 py-0.5 rounded bg-orange-50 hover:bg-orange-100 font-bold border border-orange-100 ml-1 transition"
                          >
                              <i className="fa-regular fa-comments mr-1"></i>聯繫買家
                          </button>
                        </div>
                        
                        <div className="mt-2" onClick={e => e.stopPropagation()}>
                            <label className={`flex items-center gap-2 px-3 py-1 rounded-lg border w-fit transition select-none ${
                               isPaid 
                                 ? 'bg-green-50 border-green-200 cursor-default' 
                                 : 'bg-slate-50 border-slate-200 cursor-pointer hover:bg-slate-100'
                            }`}>
                               <div 
                                 className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                                   isPaid ? 'bg-green-500 border-green-500' : 'bg-white border-slate-300'
                                 }`}
                                 onClick={() => !isPaid && handleTogglePaid(o)}
                               >
                                  {isPaid && <i className="fa-solid fa-check text-white text-[10px]"></i>}
                               </div>
                               <span className={`text-xs font-bold ${isPaid ? 'text-green-700' : 'text-slate-600'}`}>
                                  {isPaid ? '已收到貨款' : '標記收款'}
                               </span>
                            </label>
                        </div>
                      </div>
                      
                      <div className="w-full md:w-auto flex justify-end mt-2 md:mt-0">
                        <select 
                          className={`text-xs font-bold px-4 py-2 rounded-full outline-none border-none cursor-pointer w-full md:w-auto text-center ${
                            o.status === 'PENDING' ? 'bg-orange-100 text-orange-600' : 
                            o.status === 'CONFIRMED' ? 'bg-indigo-100 text-indigo-600' :
                            o.status === 'SHIPPED' ? 'bg-blue-100 text-blue-600' : 
                            o.status === 'COMPLETED' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'
                          }`}
                          value={o.status}
                          onClick={e => e.stopPropagation()} 
                          onChange={e => handleUpdateOrderStatus(o.id, e.target.value as any)}
                        >
                          {SELLER_ORDER_STATUS_OPTIONS.filter(opt => opt.value !== 'ALL' && opt.value !== 'NEW').map(opt => {
                             const currentIdx = STATUS_FLOW.indexOf(o.status);
                             const optIdx = STATUS_FLOW.indexOf(opt.value);
                             const isDisabled = opt.value !== 'CANCELLED' && optIdx < currentIdx;
                             return ( <option key={opt.value} value={opt.value} disabled={isDisabled}>{opt.label}</option> );
                          })}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1 mb-2">
                      {o.items.map((it, i) => (
                        <div key={i} className="flex gap-3 mb-2 bg-slate-50 p-2 rounded-lg items-center">
                           <div className="w-10 h-10 rounded overflow-hidden shrink-0 border border-slate-200 bg-white">
                              <img src={it.images?.[0] || 'https://placehold.co/100'} className="w-full h-full object-cover" alt={it.name} />
                           </div>
                           <div className="flex-1 min-w-0">
                               <div className="text-xs font-bold text-slate-700 truncate">{it.name}</div>
                               <div className="text-[10px] text-slate-500 flex justify-between mt-1">
                                  <span className="truncate pr-2">{it.selectedVariant ? `規格: ${it.selectedVariant}` : '單一規格'}</span>
                                  <span className="shrink-0">x {it.qty}</span>
                               </div>
                           </div>
                        </div>
                      ))}
                    </div>

                    <div className="text-right font-black text-[#EE4D2D] text-lg">
                        ${o.total_amount.toLocaleString()}
                    </div>

                    {expandedOrderId === o.id && (
                       <div className="mt-4 pt-4 border-t border-slate-100 text-sm text-slate-600 space-y-3 bg-slate-50/50 -mx-4 -mb-4 md:-mx-5 md:-mb-5 p-4 md:p-5 animate-fade-in" onClick={e => e.stopPropagation()}>
                          <div className="flex gap-2"><span className="font-bold min-w-[50px] md:min-w-[70px]">電話：</span><span className="truncate">{o.receiver_phone}</span></div>
                          <div className="flex gap-2"><span className="font-bold min-w-[50px] md:min-w-[70px]">寄送：</span><span className="truncate">{o.ship_method} - {o.store_name}</span></div>
                          <div className="flex gap-2 flex-wrap">
                             <span className="font-bold min-w-[50px] md:min-w-[70px]">付款：</span>
                             <span>{o.payment_method === 'TRANSFER' ? '銀行匯款' : o.payment_method === 'COD' ? '貨到付款' : '面交/現金'} {o.payment_method === 'TRANSFER' && o.payment_note && <span className="text-[#EE4D2D] font-mono ml-2">(末五碼: {o.payment_note})</span>}</span>
                          </div>
                          
                          {o.remarks && <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100"><div className="font-bold text-yellow-700 mb-1">買家備註：</div><div className="text-yellow-900 text-xs md:text-sm">{o.remarks}</div></div>}
                          {o.answers && o.answers.length > 0 && (
                             <div className="bg-blue-50 p-3 rounded-lg border border-blue-100"><div className="font-bold text-blue-700 mb-1">問卷回答：</div><ul className="list-disc pl-4 text-blue-900 space-y-1 text-xs md:text-sm">{o.answers.map((a, idx) => <li key={idx}><span className="font-bold">{a.question}:</span> {a.answer}</li>)}</ul></div>
                          )}

                          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm mt-3">
                             <div className="text-xs font-bold text-slate-500 mb-1">📝 賣家內部備註 (僅自己可見)</div>
                             <div className="flex flex-col md:flex-row gap-2">
                                <textarea 
                                  className="w-full md:flex-1 border border-slate-200 rounded px-2 py-2 text-sm outline-none focus:border-[#EE4D2D] resize-none min-h-[40px]"
                                  placeholder="填寫備註 (可換行)..."
                                  rows={2}
                                  value={tempSellerNotes[o.id] !== undefined ? tempSellerNotes[o.id] : (o.seller_note || '')}
                                  onChange={e => setTempSellerNotes({...tempSellerNotes, [o.id]: e.target.value})}
                                />
                                <button onClick={() => handleSaveSellerNote(o.id)} className="w-full md:w-auto bg-slate-800 text-white px-4 py-2 rounded text-xs h-fit self-end md:self-stretch">儲存</button>
                             </div>
                          </div>
                          <div className="text-[10px] md:text-xs text-slate-400 text-right pt-2 border-t border-slate-200/50">下單時間：{new Date(o.created_at).toLocaleString()}</div>
                       </div>
                    )}
                    {expandedOrderId !== o.id && ( <div className="text-center text-[10px] text-slate-400 mt-2"><i className="fa-solid fa-chevron-down mr-1"></i> 點擊查看詳細資訊</div> )}
                  </div>
                );
              })
              )}
            </div>
            {totalOrderPages > 1 && ( <div className="flex justify-center items-center gap-2 md:gap-4 mt-8"> <button onClick={() => setOrderPage(p => Math.max(1, p - 1))} disabled={orderPage === 1} className="px-3 md:px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50 text-xs md:text-sm"><i className="fa-solid fa-chevron-left"></i></button> <span className="text-xs md:text-sm font-bold text-slate-600">第 {orderPage}/{totalOrderPages} 頁</span> <button onClick={() => setOrderPage(p => Math.min(totalOrderPages, p + 1))} disabled={orderPage === totalOrderPages} className="px-3 md:px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50 text-xs md:text-sm"><i className="fa-solid fa-chevron-right"></i></button> </div> )}
          </div>
        )}

{/* Customers Management Tab */}
        {activeTab === 'customers' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 md:p-8 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4 pb-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 font-black flex items-center gap-2"><i className="fa-solid fa-users text-[#EE4D2D]"></i> 客戶管理系統</h2>
              
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
                          
                          <div className="flex items-center justify-between w-full md:w-auto gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 mt-1 md:mt-0 shrink-0">
                             <div className="text-left md:text-right">
                                 <div className="text-[10px] text-slate-400 font-bold">區間消費總額</div>
                                 <div className="text-lg font-black text-[#EE4D2D]">${c.totalSpent.toLocaleString()}</div>
                             </div>
                             <button 
                                onClick={() => onNavigate(View.CHAT, undefined, c.targetId)} 
                                className="bg-orange-50 text-[#EE4D2D] hover:bg-[#EE4D2D] hover:text-white border border-orange-100 px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2"
                             >
                                <i className="fa-regular fa-comments"></i> 愛聊
                             </button>
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
           <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 md:p-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-xl font-bold text-slate-800 font-black">您的商品列表</h2>
                <button onClick={() => setActiveTab('create')} className="w-full md:w-auto px-5 py-3 md:py-2 primary-gradient text-white rounded-xl text-sm md:text-xs font-bold shadow-md">+ 新增團購</button>
              </div>
              <div className="space-y-4">
                 {/* ★ 修改：改用 paginatedProducts，確保新商品排在最上面，且正確套用分頁 */ }
                 {paginatedProducts.length === 0 ? <div className="py-20 text-center text-slate-300">目前沒有商品</div> : 
                 paginatedProducts.map(p => (
                    <div key={p.id} className="flex flex-col md:flex-row items-start md:items-center gap-4 p-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition group">
                        <div className="flex gap-4 w-full md:w-auto md:flex-1 items-center">
                            <div className="w-16 h-16 rounded-xl overflow-hidden border bg-slate-100 shrink-0"><img src={p.images[0] || 'https://placehold.co/100'} className="w-full h-full object-cover" /></div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold text-slate-800 text-sm truncate">{p.name}</div>
                                <div className="text-[10px] text-slate-400 mt-1 truncate">分類: {p.category_ids?.map(id => categories.find(c => c.id === id)?.name || systemCategories?.find(c => c.id === id)?.name || id).join(', ') || '未分類'}</div>
                                <div className="text-xs text-[#EE4D2D] font-black mt-1">${p.price.toLocaleString()}</div>
                                
                                {/* ★ 新增：以卡片形式顯示該商品所有規格的庫存狀態 */}
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
                            <button onClick={() => { setEditingId(p.id); setForm(p); setActiveTab('create'); }} className="px-4 py-2 md:p-2 bg-blue-50 md:bg-transparent text-blue-500 rounded-lg md:rounded-none font-bold text-xs"><i className="fa-solid fa-pen-to-square mr-1 md:mr-0"></i><span className="md:hidden">編輯</span></button>
                            <button onClick={() => handleDeleteProduct(p.id)} className="px-4 py-2 md:p-2 bg-red-50 md:bg-transparent text-red-500 rounded-lg md:rounded-none font-bold text-xs"><i className="fa-solid fa-trash-can mr-1 md:mr-0"></i><span className="md:hidden">刪除</span></button>
                        </div>
                    </div>
                 ))}
              </div>
              
              {/* ★ 新增：商品列表的分頁控制按鈕 */}
              {totalProductPages > 1 && (
                <div className="flex justify-center items-center gap-2 md:gap-4 mt-8">
                  <button onClick={() => setProductPage(p => Math.max(1, p - 1))} disabled={productPage === 1} className="px-3 md:px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50 text-xs md:text-sm"><i className="fa-solid fa-chevron-left"></i></button>
                  <span className="text-xs md:text-sm font-bold text-slate-600">第 {productPage} / {totalProductPages} 頁</span>
                  <button onClick={() => setProductPage(p => Math.min(totalProductPages, p + 1))} disabled={productPage === totalProductPages} className="px-3 md:px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 disabled:opacity-50 hover:bg-slate-50 text-xs md:text-sm"><i className="fa-solid fa-chevron-right"></i></button>
                </div>
              )}
           </div>
        )}

        {/* =========================================
            ✨ 完整修復的「新增/編輯商品」區塊 ✨
           ========================================= */}
        {activeTab === 'create' && (
           <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 md:p-8">
             <h2 className="text-2xl font-black text-slate-800 mb-8 border-l-4 border-[#EE4D2D] pl-4">
                {editingId ? '編輯商品資訊' : '發布新的商品'}
             </h2>
             
             <div className="max-w-3xl space-y-10">
                {/* Step 1. 基本資訊 */}
                <section className="space-y-6">
                    <div className="text-sm font-black text-[#EE4D2D] uppercase tracking-widest border-b pb-2">Step 1. 商品基本資訊</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-slate-500 mb-2 block">商品名稱</label>
                            <input type="text" className="w-full h-12 border border-slate-200 rounded-2xl px-5 text-sm outline-none focus:border-[#EE4D2D]" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="請輸入商品名稱" />
                        </div>
                        <div className="w-full">
                            <label className="text-xs font-bold text-slate-500 mb-2 block">團購基礎價</label>
                            <input type="number" className="w-full h-12 border border-slate-200 rounded-2xl px-5 text-sm font-black text-[#EE4D2D]" value={form.price || ''} onChange={e => setForm({...form, price: parseInt(e.target.value) || 0})} placeholder="NT$" />
                        </div>
                        <div className="w-full">
                            <label className="text-xs font-bold text-slate-500 mb-2 block">原價 (選填，將顯示為刪除線)</label>
                            <input type="number" className="w-full h-12 border border-slate-200 rounded-2xl px-5 text-sm outline-none focus:border-slate-400" value={form.original_price || ''} onChange={e => setForm({...form, original_price: parseInt(e.target.value) || 0})} placeholder="NT$" />
                        </div>
                        
                        {/* 新增：預購設定區塊 */}
                        <div className="md:col-span-2 bg-orange-50/50 p-5 rounded-2xl border border-orange-100 mt-2">
                            <label className={`flex items-center gap-2 w-fit mb-4 ${sellerConfig.can_use_preorder ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                               onClick={(e) => {
                                   if (!sellerConfig.can_use_preorder) {
                                       e.preventDefault();
                                       alert('會員等級限制：\n您目前的會員等級無法使用「商品預購模式」。\n請升級會員解鎖此功能！');
                                   }
                               }}
                        >
                            <input type="checkbox" checked={(form as any).is_preorder || false} onChange={e => {
                                if (sellerConfig.can_use_preorder) {
                                    setForm({...form, is_preorder: e.target.checked} as any);
                                }
                            }} className={`w-5 h-5 accent-[#EE4D2D] ${!sellerConfig.can_use_preorder && 'pointer-events-none'}`} />
                            <span className="text-sm font-black text-[#EE4D2D]"><i className="fa-solid fa-fire mr-1"></i> 開啟商品預購模式 {!sellerConfig.can_use_preorder && '(會員等級限制)'}</span>
                        </label>
                            {(form as any).is_preorder && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up">
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 mb-2 block">預購結束日期</label>
                                        <input type="date" className="w-full h-12 border border-orange-200 rounded-xl px-4 text-sm outline-none focus:border-[#EE4D2D] bg-white" value={(form as any).preorder_end_date || ''} onChange={e => setForm({...form, preorder_end_date: e.target.value} as any)} />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-slate-600 mb-2 block">預計到貨日期</label>
                                        <input type="date" className="w-full h-12 border border-orange-200 rounded-xl px-4 text-sm outline-none focus:border-[#EE4D2D] bg-white" value={(form as any).preorder_arrival_date || ''} onChange={e => setForm({...form, preorder_arrival_date: e.target.value} as any)} />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-slate-500 mb-2 block">商品描述</label>
                            <textarea className="w-full h-40 border border-slate-200 rounded-2xl p-5 text-sm outline-none focus:border-[#EE4D2D] resize-none" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="詳細介紹您的商品特色、尺寸、材質等資訊..."></textarea>
                            
                            {/* ★ 更新：草稿功能 UI (下拉選單版) */}
                            <div className="mt-3 flex flex-col md:flex-row items-start md:items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                               <button onClick={handleSaveDraft} className="w-full md:w-auto text-xs bg-slate-800 text-white px-4 py-2.5 rounded-lg hover:bg-slate-700 transition font-bold shadow-sm whitespace-nowrap shrink-0">
                                   <i className="fa-solid fa-save mr-1"></i>存為草稿
                               </button>
                               
                               <div className="w-full md:flex-1 flex gap-2">
                                   <select 
                                      className="flex-1 border border-slate-200 rounded-lg p-2 text-xs outline-none focus:border-[#EE4D2D] bg-white cursor-pointer min-w-0 font-bold text-slate-600"
                                      value={selectedDraftId}
                                      onChange={e => setSelectedDraftId(e.target.value)}
                                   >
                                       <option value="" disabled hidden>-- 選擇已儲存的草稿 --</option>
                                       {drafts.length === 0 && <option value="none" disabled>尚未建立草稿</option>}
                                       {drafts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                   </select>
                                   <button 
                                      onClick={() => { if(selectedDraftId) applyDraft(selectedDraftId); else alert('請先選擇草稿'); }} 
                                      className="text-xs bg-blue-50 text-blue-600 px-4 py-2.5 rounded-lg font-bold hover:bg-blue-100 transition shrink-0 border border-blue-100 shadow-sm"
                                   >
                                      帶入
                                   </button>
                                   <button 
                                      onClick={() => { 
                                          if(selectedDraftId) { 
                                              deleteDraft(selectedDraftId); 
                                              setSelectedDraftId(''); 
                                          } else alert('請先選擇草稿'); 
                                      }} 
                                      className="text-xs bg-red-50 text-red-500 px-4 py-2.5 rounded-lg font-bold hover:bg-red-100 transition shrink-0 border border-red-100 shadow-sm"
                                   >
                                      刪除
                                   </button>
                               </div>
                            </div>
                        </div>
                        
                        {/* 圖片上傳區 */}
                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-slate-500 mb-2 block">
                                商品圖片 (最多可上傳多張圖片，建議 1:1 比例) <span className="text-[#EE4D2D]">(單張限制 1MB)</span>
                            </label>
                            <div className="flex flex-wrap gap-4">
                                {form.images?.map((img, i) => (
                                <div key={i} className="w-24 h-24 border rounded-xl overflow-hidden relative group bg-slate-100 cursor-pointer" onClick={() => setCropModal({ isOpen: true, src: img, editIndex: i })}>
                                    <img src={img} className="w-full h-full object-cover group-hover:opacity-80 transition" alt="Product" />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                                        <i className="fa-solid fa-pen text-white drop-shadow-md"></i>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); const newImgs = [...(form.images || [])]; newImgs.splice(i, 1); setForm({...form, images: newImgs}); }} className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all">
                                        <i className="fa-solid fa-xmark text-xs"></i>
                                    </button>
                                </div>
                                ))}
                                {/* ★ 修改：如果圖片數量小於上限才顯示上傳按鈕 */}
                                {(form.images?.length || 0) < sellerConfig.max_images_per_product && (
                                    <button onClick={() => fileInputRef.current?.click()} className="w-24 h-24 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-[#EE4D2D] hover:text-[#EE4D2D] gap-1 hover:bg-orange-50 transition shrink-0">
                                        <i className="fa-solid fa-crop-simple text-xl"></i>
                                        <span className="text-[10px] text-center font-bold">新增/裁切<br/>圖片</span>
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleMediaUpload} />
                                    </button>
                                )}
                                {/* ★ 修改：如果圖片數量已達上限，顯示鎖定圖示 */}
                                {(form.images?.length || 0) >= sellerConfig.max_images_per_product && (
                                    <div className="w-24 h-24 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-300 gap-1 bg-slate-50 cursor-not-allowed shrink-0" title="已達圖片數量上限">
                                        <i className="fa-solid fa-lock text-lg"></i>
                                        <span className="text-[10px] text-center font-bold text-slate-400">已達數量上限<br/>(共{sellerConfig.max_images_per_product}張)</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Step 2. 分類設定 */}
                <section className="space-y-6">
                    <div className="text-sm font-black text-[#EE4D2D] uppercase tracking-widest border-b pb-2">Step 2. 商品分類設定</div>
                    
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                        <div className="flex flex-wrap gap-2">
                            {form.category_ids?.map(id => {
                                const cName = systemCategories?.find(c => c.id === id)?.name || categories?.find(c => c.id === id)?.name || id;
                                return (
                                    <span key={id} className="bg-white border border-[#EE4D2D] text-[#EE4D2D] px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 shadow-sm">
                                        {cName} 
                                        <button onClick={() => removeCategoryTag(id)} className="hover:text-red-600 bg-red-50 rounded-full w-4 h-4 flex items-center justify-center"><i className="fa-solid fa-xmark text-[10px]"></i></button>
                                    </span>
                                );
                            })}
                            {(!form.category_ids || form.category_ids.length === 0) && <span className="text-xs text-slate-400 italic">尚未選擇分類</span>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-600"><i className="fa-solid fa-sitemap mr-1"></i> 加入全站共同分類</label>
                                <div className="flex flex-col gap-2">
                                    <select className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none" value={selectedMainCat} onChange={e => { setSelectedMainCat(e.target.value); setSelectedSubCat(''); }}>
                                        <option value="">選擇主分類...</option>
                                        {systemCategories?.filter(c => !c.parent_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    {selectedMainCat && (
                                        <select className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none" value={selectedSubCat} onChange={e => setSelectedSubCat(e.target.value)}>
                                            <option value="">選擇子分類 (選填)...</option>
                                            {systemCategories?.filter(c => c.parent_id === selectedMainCat).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    )}
                                    <button onClick={() => handleAddCategoryTag('SYSTEM')} disabled={!selectedMainCat} className="w-full bg-slate-800 text-white rounded-lg py-2 text-xs font-bold disabled:opacity-50">新增系統分類標籤</button>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-600"><i className="fa-solid fa-store mr-1"></i> 加入本店自訂分類</label>
                                <div className="flex flex-col gap-2">
                                    <select className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none" value={selectedShopMainCat} onChange={e => { setSelectedShopMainCat(e.target.value); setSelectedShopSubCat(''); }}>
                                        <option value="">選擇主分類...</option>
                                        {categories?.filter(c => !c.parent_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    {selectedShopMainCat && (
                                        <select className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none" value={selectedShopSubCat} onChange={e => setSelectedShopSubCat(e.target.value)}>
                                            <option value="">選擇子分類 (選填)...</option>
                                            {categories?.filter(c => c.parent_id === selectedShopMainCat).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    )}
                                    <button onClick={() => handleAddCategoryTag('SHOP')} disabled={!selectedShopMainCat} className="w-full bg-slate-800 text-white rounded-lg py-2 text-xs font-bold disabled:opacity-50">新增商店分類標籤</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Step 3. 規格與庫存 */}
                <section className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                        <div className="text-sm font-black text-[#EE4D2D] uppercase tracking-widest">Step 3. 規格與庫存</div>
                        <button onClick={addVariant} className="text-[#EE4D2D] text-xs font-bold bg-orange-50 px-3 py-1 rounded-full hover:bg-orange-100 transition"><i className="fa-solid fa-plus mr-1"></i>新增規格</button>
                    </div>
                    
                    <div className="space-y-3">
                        {form.variants?.map((v, i) => (
                            <div key={i} className="flex flex-col md:flex-row gap-4 items-end bg-slate-50 p-4 md:p-5 rounded-2xl border border-slate-200 relative">
                                <div className="w-full md:flex-1">
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">規格名稱 (如: 紅色 M)</label>
                                    <input type="text" className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-[#EE4D2D]" value={v.name} onChange={e => updateVariant(i, 'name', e.target.value)} />
                                </div>
                                <div className="w-full md:flex-1">
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">附加價格 (+NT$)</label>
                                    <input type="number" className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-[#EE4D2D]" value={v.price} onChange={e => updateVariant(i, 'price', parseInt(e.target.value)||0)} />
                                </div>
                                <div className="w-full md:flex-1">
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">庫存數量</label>
                                    <input type="number" className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-[#EE4D2D]" value={v.stock} onChange={e => updateVariant(i, 'stock', parseInt(e.target.value)||0)} />
                                </div>
                                {form.variants && form.variants.length > 1 && (
                                    <button onClick={() => removeVariant(i)} className="absolute top-2 right-2 md:static md:w-auto p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                                        <i className="fa-solid fa-trash-can"></i>
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Step 4. 運送與付款設定 */}
                <section className="space-y-6">
                    <div className="text-sm font-black text-[#EE4D2D] uppercase tracking-widest border-b pb-2">Step 4. 運送與付款設定</div>
                    
                    <div className="grid grid-cols-1 gap-8">
                        {/* 運費設定 */}
                        <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><i className="fa-solid fa-truck text-[#EE4D2D]"></i> 提供買家的運送方式</label>
                            
                            <div className="flex flex-wrap gap-2 mb-4">
                                {SHIPPING_PRESETS.map(preset => (
                                    <button 
                                        key={preset.name}
                                        onClick={() => addShippingRule(preset.name)}
                                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-3 py-1.5 rounded-full transition"
                                    >
                                        + {preset.name}
                                    </button>
                                ))}
                                <button onClick={() => addShippingRule()} className="text-xs bg-orange-50 text-[#EE4D2D] font-bold px-3 py-1.5 rounded-full hover:bg-orange-100 transition border border-orange-200">+ 自訂運送</button>
                            </div>

                            <div className="space-y-3">
                                {form.shipping_rules?.map((rule, i) => (
                                    <div key={i} className="flex flex-col gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 relative">
                                        <div className="flex justify-between items-center gap-4">
                                            <input type="text" className="border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-700 w-full md:w-1/2" value={rule.name} onChange={e => updateShippingRule(i, 'name', e.target.value)} placeholder="方式名稱" />
                                            <button onClick={() => removeShippingRule(i)} className="text-red-400 hover:text-red-600 p-2 shrink-0"><i className="fa-solid fa-trash-can text-sm"></i></button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div>
                                                <label className="text-[10px] text-slate-500 font-bold mb-1 block">單趟運費</label>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-500 font-bold">$</span>
                                                    <input type="number" className="flex-1 border border-slate-200 rounded-lg p-2 text-sm" value={rule.fee === undefined ? '' : rule.fee} onChange={e => updateShippingRule(i, 'fee', e.target.value === '' ? '' : parseInt(e.target.value))} placeholder="金額" />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-500 font-bold mb-1 block">每滿幾件加收一次運費</label>
                                                <input type="number" className="w-full border border-slate-200 rounded-lg p-2 text-sm" value={rule.limit_qty === 0 ? '' : rule.limit_qty} onChange={e => updateShippingRule(i, 'limit_qty', e.target.value === '' ? 0 : parseInt(e.target.value))} placeholder="例: 4 (留空=不限)" />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-slate-500 font-bold mb-1 block">滿多少金額免運</label>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-500 font-bold">$</span>
                                                    <input type="number" className="flex-1 border border-slate-200 rounded-lg p-2 text-sm" value={rule.free_threshold === 0 ? '' : rule.free_threshold} onChange={e => updateShippingRule(i, 'free_threshold', e.target.value === '' ? 0 : parseInt(e.target.value))} placeholder="例: 1000 (留空=無)" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!form.shipping_rules || form.shipping_rules.length === 0) && <div className="text-xs text-red-500 font-bold p-3 bg-red-50 rounded-lg">請至少新增一種運送方式！</div>}
                            </div>
                        </div>

                        {/* 付款方式設定 */}
                        <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><i className="fa-solid fa-credit-card text-[#EE4D2D]"></i> 支援的付款方式</label>
                            <div className="flex flex-wrap gap-4">
                                {PAYMENT_OPTIONS.map(opt => (
                                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 hover:border-[#EE4D2D] transition">
                                        <input 
                                            type="checkbox" 
                                            className="w-4 h-4 accent-[#EE4D2D]"
                                            checked={form.payment_methods?.includes(opt.value)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setForm({...form, payment_methods: [...(form.payment_methods || []), opt.value]});
                                                } else {
                                                    setForm({...form, payment_methods: form.payment_methods?.filter(m => m !== opt.value)});
                                                }
                                            }}
                                        />
                                        <span className="text-sm font-bold text-slate-700">{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                            
                            {/* 銀行帳號設定 (只有勾選銀行匯款才顯示) */}
                            {form.payment_methods?.includes('BANK') && (
                                <div className="mt-4 p-5 border border-[#EE4D2D] bg-orange-50/30 rounded-2xl space-y-4 animate-fade-in">
                                    <div className="text-sm font-black text-[#EE4D2D]">銀行匯款帳戶設定</div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-600 block mb-1">收款銀行</label>
                                            {isCustomBank ? (
                                                <div className="flex gap-2">
                                                    <input type="text" className="w-16 border rounded p-2 text-sm" placeholder="代碼" value={form.bank_info?.bank_code} onChange={e => setForm({...form, bank_info: {...form.bank_info!, bank_code: e.target.value}})} />
                                                    <input type="text" className="flex-1 border rounded p-2 text-sm" placeholder="自訂銀行名稱" value={form.bank_info?.bank_name} onChange={e => setForm({...form, bank_info: {...form.bank_info!, bank_name: e.target.value}})} />
                                                    <button onClick={() => setIsCustomBank(false)} className="text-xs text-blue-500 underline">選單</button>
                                                </div>
                                            ) : (
                                                <select className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-[#EE4D2D]" value={form.bank_info?.bank_code} onChange={e => {
                                                    if(e.target.value === 'custom') { setIsCustomBank(true); return; }
                                                    const bank = TAIWAN_BANKS.find(b => b.code === e.target.value);
                                                    if(bank) setForm({...form, bank_info: {...form.bank_info!, bank_code: bank.code, bank_name: bank.name}});
                                                }}>
                                                    {TAIWAN_BANKS.map(b => <option key={b.code} value={b.code}>{b.code} - {b.name}</option>)}
                                                    <option value="custom">+ 其他銀行 (手動輸入)</option>
                                                </select>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-slate-600 block mb-1">戶名</label>
                                            <input type="text" className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-[#EE4D2D]" value={form.bank_info?.account_name} onChange={e => setForm({...form, bank_info: {...form.bank_info!, account_name: e.target.value}})} placeholder="請輸入戶名" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="text-xs font-bold text-slate-600 block mb-1">匯款帳號</label>
                                            <input type="text" className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-[#EE4D2D] font-mono" value={form.bank_info?.account_number} onChange={e => setForm({...form, bank_info: {...form.bank_info!, account_number: e.target.value}})} placeholder="請輸入純數字帳號" />
                                        </div>
                                    </div>
                                    <label className="flex items-center gap-2 mt-2 cursor-pointer w-fit">
                                        <input type="checkbox" checked={saveBank} onChange={e => setSaveBank(e.target.checked)} className="w-4 h-4 accent-[#EE4D2D]" />
                                        <span className="text-xs font-bold text-slate-600">記住此帳號作為未來預設收款帳戶</span>
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Step 5. 其他進階設定 (問卷、產地、SEO) */}
                <section className="space-y-6">
                    <div className="text-sm font-black text-[#EE4D2D] uppercase tracking-widest border-b pb-2">Step 5. 其他進階設定 (選填)</div>
                    
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-6">
                        
                        {/* 購買前問卷 */}
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><i className="fa-solid fa-clipboard-question text-blue-500"></i> 結帳前填寫表單</label>
                                <button onClick={addQuestion} className="text-blue-500 text-xs font-bold bg-blue-100 px-3 py-1 rounded-full hover:bg-blue-200 transition">+ 新增問題</button>
                            </div>
                            <div className="space-y-3">
                                {form.questions?.map((q, i) => (
                                    <div key={i} className="flex gap-3 items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                        <input type="text" className="flex-1 border-none bg-transparent text-sm outline-none" value={q.title} onChange={e => updateQuestion(i, 'title', e.target.value)} placeholder="例如：您的 IG 帳號？" />
                                        <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer border-l pl-3">
                                            <input type="checkbox" checked={q.required} onChange={e => updateQuestion(i, 'required', e.target.checked)} className="accent-blue-500" />
                                            必填
                                        </label>
                                        <button onClick={() => removeQuestion(i)} className="text-red-400 hover:text-red-600 px-2"><i className="fa-solid fa-xmark"></i></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 產地與出貨地 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-200 pt-6">
                            <div>
                                <label className="text-xs font-bold text-slate-600 block mb-2">商品製造產地</label>
                                <select className="w-full border border-slate-200 rounded-lg p-2 text-sm bg-white" value={form.origin || '台灣'} onChange={e => setForm({...form, origin: e.target.value})}>
                                    {COMMON_ORIGINS.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-600 block mb-2">商品出貨地</label>
                                <div className="flex gap-2">
                                    <select className="w-1/2 border border-slate-200 rounded-lg p-2 text-sm bg-white" value={originSelect} onChange={e => { setOriginSelect(e.target.value); setOriginDistrictSelect(''); }}>
                                        {Object.keys(TAIWAN_DISTRICTS).map(city => <option key={city} value={city}>{city}</option>)}
                                        <option value="海外">🌍 海外出貨</option>
                                        <option value="手動填寫">✏️ 手動填寫</option>
                                    </select>
                                    {originSelect !== '手動填寫' && originSelect !== '海外' && (
                                        <select className="w-1/2 border border-slate-200 rounded-lg p-2 text-sm bg-white" value={originDistrictSelect} onChange={e => setOriginDistrictSelect(e.target.value)}>
                                            <option value="">選擇行政區</option>
                                            {TAIWAN_DISTRICTS[originSelect]?.map(dist => <option key={dist} value={dist}>{dist}</option>)}
                                        </select>
                                    )}
                                    {(originSelect === '手動填寫' || originSelect === '海外') && (
                                        <input type="text" className="w-1/2 border border-slate-200 rounded-lg p-2 text-sm" value={originManual} onChange={e => setOriginManual(e.target.value)} placeholder="填寫出貨地" />
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* SEO 關鍵字 */}
                        <div className="border-t border-slate-200 pt-6">
                            <label className="text-xs font-bold text-slate-600 block mb-2 flex justify-between">
                                <span>SEO 搜尋關鍵字 (用逗號隔開)</span>
                                <span className="text-slate-400 font-normal">買家搜尋時更容易找到您的商品</span>
                            </label>
                            <input 
                                type="text" 
                                className="w-full border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-[#EE4D2D] bg-white" 
                                value={seoInputValue} 
                                onChange={e => {
                                    setSeoInputValue(e.target.value);
                                    setForm({...form, keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)});
                                }} 
                                placeholder="例如：洋裝, 夏季, 碎花" 
                            />
                        </div>
                    </div>
                </section>

                {/* 底部按鈕區 */}
                <div className="flex flex-col md:flex-row gap-4 pt-10 border-t border-slate-200">
                  <button onClick={resetForm} className="w-full md:flex-1 h-14 rounded-2xl font-bold text-slate-500 border-2 border-slate-200 hover:bg-slate-50 transition">取消返回</button>
                  <button onClick={handleSaveProduct} className="w-full md:flex-[2] h-14 primary-gradient text-white rounded-2xl font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-lg">
                      {editingId ? '確認儲存修改' : '確認發布並開始團購'}
                  </button>
                </div>
             </div>
           </div>
        )}
        
        {/* Buyer Account / Orders (unchanged structure) */}
        {activeTab === 'buying_account' && (
           <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8"><h2 className="text-2xl font-black text-slate-800 mb-8 border-l-4 border-slate-800 pl-4">我的帳戶資料 (買家)</h2><div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div><label className="text-xs font-bold text-slate-400 mb-1 block">會員名稱</label><div className="text-lg font-bold text-slate-700">{user.name}</div></div><div><label className="text-xs font-bold text-slate-400 mb-1 block">手機號碼</label><div className="text-lg font-bold text-slate-700">{user.phone}</div></div></div></div>
        )}

        {/* 購買清單區域：新增「賣家已收款」印章 */}
        {activeTab === 'buying_orders' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 md:p-8">
            <h2 className="text-2xl font-black text-slate-800 mb-8 border-l-4 border-slate-800 pl-4">我的購買清單</h2>
            <div className="flex overflow-x-auto pb-2 mb-6 gap-2 scrollbar-hide">
              {BUYER_ORDER_STATUS_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setBuyOrderStatusFilter(opt.value)} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition ${buyOrderStatusFilter === opt.value ? 'bg-slate-800 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                  {opt.label}
                </button>
              ))}
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
        
        {activeTab === 'buying_reports' && (
           <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8"><h2 className="text-2xl font-black text-slate-800 mb-8 border-l-4 border-slate-800 pl-4">個人消費報表</h2>
              <div className="py-10 text-center text-slate-400"><i className="fa-solid fa-chart-column text-4xl mb-4 opacity-50"></i><p>消費數據持續累積中...</p></div>
           </div>
        )}
      </div>

      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in-up">
              <h3 className="font-bold text-lg mb-4 text-slate-800">匯出訂單 (Excel/CSV)</h3>
              <div className="space-y-4 mb-6">
                 <div className="flex gap-2"><button onClick={handleExportConfirm} className="flex-1 bg-green-600 text-white py-2 rounded-xl font-bold hover:bg-green-700 shadow-md">確認匯出</button><button onClick={() => setShowExportModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-xl font-bold hover:bg-slate-200">取消</button></div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;