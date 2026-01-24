
import { Product } from './types';

export const MOCK_PRODUCTS: Product[] = [
  {
    id: 'p1',
    shop_id: 'S001',
    name: '【正韓】極致柔棉保暖居家服 兩件組',
    description: '100% 純棉材質，透氣保暖，適合秋冬居家穿著。多款顏色可選。',
    images: ['https://picsum.photos/id/1/600/600', 'https://picsum.photos/id/2/600/600'],
    price: 590,
    original_price: 1280,
    status: 'OPEN',
    variants: [
      { name: '經典白 M', price: 0, stock: 50 },
      { name: '經典白 L', price: 0, stock: 30 },
      { name: '莫蘭迪藍 M', price: 50, stock: 20 }
    ],
    // Fix: Added missing free_threshold property
    shipping_rules: [{ name: '7-11', fee: 60, free_threshold: 1000 }, { name: '宅配', fee: 100, free_threshold: 2000 }],
    end_time: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days
    target_amount: 10000,
    // Fix: Added missing current_amount property to satisfy Product type requirement
    current_amount: 4500,
    total_stock: 100,
    is_pinned: true,
    questions: [{ title: '備註款式顏色', required: false }]
  },
  {
    id: 'p2',
    shop_id: 'S002',
    name: '多功能氣炸烤箱 24L 大容量',
    description: '健康減油，一機多用。包含烤、炸、烘、乾多種功能。',
    images: ['https://picsum.photos/id/10/600/600'],
    price: 3280,
    original_price: 4990,
    status: 'OPEN',
    variants: [{ name: '珍珠白', price: 0, stock: 15 }, { name: '曜石黑', price: 0, stock: 10 }],
    // Fix: Added missing free_threshold property
    shipping_rules: [{ name: '宅配', fee: 150, free_threshold: 2000 }],
    end_time: new Date(Date.now() + 86400000 * 7).toISOString(),
    target_amount: 50000,
    // Fix: Added missing current_amount property to satisfy Product type requirement
    current_amount: 12500,
    total_stock: 25,
    is_pinned: false
  },
  {
    id: 'p3',
    shop_id: 'S001',
    name: '日式極簡陶瓷碗盤 10件組',
    description: '手工上釉，質感細膩。微波爐、洗碗機皆可用。',
    images: ['https://picsum.photos/id/20/600/600'],
    price: 890,
    original_price: 1580,
    status: 'OPEN',
    variants: [{ name: '星空灰', price: 0, stock: 40 }],
    // Fix: Added missing free_threshold property
    shipping_rules: [{ name: '7-11', fee: 60, free_threshold: 1000 }, { name: '宅配', fee: 120, free_threshold: 2000 }],
    end_time: new Date(Date.now() + 86400000 * 5).toISOString(),
    target_amount: 20000,
    // Fix: Added missing current_amount property to satisfy Product type requirement
    current_amount: 18500,
    total_stock: 40,
    is_pinned: true
  }
];
