'use client';

import { useState } from 'react';
import { DocumentConfig } from '@/types';

interface ConfigPanelProps {
  config: DocumentConfig;
  onConfigChange: (config: DocumentConfig) => void;
}

type TabType = 'document' | 'cover' | 'header' | 'styles' | 'page';

export default function ConfigPanel({ config, onConfigChange }: ConfigPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('document');

  const tabs: { id: TabType; label: string }[] = [
    { id: 'document', label: 'Document' },
    { id: 'cover', label: 'Couverture' },
    { id: 'header', label: 'En-tête' },
    { id: 'styles', label: 'Styles' },
    { id: 'page', label: 'Page' },
  ];

  const updateConfig = <K extends keyof DocumentConfig>(
    key: K,
    value: DocumentConfig[K]
  ) => {
    onConfigChange({ ...config, [key]: value });
  };

  const updateStyles = <K extends keyof DocumentConfig['styles']>(
    styleKey: K,
    value: Partial<DocumentConfig['styles'][K]>
  ) => {
    onConfigChange({
      ...config,
      styles: {
        ...config.styles,
        [styleKey]: { ...config.styles[styleKey], ...value },
      },
    });
  };

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col h-full">
      {/* Onglets */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              activeTab === tab.id
                ? 'text-primary border-b-2 border-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'document' && (
          <DocumentTab config={config} updateConfig={updateConfig} />
        )}
        {activeTab === 'cover' && (
          <CoverTab config={config} updateStyles={updateStyles} />
        )}
        {activeTab === 'header' && (
          <HeaderTab config={config} updateStyles={updateStyles} />
        )}
        {activeTab === 'styles' && (
          <StylesTab config={config} updateStyles={updateStyles} />
        )}
        {activeTab === 'page' && (
          <PageTab config={config} updateConfig={updateConfig} />
        )}
      </div>
    </div>
  );
}

