import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Plus, Trash2, Download, X, Search, Edit2 } from 'lucide-react';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';
import * as XLSX from 'xlsx';

export default function Projects() {
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', employer: '', startDate: new Date().toISOString().split('T')[0], budget: '' });
  
  const projects = useLiveQuery(() => db.projects.toArray());
  const transactions = useLiveQuery(() => db.transactions.toArray());
  const categories = useLiveQuery(() => db.categories.toArray());
  const accounts = useLiveQuery(() => db.accounts.toArray());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await db.projects.update(editingId, {
        name: formData.name,
        employer: formData.employer,
        startDate: formData.startDate,
        budget: Number(formData.budget)
      });
    } else {
      await db.projects.add({
        name: formData.name,
        employer: formData.employer,
        startDate: formData.startDate,
        budget: Number(formData.budget),
        status: 'active'
      });
    }
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', employer: '', startDate: new Date().toISOString().split('T')[0], budget: '' });
  };

  const handleEdit = (e: React.MouseEvent, p: any) => {
    e.stopPropagation();
    setFormData({
      name: p.name,
      employer: p.employer,
      startDate: p.startDate,
      budget: String(p.budget)
    });
    setEditingId(p.id!);
    setShowForm(true);
  };

  const getProjectStats = (projectId: number) => {
    if (!transactions) return { income: 0, expense: 0 };
    const pTrans = transactions.filter(t => t.projectId === projectId);
    const income = pTrans.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = pTrans.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense };
  };


  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const handleDelete = async (e: React.MouseEvent, id?: number) => {
    e.preventDefault();
    e.stopPropagation();
    if(id) {
      if (deleteConfirmId === id) {
        await db.projects.delete(id);
        setDeleteConfirmId(null);
      } else {
        setDeleteConfirmId(id);
        setTimeout(() => setDeleteConfirmId(null), 3000);
      }
    }
  };

  const exportProjectExcel = (project: any) => {
    if (!transactions || !categories || !accounts) return;

    const pTrans = transactions.filter(t => t.projectId === project.id);
    
    // Sort by date ascending
    const sortedTrans = [...pTrans].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const excelData = sortedTrans.map(t => {
      return {
        'تاریخ': new Date(t.date).toLocaleDateString('fa-IR', { calendar: 'persian', year: 'numeric', month: '2-digit', day: '2-digit' }),
        'شرح': t.description,
        'مبلغ': t.amount
      };
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);
    
    // Set right to left and adjust column widths
    ws['!views'] = [{ rightToLeft: true }];
    ws['!cols'] = [
      { wch: 15 }, // تاریخ
      { wch: 40 }, // شرح
      { wch: 20 }  // مبلغ
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'تراکنش‌ها');
    
    XLSX.writeFile(wb, `پروژه_${project.name}_${new Date().toLocaleDateString('fa-IR', { calendar: 'persian' }).replace(/\//g, '-')}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">مدیریت پروژه‌ها</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)] text-white px-4 py-2 rounded-xl flex items-center space-x-2 space-x-reverse">
          <Plus size={20} /><span>افزودن پروژه</span>
        </button>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-white" size={20} />
        <input 
          type="text" 
          placeholder="جستجو در پروژه‌ها..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-4 pr-10 py-3 bg-slate-800 border border-slate-700 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
        />
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div><label className="block text-sm mb-1">نام پروژه</label><input required value={formData.name} onChange={e=>setFormData({...formData, name:e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
          <div><label className="block text-sm mb-1">کارفرما</label><input required value={formData.employer} onChange={e=>setFormData({...formData, employer:e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
          <div>
            <label className="block text-sm mb-1">تاریخ شروع</label>
            <DatePicker
              calendar={persian}
              locale={persian_fa}
              value={new Date(formData.startDate)}
              onChange={(date: DateObject | null) => {
                if (date) {
                  setFormData({...formData, startDate: date.toDate().toISOString().split('T')[0]});
                }
              }}
              containerClassName="w-full"
              inputClass="w-full px-3 py-2 border border-slate-700 rounded-lg outline-none"
            />
          </div>
          <div><label className="block text-sm mb-1">بودجه اولیه</label><input type="number" required value={formData.budget} onChange={e=>setFormData({...formData, budget:e.target.value})} className="w-full px-3 py-2 border rounded-lg" /></div>
          <div className="col-span-full flex justify-end"><button type="submit" className="bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)] text-white px-6 py-2 rounded-lg">ثبت پروژه</button></div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects?.filter(p => !search || p.name.includes(search) || p.employer.includes(search)).map(p => {
          const stats = getProjectStats(p.id!);
          return (
            <div key={p.id} onClick={() => setSelectedProjectId(p.id!)} className="bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-700 relative group cursor-pointer hover:shadow-md transition-shadow">
              <div className="absolute top-4 left-4 flex gap-2">
                <button onClick={(e) => handleEdit(e, p)} className="text-white hover:text-white transition-colors" title="ویرایش پروژه">
                  <Edit2 size={18} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); exportProjectExcel(p); }} className="text-white hover:text-white transition-colors" title="خروجی اکسل این پروژه">
                  <Download size={18} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(e, p.id); }} className={`transition-colors px-2 py-1 rounded ${deleteConfirmId === p.id ? 'bg-rose-500 text-white' : 'text-white hover:text-white'}`} title="حذف پروژه">
                  {deleteConfirmId === p.id ? <span className="text-xs font-bold">حذف؟</span> : <Trash2 size={18} />}
                </button>
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{p.name}</h3>
              <p className="text-sm text-white mb-2">کارفرما: {p.employer}</p>
              <p className="text-xs text-white mb-4">شروع: {new Date(p.startDate).toLocaleDateString('fa-IR', { calendar: 'persian' })}</p>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between pb-2 border-b border-slate-700">
                  <span className="text-white">بودجه:</span>
                  <span className="font-semibold text-blue-400">{new Intl.NumberFormat('fa-IR').format(p.budget)} تومان</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-700">
                  <span className="text-white">هزینه‌ها:</span>
                  <span className="font-semibold text-rose-400">{new Intl.NumberFormat('fa-IR').format(stats.expense)}</span>
                </div>
                <div className="flex justify-between pb-2 border-b border-slate-700">
                  <span className="text-white">درآمدها:</span>
                  <span className="font-semibold text-emerald-400">{new Intl.NumberFormat('fa-IR').format(stats.income)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedProjectId && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
              <h3 className="font-bold text-lg text-white">
                تراکنش‌های پروژه {projects?.find(p => p.id === selectedProjectId)?.name}
              </h3>
              <button onClick={() => setSelectedProjectId(null)} className="p-2 text-white hover:text-white hover:bg-slate-900 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-0 overflow-y-auto flex-1">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-900 text-white sticky top-0">
                  <tr>
                    <th className="px-6 py-4 font-medium">تاریخ</th>
                    <th className="px-6 py-4 font-medium">نوع</th>
                    <th className="px-6 py-4 font-medium">مبلغ (تومان)</th>
                    <th className="px-6 py-4 font-medium">شرح</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions?.filter(t => t.projectId === selectedProjectId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => (
                    <tr key={t.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="px-6 py-4 text-white">{new Date(t.date).toLocaleDateString('fa-IR', { calendar: 'persian', year: 'numeric', month: '2-digit', day: '2-digit' })}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium ${
                          t.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {t.type === 'income' ? 'درآمد' : 'هزینه'}
                        </span>
                      </td>
                      <td className={`px-6 py-4 font-medium ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {new Intl.NumberFormat('fa-IR').format(t.amount)}
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {t.description}
                      </td>
                    </tr>
                  ))}
                  {transactions?.filter(t => t.projectId === selectedProjectId).length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-white">
                        هیچ تراکنشی برای این پروژه یافت نشد
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
