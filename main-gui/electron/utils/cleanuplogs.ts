import fs from "fs";
import path from "path";

const LOGS_DIR = "C:\\PMC\\logs";

export function cleanupLogs(daysToKeep = 7): void {
  try {
    if (!fs.existsSync(LOGS_DIR)) return;

    const files = fs.readdirSync(LOGS_DIR);
    const now = Date.now();

    for (const file of files) {
      const filePath = path.join(LOGS_DIR, file);
      const stats = fs.statSync(filePath);
      const ageDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);

      if (ageDays > daysToKeep) {
        fs.unlinkSync(filePath);
        console.log(`🧹 Deleted old log: ${file}`);
      }
    }
  } catch (err) {
    console.error("❌ Error cleaning logs:", err);
  }
}
