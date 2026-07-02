import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: ToastMessage = { id, message, type, duration };
    setToasts((prev) => [...prev, newToast]);

    setTimeout(() => {
      removeToast(id);
    }, duration);
  }, [removeToast]);

  const success = useCallback((msg: string, dur?: number) => addToast(msg, 'success', dur), [addToast]);
  const error = useCallback((msg: string, dur?: number) => addToast(msg, 'error', dur), [addToast]);
  const warning = useCallback((msg: string, dur?: number) => addToast(msg, 'warning', dur), [addToast]);
  const info = useCallback((msg: string, dur?: number) => addToast(msg, 'info', dur), [addToast]);

  return (
    <ToastContext.Provider value={{ toast: addToast, success, error, warning, info }}>
      {children}
      
      {/* Toast Portal/Container */}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none max-w-sm w-full">
        <AnimatePresence>
          {toasts.map((t) => {
            let bgClass = 'bg-slate-950 border-slate-800 text-white';
            let icon = <Info className="text-blue-400 shrink-0" size={18} />;

            if (t.type === 'success') {
              bgClass = 'bg-emerald-950 border-emerald-900 text-emerald-100';
              icon = <CheckCircle2 className="text-emerald-400 shrink-0" size={18} />;
            } else if (t.type === 'error') {
              bgClass = 'bg-rose-950 border-rose-900 text-rose-100';
              icon = <AlertCircle className="text-rose-400 shrink-0" size={18} />;
            } else if (t.type === 'warning') {
              bgClass = 'bg-amber-950 border-amber-900 text-amber-100';
              icon = <AlertTriangle className="text-amber-400 shrink-0" size={18} />;
            }

            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 15, scale: 0.95, transition: { duration: 0.15 } }}
                className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-xl ${bgClass}`}
              >
                {icon}
                <div className="flex-1 text-xs font-semibold leading-relaxed pr-2">
                  {t.message}
                </div>
                <button
                  onClick={() => removeToast(t.id)}
                  className="text-slate-400 hover:text-white transition-colors shrink-0 focus:outline-none"
                >
                  <X size={14} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};
