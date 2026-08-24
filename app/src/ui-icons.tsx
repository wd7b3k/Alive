import type { ReactNode, SVGProps } from 'react';

export type IconName =
  | 'spark' | 'chain' | 'path' | 'meaning' | 'user' | 'smoke' | 'hookah' | 'vape'
  | 'coffee' | 'meal' | 'phone' | 'work' | 'stress' | 'sleep' | 'car' | 'people'
  | 'pause' | 'calm' | 'energy' | 'focus' | 'finish' | 'connection' | 'hands'
  | 'breath' | 'tea' | 'walk' | 'music' | 'journal' | 'eye' | 'shield' | 'check'
  | 'arrow' | 'plus' | 'trash' | 'close' | 'clock' | 'heart' | 'chart' | 'leaf'
  // Added 2026-08-24 so every trigger in Связки can have its own icon. The old
  // keyword matcher collapsed whole groups of triggers onto one glyph, which made
  // the map of contexts look like a repeating pattern instead of a set of distinct
  // moments — the exact opposite of what that screen is for.
  | 'sunrise' | 'target' | 'flag' | 'flame' | 'question' | 'knot';

const paths: Record<IconName, ReactNode> = {
  spark: <><path d="M12 2l1.7 5.1L19 9l-5.3 1.9L12 16l-1.7-5.1L5 9l5.3-1.9L12 2Z"/><path d="M5 15l.9 2.6L8.5 19l-2.6.9L5 22l-.9-2.1L1.5 19l2.6-1.4L5 15Z"/></>,
  chain: <><path d="M9.5 14.5l5-5"/><path d="M7.2 17.8l-1 1a3.5 3.5 0 0 1-5-5l3.1-3.1a3.5 3.5 0 0 1 5 0"/><path d="M16.8 6.2l1-1a3.5 3.5 0 0 1 5 5l-3.1 3.1a3.5 3.5 0 0 1-5 0"/></>,
  path: <><path d="M4 20c7 0 4-8 10-8s3-8 6-8"/><path d="M17 4h3v3"/><circle cx="4" cy="20" r="1.5"/></>,
  meaning: <><path d="M12 21s7-4.5 7-11a7 7 0 1 0-14 0c0 6.5 7 11 7 11Z"/><path d="M9.5 10.5 11 12l3.5-4"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 22a8 8 0 0 1 16 0"/></>,
  smoke: <><path d="M3 15h12v4H3z"/><path d="M15 15h3"/><path d="M19 15c2-1 2-3 0-4s-2-3 0-4"/></>,
  hookah: <><path d="M8 3h8"/><path d="M10 3v4c0 2-2 3-2 6a4 4 0 0 0 8 0c0-3-2-4-2-6V3"/><path d="M12 17v4"/><path d="M8 21h8"/><path d="M16 10c3 0 4 2 4 4v4"/></>,
  vape: <><rect x="8" y="3" width="8" height="18" rx="2"/><path d="M10 7h4"/><path d="M17 6c2 1 2 3 0 4"/></>,
  coffee: <><path d="M4 9h13v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z"/><path d="M17 11h2a3 3 0 0 1 0 6h-2"/><path d="M8 3c-1 1 1 2 0 3M12 3c-1 1 1 2 0 3"/></>,
  meal: <><path d="M6 3v8M3 3v5a3 3 0 0 0 6 0V3M6 11v10"/><path d="M16 3v18M16 3c4 2 4 7 0 9"/></>,
  phone: <><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 18h4"/></>,
  work: <><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V4h8v3M3 12h18"/></>,
  stress: <><path d="M5 8c2-4 5-5 7-2 2-3 5-2 7 2 2 5-2 10-7 13C7 18 3 13 5 8Z"/><path d="m13 8-3 5h4l-3 5"/></>,
  sleep: <><path d="M20 14.5A8 8 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"/><path d="M15 4h4l-4 4h4"/></>,
  car: <><path d="M4 15l2-6h12l2 6v5h-2v-2H6v2H4v-5Z"/><path d="M6 15h12"/><circle cx="8" cy="15" r="1"/><circle cx="16" cy="15" r="1"/></>,
  people: <><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20a6 6 0 0 1 12 0M14 15a5 5 0 0 1 7 5"/></>,
  pause: <><path d="M8 6v12M16 6v12"/></>,
  calm: <><path d="M4 12c2-3 4-3 6 0s4 3 6 0 4-3 6 0"/><path d="M4 17c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/></>,
  energy: <path d="m13 2-7 12h6l-1 8 7-12h-6l1-8Z"/>,
  focus: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></>,
  finish: <><path d="M6 3v18"/><path d="M6 5h12l-3 4 3 4H6"/></>,
  connection: <><path d="M8 12a4 4 0 0 1 4-4h4a4 4 0 0 1 0 8h-2"/><path d="M16 12a4 4 0 0 1-4 4H8a4 4 0 0 1 0-8h2"/></>,
  hands: <><path d="M5 12V7a2 2 0 0 1 4 0v4"/><path d="M9 11V5a2 2 0 0 1 4 0v6M13 10V6a2 2 0 0 1 4 0v6"/><path d="M17 11v-1a2 2 0 0 1 4 0v4c0 5-3 8-8 8h-2c-4 0-7-3-7-7v-3"/></>,
  breath: <><path d="M3 9h9c3 0 3-4 0-4-2 0-2 1-2 2"/><path d="M3 13h14c4 0 4 6 0 6-2 0-3-1-3-2"/></>,
  tea: <><path d="M4 8h13v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z"/><path d="M17 10h2a3 3 0 0 1 0 6h-2"/><path d="M9 2c-1 2 1 2 0 4M13 2c-1 2 1 2 0 4"/></>,
  walk: <><circle cx="13" cy="4" r="2"/><path d="m11 9 3 3 2-3M12 8l-2 6-4 3M10 14l3 7M14 12l4 4"/></>,
  music: <><path d="M9 18V6l10-2v12"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></>,
  journal: <><path d="M5 3h12a2 2 0 0 1 2 2v16H7a2 2 0 0 1-2-2V3Z"/><path d="M8 3v18M11 8h5M11 12h5"/></>,
  eye: <><path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
  shield: <><path d="M12 2 20 5v6c0 5-3 9-8 11-5-2-8-6-8-11V5l8-3Z"/><path d="m8 12 2.5 2.5L16 9"/></>,
  sunrise: <><path d="M12 4v3M5.6 9.6 7.7 11.7M18.4 9.6 16.3 11.7M3 18h18M6 18a6 6 0 0 1 12 0"/><path d="M2 21h20"/></>,
  target: <><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.2"/><path d="M12 4V2M12 22v-2M4 12H2M22 12h-2"/></>,
  flag: <><path d="M6 21V4"/><path d="M6 4.5h11l-2.2 3.7L17 12H6"/></>,
  flame: <><path d="M12 21c3.6 0 6-2.4 6-5.6 0-4.2-4-6.2-4-10.4-3 1.6-4.6 4-4.6 6.4 0 1.2.5 2 1 2.6-1.6 0-2.6-1.2-2.6-2.8C6.6 13 6 14.2 6 15.4 6 18.6 8.4 21 12 21Z"/></>,
  question: <><circle cx="12" cy="12" r="9"/><path d="M9.6 9.4A2.6 2.6 0 0 1 14.6 10c0 1.8-2.6 2-2.6 3.8"/><path d="M12 17.4h.01"/></>,
  knot: <><path d="M7 5c4 2 6 5 6 7s-2 5-6 7"/><path d="M17 5c-4 2-6 5-6 7s2 5 6 7"/></>,
  check: <path d="m4 12 5 5L20 6"/>,
  arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
  plus: <><path d="M12 5v14M5 12h14"/></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14M10 11v6M14 11v6"/></>,
  close: <><path d="M6 6l12 12M18 6 6 18"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v6l4 2"/></>,
  heart: <path d="M12 21S3 16 3 9a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 7-9 12-9 12Z"/>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></>,
  leaf: <><path d="M20 4C12 3 5 7 5 14c0 4 3 6 6 6 7 0 9-8 9-16Z"/><path d="M5 20c3-6 7-9 12-12"/></>,
};

export function Icon({ name, size = 24, className, ...props }: { name: IconName; size?: number; className?: string } & Omit<SVGProps<SVGSVGElement>, 'name'>) {
  return <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name]}</svg>;
}
