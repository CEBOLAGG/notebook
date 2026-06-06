/**
 * Tipos do payload enviado pelo app desktop e do documento persistido no MongoDB.
 *
 * Mantenha estes tipos sincronizados com:
 *   src/NotebookCheck/Infrastructure/Api/ApiPayload.cs
 *   src/NotebookCheck/Application/Api/PayloadBuilder.cs
 *
 * Quando migrarmos para o Bling, basta substituir lib/repository.ts —
 * a forma do documento aqui descrita é a fonte de verdade.
 */

export type FinalClassification =
  | 'Aprovado'
  | 'Aprovado com ressalvas'
  | 'Reprovado';

export type AutoStatus =
  | 'OK'
  | 'Atenção'
  | 'Falha'
  | 'Não testado'
  | 'Não aplicável';

export type ManualStatus = 'OK' | 'Com defeito' | 'Não testado' | 'Observação';

export interface MachinePayload {
  manufacturer?: string | null;
  model?: string | null;
  serial?: string | null;
  hostname: string;
  cpu?: string | null;
  ram_gb: number;
  os: string;
  os_version: string;
  mac_address?: string | null;
  tpm: string;
  tpm_version?: string | null;
  secure_boot: string;
  autopilot: string;
  windows_activation: string;
  screen_resolution: string;
  graphics_adapter?: string | null;
  graphics_adapters?: string[];
  network_adapters_wifi?: number;
  network_adapters_ethernet?: number;
  bluetooth_version?: string | null;
  ntb_code: string;
  location: string;
  keyboard_backlight: string;
}

export interface StoragePayload {
  index: number;
  capacity_gb: number;
  type: string;
  smart_status: string;
  model?: string | null;
  life_percent_remaining?: number | null;
  power_on_hours?: number | null;
  power_on_count?: number | null;
  data_written_tb?: number | null;
  data_read_tb?: number | null;
  temperature_c?: number | null;
}

export interface BatteryPayload {
  design_capacity_mwh?: number | null;
  current_capacity_mwh?: number | null;
  cycle_count?: number | null;
  charging_status: string;
  wear_percent?: number | null;
}

export interface TestEntry {
  status: string;
  details: string;
  executed_at: string;
}

export interface ManualChecklistPayload {
  status: string;
  notes: string;
}

export interface InspectionPhotoPayload {
  item_key: string;
  label: string;
  image_base64: string;
  note?: string | null;
  captured_at: string;
}

export interface ApiPayload {
  test_id: string;
  report_type: 'full_checklist' | 'retest';
  tested_at: string;
  technician_name: string;
  machine: MachinePayload;
  storage: StoragePayload[];
  battery?: BatteryPayload | null;
  tests: Record<string, TestEntry>;
  manual_checklist: Record<string, ManualChecklistPayload>;
  retested_components: string[];
  repair_notes: string;
  general_notes: string;
  asset_tag: string;
  final_classification: string;
  final_classification_override_reason?: string | null;
  checklist_mode?: string | null;
  stress?: StressMetrics | null;
  inspection_photos?: InspectionPhotoPayload[];
  inspection_slug?: string | null;
}

export interface StressMetrics {
  final_score: number;
  // CPU
  cpu_single_thread: number;
  cpu_multi_thread: number;
  cpu_efficiency: number;
  cpu_threads: number;
  // GPU
  gpu_graphics: number;
  gpu_compute: number;
  gpu_bandwidth: number;
  gpu_name?: string | null;
  gpu_feature_level?: string | null;
  // Disco
  disk_score: number;
  disk_read_mb_s: number;
  disk_write_mb_s: number;
  // VRAM
  vram_ok: boolean;
  vram_allocated_mb: number;
  vram_mismatch_count: number;
  // RAM
  ram_ok?: boolean;
  ram_allocated_mb?: number;
  ram_error_count?: number;
  ram_bandwidth_gbs?: number;
  // Geekbench 6
  geekbench_single?: number;
  geekbench_multi?: number;
  geekbench_version?: string | null;
}

export interface CommentDoc {
  id: string;
  /** chave do teste (snake_case) ou "_general" para comentários do relatório inteiro. */
  test_key: string;
  author: string;
  text: string;
  created_at: string;
}

export interface ReportDoc extends ApiPayload {
  _id?: unknown;
  /** Carimbo de quando o servidor recebeu o documento. */
  received_at: string;
  comments: CommentDoc[];
}

export interface ReportListItem {
  test_id: string;
  report_type: ApiPayload['report_type'];
  tested_at: string;
  received_at: string;
  technician_name: string;
  ntb_code: string;
  location: string;
  manufacturer?: string | null;
  model?: string | null;
  serial?: string | null;
  final_classification: string;
}
