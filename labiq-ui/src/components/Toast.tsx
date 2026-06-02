import { createContext, useCallback, useContext, useState } from 'react';

type ToastType = 'success' | 'warning' | 'danger' | 'info';
interface Toast { id: number; message: string; type: ToastType; }

interface ToastCtx { toast: (msg: string, type?: ToastType) => void; }
const ToastContext = createContext<ToastCtx>({ toast: () => {} });
export const useToast = () => useContext(ToastContext);

let nextId = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'info') => {
    const id = nextId++;
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  const COLORS: Record<ToastType, { bg: string; border: string; color: string }> = {
    success: { bg: 'var(--st-success-bg)', border: 'var(--st-success)', color: 'var(--st-success)' },
    warning: { bg: 'var(--st-warning-bg)', border: 'var(--st-warning)', color: 'var(--st-warning)' },
    danger:  { bg: 'var(--st-danger-bg)',  border: 'var(--st-danger)',  color: 'var(--st-danger)'  },
    info:    { bg: 'var(--st-cyan-light)',  border: 'var(--st-cyan)',    color: 'var(--st-cyan-dark)' },
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div style={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 9999 }}>
        {toasts.map(t => {
          const c = COLORS[t.type];
          return (
            <div key={t.id} style={{
              background: c.bg, border: `1px solid ${c.border}`, color: c.color,
              padding: '10px 16px', borderRadius: 6, fontSize: 13, fontWeight: 600,
              boxShadow: 'var(--shadow-lg)', maxWidth: 320,
              animation: 'slideIn 0.2s ease',
            }}>
              {t.message}
            </div>
          );
        })}
      </div>
      <style>{`@keyframes slideIn { from { opacity:0; transform:translateX(20px) } to { opacity:1; transform:translateX(0) } }`}</style>
    </ToastContext.Provider>
  );
}
