import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Plus, Trash2, CreditCard, Search, Edit2 } from 'lucide-react';

export default function Accounts() {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState({ name: '', accountNumber: '', initialBalance: '' });
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const accounts = useLiveQuery(() => db.accounts.toArray());
  const transactions = useLiveQuery(() => db.transactions.toArray());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await db.accounts.update(editingId, {
        name: formData.name,
        accountNumber: formData.accountNumber,
        initialBalance: Number(formData.initialBalance || 0),
      });
    } else {
      await db.accounts.add({
        name: formData.name,
        accountNumber: formData.accountNumber,
        initialBalance: Number(formData.initialBalance || 0),
      });
    }
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', accountNumber: '', initialBalance: '' });
  };

  const getAccountBalance = (accountId: number, initialBalance: number) => {
    if (!transactions) return initialBalance;
    const aTrans = transactions.filter(t => t.accountId === accountId);
    const income = aTrans.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = aTrans.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return initialBalance + income - expense;
  };

  const handleEdit = (a: any) => {
    setFormData({
      name: a.name,
      accountNumber: a.accountNumber || '',
      initialBalance: String(a.initialBalance || 0)
    });
    setEditingId(a.id);
    setShowForm(true);
  };

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const handleDeleteClick = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (deleteConfirmId === id) {
      await db.accounts.delete(id);
      setDeleteConfirmId(null);
    } else {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">مدیریت حساب‌ها و کارت‌ها</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)] text-white px-4 py-2 rounded-xl flex items-center space-x-2 space-x-reverse shadow-sm">
          <Plus size={20} /><span>افزودن حساب</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-white" size={20} />
        <input 
          type="text" 
          placeholder="جستجو در حساب‌ها..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-4 pr-10 py-3 bg-slate-800 border border-slate-700 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
        />
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><label className="block text-sm font-medium mb-1">نام حساب (مثلاً صادرات)</label><input required value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} className="w-full px-3 py-2 border border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" /></div>
          <div><label className="block text-sm font-medium mb-1">شماره حساب / کارت</label><input value={formData.accountNumber} onChange={e=>setFormData({...formData, accountNumber:e.target.value})} className="w-full px-3 py-2 border border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" dir="ltr" /></div>
          <div><label className="block text-sm font-medium mb-1">موجودی اولیه (تومان)</label><input type="number" required value={formData.initialBalance} onChange={e=>setFormData({...formData, initialBalance:e.target.value})} className="w-full px-3 py-2 border border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" dir="ltr" /></div>
          <div className="col-span-full flex justify-end">
            <button type="submit" className="bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)] text-white px-6 py-2 rounded-lg font-medium shadow-[0_0_15px_rgba(37,99,235,0.4)]">
              {editingId ? 'ویرایش حساب' : 'ثبت حساب'}
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {accounts?.filter(a => !search || a.name.includes(search) || (a.accountNumber && a.accountNumber.includes(search))).map(a => {
          const currentBalance = getAccountBalance(a.id!, a.initialBalance);
          return (
            <div key={a.id} className="bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-700 flex flex-col relative group">
              <div className="absolute top-4 left-4 flex gap-2">
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleEdit(a); }} className="text-white hover:text-white transition-colors drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"><Edit2 size={18} /></button>
                <button 
                  onClick={(e) => handleDeleteClick(e, a.id!)} 
                  className={`transition-colors flex items-center gap-1 px-2 py-1 rounded ${deleteConfirmId === a.id ? 'bg-rose-500 text-white' : 'text-white hover:text-white'}`}
                >
                  {deleteConfirmId === a.id ? <span className="text-xs font-bold">حذف؟</span> : <Trash2 size={18} />}
                </button>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-slate-900 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)] rounded-lg flex items-center justify-center">
                  <CreditCard size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{a.name}</h3>
                  <p className="text-xs text-white font-mono" dir="ltr">{a.accountNumber || '---'}</p>
                </div>
              </div>
              <div className="flex justify-between items-center text-sm mt-2 border-t border-slate-700 pt-3">
                <span className="text-white">موجودی فعلی:</span>
                <span className={`font-bold text-lg ${currentBalance >= 0 ? 'text-blue-400' : 'text-rose-500'}`} dir="ltr">
                  {new Intl.NumberFormat('fa-IR').format(currentBalance)}
                </span>
              </div>
            </div>
          );
        })}
        {accounts?.length === 0 && !showForm && (
          <div className="col-span-full py-12 text-center text-white bg-slate-800 rounded-xl border border-slate-700 border-dashed">
            هیچ حسابی ثبت نشده است. لطفاً یک حساب جدید اضافه کنید.
          </div>
        )}
      </div>
    </div>
  );
}
