import { format, type FormatOptions } from 'date-fns';
import { fr } from 'date-fns/locale';

/**
 * Toutes les heures saisies par les admins (schedules, formulaires de sessions)
 * et toutes les heures affichées aux utilisateurs (planning, replays, supports)
 * sont en Europe/Paris, peu importe la timezone du navigateur ou du serveur.
 */
export const INSTITUTE_TIMEZONE = 'Europe/Paris';

/**
 * Décalage en minutes par rapport à UTC pour une timezone donnée à un instant.
 * Ex: 120 pour Paris en été (CEST), 60 en hiver (CET).
 */
function tzOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  parts.forEach((p) => {
    if (p.type !== 'literal') map[p.type] = p.value;
  });
  const asUTC = Date.UTC(
    parseInt(map.year, 10),
    parseInt(map.month, 10) - 1,
    parseInt(map.day, 10),
    parseInt(map.hour, 10) % 24,
    parseInt(map.minute, 10),
    parseInt(map.second, 10)
  );
  return (asUTC - date.getTime()) / 60000;
}

/**
 * Renvoie une Date dont la représentation locale du navigateur reflète les
 * composantes wall-clock de la timezone Europe/Paris, afin que les helpers
 * date-fns (qui formatent en TZ navigateur par défaut) affichent l'heure de Paris.
 */
export function toParisWallClockDate(input: Date | string): Date {
  const d = typeof input === 'string' ? new Date(input) : input;
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: INSTITUTE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(d);
  return new Date(parts.replace(' ', 'T'));
}

/**
 * Formate une date (ISO ou Date) avec les tokens date-fns mais en utilisant
 * la timezone Europe/Paris.
 */
export function formatParis(input: string | Date, fmt: string, options?: FormatOptions): string {
  return format(toParisWallClockDate(input), fmt, options ?? { locale: fr });
}

/**
 * Heure (0-23) selon Europe/Paris.
 */
export function getParisHour(input: string | Date): number {
  return toParisWallClockDate(input).getHours();
}

/**
 * Détermine si deux dates tombent le même jour calendaire selon Europe/Paris.
 */
export function isSameDayParis(a: string | Date, b: string | Date): boolean {
  const wa = toParisWallClockDate(a);
  const wb = toParisWallClockDate(b);
  return (
    wa.getFullYear() === wb.getFullYear() &&
    wa.getMonth() === wb.getMonth() &&
    wa.getDate() === wb.getDate()
  );
}

/**
 * Convertit la valeur d'un `<input type="datetime-local">` (ex: "2026-05-30T21:00"),
 * interprétée comme une heure locale Europe/Paris, en ISO UTC pour l'API.
 */
export function parisInputToIso(localInput: string): string {
  if (!localInput) return '';
  const normalized = localInput.length === 16 ? `${localInput}:00` : localInput;
  const naiveUTC = new Date(`${normalized}Z`);
  const offset = tzOffsetMinutes(naiveUTC, INSTITUTE_TIMEZONE);
  return new Date(naiveUTC.getTime() - offset * 60 * 1000).toISOString();
}

/**
 * Convertit une date ISO UTC en chaîne "YYYY-MM-DDTHH:mm" représentant
 * l'heure Europe/Paris (à passer comme `value` à un `<input type="datetime-local">`).
 */
export function isoToParisInput(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: INSTITUTE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
  return parts.replace(' ', 'T');
}
