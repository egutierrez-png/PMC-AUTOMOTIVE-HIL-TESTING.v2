import { create } from 'zustand';

type StatusState = {
  connected: boolean;
  status: 'IDLE'|'RUNNING'|'DONE'|'ERROR'|'PAUSED'|'ABORTED';
  currentStep: number;
  totalSteps: number;
  message?: string;
  jobId?: string;
  serial?: string;
  results: Array<{ step:number; command:string; measured_position:number; response_time_ms:number; status:string }>;
};

export const useHmiStore = create<StatusState>(() => ({
  connected: false,
  status: 'IDLE',
  currentStep: 0,
  totalSteps: 0,
  results: []
}));
