import { create } from 'zustand';
import { CheckCircle, XCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastStore {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  
  addToast: (toast) => {
    const id = Date.now().toString();
    const newToast = { ...toast, id };
    
    set((state) => ({
      toasts: [...state.toasts, newToast]
    }));
    
    // Автоматическое удаление через заданное время
    if (toast.duration !== 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter(t => t.id !== id)
        }));
      }, toast.duration || 3000);
    }
  },
  
  removeToast: (id) => {
    set((state) => ({
      toasts: state.toasts.filter(t => t.id !== id)
    }));
  },
  
  clearToasts: () => {
    set({ toasts: [] });
  }
}));

// Хук для удобного использования
export const useToast = () => {
  const { addToast, removeToast, clearToasts } = useToastStore();
  
  return {
    success: (message: string, duration?: number) => 
      addToast({ type: 'success', message, duration }),
    
    error: (message: string, duration?: number) => 
      addToast({ type: 'error', message, duration }),
    
    warning: (message: string, duration?: number) => 
      addToast({ type: 'warning', message, duration }),
    
    info: (message: string, duration?: number) => 
      addToast({ type: 'info', message, duration }),
    
    dismiss: removeToast,
    dismissAll: clearToasts
  };
};

// Компонент для отображения уведомлений
export const ToastContainer = () => {
  const toasts = useToastStore((state) => state.toasts);
  const removeToast = useToastStore((state) => state.removeToast);
  
  if (toasts.length === 0) return null;
  
  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };
  
  const getStyles = (type: ToastType) => {
    const base = 'bg-white border rounded-lg shadow-lg p-4 mb-2 flex items-center gap-3 min-w-[300px] max-w-[500px]';
    
    switch (type) {
      case 'success':
        return `${base} border-green-200`;
      case 'error':
        return `${base} border-red-200`;
      case 'warning':
        return `${base} border-orange-200`;
      case 'info':
        return `${base} border-blue-200`;
    }
  };
  
  return (
    <div className="fixed top-4 right-4 z-50">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={getStyles(toast.type)}
          onClick={() => removeToast(toast.id)}
          style={{ cursor: 'pointer' }}
        >
          {getIcon(toast.type)}
          <p className="flex-1 text-sm text-gray-800">{toast.message}</p>
        </div>
      ))}
    </div>
  );
};