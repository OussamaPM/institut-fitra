'use client';

import { BlockType } from '@/types';
import { predefinedBlocks } from '@/lib/utils';

interface BlockToolbarProps {
  onAddBlock: (type: BlockType) => void;
}

export default function BlockToolbar({ onAddBlock }: BlockToolbarProps) {
  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Ajouter un bloc</h3>
      <div className="flex flex-wrap gap-2">
        {predefinedBlocks.map((block) => (
          <button
            key={block.type}
            onClick={() => onAddBlock(block.type)}
            className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-primary hover:text-white rounded-lg border border-gray-200 transition-colors text-sm"
            title={block.label}
          >
            <span>{block.icon}</span>
            <span className="hidden md:inline">{block.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
