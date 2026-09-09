import { useState, useEffect } from "react";
import { useMqttStore } from "./store/useMqttStore";
import Topbar from "./components/TopBar";
import StatusPanel from "./components/StatusPanel";
import ParamsPanel from "./components/ParamsPanel";
import ResultsPanel from "./components/ResultsPanel";
import {ControlsPanel} from "./components/ControlsPanel";
import RecipeEditor from "./components/RecipeEditor";
import { Panel } from "./components/Panel";
import StepChecklist from "./components/StepChecklist";
import LogsTabsPanel from "./components/LogTabsPanel";
import { useRuntimeMqtt } from "./state/useRuntimeStore";
import { useConfigStore } from "./state/useConfigStore";
import ToastsContainer from "./components/ToastsContainer";
import RecipeLibrary from "./components/RecipeLibrary";
import { useToastStore } from "./store/useToastStore";
import { useLogStore } from "./state/useLogStore";
import SystemLogsPanel from "./components/SystemLogsPanel";
import ProfileEditor from "./components/ProfileEditor";
import ProfileLibrary from "./components/ProfileLibrary";
import RecipeSelector from "./components/RecipeSelector";
import { useRecipesStore } from "./state/useRecipeStore";
import { useProfilesStore } from "./state/useProfilesStore";
import { useAuthStore } from "./state/useAuthStore";
import LoginModal from "./components/LoginModal";
import { useAutoLogout } from "./hooks/useAutoLogout";
import ModeSelectorPanel from "./components/ModeSelectorPanel";
import SignalsDashboard from "./components/signals/SignalsDashboard";
import { useSignalsStore } from "./state/useSignalsStore";
import { setupSignalAutoDecoder } from "./components/signals/signalAutoDecoder";
import { useThemeStore } from "./state/useThemeStore";


type Tab = 'run' | 'recipes' | 'profiles' | 'config' | 'signals';

export default function App() {
  useAutoLogout(); // hook de auto-logout por inactividad

  const connect = useMqttStore(s => s.connect);
  const connected = useMqttStore(s => s.connected);
  const loadHistory = useToastStore(s => s.loadHistory);
  const loadLogs = useLogStore((s) => s.loadFromStorage);
  const loadRecipes = useRecipesStore(s => s.loadFromStorage);
  const loadProfiles = useProfilesStore(s => s.loadFromStorage);

  const { brokerUrl, stationId, setBrokerUrl, setStationId, loadFromStorage } = useConfigStore();
  const [ready, setReady] = useState(false);

  const theme = useThemeStore(s => s.theme);
  // Carga los logs guardados al iniciar
   useEffect(() => {
    loadLogs(); // 🔹 Restaura logs al iniciar
    loadProfiles(); // 🔹 Restaura perfiles al iniciar
    loadRecipes(); // 🔹 Restaura recetas al iniciar
    setupSignalAutoDecoder(); // 🔹 Configura el decodificador automático de señales
  }, []);

  useEffect(() => {
  const i = setInterval(() => {
    useSignalsStore.getState().addValue("position", Math.sin(Date.now() / 500));
    useSignalsStore.getState().addValue("current", Math.random() * 10);
  }, 50);

  return () => clearInterval(i);
}, []);


  useEffect(() => {
    // Espera a que los datos de config estén disponibles
    loadFromStorage();
    setReady(true);
  }, [loadFromStorage]);

  // Carga el historial de eventos desde localStorage
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);



  // Conecta automáticamente al broker
  useEffect(() => {
  if (ready && brokerUrl && !connected) {
    connect(brokerUrl);
  }
}, [ready, brokerUrl, connected, connect]);

  useRuntimeMqtt();
  const [tab, setTab] = useState<Tab>('run');
  const user = useAuthStore((s) => s.user);
  const [showLogin, setShowLogin] = useState(false);
  const [pendingTab, setPendingTab] = useState<Tab | null>(null);
  const pushToast = useToastStore((s) => s.push);

  const isReadOnlyConfig = user?.role === "tech";

  // Función para verificar si el usuario tiene acceso al tab solicitado
  const canAccess = (tab: Tab): boolean => {
  if (tab === "run" || tab === "signals") return true; // run siempre libre
  if (!user) return false;

  switch (user.role) {
    case "operator":
      return false; // ❌ nunca accede a nada extra
    case "tech":
      return tab === "recipes" || tab === "profiles" || tab === "config"; // ⚙ tech No accede a config
    case "admin":
      return true;
    default:
      return false;
  }
};

  useEffect(() => {
  // Cuando se hace logout (user pasa a null)
  if (user === null) {
    setTab("run"); // <-- regresar automáticamente a RUN
  }
}, [user]);

