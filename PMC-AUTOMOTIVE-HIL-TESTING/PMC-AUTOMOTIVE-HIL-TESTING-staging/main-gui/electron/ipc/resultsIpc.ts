// electron/ipc/resultsIpc.ts
import { ipcMain, dialog, BrowserWindow } from "electron";
import fs from "fs";
import type { TestResultPayload, TestResultRow } from "../types/TestResult";
import { testResultsDb } from "../db/testResultsDb";

export function registerResultsIpc() {
  // Guardar un resultado
  ipcMain.handle("results/save", (_event, payload: TestResultPayload) => {
    testResultsDb.saveResult(payload);
    return true; // ← Recomendado
  });

  // Últimos N resultados
  ipcMain.handle(
    "results/getRecent",
    (_event, options?: { limit?: number; offset?: number }) => {
      const { limit = 100, offset = 0 } = options || {};
      return testResultsDb.getRecent(limit, offset);
    }
  );

  // Exportar CSV
  ipcMain.handle("results/exportCsv", async (event) => {
    const rows = testResultsDb.getAll();

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

    const csvLines: string[] = [header.join(",")];

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
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return null;

    const { filePath } = await dialog.showSaveDialog(win, {
      title: "Export results as CSV",
      defaultPath: "pmc_results.csv",
      filters: [{ name: "CSV", extensions: ["csv"] }],
    });

    if (!filePath) return null;

    fs.writeFileSync(filePath, csvLines.join("\n"), "utf8");
    return filePath;
  });

  // Exportar JSON
  ipcMain.handle("results/exportJson", async (event) => {
    const rows = testResultsDb.getAll();

    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win) return null;

    const { filePath } = await dialog.showSaveDialog(win, {
      title: "Export results as JSON",
      defaultPath: "pmc_results.json",
      filters: [{ name: "JSON", extensions: ["json"] }],
    });

    if (!filePath) return null;

    fs.writeFileSync(filePath, JSON.stringify(rows, null, 2), "utf8");
    return filePath;
  });
}
