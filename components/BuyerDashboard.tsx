
import React from 'react';
import { User, Order } from '../types';

interface BuyerDashboardProps {
  user: User;
  orders: Order[];
}

const BuyerDashboard: React.FC<BuyerDashboardProps> = ({ user, orders }) => {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Profile Header */}
      <div className="bg-white p-6 rounded-md shadow-sm border border-slate-100 flex items-center gap-6">
        <div className="w-20 h-20 bg-[#EE4D2D] text-white rounded-full flex items-center justify-center text-3xl font-bold shadow-md">
          {user.name[0]}
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{user.name}</h2>
          <p className="text-slate-500">{user.phone}</p>
          <div className="mt-2 flex gap-2">
            <span className="bg-[#FFEEEC] text-[#EE4D2D] text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">一般會員</span>
          </div>
        </div>
      </div>

      {/* Orders Section */}
      <div className="bg-white p-6 rounded-md shadow-sm border border-slate-100">
        <h3 className="font-bold text-slate-800 mb-6 border-l-4 border-[#EE4D2D] pl-3">我的訂單紀錄</h3>
        
        {orders.length === 0 ? (
          <div className="text-center py-20 text-slate-400">尚無訂單紀錄</div>
        ) : (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id} className="border border-slate-100 rounded-lg p-4 hover:shadow-md transition">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-xs text-slate-400">
                    <i className="fa-regular fa-clock mr-1"></i> 
                    {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </div>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    order.status === 'PENDING' ? 'bg-orange-100 text-orange-600' : 
                    order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
                  }`}>
                    {order.status === 'PENDING' ? '待處理' : order.status === 'SHIPPED' ? '已出貨' : '已完成'}
                  </span>
                </div>
                
                <div className="space-y-2">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex gap-3 items-center">
                      <img src={item.images[0]} className="w-10 h-10 object-contain bg-white border border-slate-50 rounded" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-slate-700 line-clamp-1">{item.name}</div>
                        <div className="text-[10px] text-slate-400">規格: {item.selectedVariant || '單一'} | 數量: {item.qty}</div>
                      </div>
                      <div className="text-sm font-bold text-slate-800">${item.finalPrice * item.qty}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t flex justify-between items-center">
                  <div className="text-xs text-slate-500">共 {order.items.length} 項商品</div>
                  <div className="font-bold text-[#EE4D2D]">總金額: ${order.total_amount}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BuyerDashboard;