// Efecto para manejar navegación pendiente tras login
  useEffect(() => {
    if (user && pendingTab) {
      // Solo navegar si el rol tiene permiso
      if (canAccess(pendingTab)) {
        setTab(pendingTab);
      } else {
        // Feedback amigable
        pushToast("Acceso denegado para tu rol", "error");
        setTab("run");
      }

      setPendingTab(null);
    }
}, [user, pendingTab]);


  return (
    <div className={`
      min-h-screen 
      p-4 md:p-6 
      font-['Roboto_Mono']
      transition-colors duration-300

      ${theme === "dark" 
        ? "dark bg-surface text-gray-100" 
        : "bg-gray-100 text-gray-900"
      }
    `}
    >
      {/* <Topbar active={tab} onChange={setTab} /> */}
      <Topbar
        active={tab}
        onChange={(next: Tab) => {
         // Si tiene acceso → ir directo
        if (canAccess(next)) {
          setTab(next);
          return;
        }

        // Si NO hay usuario → abrir login
        if (!user) {
          setPendingTab(next);
          setShowLogin(true);
          return;
        }

        // Si hay usuario pero sin permisos → bloquear
        pushToast("Acceso denegado para tu rol", "error");

        return;
        }}
      />

      {tab === 'run' && (
        <div className="
          grid gap-4 md:gap-6
          grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

          {/* Columna izquierda tipo “árbol de pruebas/estados” */}
          <div className="col-span-1 flex flex-col gap-3">
            <ModeSelectorPanel /> 
            <RecipeSelector />
            <ControlsPanel />
          </div>

          {/* Centro: controles y parámetros de ejecución */}
          <div className="col-span-1 md:col-span-3 lg:col-span-3 flex flex-col gap-3">
            <StatusPanel />
            {/* “Digital/Analog inputs & outputs” compactado */}
            {/* <ParamsPanel /> */}
            {/* Aquí luego metemos “step list / check list” */}
            <StepChecklist />
          </div>

          {/* Derecha: resultados / logs */}
          <div className="col-span-1 md:col-span-4 lg:col-span-4 flex flex-col gap-3">
            <ResultsPanel />
            <LogsTabsPanel />
          </div>
        </div>
      )}

      {tab === 'recipes' && (
        <div className="grid gap-6 grid-cols-3 lg:grid-cols-3">
          {/* Listado de recetas / modelos */}
          <div className="col-span-3 lg:col-span-3">
            <RecipeLibrary />
          </div>
          {/* Editor de la receta seleccionada */}
          <div className="col-span-3 lg:col-span-3">
            <RecipeEditor />
          </div>
        </div>
      )}

      {tab === "profiles" && (
        <div className="grid gap-6 grid-cols-3">
          
          {/* Sidebar con lista de perfiles */}
          <ProfileLibrary />

          {/* Editor del perfil seleccionado */}
          <div className="col-span-3 lg:col-span-2">
            <ProfileEditor />
          </div>

        </div>
      )}

      {tab === 'signals' && <SignalsDashboard />}

      {tab === 'config' && (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          <Panel title="Connection">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="text-sm">Broker URL
                <input
                  value={brokerUrl}
                  onChange={(e) => !isReadOnlyConfig && setBrokerUrl(e.target.value)}
                  className={`w-full mt-1 px-3 py-2 rounded dark:bg-slate-800 bg-slate-100
                              ${isReadOnlyConfig ? "opacity-50 cursor-not-allowed" : ""}
                              `}
                  placeholder="ws://localhost:9001"
                />
              </label>

              <label className="text-sm">Station
                <input
                  value={stationId}
                  onChange={(e) => !isReadOnlyConfig && setStationId(e.target.value)}
                  className={`w-full mt-1 px-3 py-2 rounded dark:bg-slate-800 bg-slate-100
                              ${isReadOnlyConfig ? "opacity-50 cursor-not-allowed" : ""}
                              `}
                  placeholder="EOL01"
                />
              </label>

              <button
                onClick={() => !isReadOnlyConfig && connect(brokerUrl)}
                disabled={connected}
                className={`mt-3 px-4 py-2 rounded font-semibold ${
                  connected
                    ? "bg-green-600 cursor-not-allowed text-black"
                    : "bg-accent text-black hover:bg-yellow-400"
                }`}
              >
                {connected ? "Connected" : "Connect"}
              </button>
            </div>
          </Panel>
          <SystemLogsPanel />
          {/* <EventLogPanel /> */}
        </div>
      )}
      <ToastsContainer />
      {showLogin && (
        <LoginModal
          onClose={() => setShowLogin(false)}
        />
      )}
    </div> 
  );
}
