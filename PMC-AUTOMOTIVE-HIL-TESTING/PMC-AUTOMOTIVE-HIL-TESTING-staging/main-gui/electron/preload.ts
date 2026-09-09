import { contextBridge, ipcRenderer } from "electron";
import type {
  TestResultPayload,
  TestResultRow,
} from "./types/TestResult";

const resultsApi = {
  saveResult(payload: TestResultPayload): Promise<void> {
    return ipcRenderer.invoke("results/save", payload);
  },
  getRecent(options?: {
    limit?: number;
    offset?: number;
  }): Promise<TestResultRow[]> {
    return ipcRenderer.invoke("results/getRecent", options);
  },
  exportCsv(): Promise<string | null> {
    return ipcRenderer.invoke("results/exportCsv");
  },
  exportJson(): Promise<string | null> {
    return ipcRenderer.invoke("results/exportJson");
  },
};

// API general (limpieza de logs)
const electronAPI = {
  cleanupLogs: () => {
    try {
      ipcRenderer.send("cleanup-logs");
    } catch (err) {
      console.warn("[Electron] cleanupLogs failed:", err);
    }
  },
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);

contextBridge.exposeInMainWorld("resultsApi", resultsApi);

// Deshabilita menú contextual (clic derecho)
// window.addEventListener("contextmenu", (e) => e.preventDefault());
