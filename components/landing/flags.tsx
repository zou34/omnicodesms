import type { ReactNode } from "react";

/**
 * Drapeaux en SVG plutôt qu'en emoji. Windows ne fournit aucune police de
 * drapeaux : 🇫🇷 s'y affiche « FR » en toutes lettres, alors qu'Android, iOS et
 * macOS rendent le drapeau. Ces tracés donnent le même rendu partout.
 *
 * Tracés extraits des SVG officiels de country-flag-icons (MIT) et figés ici :
 * la page n'a besoin que de ces 15 pays, inutile d'embarquer les 250 du
 * paquet ni d'ajouter une dépendance d'exécution. Le viewBox est porté par
 * chaque drapeau car le Togo et le Sénégal sont cadrés différemment.
 */
const FLAGS: Record<string, { viewBox: string; paths: ReactNode }> = {
  CI: {
    viewBox: "0 0 513 342",
    paths: (
      <>
        <path fill="#FFF" d="M0 0h513v342H0z"/>
        <path fill="#009e60" d="M342 0h171v342H342z"/>
        <path fill="#f77f00" d="M0 0h171v342H0z"/>
      </>
    ),
  },
  FR: {
    viewBox: "0 0 513 342",
    paths: (
      <>
        <path fill="#FFF" d="M0 0h513v342H0z"/>
        <path fill="#00318A" d="M0 0h171v342H0z"/>
        <path fill="#D80027" d="M342 0h171v342H342z"/>
      </>
    ),
  },
  MA: {
    viewBox: "0 0 513 342",
    paths: (
      <>
        <path fill="#d12a46" d="M0 .3V342h513V.3z"/>
        <path fill="#316525" d="M359.8 148.9h-73.3l-22.7-69.7-22.7 69.7h-73.3l59.3 43.1-22.7 69.7 59.3-43.1 59.3 43.1-22.5-69.7 59.3-43.1zm-116.1 37.7 7.7-23.6h24.8l7.7 23.6-20.1 14.6-20.1-14.6zm27.9-37.7H256l7.8-24 7.8 24zm24.3 29-4.8-14.9h25.3l-20.5 14.9zM236.6 163l-4.8 14.9-20.5-14.9h25.3zm-5.3 61.8 7.8-24 12.6 9.2-20.4 14.8zm44.5-14.9 12.6-9.2 7.8 24-20.4-14.8z"/>
      </>
    ),
  },
  US: {
    viewBox: "0 0 513 342",
    paths: (
      <>
        <path fill="#FFF" d="M0 0h513v342H0z"/>
        <g fill="#D80027">
        <path d="M0 0h513v26.3H0zM0 52.6h513v26.3H0zM0 105.2h513v26.3H0zM0 157.8h513v26.3H0zM0 210.5h513v26.3H0zM0 263.1h513v26.3H0zM0 315.7h513V342H0z"/>
        </g>
        <path fill="#2E52B2" d="M0 0h256.5v184.1H0z"/>
        <g fill="#FFF">
        <path d="m47.8 138.9-4-12.8-4.4 12.8H26.2l10.7 7.7-4 12.8 10.9-7.9 10.6 7.9-4.1-12.8 10.9-7.7zM104.1 138.9l-4.1-12.8-4.2 12.8H82.6l10.7 7.7-4 12.8 10.7-7.9 10.8 7.9-4-12.8 10.7-7.7zM160.6 138.9l-4.3-12.8-4 12.8h-13.5l11 7.7-4.2 12.8 10.7-7.9 11 7.9-4.2-12.8 10.7-7.7zM216.8 138.9l-4-12.8-4.2 12.8h-13.3l10.8 7.7-4 12.8 10.7-7.9 10.8 7.9-4.3-12.8 11-7.7zM100 75.3l-4.2 12.8H82.6L93.3 96l-4 12.6 10.7-7.8 10.8 7.8-4-12.6 10.7-7.9h-13.4zM43.8 75.3l-4.4 12.8H26.2L36.9 96l-4 12.6 10.9-7.8 10.6 7.8L50.3 96l10.9-7.9H47.8zM156.3 75.3l-4 12.8h-13.5l11 7.9-4.2 12.6 10.7-7.8 11 7.8-4.2-12.6 10.7-7.9h-13.2zM212.8 75.3l-4.2 12.8h-13.3l10.8 7.9-4 12.6 10.7-7.8 10.8 7.8-4.3-12.6 11-7.9h-13.5zM43.8 24.7l-4.4 12.6H26.2l10.7 7.9-4 12.7L43.8 50l10.6 7.9-4.1-12.7 10.9-7.9H47.8zM100 24.7l-4.2 12.6H82.6l10.7 7.9-4 12.7L100 50l10.8 7.9-4-12.7 10.7-7.9h-13.4zM156.3 24.7l-4 12.6h-13.5l11 7.9-4.2 12.7 10.7-7.9 11 7.9-4.2-12.7 10.7-7.9h-13.2zM212.8 24.7l-4.2 12.6h-13.3l10.8 7.9-4 12.7 10.7-7.9 10.8 7.9-4.3-12.7 11-7.9h-13.5z"/>
        </g>
      </>
    ),
  },
  TG: {
    viewBox: "0 85.333 512 341.333",
    paths: (
      <>
        <path fill="#FFDA44" d="M0 85.337h512v341.326H0z"/>
        <g fill="#496E2D">
        <path d="M0 85.337h512V153.6H0zM0 358.4h512v68.263H0zM0 221.863h512v68.263H0z"/>
        </g>
        <path fill="#D80027" d="M0 85.337h204.054v204.054H0z"/>
        <path fill="#FFF" d="m102.026 133.938 13.26 40.812h42.916l-34.718 25.226 13.26 40.814-34.718-25.224-34.719 25.224 13.263-40.814-34.718-25.226h42.913z"/>
      </>
    ),
  },
  GB: {
    viewBox: "0 0 513 342",
    paths: (
      <>
        <g fill="#FFF">
        <path d="M0 0h513v341.3H0V0z"/>
        <path d="M311.7 230 513 341.3v-31.5L369.3 230h-57.6zM200.3 111.3 0 0v31.5l143.7 79.8h56.6z"/>
        </g>
        <g fill="#012169">
        <path d="M393.8 230 513 295.7V230H393.8zm-82.1 0L513 341.3v-31.5L369.3 230h-57.6zm146.9 111.3-147-81.7v81.7h147zM90.3 230 0 280.2V230h90.3zm110 14.2v97.2H25.5l174.8-97.2zM118.2 111.3 0 45.6v65.7h118.2zm82.1 0L0 0v31.5l143.7 79.8h56.6zM53.4 0l147 81.7V0h-147zM421.7 111.3 513 61.1v50.2h-91.3zm-110-14.2V0h174.9L311.7 97.1z"/>
        </g>
        <g fill="#c8102e">
        <path d="M288 0h-64v138.7H0v64h224v138.7h64V202.7h224v-64H288V0z"/>
        <path d="M311.7 230 513 341.3v-31.5L369.3 230h-57.6zM143.7 230 0 309.9v31.5L200.3 230h-56.6zM200.3 111.3 0 0v31.5l143.7 79.8h56.6zM368.3 111.3 513 31.5V0L311.7 111.3h56.6z"/>
        </g>
      </>
    ),
  },
  SN: {
    viewBox: "0 85.333 512 341.333",
    paths: (
      <>
        <path fill="#FFDA44" d="M0 85.331h512v341.326H0z"/>
        <path fill="#D80027" d="M330.207 85.331H512v341.337H330.207z"/>
        <g fill="#496E2D">
        <path d="M0 85.331h181.793v341.337H0zM255.999 196.632l14.733 45.347h47.685l-38.576 28.029 14.734 45.348-38.576-28.026-38.577 28.026 14.737-45.348-38.576-28.029h47.681z"/>
        </g>
      </>
    ),
  },
  BE: {
    viewBox: "0 0 513 342",
    paths: (
      <>
        <path fill="#fdda25" d="M0 0h513v342H0z"/>
        <path d="M0 0h171v342H0z"/>
        <path fill="#ef3340" d="M342 0h171v342H342z"/>
      </>
    ),
  },
  NG: {
    viewBox: "0 0 513 342",
    paths: (
      <>
        <path fill="#FFF" d="M0 0h513v342H0z"/>
        <g fill="#008751">
        <path d="M0 0h171v342H0zM342 0h171v342H342z"/>
        </g>
      </>
    ),
  },
  ML: {
    viewBox: "0 0 513 342",
    paths: (
      <>
        <path fill="#14b53a" d="M0 0h171v342H0z"/>
        <path fill="#fcd116" d="M171 0h171v342H171z"/>
        <path fill="#ce1126" d="M342 0h171v342H342z"/>
      </>
    ),
  },
  CA: {
    viewBox: "0 0 513 342",
    paths: (
      <>
        <path fill="#FFF" d="M0 0h513v342H0z"/>
        <g fill="red">
        <path d="M0 0h142v342H0zM371 0h142v342H371zM306.5 206l50.4-25.2-25.2-12.6V143l-50.4 25.2 25.2-50.4h-25.2L256.1 80l-25.2 37.8h-25.2l25.2 50.4-50.4-25.2v25.2l-25.2 12.6 50.4 25.2-12.6 25.2h50.4V269h25.2v-37.8h50.4z"/>
        </g>
      </>
    ),
  },
  DZ: {
    viewBox: "0 0 513 342",
    paths: (
      <>
        <path fill="#41662E" d="M0 0h513v342H0z"/>
        <path fill="#FFF" d="M256.5 0H513v342H256.5z"/>
        <g fill="#D80027">
        <path d="m341.5 105.3-29.4 40.4-47.5-15.4 29.4 40.4-29.4 40.4 47.5-15.4 29.4 40.4v-50l47.5-15.5-47.5-15.4z"/>
        <path d="M309.9 276.7c-58.5 0-106-47.5-106-106s47.5-106 106-106c18.3 0 35.4 4.6 50.4 12.7-23.5-23-55.7-37.2-91.2-37.2-72 0-130.4 58.4-130.4 130.4S197.1 301 269.1 301c35.5 0 67.7-14.2 91.2-37.2-14.9 8.2-32.1 12.9-50.4 12.9z"/>
        </g>
      </>
    ),
  },
  CM: {
    viewBox: "0 0 513 342",
    paths: (
      <>
        <path fill="#ce1126" d="M0 0h513v342H0z"/>
        <path fill="#007a5e" d="M0 0h171v342H0z"/>
        <g fill="#fcd116">
        <path d="M342 0h171v342H342zM256 102.2l17.2 53H329L283.9 188l17.2 53-45.1-32.7-45.1 32.7 17.2-53-45.1-32.8h55.8z"/>
        </g>
      </>
    ),
  },
  BF: {
    viewBox: "0 0 513 342",
    paths: (
      <>
        <path fill="#3d944f" d="M0 0h513v342H0z"/>
        <path fill="#ef2b2d" d="M0 0h513v171H0z"/>
        <path fill="#FFDA44" d="m256 102.6 16.9 52h54.7l-44.2 32.2 16.8 52-44.2-32.1-44.2 32.1 16.8-52-44.2-32.2h54.7z"/>
      </>
    ),
  },
  GA: {
    viewBox: "0 0 513 342",
    paths: (
      <>
        <path fill="#FFDA44" d="M0 0h513v342H0z"/>
        <path fill="#6DA544" d="M0 0h513v114H0z"/>
        <path fill="#0052B4" d="M0 228h513v114H0z"/>
      </>
    ),
  },
};

/** Noms en français, utilisés comme texte alternatif. */
const FLAG_LABELS: Record<string, string> = {
  CI: "Côte d'Ivoire",
  FR: "France",
  MA: "Maroc",
  US: "États-Unis",
  TG: "Togo",
  GB: "Royaume-Uni",
  SN: "Sénégal",
  BE: "Belgique",
  NG: "Nigeria",
  ML: "Mali",
  CA: "Canada",
  DZ: "Algérie",
  CM: "Cameroun",
  BF: "Burkina Faso",
  GA: "Gabon",
};

export type FlagCode = keyof typeof FLAG_LABELS;

export function Flag({ code, className }: { code: string; className?: string }) {
  const flag = FLAGS[code];
  if (!flag) return null;

  return (
    <svg viewBox={flag.viewBox} role="img" aria-label={FLAG_LABELS[code] ?? code} className={className}>
      {flag.paths}
    </svg>
  );
}
