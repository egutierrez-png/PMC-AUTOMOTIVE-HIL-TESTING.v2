export type StepAction =
  | 'command_position'
  | 'custom_frame'
  | 'wait'
  | 'set_flag'
  | 'read_pid'
  | 'motor_off'
  | 'clear_codes';

export type RecipeStep = {
  id: string;            // uid local para la UI
  label?: string;
  action: StepAction;
  parameters?: Record<string, any>;
  expect?: {
    timeout_ms?: number;
    final_position_greater_than?: number;
    final_position_less_than?: number;
    response_time_max_ms?: number;
    store_as?: string;
  };
};

export type RecipeDoc = {
  id: string;
  schema: 'pmc.recipe/1' | 'eol.job.v1' | string;
  testID?: string;
  family?: string;
  job_id?: string;
  serial?: string; // serial_number también lo puedes soportar si quieres
  profile_id?: string; // 🔹 ID del perfil asociado
  sequence: RecipeStep[];
  limits?: Record<string, any>;
  logging?: Record<string, any>;
  timestamp?: string;
};
