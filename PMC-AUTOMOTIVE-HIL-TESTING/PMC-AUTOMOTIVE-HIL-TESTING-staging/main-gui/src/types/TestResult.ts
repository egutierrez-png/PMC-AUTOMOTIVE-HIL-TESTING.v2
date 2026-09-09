// src/shared/testResultsTypes.ts
export interface SingleStepResult {
  measured_position: number;
  response_time_ms: number;
  status: string;
  step?: number;
  command?: string;
}

export interface TestResultPayload {
  job_id: string;
  serial_number: string;
  results: SingleStepResult[];
  overall: string;
  timestamp: number;
  schema: string;
  seq: number;
}

// Lo que sale de SQLite cuando preguntamos por histórico
export interface TestResultRow {
  id: number;
  job_id: string | null;
  serial_number: string | null;
  overall: string | null;
  timestamp: number | null;
  seq: number | null;
  created_at: string; // ISO DATETIME
  payload: string;    // JSON string del TestResultPayload
}
