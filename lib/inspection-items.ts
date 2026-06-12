/**
 * Catálogo dos itens de inspeção física fotográfica. Mantenha em sincronia com
 * src/NotebookCheck/Domain/Models/InspectionPhotoItem.cs (InspectionCatalog).
 *
 * 4 fotos principais (visão geral do equipamento) + 5 slots OPCIONAIS para
 * registrar defeitos. Nenhuma foto é obrigatória: o técnico envia as que
 * fizerem sentido e pode finalizar o checklist sem completar a lista.
 */
export interface InspectionItemDef {
  key: string;
  label: string;
  instruction: string;
  /** true = slot extra de defeito; só aparece no relatório quando enviado. */
  optional?: boolean;
}

export const INSPECTION_ITEMS: InspectionItemDef[] = [
  { key: 'carcaca_superior', label: 'Tampa superior', instruction: 'Tampa superior do notebook (logo/acabamento). Mostre arranhões ou trincas, se houver.' },
  { key: 'carcaca_inferior', label: 'Tampa inferior', instruction: 'Base do notebook, com parafusos e etiquetas visíveis.' },
  { key: 'tela', label: 'Tela', instruction: 'Tela ligada, de frente, mostrando o estado do painel (manchas, riscos, pixels).' },
  { key: 'palmrest', label: 'Palmrest (teclado e touchpad)', instruction: 'Parte interna aberta: teclado, touchpad e descanso de mãos.' },
  { key: 'defeito_1', label: 'Defeito 1', instruction: 'Foto de um defeito encontrado (risco, trinca, mancha, tecla...). Envie só se houver.', optional: true },
  { key: 'defeito_2', label: 'Defeito 2', instruction: 'Foto de outro defeito encontrado. Envie só se houver.', optional: true },
  { key: 'defeito_3', label: 'Defeito 3', instruction: 'Foto de outro defeito encontrado. Envie só se houver.', optional: true },
  { key: 'defeito_4', label: 'Defeito 4', instruction: 'Foto de outro defeito encontrado. Envie só se houver.', optional: true },
  { key: 'defeito_5', label: 'Defeito 5', instruction: 'Foto de outro defeito encontrado. Envie só se houver.', optional: true },
];

/** Itens principais (visão geral) — usados na contagem de progresso. */
export const MAIN_INSPECTION_ITEMS = INSPECTION_ITEMS.filter((i) => !i.optional);

/** Rótulos de chaves legadas (catálogo antigo) para relatórios já gravados. */
export const LEGACY_INSPECTION_LABELS: Record<string, string> = {
  teclado: 'Teclado',
  touchpad: 'Touchpad',
  dobradicas: 'Dobradiças',
  laterais_portas: 'Laterais e portas',
  etiqueta_serial: 'Etiqueta / serial',
  carregador: 'Carregador',
};

export function findInspectionItem(key: string): InspectionItemDef | undefined {
  return INSPECTION_ITEMS.find((i) => i.key === key);
}
