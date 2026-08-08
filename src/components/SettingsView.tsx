import React, { useState } from 'react';
import { db } from '../db';
import { Download, Upload, Trash2, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

export default function SettingsView() {
  const [isImporting, setIsImporting] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [parsedTrans, setParsedTrans] = useState<any[] | null>(null);

  const exportData = async () => {
    try {
      const transactions = await db.transactions.toArray();
      const projects = await db.projects.toArray();
      const categories = await db.categories.toArray();

      const data = { transactions, projects, categories };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `accounting_backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('خطا در تهیه نسخه پشتیبان');
    }
  };

  const exportExcel = async () => {
    try {
      const transactions = await db.transactions.toArray();
      const projects = await db.projects.toArray();
      const categories = await db.categories.toArray();
      const accounts = await db.accounts.toArray();

      // Calculate account balances
      const accountBalances = accounts.map(a => {
        const aTrans = transactions.filter(t => t.accountId === a.id);
        const inc = aTrans.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const exp = aTrans.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        return { name: a.name, balance: a.initialBalance + inc - exp };
      });
      
      // Calculate category totals
      const incomeTotals: Record<string, number> = {};
      const expenseTotals: Record<string, number> = {};
      
      transactions.forEach(t => {
        const catName = t.categoryId ? (categories.find(c => c.id === t.categoryId)?.name || 'سایر') : 'سایر';
        if (t.type === 'income') {
          incomeTotals[catName] = (incomeTotals[catName] || 0) + t.amount;
        } else {
          expenseTotals[catName] = (expenseTotals[catName] || 0) + t.amount;
        }
      });
      
      const incomeRows = Object.entries(incomeTotals).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
      const expenseRows = Object.entries(expenseTotals).map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
      
      const maxRows = Math.max(incomeRows.length, expenseRows.length, accountBalances.length);
      
      const aoa: any[][] = [];
      aoa.push(['درآمدهای ماه جاری', '', '', 'هزینه‌های ماه جاری', '', '', 'موجودی بانک‌ها', '']);
      aoa.push(['شرح', 'مبلغ (تومان)', '', 'شرح', 'مبلغ (تومان)', '', 'حساب', 'مبلغ (تومان)']);
      
      let totalIncome = 0;
      let totalExpense = 0;
      let totalBalance = 0;

      for (let i = 0; i < maxRows; i++) {
        const row: any[] = [];
        
        if (i < incomeRows.length) {
          row.push(incomeRows[i].name, incomeRows[i].amount);
          totalIncome += incomeRows[i].amount;
        } else {
          row.push('', '');
        }
        
        row.push('');
        
        if (i < expenseRows.length) {
          row.push(expenseRows[i].name, expenseRows[i].amount);
          totalExpense += expenseRows[i].amount;
        } else {
          row.push('', '');
        }
        
        row.push('');
        
        if (i < accountBalances.length) {
          row.push(accountBalances[i].name, accountBalances[i].balance);
          totalBalance += accountBalances[i].balance;
        } else {
          row.push('', '');
        }
        
        aoa.push(row);
      }
      
      aoa.push([
        'جمع درآمدهای ماه', totalIncome, '', 
        'جمع هزینه‌های ماه', totalExpense, '', 
        'جمع موجودی کل', totalBalance
      ]);
      
      const wb = XLSX.utils.book_new();
      
      // Main Summary Sheet
      const wsSummary = XLSX.utils.aoa_to_sheet(aoa);
      wsSummary['!views'] = [{ rightToLeft: true }];
      // Adjust column widths
      wsSummary['!cols'] = [
        { wch: 25 }, { wch: 15 }, { wch: 2 }, 
        { wch: 25 }, { wch: 15 }, { wch: 2 }, 
        { wch: 25 }, { wch: 15 }
      ];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'گزارش تجمیعی');

      // Transactions Sheet
      const excelTransactions = transactions.map(t => {
        const project = projects.find(p => p.id === t.projectId)?.name || '';
        const category = categories.find(c => c.id === t.categoryId)?.name || '';
        const account = accounts.find(a => a.id === t.accountId)?.name || t.card || '';
        
        return {
          'نوع': t.type === 'income' ? 'درآمد' : 'هزینه',
          'مبلغ (تومان)': t.amount,
          'بابت': t.description,
          'تاریخ': new Date(t.date).toLocaleDateString('fa-IR', { calendar: 'persian' }),
          'حساب/کارت': account,
          'پروژه': project,
          'دسته‌بندی': category
        };
      });

      const wsTrans = XLSX.utils.json_to_sheet(excelTransactions);
      wsTrans['!views'] = [{ rightToLeft: true }];
      XLSX.utils.book_append_sheet(wb, wsTrans, 'ریز تراکنش‌ها');

      const wsProj = XLSX.utils.json_to_sheet(projects.map(p => ({
        'نام پروژه': p.name,
        'کارفرما': p.employer,
        'تاریخ شروع': new Date(p.startDate).toLocaleDateString('fa-IR', { calendar: 'persian' }),
        'بودجه': p.budget,
        'وضعیت': p.status === 'active' ? 'فعال' : p.status === 'completed' ? 'تکمیل' : 'متوقف'
      })));
      wsProj['!views'] = [{ rightToLeft: true }];
      XLSX.utils.book_append_sheet(wb, wsProj, 'پروژه‌ها');

      const wsAccounts = XLSX.utils.json_to_sheet(accountBalances.map(a => ({
        'نام حساب': a.name,
        'موجودی فعلی': a.balance
      })));
      wsAccounts['!views'] = [{ rightToLeft: true }];
      XLSX.utils.book_append_sheet(wb, wsAccounts, 'حساب‌ها');

      XLSX.writeFile(wb, `accounting_export_${new Date().toLocaleDateString('fa-IR', { calendar: 'persian' }).replace(/\//g, '-')}.xlsx`);
    } catch (err) {
      alert('خطا در تهیه خروجی اکسل');
      console.error(err);
    }
  };

  const importExcelData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        // Use the first sheet or 'ریز تراکنش‌ها'
        const sheetName = workbook.SheetNames.includes('ریز تراکنش‌ها') ? 'ریز تراکنش‌ها' : workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const csvData = XLSX.utils.sheet_to_csv(sheet);
        
        const projects = await db.projects.toArray();
        const accounts = await db.accounts.toArray();
        const categories = await db.categories.toArray();

        const response = await fetch('/api/parse-excel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ csvData, projects, accounts })
        });
        
        if (!response.ok) throw new Error('Network error');
        
        const parsedTransactions = await response.json();
        
        if (parsedTransactions && parsedTransactions.length > 0) {
           const mappedTrans = parsedTransactions.map((t: any) => {
              const matchedProject = projects.find(p => p.name === t.project);
              const matchedAccount = accounts.find(a => a.name === t.account);
              const matchedCategory = categories.find(c => c.name === t.category);
              
              let dateIso = new Date().toISOString();
              try {
                if (t.date) {
                  dateIso = new Date(t.date).toISOString();
                }
              } catch(e) {}

              return {
                 type: t.type === 'income' ? 'income' : 'expense',
                 amount: Number(t.amount) || 0,
                 description: t.description || 'تراکنش وارد شده',
                 date: dateIso,
                 accountId: matchedAccount?.id,
                 projectId: matchedProject?.id,
                 categoryId: matchedCategory?.id
              };
           });
           
              setParsedTrans(mappedTrans);
        } else {
           setImportMessage('هیچ تراکنشی از فایل استخراج نشد. لطفا ساختار فایل را بررسی کنید.');
           setTimeout(() => setImportMessage(''), 5000);
        }
      } catch (err) {
        setImportMessage('خطا در پردازش فایل اکسل');
        console.error(err);
        setTimeout(() => setImportMessage(''), 5000);
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const clearAll = async () => {
    if (confirmClear) {
      try {
        await db.transaction('rw', db.transactions, db.accounts, async () => {
          const allTransactions = await db.transactions.toArray();
          const allAccounts = await db.accounts.toArray();
          
          for (const a of allAccounts) {
            if (!a.id) continue;
            const aTrans = allTransactions.filter(t => t.accountId === a.id);
            const income = aTrans.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
            const expense = aTrans.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
            const currentBalance = Number(a.initialBalance || 0) + income - expense;
            await db.accounts.update(a.id, { initialBalance: currentBalance });
          }
          
          await db.transactions.clear();
        });
        window.location.reload();
      } catch (err) {
        console.error(err);
      }
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 3000);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6">
      <h1 className="text-2xl font-bold text-white">تنظیمات سیستم</h1>

      <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700 p-6 space-y-8">
        
        <div>
          <h2 className="text-lg font-bold text-white mb-2">تهیه نسخه پشتیبان (Backup)</h2>
          <p className="text-white text-sm mb-4">تمامی داده‌های شما در قالب یک فایل JSON یا اکسل ذخیره می‌شود. پیشنهاد می‌شود به صورت دوره‌ای پشتیبان بگیرید.</p>
          <div className="flex flex-wrap gap-4">
            <button onClick={exportData} className="flex items-center space-x-2 space-x-reverse bg-blue-500/10 text-white px-6 py-3 rounded-xl hover:bg-blue-500/20 transition-colors font-medium">
              <Download size={20} />
              <span>دانلود فایل پشتیبان (JSON)</span>
            </button>
            <button onClick={exportExcel} className="flex items-center space-x-2 space-x-reverse bg-emerald-500/10 text-white px-6 py-3 rounded-xl hover:bg-emerald-500/20 transition-colors font-medium">
              <FileSpreadsheet size={20} />
              <span>خروجی اکسل (Excel)</span>
            </button>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-8">
          <h2 className="text-lg font-bold text-white mb-2">وارد کردن تراکنش‌ها از فایل اکسل (هوشمند)</h2>
          <p className="text-white text-sm mb-4">می‌توانید فایل‌های اکسل ماه قبل را مستقیما در نرم‌افزار بارگذاری کنید. هوش مصنوعی ما تراکنش‌ها، مبالغ و تاریخ‌ها را استخراج کرده و به صورت هوشمند به پروژه‌ها و حساب‌ها متصل می‌کند.</p>
          
          <div className="bg-blue-500/10 border border-blue-100 rounded-xl p-4 mb-4">
            <h3 className="text-sm font-bold text-white mb-2">فرمت فایل قابل قبول:</h3>
            <p className="text-sm text-white mb-2">فایل شما بهتر است حاوی ستون‌های "تاریخ"، "شرح" و "مبلغ" باشد. (مانند تصویر یا فایل‌های خروجی همین نرم‌افزار). هوش مصنوعی موارد دیگر را تشخیص می‌دهد.</p>
            <div className="overflow-x-auto text-xs bg-slate-800 rounded-lg p-2 border border-blue-100">
              <table className="w-full text-right">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="px-2 py-1">تاریخ</th>
                    <th className="px-2 py-1">شرح</th>
                    <th className="px-2 py-1">مبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-2 py-1 border-b border-slate-700">۱۴۰۳/۰۵/۰۱</td>
                    <td className="px-2 py-1 border-b border-slate-700">سینک هود گاز نیکخواه</td>
                    <td className="px-2 py-1 border-b border-slate-700">۵۶۲,۰۰۰,۰۰۰</td>
                  </tr>
                  <tr>
                    <td className="px-2 py-1">۱۴۰۳/۰۵/۰۶</td>
                    <td className="px-2 py-1">روکوبی واحدها</td>
                    <td className="px-2 py-1">۸۶,۰۰۰,۰۰۰</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <label className={`flex items-center justify-center space-x-2 space-x-reverse border-2 border-dashed border-slate-300 text-white px-6 py-8 rounded-xl hover:bg-slate-900 hover:border-slate-400 transition-all cursor-pointer font-medium ${isImporting ? 'bg-slate-900 opacity-70 cursor-not-allowed' : 'bg-slate-900'}`}>
            <Upload size={24} />
            <span>{isImporting ? 'در حال پردازش هوش مصنوعی...' : 'انتخاب فایل اکسل (.xlsx)'}</span>
            <input type="file" accept=".xlsx, .xls" onChange={importExcelData} disabled={isImporting} className="hidden" />
          </label>
          
          {importMessage && (
            <div className="mt-4 p-4 rounded-xl bg-slate-800 border border-slate-700 text-center">
              <span className="text-white font-medium">{importMessage}</span>
            </div>
          )}

          {parsedTrans && parsedTrans.length > 0 && (
            <div className="mt-6 bg-slate-800 p-6 rounded-xl border border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              <h3 className="text-lg font-bold text-white mb-2">
                {parsedTrans.length} تراکنش با موفقیت استخراج شد
              </h3>
              <p className="text-sm text-white mb-4">آیا مایل به ذخیره این اطلاعات در سیستم هستید؟</p>
              <div className="flex gap-4">
                <button 
                  onClick={async () => { 
                    await db.transactions.bulkAdd(parsedTrans); 
                    window.location.reload(); 
                  }} 
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors"
                >
                  بله، ذخیره کن
                </button>
                <button 
                  onClick={() => setParsedTrans(null)} 
                  className="flex-1 py-3 bg-slate-700 text-white rounded-xl hover:bg-slate-600 font-medium transition-colors"
                >
                  لغو
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-700 pt-8">
          <h2 className="text-lg font-bold text-white mb-2">حذف تراکنش‌ها و شروع ماه جدید</h2>
          <p className="text-white text-sm mb-4">با این کار تمام تراکنش‌ها پاک می‌شوند، اما حساب‌ها، پروژه‌ها و دسته‌بندی‌ها باقی می‌مانند. موجودی فعلی حساب‌ها نیز به عنوان موجودی اولیه ماه جدید ذخیره می‌شود.</p>
          <button onClick={clearAll} className={`flex items-center space-x-2 space-x-reverse px-6 py-3 rounded-xl transition-colors font-medium ${confirmClear ? 'bg-rose-600 text-white hover:bg-rose-700' : 'bg-rose-500/10 text-white hover:bg-rose-500/20'}`}>
            <Trash2 size={20} />
            <span>{confirmClear ? 'مطمئن هستید؟ (پاک کردن نهایی)' : 'حذف تراکنش‌ها'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
