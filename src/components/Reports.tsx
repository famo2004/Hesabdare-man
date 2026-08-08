import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Reports() {
  const transactions = useLiveQuery(() => db.transactions.toArray());
  const categories = useLiveQuery(() => db.categories.toArray());

  if (!transactions || !categories) return <div className="text-center p-8">در حال بارگذاری...</div>;

  // Monthly Data
  const monthlyMap = new Map();
  transactions.forEach(t => {
    const monthStr = t.date.substring(0, 7);
    if (!monthlyMap.has(monthStr)) {
      const parts = monthStr.split('-');
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1);
      const shamsiMonth = d.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', calendar: 'persian' });
      monthlyMap.set(monthStr, { name: shamsiMonth, raw: monthStr, income: 0, expense: 0, profit: 0 });
    }
    const data = monthlyMap.get(monthStr);
    if (t.type === 'income') data.income += t.amount;
    else data.expense += t.amount;
    data.profit = data.income - data.expense;
  });
  const monthlyData = Array.from(monthlyMap.values()).sort((a,b) => a.raw.localeCompare(b.raw)).slice(-6);

  // Category Expense Data
  const catExpenseMap = new Map();
  transactions.filter(t => t.type === 'expense').forEach(t => {
    const catName = t.categoryId ? (categories.find(c => c.id === t.categoryId)?.name || 'نامشخص') : 'نامشخص';
    catExpenseMap.set(catName, (catExpenseMap.get(catName) || 0) + t.amount);
  });
  const catData = Array.from(catExpenseMap.entries()).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 5);
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-700 text-sm">
          <p className="font-bold mb-2">{label}</p>
          {payload.map((p: any, idx: number) => (
            <p key={idx} style={{ color: p.color }}>
              {p.name}: {new Intl.NumberFormat('fa-IR').format(p.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">گزارش‌ها و نمودارها</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-700">
          <h3 className="text-lg font-bold mb-6 text-white">عملکرد ۶ ماه اخیر</h3>
          <div className="h-80 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val) => `${val / 1000000}M`} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="income" name="درآمد" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="expense" name="هزینه" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-700">
          <h3 className="text-lg font-bold mb-6 text-white">بیشترین هزینه‌ها به تفکیک دسته</h3>
          <div className="h-80 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={catData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {catData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => new Intl.NumberFormat('fa-IR').format(value) + ' تومان'} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-2">
            {catData.map((entry, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                <span>{entry.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
