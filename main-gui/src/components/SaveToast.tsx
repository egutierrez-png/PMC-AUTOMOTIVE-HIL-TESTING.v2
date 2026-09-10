import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Props = {
  show: boolean;
  text?: string;
};

export default function SaveToast({ show, text = "Cambios guardados" }: Props) {
  useEffect(() => {
    if (!show) return;
    const audio = new Audio(
      "data:audio/mp3;base64,//uQZAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA"
    ); // pequeño "click" base64 opcional
    audio.volume = 0.1;
    audio.play().catch(() => {});
  }, [show]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ duration: 0.4 }}
          className="fixed bottom-4 right-4 z-50 bg-green-600 text-black font-semibold px-4 py-2 rounded-xl shadow-lg text-sm"
        >
          {text}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
