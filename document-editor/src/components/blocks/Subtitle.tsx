'use client';

import { ContentBlock, SubtitleStyle } from '@/types';

interface SubtitleProps {
  block: ContentBlock;
  style: SubtitleStyle;
  isEditing?: boolean;
  onContentChange?: (content: ContentBlock['content']) => void;
}

export default function Subtitle({
  block,
  style,
  isEditing = false,
  onContentChange,
}: SubtitleProps) {
  const { sectionNumber, text } = block.content;

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onContentChange) {
      onContentChange({ ...block.content, text: e.target.value });
    }
  };

  const fontWeightClass = {
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  }[style.fontWeight];

  return (
    <div className="my-4">
      <h3
        className={`font-playfair ${fontWeightClass}`}
        style={{
          color: style.color,
          fontSize: `${style.fontSize}px`,
        }}
      >
        {isEditing ? (
          <div className="flex items-center gap-2">
            <span style={{ color: style.color }}>
              {sectionNumber && `${sectionNumber} – `}
            </span>
            <input
              type="text"
              value={text || ''}
              onChange={handleTextChange}
              placeholder="Sous-titre..."
              className="bg-transparent border-none outline-none flex-1"
              style={{
                color: style.color,
                fontSize: `${style.fontSize}px`,
              }}
            />
          </div>
        ) : (
          <>
            {sectionNumber && (
              <span style={{ color: style.color }}>{sectionNumber} – </span>
            )}
            {text}
          </>
        )}
      </h3>
    </div>
  );
}
