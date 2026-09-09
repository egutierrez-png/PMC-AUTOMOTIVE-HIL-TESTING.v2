import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import { cleanupLogs } from "./utils/cleanuplogs";
import { registerResultsIpc } from "./ipc/resultsIpc";

process.env.ELECTRON_DISABLE_SECURITY_WARNINGS = "true";

let win: BrowserWindow | null = null;

async function createWindow() {
  cleanupLogs(7);
  // 🧹 Limpieza inicial de logs y limpieza semanal
  setInterval(() => cleanupLogs(7), 24 * 60 * 60 * 1000);
   const isDev = !app.isPackaged;

  // 🔹 Crear la ventana del navegador.
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      // 👇 Usa preload.js, no preload.ts
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Modo kiosko HMI
//   win = new BrowserWindow({
//   width: 1920,
//   height: 1080,
//   kiosk: true,                 // 👈 Modo kiosko nativo de Electron
//   fullscreen: true,            // 👈 Pantalla completa
//   frame: false,                // 👈 Sin bordes
//   autoHideMenuBar: true,       // 👈 Oculta menú (aunque frame=false ya lo oculta)
//   resizable: false,            // 👈 El usuario no puede cambiar tamaño
//   movable: false,              // 👈 Evita mover la ventana
//   minimizable: false,
//   maximizable: false,
//   closable: false,             // 👈 No se puede cerrar
//   titleBarStyle: "hidden",

//   webPreferences: {
//     preload: path.join(__dirname, "preload.js"),
//     contextIsolation: true,
//     nodeIntegration: false,
//   },
// });

// win.webContents.on("before-input-event", (event, input) => {
//   const blocked = [
//     "F12",
//     "F11",
//     "F5",
//     "F6",
//     "F7",
//     "F8",
//     "F9",
//     "F10",
//     "Escape"
//   ];

//   if (blocked.includes(input.code)) {
//     event.preventDefault();
//   }

//   if (input.control && input.key.toLowerCase() === "r") {
//     event.preventDefault();
//   }

//     if (input.control && input.shift && input.key.toLowerCase() === "i") {
//     event.preventDefault();
//   }
// });

  win.webContents.on("did-fail-load", (e, code, desc, url) => {
    console.error("❌ LOAD FAILED:", code, desc, url);
  });

  win.webContents.on("console-message", (e, level, message) => {
    console.log("📣 FRONTEND:", message);
  });

  // ✅ Carga la app según entorno
  const devURL = "http://localhost:5173";
  if (isDev) {
    await win.loadURL(devURL);
    win.webContents.openDevTools();
  } else {
    // await win.loadFile(path.join(process.cwd(), "dist", "index.html"));
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

// 🔹 Registro de eventos Electron
app.whenReady().then(() => {
  registerResultsIpc();
  createWindow();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// 🔹 Auto launch on login
// app.setLoginItemSettings({
//   openAtLogin: true,
//   openAsHidden: false,
//   path: process.execPath,
//   args: [],
// });

// 🧩 IPC para limpiar logs desde frontend
ipcMain.on("cleanup-logs", () => cleanupLogs(7));
