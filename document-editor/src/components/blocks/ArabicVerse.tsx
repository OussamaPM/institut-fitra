'use client';

import { ContentBlock, ArabicVerseStyle } from '@/types';

interface ArabicVerseProps {
  block: ContentBlock;
  style: ArabicVerseStyle;
  isEditing?: boolean;
  onContentChange?: (content: ContentBlock['content']) => void;
}

export default function ArabicVerse({
  block,
  style,
  isEditing = false,
  onContentChange,
}: ArabicVerseProps) {
  const { arabicText } = block.content;

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onContentChange) {
      onContentChange({ ...block.content, arabicText: e.target.value });
    }
  };

  return (
    <div
      className="my-6 py-6 px-8 rounded-lg"
      style={{
        backgroundColor: style.backgroundColor || 'transparent',
        borderColor: style.borderColor,
        borderWidth: style.borderColor ? '1px' : 0,
        borderStyle: 'solid',
      }}
    >
      {/* Décoration supérieure */}
      <div className="flex justify-center mb-4">
        <div className="text-primary text-2xl">﴿</div>
      </div>

      {isEditing ? (
        <textarea
          value={arabicText || ''}
          onChange={handleTextChange}
          placeholder="أدخل النص العربي هنا..."
          dir="rtl"
          className="w-full min-h-[150px] bg-transparent border border-gray-200 rounded-lg p-4 outline-none focus:border-primary resize-y font-scheherazade"
          style={{
            fontSize: `${style.fontSize}px`,
            lineHeight: style.lineHeight,
            textAlign: style.textAlign,
            color: style.color,
          }}
        />
      ) : (
        <p
          className="font-scheherazade arabic-text"
          style={{
            fontSize: `${style.fontSize}px`,
            lineHeight: style.lineHeight,
            textAlign: style.textAlign,
            color: style.color,
          }}
        >
          {arabicText}
        </p>
      )}

      {/* Décoration inférieure */}
      <div className="flex justify-center mt-4">
        <div className="text-primary text-2xl">﴾</div>
      </div>
    </div>
  );
}
