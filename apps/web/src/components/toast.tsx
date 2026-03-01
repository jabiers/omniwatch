"use client";

import { useEffect, useState } from "react";
import { X, AlertCircle, CheckCircle, Info } from "lucide-react";
import { useToastStore, type Toast } from "../lib/toast-store";

const typeConfig: Record<Toast["type"], { icon: typeof AlertCircle; border: string; text: string; bg: string }> = {
  error: {
    icon: AlertCircle,
    border: "border-red-500/30",
    text: "text-red-400",
    bg: "bg-red-500/10",
  },
  success: {
    icon: CheckCircle,
    border: "border-emerald-500/30",
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  info: {
    icon: Info,
    border: "border-blue-500/30",
    text: "text-blue-400",
    bg: "bg-blue-500/10",
  },
};

/** Single toast item with enter/exit animation */
function ToastItem({ toast }: { toast: Toast }) {
  const { removeToast } = useToastStore();
  const [visible, setVisible] = useState(false);

  const config = typeConfig[toast.type];
  const Icon = config.icon;

  useEffect(() => {
    // Trigger enter animation on next frame
    requestAnimationFrame(() => setVisible(true));
  }, []);

  function handleDismiss() {
    setVisible(false);
    setTimeout(() => removeToast(toast.id), 200);
  }

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-xl border backdrop-blur-md transition-all duration-200 ${
        config.border
      } ${config.bg} bg-[#0a0a0f]/90 ${
        visible ? "translate-x-0 opacity-100" : "translate-x-8 opacity-0"
      }`}
    >
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${config.text}`} />
      <p className="text-sm text-gray-200 flex-1 break-words">{toast.message}</p>
      <button
        onClick={handleDismiss}
        className="shrink-0 p-0.5 rounded hover:bg-white/[0.1] text-gray-500 hover:text-gray-300 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/** Container for all toasts — renders at fixed bottom-right */
export function ToastContainer() {
  const { toasts } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-3rem)]">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
