/**
 * Catálogo dos itens de inspeção física fotográfica. Mantenha em sincronia com
 * src/NotebookCheck/Domain/Models/InspectionPhotoItem.cs (InspectionCatalog).
 */
export interface InspectionItemDef {
  key: string;
  label: string;
  instruction: string;
}

export const INSPECTION_ITEMS: InspectionItemDef[] = [
  { key: 'carcaca_superior', label: 'Carcaça superior', instruction: 'Tampa superior do notebook (logo/acabamento). Mostre arranhões ou trincas, se houver.' },
  { key: 'carcaca_inferior', label: 'Carcaça inferior', instruction: 'Base do notebook, com parafusos e etiquetas visíveis.' },
  { key: 'tela', label: 'Tela', instruction: 'Tela ligada, de frente, mostrando o estado do painel (manchas, riscos, pixels).' },
  { key: 'teclado', label: 'Teclado', instruction: 'Teclado completo de cima, mostrando todas as teclas.' },
  { key: 'touchpad', label: 'Touchpad', instruction: 'Área do touchpad e descanso de mãos.' },
  { key: 'dobradicas', label: 'Dobradiças', instruction: 'Dobradiças da tela, com o notebook semiaberto.' },
  { key: 'laterais_portas', label: 'Laterais e portas', instruction: 'Laterais do notebook mostrando as portas (USB, HDMI, P2, etc.).' },
  { key: 'etiqueta_serial', label: 'Etiqueta / serial', instruction: 'Etiqueta com número de série / service tag legível.' },
  { key: 'carregador', label: 'Carregador', instruction: 'Carregador/fonte com a etiqueta de especificação visível.' },
];

export function findInspectionItem(key: string): InspectionItemDef | undefined {
  return INSPECTION_ITEMS.find((i) => i.key === key);
}
