'use client';

import { ContentBlock, VerseBoxStyle } from '@/types';

interface VerseBoxProps {
  block: ContentBlock;
  style: VerseBoxStyle;
  isEditing?: boolean;
  onContentChange?: (content: ContentBlock['content']) => void;
}

export default function VerseBox({
  block,
  style,
  isEditing = false,
  onContentChange,
}: VerseBoxProps) {
  const { frenchText, reference } = block.content;

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onContentChange) {
      onContentChange({ ...block.content, frenchText: e.target.value });
    }
  };

  const handleReferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onContentChange) {
      onContentChange({ ...block.content, reference: e.target.value });
    }
  };

  return (
    <div
      className="my-6 verse-box"
      style={{
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        borderRadius: `${style.borderRadius}px`,
        padding: `${style.padding}px`,
      }}
    >
      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={frenchText || ''}
            onChange={handleTextChange}
            placeholder="Traduction française du verset..."
            className="w-full min-h-[80px] bg-white/50 border border-gray-200 rounded-lg p-3 outline-none focus:border-primary resize-y"
            style={{
              fontSize: `${style.fontSize}px`,
              lineHeight: style.lineHeight,
            }}
          />
          <input
            type="text"
            value={reference || ''}
            onChange={handleReferenceChange}
            placeholder="[Référence]"
            className="w-full bg-white/50 border border-gray-200 rounded-lg p-2 outline-none focus:border-primary text-center text-sm italic text-gray-600"
          />
        </div>
      ) : (
        <>
          <p
            className="font-inter"
            style={{
              fontSize: `${style.fontSize}px`,
              lineHeight: style.lineHeight,
            }}
          >
            {frenchText}
          </p>
          {reference && (
            <p className="text-center text-sm italic text-gray-600 mt-3">
              {reference}
            </p>
          )}
        </>
      )}
    </div>
  );
}
