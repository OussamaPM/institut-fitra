# Document Editor - Éditeur de Documents Islamiques

## Description

Éditeur de documents PDF indépendant pour créer des livrets islamiques professionnels (Tafsir, études coraniques, etc.) avec un style visuel élégant.

**Projet indépendant** - Aucune dépendance avec le projet Institut Amana principal.

---

## Stack Technique

- **Framework** : Next.js 14 (App Router)
- **Langage** : TypeScript
- **Styles** : Tailwind CSS
- **Drag & Drop** : @dnd-kit/core, @dnd-kit/sortable
- **Export PDF** : jsPDF + html2canvas
- **Polices** : Amiri, Scheherazade New (arabe), Playfair Display, Inter

---

## Structure du Projet

```
document-editor/
├── src/
│   ├── app/
│   │   ├── layout.tsx           # Layout principal
│   │   └── page.tsx             # Page d'accueil (Editor)
│   ├── components/
│   │   ├── blocks/              # Composants de blocs
│   │   │   ├── SectionTitle.tsx     # Bandeau titre (bleu/blanc)
│   │   │   ├── Subtitle.tsx         # Sous-titre "A – Nom"
│   │   │   ├── Paragraph.tsx        # Paragraphe texte
│   │   │   ├── ArabicVerse.tsx      # Verset arabe avec tashkil
│   │   │   ├── VerseBox.tsx         # Encadré traduction (bleu clair)
│   │   │   ├── BulletList.tsx       # Liste à puces
│   │   │   ├── NumberedList.tsx     # Liste numérotée
│   │   │   ├── Quote.tsx            # Citation/hadith
│   │   │   ├── PageHeader.tsx       # En-tête avec lanternes
│   │   │   ├── CoverPage.tsx        # Page de couverture
│   │   │   └── index.ts             # Exports
│   │   └── editor/
│   │       ├── Editor.tsx           # Éditeur principal
│   │       ├── BlockRenderer.tsx    # Rendu dynamique des blocs
│   │       ├── BlockToolbar.tsx     # Barre d'outils (ajout blocs)
│   │       ├── ConfigPanel.tsx      # Panneau configuration (5 onglets)
│   │       ├── SortableBlock.tsx    # Wrapper drag & drop
│   │       ├── PreviewPanel.tsx     # Prévisualisation + export PDF
│   │       └── index.ts             # Exports
│   ├── types/
│   │   └── index.ts             # Types TypeScript
│   ├── lib/
│   │   └── utils.ts             # Fonctions utilitaires
│   └── styles/
│       └── globals.css          # Styles globaux + polices
├── public/images/
│   ├── lantern.svg              # Décoration lanterne
│   └── logo-amana.png           # Logo Institut Amana
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── claude-editor.md             # Ce fichier
```

---

## Types de Blocs

| Type | Description | Icône |
|------|-------------|-------|
| `section-title` | Bandeau titre bleu avec texte blanc | 📌 |
| `subtitle` | Sous-titre format "A – Titre" | 📝 |
| `paragraph` | Paragraphe de texte justifié | 📄 |
| `arabic-verse` | Verset coranique en arabe (RTL) | 🕌 |
| `verse-box` | Encadré traduction (fond bleu clair) | 📦 |
| `bullet-list` | Liste à puces personnalisées | • |
| `numbered-list` | Liste numérotée | 1. |
| `quote` | Citation (hadith, parole de savant) | 💬 |
| `reference` | Référence coranique centrée | 📖 |
| `image` | Image avec légende | 🖼️ |
| `footnote` | Note de bas de page | ¹ |
| `page-break` | Saut de page | 📃 |
| `notes-page` | Page de notes avec lignes | ✍️ |

---

## Configuration des Styles

### Panneau de Configuration (5 onglets)

1. **Document** : Titre, série, auteur, copyright
2. **Couverture** : Couleurs, tailles de police, bordure
3. **En-tête** : Police arabe/française, lanternes
4. **Styles** : Configuration par type de bloc
5. **Page** : Marges, fond, numérotation

### Couleurs par défaut (Style Tafsir)

```typescript
colors: {
  primary: '#1e5a8a',      // Bleu principal
  cream: '#f5f0e6',        // Fond papier crème
  lightBlue: '#e8f4fc',    // Fond encadrés
  accent: '#2b7cb5',       // Bleu accent
}
```

### Polices

- **Titres** : Playfair Display (serif)
- **Corps** : Inter (sans-serif)
- **Arabe** : Scheherazade New, Amiri (avec tashkil)

---

## Commandes

```bash
# Installation
cd document-editor
npm install

# Développement (port 3001)
npm run dev

# Build production
npm run build

# Lancer en production
npm start
```

---

## Fonctionnalités

### Implémentées ✅

- [x] Éditeur bloc par bloc avec drag & drop
- [x] 13 types de blocs différents
- [x] Gestion multi-pages avec navigation
- [x] Page de couverture stylisée
- [x] Panneau de configuration complet
- [x] Prévisualisation du document
- [x] Export PDF (html2canvas + jsPDF)
- [x] Support texte arabe RTL avec tashkil
- [x] Décorations lanternes

### À développer ⏳

- [ ] Sauvegarde/chargement de documents (localStorage ou API)
- [ ] Mode "coller du texte brut" et sélectionner pour taguer
- [ ] Templates prédéfinis (Tafsir, Hadith, Fiqh)
- [ ] Gestion des images (upload)
- [ ] Page de notes avec lignes
- [ ] Export en plusieurs formats (DOCX, HTML)

---

## Notes Techniques

### Rendu Arabe

Les versets arabes utilisent la police Scheherazade New avec :
- Direction RTL (`dir="rtl"`)
- Line-height augmenté (2.0) pour le tashkil
- Décorations avec caractères Unicode (﴿ ﴾)

### Export PDF

L'export utilise `html2canvas` pour capturer chaque page en image, puis `jsPDF` pour assembler le PDF. Résolution : 2x pour qualité impression.

### Format A4

Les pages respectent le format A4 (210mm x 297mm) avec marges configurables.

---

## Dernière mise à jour

20 décembre 2024
