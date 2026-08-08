import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Wallet, TrendingUp, TrendingDown, Briefcase, CreditCard, X } from 'lucide-react';

export default function Dashboard() {
  const [search, setSearch] = useState('');
  const [showAccountsModal, setShowAccountsModal] = useState(false);
  const [showTodayTransModal, setShowTodayTransModal] = useState(false);

  const transactions = useLiveQuery(() => db.transactions.toArray());
  const projects = useLiveQuery(() => db.projects.toArray());
  const accounts = useLiveQuery(() => db.accounts.toArray());

  if (!transactions || !projects || !accounts) return <div className="text-center p-8 text-white">در حال بارگذاری...</div>;

  const totalInitialBalances = accounts.reduce((sum, a) => sum + (a.initialBalance || 0), 0);
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balance = totalInitialBalances + totalIncome - totalExpense;

  const today = new Date().toISOString().split('T')[0];
  const todayIncome = transactions.filter(t => t.type === 'income' && t.date.startsWith(today)).reduce((sum, t) => sum + t.amount, 0);
  const todayExpense = transactions.filter(t => t.type === 'expense' && t.date.startsWith(today)).reduce((sum, t) => sum + t.amount, 0);
  
  const activeProjects = projects.filter(p => p.status === 'active').length;

  const getAccountBalance = (accountId: number, initialBalance: number) => {
    if (!transactions) return initialBalance;
    const aTrans = transactions.filter(t => t.accountId === accountId);
    const income = aTrans.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = aTrans.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return initialBalance + income - expense;
  };

  const recentTransactions = transactions
    .filter(t => {
      if (!search) return true;
      const s = search.toLowerCase();
      const matchDesc = t.description?.toLowerCase().includes(s);
      const matchCard = t.card?.toLowerCase().includes(s);
      const accountName = t.accountId ? accounts.find(a => a.id === t.accountId)?.name?.toLowerCase() : '';
      const matchAccount = accountName?.includes(s);
      return matchDesc || matchCard || matchAccount;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, search ? undefined : 5);

  const formatCurrency = (val: number) => new Intl.NumberFormat('fa-IR').format(val) + ' تومان';

  const cards = [
    { title: 'موجودی کل', value: formatCurrency(balance), icon: Wallet, color: 'text-blue-500', bg: 'bg-blue-500/10', onClick: () => setShowAccountsModal(true) },
    { title: 'درآمد امروز', value: formatCurrency(todayIncome), icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10', onClick: () => setShowTodayTransModal(true) },
    { title: 'هزینه امروز', value: formatCurrency(todayExpense), icon: TrendingDown, color: 'text-rose-500', bg: 'bg-rose-500/10', onClick: () => setShowTodayTransModal(true) },
    { title: 'پروژه‌های فعال', value: new Intl.NumberFormat('fa-IR').format(activeProjects), icon: Briefcase, color: 'text-indigo-400', bg: 'bg-indigo-500/10', onClick: undefined },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">داشبورد</h1>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => (
          <div 
            key={idx} 
            onClick={card.onClick}
            className={`bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-700 flex flex-col justify-between ${card.onClick ? 'cursor-pointer hover:border-blue-300 hover:shadow-md transition-all' : ''}`}
          >
            <div className="flex justify-between items-start">
              <span className={`text-sm font-medium text-white`}>{card.title}</span>
              <card.icon size={18} className={'text-white'} />
            </div>
            <div className="flex flex-col mt-2">
              <span className={`text-2xl font-bold ${idx === 2 ? 'text-white' : 'text-white'}`}>{card.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-800 flex-1 rounded-xl shadow-sm border border-slate-700 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-bold text-white">تراکنش‌های اخیر</h3>
          <div className="relative flex items-center w-full sm:w-auto">
            <input 
              type="text" 
              placeholder="جستجوی سریع..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-slate-900 border-none rounded-lg py-1.5 px-4 pr-10 text-sm w-full sm:w-64 focus:ring-2 focus:ring-blue-500 outline-none" 
            />
            <svg className="w-4 h-4 absolute right-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-right">
            <thead className="bg-slate-900 text-white text-xs uppercase sticky top-0">
              <tr className="border-b border-slate-700">
                <th className="px-6 py-3 font-semibold">بابت (توضیحات)</th>
                <th className="px-6 py-3 font-semibold text-left">مبلغ (تومان)</th>
                <th className="px-6 py-3 font-semibold">تاریخ</th>
                <th className="px-6 py-3 font-semibold">کارت / حساب</th>
                <th className="px-6 py-3 font-semibold">نوع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-white">تراکنشی یافت نشد</td>
                </tr>
              ) : recentTransactions.map(t => (
                <tr key={t.id} className="hover:bg-slate-900 transition-colors">
                  <td className="px-6 py-4 font-medium text-white">{t.description}</td>
                  <td className="px-6 py-4 text-left font-bold" dir="ltr">
                    <span className={t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}>
                      {t.type === 'income' ? '+' : '-'}{new Intl.NumberFormat('fa-IR').format(t.amount)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">{new Date(t.date).toLocaleDateString('fa-IR', { calendar: 'persian' })}</td>
                  <td className="px-6 py-4 text-slate-300">{t.accountId ? accounts.find(a => a.id === t.accountId)?.name : (t.card || '-')}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                      {t.type === 'income' ? 'درآمد' : 'هزینه'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Accounts */}
      {showAccountsModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 w-full max-w-xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900">
              <h3 className="font-bold text-white">وضعیت حساب‌ها</h3>
              <button onClick={() => setShowAccountsModal(false)} className="text-white hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {accounts.length === 0 && <p className="text-center text-white py-4">حسابی یافت نشد.</p>}
              {accounts.map(a => {
                const bal = getAccountBalance(a.id!, a.initialBalance);
                return (
                  <div key={a.id} className="flex justify-between items-center p-3 border border-slate-700 rounded-xl hover:bg-slate-900 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-blue-500/10 text-white rounded flex items-center justify-center"><Wallet size={16} /></div>
                      <div>
                        <div className="font-bold text-sm text-white">{a.name}</div>
                        <div className="text-xs text-white font-mono" dir="ltr">{a.accountNumber || '---'}</div>
                      </div>
                    </div>
                    <div className={`font-bold ${bal >= 0 ? 'text-white' : 'text-white'}`} dir="ltr">
                      {formatCurrency(bal)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Today's Transactions */}
      {showTodayTransModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900">
              <h3 className="font-bold text-white">تراکنش‌های امروز</h3>
              <button onClick={() => setShowTodayTransModal(false)} className="text-white hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-0 overflow-y-auto flex-1">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-900 text-white text-xs sticky top-0 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3 font-semibold">بابت</th>
                    <th className="px-4 py-3 font-semibold text-left">مبلغ (تومان)</th>
                    <th className="px-4 py-3 font-semibold">حساب</th>
                    <th className="px-4 py-3 font-semibold">نوع</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {transactions.filter(t => t.date.startsWith(today)).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-white">تراکنشی برای امروز ثبت نشده است</td>
                    </tr>
                  ) : transactions.filter(t => t.date.startsWith(today)).map(t => (
                    <tr key={t.id} className="hover:bg-slate-900">
                      <td className="px-4 py-3 font-medium text-white">{t.description}</td>
                      <td className="px-4 py-3 text-left font-bold" dir="ltr">
                        <span className={t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}>
                          {t.type === 'income' ? '+' : '-'}{new Intl.NumberFormat('fa-IR').format(t.amount)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-300">{t.accountId ? accounts.find(a => a.id === t.accountId)?.name : (t.card || '-')}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                          {t.type === 'income' ? 'درآمد' : 'هزینه'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
