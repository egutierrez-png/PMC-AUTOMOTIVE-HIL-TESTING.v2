"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const resultsApi = {
    saveResult(payload) {
        return electron_1.ipcRenderer.invoke("results/save", payload);
    },
    getRecent(options) {
        return electron_1.ipcRenderer.invoke("results/getRecent", options);
    },
    exportCsv() {
        return electron_1.ipcRenderer.invoke("results/exportCsv");
    },
    exportJson() {
        return electron_1.ipcRenderer.invoke("results/exportJson");
    },
};
// API general (limpieza de logs)
const electronAPI = {
    cleanupLogs: () => {
        try {
            electron_1.ipcRenderer.send("cleanup-logs");
        }
        catch (err) {
            console.warn("[Electron] cleanupLogs failed:", err);
        }
    },
};
electron_1.contextBridge.exposeInMainWorld("electronAPI", electronAPI);
electron_1.contextBridge.exposeInMainWorld("resultsApi", resultsApi);
// Deshabilita menú contextual (clic derecho)
// window.addEventListener("contextmenu", (e) => e.preventDefault());
