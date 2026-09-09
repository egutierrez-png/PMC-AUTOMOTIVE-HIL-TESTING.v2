export {};
declare global {
  interface Window {
    resultsApi: {
      saveResult(payload: any): Promise<void>;
      getRecent(options?: { limit?: number; offset?: number }): Promise<any[]>;
      exportCsv(): Promise<string | null>;
      exportJson(): Promise<string | null>;
    };
    electronAPI?: {
      cleanupLogs?: () => void;
    };
  }
}
