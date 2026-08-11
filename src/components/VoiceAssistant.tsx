import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Check, X, Loader2 } from 'lucide-react';
import { db } from '../db';
import { motion, AnimatePresence } from 'motion/react';
import { useLiveQuery } from 'dexie-react-hooks';
import DatePicker, { DateObject } from 'react-multi-date-picker';
import persian from 'react-date-object/calendars/persian';
import persian_fa from 'react-date-object/locales/persian_fa';

export default function VoiceAssistant() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [error, setError] = useState('');

  const accounts = useLiveQuery(() => db.accounts.toArray());
  const projects = useLiveQuery(() => db.projects.toArray());
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (parsedData && (accounts || projects)) {
      let changed = false;
      const updated = parsedData.map(item => {
        let newItem = { ...item };
        
        if (item.card && !item.accountId && accounts) {
          const match = accounts.find(a => item.card.includes(a.name) || a.name.includes(item.card));
          if (match) {
            changed = true;
            newItem.accountId = match.id;
          }
        }
        
        if (item.project && !item.projectId && projects) {
          const match = projects.find(p => item.project.includes(p.name) || p.name.includes(item.project));
          if (match) {
            changed = true;
            newItem.projectId = match.id;
          }
        }
        
        return newItem;
      });

      if (changed) {
        setParsedData(updated);
      }
    }
  }, [parsedData, accounts, projects]);

  const startRecording = async () => {
    setError('');
    setParsedData(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      setError('دسترسی به میکروفون داده نشد. لطفاً دسترسی میکروفون را در مرورگر خود فعال کنید یا برنامه را در یک تب جدید باز کنید.');
      console.error('Mic error:', err);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    
    if (mediaRecorderRef.current) {
      const mediaRecorder = mediaRecorderRef.current;
      mediaRecorder.onstop = async () => {
        setIsProcessing(true);
        const audioBlob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = (reader.result as string).split(',')[1];
          let cleanMimeType = audioBlob.type || 'audio/webm';
          if (cleanMimeType.includes(';')) {
            cleanMimeType = cleanMimeType.split(';')[0];
          }
          await processAudio(base64data, cleanMimeType);
        };
        
        const stream = mediaRecorder.stream;
        if (stream) stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.stop();
    }
  };

  const processAudio = async (base64data: string, mimeType: string) => {
    try {
      const response = await fetch('/api/parse-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: base64data, mimeType, projects }),
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.details || data.error || 'Network error');
      
      setParsedData(data);
    } catch (err: any) {
      console.error(err);
      setError('خطا در ارتباط با سرور: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateItem = (index: number, updates: any) => {
    if (!parsedData) return;
    const newData = [...parsedData];
    newData[index] = { ...newData[index], ...updates };
    setParsedData(newData);
  };

  const handleRemoveItem = (index: number) => {
    if (!parsedData) return;
    const newData = parsedData.filter((_, i) => i !== index);
    if (newData.length === 0) {
      setParsedData(null);
    } else {
      setParsedData(newData);
    }
  };

  const handleSaveSingle = async (index: number) => {
    if (!parsedData || !parsedData[index]) return;
    const item = parsedData[index];
    await saveItemToDb(item);
    handleRemoveItem(index);
  };

  const handleSave = async () => {
    if (!parsedData) return;
    
    for (const item of parsedData) {
      await saveItemToDb(item);
    }
    
    setParsedData(null);
  };

  const saveItemToDb = async (item: any) => {
    try {
      await db.transactions.add({
        type: item.type === 'income' ? 'income' : 'expense',
        amount: Number(item.amount),
        description: item.description,
        date: item.date || new Date().toISOString().split('T')[0],
        time: item.time || new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
        categoryId: item.categoryId,
        accountId: item.accountId,
        projectId: item.projectId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 shadow-xl mb-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-full h-1 bg-gradient-to-l from-blue-500 via-indigo-500 to-purple-500"></div>
      
      <div className="flex flex-col items-center justify-center space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-2">دستیار صوتی هوشمند</h2>
          <p className="text-slate-400 text-sm">
            تراکنش‌های خود را به صورت صوتی بیان کنید تا به صورت خودکار ثبت شوند
          </p>
          <p className="text-slate-500 text-xs mt-1">
            مثال: "۳۵۰ هزار تومان برای خرید از دیجی‌کالا از کارت ملت پرداخت کردم"
          </p>
        </div>

        {error && (
          <div className="w-full bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        <div className="relative">
          {isRecording && (
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 bg-rose-500/20 rounded-full blur-xl"
            />
          )}
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            disabled={isProcessing}
            className={`
              relative z-10 w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl
              ${isProcessing ? 'bg-slate-800 border-2 border-slate-700' : 
                isRecording ? 'bg-rose-500 scale-110 shadow-rose-500/50' : 'bg-gradient-to-br from-blue-500 to-indigo-600 hover:scale-105 hover:shadow-blue-500/30'}
            `}
          >
            {isProcessing ? (
              <Loader2 size={32} className="text-blue-400 animate-spin" />
            ) : isRecording ? (
              <MicOff size={32} className="text-white" />
            ) : (
              <Mic size={32} className="text-white" />
            )}
          </button>
        </div>
        
        <div className="text-center h-6">
          <AnimatePresence mode="wait">
            {isRecording && (
              <motion.span 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-rose-400 font-medium text-sm block"
              >
                در حال ضبط... (رها کنید تا پایان یابد)
              </motion.span>
            )}
            {isProcessing && (
              <motion.span 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="text-blue-400 font-medium text-sm block"
              >
                در حال پردازش صدا با هوش مصنوعی...
              </motion.span>
            )}
            {!isRecording && !isProcessing && (
              <motion.span 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-slate-500 text-sm block"
              >
                دکمه را نگه دارید و صحبت کنید
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {parsedData && !isProcessing && parsedData.length > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full mt-6 bg-slate-800 rounded-xl shadow-lg border border-blue-100/10 overflow-hidden"
            >
              <div className="bg-blue-500/10 p-4 border-b border-blue-100/10 flex justify-between items-center">
                <h3 className="font-bold text-white">تایید اطلاعات تراکنش‌ها ({parsedData.length} تراکنش)</h3>
              </div>
              
              <div className="max-h-[60vh] overflow-y-auto">
                {parsedData.map((item, index) => (
                  <div key={index} className={`p-6 ${index > 0 ? 'border-t border-slate-700' : ''}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="bg-blue-500/20 text-white text-xs font-bold px-2 py-1 rounded">تراکنش {index + 1}</span>
                      <span className="text-sm font-medium text-white">{item.type === 'income' ? 'درآمد' : 'هزینه'}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-white mb-1">نوع تراکنش</label>
                        <select 
                          value={item.type || 'expense'}
                          onChange={e => handleUpdateItem(index, { type: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                        >
                          <option value="expense">هزینه</option>
                          <option value="income">درآمد</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-white mb-1">مبلغ (تومان)</label>
                        <input 
                          type="number" 
                          value={item.amount || ''}
                          onChange={e => handleUpdateItem(index, { amount: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" dir="ltr"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-white mb-1">بابت (توضیحات)</label>
                        <input 
                          type="text" 
                          value={item.description || ''}
                          onChange={e => handleUpdateItem(index, { description: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-white mb-1">حساب / کارت</label>
                        <select 
                          value={item.accountId || ''}
                          onChange={e => handleUpdateItem(index, { accountId: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                        >
                          <option value="">-- انتخاب حساب --</option>
                          {accounts?.map((a, idx) => <option key={a.id || idx} value={a.id}>{a.name}</option>)}
                        </select>
                        {item.card && !item.accountId && (
                          <div className="text-xs text-rose-400 mt-1">حساب تشخیص داده شده: {item.card} (یافت نشد)</div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-white mb-1">پروژه (اختیاری)</label>
                        <select 
                          value={item.projectId || ''}
                          onChange={e => handleUpdateItem(index, { projectId: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                        >
                          <option value="">-- انتخاب پروژه --</option>
                          {projects?.map((p, idx) => <option key={p.id || idx} value={p.id}>{p.name}</option>)}
                        </select>
                        {item.project && !item.projectId && (
                          <div className="text-xs text-rose-400 mt-1">پروژه تشخیص داده شده: {item.project} (یافت نشد)</div>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-white mb-1">تاریخ</label>
                        <DatePicker
                          calendar={persian}
                          locale={persian_fa}
                          value={item.date ? new Date(item.date) : new Date()}
                          onChange={(date: DateObject | null) => {
                            if (date) {
                              handleUpdateItem(index, { date: date.toDate().toISOString().split('T')[0] });
                            }
                          }}
                          containerClassName="w-full"
                          inputClass="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-white mb-1">ساعت</label>
                        <input
                          type="time"
                          value={item.time || new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })}
                          onChange={e => handleUpdateItem(index, { time: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-left text-white" dir="ltr"
                        />
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-slate-700/50">
                      <button
                        onClick={() => handleRemoveItem(index)}
                        className="px-4 py-2 text-sm text-white hover:bg-rose-500/10 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <X size={16} /> لغو این مورد
                      </button>
                      <button
                        onClick={() => handleSaveSingle(index)}
                        className="px-4 py-2 text-sm bg-blue-600/20 text-white hover:bg-blue-600/30 rounded-lg transition-colors flex items-center gap-1 border border-blue-500/30"
                      >
                        <Check size={16} /> ثبت این مورد
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="bg-slate-900 p-4 border-t border-slate-700 flex justify-end space-x-2 space-x-reverse sticky bottom-0">
                <button 
                  onClick={() => setParsedData(null)}
                  className="px-6 py-2 text-white hover:bg-rose-500/10 rounded-xl transition-colors font-medium flex items-center space-x-1 space-x-reverse border border-rose-500/20"
                >
                  <X size={18} /> <span>لغو همه</span>
                </button>
                <button 
                  onClick={handleSave}
                  className="px-6 py-2 bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)] hover:bg-blue-700 text-white rounded-xl transition-colors shadow-sm font-medium flex items-center space-x-1 space-x-reverse"
                >
                  <Check size={18} /> <span>ثبت نهایی همه</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
