'use client';

import { ContentBlock, ParagraphStyle } from '@/types';

interface ParagraphProps {
  block: ContentBlock;
  style: ParagraphStyle;
  isEditing?: boolean;
  onContentChange?: (content: ContentBlock['content']) => void;
}

export default function Paragraph({
  block,
  style,
  isEditing = false,
  onContentChange,
}: ParagraphProps) {
  const { text } = block.content;

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onContentChange) {
      onContentChange({ ...block.content, text: e.target.value });
    }
  };

  return (
    <div className="my-3">
      {isEditing ? (
        <textarea
          value={text || ''}
          onChange={handleTextChange}
          placeholder="Écrivez votre paragraphe..."
          className="w-full min-h-[100px] bg-transparent border border-gray-200 rounded-lg p-3 outline-none focus:border-primary resize-y"
          style={{
            fontSize: `${style.fontSize}px`,
            lineHeight: style.lineHeight,
            textAlign: style.textAlign,
            color: style.color,
          }}
        />
      ) : (
        <p
          className="font-inter"
          style={{
            fontSize: `${style.fontSize}px`,
            lineHeight: style.lineHeight,
            textAlign: style.textAlign,
            color: style.color,
            textIndent: style.firstLineIndent ? `${style.firstLineIndent}px` : undefined,
          }}
        >
          {text}
        </p>
      )}
    </div>
  );
}
