import React, { useState, useEffect, useRef } from 'react';
import { Product, Category, ShippingRule, ProductVariant } from '../types';
import API from '../api';
import { TAIWAN_BANKS, COMMON_ORIGINS, TAIWAN_DISTRICTS, SHIPPING_PRESETS, PAYMENT_OPTIONS } from '../constants';

interface AdminProductFormProps {
    shopId: string;
    siteSettings?: any;
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
    shopId, siteSettings, sellerConfig, products, onUpdateProducts, systemCategories, categories,
    form, setForm, editingId, setEditingId, getInitialForm, setActiveTab, setShowMobileMenu, setGlobalSearchId, setCropModal
}) => {
    // === 表單專屬的 Local State ===
    const [fullDrafts, setFullDrafts] = useState<{id:string, name:string, data:Partial<Product>}[]>(() => {
        try { return JSON.parse(localStorage.getItem('insbuy_product_drafts') || '[]'); } catch { return []; }
    });
    const [seoInputValue, setSeoInputValue] = useState('');
    const [isHtmlMode, setIsHtmlMode] = useState(false);
    const [selectedMainCat, setSelectedMainCat] = useState<string>('');
    const [selectedSubCat, setSelectedSubCat] = useState<string>('');
    const [selectedShopMainCat, setSelectedShopMainCat] = useState<string>('');
    const [selectedShopSubCat, setSelectedShopSubCat] = useState<string>('');
    const [originSelect, setOriginSelect] = useState('台北市');
    const [originDistrictSelect, setOriginDistrictSelect] = useState('');
    const [originManual, setOriginManual] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ★ 新增：快速發佈、驗證錯誤、草稿彈窗狀態
    const [isQuickPublish, setIsQuickPublish] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);
    const [showDraftModal, setShowDraftModal] = useState(false);

    // ★ 新增：離開提醒與運費預設值狀態
    const [showLeavePrompt, setShowLeavePrompt] = useState(false);
    const [pendingTab, setPendingTab] = useState<string | null>(null); // ★ 用來記憶準備要跳轉的畫面
    const [showPresetModal, setShowPresetModal] = useState(false);
    const [shippingPresets, setShippingPresets] = useState<{fees: number[], qtys: number[], thresholds: number[]}>(() => {
        try { return JSON.parse(localStorage.getItem('insbuy_shipping_presets') || '{"fees":[],"qtys":[],"thresholds":[]}'); }
        catch { return {fees:[], qtys:[], thresholds:[]}; }
    });
    const [presetTemp, setPresetTemp] = useState({...shippingPresets});

    // === 初始化與重置邏輯 ===
    useEffect(() => {
        if (!editingId) {
            setSeoInputValue('');
            // 恢復未儲存的表單草稿
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
            } else {
                // ★ 新增：如果沒有草稿，載入最後一次記憶的運送與付款方式
                try {
                    const rememberedShipping = localStorage.getItem('insbuy_remembered_shipping');
                    const rememberedPayment = localStorage.getItem('insbuy_remembered_payment');
                    if (rememberedShipping || rememberedPayment) {
                        setForm(prev => ({
                            ...prev,
                            ...(rememberedShipping ? { shipping_rules: JSON.parse(rememberedShipping) } : {}),
                            ...(rememberedPayment ? { payment_methods: JSON.parse(rememberedPayment) } : {})
                        }));
                    }
                } catch(e) { console.error('Load remembered settings error', e); }
            }
            setOriginSelect('台北市');
            setOriginDistrictSelect('');
            setOriginManual('');
        } else {
            const p = products.find(i => i.id === editingId);
            if(p) setSeoInputValue(p.keywords?.join(', ') || '');
        }
    }, [editingId, products, setForm]);

    // 自動儲存草稿
    useEffect(() => {
        if (!editingId && form && Object.keys(form).length > 0) {
            sessionStorage.setItem('insbuy_new_product_draft', JSON.stringify(form));
        }
    }, [form, editingId]);

    // ★ 攔截外部 Sidebar 點擊跳轉與瀏覽器關閉
    useEffect(() => {
        const isDirty = !editingId && form && Object.keys(form).length > 0 && (form.name || form.images?.length || form.price);
        
        // 1. 攔截側邊欄 (配合 AdminDashboard 內的修改)
        if (isDirty) {
            (window as any).__insbuy_attempt_leave = (tabId: string) => {
                setPendingTab(tabId);
                setShowLeavePrompt(true);
            };
        } else {
            delete (window as any).__insbuy_attempt_leave;
        }

        // 2. 攔截瀏覽器關閉分頁或重整
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty) {
                e.preventDefault();
                e.returnValue = ''; 
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        
        return () => { 
            delete (window as any).__insbuy_attempt_leave; 
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [form, editingId]);

    const resetForm = () => {
        sessionStorage.removeItem('insbuy_new_product_draft');
        setForm(getInitialForm());
        setEditingId(null);
        setGlobalSearchId(''); 
        setActiveTab('products'); 
        setShowMobileMenu(false); 
    };

    // === 表單操作函式 ===
    const handleSaveFullDraft = (silent = false) => {
        const draftName = form.name?.trim() || prompt('商品名稱尚未填寫，請為這個草稿自訂一個名稱：');
        if(!draftName) {
            if(!silent) alert('必須提供名稱才能儲存草稿！');
            return false;
        }
        if(fullDrafts.length >= sellerConfig.max_drafts) {
            if(!silent) alert(`會員等級限制：您最多只能儲存 ${sellerConfig.max_drafts} 組草稿。請先刪除舊草稿或升級會員等級！`);
            return false;
        }
        
        const newDrafts = [...fullDrafts, { id: Date.now().toString(), name: draftName, data: form }];
        setFullDrafts(newDrafts);
        localStorage.setItem('insbuy_product_drafts', JSON.stringify(newDrafts));
        if(!silent) alert('商品草稿儲存成功！');
        return true;
    };

    // ★ 離開前確認攔截邏輯
    const handleAttemptLeave = () => {
        if (!editingId && form && Object.keys(form).length > 0 && (form.name || form.images?.length || form.price)) {
            setShowLeavePrompt(true);
        } else {
            resetForm();
        }
    };
    
    const handleConfirmLeave = () => {
        setShowLeavePrompt(false);
        resetForm();
        if (pendingTab) setActiveTab(pendingTab);
    };

    const handleLeaveAndSaveDraft = () => {
        const saved = handleSaveFullDraft(true);
        if(saved) {
            setShowLeavePrompt(false);
            resetForm();
            if (pendingTab) setActiveTab(pendingTab);
        }
    };

    const applyFullDraft = (id: string) => {
        const draft = fullDrafts.find(d => d.id === id);
        if(draft) {
            if(confirm(`確定要載入草稿「${draft.name}」嗎？目前的輸入將被覆蓋。`)) {
                setForm(draft.data);
                setShowDraftModal(false);
            }
        }
    };

    const deleteFullDraft = (id: string) => {
        if(confirm('確定要刪除這筆草稿嗎？刪除後無法復原。')) {
            const newDrafts = fullDrafts.filter(d => d.id !== id);
            setFullDrafts(newDrafts);
            localStorage.setItem('insbuy_product_drafts', JSON.stringify(newDrafts));
        }
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
        // ★ 判斷是否為面交/自取，自動帶入 0 元運費
        const isMeetup = name.includes('面交') || name.includes('自取');
        const newRule: ShippingRule = { name, fee: isMeetup ? 0 : ('' as any), free_threshold: 0, limit_qty: 0, pickup_address: '' };
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

    // ★ 新增：自動產生 HTML 範本
    const generateHtmlTemplate = () => {
        // 取第一張圖
        const imgTag = form.images && form.images[0] ? `<img src="${form.images[0]}" alt="${form.name || '商品圖片'}" style="max-width:100%; border-radius:12px; margin-bottom:16px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);" />\n` : '';
        const template = `<div style="font-family: sans-serif; color: #333; line-height: 1.8; max-width: 800px; margin: 0 auto; padding: 20px;">
    ${imgTag}<h2 style="color: #EE4D2D; border-bottom: 2px solid #EE4D2D; padding-bottom: 10px; margin-bottom: 20px; font-weight: 900;">${form.name || '商品名稱'}</h2>
    <div style="background-color: #fff3ed; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <span style="font-size: 1.1em; color: #d94022; font-weight: bold;">限時優惠價：NT$ ${form.price || 0}</span>
    </div>
    <div style="font-size: 1em;">
        <p>這是一件非常棒的商品，擁有以下特色：</p>
        <ul>
            <li>特色一：詳細說明</li>
            <li>特色二：詳細說明</li>
        </ul>
    </div>
</div>`;
        if (form.custom_html && !window.confirm('確定要產生預設範本嗎？這將會完全覆蓋您目前編寫的 HTML 內容！')) return;
        setForm(prev => ({ ...prev, custom_html: template }));
    };

    // ★ 新增：自動擷取 SEO 簡介
    const handleAutoSeoDesc = () => {
        if (!form.description) {
            return alert('請先填寫上方的一般「商品描述」，系統才能為您自動抓取喔！');
        }
        // 去除換行與多餘空白，並擷取前 150 字
        const cleanText = form.description.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        const snippet = cleanText.substring(0, 150);
        setForm(prev => ({ ...prev, seo_description: snippet }));
    };

    const handleSaveProduct = async () => {
        // ★ 新增：必填欄位驗證邏輯與發光提示
        const errors: string[] = [];
        const missingNames: string[] = [];

        if (!form.name?.trim()) { errors.push('name'); missingNames.push('商品名稱'); }
        if (!form.description?.trim() && !form.custom_html?.trim()) { errors.push('description'); missingNames.push('商品描述'); }
        if (!form.images || form.images.length === 0) { errors.push('images'); missingNames.push('商品圖片'); }
        if (!form.shipping_rules || form.shipping_rules.length === 0) { errors.push('shipping_rules'); missingNames.push('提供買家的運送方式'); }
        if (!form.payment_methods || form.payment_methods.length === 0) { errors.push('payment_methods'); missingNames.push('支援的付款方式'); }
        
        if (!form.variants || form.variants.length === 0 || form.variants.some(v => isNaN(v.price) || v.price < 0)) {
            errors.push('variants'); missingNames.push('規格與定價(請確保價格正確)');
        } else if (form.product_type === 'PHYSICAL' && form.shipping_rules && form.shipping_rules.length > 0) {
            if (form.shipping_rules.some(r => r.fee === '' as any || r.fee === undefined || isNaN(r.fee))) {
                errors.push('shipping_rules_fee'); missingNames.push('運送方式的「單趟運費」金額');
            }
        }

        if (errors.length > 0) {
            setValidationErrors(errors);
            alert(`無法發布！請完成以下必填欄位：\n\n${missingNames.map(n => `- ${n}`).join('\n')}`);
            window.scrollTo({ top: 0, behavior: 'smooth' }); // 自動滾動至頂部方便買家查看發光欄位
            return;
        }
        setValidationErrors([]); // 驗證通過，清空錯誤

        // 系統自動判斷最低定價作為主要顯示價格
        const minPrice = Math.min(...form.variants.map(v => v.price));

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

        let finalOrigin = originSelect;
        if (originSelect === '手動填寫') finalOrigin = originManual;
        else if (originDistrictSelect) finalOrigin = `${originSelect}${originDistrictSelect}`;

        const generatedId = editingId || `p-${Date.now()}`;
        let initialLogs: any[] = form.stock_logs || [];
        
        if (!editingId && form.variants) {
            form.variants.forEach((v, idx) => {
                if (v.stock > 0) {
                    const vCost = v.cost || 0;
                    initialLogs.push({
                        id: `log-init-${Date.now()}-${idx}`,
                        variant_name: v.name || '單一規格',
                        change_amount: v.stock,
                        reason: `建立商品初始庫存`,
                        created_at: new Date().toISOString(),
                        unit_cost: vCost
                    });
                }
            });
        }

        const productData: Product = {
            ...getInitialForm(), ...form, price: minPrice, shipping_origin: finalOrigin, 
            id: generatedId, shop_id: shopId, category_id: form.category_ids?.[0] || '',
            total_stock: form.variants?.reduce((sum, v) => sum + v.stock, 0) || 0,
            stock_logs: initialLogs
        } as Product;

        try {
            if (editingId) {
                await API.updateProduct(productData);
                onUpdateProducts(products.map(p => p.id === editingId ? productData : p));
            } else {
                await API.createProduct(productData);
                onUpdateProducts([productData, ...products]);
            }

            // ★ 新增：發佈成功時，記憶本次使用的運送與付款方式
            localStorage.setItem('insbuy_remembered_shipping', JSON.stringify(form.shipping_rules || []));
            localStorage.setItem('insbuy_remembered_payment', JSON.stringify(form.payment_methods || []));

            sessionStorage.removeItem('insbuy_new_product_draft'); // 成功發布後清除草稿
            resetForm();
            alert(editingId ? '商品修改成功！' : '商品已成功發布！');
        } catch (error: any) {
            // ★ 修正：精準捕捉後端傳來的錯誤訊息 (例如 429 速率限制)
            alert(error.response?.data?.message || '儲存失敗，請檢查網路或系統連線。');
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 md:p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="flex items-center gap-4 flex-wrap">
                    <h2 className="text-2xl font-black text-slate-800 border-l-4 border-[#EE4D2D] pl-4">
                       {editingId ? '編輯商品資訊' : '發布新的商品'}
                    </h2>
                    {/* ★ 新增：快速發佈切換按鈕 */}
                    <label className="flex items-center gap-2 cursor-pointer bg-orange-50 px-3 py-1.5 rounded-full border border-orange-200 hover:bg-orange-100 transition shadow-sm">
                        <div className="relative">
                            <input type="checkbox" className="sr-only" checked={isQuickPublish} onChange={e => setIsQuickPublish(e.target.checked)} />
                            <div className={`block w-10 h-6 rounded-full transition-colors ${isQuickPublish ? 'bg-[#EE4D2D]' : 'bg-slate-300'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${isQuickPublish ? 'transform translate-x-4' : ''}`}></div>
                        </div>
                        <span className="text-sm font-black text-[#EE4D2D]"><i className="fa-solid fa-bolt mr-1"></i>快速發佈模式</span>
                    </label>
                </div>
                {!editingId && (
                    <button onClick={() => setShowDraftModal(true)} className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition shadow-sm">
                        <span className="text-sm font-bold text-slate-600"><i className="fa-solid fa-file-pen mr-1"></i>編輯草稿 ({fullDrafts.length})</span>
                    </button>
                )}
            </div>
            <div className="max-w-3xl space-y-10">
                {/* Step 1. 基本資訊 */}
                <section className="space-y-6">
                    <div className="text-sm font-black text-[#EE4D2D] uppercase tracking-widest border-b pb-2">Step 1. 商品基本資訊</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">商品名稱 <span className="text-[#EE4D2D] bg-red-50 px-1.5 py-0.5 rounded text-[10px]">(必填)</span></label>
                            <input
                                type="text" 
                                className={`w-full h-12 border rounded-2xl px-5 text-sm outline-none transition-all ${validationErrors.includes('name') ? 'border-red-500 ring-2 ring-red-200 shadow-[0_0_8px_rgba(239,68,68,0.4)] bg-red-50/30' : 'border-slate-200 focus:border-[#EE4D2D]'}`} 
                                value={form.name || ''} 
                                onChange={e => {
                                    const newName = e.target.value;
                                    setForm(prev => {
                                        const shouldSyncSeoTitle = !prev.seo_title || prev.seo_title === prev.name;
                                        return { 
                                            ...prev, 
                                            name: newName, 
                                            ...(shouldSyncSeoTitle && { seo_title: newName }) 
                                        };
                                    });
                                }} 
                                placeholder="請輸入商品名稱" 
                            />
                        </div>

                        {/* ★ 已整合至 Step 1 的規格區塊 */}
                        <div className={`md:col-span-2 bg-slate-50 p-5 rounded-2xl border transition-all ${validationErrors.includes('variants') ? 'border-red-500 ring-2 ring-red-200 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'border-slate-200'}`}>
                            <div className="flex justify-between items-center mb-4">
                                <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><i className="fa-solid fa-list-ul text-[#EE4D2D]"></i> 規格與定價</label>
                                <button type="button" onClick={addVariant} className="text-[#EE4D2D] text-xs font-bold bg-orange-50 px-3 py-1 rounded-full hover:bg-orange-100 transition"><i className="fa-solid fa-plus mr-1"></i>新增規格</button>
                            </div>
                            <div className="space-y-3">
                                {form.variants?.map((v, i) => (
                                    <div key={i} className="flex flex-col md:flex-row gap-3 items-end bg-white p-4 rounded-xl border border-slate-100 relative shadow-sm">
                                        <div className="w-full md:flex-1"><label className="text-xs font-bold text-slate-500 mb-1 block">規格名稱 (如: 紅色 M)</label><input type="text" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-bold text-slate-700 outline-none focus:border-[#EE4D2D]" value={v.name} onChange={e => updateVariant(i, 'name', e.target.value)} onFocus={(e) => { if(v.name === '單一規格') updateVariant(i, 'name', ''); else e.target.select(); }} onBlur={() => { if(!v.name || v.name.trim() === '') updateVariant(i, 'name', '單一規格'); }} placeholder="單一規格" /></div>
                                        <div className="w-full md:flex-1">
                                            <label className="text-xs font-bold text-slate-500 mb-1 block">售價 (全額 NT$)</label>
                                            <input type="number" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-black text-[#EE4D2D] outline-none focus:border-[#EE4D2D]" value={v.price.toString() === '0' && v.price !== 0 ? '' : v.price.toString().replace(/^0+/, '') || '0'} onChange={e => updateVariant(i, 'price', e.target.value === '' ? 0 : parseInt(e.target.value, 10))} onFocus={e => e.target.select()} placeholder="0" />
                                        </div>
                                        <div className="w-full md:flex-[0.8]">
                                            <label className="text-xs font-bold text-slate-500 mb-1 block">庫存數量</label>
                                            <input type="number" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-bold text-slate-700 outline-none focus:border-[#EE4D2D]" value={v.stock === ('' as any) ? '' : v.stock.toString().replace(/^0+/, '') || '0'} onChange={e => updateVariant(i, 'stock', e.target.value === '' ? ('' as any) : parseInt(e.target.value, 10))} onFocus={(e) => { if(v.stock === 100) updateVariant(i, 'stock', '' as any); else e.target.select(); }} onBlur={() => { if(v.stock === ('' as any) || isNaN(v.stock)) updateVariant(i, 'stock', 100); }} placeholder="100" />
                                        </div>
                                        <div className="w-full md:flex-[0.8]">
                                            <label className="text-xs font-bold text-slate-500 mb-1 block">單件成本</label>
                                            <input type="number" className="w-full border border-slate-200 rounded-lg p-2.5 text-sm font-bold text-slate-700 outline-none focus:border-[#EE4D2D]" value={v.cost === undefined ? '' : v.cost} onChange={e => updateVariant(i, 'cost', e.target.value === '' ? undefined : parseInt(e.target.value, 10))} placeholder="選填" onFocus={e => e.target.select()} />
                                        </div>
                                        {form.variants && form.variants.length > 1 && <button type="button" onClick={() => removeVariant(i)} className="absolute top-2 right-2 md:static md:w-auto p-2 text-slate-300 hover:text-red-500 rounded-lg transition"><i className="fa-solid fa-trash-can"></i></button>}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {!isQuickPublish && (
                            <>
                                <div className="w-full md:col-span-2 animate-fade-in-up">
                                    <label className="text-xs font-bold text-slate-500 mb-2 block">原價 (選填，將在首頁顯示為刪除線，並自動計算折數吸引購買)</label>
                                    <input type="number" className="w-full h-12 border border-slate-200 rounded-2xl px-5 text-sm outline-none focus:border-slate-400" value={form.original_price || ''} onChange={e => setForm({...form, original_price: parseInt(e.target.value) || 0})} placeholder="請輸入商品原價 NT$" />
                                </div>
                                
                                <div className="md:col-span-2 mt-2 animate-fade-in-up">
                                    <label className="text-xs font-bold text-slate-500 mb-2 block">特殊銷售模式選項</label>
                                    <div className="bg-orange-50/50 p-5 rounded-2xl border border-orange-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* 預購模式 */}
                                        <div>
                                            <label className={`flex items-center gap-2 w-fit mb-4 ${sellerConfig.can_use_preorder ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}
                                               onClick={(e) => {
                                                   if (!sellerConfig.can_use_preorder) { e.preventDefault(); alert('會員等級限制：\n您目前的會員等級無法使用「商品預購模式」。\n請升級會員解鎖此功能！'); }
                                               }}>
                                                <input type="checkbox" checked={(form as any).is_preorder || false} onChange={e => { if (sellerConfig.can_use_preorder) { setForm({...form, is_preorder: e.target.checked} as any); } }} className={`w-5 h-5 accent-[#EE4D2D] ${!sellerConfig.can_use_preorder && 'pointer-events-none'}`} />
                                                <span className="text-sm font-black text-[#EE4D2D]"><i className="fa-solid fa-fire mr-1"></i> 開啟商品預購模式 {!sellerConfig.can_use_preorder && '(會員等級限制)'}</span>
                                            </label>
                                            {(form as any).is_preorder && (
                                                <div className="flex flex-col gap-4 animate-fade-in-up">
                                                    <div><label className="text-xs font-bold text-slate-600 mb-2 block">預購結束日期</label><input type="date" className="w-full h-12 border border-orange-200 rounded-xl px-4 text-sm outline-none focus:border-[#EE4D2D] bg-white" value={(form as any).preorder_end_date || ''} onChange={e => setForm({...form, preorder_end_date: e.target.value} as any)} /></div>
                                                    <div><label className="text-xs font-bold text-slate-600 mb-2 block">預計到貨日期</label><input type="date" className="w-full h-12 border border-orange-200 rounded-xl px-4 text-sm outline-none focus:border-[#EE4D2D] bg-white" value={(form as any).preorder_arrival_date || ''} onChange={e => setForm({...form, preorder_arrival_date: e.target.value} as any)} /></div>
                                                </div>
                                            )}
                                        </div>
                                        {/* 隱藏銷售 */}
                                        <div>
                                            <label className="flex items-center gap-2 cursor-pointer w-fit mb-4">
                                                <input type="checkbox" checked={(form as any).is_hidden || false} onChange={e => setForm({...form, is_hidden: e.target.checked} as any)} className="w-5 h-5 accent-[#EE4D2D]" />
                                                <span className="text-sm font-black text-[#EE4D2D]"><i className="fa-solid fa-link-slash mr-1"></i> 隱藏銷售 (專屬連結)</span>
                                            </label>
                                            {(form as any).is_hidden && (
                                                <div className="flex flex-col gap-4 animate-fade-in-up">
                                                    <div>
                                                        <label className="text-xs font-bold text-slate-600 mb-2 block">設定頁面密碼</label>
                                                        <input type="text" className="w-full h-12 border border-orange-200 rounded-xl px-4 text-sm outline-none focus:border-[#EE4D2D] bg-white" value={(form as any).view_password || ''} onChange={e => setForm({...form, view_password: e.target.value} as any)} placeholder="買家需輸入才可查看" />
                                                    </div>
                                                    <div className="text-xs text-slate-500 bg-white/60 p-3 rounded-lg border border-orange-100">開啟後將不在賣場顯示，僅能透過專屬連結購買。</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="md:col-span-2">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-slate-500 flex items-center gap-1">商品描述 <span className="text-[#EE4D2D] bg-red-50 px-1.5 py-0.5 rounded text-[10px]">(必填)</span></label>
                                <button type="button" onClick={() => setIsHtmlMode(!isHtmlMode)} className="text-xs text-blue-500 font-bold hover:underline flex items-center gap-1">
                                    <i className="fa-solid fa-code"></i> {isHtmlMode ? '切換回一般文字模式' : '切換 HTML 原始碼模式'}
                                </button>
                            </div>
                            
                            {isHtmlMode ? (
                                <div className="space-y-2 animate-fade-in">
                                    <div className="flex justify-end">
                                        <button type="button" onClick={generateHtmlTemplate} className="text-xs bg-slate-800 text-green-400 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-700 transition flex items-center gap-1">
                                            <i className="fa-solid fa-wand-magic-sparkles"></i> 自動產生排版範本
                                        </button>
                                    </div>
                                    <textarea className={`w-full h-64 border rounded-2xl p-5 text-sm outline-none resize-y font-mono bg-slate-800 text-green-400 transition-all ${validationErrors.includes('description') ? 'border-red-500 ring-2 ring-red-200 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'border-slate-200 focus:border-[#EE4D2D]'}`} value={form.custom_html || ''} onChange={e => setForm({...form, custom_html: e.target.value})} placeholder="請在此貼上或撰寫您的 HTML 程式碼..."></textarea>
                                </div>
                            ) : (
                                <textarea className={`w-full h-40 border rounded-2xl p-5 text-sm outline-none resize-none transition-all ${validationErrors.includes('description') ? 'border-red-500 ring-2 ring-red-200 shadow-[0_0_8px_rgba(239,68,68,0.4)] bg-red-50/30' : 'border-slate-200 focus:border-[#EE4D2D]'}`} value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="詳細介紹您的商品特色、尺寸、材質等資訊..."></textarea>
                            )}
                            
                            </div>
                        
                        <div className="md:col-span-2">
                            <label className="text-xs font-bold text-slate-500 mb-2 flex items-center flex-wrap gap-1">商品圖片 (最多可上傳多張圖片，建議 1:1 比例) <span className="text-[#EE4D2D]">(單張限制 1MB)</span> <span className="text-[#EE4D2D] bg-red-50 px-1.5 py-0.5 rounded text-[10px]">(必填)</span></label>
                            <div className={`flex flex-wrap gap-4 p-2 rounded-xl transition-all ${validationErrors.includes('images') ? 'border border-red-500 ring-2 ring-red-200 shadow-[0_0_8px_rgba(239,68,68,0.4)] bg-red-50/30' : ''}`}>
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
                {!isQuickPublish && (
                <section className="space-y-6 animate-fade-in-up">
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
                )}

                {/* Step 3 已整合至 Step 1 */}

                {/* Step 3. 運送與付款設定 */}
                <section className="space-y-6">
                    <div className="text-sm font-black text-[#EE4D2D] uppercase tracking-widest border-b pb-2 flex justify-between items-center">
                        <span>Step 3. 運送與付款設定(必填)</span>
                        <button type="button" onClick={() => { setPresetTemp({...shippingPresets}); setShowPresetModal(true); }} className="text-xs font-bold text-blue-500 hover:text-blue-600 bg-blue-50 px-3 py-1 rounded-full"><i className="fa-solid fa-gear mr-1"></i>編輯運費選項</button>
                    </div>
                    <div className="grid grid-cols-1 gap-8">
                        <div className={`space-y-4 bg-white p-5 rounded-2xl border shadow-sm transition-all ${validationErrors.includes('shipping_rules') || validationErrors.includes('shipping_rules_fee') ? 'border-red-500 ring-2 ring-red-200 shadow-[0_0_8px_rgba(239,68,68,0.4)] bg-red-50/30' : 'border-slate-200'}`}>
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><i className="fa-solid fa-truck text-[#EE4D2D]"></i> 提供買家的運送方式 <span className="text-[#EE4D2D] bg-red-50 px-1.5 py-0.5 rounded text-[10px] ml-1">(必填)</span></label>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {SHIPPING_PRESETS.map(preset => <button key={preset.name} onClick={() => addShippingRule(preset.name)} className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-3 py-1.5 rounded-full transition">+ {preset.name}</button>)}
                                <button onClick={() => addShippingRule()} className="text-xs bg-orange-50 text-[#EE4D2D] font-bold px-3 py-1.5 rounded-full hover:bg-orange-100 transition border border-orange-200">+ 自訂運送</button>
                            </div>
                            <div className="space-y-3">
                                {/* ★ 自動注入使用者設定的下拉清單資料 */}
                                <datalist id="preset-fees">{shippingPresets.fees.map(v => <option key={`fee-${v}`} value={v} />)}</datalist>
                                <datalist id="preset-qtys">{shippingPresets.qtys.map(v => <option key={`qty-${v}`} value={v} />)}</datalist>
                                <datalist id="preset-thresholds">{shippingPresets.thresholds.map(v => <option key={`threshold-${v}`} value={v} />)}</datalist>
                                {form.shipping_rules?.map((rule, i) => (
                                    <div key={i} className="flex flex-col gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100 relative">
                                        <div className="flex justify-between items-center gap-4">
                                            <input type="text" className="border border-slate-200 rounded-lg p-2 text-sm font-bold text-slate-700 w-full md:w-1/2" value={rule.name} onChange={e => updateShippingRule(i, 'name', e.target.value)} placeholder="方式名稱" />
                                            <button onClick={() => removeShippingRule(i)} className="text-red-400 hover:text-red-600 p-2 shrink-0"><i className="fa-solid fa-trash-can text-sm"></i></button>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div><label className="text-[10px] text-slate-500 font-bold mb-1 block">單趟運費</label><div className="flex items-center gap-2"><span className="text-xs text-slate-500 font-bold">$</span><input type="number" list="preset-fees" className="flex-1 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-[#EE4D2D]" value={rule.fee === undefined ? '' : rule.fee} onChange={e => updateShippingRule(i, 'fee', e.target.value === '' ? '' : parseInt(e.target.value))} placeholder="金額" /></div></div>
                                            <div><label className="text-[10px] text-slate-500 font-bold mb-1 block">每滿幾件加收一次運費</label><input type="number" list="preset-qtys" className="w-full border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-[#EE4D2D]" value={rule.limit_qty === 0 ? '' : rule.limit_qty} onChange={e => updateShippingRule(i, 'limit_qty', e.target.value === '' ? 0 : parseInt(e.target.value))} placeholder="例: 4 (留空=不限)" /></div>
                                            <div><label className="text-[10px] text-slate-500 font-bold mb-1 block">滿多少金額免運</label><div className="flex items-center gap-2"><span className="text-xs text-slate-500 font-bold">$</span><input type="number" list="preset-thresholds" className="flex-1 border border-slate-200 rounded-lg p-2 text-sm outline-none focus:border-[#EE4D2D]" value={rule.free_threshold === 0 ? '' : rule.free_threshold} onChange={e => updateShippingRule(i, 'free_threshold', e.target.value === '' ? 0 : parseInt(e.target.value))} placeholder="例: 1000 (留空=無)" /></div></div>
                                        </div>
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

                        <div className={`space-y-4 bg-white p-5 rounded-2xl border shadow-sm transition-all ${validationErrors.includes('payment_methods') ? 'border-red-500 ring-2 ring-red-200 shadow-[0_0_8px_rgba(239,68,68,0.4)] bg-red-50/30' : 'border-slate-200'}`}>
                            <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><i className="fa-solid fa-credit-card text-[#EE4D2D]"></i> 支援的付款方式 <span className="text-[#EE4D2D] bg-red-50 px-1.5 py-0.5 rounded text-[10px] ml-1">(必填)</span></label>
                            <div className="flex flex-wrap gap-4">
                                {PAYMENT_OPTIONS.filter(opt => {
                                    // ★ 分別判斷線上金流與貨到付款的開關狀態
                                    if (siteSettings?.enable_online_payment === false && opt.value === 'ONLINE') return false;
                                    if (siteSettings?.enable_cod === false && opt.value === 'COD') return false;
                                    return true;
                                }).map(opt => (
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
                            
                            <div className="mt-4 p-4 bg-orange-50 rounded-xl border border-orange-100 flex items-start gap-3">
                                <i className="fa-solid fa-circle-info text-[#EE4D2D] mt-0.5"></i>
                                <div className="text-sm text-slate-700 font-bold">
                                    買家結帳時，系統將自動帶入您在左側選單「金物流設定」中所配置的銀行帳戶、面交地址與藍新金流設定。
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Step 4. 其他進階設定 */}
                {!isQuickPublish && (
                <section className="space-y-6 animate-fade-in-up">
                    <div className="text-sm font-black text-[#EE4D2D] uppercase tracking-widest border-b pb-2">Step 4. 其他進階設定 (選填)</div>
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

                        {/* 隱藏銷售區塊已移至上方特殊銷售模式選項 */}

                        <div className="border-t border-slate-200 pt-6">
                            <label className="text-xs font-bold text-slate-600 mb-2 flex justify-between"><span>SEO 搜尋關鍵字 (用逗號隔開)</span><span className="text-slate-400 font-normal">買家搜尋時更容易找到您的商品</span></label>
                            <input type="text" className="w-full border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-[#EE4D2D] bg-white" value={seoInputValue} onChange={e => { setSeoInputValue(e.target.value); setForm({...form, keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)}); }} placeholder="例如：洋裝, 夏季, 碎花" />
                        </div>

                        {/* ★ 以下為新增的 SEO 進階欄位 */}
                        <div className="border-t border-slate-200 pt-6 mt-6">
                            <label className="text-xs font-bold text-slate-600 mb-2 flex justify-between">
                                <span>自訂 SEO 網頁標題 (Title) <span className="text-slate-400 font-normal ml-1">預設與商品名稱同步</span></span>
                                <span className={`font-normal ${form.seo_title?.length > 60 ? 'text-red-500' : 'text-slate-400'}`}>目前: {form.seo_title?.length || 0} 字 (建議 60 字內)</span>
                            </label>
                            <input type="text" className="w-full border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-[#EE4D2D] bg-white" value={form.seo_title || ''} onChange={e => setForm({...form, seo_title: e.target.value})} placeholder="例如：2026最新款 超美碎花洋裝 | InsBuy 拍拍購" />
                        </div>
                        <div className="pt-4">
                            <div className="flex justify-between items-end mb-2">
                                <label className="text-xs font-bold text-slate-600 block">
                                    自訂 SEO 網頁描述 (Meta Description) 
                                    <span className="text-slate-400 font-normal mt-1 block">留空將自動使用商品描述。目前: {form.seo_description?.length || 0} 字 (建議 100-150 字)</span>
                                </label>
                                <button type="button" onClick={handleAutoSeoDesc} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold hover:bg-blue-100 transition border border-blue-100 flex items-center gap-1 shrink-0">
                                    <i className="fa-solid fa-bolt"></i> 自動抓取簡介
                                </button>
                            </div>
                            <textarea className="w-full h-24 border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-[#EE4D2D] bg-white resize-none" value={form.seo_description || ''} onChange={e => setForm({...form, seo_description: e.target.value})} placeholder="簡短描述您的商品，建議 100-150 字以內，這將顯示在 Google 搜尋結果的敘述中..." />
                        </div>
                    </div>
                </section>
                )}

                {/* 底部按鈕區 */}
                <div className="flex flex-col md:flex-row gap-4 pt-10 border-t border-slate-200 pb-20">
                  <button onClick={handleAttemptLeave} className="w-full md:w-1/4 h-14 rounded-2xl font-bold text-slate-500 border-2 border-slate-200 hover:bg-slate-50 transition shadow-sm">取消返回</button>
                  <button onClick={() => handleSaveFullDraft(false)} className="w-full md:w-1/4 h-14 rounded-2xl font-bold text-[#EE4D2D] border-2 border-[#EE4D2D] hover:bg-orange-50 transition shadow-sm bg-white">儲存為草稿</button>
                  <button onClick={handleSaveProduct} className="w-full md:flex-1 h-14 primary-gradient text-white rounded-2xl font-black shadow-xl hover:scale-[1.02] active:scale-95 transition-all text-lg">
                      {editingId ? '確認儲存修改' : '確認發布並開始團購'}
                  </button>
                </div>
                
                {/* 編輯草稿彈窗 Modal */}
                {showDraftModal && (
                    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl animate-fade-in-up max-h-[80vh] flex flex-col">
                            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3 shrink-0">
                                <h3 className="font-black text-xl text-slate-800"><i className="fa-solid fa-file-pen text-slate-500 mr-2"></i>草稿管理 ({fullDrafts.length})</h3>
                                <button onClick={() => setShowDraftModal(false)} className="text-slate-400 hover:text-red-500"><i className="fa-solid fa-xmark text-xl"></i></button>
                            </div>
                            <div className="overflow-y-auto custom-scrollbar flex-1 pr-2 space-y-3">
                                {fullDrafts.length === 0 ? (
                                    <div className="text-center text-slate-400 py-10 font-bold">
                                        <i className="fa-solid fa-box-open text-4xl mb-3 opacity-20 block"></i>
                                        目前尚無儲存的草稿
                                    </div>
                                ) : (
                                    fullDrafts.map(d => (
                                        <div key={d.id} className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100 hover:border-blue-200 transition gap-4">
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-bold text-slate-700 truncate mb-1">{d.name || '未命名草稿'}</div>
                                                <div className="text-[10px] text-slate-400 font-mono"><i className="fa-regular fa-clock mr-1"></i>儲存時間: {new Date(parseInt(d.id)).toLocaleString()}</div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <button type="button" onClick={() => applyFullDraft(d.id)} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition shadow-sm">載入編輯</button>
                                                <button type="button" onClick={() => deleteFullDraft(d.id)} className="px-3 py-1.5 bg-red-50 text-red-500 rounded-lg text-xs font-bold hover:bg-red-100 transition shadow-sm"><i className="fa-solid fa-trash-can"></i></button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            <button type="button" onClick={() => setShowDraftModal(false)} className="w-full mt-4 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition shrink-0">關閉</button>
                        </div>
                    </div>
                )}

                {/* ★ 離開前確認彈窗 Modal */}
                {showLeavePrompt && (
                    <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl animate-fade-in-up text-center">
                            <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
                                <i className="fa-solid fa-triangle-exclamation"></i>
                            </div>
                            <h3 className="font-black text-xl text-slate-800 mb-2">確定要離開嗎？</h3>
                            <p className="text-slate-500 text-sm mb-8">您的商品尚未發佈或儲存，離開將會遺失目前填寫的內容喔！</p>
                            <div className="flex flex-col gap-3">
                                <button onClick={handleLeaveAndSaveDraft} className="w-full bg-[#EE4D2D] text-white py-3 rounded-xl font-bold shadow-md hover:bg-[#d73211] transition">先儲存為草稿</button>
                                <button onClick={handleConfirmLeave} className="w-full bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition">不儲存，確認離開</button>
                                <button onClick={() => setShowLeavePrompt(false)} className="w-full text-slate-400 py-2 text-sm font-bold hover:text-slate-600 transition underline">取消</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* ★ 編輯運費預設值 Modal */}
                {showPresetModal && (
                    <div className="fixed inset-0 bg-black/50 z-[110] flex items-center justify-center p-4">
                        <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl animate-fade-in-up max-h-[90vh] flex flex-col">
                            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3 shrink-0">
                                <h3 className="font-black text-lg text-slate-800"><i className="fa-solid fa-gear text-blue-500 mr-2"></i>管理運費下拉選項</h3>
                                <button onClick={() => setShowPresetModal(false)} className="text-slate-400 hover:text-red-500"><i className="fa-solid fa-xmark text-xl"></i></button>
                            </div>
                            <div className="overflow-y-auto custom-scrollbar flex-1 pr-2 space-y-6">
                                {/* 單趟運費 */}
                                <div>
                                    <label className="text-sm font-bold text-slate-600 mb-2 block">常用單趟運費</label>
                                    <div className="flex gap-2 mb-2">
                                        <input type="number" id="new-fee" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="輸入金額" />
                                        <button onClick={() => {
                                            const val = parseInt((document.getElementById('new-fee') as HTMLInputElement).value);
                                            if(!isNaN(val) && !presetTemp.fees.includes(val)) {
                                                setPresetTemp(prev => ({...prev, fees: [...prev.fees, val]}));
                                                (document.getElementById('new-fee') as HTMLInputElement).value = '';
                                            }
                                        }} className="bg-blue-50 text-blue-600 font-bold px-4 rounded-lg text-sm hover:bg-blue-100">新增</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {presetTemp.fees.map(v => (
                                            <span key={v} className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-2 border border-slate-200">
                                                ${v} <button onClick={() => setPresetTemp(prev => ({...prev, fees: prev.fees.filter(x => x !== v)}))} className="text-slate-400 hover:text-red-500"><i className="fa-solid fa-xmark"></i></button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                {/* 滿件數 */}
                                <div>
                                    <label className="text-sm font-bold text-slate-600 mb-2 block">常用滿件加收數量</label>
                                    <div className="flex gap-2 mb-2">
                                        <input type="number" id="new-qty" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="輸入件數" />
                                        <button onClick={() => {
                                            const val = parseInt((document.getElementById('new-qty') as HTMLInputElement).value);
                                            if(!isNaN(val) && !presetTemp.qtys.includes(val)) {
                                                setPresetTemp(prev => ({...prev, qtys: [...prev.qtys, val]}));
                                                (document.getElementById('new-qty') as HTMLInputElement).value = '';
                                            }
                                        }} className="bg-blue-50 text-blue-600 font-bold px-4 rounded-lg text-sm hover:bg-blue-100">新增</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {presetTemp.qtys.map(v => (
                                            <span key={v} className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-2 border border-slate-200">
                                                {v} 件 <button onClick={() => setPresetTemp(prev => ({...prev, qtys: prev.qtys.filter(x => x !== v)}))} className="text-slate-400 hover:text-red-500"><i className="fa-solid fa-xmark"></i></button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                {/* 滿額免運 */}
                                <div>
                                    <label className="text-sm font-bold text-slate-600 mb-2 block">常用滿額免運門檻</label>
                                    <div className="flex gap-2 mb-2">
                                        <input type="number" id="new-threshold" className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" placeholder="輸入金額" />
                                        <button onClick={() => {
                                            const val = parseInt((document.getElementById('new-threshold') as HTMLInputElement).value);
                                            if(!isNaN(val) && !presetTemp.thresholds.includes(val)) {
                                                setPresetTemp(prev => ({...prev, thresholds: [...prev.thresholds, val]}));
                                                (document.getElementById('new-threshold') as HTMLInputElement).value = '';
                                            }
                                        }} className="bg-blue-50 text-blue-600 font-bold px-4 rounded-lg text-sm hover:bg-blue-100">新增</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        {presetTemp.thresholds.map(v => (
                                            <span key={v} className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-2 border border-slate-200">
                                                ${v} <button onClick={() => setPresetTemp(prev => ({...prev, thresholds: prev.thresholds.filter(x => x !== v)}))} className="text-slate-400 hover:text-red-500"><i className="fa-solid fa-xmark"></i></button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-4 shrink-0 border-t border-slate-100 pt-4">
                                <button onClick={() => setShowPresetModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition">取消</button>
                                <button onClick={() => {
                                    setShippingPresets(presetTemp);
                                    localStorage.setItem('insbuy_shipping_presets', JSON.stringify(presetTemp));
                                    setShowPresetModal(false);
                                }} className="flex-1 bg-blue-500 text-white py-3 rounded-xl font-bold hover:bg-blue-600 transition shadow-sm">儲存設定</button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default AdminProductForm;