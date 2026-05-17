'use client';

import { ContentBlock, DocumentConfig } from '@/types';
import {
  SectionTitle,
  Subtitle,
  Paragraph,
  ArabicVerse,
  VerseBox,
  BulletList,
  NumberedList,
  Quote,
} from '@/components/blocks';

interface BlockRendererProps {
  block: ContentBlock;
  config: DocumentConfig;
  isEditing?: boolean;
  onContentChange?: (blockId: string, content: ContentBlock['content']) => void;
}

export default function BlockRenderer({
  block,
  config,
  isEditing = false,
  onContentChange,
}: BlockRendererProps) {
  const handleContentChange = (content: ContentBlock['content']) => {
    if (onContentChange) {
      onContentChange(block.id, content);
    }
  };

  switch (block.type) {
    case 'section-title':
      return (
        <SectionTitle
          block={block}
          style={config.styles.sectionTitle}
          isEditing={isEditing}
          onContentChange={handleContentChange}
        />
      );

    case 'subtitle':
      return (
        <Subtitle
          block={block}
          style={config.styles.subtitle}
          isEditing={isEditing}
          onContentChange={handleContentChange}
        />
      );

    case 'paragraph':
      return (
        <Paragraph
          block={block}
          style={config.styles.paragraph}
          isEditing={isEditing}
          onContentChange={handleContentChange}
        />
      );

    case 'arabic-verse':
      return (
        <ArabicVerse
          block={block}
          style={config.styles.arabicVerse}
          isEditing={isEditing}
          onContentChange={handleContentChange}
        />
      );

    case 'verse-box':
      return (
        <VerseBox
          block={block}
          style={config.styles.verseBox}
          isEditing={isEditing}
          onContentChange={handleContentChange}
        />
      );

    case 'bullet-list':
      return (
        <BulletList
          block={block}
          style={config.styles.bulletList}
          isEditing={isEditing}
          onContentChange={handleContentChange}
        />
      );

    case 'numbered-list':
      return (
        <NumberedList
          block={block}
          style={config.styles.numberedList}
          isEditing={isEditing}
          onContentChange={handleContentChange}
        />
      );

    case 'quote':
      return (
        <Quote
          block={block}
          style={config.styles.quote}
          isEditing={isEditing}
          onContentChange={handleContentChange}
        />
      );

    case 'page-break':
      return (
        <div className="my-8 border-t-2 border-dashed border-gray-300 relative">
          <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-white px-4 text-sm text-gray-400">
            Saut de page
          </span>
        </div>
      );

    case 'footnote':
      return (
        <div
          className="mt-8 pt-4 border-t"
          style={{ borderColor: config.styles.footnote.lineColor }}
        >
          <p
            style={{
              fontSize: `${config.styles.footnote.fontSize}px`,
              color: config.styles.footnote.color,
            }}
          >
            {block.content.text}
          </p>
        </div>
      );

    default:
      return (
        <div className="p-4 bg-gray-100 rounded text-gray-500 text-center">
          Type de bloc non supporté: {block.type}
        </div>
      );
  }
}
