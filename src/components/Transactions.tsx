import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, TransactionType, Transaction } from '../db';
import { Plus, Search, Edit2, Trash2, Copy, Filter } from 'lucide-react';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';

export default function Transactions({ type }: { type: TransactionType }) {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const transactions = useLiveQuery(
    () => db.transactions
      .where('type').equals(type)
      .reverse()
      .sortBy('createdAt')
  );

  const projects = useLiveQuery(() => db.projects.toArray());
  const categories = useLiveQuery(() => db.categories.toArray());
  const accounts = useLiveQuery(() => db.accounts.toArray());

  const filtered = transactions?.filter(t => {
    if (!search) return true;
    const s = search.toLowerCase();
    const matchDesc = t.description?.toLowerCase().includes(s);
    const matchCard = t.card?.toLowerCase().includes(s);
    const accountName = t.accountId ? accounts?.find(a => a.id === t.accountId)?.name?.toLowerCase() : '';
    const matchAccount = accountName?.includes(s);
    const projectName = t.projectId ? projects?.find(p => p.id === t.projectId)?.name?.toLowerCase() : '';
    const matchProject = projectName?.includes(s);
    return matchDesc || matchCard || matchAccount || matchProject;
  }) || [];

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const handleDelete = async (e: React.MouseEvent, id?: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (id) {
      if (deleteConfirmId === id) {
        await db.transactions.delete(id);
        setDeleteConfirmId(null);
      } else {
        setDeleteConfirmId(id);
        setTimeout(() => setDeleteConfirmId(null), 3000);
      }
    }
  };

  const handleDuplicate = async (e: React.MouseEvent, t: Transaction) => {
    e.preventDefault();
    e.stopPropagation();
    const { id, ...rest } = t;
    await db.transactions.add({ ...rest, createdAt: new Date().toISOString() });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-white">
          {type === 'income' ? 'درآمدها' : 'هزینه‌ها'}
        </h1>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center space-x-2 space-x-reverse bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)] hover:bg-blue-700 text-white px-4 py-2 rounded-xl transition-colors shadow-sm"
        >
          <Plus size={20} />
          <span>افزودن {type === 'income' ? 'درآمد' : 'هزینه'}</span>
        </button>
      </div>

      {showForm && !editingId && (
        <TransactionForm 
          type={type} 
          onClose={() => setShowForm(false)} 
          projects={projects || []}
          categories={categories || []}
          accounts={accounts || []}
        />
      )}

      {editingId && (
        <TransactionForm 
          type={type} 
          initialData={transactions?.find(t => t.id === editingId)}
          onClose={() => setEditingId(null)} 
          projects={projects || []}
          categories={categories || []}
          accounts={accounts || []}
        />
      )}

      <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-700 flex items-center space-x-4 space-x-reverse">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-white" size={18} />
            <input
              type="text"
              placeholder="جستجو در بابت یا کارت..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-4 pr-10 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-slate-800 transition-all text-sm"
            />
          </div>
          <button className="flex items-center space-x-2 space-x-reverse px-4 py-2 text-white hover:bg-slate-900 rounded-lg border border-slate-700 transition-colors text-sm">
            <Filter size={18} />
            <span>فیلترها</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-900 text-white text-xs uppercase sticky top-0">
              <tr className="border-b border-slate-700">
                <th className="px-6 py-3 font-semibold">بابت</th>
                <th className="px-6 py-3 font-semibold text-left">مبلغ (تومان)</th>
                <th className="px-6 py-3 font-semibold">تاریخ</th>
                <th className="px-6 py-3 font-semibold">حساب</th>
                <th className="px-6 py-3 font-semibold">پروژه</th>
                <th className="px-6 py-3 font-semibold">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-white">تراکنشی یافت نشد</td>
                </tr>
              ) : filtered.map(t => (
                <tr key={t.id} className="hover:bg-slate-900 transition-colors">
                  <td className="px-6 py-4 text-white font-medium">{t.description}</td>
                  <td className="px-6 py-4 font-bold text-left" dir="ltr">
                    <span className={t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}>
                      {new Intl.NumberFormat('fa-IR').format(t.amount)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    <div className="flex flex-col">
                      <span>{new Date(t.date).toLocaleDateString('fa-IR', { calendar: 'persian' })}</span>
                      {t.time && <span className="text-xs opacity-70" dir="ltr">{t.time}</span>}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-white">
                    {t.accountId ? accounts?.find(a => a.id === t.accountId)?.name : (t.card || '-')}
                  </td>
                  <td className="px-6 py-4 text-white">
                    {t.projectId ? projects?.find(p => p.id === t.projectId)?.name : ''}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingId(t.id!); setShowForm(false); }} className="p-1.5 text-white hover:text-white hover:bg-blue-500/10 rounded-lg transition-colors" title="ویرایش">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={(e) => handleDuplicate(e, t)} className="p-1.5 text-white hover:text-white hover:bg-emerald-500/10 rounded-lg transition-colors" title="کپی">
                        <Copy size={16} />
                      </button>
                      <button onClick={(e) => handleDelete(e, t.id)} className={`p-1.5 transition-colors rounded-lg ${deleteConfirmId === t.id ? 'bg-rose-500 text-white hover:bg-rose-600' : 'text-white hover:text-white hover:bg-rose-500/10'}`} title="حذف">
                        {deleteConfirmId === t.id ? <span className="text-[10px] font-bold px-1">حذف؟</span> : <Trash2 size={16} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TransactionForm({ type, onClose, projects, categories, accounts, initialData }: any) {
  const [formData, setFormData] = useState({
    amount: initialData?.amount?.toString() || '',
    description: initialData?.description || '',
    accountId: initialData?.accountId?.toString() || '',
    card: initialData?.card || '',
    date: initialData?.date || new Date().toISOString().split('T')[0],
    time: initialData?.time || new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
    projectId: initialData?.projectId?.toString() || '',
    categoryId: initialData?.categoryId?.toString() || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) return;

    const dataToSave = {
      type,
      amount: Number(formData.amount),
      description: formData.description,
      accountId: formData.accountId ? Number(formData.accountId) : undefined,
      card: formData.card,
      date: formData.date,
      time: formData.time,
      projectId: formData.projectId ? Number(formData.projectId) : undefined,
      categoryId: formData.categoryId ? Number(formData.categoryId) : undefined,
    };

    if (initialData?.id) {
      await db.transactions.update(initialData.id, dataToSave);
    } else {
      await db.transactions.add({
        ...dataToSave,
        createdAt: new Date().toISOString()
      });
    }
    onClose();
  };

  return (
    <div className="bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-700 mb-6">
      <h3 className="text-lg font-bold text-white mb-4">{initialData ? 'ویرایش' : 'ثبت'} {type === 'income' ? 'درآمد' : 'هزینه'} {initialData ? '' : 'جدید'}</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-white mb-1">مبلغ (تومان) *</label>
          <input required type="number" value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" dir="ltr" />
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-1">بابت (توضیحات) *</label>
          <input required type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-1">تاریخ *</label>
          <DatePicker
            calendar={persian}
            locale={persian_fa}
            value={new Date(formData.date)}
            onChange={(date: DateObject | null) => {
              if (date) {
                setFormData({...formData, date: date.toDate().toISOString().split('T')[0]});
              }
            }}
            containerClassName="w-full"
            inputClass="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-1">ساعت</label>
          <input
            type="time"
            value={formData.time}
            onChange={e => setFormData({...formData, time: e.target.value})}
            className="w-full px-3 py-2 border border-slate-700 bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none" dir="ltr"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-1">حساب مبدأ/مقصد</label>
          <select value={formData.accountId} onChange={e => setFormData({...formData, accountId: e.target.value})} className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-800">
            <option value="">-- انتخاب حساب --</option>
            {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-1">پروژه</label>
          <select value={formData.projectId} onChange={e => setFormData({...formData, projectId: e.target.value})} className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-800">
            <option value="">-- انتخاب پروژه --</option>
            {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-white mb-1">دسته‌بندی</label>
          <select value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} className="w-full px-3 py-2 border border-slate-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-slate-800">
            <option value="">-- انتخاب دسته‌بندی --</option>
            {categories.filter((c:any) => c.type === type || c.type === 'both').map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="col-span-full flex justify-end space-x-2 space-x-reverse mt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-white hover:bg-slate-900 rounded-lg transition-colors">انصراف</button>
          <button type="submit" className="px-4 py-2 bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)] text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">ذخیره</button>
        </div>
      </form>
    </div>
  );
}