// Onglet Document
function DocumentTab({
  config,
  updateConfig,
}: {
  config: DocumentConfig;
  updateConfig: <K extends keyof DocumentConfig>(key: K, value: DocumentConfig[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Titre du document
        </label>
        <input
          type="text"
          value={config.title}
          onChange={(e) => updateConfig('title', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          placeholder="SOURATE AL-QADR"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nom de la série
        </label>
        <input
          type="text"
          value={config.seriesName || ''}
          onChange={(e) => updateConfig('seriesName', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          placeholder="Al-Quran : Compréhension et Méditation"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Sous-titre de série
        </label>
        <input
          type="text"
          value={config.subtitle || ''}
          onChange={(e) => updateConfig('subtitle', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          placeholder="Compréhension et Méditation"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Numéro de série
        </label>
        <input
          type="text"
          value={config.seriesNumber || ''}
          onChange={(e) => updateConfig('seriesNumber', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          placeholder="6"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Auteur
        </label>
        <input
          type="text"
          value={config.author || ''}
          onChange={(e) => updateConfig('author', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          placeholder="Nom de l'auteur"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Copyright
        </label>
        <input
          type="text"
          value={config.copyright || ''}
          onChange={(e) => updateConfig('copyright', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          placeholder="Abdelbasset Nejjari"
        />
      </div>
    </div>
  );
}

// Onglet Couverture
function CoverTab({
  config,
  updateStyles,
}: {
  config: DocumentConfig;
  updateStyles: <K extends keyof DocumentConfig['styles']>(
    key: K,
    value: Partial<DocumentConfig['styles'][K]>
  ) => void;
}) {
  const coverStyle = config.styles.cover;

  return (
    <div className="space-y-4">
      <ColorInput
        label="Couleur de fond"
        value={coverStyle.backgroundColor}
        onChange={(v) => updateStyles('cover', { backgroundColor: v })}
      />
      <ColorInput
        label="Couleur du titre"
        value={coverStyle.titleColor}
        onChange={(v) => updateStyles('cover', { titleColor: v })}
      />
      <NumberInput
        label="Taille du titre"
        value={coverStyle.titleFontSize}
        onChange={(v) => updateStyles('cover', { titleFontSize: v })}
        min={12}
        max={48}
      />
      <ColorInput
        label="Couleur du titre principal"
        value={coverStyle.mainTitleColor}
        onChange={(v) => updateStyles('cover', { mainTitleColor: v })}
      />
      <NumberInput
        label="Taille du titre principal"
        value={coverStyle.mainTitleFontSize}
        onChange={(v) => updateStyles('cover', { mainTitleFontSize: v })}
        min={24}
        max={72}
      />
      <ColorInput
        label="Couleur de la bordure"
        value={coverStyle.borderColor}
        onChange={(v) => updateStyles('cover', { borderColor: v })}
      />
      <NumberInput
        label="Épaisseur de la bordure"
        value={coverStyle.borderWidth}
        onChange={(v) => updateStyles('cover', { borderWidth: v })}
        min={0}
        max={20}
      />
    </div>
  );
}

// Onglet En-tête
function HeaderTab({
  config,
  updateStyles,
}: {
  config: DocumentConfig;
  updateStyles: <K extends keyof DocumentConfig['styles']>(
    key: K,
    value: Partial<DocumentConfig['styles'][K]>
  ) => void;
}) {
  const headerStyle = config.styles.header;

  return (
    <div className="space-y-4">
      <NumberInput
        label="Taille texte arabe"
        value={headerStyle.arabicFontSize}
        onChange={(v) => updateStyles('header', { arabicFontSize: v })}
        min={16}
        max={36}
      />
      <ColorInput
        label="Couleur texte arabe"
        value={headerStyle.arabicColor}
        onChange={(v) => updateStyles('header', { arabicColor: v })}
      />
      <NumberInput
        label="Taille texte français"
        value={headerStyle.frenchFontSize}
        onChange={(v) => updateStyles('header', { frenchFontSize: v })}
        min={8}
        max={18}
      />
      <ColorInput
        label="Couleur texte français"
        value={headerStyle.frenchColor}
        onChange={(v) => updateStyles('header', { frenchColor: v })}
      />
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="showLanterns"
          checked={headerStyle.showLanterns}
          onChange={(e) => updateStyles('header', { showLanterns: e.target.checked })}
          className="rounded text-primary focus:ring-primary"
        />
        <label htmlFor="showLanterns" className="text-sm text-gray-700">
          Afficher les lanternes
        </label>
      </div>
    </div>
  );
}

// Onglet Styles
function StylesTab({
  config,
  updateStyles,
}: {
  config: DocumentConfig;
  updateStyles: <K extends keyof DocumentConfig['styles']>(
    key: K,
    value: Partial<DocumentConfig['styles'][K]>
  ) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Titre de section */}
      <div>
        <h4 className="font-medium text-gray-800 mb-2">Titre de section</h4>
        <div className="space-y-2">
          <ColorInput
            label="Fond"
            value={config.styles.sectionTitle.backgroundColor}
            onChange={(v) => updateStyles('sectionTitle', { backgroundColor: v })}
          />
          <ColorInput
            label="Texte"
            value={config.styles.sectionTitle.textColor}
            onChange={(v) => updateStyles('sectionTitle', { textColor: v })}
          />
          <NumberInput
            label="Taille"
            value={config.styles.sectionTitle.fontSize}
            onChange={(v) => updateStyles('sectionTitle', { fontSize: v })}
            min={12}
            max={24}
          />
        </div>
      </div>

      {/* Paragraphe */}
      <div>
        <h4 className="font-medium text-gray-800 mb-2">Paragraphe</h4>
        <div className="space-y-2">
          <NumberInput
            label="Taille"
            value={config.styles.paragraph.fontSize}
            onChange={(v) => updateStyles('paragraph', { fontSize: v })}
            min={10}
            max={18}
          />
          <NumberInput
            label="Interligne"
            value={config.styles.paragraph.lineHeight}
            onChange={(v) => updateStyles('paragraph', { lineHeight: v })}
            min={1}
            max={3}
            step={0.1}
          />
          <ColorInput
            label="Couleur"
            value={config.styles.paragraph.color}
            onChange={(v) => updateStyles('paragraph', { color: v })}
          />
        </div>
      </div>

      {/* Verset arabe */}
      <div>
        <h4 className="font-medium text-gray-800 mb-2">Verset arabe</h4>
        <div className="space-y-2">
          <NumberInput
            label="Taille"
            value={config.styles.arabicVerse.fontSize}
            onChange={(v) => updateStyles('arabicVerse', { fontSize: v })}
            min={16}
            max={36}
          />
          <NumberInput
            label="Interligne"
            value={config.styles.arabicVerse.lineHeight}
            onChange={(v) => updateStyles('arabicVerse', { lineHeight: v })}
            min={1.5}
            max={3}
            step={0.1}
          />
        </div>
      </div>

      {/* Encadré */}
      <div>
        <h4 className="font-medium text-gray-800 mb-2">Encadré traduction</h4>
        <div className="space-y-2">
          <ColorInput
            label="Fond"
            value={config.styles.verseBox.backgroundColor}
            onChange={(v) => updateStyles('verseBox', { backgroundColor: v })}
          />
          <ColorInput
            label="Bordure"
            value={config.styles.verseBox.borderColor}
            onChange={(v) => updateStyles('verseBox', { borderColor: v })}
          />
          <NumberInput
            label="Arrondi"
            value={config.styles.verseBox.borderRadius}
            onChange={(v) => updateStyles('verseBox', { borderRadius: v })}
            min={0}
            max={24}
          />
        </div>
      </div>
    </div>
  );
}

// Onglet Page
function PageTab({
  config,
  updateConfig,
}: {
  config: DocumentConfig;
  updateConfig: <K extends keyof DocumentConfig>(key: K, value: DocumentConfig[K]) => void;
}) {
  const pageConfig = config.page;

  const updatePage = (updates: Partial<DocumentConfig['page']>) => {
    updateConfig('page', { ...pageConfig, ...updates });
  };

  return (
    <div className="space-y-4">
      <ColorInput
        label="Couleur de fond"
        value={pageConfig.backgroundColor}
        onChange={(v) => updatePage({ backgroundColor: v })}
      />
      <NumberInput
        label="Marge haute (mm)"
        value={pageConfig.marginTop}
        onChange={(v) => updatePage({ marginTop: v })}
        min={0}
        max={50}
      />
      <NumberInput
        label="Marge basse (mm)"
        value={pageConfig.marginBottom}
        onChange={(v) => updatePage({ marginBottom: v })}
        min={0}
        max={50}
      />
      <NumberInput
        label="Marge gauche (mm)"
        value={pageConfig.marginLeft}
        onChange={(v) => updatePage({ marginLeft: v })}
        min={0}
        max={50}
      />
      <NumberInput
        label="Marge droite (mm)"
        value={pageConfig.marginRight}
        onChange={(v) => updatePage({ marginRight: v })}
        min={0}
        max={50}
      />
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="showPageNumbers"
          checked={pageConfig.showPageNumbers}
          onChange={(e) => updatePage({ showPageNumbers: e.target.checked })}
          className="rounded text-primary focus:ring-primary"
        />
        <label htmlFor="showPageNumbers" className="text-sm text-gray-700">
          Afficher numéros de page
        </label>
      </div>
    </div>
  );
}

// Composants d'input réutilisables
function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-600 flex-1">{label}</label>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-8 h-8 rounded cursor-pointer border border-gray-200"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-20 border border-gray-300 rounded px-2 py-1 text-xs"
      />
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-gray-600 flex-1">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        min={min}
        max={max}
        step={step}
        className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
      />
    </div>
  );
}
