import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Plus, Trash2, Search } from 'lucide-react';

export default function Categories() {
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [type, setType] = useState<'income'|'expense'|'both'>('expense');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  
  const handleDeleteClick = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (deleteConfirmId === id) {
      await db.categories.delete(id);
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };
  const categories = useLiveQuery(() => db.categories.toArray());

  const addCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    await db.categories.add({ name, type });
    setName('');
  };

  const typeLabel = { income: 'درآمد', expense: 'هزینه', both: 'مشترک' };
  const typeColor = { income: 'bg-emerald-500/10 text-white', expense: 'bg-rose-500/10 text-white', both: 'bg-blue-500/10 text-white' };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-700">
        <h2 className="text-xl font-bold mb-4">افزودن دسته‌بندی</h2>
        <form onSubmit={addCat} className="flex flex-col sm:flex-row gap-4">
          <input required value={name} onChange={e=>setName(e.target.value)} placeholder="نام دسته..." className="flex-1 px-4 py-2 border rounded-lg" />
          <select value={type} onChange={e=>setType(e.target.value as any)} className="px-4 py-2 border rounded-lg bg-slate-800">
            <option value="expense">هزینه</option>
            <option value="income">درآمد</option>
            <option value="both">مشترک</option>
          </select>
          <button type="submit" className="bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)] text-white px-6 py-2 rounded-lg flex items-center justify-center gap-2"><Plus size={18}/><span>ثبت</span></button>
        </form>
      </div>

      <div className="bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-700">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h2 className="text-xl font-bold text-white">دسته‌بندی‌ها</h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-white" size={18} />
            <input 
              type="text" 
              placeholder="جستجو..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-4 pr-10 py-2 bg-slate-900 border border-slate-700 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          {categories?.filter(c => !search || c.name.includes(search)).map(c => (
            <div key={c.id} className={`px-4 py-2 rounded-xl flex items-center gap-3 border border-transparent hover:border-slate-700 transition-colors ${typeColor[c.type]}`}>
              <span className="font-medium text-sm">{c.name}</span>
              <span className="text-xs opacity-60">({typeLabel[c.type]})</span>
              <button onClick={(e) => handleDeleteClick(e, c.id!)} className={`transition-colors px-2 rounded ${deleteConfirmId === c.id ? 'bg-rose-500 text-white' : 'text-white hover:text-white'}`}>
                {deleteConfirmId === c.id ? <span className="text-xs font-bold">حذف؟</span> : <Trash2 size={16}/>}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
