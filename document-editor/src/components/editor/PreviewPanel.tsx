'use client';

import { useRef } from 'react';
import { Document } from '@/types';
import { CoverPage, PageHeader } from '@/components/blocks';
import BlockRenderer from './BlockRenderer';

interface PreviewPanelProps {
  document: Document;
}

export default function PreviewPanel({ document }: PreviewPanelProps) {
  const previewRef = useRef<HTMLDivElement>(null);

  const handleExportPDF = async () => {
    if (!previewRef.current) return;

    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const pages = previewRef.current.querySelectorAll('.preview-page');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        const canvas = await html2canvas(page, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: document.config.page.backgroundColor,
        });

        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        if (i > 0) {
          pdf.addPage();
        }

        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      }

      pdf.save(`${document.config.title || 'document'}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Erreur lors de la génération du PDF');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-200">
      {/* Export Button */}
      <div className="p-4 bg-white border-b flex justify-end">
        <button
          onClick={handleExportPDF}
          className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Exporter PDF
        </button>
      </div>

      {/* Preview Area */}
      <div className="flex-1 overflow-auto p-8" ref={previewRef}>
        <div className="space-y-8">
          {document.pages.map((page, pageIndex) => (
            <div
              key={page.id}
              className="preview-page page-a4 mx-auto shadow-lg"
              style={{
                backgroundColor: document.config.page.backgroundColor,
                padding: `${document.config.page.marginTop}mm ${document.config.page.marginRight}mm ${document.config.page.marginBottom}mm ${document.config.page.marginLeft}mm`,
              }}
            >
              {page.type === 'cover' ? (
                <CoverPage
                  config={document.config}
                  style={document.config.styles.cover}
                />
              ) : (
                <>
                  {/* Page Header (except first content page) */}
                  {pageIndex > 1 && (
                    <PageHeader
                      config={document.config}
                      style={document.config.styles.header}
                    />
                  )}

                  {/* Blocks */}
                  <div className="space-y-4">
                    {page.blocks.map((block) => (
                      <BlockRenderer
                        key={block.id}
                        block={block}
                        config={document.config}
                        isEditing={false}
                      />
                    ))}
                  </div>

                  {/* Page Number */}
                  {document.config.page.showPageNumbers && (
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
                      <div className="page-number">{pageIndex}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
