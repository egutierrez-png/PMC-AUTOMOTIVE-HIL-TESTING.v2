"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerResultsIpc = registerResultsIpc;
// electron/ipc/resultsIpc.ts
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const testResultsDb_1 = require("../db/testResultsDb");
function registerResultsIpc() {
    // Guardar un resultado
    electron_1.ipcMain.handle("results/save", (_event, payload) => {
        testResultsDb_1.testResultsDb.saveResult(payload);
        return true; // ← Recomendado
    });
    // Últimos N resultados
    electron_1.ipcMain.handle("results/getRecent", (_event, options) => {
        const { limit = 100, offset = 0 } = options || {};
        return testResultsDb_1.testResultsDb.getRecent(limit, offset);
    });
    // Exportar CSV
    electron_1.ipcMain.handle("results/exportCsv", async (event) => {
        const rows = testResultsDb_1.testResultsDb.getAll();
        const header = [
            "id",
            "job_id",
            "serial_number",
            "overall",
            "timestamp",
            "seq",
            "created_at",
            "payload",
        ];
        const csvLines = [header.join(",")];
        for (const r of rows) {
            const payloadEscaped = JSON.stringify(r.payload); // ← seguro
            const columns = [
                r.id,
                r.job_id ?? "",
                r.serial_number ?? "",
                r.overall ?? "",
                r.timestamp ?? "",
                r.seq ?? "",
                r.created_at ?? "",
                payloadEscaped,
            ].map((v) => `"${String(v)}"`);
            csvLines.push(columns.join(","));
        }
        // Obtiene ventana desde quien invocó IPC
        const win = electron_1.BrowserWindow.fromWebContents(event.sender);
        if (!win)
            return null;
        const { filePath } = await electron_1.dialog.showSaveDialog(win, {
            title: "Export results as CSV",
            defaultPath: "pmc_results.csv",
            filters: [{ name: "CSV", extensions: ["csv"] }],
        });
        if (!filePath)
            return null;
        fs_1.default.writeFileSync(filePath, csvLines.join("\n"), "utf8");
        return filePath;
    });
    // Exportar JSON
    electron_1.ipcMain.handle("results/exportJson", async (event) => {
        const rows = testResultsDb_1.testResultsDb.getAll();
        const win = electron_1.BrowserWindow.fromWebContents(event.sender);
        if (!win)
            return null;
        const { filePath } = await electron_1.dialog.showSaveDialog(win, {
            title: "Export results as JSON",
            defaultPath: "pmc_results.json",
            filters: [{ name: "JSON", extensions: ["json"] }],
        });
        if (!filePath)
            return null;
        fs_1.default.writeFileSync(filePath, JSON.stringify(rows, null, 2), "utf8");
        return filePath;
    });
}
