import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LayoutDashboard, Receipt, Wallet, Mic, FolderKanban, Tags, BarChart3, Settings, CreditCard } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import VoiceAssistant from './components/VoiceAssistant';
import Projects from './components/Projects';
import Categories from './components/Categories';
import Reports from './components/Reports';
import SettingsView from './components/SettingsView';
import Accounts from './components/Accounts';

type Tab = 'voice' | 'dashboard' | 'expenses' | 'income' | 'projects' | 'categories' | 'accounts' | 'reports' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('voice');

  const tabs = [
    { id: 'voice', label: 'دستیار صوتی', icon: Mic },
    { id: 'dashboard', label: 'داشبورد', icon: LayoutDashboard },
    { id: 'expenses', label: 'هزینه‌ها', icon: Receipt },
    { id: 'income', label: 'درآمدها', icon: Wallet },
    { id: 'projects', label: 'پروژه‌ها', icon: FolderKanban },
    { id: 'categories', label: 'دسته‌بندی‌ها', icon: Tags },
    { id: 'accounts', label: 'کارت‌ها و حساب‌ها', icon: CreditCard },
    { id: 'reports', label: 'گزارش‌ها', icon: BarChart3 },
    { id: 'settings', label: 'تنظیمات', icon: Settings },
  ] as const;

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'expenses': return <Transactions type="expense" />;
      case 'income': return <Transactions type="income" />;
      case 'voice': return <VoiceAssistant />;
      case 'projects': return <Projects />;
      case 'categories': return <Categories />;
      case 'accounts': return <Accounts />;
      case 'reports': return <Reports />;
      case 'settings': return <SettingsView />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col font-sans antialiased text-white pb-20" dir="rtl">
      {/* Header */}
      <header className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 sm:px-8 shadow-sm shrink-0 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)] rounded-lg flex items-center justify-center text-white font-bold text-xl">ح</div>
          <span className="text-xl font-bold tracking-tight text-white">حسابدار من</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 flex flex-col gap-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>
      
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 z-50 flex items-center px-2 py-2 overflow-x-auto shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] hide-scrollbar">
        <div className="flex w-full justify-between sm:justify-center sm:gap-6 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex flex-col items-center justify-center min-w-[4.5rem] px-2 py-1 gap-1 rounded-xl transition-all duration-300 ${
                activeTab === tab.id
                  ? 'text-blue-400 font-bold bg-slate-900 shadow-[0_0_15px_rgba(59,130,246,0.3)] scale-105'
                  : 'text-slate-400 hover:bg-slate-900 hover:text-blue-300'
              }`}
            >
              <tab.icon size={20} className={activeTab === tab.id ? 'stroke-[2.5px] drop-shadow-[0_0_10px_rgba(96,165,250,0.9)]' : 'stroke-2'} />
              <span className="text-[10px] whitespace-nowrap mt-1">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
