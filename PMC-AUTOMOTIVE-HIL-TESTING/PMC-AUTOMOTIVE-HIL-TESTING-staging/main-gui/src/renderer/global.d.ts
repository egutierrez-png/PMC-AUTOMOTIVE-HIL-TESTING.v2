// src/renderer/global.d.ts
import type {
  TestResultPayload,
  TestResultRow,
} from "../src/types/TestResult";

declare global {
  interface Window {
    resultsApi: {
      saveResult(payload: TestResultPayload): Promise<void>;
      getRecent(options?: {
        limit?: number;
        offset?: number;
      }): Promise<TestResultRow[]>;
      exportCsv(): Promise<string | null>;
      exportJson(): Promise<string | null>;
    };
  }
}

export {};
