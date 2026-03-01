import React, { useState, useEffect, useRef } from 'react';
import { Product, Category, ShippingRule, ProductVariant } from '../types';
import API from '../api';
import { TAIWAN_BANKS, COMMON_ORIGINS, TAIWAN_DISTRICTS, SHIPPING_PRESETS, PAYMENT_OPTIONS } from '../constants';

interface AdminProductFormProps {
    shopId: string;
    sellerConfig: any;
    products: Product[];
    onUpdateProducts: (products: Product[]) => void;
    systemCategories: Category[];
    categories: Category[];
    form: Partial<Product>;
    setForm: React.Dispatch<React.SetStateAction<Partial<Product>>>;
    editingId: string | null;
    setEditingId: React.Dispatch<React.SetStateAction<string | null>>;
    getInitialForm: () => Partial<Product>;
    setActiveTab: React.Dispatch<React.SetStateAction<any>>;
    setShowMobileMenu: React.Dispatch<React.SetStateAction<boolean>>;
    setGlobalSearchId: React.Dispatch<React.SetStateAction<string>>;
    setCropModal: React.Dispatch<React.SetStateAction<{ isOpen: boolean, src: string, editIndex: number | null }>>;
}

const AdminProductForm: React.FC<AdminProductFormProps> = ({
    shopId, sellerConfig, products, onUpdateProducts, systemCategories, categories,
    form, setForm, editingId, setEditingId, getInitialForm, setActiveTab, setShowMobileMenu, setGlobalSearchId, setCropModal
}) => {
    // === 表單專屬的 Local State ===
    const [drafts, setDrafts] = useState<{id:string, name:string, text:string}[]>(() => {
        try { return JSON.parse(localStorage.getItem('insbuy_desc_drafts') || '[]'); } catch { return []; }
    });
    const [selectedDraftId, setSelectedDraftId] = useState<string>('');
    const [seoInputValue, setSeoInputValue] = useState('');
    const [saveBank, setSaveBank] = useState(!!localStorage.getItem('insbuy_saved_bank'));
    const [isCustomBank, setIsCustomBank] = useState(false);
    const [selectedMainCat, setSelectedMainCat] = useState<string>('');
    const [selectedSubCat, setSelectedSubCat] = useState<string>('');
    const [selectedShopMainCat, setSelectedShopMainCat] = useState<string>('');
    const [selectedShopSubCat, setSelectedShopSubCat] = useState<string>('');
    const [originSelect, setOriginSelect] = useState('台北市');
    const [originDistrictSelect, setOriginDistrictSelect] = useState('');
    const [originManual, setOriginManual] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // === 初始化與重置邏輯 ===
    useEffect(() => {
        if (!editingId) {
            setSeoInputValue('');
            // 恢復未儲存的表單草稿 (Issue 2: 解決跳走後按上一頁資料遺失)
            const autoDraft = sessionStorage.getItem('insbuy_new_product_draft');
            if (autoDraft) {
                try {
                    const parsedDraft = JSON.parse(autoDraft);
                    if (Object.keys(parsedDraft).length > 0) {
                        setForm(prev => ({ ...prev, ...parsedDraft }));
                        if (parsedDraft.keywords) setSeoInputValue(parsedDraft.keywords.join(', '));
                        if (parsedDraft.shipping_origin) {
                            if (parsedDraft.shipping_origin.includes('市') || parsedDraft.shipping_origin.includes('縣')) {
                                setOriginSelect(parsedDraft.shipping_origin.substring(0, 3));
                                setOriginDistrictSelect(parsedDraft.shipping_origin.substring(3));
                            } else {
                                setOriginSelect('手動填寫');
                                setOriginManual(parsedDraft.shipping_origin);
                            }
                        }
                    }
                } catch (e) { console.error('Draft parsing error', e); }
            }
            setOriginSelect('台北市');
            setOriginDistrictSelect('');
            setOriginManual('');
            setSelectedDraftId('');
            setIsCustomBank(false);
        } else {
            const p = products.find(i => i.id === editingId);
            if(p) setSeoInputValue(p.keywords?.join(', ') || '');
        }
    }, [editingId, products]);

    // 自動儲存草稿 (Issue 2: 解決跳走後按上一頁資料遺失)
    useEffect(() => {
        if (!editingId && form && Object.keys(form).length > 0) {
            sessionStorage.setItem('insbuy_new_product_draft', JSON.stringify(form));
        }
    }, [form, editingId]);

    const resetForm = () => {
        sessionStorage.removeItem('insbuy_new_product_draft'); // 取消或重置時清空草稿
        setForm(getInitialForm());
        setEditingId(null);
        setGlobalSearchId(''); 
        setActiveTab('products'); 
        setShowMobileMenu(false); 
    };

    // === 表單操作函式 ===
    const handleSaveDraft = () => {
        if(!form.description?.trim()) return alert('請先在商品描述框內填寫內容，才能儲存為草稿！');
        if(drafts.length >= sellerConfig.max_drafts) return alert(`會員等級限制：\n您最多只能儲存 ${sellerConfig.max_drafts} 組草稿。\n請先刪除舊草稿或升級會員等級！`);
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

    const addVariant = () => {
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
            if (file.size > 1024 * 1024) {
                alert(`圖片 ${file.name} 超過 1MB，系統將自動為您調整至 1MB 以下！`);
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        let width = img.width; let height = img.height;
                        const MAX_DIMENSION = 1200;
                        if (width > height && width > MAX_DIMENSION) { height *= MAX_DIMENSION / width; width = MAX_DIMENSION; }
                        else if (height > MAX_DIMENSION) { width *= MAX_DIMENSION / height; height = MAX_DIMENSION; }
                        canvas.width = width; canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(img, 0, 0, width, height);
                            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
                            setCropModal({ isOpen: true, src: compressedDataUrl, editIndex: null });
                        }
                        if (fileInputRef.current) fileInputRef.current.value = '';
                    };
                    img.src = event.target?.result as string;
                };
                reader.readAsDataURL(file);
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

    const handleAddCategoryTag = (source: 'SYSTEM' | 'SHOP') => {
        let targetId = '';
        if (source === 'SYSTEM') {
            targetId = selectedSubCat || selectedMainCat;
            if (!targetId) return;
            setSelectedSubCat(''); setSelectedMainCat('');
        } else {
            targetId = selectedShopSubCat || selectedShopMainCat;
            if (!targetId) return;
            setSelectedShopSubCat(''); setSelectedShopMainCat('');
        }
        if (!form.category_ids?.includes(targetId)) {
            setForm(prev => ({ ...prev, category_ids: [...(prev.category_ids || []), targetId] }));
        }
    };

    const removeCategoryTag = (idToRemove: string) => {
        setForm(prev => ({ ...prev, category_ids: prev.category_ids?.filter(id => id !== idToRemove) }));
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

        if (saveBank && form.bank_info) localStorage.setItem('insbuy_saved_bank', JSON.stringify(form.bank_info));
        else if (!saveBank) localStorage.removeItem('insbuy_saved_bank');

        let finalOrigin = originSelect;
        if (originSelect === '手動填寫') finalOrigin = originManual;
        else if (originDistrictSelect) finalOrigin = `${originSelect}${originDistrictSelect}`;

        const productData: Product = {
            ...getInitialForm(), ...form, shipping_origin: finalOrigin, 
            id: editingId || `p-${Date.now()}`, shop_id: shopId, category_id: form.category_ids?.[0] || '',
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
            sessionStorage.removeItem('insbuy_new_product_draft'); // 成功發布後清除草稿
            resetForm();
            alert(editingId ? '商品修改成功！' : '商品已成功發布！');
        } catch (error) {
            alert('儲存失敗，請檢查網路或系統連線。');
        }
    };

    return (
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
                        
                        <div className="md:col-span-2 bg-orange-50/50 p-5 rounded-2xl border border-orange-100 mt-2">
                            <label className={`flex items-center gap-2 w-fit mb-4 ${sellerConfig.can_use_preorder ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                               onClick={(e) => {
                                   if (!sellerConfig.can_use_preorder) { e.preventDefault(); alert('會員等級限制：\n您目前的會員等級無法使用「商品預購模式」。\n請升級會員解鎖此功能！'); }
                               }}>
                                <input type="checkbox" checked={(form as any).is_preorder || false} onChange={e => { if (sellerConfig.can_use_preorder) { setForm({...form, is_preorder: e.target.checked} as any); } }} className={`w-5 h-5 accent-[#EE4D2D] ${!sellerConfig.can_use_preorder && 'pointer-events-none'}`} />
                                <span className="text-sm font-black text-[#EE4D2D]"><i className="fa-solid fa-fire mr-1"></i> 開啟商品預購模式 {!sellerConfig.can_use_preorder && '(會員等級限制)'}</span>
                            </label>
                            {(form as any).is_preorder && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up">
                                    <div><label className="text-xs font-bold text-slate-600 mb-2 block">預購結束日期</label><input type="date" className="w-full h-12 border border-orange-200 rounded-xl px-4 text-sm outline-none focus:border-[#EE4D2D] bg-white" value={(form as any).preorder_end_date || ''} onChange={e => setForm({...form, preorder_end_date: e.target.value} as any)} /></div>
                                    <div><label className="text-xs font-bold text-slate-600 mb-2 block">預計到貨日期</label><input type="date" className="w-full h-12 border border-orange-200 rounded-xl px-4 text-sm outline-none focus:border-[#EE4D2D] bg-white" value={(form as any).preorder_arrival_date || ''} onChange={e => setForm({...form, preorder_arrival_date: e.target.value} as any)} /></div>
                                </div>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-slate-500 mb-2 block">商品描述</label>
                            <textarea className="w-full h-40 border border-slate-200 rounded-2xl p-5 text-sm outline-none focus:border-[#EE4D2D] resize-none" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="詳細介紹您的商品特色、尺寸、材質等資訊..."></textarea>
                            
                            <div className="mt-3 flex flex-col md:flex-row items-start md:items-center gap-3 bg-slate-50 p-3 md:p-4 rounded-xl border border-slate-100">
                               <button onClick={handleSaveDraft} className="w-full md:w-auto text-sm bg-slate-800 text-white h-12 px-4 rounded-xl hover:bg-slate-700 transition font-bold shadow-sm whitespace-nowrap shrink-0"><i className="fa-solid fa-save mr-1"></i>存為草稿</button>
                               <div className="w-full md:flex-1 flex gap-2 items-center">
                                   <select className="flex-1 h-12 px-4 border border-slate-200 rounded-xl text-base outline-none focus:border-[#EE4D2D] bg-white cursor-pointer min-w-0 font-bold text-slate-700" value={selectedDraftId} onChange={e => setSelectedDraftId(e.target.value)}>
                                       <option value="" disabled hidden className="text-base">-- 選擇已儲存的草稿 --</option>
                                       {drafts.length === 0 && <option value="none" disabled className="text-base">尚未建立草稿</option>}
                                       {drafts.map(d => <option key={d.id} value={d.id} className="text-base">{d.name}</option>)}
                                   </select>
                                   <button onClick={() => { if(selectedDraftId) applyDraft(selectedDraftId); else alert('請先選擇草稿'); }} className="text-sm bg-blue-50 text-blue-600 h-12 px-4 rounded-xl font-bold hover:bg-blue-100 transition shrink-0 border border-blue-100 shadow-sm">帶入</button>
                                   <button onClick={() => { if(selectedDraftId) { deleteDraft(selectedDraftId); setSelectedDraftId(''); } else alert('請先選擇草稿'); }} className="text-sm bg-red-50 text-red-500 h-12 px-4 rounded-xl font-bold hover:bg-red-100 transition shrink-0 border border-red-100 shadow-sm">刪除</button>
                               </div>
                            </div>
                        </div>
                        
                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-slate-500 mb-2 block">商品圖片 (最多可上傳多張圖片，建議 1:1 比例) <span className="text-[#EE4D2D]">(單張限制 1MB)</span></label>
                            <div className="flex flex-wrap gap-4">
                                {form.images?.map((img, i) => (
                                <div key={i} className="w-24 h-24 border rounded-xl overflow-hidden relative group bg-slate-100 cursor-pointer" onClick={() => setCropModal({ isOpen: true, src: img, editIndex: i })}>
                                    <img src={img} className="w-full h-full object-cover group-hover:opacity-80 transition" alt="Product" />
                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20"><i className="fa-solid fa-pen text-white drop-shadow-md"></i></div>
                                    <button onClick={(e) => { e.stopPropagation(); const newImgs = [...(form.images || [])]; newImgs.splice(i, 1); setForm({...form, images: newImgs}); }} className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-500 transition-all"><i className="fa-solid fa-xmark text-xs"></i></button>
                                </div>
                                ))}
                                {(form.images?.length || 0) < sellerConfig.max_images_per_product && (
                                    <button onClick={() => fileInputRef.current?.click()} className="w-24 h-24 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-[#EE4D2D] hover:text-[#EE4D2D] gap-1 hover:bg-orange-50 transition shrink-0">
                                        <i className="fa-solid fa-crop-simple text-xl"></i><span className="text-[10px] text-center font-bold">新增/裁切<br/>圖片</span>
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleMediaUpload} />
                                    </button>
                                )}
                                {(form.images?.length || 0) >= sellerConfig.max_images_per_product && (
                                    <div className="w-24 h-24 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-300 gap-1 bg-slate-50 cursor-not-allowed shrink-0" title="已達圖片數量上限">
                                        <i className="fa-solid fa-lock text-lg"></i><span className="text-[10px] text-center font-bold text-slate-400">已達數量上限<br/>(共{sellerConfig.max_images_per_product}張)</span>
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
                                        {cName} <button onClick={() => removeCategoryTag(id)} className="hover:text-red-600 bg-red-50 rounded-full w-4 h-4 flex items-center justify-center"><i className="fa-solid fa-xmark text-[10px]"></i></button>
                                    </span>
                                );
                            })}
                            {(!form.category_ids || form.category_ids.length === 0) && <span className="text-xs text-slate-400 italic">尚未選擇分類</span>}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200">
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-600"><i className="fa-solid fa-sitemap mr-1"></i> 加入全站共同分類</label>
                                <div className="flex flex-col gap-3">
                                    <select className="w-full h-12 px-4 border border-slate-200 rounded-xl text-base font-bold text-slate-700 outline-none focus:border-[#EE4D2D] bg-white cursor-pointer appearance-none" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }} value={selectedMainCat} onChange={e => { setSelectedMainCat(e.target.value); setSelectedSubCat(''); }}>
                                        <option value="" className="text-base text-slate-500">選擇主分類...</option>
                                        {(!systemCategories || systemCategories.filter(c => !c.parent_id).length === 0) && <option value="empty" disabled className="text-base text-slate-400">目前尚無分類，請先建立</option>}
                                        {systemCategories && systemCategories.filter(c => !c.parent_id).map(c => <option key={c.id} value={c.id} className="text-base text-slate-700">{c.name}</option>)}
                                    </select>
                                    {selectedMainCat && (
                                        <select className="w-full h-12 px-4 border border-slate-200 rounded-xl text-base font-bold text-slate-700 outline-none focus:border-[#EE4D2D] bg-white cursor-pointer" value={selectedSubCat} onChange={e => setSelectedSubCat(e.target.value)}>
                                            <option value="" className="text-base">選擇子分類 (選填)...</option>
                                            {systemCategories?.filter(c => c.parent_id === selectedMainCat).map(c => <option key={c.id} value={c.id} className="text-base">{c.name}</option>)}
                                        </select>
                                    )}
                                    <button onClick={() => handleAddCategoryTag('SYSTEM')} disabled={!selectedMainCat} className="w-full h-12 bg-slate-800 text-white rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-slate-700 transition">新增系統分類標籤</button>
                                </div>
                            </div>
                            
                            <div className="space-y-3">
                                <label className="text-xs font-bold text-slate-600"><i className="fa-solid fa-store mr-1"></i> 加入本店自訂分類</label>
                                <div className="flex flex-col gap-3">
                                    <select className="w-full h-12 px-4 border border-slate-200 rounded-xl text-base font-bold text-slate-700 outline-none focus:border-[#EE4D2D] bg-white cursor-pointer appearance-none" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }} value={selectedShopMainCat} onChange={e => { setSelectedShopMainCat(e.target.value); setSelectedShopSubCat(''); }}>
                                        <option value="" className="text-base text-slate-500">選擇主分類...</option>
                                        {(!categories || categories.filter(c => !c.parent_id).length === 0) && <option value="empty" disabled className="text-base text-slate-400">目前尚無分類，請先建立</option>}
                                        {categories && categories.filter(c => !c.parent_id).map(c => <option key={c.id} value={c.id} className="text-base text-slate-700">{c.name}</option>)}
                                    </select>
                                    {selectedShopMainCat && (
                                        <select className="w-full h-12 px-4 border border-slate-200 rounded-xl text-base font-bold text-slate-700 outline-none focus:border-[#EE4D2D] bg-white cursor-pointer" value={selectedShopSubCat} onChange={e => setSelectedShopSubCat(e.target.value)}>
                                            <option value="" className="text-base">選擇子分類 (選填)...</option>
                                            {categories?.filter(c => c.parent_id === selectedShopMainCat).map(c => <option key={c.id} value={c.id} className="text-base">{c.name}</option>)}
                                        </select>
                                    )}
                                    <button onClick={() => handleAddCategoryTag('SHOP')} disabled={!selectedShopMainCat} className="w-full h-12 bg-slate-800 text-white rounded-xl text-sm font-bold disabled:opacity-50 hover:bg-slate-700 transition">新增商店分類標籤</button>
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
                                <div className="w-full md:flex-1"><label className="text-xs font-bold text-slate-500 mb-1 block">規格名稱 (如: 紅色 M)</label><input type="text" className="w-full border border-slate-200 rounded-lg p-3 text-sm md:text-base font-bold text-slate-700 outline-none focus:border-[#EE4D2D]" value={v.name} onChange={e => updateVariant(i, 'name', e.target.value)} /></div>
                                <div className="w-full md:flex-1">
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">附加價格 (+NT$)</label>
                                    {/* ★ 核心修復：使用 string 型別並過濾首位 0 */}
                                    <input type="number" className="w-full border border-slate-200 rounded-lg p-3 text-sm md:text-base font-bold text-slate-700 outline-none focus:border-[#EE4D2D]" value={v.price.toString() === '0' && v.price !== 0 ? '' : v.price.toString().replace(/^0+/, '') || '0'} onChange={e => updateVariant(i, 'price', e.target.value === '' ? 0 : parseInt(e.target.value, 10))} onFocus={e => e.target.select()} />
                                </div>
                                <div className="w-full md:flex-1">
                                    <label className="text-xs font-bold text-slate-500 mb-1 block">庫存數量</label>
                                    {/* ★ 核心修復：使用 string 型別並過濾首位 0 */}
                                    <input type="number" className="w-full border border-slate-200 rounded-lg p-3 text-sm md:text-base font-bold text-slate-700 outline-none focus:border-[#EE4D2D]" value={v.stock.toString() === '0' && v.stock !== 0 ? '' : v.stock.toString().replace(/^0+/, '') || '0'} onChange={e => updateVariant(i, 'stock', e.target.value === '' ? 0 : parseInt(e.target.value, 10))} onFocus={e => e.target.select()} />
                                </div>
                                {form.variants && form.variants.length > 1 && <button onClick={() => removeVariant(i)} className="absolute top-2 right-2 md:static md:w-auto p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><i className="fa-solid fa-trash-can text-lg"></i></button>}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Step 4. 運送與付款設定 */}
                <section className="space-y-6">
                    <div className="text-sm font-black text-[#EE4D2D] uppercase tracking-widest border-b pb-2">Step 4. 運送與付款設定</div>
                    <div className="grid grid-cols-1 gap-8">
                        <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><i className="fa-solid fa-truck text-[#EE4D2D]"></i> 提供買家的運送方式</label>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {SHIPPING_PRESETS.map(preset => <button key={preset.name} onClick={() => addShippingRule(preset.name)} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-3 py-1.5 rounded-full transition">+ {preset.name}</button>)}
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
                                            <div><label className="text-[10px] text-slate-500 font-bold mb-1 block">單趟運費</label><div className="flex items-center gap-2"><span className="text-xs text-slate-500 font-bold">$</span><input type="number" className="flex-1 border border-slate-200 rounded-lg p-2 text-sm" value={rule.fee === undefined ? '' : rule.fee} onChange={e => updateShippingRule(i, 'fee', e.target.value === '' ? '' : parseInt(e.target.value))} placeholder="金額" /></div></div>
                                            <div><label className="text-[10px] text-slate-500 font-bold mb-1 block">每滿幾件加收一次運費</label><input type="number" className="w-full border border-slate-200 rounded-lg p-2 text-sm" value={rule.limit_qty === 0 ? '' : rule.limit_qty} onChange={e => updateShippingRule(i, 'limit_qty', e.target.value === '' ? 0 : parseInt(e.target.value))} placeholder="例: 4 (留空=不限)" /></div>
                                            <div><label className="text-[10px] text-slate-500 font-bold mb-1 block">滿多少金額免運</label><div className="flex items-center gap-2"><span className="text-xs text-slate-500 font-bold">$</span><input type="number" className="flex-1 border border-slate-200 rounded-lg p-2 text-sm" value={rule.free_threshold === 0 ? '' : rule.free_threshold} onChange={e => updateShippingRule(i, 'free_threshold', e.target.value === '' ? 0 : parseInt(e.target.value))} placeholder="例: 1000 (留空=無)" /></div></div>
                                        </div>
                                        {/* ★ 新增：面交/自取的 Google 日曆連動設定 */}
                                        {(rule.name.includes('面交') || rule.name.includes('自取')) && (
                                            <div className="mt-3 pt-3 border-t border-slate-200 flex flex-col md:flex-row gap-4 items-center bg-white p-3 rounded-lg shadow-sm">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input type="checkbox" className="w-4 h-4 accent-[#EE4D2D]" checked={rule.sync_calendar || false} onChange={e => updateShippingRule(i, 'sync_calendar', e.target.checked)} />
                                                    <span className="text-xs font-bold text-slate-700"><i className="fa-regular fa-calendar-plus text-blue-500 mr-1"></i>買家下單時須選擇時間 (同步至我的日曆)</span>
                                                </label>
                                                {rule.sync_calendar && (
                                                    <div className="flex items-center gap-2 w-full md:w-auto">
                                                        <span className="text-sm font-bold text-slate-600">面交前</span>
                                                        <select className="h-10 px-3 border border-slate-200 rounded-lg text-base outline-none font-bold text-slate-700 bg-white cursor-pointer" value={rule.reminder_minutes || 60} onChange={e => updateShippingRule(i, 'reminder_minutes', parseInt(e.target.value))}>
                                                            <option value={30} className="text-base">30 分鐘</option>
                                                            <option value={60} className="text-base">1 小時</option>
                                                            <option value={120} className="text-base">2 小時</option>
                                                            <option value={1440} className="text-base">1 天前</option>
                                                        </select>
                                                        <span className="text-sm font-bold text-slate-600">提醒我</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {(!form.shipping_rules || form.shipping_rules.length === 0) && <div className="text-xs text-red-500 font-bold p-3 bg-red-50 rounded-lg">請至少新增一種運送方式！</div>}
                            </div>
                        </div>

                        <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><i className="fa-solid fa-credit-card text-[#EE4D2D]"></i> 支援的付款方式</label>
                            <div className="flex flex-wrap gap-4">
                                {PAYMENT_OPTIONS.map(opt => (
                                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 hover:border-[#EE4D2D] transition">
                                        <input type="checkbox" className="w-4 h-4 accent-[#EE4D2D]" checked={form.payment_methods?.includes(opt.value)}
                                            onChange={(e) => {
                                                if (e.target.checked) setForm({...form, payment_methods: [...(form.payment_methods || []), opt.value]});
                                                else setForm({...form, payment_methods: form.payment_methods?.filter(m => m !== opt.value)});
                                            }}
                                        /><span className="text-sm font-bold text-slate-700">{opt.label}</span>
                                    </label>
                                ))}
                            </div>
                            
                            {form.payment_methods?.includes('BANK') && (
                                <div className="mt-4 p-5 border border-[#EE4D2D] bg-orange-50/30 rounded-2xl space-y-4 animate-fade-in">
                                    <div className="text-sm font-black text-[#EE4D2D]">銀行匯款帳戶設定</div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs font-bold text-slate-600 block mb-1">收款銀行</label>
                                            {isCustomBank ? (
                                                <div className="flex gap-2 items-center">
                                                    <input type="text" className="w-20 h-12 px-4 border border-slate-200 rounded-xl text-base font-bold text-slate-700 outline-none focus:border-[#EE4D2D]" placeholder="代碼" value={form.bank_info?.bank_code} onChange={e => setForm({...form, bank_info: {...form.bank_info!, bank_code: e.target.value}})} />
                                                    <input type="text" className="flex-1 h-12 px-4 border border-slate-200 rounded-xl text-base font-bold text-slate-700 outline-none focus:border-[#EE4D2D]" placeholder="自訂銀行名稱" value={form.bank_info?.bank_name} onChange={e => setForm({...form, bank_info: {...form.bank_info!, bank_name: e.target.value}})} />
                                                    <button onClick={() => setIsCustomBank(false)} className="text-sm font-bold text-blue-500 hover:underline shrink-0 p-2">返回選單</button>
                                                </div>
                                            ) : (
                                                <select className="w-full h-12 px-4 border border-slate-200 rounded-xl text-base font-bold text-slate-700 outline-none focus:border-[#EE4D2D] bg-white cursor-pointer" value={form.bank_info?.bank_code} onChange={e => {
                                                    if(e.target.value === 'custom') { setIsCustomBank(true); return; }
                                                    const bank = TAIWAN_BANKS.find(b => b.code === e.target.value);
                                                    if(bank) setForm({...form, bank_info: {...form.bank_info!, bank_code: bank.code, bank_name: bank.name}});
                                                }}>
                                                    {TAIWAN_BANKS.map(b => <option key={b.code} value={b.code} className="text-base">{b.code} - {b.name}</option>)}
                                                    <option value="custom" className="text-base">+ 其他銀行 (手動輸入)</option>
                                                </select>
                                            )}
                                        </div>
                                        <div><label className="text-xs font-bold text-slate-600 block mb-1">戶名</label><input type="text" className="w-full h-12 px-4 border border-slate-200 rounded-xl text-base font-bold text-slate-700 outline-none focus:border-[#EE4D2D]" value={form.bank_info?.account_name} onChange={e => setForm({...form, bank_info: {...form.bank_info!, account_name: e.target.value}})} placeholder="請輸入戶名" /></div>
                                        <div className="md:col-span-2"><label className="text-xs font-bold text-slate-600 block mb-1">匯款帳號</label><input type="text" className="w-full h-12 px-4 border border-slate-200 rounded-xl text-base font-bold text-slate-700 outline-none focus:border-[#EE4D2D] font-mono tracking-widest" value={form.bank_info?.account_number} onChange={e => setForm({...form, bank_info: {...form.bank_info!, account_number: e.target.value.replace(/\D/g, '')}})} placeholder="請輸入純數字帳號" /></div>
                                    </div>
                                    <label className="flex items-center gap-2 mt-2 cursor-pointer w-fit"><input type="checkbox" checked={saveBank} onChange={e => setSaveBank(e.target.checked)} className="w-4 h-4 accent-[#EE4D2D]" /><span className="text-xs font-bold text-slate-600">記住此帳號作為未來預設收款帳戶</span></label>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Step 5. 其他進階設定 */}
                <section className="space-y-6">
                    <div className="text-sm font-black text-[#EE4D2D] uppercase tracking-widest border-b pb-2">Step 5. 其他進階設定 (選填)</div>
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-6">
                        <div>
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><i className="fa-solid fa-clipboard-question text-blue-500"></i> 結帳前填寫表單</label>
                                <button onClick={addQuestion} className="text-blue-500 text-xs font-bold bg-blue-100 px-3 py-1 rounded-full hover:bg-blue-200 transition">+ 新增問題</button>
                            </div>
                            <div className="space-y-3">
                                {form.questions?.map((q, i) => (
                                    <div key={i} className="flex gap-3 items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                                        <input type="text" className="flex-1 border-none bg-transparent text-sm outline-none" value={q.title} onChange={e => updateQuestion(i, 'title', e.target.value)} placeholder="例如：您的 IG 帳號？" />
                                        <label className="flex items-center gap-1 text-xs text-slate-500 cursor-pointer border-l pl-3"><input type="checkbox" checked={q.required} onChange={e => updateQuestion(i, 'required', e.target.checked)} className="accent-blue-500" />必填</label>
                                        <button onClick={() => removeQuestion(i)} className="text-red-400 hover:text-red-600 px-2"><i className="fa-solid fa-xmark"></i></button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-200 pt-6">
                            <div>
                                <label className="text-xs font-bold text-slate-600 block mb-2">商品製造產地</label>
                                <select className="w-full h-12 px-4 border border-slate-200 rounded-xl text-base font-bold text-slate-700 outline-none focus:border-[#EE4D2D] bg-white cursor-pointer" value={form.origin || '台灣'} onChange={e => setForm({...form, origin: e.target.value})}>
                                    {COMMON_ORIGINS.map(o => <option key={o} value={o} className="text-base">{o}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-600 block mb-2">商品出貨地</label>
                                <div className="flex gap-2 items-center">
                                    <select className="w-1/2 h-12 px-4 border border-slate-200 rounded-xl text-base font-bold text-slate-700 outline-none focus:border-[#EE4D2D] bg-white cursor-pointer" value={originSelect} onChange={e => { setOriginSelect(e.target.value); setOriginDistrictSelect(''); }}>
                                        {Object.keys(TAIWAN_DISTRICTS).map(city => <option key={city} value={city} className="text-base">{city}</option>)}
                                        <option value="海外" className="text-base">🌍 海外出貨</option><option value="手動填寫" className="text-base">✏️ 手動填寫</option>
                                    </select>
                                    {originSelect !== '手動填寫' && originSelect !== '海外' && (
                                        <select className="w-1/2 h-12 px-4 border border-slate-200 rounded-xl text-base font-bold text-slate-700 outline-none focus:border-[#EE4D2D] bg-white cursor-pointer" value={originDistrictSelect} onChange={e => setOriginDistrictSelect(e.target.value)}>
                                            <option value="" className="text-base">選擇行政區</option>
                                            {TAIWAN_DISTRICTS[originSelect]?.map(dist => <option key={dist} value={dist} className="text-base">{dist}</option>)}
                                        </select>
                                    )}
                                    {(originSelect === '手動填寫' || originSelect === '海外') && (
                                        <input type="text" className="w-1/2 h-12 px-4 border border-slate-200 rounded-xl text-base font-bold text-slate-700 outline-none focus:border-[#EE4D2D] bg-white" value={originManual} onChange={e => setOriginManual(e.target.value)} placeholder="填寫出貨地" />
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-slate-200 pt-6 mb-6">
                            <label className="text-xs font-bold text-slate-600 mb-2 flex justify-between"><span>隱藏銷售 (專屬連結)</span><span className="text-slate-400 font-normal">開啟後將不在賣場顯示，僅能透過專屬連結購買</span></label>
                            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <label className="flex items-center gap-2 cursor-pointer shrink-0">
                                    <input type="checkbox" checked={(form as any).is_hidden || false} onChange={e => setForm({...form, is_hidden: e.target.checked} as any)} className="w-5 h-5 accent-[#EE4D2D]" />
                                    <span className="text-sm font-bold text-slate-700">開啟隱藏銷售</span>
                                </label>
                                {(form as any).is_hidden && (
                                    <div className="w-full flex-1 flex flex-col md:flex-row md:items-center gap-2 border-t md:border-t-0 border-slate-100 pt-3 md:pt-0 mt-1 md:mt-0">
                                        <span className="text-xs font-bold text-slate-500 shrink-0">設定頁面密碼:</span>
                                        <input type="text" className="flex-1 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-[#EE4D2D]" value={(form as any).view_password || ''} onChange={e => setForm({...form, view_password: e.target.value} as any)} placeholder="輸入密碼 (買家需輸入才可查看)" />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-slate-200 pt-6">
                            <label className="text-xs font-bold text-slate-600 mb-2 flex justify-between"><span>SEO 搜尋關鍵字 (用逗號隔開)</span><span className="text-slate-400 font-normal">買家搜尋時更容易找到您的商品</span></label>
                            <input type="text" className="w-full border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-[#EE4D2D] bg-white" value={seoInputValue} onChange={e => { setSeoInputValue(e.target.value); setForm({...form, keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)}); }} placeholder="例如：洋裝, 夏季, 碎花" />
                        </div>
                    </div>
                </section>

                {/* 底部按鈕區 */}
                <div className="flex flex-col md:flex-row gap-4 pt-10 border-t border-slate-200 pb-20"> {/* pb-20 防止手機版被右下角的懸浮按鈕遮擋 */}
                  <button onClick={resetForm} className="w-full md:flex-1 h-14 rounded-2xl font-bold text-slate-500 border-2 border-slate-200 hover:bg-slate-50 transition">取消返回</button>
                  <button onClick={handleSaveProduct} className="w-full md:flex-[2] h-14 primary-gradient text-white rounded-2xl font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-lg">
                      {editingId ? '確認儲存修改' : '確認發布並開始團購'}
                  </button>
                </div>
            </div>
        </div>
    );
};

export default AdminProductForm;
