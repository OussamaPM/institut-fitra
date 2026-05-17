// Types de blocs disponibles
export type BlockType =
  | 'cover'           // Page de couverture
  | 'header'          // En-tête de page (titre arabe + français)
  | 'section-title'   // Bandeau titre de section
  | 'subtitle'        // Sous-titre (A – Ses noms)
  | 'paragraph'       // Paragraphe de texte
  | 'arabic-verse'    // Verset coranique en arabe avec tashkil
  | 'verse-box'       // Encadré pour traduction de verset
  | 'bullet-list'     // Liste à puces
  | 'numbered-list'   // Liste numérotée
  | 'quote'           // Citation (hadith, parole de savant)
  | 'reference'       // Référence coranique centrée
  | 'image'           // Image
  | 'footnote'        // Note de bas de page
  | 'page-break'      // Saut de page
  | 'notes-page'      // Page de notes avec lignes

// Bloc de contenu
export interface ContentBlock {
  id: string;
  type: BlockType;
  content: BlockContent;
  style?: BlockStyle;
}

// Contenu spécifique selon le type
export interface BlockContent {
  // Texte principal
  text?: string;
  // Texte arabe (pour versets)
  arabicText?: string;
  // Traduction française
  frenchText?: string;
  // Référence (ex: [Al-Baqarah 2:185])
  reference?: string;
  // Items de liste
  items?: string[];
  // URL d'image
  imageUrl?: string;
  // Légende d'image
  caption?: string;
  // Numéro de section (pour titres)
  sectionNumber?: string;
  // Sous-éléments (pour listes imbriquées)
  subItems?: { text: string; arrow?: boolean }[];
}

// Style personnalisé d'un bloc
export interface BlockStyle {
  fontSize?: number;
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  color?: string;
  backgroundColor?: string;
  marginTop?: number;
  marginBottom?: number;
  paddingX?: number;
  paddingY?: number;
}

// Configuration globale du document
export interface DocumentConfig {
  // Métadonnées
  title: string;
  subtitle?: string;
  seriesName?: string;
  seriesNumber?: string;
  author?: string;
  copyright?: string;

  // Logo
  logoUrl?: string;

  // Styles globaux par type de bloc
  styles: {
    cover: CoverStyle;
    header: HeaderStyle;
    sectionTitle: SectionTitleStyle;
    subtitle: SubtitleStyle;
    paragraph: ParagraphStyle;
    arabicVerse: ArabicVerseStyle;
    verseBox: VerseBoxStyle;
    bulletList: ListStyle;
    numberedList: ListStyle;
    quote: QuoteStyle;
    reference: ReferenceStyle;
    footnote: FootnoteStyle;
  };

  // Décoration
  decorations: {
    lanternsEnabled: boolean;
    lanternColor: string;
    lanternPosition: 'left' | 'right' | 'both';
  };

  // Page
  page: {
    backgroundColor: string;
    marginTop: number;
    marginBottom: number;
    marginLeft: number;
    marginRight: number;
    showPageNumbers: boolean;
    pageNumberStyle: 'circle' | 'simple';
  };
}

// Styles spécifiques par type
export interface CoverStyle {
  backgroundColor: string;
  titleColor: string;
  titleFontSize: number;
  subtitleColor: string;
  subtitleFontSize: number;
  mainTitleColor: string;
  mainTitleFontSize: number;
  borderColor: string;
  borderWidth: number;
}

export interface HeaderStyle {
  arabicFontSize: number;
  arabicColor: string;
  frenchFontSize: number;
  frenchColor: string;
  showLanterns: boolean;
}

export interface SectionTitleStyle {
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  paddingY: number;
}

export interface SubtitleStyle {
  color: string;
  fontSize: number;
  fontWeight: 'medium' | 'semibold' | 'bold';
  prefix?: string; // ex: "A – ", "B – "
}

export interface ParagraphStyle {
  fontSize: number;
  lineHeight: number;
  textAlign: 'left' | 'justify';
  color: string;
  firstLineIndent?: number;
}

