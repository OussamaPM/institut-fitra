/**
 * Reprise de lecture : mémorise où l'élève s'est arrêté dans une vidéo.
 *
 * Le stockage est volontairement local (localStorage de NOTRE origine) : c'est
 * une commodité de confort, pas une donnée de suivi pédagogique. Conséquence
 * assumée — la reprise ne suit pas l'élève d'un appareil à l'autre.
 *
 * On n'utilise pas le `rememberPosition` natif de Bunny : il écrit dans le
 * stockage de l'iframe, que Safari bloque purement et simplement pour un
 * contenu tiers. Notre propre origine, elle, n'est jamais bloquée.
 *
 * Ce module ne contient que de la logique pure + l'accès au stockage : toute la
 * mécanique iframe vit dans components/video/VideoPlayer.tsx.
 */

export type VideoProvider = 'playerjs' | 'vimeo' | 'unknown';

/** Clé de stockage. Versionnée : un changement de format repart d'une page blanche. */
const STORAGE_KEY = 'fitra.video-progress.v1';

/** En deçà, reprendre n'apporte rien et surprend plus que ça n'aide. */
const MIN_RESUME_SECONDS = 20;

/** Vidéo vue jusque-là = terminée : on efface pour repartir du début. */
const END_RATIO = 0.97;
const END_TAIL_SECONDS = 20;

/** Purge : au-delà, l'entrée n'a plus d'intérêt et encombre le stockage. */
const MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 200;

/** `s` = secondes, `u` = horodatage. Noms courts : le stockage est plafonné. */
interface ProgressEntry {
  s: number;
  u: number;
}

type ProgressStore = Record<string, ProgressEntry>;

export interface PlayerEvent {
  name: string;
  seconds?: number;
  duration?: number;
}

/**
 * Identifie le lecteur à partir de l'hôte de l'URL embed.
 *
 * `unknown` désactive toute la mécanique : lecteur inconnu, on ne touche à rien
 * et la vidéo se comporte comme avant.
 */
export function detectProvider(src: string): VideoProvider {
  const host = hostOf(src);

  if (host === null) {
    return 'unknown';
  }

  if (host === 'mediadelivery.net' || host.endsWith('.mediadelivery.net')) {
    return 'playerjs';
  }

  if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) {
    return 'vimeo';
  }

  return 'unknown';
}

/**
 * Clé stable d'une vidéo : hôte + chemin, sans query ni fragment.
 *
 * La query est écartée volontairement — une URL Bunny signée porte `token` et
 * `expires`, qui changent à chaque chargement : la garder ferait une clé
 * différente à chaque lecture, donc aucune reprise.
 */
export function videoKey(src: string): string | null {
  try {
    const url = new URL(src);

    return `${url.host}${url.pathname.replace(/\/+$/, '')}`;
  } catch {
    return null;
  }
}

/**
 * Position enregistrée, en secondes. 0 = rien à reprendre.
 */
export function readProgress(src: string): number {
  const key = videoKey(src);

  if (key === null) {
    return 0;
  }

  const entry = readStore()[key];

  if (!entry || !Number.isFinite(entry.s) || entry.s < MIN_RESUME_SECONDS) {
    return 0;
  }

  if (Date.now() - entry.u > MAX_AGE_MS) {
    return 0;
  }

  return entry.s;
}

/**
 * Enregistre la position courante.
 *
 * Une vidéo arrivée au bout est effacée plutôt qu'enregistrée : sinon la
 * rouvrir la relancerait sur son générique de fin.
 */
export function saveProgress(src: string, seconds: number, duration?: number): void {
  const key = videoKey(src);

  if (key === null || !Number.isFinite(seconds)) {
    return;
  }

  if (seconds < MIN_RESUME_SECONDS || isNearEnd(seconds, duration)) {
    clearProgress(src);

    return;
  }

  const store = readStore();
  store[key] = { s: Math.floor(seconds), u: Date.now() };
  writeStore(prune(store));
}

export function clearProgress(src: string): void {
  const key = videoKey(src);

  if (key === null) {
    return;
  }

  const store = readStore();

  if (!(key in store)) {
    return;
  }

  delete store[key];
  writeStore(store);
}

