import type { AutoStatus, FinalClassification, ManualStatus } from './types';

/** Rótulos amigáveis para chaves snake_case dos testes vindas do app. */
export const TEST_LABELS: Record<string, string> = {
  ram: 'Memória RAM',
  armazenamento: 'Armazenamento',
  saude_disco: 'Saúde do disco',
  bateria: 'Bateria',
  carregador: 'Carregador',
  hdmi: 'HDMI / monitor externo',
  wifi: 'Wi-Fi',
  bluetooth: 'Bluetooth',
  internet: 'Internet',
  audio: 'Áudio',
  estereo: 'Áudio estéreo',
  microfone: 'Microfone',
  tela: 'Tela',
  brilho: 'Brilho da tela',
  camera: 'Câmera',
  teclado: 'Teclado',
  touchpad: 'Touchpad',
  webcam: 'Webcam',
  usb: 'Portas USB',
  taxa_atualizacao: 'Taxa de atualização',
  biometria: 'Digital / Câmera IR',
  leitor_cartao: 'Leitor de cartão',
  throttling: 'Throttling térmico',
  descarga_bateria: 'Descarga de bateria',
  stress: 'Stress test (CPU + disco)',
  humanizacao: 'Humanização (12h)',
};

export const MANUAL_LABELS: Record<string, string> = {
  carcaca: 'Carcaça',
  tela: 'Tela',
  teclado: 'Teclado',
  touchpad: 'Touchpad',
  dobradicas: 'Dobradiças',
  usb: 'Portas USB',
  hdmi: 'HDMI',
  carregador: 'Carregador',
};

export function labelTest(key: string): string {
  return TEST_LABELS[key] ?? key;
}

export function labelManual(key: string): string {
  return MANUAL_LABELS[key] ?? key;
}

export function statusToTone(
  status: AutoStatus | ManualStatus | string,
): 'ok' | 'warn' | 'bad' | 'mute' {
  switch (status) {
    case 'OK':
      return 'ok';
    case 'Atenção':
    case 'Observação':
      return 'warn';
    case 'Falha':
    case 'Com defeito':
      return 'bad';
    default:
      return 'mute';
  }
}

export function classificationTone(
  c: FinalClassification | string,
): 'ok' | 'warn' | 'bad' | 'mute' {
  switch (c) {
    case 'Aprovado':
      return 'ok';
    case 'Aprovado com ressalvas':
      return 'warn';
    case 'Reprovado':
      return 'bad';
    default:
      return 'mute';
  }
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function formatDate(iso: string | undefined | null): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return dateFormatter.format(d);
}

export function formatGb(value: number | null | undefined): string {
  if (value == null) return '-';
  return `${value.toFixed(1)} GB`;
}
