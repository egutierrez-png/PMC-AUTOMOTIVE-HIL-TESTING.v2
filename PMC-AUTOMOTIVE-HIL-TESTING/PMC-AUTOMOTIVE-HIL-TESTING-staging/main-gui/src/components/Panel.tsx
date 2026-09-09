import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

type Props = {
  title: string;
  children: React.ReactNode;
  className?: string;
};

export const Panel = ({ title, children, className }: Props) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className={`
        rounded-2xl p-5 border transition-all
        bg-slate-50 border-slate-300 shadow-md shadow-slate-300/40
        dark:bg-slate-600 dark:border-slate-700 dark:shadow-lg dark:shadow-slate-900/40
        border-slate-300 shadow-md shadow-slate-300/40
        hover:shadow-xl hover:shadow-black/10 
        dark:hover:shadow-slate-900/60

        ${className || ""}
      `}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-accent dark:text-accent-light">
          {title}
        </h2>

        {/* Botón minimizar */}
        <button
          className="
            text-slate-500 hover:text-slate-900 
            dark:text-slate-400 dark:hover:text-white 
            transition
          "
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* CONTENIDO */}
      <div
        className={`space-y-3 transition-all duration-200 ${
          collapsed
            ? "max-h-0 opacity-0 overflow-hidden"
            : "max-h-[2000px] opacity-100"
        }`}
      >
        {children}
      </div>
    </div>
  );
};
