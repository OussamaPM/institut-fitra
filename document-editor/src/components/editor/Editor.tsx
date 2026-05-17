'use client';

import { useState, useCallback } from 'react';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { Document, ContentBlock, BlockType, DocumentConfig } from '@/types';
import { createBlock, createDocument } from '@/lib/utils';
import BlockToolbar from './BlockToolbar';
import ConfigPanel from './ConfigPanel';
import SortableBlock from './SortableBlock';
import BlockRenderer from './BlockRenderer';
import PreviewPanel from './PreviewPanel';
import { CoverPage } from '@/components/blocks';

export default function Editor() {
  const [document, setDocument] = useState<Document>(() =>
    createDocument('SOURATE AL-QADR')
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const currentPage = document.pages[currentPageIndex];
  const blocks = currentPage?.blocks || [];

  // Ajouter un bloc
  const handleAddBlock = useCallback((type: BlockType) => {
    const newBlock = createBlock(type);
    setDocument((prev) => {
      const newPages = [...prev.pages];
      newPages[currentPageIndex] = {
        ...newPages[currentPageIndex],
        blocks: [...newPages[currentPageIndex].blocks, newBlock],
      };
      return { ...prev, pages: newPages, updatedAt: new Date() };
    });
    setSelectedBlockId(newBlock.id);
  }, [currentPageIndex]);

  // Supprimer un bloc
  const handleDeleteBlock = useCallback((blockId: string) => {
    setDocument((prev) => {
      const newPages = [...prev.pages];
      newPages[currentPageIndex] = {
        ...newPages[currentPageIndex],
        blocks: newPages[currentPageIndex].blocks.filter((b) => b.id !== blockId),
      };
      return { ...prev, pages: newPages, updatedAt: new Date() };
    });
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
  }, [currentPageIndex, selectedBlockId]);

  // Mettre à jour le contenu d'un bloc
  const handleContentChange = useCallback((blockId: string, content: ContentBlock['content']) => {
    setDocument((prev) => {
      const newPages = [...prev.pages];
      newPages[currentPageIndex] = {
        ...newPages[currentPageIndex],
        blocks: newPages[currentPageIndex].blocks.map((b) =>
          b.id === blockId ? { ...b, content } : b
        ),
      };
      return { ...prev, pages: newPages, updatedAt: new Date() };
    });
  }, [currentPageIndex]);

  // Mettre à jour la configuration
  const handleConfigChange = useCallback((config: DocumentConfig) => {
    setDocument((prev) => ({ ...prev, config, updatedAt: new Date() }));
  }, []);

  // Gérer le drag & drop
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setDocument((prev) => {
        const oldIndex = blocks.findIndex((b) => b.id === active.id);
        const newIndex = blocks.findIndex((b) => b.id === over.id);
        const newBlocks = arrayMove(blocks, oldIndex, newIndex);

        const newPages = [...prev.pages];
        newPages[currentPageIndex] = {
          ...newPages[currentPageIndex],
          blocks: newBlocks,
        };
        return { ...prev, pages: newPages, updatedAt: new Date() };
      });
    }
  }, [blocks, currentPageIndex]);

  // Ajouter une page
  const handleAddPage = useCallback(() => {
    setDocument((prev) => ({
      ...prev,
      pages: [
        ...prev.pages,
        { id: crypto.randomUUID(), type: 'content', blocks: [] },
      ],
      updatedAt: new Date(),
    }));
    setCurrentPageIndex(document.pages.length);
  }, [document.pages.length]);

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-playfair font-semibold text-primary">
            Éditeur de Documents
          </h1>
          <span className="text-sm text-gray-500">
            {document.config.title || 'Sans titre'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showPreview
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {showPreview ? 'Éditer' : 'Prévisualiser'}
          </button>
          <button
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            Exporter PDF
          </button>
        </div>
      </header>

      {/* Toolbar */}
      {!showPreview && <BlockToolbar onAddBlock={handleAddBlock} />}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {showPreview ? (
          <PreviewPanel document={document} />
        ) : (
          <>
            {/* Zone d'édition */}
            <div className="flex-1 overflow-auto p-6">
              {/* Navigation des pages */}
              <div className="flex items-center gap-2 mb-4">
                {document.pages.map((page, index) => (
                  <button
                    key={page.id}
                    onClick={() => setCurrentPageIndex(index)}
                    className={`px-4 py-2 rounded-lg text-sm ${
                      currentPageIndex === index
                        ? 'bg-primary text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {page.type === 'cover' ? 'Couverture' : `Page ${index}`}
                  </button>
                ))}
                <button
                  onClick={handleAddPage}
                  className="px-4 py-2 bg-white text-gray-700 rounded-lg text-sm hover:bg-gray-50 border border-dashed border-gray-300"
                >
                  + Page
                </button>
              </div>

              {/* Page A4 */}
              <div
                className="page-a4 mx-auto"
                style={{
                  backgroundColor: document.config.page.backgroundColor,
                  padding: `${document.config.page.marginTop}mm ${document.config.page.marginRight}mm ${document.config.page.marginBottom}mm ${document.config.page.marginLeft}mm`,
                }}
              >
                {currentPage?.type === 'cover' ? (
                  <CoverPage
                    config={document.config}
                    style={document.config.styles.cover}
                  />
                ) : (
                  <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                      {blocks.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-gray-400">
                          <p>Cliquez sur un bloc pour l'ajouter</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {blocks.map((block) => (
                            <SortableBlock
                              key={block.id}
                              id={block.id}
                              isSelected={selectedBlockId === block.id}
                              onSelect={() => setSelectedBlockId(block.id)}
                              onDelete={() => handleDeleteBlock(block.id)}
                            >
                              <BlockRenderer
                                block={block}
                                config={document.config}
                                isEditing={selectedBlockId === block.id}
                                onContentChange={handleContentChange}
                              />
                            </SortableBlock>
                          ))}
                        </div>
                      )}
                    </SortableContext>
                  </DndContext>
                )}

                {/* Numéro de page */}
                {document.config.page.showPageNumbers && currentPage?.type !== 'cover' && (
                  <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                    <div className="page-number">
                      {currentPageIndex}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Panneau de configuration */}
            <ConfigPanel
              config={document.config}
              onConfigChange={handleConfigChange}
            />
          </>
        )}
      </div>
    </div>
  );
}
