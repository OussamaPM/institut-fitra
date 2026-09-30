'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import {
  clearProgress,
  detectProvider,
  formatTimecode,
  parsePlayerMessage,
  readProgress,
  saveProgress,
  subscriptionMessages,
  preparePlayerSrc,
} from '@/lib/video-progress';

interface VideoPlayerProps {
  src: string;
  title: string;
  /** Classes de l'iframe elle-même (le composant ajoute seulement un conteneur positionné). */
  className?: string;
  sandbox?: string;
  allow?: string;
  /**
   * L'indicateur de reprise se pose par-dessus le lecteur : inutile sur une
   * barre audio de 96 px, qu'il recouvrirait entièrement.
   */
  showResumeNotice?: boolean;
}

/** Fréquence d'écriture pendant la lecture : assez fin pour ne presque rien perdre. */
const SAVE_INTERVAL_MS = 5000;

/** Durée d'affichage de l'indicateur « Reprise à … ». */
const NOTICE_MS = 8000;

/**
 * Lecteur vidéo/audio embarqué qui reprend là où l'élève s'était arrêté.
 *
 * La position est relue au montage et injectée dans l'URL du lecteur ; elle est
 * réenregistrée à la pause, périodiquement pendant la lecture, et au départ de
 * l'élève (fermeture de la modale ou de l'onglet).
 *
 * Tout repose sur le dialogue postMessage avec l'iframe : si le lecteur n'est ni
 * Bunny ni Vimeo, la mécanique se désactive d'elle-même et la vidéo se comporte
 * exactement comme avant.
 */
export default function VideoPlayer({
  src,
  title,
  className,
  sandbox,
  allow,
  showResumeNotice = true,
}: VideoPlayerProps) {
  const provider = useMemo(() => detectProvider(src), [src]);

  const [resumeFrom, setResumeFrom] = useState(() => readProgress(src));
  const [noticeVisible, setNoticeVisible] = useState(() => readProgress(src) > 0);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  /** Dernière position rapportée par le lecteur, écrite au départ de l'élève. */
  const latest = useRef<{ seconds: number; duration?: number } | null>(null);
  const lastSavedAt = useRef(0);

  const playerSrc = useMemo(() => preparePlayerSrc(src, resumeFrom), [src, resumeFrom]);
  const playerOrigin = useMemo(() => originOf(playerSrc), [playerSrc]);

  const flush = useCallback(() => {
    const state = latest.current;

    if (state) {
      saveProgress(src, state.seconds, state.duration);
    }
  }, [src]);

  /** Abonne le parent aux événements du lecteur. Idempotent : appelé plusieurs fois. */
  const subscribe = useCallback(() => {
    const target = iframeRef.current?.contentWindow;

    if (!target || playerOrigin === null) {
      return;
    }

    subscriptionMessages(provider).forEach((message) => target.postMessage(message, playerOrigin));
  }, [provider, playerOrigin]);

  useEffect(() => {
    if (provider === 'unknown' || playerOrigin === null) {
      return;
    }

    const onMessage = (event: MessageEvent) => {
      // Double filtre : la bonne origine ET notre iframe — une page peut en
      // afficher plusieurs, et n'importe quel script peut poster un message.
      if (event.origin !== playerOrigin) {
        return;
      }

      if (iframeRef.current && event.source !== iframeRef.current.contentWindow) {
        return;
      }

      const parsed = parsePlayerMessage(event.data, provider);

      if (parsed === null) {
        return;
      }

      if (parsed.name === 'ready') {
        subscribe();

        return;
      }

      if (parsed.seconds !== undefined) {
        latest.current = { seconds: parsed.seconds, duration: parsed.duration };
      }

      if (parsed.name === 'ended') {
        // Rien à reprendre sur une vidéo finie : on oublie avant que le
        // démontage ne réenregistre la position de fin.
        latest.current = null;
        clearProgress(src);

        return;
      }

      if (parsed.name === 'pause') {
        flush();

        return;
      }

      if (parsed.name === 'timeupdate' && Date.now() - lastSavedAt.current >= SAVE_INTERVAL_MS) {
        lastSavedAt.current = Date.now();
        flush();
      }
    };

    window.addEventListener('message', onMessage);
    // Fermer l'onglet ne démonte pas le composant de façon fiable ; pagehide, si.
    window.addEventListener('pagehide', flush);

    return () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('pagehide', flush);
      // Fermeture de la modale : dernière chance d'enregistrer.
      flush();
    };
  }, [provider, playerOrigin, src, flush, subscribe]);

  useEffect(() => {
    if (!noticeVisible) {
      return;
    }

    const timer = window.setTimeout(() => setNoticeVisible(false), NOTICE_MS);

    return () => window.clearTimeout(timer);
  }, [noticeVisible]);

  /** Recharge le lecteur au début : l'URL perd son `t`, l'iframe se rafraîchit. */
  const restart = () => {
    latest.current = null;
    lastSavedAt.current = 0;
    clearProgress(src);
    setResumeFrom(0);
    setNoticeVisible(false);
  };

  return (
    <div className="relative h-full w-full">
      <iframe
        ref={iframeRef}
        src={playerSrc}
        title={title}
        className={className}
        style={{ border: 0 }}
        sandbox={sandbox}
        allow={allow}
        allowFullScreen
        onLoad={subscribe}
      />

      {showResumeNotice && noticeVisible && resumeFrom > 0 && (
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-3 rounded-lg bg-black/75 px-3 py-2 text-xs text-white shadow-lg">
          <span>Reprise à {formatTimecode(resumeFrom)}</span>
          <button
            type="button"
            onClick={restart}
            className="pointer-events-auto inline-flex items-center gap-1 rounded-md bg-white/20 px-2 py-1 font-medium transition-colors hover:bg-white/30"
          >
            <RotateCcw size={12} />
            Repartir du début
          </button>
        </div>
      )}
    </div>
  );
}

function originOf(src: string): string | null {
  try {
    return new URL(src).origin;
  } catch {
    return null;
  }
}