export interface ArabicVerseStyle {
  fontSize: number;
  lineHeight: number;
  color: string;
  backgroundColor?: string;
  borderColor?: string;
  textAlign: 'center' | 'right';
}

export interface VerseBoxStyle {
  backgroundColor: string;
  borderColor: string;
  borderRadius: number;
  padding: number;
  fontSize: number;
  lineHeight: number;
}

export interface ListStyle {
  fontSize: number;
  lineHeight: number;
  bulletColor?: string;
  indentation: number;
  spacing: number;
}

export interface QuoteStyle {
  fontSize: number;
  fontStyle: 'normal' | 'italic';
  color: string;
  textAlign: 'center' | 'left';
  marginX: number;
}

export interface ReferenceStyle {
  fontSize: number;
  color: string;
  fontStyle: 'normal' | 'italic';
}

export interface FootnoteStyle {
  fontSize: number;
  color: string;
  lineColor: string;
}

// Document complet
export interface Document {
  id: string;
  config: DocumentConfig;
  pages: Page[];
  createdAt: Date;
  updatedAt: Date;
}

// Page du document
export interface Page {
  id: string;
  type: 'cover' | 'content' | 'notes';
  blocks: ContentBlock[];
  pageNumber?: number;
}

// État de l'éditeur
export interface EditorState {
  document: Document;
  selectedBlockId: string | null;
  selectedPageIndex: number;
  previewMode: boolean;
  zoom: number;
}

// Configuration par défaut
export const defaultDocumentConfig: DocumentConfig = {
  title: '',
  subtitle: '',
  seriesName: 'Al-Quran : Compréhension et Méditation',
  seriesNumber: '1',
  author: '',
  copyright: '',
  logoUrl: '/images/logo-fitra.png',

  styles: {
    cover: {
      backgroundColor: '#f5f0e6',
      titleColor: '#1e5a8a',
      titleFontSize: 18,
      subtitleColor: '#2b7cb5',
      subtitleFontSize: 14,
      mainTitleColor: '#1e5a8a',
      mainTitleFontSize: 36,
      borderColor: '#1e5a8a',
      borderWidth: 8,
    },
    header: {
      arabicFontSize: 24,
      arabicColor: '#1e5a8a',
      frenchFontSize: 11,
      frenchColor: '#1e5a8a',
      showLanterns: true,
    },
    sectionTitle: {
      backgroundColor: '#1e5a8a',
      textColor: '#ffffff',
      fontSize: 16,
      paddingY: 12,
    },
    subtitle: {
      color: '#1e5a8a',
      fontSize: 16,
      fontWeight: 'semibold',
    },
    paragraph: {
      fontSize: 12,
      lineHeight: 1.6,
      textAlign: 'justify',
      color: '#333333',
      firstLineIndent: 20,
    },
    arabicVerse: {
      fontSize: 22,
      lineHeight: 2.0,
      color: '#333333',
      textAlign: 'center',
    },
    verseBox: {
      backgroundColor: '#e8f4fc',
      borderColor: '#2b7cb5',
      borderRadius: 12,
      padding: 20,
      fontSize: 12,
      lineHeight: 1.6,
    },
    bulletList: {
      fontSize: 12,
      lineHeight: 1.6,
      bulletColor: '#1e5a8a',
      indentation: 20,
      spacing: 8,
    },
    numberedList: {
      fontSize: 12,
      lineHeight: 1.6,
      indentation: 20,
      spacing: 8,
    },
    quote: {
      fontSize: 12,
      fontStyle: 'normal',
      color: '#1e5a8a',
      textAlign: 'center',
      marginX: 40,
    },
    reference: {
      fontSize: 11,
      color: '#666666',
      fontStyle: 'italic',
    },
    footnote: {
      fontSize: 10,
      color: '#666666',
      lineColor: '#cccccc',
    },
  },

  decorations: {
    lanternsEnabled: true,
    lanternColor: '#1e5a8a',
    lanternPosition: 'right',
  },

  page: {
    backgroundColor: '#f5f0e6',
    marginTop: 20,
    marginBottom: 20,
    marginLeft: 25,
    marginRight: 25,
    showPageNumbers: true,
    pageNumberStyle: 'circle',
  },
};
