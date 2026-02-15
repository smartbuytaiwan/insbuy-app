
import { Product } from './types';

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p1',
    shop_id: 'S001',
    category_id: 'c2',
    category_ids: ['c2'],
    name: '【正韓】極致柔棉保暖居家服 兩件組',
    description: '100% 純棉材質，透氣保暖，適合秋冬居家穿著。多款顏色可選。',
    images: ['https://picsum.photos/id/1/600/600', 'https://picsum.photos/id/2/600/600'],
    price: 590,
    original_price: 1280,
    status: 'OPEN',
    product_type: 'PHYSICAL',
    variants: [
      { name: '經典白 M', price: 0, stock: 50 },
      { name: '經典白 L', price: 0, stock: 30 },
      { name: '莫蘭迪藍 M', price: 50, stock: 20 }
    ],
    shipping_rules: [{ name: '7-11', fee: 60, free_threshold: 1000 }, { name: '宅配', fee: 100, free_threshold: 2000 }],
    end_time: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days
    target_amount: 10000,
    current_amount: 4500,
    total_stock: 100,
    is_pinned: true,
    questions: [{ title: '備註款式顏色', required: false }]
  },
  {
    id: 'p2',
    shop_id: 'S002',
    category_id: 'c5',
    category_ids: ['c5'],
    name: '多功能氣炸烤箱 24L 大容量',
    description: '健康減油，一機多用。包含烤、炸、烘、乾多種功能。',
    images: ['https://picsum.photos/id/10/600/600'],
    price: 3280,
    original_price: 4990,
    status: 'OPEN',
    product_type: 'PHYSICAL',
    variants: [{ name: '珍珠白', price: 0, stock: 15 }, { name: '曜石黑', price: 0, stock: 10 }],
    shipping_rules: [{ name: '宅配', fee: 150, free_threshold: 2000 }],
    end_time: new Date(Date.now() + 86400000 * 7).toISOString(),
    target_amount: 50000,
    current_amount: 12500,
    total_stock: 25,
    is_pinned: false
  },
  {
    id: 'p3',
    shop_id: 'S001',
    category_id: 'c1',
    category_ids: ['c1'],
    name: '日式極簡陶瓷碗盤 10件組',
    description: '手工上釉，質感細膩。微波爐、洗碗機皆可用。',
    images: ['https://picsum.photos/id/20/600/600'],
    price: 890,
    original_price: 1580,
    status: 'OPEN',
    product_type: 'PHYSICAL',
    variants: [{ name: '星空灰', price: 0, stock: 40 }],
    shipping_rules: [{ name: '7-11', fee: 60, free_threshold: 1000 }, { name: '宅配', fee: 120, free_threshold: 2000 }],
    end_time: new Date(Date.now() + 86400000 * 5).toISOString(),
    target_amount: 20000,
    current_amount: 18500,
    total_stock: 40,
    is_pinned: true
  },
  {
    id: 'p4',
    shop_id: 'S001',
    category_id: 'c4',
    category_ids: ['c4'],
    name: '【電子檔】2024 高效能手帳模板 PDF',
    description: '此為電子商品，購買後可直接下載 PDF 檔案，適用於 GoodNotes、Notability 等筆記軟體。不需運費，確認付款後即可下載。',
    images: ['https://picsum.photos/id/180/600/600', 'https://picsum.photos/id/100/600/600'],
    price: 199,
    original_price: 399,
    status: 'OPEN',
    product_type: 'DIGITAL',
    digital_files: ['Mock_Planner_2024.pdf', 'Stickers_Pack.zip'],
    variants: [{ name: '數位下載版', price: 0, stock: 9999 }],
    shipping_rules: [], // 電子商品無運費規則
    end_time: new Date(Date.now() + 86400000 * 30).toISOString(),
    target_amount: 5000,
    current_amount: 1000,
    total_stock: 9999,
    is_pinned: false
  }
];
