'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import {
  clearProgress,
  detectProvider,
  formatTimecode,
  parsePlayerMessage,
  pollMessages,
  preparePlayerSrc,
  readProgress,
  saveProgress,
  seekMessage,
  subscriptionMessages,
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

/** Fréquence d'écriture pendant la lecture, et de sondage du lecteur. */
const TICK_MS = 5000;

/** Durée d'affichage de l'indicateur « Reprise à … ». */
const NOTICE_MS = 8000;

/** Interrupteur de diagnostic : localStorage.setItem('fitra.video-debug', '1'). */
function debug(...args: unknown[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage.getItem('fitra.video-debug') === '1') {
      console.log('[VideoPlayer]', ...args);
    }
  } catch {
    // Stockage indisponible : pas de journal, rien de plus.
  }
}

/**
 * Lecteur vidéo/audio embarqué qui reprend là où l'élève s'était arrêté.
 *
 * Deux chemins redondants de chaque côté, parce qu'un lecteur tiers n'honore pas
 * toujours ce que sa documentation annonce :
 *  - pour CONNAÎTRE la position : abonnement à `timeupdate`, **et** interrogation
 *    directe du lecteur toutes les 5 s ;
 *  - pour la RESTAURER : paramètre `?t=` dans l'URL, **et** ordre `setCurrentTime`
 *    dès que le lecteur se déclare prêt.
 *
 * Si le lecteur n'est ni Bunny ni Vimeo, toute la mécanique se désactive et la
 * vidéo se comporte exactement comme une iframe nue.
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
  const duration = useRef<number | undefined>(undefined);
  const lastSavedAt = useRef(0);
  /** Le seek de reprise n'est envoyé qu'une fois, sinon il annulerait les avances manuelles. */
  const seekSent = useRef(false);

  const playerSrc = useMemo(() => preparePlayerSrc(src, resumeFrom), [src, resumeFrom]);
  const playerOrigin = useMemo(() => originOf(playerSrc), [playerSrc]);

  const post = useCallback(
    (messages: (string | null)[]) => {
      const target = iframeRef.current?.contentWindow;

      if (!target || playerOrigin === null) {
        return;
      }

      messages.forEach((message) => {
        if (message !== null) {
          debug('→', message);
          target.postMessage(message, playerOrigin);
        }
      });
    },
    [playerOrigin],
  );

  const flush = useCallback(() => {
    const state = latest.current;

    if (state) {
      debug('enregistrement', state);
      saveProgress(src, state.seconds, state.duration);
    }
  }, [src]);

  /** Abonnement + reprise. Idempotent : appelé sur `ready` et sur le load de l'iframe. */
  const handshake = useCallback(() => {
    post(subscriptionMessages(provider));

    if (!seekSent.current && resumeFrom > 0) {
      seekSent.current = true;
      post([seekMessage(provider, resumeFrom)]);
    }
  }, [post, provider, resumeFrom]);

  useEffect(() => {
    if (provider === 'unknown' || playerOrigin === null) {
      return;
    }

    debug('montage', { provider, playerSrc, resumeFrom });

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

      debug('←', parsed);

      if (parsed.name === 'ready') {
        handshake();

        return;
      }

      if (parsed.name === 'getDuration') {
        duration.current = parsed.value ?? parsed.duration;

        return;
      }

      if (parsed.duration !== undefined) {
        duration.current = parsed.duration;
      }

      // `value` porte la réponse à getCurrentTime, `seconds` celle des événements.
      const seconds = parsed.seconds ?? parsed.value;

      if (seconds !== undefined) {
        latest.current = { seconds, duration: duration.current };
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

      if (Date.now() - lastSavedAt.current >= TICK_MS) {
        lastSavedAt.current = Date.now();
        flush();
      }
    };

    window.addEventListener('message', onMessage);
    // Fermer l'onglet ne démonte pas le composant de façon fiable ; pagehide, si.
    window.addEventListener('pagehide', flush);

    // Le sondage couvre le cas où l'abonnement n'aboutit pas, et relance la
    // poignée de main si l'événement `ready` nous a échappé.
    const ticker = window.setInterval(() => {
      handshake();
      post(pollMessages(provider));
    }, TICK_MS);

    return () => {
      window.clearInterval(ticker);
      window.removeEventListener('message', onMessage);
      window.removeEventListener('pagehide', flush);
      // Fermeture de la modale : dernière chance d'enregistrer.
      flush();
    };
  }, [provider, playerOrigin, playerSrc, resumeFrom, src, flush, handshake, post]);

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
    seekSent.current = true;
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
        onLoad={handshake}
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
