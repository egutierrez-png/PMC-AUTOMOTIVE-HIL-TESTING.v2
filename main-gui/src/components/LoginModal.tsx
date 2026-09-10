import { useState } from "react";
import { useAuthStore } from "../state/useAuthStore";

export default function LoginModal({ onClose }: { onClose: () => void }) {
  const login = useAuthStore((s) => s.login);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    const ok = login(username, password);
    if (ok) {
      onClose();
    } else {
      setError("Usuario o contraseña inválidos");
    }
  };

  return (
    <div
      className="
        fixed inset-0 z-50
        flex items-center justify-center
        bg-black/70 
        dark:bg-black/70
        bg-black/30 backdrop-blur-sm
      "
    >
      <div
        className="
          w-80 p-6 rounded-xl border

          /* DARK MODE */
          dark:bg-slate-900 dark:border-slate-700 dark:text-gray-100 
          dark:shadow-xl dark:shadow-black/40

          /* LIGHT MODE */
          bg-white border-slate-300 text-gray-900
          shadow-xl shadow-black/10
        "
      >
        <h2 className="text-xl font-semibold mb-4 dark:text-white">
          Autenticación requerida
        </h2>

        <div className="flex flex-col gap-3">
          {/* Input usuario */}
          <input
            className="
              p-2 rounded transition-all
              
              /* DARK */
              dark:bg-slate-800 dark:text-gray-100 dark:border-slate-700 dark:placeholder-slate-400

              /* LIGHT */
              bg-gray-100 text-gray-800 border border-gray-300 placeholder-gray-500
            "
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          {/* Input contraseña */}
          <input
            type="password"
            className="
              p-2 rounded transition-all
              
              /* DARK */
              dark:bg-slate-800 dark:text-gray-100 dark:border-slate-700 dark:placeholder-slate-400

              /* LIGHT */
              bg-gray-100 text-gray-800 border border-gray-300 placeholder-gray-500
            "
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {/* Error */}
          {error && (
            <div className="text-red-500 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Botón Entrar */}
          <button
            onClick={submit}
            className="
              p-2 rounded text-sm font-semibold transition

              /* DARK */
              dark:bg-blue-600 dark:hover:bg-blue-500 dark:text-white

              /* LIGHT */
              bg-blue-500 hover:bg-blue-400 text-white
            "
          >
            Entrar
          </button>

          {/* Botón cancelar */}
          <button
            onClick={onClose}
            className="
              text-sm transition

              /* DARK */
              dark:text-slate-400 dark:hover:text-white

              /* LIGHT */
              text-slate-600 hover:text-slate-900
            "
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
