import { z } from 'zod';

const isoString = z.string().min(1);

export const machineSchema = z.object({
  manufacturer: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  serial: z.string().nullable().optional(),
  hostname: z.string(),
  cpu: z.string().nullable().optional(),
  ram_gb: z.number(),
  os: z.string(),
  os_version: z.string(),
  mac_address: z.string().nullable().optional(),
  tpm: z.string(),
  tpm_version: z.string().nullable().optional(),
  secure_boot: z.string(),
  autopilot: z.string(),
  windows_activation: z.string(),
  screen_resolution: z.string(),
  graphics_adapter: z.string().nullable().optional(),
  graphics_adapters: z.array(z.string()).optional(),
  network_adapters_wifi: z.number().optional(),
  network_adapters_ethernet: z.number().optional(),
  bluetooth_version: z.string().nullable().optional(),
  ntb_code: z.string().min(1, 'Informe o código/apelido NTB do equipamento'),
  location: z.string().min(1, 'Informe a localização'),
  keyboard_backlight: z.string(),
});

export const storageSchema = z.object({
  index: z.number().int(),
  capacity_gb: z.number(),
  type: z.string(),
  smart_status: z.string(),
});

export const batterySchema = z.object({
  design_capacity_mwh: z.number().nullable().optional(),
  current_capacity_mwh: z.number().nullable().optional(),
  cycle_count: z.number().nullable().optional(),
  charging_status: z.string(),
  wear_percent: z.number().nullable().optional(),
});

export const testEntrySchema = z.object({
  status: z.string(),
  details: z.string(),
  executed_at: isoString,
});

export const manualChecklistSchema = z.object({
  status: z.string(),
  notes: z.string(),
});

export const apiPayloadSchema = z.object({
  test_id: z.string().min(1),
  report_type: z.enum(['full_checklist', 'retest']),
  tested_at: isoString,
  technician_name: z.string(),
  machine: machineSchema,
  storage: z.array(storageSchema).default([]),
  battery: batterySchema.nullable().optional(),
  tests: z.record(testEntrySchema).default({}),
  manual_checklist: z.record(manualChecklistSchema).default({}),
  retested_components: z.array(z.string()).default([]),
  repair_notes: z.string().default(''),
  general_notes: z.string().default(''),
  asset_tag: z.string().default(''),
  final_classification: z.string(),
  final_classification_override_reason: z.string().nullable().optional(),
  checklist_mode: z.string().nullable().optional(),
  stress: z.object({
    final_score: z.number(),
    cpu_score: z.number(),
    cpu_ops_per_sec: z.number(),
    disk_score: z.number(),
    disk_read_mb_s: z.number(),
    disk_write_mb_s: z.number(),
    gpu_score: z.number(),
    gpu_name: z.string().nullable().optional(),
    gpu_matched: z.boolean(),
  }).nullable().optional(),
});

export const commentSchema = z.object({
  test_key: z.string().min(1),
  author: z.string().min(1, 'Identifique-se').max(100),
  text: z.string().min(1, 'Escreva o comentário').max(2000),
});
