"use client";

import { useEffect } from "react";
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX } from "react-icons/fi";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

export function ToastNotification({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const duration = toast.duration || 5000;
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [toast, onClose]);

  const getToastStyles = () => {
    switch (toast.type) {
      case "success":
        return {
          gradient: "from-green-500 to-emerald-500",
          bg: "bg-green-50",
          border: "border-green-200",
          text: "text-green-900",
          icon: FiCheckCircle,
        };
      case "error":
        return {
          gradient: "from-red-500 to-rose-500",
          bg: "bg-red-50",
          border: "border-red-200",
          text: "text-red-900",
          icon: FiAlertCircle,
        };
      case "warning":
        return {
          gradient: "from-yellow-500 to-orange-500",
          bg: "bg-yellow-50",
          border: "border-yellow-200",
          text: "text-yellow-900",
          icon: FiAlertCircle,
        };
      case "info":
      default:
        return {
          gradient: "from-blue-500 to-indigo-500",
          bg: "bg-blue-50",
          border: "border-blue-200",
          text: "text-blue-900",
          icon: FiInfo,
        };
    }
  };

  const styles = getToastStyles();
  const Icon = styles.icon;

  return (
    <div
      className={`${styles.bg} ${styles.border} border-2 rounded-xl shadow-2xl p-4 min-w-[320px] max-w-md animate-slide-in-right`}
    >
      <div className="flex items-start space-x-3">
        <div className={`w-10 h-10 bg-gradient-to-br ${styles.gradient} rounded-lg flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${styles.text} leading-relaxed`}>
            {toast.message}
          </p>
        </div>
        <button
          onClick={() => onClose(toast.id)}
          className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
        >
          <FiX className="w-5 h-5" />
        </button>
      </div>
      
      {/* Progress bar */}
      <div className="mt-3 h-1 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${styles.gradient} animate-progress`}
          style={{ animationDuration: `${toast.duration || 5000}ms` }}
        ></div>
      </div>
    </div>
  );
}

export function ToastContainer({ toasts, onClose }: { toasts: Toast[]; onClose: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col space-y-3 pointer-events-none">
      <div className="pointer-events-auto space-y-3">
        {toasts.map((toast) => (
          <ToastNotification key={toast.id} toast={toast} onClose={onClose} />
        ))}
      </div>
    </div>
  );
}
