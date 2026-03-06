import React, { useState, useEffect } from 'react';

interface Props {
  shopId: string;
  onClose: () => void;
}

export default function ServiceCategoryModal({ shopId, onClose }: Props) {
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    // 載入店家目前的分類設定
    fetch(`http://127.0.0.1:3001/api/booking/settings/${shopId}`)
      .then(res => res.json())
      .then(data => {
        if (data) {
          setSettings(data);
          setCategories(data.service_categories || []);
        }
      });
  }, [shopId]);

  const handleSave = async (updatedCategories: string[]) => {
    setIsSaving(true);
    try {
      // 將更新後的分類陣列儲存回後端
      await fetch(`http://127.0.0.1:3001/api/booking/settings/${shopId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service_categories: updatedCategories }) // ★ 修正：精準只送出分類欄位，避免 MongoDB _id 衝突
      });
      setCategories(updatedCategories);
    } catch (e) {
      alert('儲存失敗，請檢查網路連線');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdd = () => {
    if (!newCategory.trim()) return;
    if (categories.includes(newCategory.trim())) return alert('此分類已存在！');
    const updated = [...categories, newCategory.trim()];
    handleSave(updated);
    setNewCategory(''); // 清空輸入框
  };

  const handleDelete = (cat: string) => {
    if (!window.confirm(`確定要刪除分類「${cat}」嗎？(已經套用此分類的服務不受影響)`)) return;
    const updated = categories.filter(c => c !== cat);
    handleSave(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in-up">
        
        {/* 標題與關閉按鈕 */}
        <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
          <h3 className="text-xl font-black text-slate-800"><i className="fa-solid fa-folder-open text-purple-500 mr-2"></i>管理服務大分類</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors w-8 h-8 flex items-center justify-center rounded-full bg-slate-50"><i className="fa-solid fa-xmark text-lg"></i></button>
        </div>

        {/* 新增分類區塊 */}
        <div className="flex gap-2 mb-6">
          <input 
            type="text" 
            value={newCategory} 
            onChange={e => setNewCategory(e.target.value)} 
            placeholder="輸入新分類名稱 (例：手部保養)" 
            className="flex-1 p-2.5 border-2 border-slate-200 rounded-xl outline-none focus:border-purple-500 text-sm font-bold text-slate-700"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
          />
          <button onClick={handleAdd} disabled={isSaving || !newCategory.trim()} className="bg-purple-600 text-white font-black px-5 py-2.5 rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition">
            新增
          </button>
        </div>

        {/* 現有分類列表 */}
        <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 no-scrollbar">
          {categories.length === 0 ? (
            <div className="text-center text-slate-400 py-8 text-sm font-bold border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
               目前無任何分類，請於上方輸入名稱新增。
            </div>
          ) : (
            categories.map((cat, idx) => (
              <div key={idx} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-200 group hover:border-purple-200 hover:bg-purple-50 transition-colors">
                <span className="font-bold text-slate-700 group-hover:text-purple-700">{cat}</span>
                <button onClick={() => handleDelete(cat)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 w-8 h-8 flex items-center justify-center rounded-full transition-colors">
                  <i className="fa-solid fa-trash-can"></i>
                </button>
              </div>
            ))
          )}
        </div>

        {/* 底部確認按鈕 */}
        <button onClick={onClose} className="w-full mt-6 bg-slate-800 text-white py-3.5 rounded-xl font-black text-lg hover:bg-slate-700 shadow-lg transition">
          完成並關閉
        </button>
      </div>
    </div>
  );
}