import React, { type JSX } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToastStore } from "../store/useToastStore";
import { CheckCircle, Info, AlertTriangle, XCircle } from "lucide-react";

export default function ToastsContainer() {
  const { toasts, remove } = useToastStore();

  const styles: Record<string, { bg: string; icon: JSX.Element }> = {
    success: {
      bg: "bg-green-600/90 text-black",
      icon: <CheckCircle className="w-5 h-5 text-black animate-pulse" />,
    },
    info: {
      bg: "bg-blue-500/90 text-white",
      icon: <Info className="w-5 h-5 text-white animate-pulse" />,
    },
    warn: {
      bg: "bg-yellow-400/90 text-black",
      icon: <AlertTriangle className="w-5 h-5 text-black animate-pulse" />,
    },
    error: {
      bg: "bg-red-600/90 text-white",
      icon: <XCircle className="w-5 h-5 text-white animate-pulse" />,
    },
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 100 }}
            transition={{ duration: 0.3 }}
            onClick={() => remove(t.id)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl cursor-pointer 
                        font-semibold backdrop-blur-sm border border-white/10 pointer-events-auto
                        ${styles[t.type].bg}`}
          >
            {styles[t.type].icon}
            <span className="text-sm">{t.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
