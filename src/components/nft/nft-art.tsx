type Palette = {
  background: string;
  accent: string;
  face: string;
  feature: string;
  hair: string;
  clothing: string;
};

const PALETTES: Palette[] = [
  { background: '#0E0905', accent: '#E89D58', face: '#a07750', feature: '#0E0905', hair: '#7c5c3a', clothing: '#0a4d3a' },
  { background: '#110C07', accent: '#d49a6a', face: '#8a5a2b', feature: '#0E0905', hair: '#5a3d22', clothing: '#3a1f4d' },
  { background: '#0F0905', accent: '#c97b3f', face: '#9c6840', feature: '#0E0905', hair: '#3d2818', clothing: '#1f4d3a' },
  { background: '#0A0805', accent: '#E89D58', face: '#a07750', feature: '#0E0905', hair: '#d49a6a', clothing: '#4d3a1f' },
  { background: '#0E0905', accent: '#a07750', face: '#7c5c3a', feature: '#0E0905', hair: '#2c1810', clothing: '#5a2c1f' },
  { background: '#0F0A07', accent: '#d49a6a', face: '#b8895a', feature: '#0E0905', hair: '#7c5c3a', clothing: '#1f3a4d' },
];

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export interface NftArtOptions {
  seed: string;
  variant?: 'default' | 'feature';
  className?: string;
}

export function NftArt({ seed, variant = 'default', className }: NftArtOptions) {
  const idx = hash(seed) % PALETTES.length;
  const palette = PALETTES[idx];
  const eyesClosed = (hash(seed + 'eye') % 3) === 0;
  const smileVariant = hash(seed + 'smile') % 4;
  const hasHeadphones = (hash(seed + 'head') % 4) === 0;
  const hasGlasses = (hash(seed + 'glass') % 3) === 0;
  const hasHat = (hash(seed + 'hat') % 5) === 0;
  const hasHood = (hash(seed + 'hood') % 5) === 0;

  const smilePaths = [
    'M170 220 Q200 245 230 220',
    'M168 222 Q200 252 232 222',
    'M170 218 Q200 240 230 218',
    'M165 224 Q200 250 235 224',
  ];

  const id = `art-${hash(seed)}`;
  const viewBox = variant === 'feature' ? '0 0 600 600' : '0 0 400 400';
  const cx = variant === 'feature' ? 300 : 200;
  const cy = variant === 'feature' ? 270 : 180;

  return (
    <svg viewBox={viewBox} className={className} role="img" aria-label={seed}>
      <defs>
        <radialGradient id={`${id}-bg`} cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor={palette.accent} stopOpacity="0.45" />
          <stop offset="60%" stopColor={palette.background} stopOpacity="0.9" />
          <stop offset="100%" stopColor={palette.background} />
        </radialGradient>
        <radialGradient id={`${id}-face`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={palette.accent} />
          <stop offset="100%" stopColor={palette.face} />
        </radialGradient>
      </defs>

      <rect width="100%" height="100%" fill={`url(#${id}-bg)`} />

      {hasHood && (
        <path
          d={`M ${cx - 130} ${cy + 120} Q ${cx} ${cy - 60} ${cx + 130} ${cy + 120} Z`}
          fill={palette.clothing}
        />
      )}

      <circle cx={cx} cy={cy} r={variant === 'feature' ? 140 : 110} fill={`url(#${id}-face)`} />

      {hasHeadphones && (
        <>
          <path
            d={`M ${cx - 90} ${cy - 30} Q ${cx} ${cy - 130} ${cx + 90} ${cy - 30}`}
            stroke={palette.hair}
            strokeWidth={variant === 'feature' ? 14 : 8}
            fill="none"
          />
          <circle cx={cx - 95} cy={cy - 10} r={variant === 'feature' ? 32 : 22} fill={palette.hair} />
          <circle cx={cx + 95} cy={cy - 10} r={variant === 'feature' ? 32 : 22} fill={palette.hair} />
        </>
      )}

      {hasHat && (
        <ellipse
          cx={cx}
          cy={cy - (variant === 'feature' ? 130 : 100)}
          rx={variant === 'feature' ? 140 : 110}
          ry={variant === 'feature' ? 40 : 28}
          fill={palette.hair}
        />
      )}

      {!eyesClosed && (
        <>
          <circle cx={cx - 32} cy={cy - 10} r={variant === 'feature' ? 14 : 8} fill="#fff" />
          <circle cx={cx + 32} cy={cy - 10} r={variant === 'feature' ? 14 : 8} fill="#fff" />
          <circle cx={cx - 30} cy={cy - 10} r={variant === 'feature' ? 6 : 4} fill={palette.feature} />
          <circle cx={cx + 34} cy={cy - 10} r={variant === 'feature' ? 6 : 4} fill={palette.feature} />
        </>
      )}
      {eyesClosed && (
        <>
          <path d={`M ${cx - 45} ${cy - 10} Q ${cx - 30} ${cy - 20} ${cx - 18} ${cy - 8}`} stroke={palette.feature} strokeWidth={variant === 'feature' ? 6 : 3} fill="none" />
          <path d={`M ${cx + 18} ${cy - 8} Q ${cx + 30} ${cy - 20} ${cx + 45} ${cy - 10}`} stroke={palette.feature} strokeWidth={variant === 'feature' ? 6 : 3} fill="none" />
        </>
      )}

      {hasGlasses && (
        <>
          <circle cx={cx - 32} cy={cy - 10} r={variant === 'feature' ? 28 : 20} stroke={palette.feature} strokeWidth={variant === 'feature' ? 5 : 3} fill="none" />
          <circle cx={cx + 32} cy={cy - 10} r={variant === 'feature' ? 28 : 20} stroke={palette.feature} strokeWidth={variant === 'feature' ? 5 : 3} fill="none" />
          <line x1={cx - 12} y1={cy - 10} x2={cx + 12} y2={cy - 10} stroke={palette.feature} strokeWidth={variant === 'feature' ? 5 : 3} />
        </>
      )}

      <path
        d={smilePaths[smileVariant]}
        transform={`translate(${variant === 'feature' ? cx - 200 : 0} ${variant === 'feature' ? cy - 180 : 0}) scale(${variant === 'feature' ? 1.5 : 1})`}
        stroke={palette.feature}
        strokeWidth={variant === 'feature' ? 5 : 3}
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}