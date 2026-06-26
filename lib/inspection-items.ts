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

/** Tipo de equipamento — define o catálogo de fotos. */
export type InspectionKind = 'notebook' | 'desktop';

const DEFECTS: InspectionItemDef[] = [
  { key: 'defeito_1', label: 'Defeito 1', instruction: 'Foto de um defeito encontrado (risco, trinca, mancha...). Envie só se houver.', optional: true },
  { key: 'defeito_2', label: 'Defeito 2', instruction: 'Foto de outro defeito encontrado. Envie só se houver.', optional: true },
  { key: 'defeito_3', label: 'Defeito 3', instruction: 'Foto de outro defeito encontrado. Envie só se houver.', optional: true },
  { key: 'defeito_4', label: 'Defeito 4', instruction: 'Foto de outro defeito encontrado. Envie só se houver.', optional: true },
  { key: 'defeito_5', label: 'Defeito 5', instruction: 'Foto de outro defeito encontrado. Envie só se houver.', optional: true },
];

/** Catálogo de NOTEBOOK: 4 fotos principais + slots de defeito. */
export const INSPECTION_ITEMS: InspectionItemDef[] = [
  { key: 'carcaca_superior', label: 'Tampa superior', instruction: 'Tampa superior do notebook (logo/acabamento). Mostre arranhões ou trincas, se houver.' },
  { key: 'carcaca_inferior', label: 'Tampa inferior', instruction: 'Base do notebook, com parafusos e etiquetas visíveis.' },
  { key: 'tela', label: 'Tela', instruction: 'Tela ligada, de frente, mostrando o estado do painel (manchas, riscos, pixels).' },
  { key: 'palmrest', label: 'Palmrest (teclado e touchpad)', instruction: 'Parte interna aberta: teclado, touchpad e descanso de mãos.' },
  ...DEFECTS,
];

/** Catálogo de DESKTOP: 3 fotos da carcaça + 1 interna + slots de defeito. */
export const DESKTOP_INSPECTION_ITEMS: InspectionItemDef[] = [
  { key: 'carcaca_frente', label: 'Carcaça — frente', instruction: 'Frente do gabinete (painel frontal, portas e botões).' },
  { key: 'carcaca_traseira', label: 'Carcaça — traseira', instruction: 'Traseira do gabinete, mostrando as portas e conexões.' },
  { key: 'carcaca_lateral', label: 'Carcaça — lateral', instruction: 'Lateral do gabinete (tampa de acesso).' },
  { key: 'interna', label: 'Interna (aberta)', instruction: 'Parte interna com o gabinete aberto: placa-mãe, cabos e componentes.' },
  ...DEFECTS,
];

/** Catálogo conforme o tipo de equipamento. */
export function catalogFor(kind: InspectionKind | string | null | undefined): InspectionItemDef[] {
  return kind === 'desktop' ? DESKTOP_INSPECTION_ITEMS : INSPECTION_ITEMS;
}

/** Itens principais (não-defeito) conforme o tipo. */
export function mainItemsFor(kind: InspectionKind | string | null | undefined): InspectionItemDef[] {
  return catalogFor(kind).filter((i) => !i.optional);
}

/** Itens principais do notebook — usados na contagem de progresso (compat). */
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

/** Procura uma chave em AMBOS os catálogos (notebook e desktop). */
export function findInspectionItem(key: string): InspectionItemDef | undefined {
  return INSPECTION_ITEMS.find((i) => i.key === key)
    ?? DESKTOP_INSPECTION_ITEMS.find((i) => i.key === key);
}
