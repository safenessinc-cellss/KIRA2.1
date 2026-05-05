import { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, limit } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function NotificationCenter() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'notifications'));

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`);
    }
  };

  const markAllRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      for (const n of unread) {
        await updateDoc(doc(db, 'notifications', n.id), { read: true });
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-slate-100 transition-colors group"
      >
        <Bell size={20} className={cn("transition-colors", unreadCount > 0 ? "text-primary" : "text-slate-400")} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40 bg-black/5" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 origin-top-right"
            >
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="text-sm font-bold text-slate-800">Notificaciones</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={markAllRead}
                    className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline"
                  >
                    Marcar todo como leído
                  </button>
                )}
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length > 0 ? (
                  <div className="divide-y divide-slate-50">
                    {notifications.map((n) => (
                      <div 
                        key={n.id} 
                        className={cn(
                          "p-4 transition-colors relative group",
                          !n.read ? "bg-primary/5 shadow-inner" : "hover:bg-slate-50"
                        )}
                        onClick={() => !n.read && markAsRead(n.id)}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <p className={cn("text-xs font-bold leading-tight", !n.read ? "text-slate-900" : "text-slate-600")}>
                            {n.title}
                          </p>
                          <span className="text-[9px] text-slate-400 whitespace-nowrap">
                            {n.createdAt?.toDate?.() ? n.createdAt.toDate().toLocaleDateString() : 'Ayer'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed mb-2">
                          {n.message}
                        </p>
                        {!n.read && (
                          <div className="w-1.5 h-1.5 bg-primary rounded-full absolute left-2 top-5" />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Bell size={32} className="opacity-10" />
                    <p className="text-[11px] italic">Todo al día por aquí.</p>
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-slate-100 bg-slate-50/30 text-center">
                <button className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600">
                  Ver todas
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
