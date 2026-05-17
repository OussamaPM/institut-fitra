'use client';

import { ContentBlock, ListStyle } from '@/types';

interface NumberedListProps {
  block: ContentBlock;
  style: ListStyle;
  isEditing?: boolean;
  onContentChange?: (content: ContentBlock['content']) => void;
}

export default function NumberedList({
  block,
  style,
  isEditing = false,
  onContentChange,
}: NumberedListProps) {
  const { items = [], subItems = [] } = block.content;

  const handleItemChange = (index: number, value: string) => {
    if (onContentChange) {
      const newItems = [...items];
      newItems[index] = value;
      onContentChange({ ...block.content, items: newItems });
    }
  };

  const handleAddItem = () => {
    if (onContentChange) {
      onContentChange({ ...block.content, items: [...items, ''] });
    }
  };

  const handleRemoveItem = (index: number) => {
    if (onContentChange) {
      const newItems = items.filter((_, i) => i !== index);
      onContentChange({ ...block.content, items: newItems });
    }
  };

  return (
    <div className="my-4">
      {isEditing ? (
        <div className="space-y-2">
          {items.map((item, index) => (
            <div key={index} className="flex items-start gap-2">
              <span
                className="font-medium min-w-[24px]"
                style={{
                  color: style.bulletColor || '#1e5a8a',
                  marginLeft: `${style.indentation}px`,
                }}
              >
                {index + 1}.
              </span>
              <textarea
                value={item}
                onChange={(e) => handleItemChange(index, e.target.value)}
                placeholder="Élément de liste..."
                className="flex-1 bg-transparent border border-gray-200 rounded px-2 py-1 outline-none focus:border-primary resize-y min-h-[36px]"
                style={{
                  fontSize: `${style.fontSize}px`,
                }}
              />
              <button
                onClick={() => handleRemoveItem(index)}
                className="text-red-500 hover:text-red-700 px-2"
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={handleAddItem}
            className="text-primary hover:underline text-sm ml-6"
          >
            + Ajouter un élément
          </button>
        </div>
      ) : (
        <ol className="space-y-1" style={{ marginLeft: `${style.indentation}px` }}>
          {items.map((item, index) => (
            <li
              key={index}
              className="flex items-start gap-2"
              style={{
                fontSize: `${style.fontSize}px`,
                lineHeight: style.lineHeight,
                marginBottom: `${style.spacing}px`,
              }}
            >
              <span
                className="font-medium min-w-[24px]"
                style={{ color: style.bulletColor || '#1e5a8a' }}
              >
                {index + 1}.
              </span>
              <span className="flex-1">{item}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
