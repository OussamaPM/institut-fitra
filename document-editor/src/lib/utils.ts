import { v4 as uuidv4 } from 'uuid';
import { ContentBlock, BlockType, Document, Page, defaultDocumentConfig } from '@/types';

// Générer un ID unique
export function generateId(): string {
  return uuidv4();
}

// Créer un nouveau bloc
export function createBlock(type: BlockType, content?: Partial<ContentBlock['content']>): ContentBlock {
  return {
    id: generateId(),
    type,
    content: content || {},
  };
}

// Créer une nouvelle page
export function createPage(type: 'cover' | 'content' | 'notes' = 'content'): Page {
  return {
    id: generateId(),
    type,
    blocks: [],
  };
}

// Créer un nouveau document
export function createDocument(title: string = 'Nouveau document'): Document {
  return {
    id: generateId(),
    config: {
      ...defaultDocumentConfig,
      title,
    },
    pages: [
      {
        id: generateId(),
        type: 'cover',
        blocks: [],
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// Convertir mm en pixels (à 96 DPI)
export function mmToPixels(mm: number): number {
  return mm * 3.7795275591;
}

// Convertir pixels en mm
export function pixelsToMm(pixels: number): number {
  return pixels / 3.7795275591;
}

// Formater le texte arabe avec tashkil
export function formatArabicText(text: string): string {
  // Ajouter des styles pour le rendu correct du tashkil
  return text;
}

// Classe utilitaire pour combiner les classes CSS
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Blocs prédéfinis pour le Tafsir
export const predefinedBlocks: { type: BlockType; label: string; icon: string }[] = [
  { type: 'section-title', label: 'Titre de section', icon: '📌' },
  { type: 'subtitle', label: 'Sous-titre', icon: '📝' },
  { type: 'paragraph', label: 'Paragraphe', icon: '📄' },
  { type: 'arabic-verse', label: 'Verset arabe', icon: '🕌' },
  { type: 'verse-box', label: 'Encadré traduction', icon: '📦' },
  { type: 'bullet-list', label: 'Liste à puces', icon: '•' },
  { type: 'numbered-list', label: 'Liste numérotée', icon: '1.' },
  { type: 'quote', label: 'Citation', icon: '💬' },
  { type: 'reference', label: 'Référence', icon: '📖' },
  { type: 'image', label: 'Image', icon: '🖼️' },
  { type: 'footnote', label: 'Note de bas de page', icon: '¹' },
  { type: 'page-break', label: 'Saut de page', icon: '📃' },
  { type: 'notes-page', label: 'Page de notes', icon: '✍️' },
];

// Exemple de contenu pour le Tafsir Al-Qadr
export const sampleTafsirContent: ContentBlock[] = [
  createBlock('section-title', {
    text: 'Les informations principales à connaître',
    sectionNumber: '1',
  }),
  createBlock('subtitle', {
    text: 'Ses noms',
    sectionNumber: 'A',
  }),
  createBlock('numbered-list', {
    items: [
      'Al-Qadr (La valeur ou le décret): en raison de la répétition de ce terme dans cette sūrah.',
      'Laylatou lqadr (la nuit d\'al-qadr) : car c\'est le sujet principal de cette sūrah ainsi que la répétition de sa répétition à trois reprises.',
      'Innā anzalnāhou (seul) ou Innā anzalnāhou fī laylati lqadr (le verset entier) : nommée ainsi en raison de l\'introduction de cette sūrah par cette āyah.',
    ],
  }),
  createBlock('subtitle', {
    text: 'Présentation de la sūrah',
    sectionNumber: 'B',
  }),
  createBlock('bullet-list', {
    items: [
      'Nombre de āyah : 5',
      'Période de révélation : Divergence (Mecquoise ou Médinoise)',
      'Ordre de révélation : 25',
      'Ordre dans le muṣḥaf : 97',
    ],
  }),
];