/**
 * Prépare l'URL du lecteur : position de départ, et mémoire interne coupée.
 *
 * On passe par l'URL plutôt que par un `setCurrentTime` en postMessage : le
 * lecteur applique le décalage avant la première image, sans la course entre
 * « prêt à recevoir des commandes » et « déjà en train de lire ».
 *
 * `rememberPosition=false` désactive la reprise native de Bunny. Sans cela deux
 * mémoires se disputeraient la même vidéo, et « Repartir du début » renverrait
 * l'élève au milieu — celle de Bunny vit dans le stockage de l'iframe, que nous
 * ne pouvons ni lire ni effacer.
 */
export function preparePlayerSrc(src: string, seconds: number): string {
  const provider = detectProvider(src);
  const start = Math.floor(seconds);

  if (provider === 'unknown') {
    return src;
  }

  try {
    const url = new URL(src);

    if (provider === 'vimeo') {
      if (start > 0) {
        url.hash = `t=${start}s`;
      }

      return url.toString();
    }

    url.searchParams.set('rememberPosition', 'false');

    if (start > 0) {
      url.searchParams.set('t', String(start));
    }

    return url.toString();
  } catch {
    return src;
  }
}

/**
 * Messages d'abonnement à envoyer à l'iframe, déjà sérialisés.
 *
 * Bunny suit la spec player.js (enveloppe `context`/`version`), Vimeo a son
 * propre dialecte — plus court, mais de même forme.
 */
export function subscriptionMessages(provider: VideoProvider): string[] {
  const events = ['timeupdate', 'pause', 'ended'];

  if (provider === 'playerjs') {
    return events.map((value) =>
      JSON.stringify({ context: 'player.js', version: '0.0.11', method: 'addEventListener', value }),
    );
  }

  if (provider === 'vimeo') {
    return events.map((value) => JSON.stringify({ method: 'addEventListener', value }));
  }

  return [];
}

/**
 * Normalise un message reçu de l'iframe. null = message hors sujet, à ignorer.
 *
 * Les deux lecteurs envoient une chaîne JSON portant `event` ; seul diffère le
 * nom du champ qui transporte la charge utile (`value` / `data`).
 */
export function parsePlayerMessage(raw: unknown, provider: VideoProvider): PlayerEvent | null {
  if (provider === 'unknown') {
    return null;
  }

  let data: Record<string, unknown>;

  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return null;
    }
  } else if (raw !== null && typeof raw === 'object') {
    data = raw as Record<string, unknown>;
  } else {
    return null;
  }

  if (!data || typeof data.event !== 'string') {
    return null;
  }

  // Sans ce filtre, n'importe quel script de la page émettant un {event: ...}
  // serait pris pour le lecteur.
  if (provider === 'playerjs' && data.context !== 'player.js') {
    return null;
  }

  const payload = (provider === 'playerjs' ? data.value : data.data) as Record<string, unknown> | undefined;

  return {
    name: data.event,
    seconds: finiteNumber(payload?.seconds),
    duration: finiteNumber(payload?.duration),
  };
}

/** Position lisible par un humain : 12:05, ou 1:02:30 au-delà de l'heure. */
export function formatTimecode(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');

  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function isNearEnd(seconds: number, duration?: number): boolean {
  if (duration === undefined || !Number.isFinite(duration) || duration <= 0) {
    return false;
  }

  return seconds >= duration - END_TAIL_SECONDS || seconds / duration >= END_RATIO;
}

function hostOf(src: string): string | null {
  try {
    return new URL(src).host.toLowerCase();
  } catch {
    return null;
  }
}

function finiteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

/**
 * Borne le stockage : les entrées périmées partent, et seules les plus récentes
 * sont conservées. Sans cela, le quota finirait par être atteint sur un poste
 * partagé, et c'est tout le localStorage de l'application qui trinquerait.
 */
function prune(store: ProgressStore): ProgressStore {
  const now = Date.now();
  const fresh = Object.entries(store).filter(([, entry]) => now - entry.u <= MAX_AGE_MS);

  if (fresh.length <= MAX_ENTRIES) {
    return Object.fromEntries(fresh);
  }

  fresh.sort((a, b) => b[1].u - a[1].u);

  return Object.fromEntries(fresh.slice(0, MAX_ENTRIES));
}

/** Le stockage peut être indisponible (navigation privée, cookies bloqués). */
function readStore(): ProgressStore {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;

    return parsed !== null && typeof parsed === 'object' ? (parsed as ProgressStore) : {};
  } catch {
    return {};
  }
}

function writeStore(store: ProgressStore): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Quota atteint ou stockage refusé : la reprise est un confort, pas une
    // fonctionnalité critique — on renonce silencieusement.
  }
}
