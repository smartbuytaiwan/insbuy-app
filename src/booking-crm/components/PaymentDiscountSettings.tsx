import React, { useState } from 'react';

interface Props {
  shopId: string;
}

export default function PaymentDiscountSettings({ shopId }: Props) {
  // 模擬設定狀態 (未來可串接 API)
  const [settings, setSettings] = useState({
    enableDeposit: true,
    defaultDepositAmount: 500,
    enableWallet: true,
    enableCoupon: false,
  });

  const handleToggle = (field: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSave = () => {
    alert('金流與折抵設定已成功儲存！');
    // TODO: 串接 API 儲存至資料庫
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h3 className="text-lg font-black text-slate-800 mb-6 border-l-4 border-purple-500 pl-3">預約收款與訂金設定</h3>
        
        <div className="space-y-6">
          {/* 訂金開關 */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
            <div>
              <h4 className="font-bold text-slate-800 text-sm">啟用預約訂金制</h4>
              <p className="text-xs text-slate-500 mt-1">開啟後，顧客預約需支付訂金才能保留時段，防範惡意放鳥。</p>
            </div>
            <button 
              onClick={() => handleToggle('enableDeposit')}
              className={`w-12 h-6 rounded-full relative transition-colors ${settings.enableDeposit ? 'bg-purple-600' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.enableDeposit ? 'translate-x-7' : 'translate-x-1'}`}></div>
            </button>
          </div>

          {/* 預設訂金金額 (當開關打開時顯示) */}
          {settings.enableDeposit && (
            <div className="pl-4 pr-4 py-2 flex items-center gap-4 animate-fade-in">
              <label className="text-sm font-bold text-slate-700 w-32">全店預設訂金金額</label>
              <div className="relative flex-1 max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                <input 
                  type="number" 
                  value={settings.defaultDepositAmount}
                  onChange={(e) => setSettings({...settings, defaultDepositAmount: Number(e.target.value)})}
                  className="w-full h-10 pl-8 pr-4 border border-slate-200 rounded-lg outline-none focus:border-purple-500 transition font-bold text-slate-700"
                />
              </div>
              <span className="text-xs text-slate-400">*(個別服務可在「服務與項目」中獨立設定覆蓋此金額)</span>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <h3 className="text-lg font-black text-slate-800 mb-6 border-l-4 border-orange-500 pl-3">行銷折抵工具設定</h3>
        
        <div className="space-y-4">
          {/* 儲值金開關 */}
          <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600"><i className="fa-solid fa-wallet"></i></div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">開放儲值金折抵 (Wallet)</h4>
                <p className="text-xs text-slate-500 mt-0.5">允許顧客在結帳時使用帳戶內的儲值金餘額扣抵消費。</p>
              </div>
            </div>
            <button 
              onClick={() => handleToggle('enableWallet')}
              className={`w-12 h-6 rounded-full relative transition-colors ${settings.enableWallet ? 'bg-orange-500' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.enableWallet ? 'translate-x-7' : 'translate-x-1'}`}></div>
            </button>
          </div>

          {/* 優惠券開關 */}
          <div className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-500"><i className="fa-solid fa-ticket"></i></div>
              <div>
                <h4 className="font-bold text-slate-800 text-sm">啟用優惠券系統 (Coupon)</h4>
                <p className="text-xs text-slate-500 mt-0.5">開啟後，結帳流程將顯示「使用優惠券」欄位讓顧客輸入折扣碼。</p>
              </div>
            </div>
            <button 
              onClick={() => handleToggle('enableCoupon')}
              className={`w-12 h-6 rounded-full relative transition-colors ${settings.enableCoupon ? 'bg-red-500' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.enableCoupon ? 'translate-x-7' : 'translate-x-1'}`}></div>
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSave}
          className="px-8 py-3 bg-purple-600 text-white font-black rounded-xl shadow-md hover:bg-purple-700 transition"
        >
          儲存所有設定
        </button>
      </div>
    </div>
  );
}