'use client';

import { ContentBlock, QuoteStyle } from '@/types';

interface QuoteProps {
  block: ContentBlock;
  style: QuoteStyle;
  isEditing?: boolean;
  onContentChange?: (content: ContentBlock['content']) => void;
}

export default function Quote({
  block,
  style,
  isEditing = false,
  onContentChange,
}: QuoteProps) {
  const { text, reference } = block.content;

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onContentChange) {
      onContentChange({ ...block.content, text: e.target.value });
    }
  };

  const handleReferenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (onContentChange) {
      onContentChange({ ...block.content, reference: e.target.value });
    }
  };

  return (
    <div
      className="my-6"
      style={{
        marginLeft: `${style.marginX}px`,
        marginRight: `${style.marginX}px`,
      }}
    >
      {isEditing ? (
        <div className="space-y-3">
          <textarea
            value={text || ''}
            onChange={handleTextChange}
            placeholder="Citation..."
            className="w-full min-h-[60px] bg-transparent border border-gray-200 rounded-lg p-3 outline-none focus:border-primary resize-y"
            style={{
              fontSize: `${style.fontSize}px`,
              fontStyle: style.fontStyle,
              color: style.color,
              textAlign: style.textAlign,
            }}
          />
          <input
            type="text"
            value={reference || ''}
            onChange={handleReferenceChange}
            placeholder="[Référence]"
            className="w-full bg-transparent border border-gray-200 rounded px-3 py-1 outline-none focus:border-primary text-center text-sm italic text-gray-600"
          />
        </div>
      ) : (
        <>
          <p
            style={{
              fontSize: `${style.fontSize}px`,
              fontStyle: style.fontStyle,
              color: style.color,
              textAlign: style.textAlign,
            }}
          >
            « {text} »
          </p>
          {reference && (
            <p className="text-center text-sm italic text-gray-500 mt-2">
              {reference}
            </p>
          )}
        </>
      )}
    </div>
  );
}
