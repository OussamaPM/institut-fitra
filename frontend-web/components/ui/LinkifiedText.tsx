'use client';

import { Fragment, useMemo } from 'react';

export type TextSegment =
  | { type: 'text'; value: string }
  | { type: 'link'; value: string; href: string };

// URL http(s) ou commençant par www. — s'arrête aux blancs et aux délimiteurs courants
const URL_PATTERN = /(?:https?:\/\/|www\.)[^\s<>"'«»]+/gi;
// Ponctuation de fin de phrase qui ne fait pas partie de l'URL ("voir https://x.fr." / "(https://x.fr)")
const TRAILING_CHARS = ".,;:!?'\"»]";

/**
 * Découpe un texte en segments texte / lien, sans toucher au texte d'origine.
 * Les anciens messages sont donc couverts : seul l'affichage change.
 */
export function splitLinks(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const pattern = new RegExp(URL_PATTERN.source, URL_PATTERN.flags);
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    let url = match[0];

    // Retire la ponctuation finale ; une ')' n'est retirée que si elle ne ferme pas une '(' de l'URL
    while (url.length > 0) {
      const last = url[url.length - 1];
      if (last === ')') {
        const opens = (url.match(/\(/g) ?? []).length;
        const closes = (url.match(/\)/g) ?? []).length;
        if (closes <= opens) break;
      } else if (!TRAILING_CHARS.includes(last)) {
        break;
      }
      url = url.slice(0, -1);
    }

    // Lien vide ou réduit au seul préfixe → on laisse le texte tel quel
    if (url.length === 0 || /^(https?:\/\/|www\.)$/i.test(url)) {
      continue;
    }

    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    segments.push({
      type: 'link',
      value: url,
      href: /^https?:\/\//i.test(url) ? url : `https://${url}`,
    });
    lastIndex = match.index + url.length;
    pattern.lastIndex = lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return segments;
}

interface LinkifiedTextProps {
  text: string;
  className?: string;
  /** Classes du lien (couleur selon la bulle) */
  linkClassName?: string;
}

/**
 * Paragraphe dont les URL sont rendues cliquables (nouvel onglet).
 */
export default function LinkifiedText({
  text,
  className,
  linkClassName = 'underline underline-offset-2 break-all hover:opacity-80',
}: LinkifiedTextProps) {
  const segments = useMemo(() => splitLinks(text), [text]);

  return (
    <p className={className}>
      {segments.map((segment, index) =>
        segment.type === 'link' ? (
          <a
            key={index}
            href={segment.href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
            onClick={(event) => event.stopPropagation()}
          >
            {segment.value}
          </a>
        ) : (
          <Fragment key={index}>{segment.value}</Fragment>
        )
      )}
    </p>
  );
}
