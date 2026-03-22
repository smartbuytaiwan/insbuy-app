import React, { useState } from 'react';
import { User } from '../types';
import API from '../api';
import { TAIWAN_BANKS } from '../constants';

interface PaymentSettingsProps {
    currentUser: User;
    onUpdateUser: (user: User) => void;
    siteSettings?: any; // ★ 新增：接收全站設定
}

const PaymentSettings: React.FC<PaymentSettingsProps> = ({ currentUser, onUpdateUser, siteSettings }) => {
    // ★ 讀取全站金流開關狀態
    const isPaymentEnabled = siteSettings?.enable_online_payment ?? true;
    const [settings, setSettings] = useState(currentUser.payment_settings || {
        newebpay_merchant_id: '',
        newebpay_hash_key: '',
        newebpay_hash_iv: '',
        bank_info: { bank_name: '臺灣銀行', bank_code: '004', account_name: '', account_number: '' },
        pickup_address: ''
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updatedUser = await API.updateUser({ ...currentUser, payment_settings: settings });
            onUpdateUser(updatedUser);
            alert('金物流設定已成功儲存！');
        } catch (error) {
            alert('儲存失敗，請檢查網路連線。');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 md:p-8 animate-fade-in">
            <h2 className="text-2xl font-black text-slate-800 mb-8 border-l-4 border-[#EE4D2D] pl-4">
                金物流設定
            </h2>
            <div className="max-w-3xl space-y-8">
                {/* ★ 藍新金流設定 (受管理員開關控制) */}
                {isPaymentEnabled && (
                <section className="bg-slate-50 p-6 rounded-2xl border border-slate-200 animate-fade-in-up">
                    <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <i className="fa-solid fa-credit-card text-blue-500"></i> 藍新金流 (NewebPay) API 串接
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">請填寫您在藍新金流後台取得的商店 API 金鑰，以啟用線上刷卡與貨到付款功能。</p>
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">商店代號 (MerchantID)</label>
                            <input type="text" className="w-full h-12 border border-slate-200 rounded-xl px-4 outline-none focus:border-blue-500 font-mono" value={settings.newebpay_merchant_id || ''} onChange={e => setSettings({...settings, newebpay_merchant_id: e.target.value})} placeholder="例如：MS1234567" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">HashKey</label>
                            <input type="text" className="w-full h-12 border border-slate-200 rounded-xl px-4 outline-none focus:border-blue-500 font-mono" value={settings.newebpay_hash_key || ''} onChange={e => setSettings({...settings, newebpay_hash_key: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">HashIV</label>
                            <input type="text" className="w-full h-12 border border-slate-200 rounded-xl px-4 outline-none focus:border-blue-500 font-mono" value={settings.newebpay_hash_iv || ''} onChange={e => setSettings({...settings, newebpay_hash_iv: e.target.value})} />
                        </div>
                    </div>
                </section>
                )}
                
                {!isPaymentEnabled && (
                    <div className="bg-red-50 text-red-500 p-4 rounded-xl border border-red-100 font-bold text-sm flex items-center gap-2">
                        <i className="fa-solid fa-circle-exclamation"></i>
                        線上金流系統目前由系統管理員關閉維護中，暫時無法設定。
                    </div>
                )}

                {/* 銀行匯款設定 */}
                <section className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <i className="fa-solid fa-building-columns text-emerald-500"></i> 銀行匯款帳戶設定
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">收款銀行</label>
                            <select className="w-full h-12 px-4 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 bg-white" value={settings.bank_info?.bank_code || '004'} onChange={e => {
                                const bank = TAIWAN_BANKS.find(b => b.code === e.target.value);
                                if(bank) setSettings({...settings, bank_info: {...settings.bank_info!, bank_code: bank.code, bank_name: bank.name}});
                            }}>
                                {TAIWAN_BANKS.map(b => <option key={b.code} value={b.code}>{b.code} - {b.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-600 block mb-1">戶名</label>
                            <input type="text" className="w-full h-12 px-4 border border-slate-200 rounded-xl outline-none focus:border-emerald-500" value={settings.bank_info?.account_name || ''} onChange={e => setSettings({...settings, bank_info: {...settings.bank_info!, account_name: e.target.value}})} placeholder="請輸入戶名" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-slate-600 block mb-1">匯款帳號</label>
                            <input type="text" className="w-full h-12 px-4 border border-slate-200 rounded-xl outline-none focus:border-emerald-500 font-mono tracking-widest" value={settings.bank_info?.account_number || ''} onChange={e => setSettings({...settings, bank_info: {...settings.bank_info!, account_number: e.target.value.replace(/\D/g, '')}})} placeholder="請輸入純數字帳號" />
                        </div>
                    </div>
                </section>

                {/* 面交地址設定 */}
                <section className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                    <h3 className="text-lg font-bold text-slate-700 mb-4 flex items-center gap-2">
                        <i className="fa-solid fa-map-location-dot text-orange-500"></i> 面交 / 取貨地址
                    </h3>
                    <div>
                        <label className="text-xs font-bold text-slate-600 block mb-1">詳細地址與取貨說明</label>
                        <textarea className="w-full h-24 border border-slate-200 rounded-xl p-4 outline-none focus:border-orange-500 resize-none" value={settings.pickup_address || ''} onChange={e => setSettings({...settings, pickup_address: e.target.value})} placeholder="例如：台北市信義區XX路XX號 1樓 (到達請按門鈴)..." />
                    </div>
                </section>

                <div className="pt-6 border-t border-slate-200">
                    <button onClick={handleSave} disabled={isSaving} className="w-full h-14 bg-[#EE4D2D] hover:bg-[#d73211] text-white rounded-2xl font-black shadow-lg hover:scale-[1.02] active:scale-95 transition-all text-lg disabled:opacity-50">
                        {isSaving ? '儲存中...' : '確認儲存金物流設定'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentSettings;