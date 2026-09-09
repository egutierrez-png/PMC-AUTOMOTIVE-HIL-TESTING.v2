"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupLogs = cleanupLogs;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const LOGS_DIR = "C:\\PMC\\logs";
function cleanupLogs(daysToKeep = 7) {
    try {
        if (!fs_1.default.existsSync(LOGS_DIR))
            return;
        const files = fs_1.default.readdirSync(LOGS_DIR);
        const now = Date.now();
        for (const file of files) {
            const filePath = path_1.default.join(LOGS_DIR, file);
            const stats = fs_1.default.statSync(filePath);
            const ageDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);
            if (ageDays > daysToKeep) {
                fs_1.default.unlinkSync(filePath);
                console.log(`🧹 Deleted old log: ${file}`);
            }
        }
    }
    catch (err) {
        console.error("❌ Error cleaning logs:", err);
    }
}
