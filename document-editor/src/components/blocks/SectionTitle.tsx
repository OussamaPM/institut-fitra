'use client';

import { ContentBlock, SectionTitleStyle } from '@/types';

interface SectionTitleProps {
  block: ContentBlock;
  style: SectionTitleStyle;
  isEditing?: boolean;
  onContentChange?: (content: ContentBlock['content']) => void;
}

export default function SectionTitle({
  block,
  style,
  isEditing = false,
  onContentChange,
}: SectionTitleProps) {
  const { sectionNumber, text } = block.content;

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onContentChange) {
      onContentChange({ ...block.content, text: e.target.value });
    }
  };

  return (
    <div
      className="title-banner w-full"
      style={{
        backgroundColor: style.backgroundColor,
        color: style.textColor,
        fontSize: `${style.fontSize}px`,
        padding: `${style.paddingY}px 32px`,
      }}
    >
      {isEditing ? (
        <input
          type="text"
          value={text || ''}
          onChange={handleTextChange}
          placeholder="Titre de section..."
          className="bg-transparent border-none outline-none w-full font-playfair font-semibold"
          style={{ fontSize: `${style.fontSize}px` }}
        />
      ) : (
        <span className="font-playfair font-semibold">
          {sectionNumber && `${sectionNumber}- `}
          {text}
        </span>
      )}
    </div>
  );
}
