// electron/db/testResultsDb.ts
import Database from "better-sqlite3";
import path from "path";
import { app } from "electron";
import type { TestResultPayload, TestResultRow } from "../types/TestResult";

export class TestResultsDb {
  private db: Database.Database;
  private insertStmt: Database.Statement;
  private selectRecentStmt: Database.Statement;
  private selectAllStmt: Database.Statement;

  constructor() {
    const userDataPath = app.getPath("userData");
    const dbPath = path.join(userDataPath, "pmc_results.db");

    const isDev = !app.isPackaged;

    this.db = new Database(dbPath, {
      verbose: isDev ? console.log : undefined, // Debug solo en dev
    });

    this.db.pragma("journal_mode = WAL");

    this.db
      .prepare(
        `
        CREATE TABLE IF NOT EXISTS test_results (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          job_id TEXT,
          serial_number TEXT,
          payload TEXT NOT NULL,
          overall TEXT,
          timestamp INTEGER,
          seq INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `
      )
      .run();

    // Índices opcionales (mejor rendimiento)
    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_results_id ON test_results(id)`).run();
    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_results_timestamp ON test_results(timestamp)`).run();
    this.db.prepare(`CREATE INDEX IF NOT EXISTS idx_serial_number
                    ON test_results(serial_number);
                  `).run();

    this.insertStmt = this.db.prepare(
      `
      INSERT INTO test_results (job_id, serial_number, payload, overall, timestamp, seq)
      VALUES (@job_id, @serial_number, @payload, @overall, @timestamp, @seq)
    `
    );

    this.selectRecentStmt = this.db.prepare(
      `
      SELECT id, job_id, serial_number, overall, timestamp, seq, created_at, payload
      FROM test_results
      ORDER BY id DESC
      LIMIT @limit OFFSET @offset
    `
    );

    this.selectAllStmt = this.db.prepare(
      `
      SELECT id, job_id, serial_number, overall, timestamp, seq, created_at, payload
      FROM test_results
      ORDER BY id ASC
    `
    );
  }

  saveResult(payload: TestResultPayload): void {
    this.insertStmt.run({
      job_id: payload.job_id,
      serial_number: payload.serial_number,
      payload: JSON.stringify(payload),
      overall: payload.overall,
      timestamp: payload.timestamp,
      seq: payload.seq,
    });
  }

  getRecent(limit = 100, offset = 0): TestResultRow[] {
    return this.selectRecentStmt.all({ limit, offset }) as TestResultRow[];
  }

  getAll(): TestResultRow[] {
    return this.selectAllStmt.all() as TestResultRow[];
  }
}

export const testResultsDb = new TestResultsDb();
