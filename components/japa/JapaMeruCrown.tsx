import { Circle, G, Line, Path } from 'react-native-svg';

// Bead-ring constants and the Meru crown live at module scope: a component
// declared inside JapaScreen would be a new type on every render and remount
// on every bead tap.
export const NAVARATNA_GEMS = [
  { id: 'ruby', name: 'Manikya', color: '#E11D48', dark: '#881337', light: '#FDA4AF', rim: '#FFD700' },
  { id: 'pearl', name: 'Mukta', color: '#F8FAFC', dark: '#94A3B8', light: '#FFFFFF', rim: '#E2E8F0' },
  { id: 'coral', name: 'Moonga', color: '#F97316', dark: '#9A3412', light: '#FED7AA', rim: '#FFD700' },
  { id: 'emerald', name: 'Marakata', color: '#10B981', dark: '#064E3B', light: '#A7F3D0', rim: '#FFD700' },
  { id: 'topaz', name: 'Pukhraj', color: '#FBBF24', dark: '#B45309', light: '#FEF08A', rim: '#FFD700' },
  { id: 'diamond', name: 'Heera', color: '#E0F2FE', dark: '#0284C7', light: '#FFFFFF', rim: '#BAE6FD' },
  { id: 'sapphire', name: 'Neelam', color: '#2563EB', dark: '#1E3A8A', light: '#BFDBFE', rim: '#FFD700' },
  { id: 'hessonite', name: 'Gomed', color: '#D97706', dark: '#78350F', light: '#FDE68A', rim: '#FFD700' },
  { id: 'catseye', name: 'Vaidurya', color: '#84CC16', dark: '#365314', light: '#D9F99D', rim: '#FFD700' },
] as const;

export function MeruCrownApex({
  cx,
  cy,
  glowColor,
  threadColor,
}: {
  cx: number;
  cy: number;
  glowColor: string;
  threadColor: string;
}) {
  const r = 20;
  const rays = Array.from({ length: 12 }, (_, i) => {
    const angle = (Math.PI * 2 * i) / 12;
    const rInner = r + 3;
    const rOuter = r + 12;
    return {
      x1: cx + Math.cos(angle) * rInner,
      y1: cy + Math.sin(angle) * rInner,
      x2: cx + Math.cos(angle) * rOuter,
      y2: cy + Math.sin(angle) * rOuter,
    };
  });

  return (
    <G>
      {/* Radiant Golden Rays */}
      {rays.map((ray, i) => (
        <Line
          key={`meru-ray-${i}`}
          x1={ray.x1}
          y1={ray.y1}
          x2={ray.x2}
          y2={ray.y2}
          stroke="#FFD700"
          strokeWidth={i % 2 === 0 ? 2 : 1.2}
          strokeOpacity={i % 2 === 0 ? 0.9 : 0.6}
          strokeLinecap="round"
        />
      ))}

      {/* Luminous aura glow */}
      <Circle cx={cx} cy={cy} r={r + 8} fill={glowColor} opacity={0.42} />

      {/* Drop shadow */}
      <Circle cx={cx + 2} cy={cy + 3} r={r} fill="rgba(120,53,15,0.45)" />

      {/* 3D Filigree Meru Sphere */}
      <Circle
        cx={cx}
        cy={cy}
        r={r}
        fill="url(#grad-meru-gold)"
        stroke="#FFE58F"
        strokeWidth={1.6}
      />

      {/* Sacred Filigree Yantra Lattice */}
      <Circle
        cx={cx}
        cy={cy}
        r={r * 0.72}
        fill="none"
        stroke="#FFF8DC"
        strokeWidth={0.9}
        strokeDasharray="3,2"
        opacity={0.88}
      />
      <Circle
        cx={cx}
        cy={cy}
        r={r * 0.44}
        fill="none"
        stroke="#FFF8DC"
        strokeWidth={0.8}
        opacity={0.92}
      />

      {/* Filigree Petal Arches */}
      <Path
        d={`M ${cx - r * 0.6} ${cy} Q ${cx} ${cy - r * 0.6} ${cx + r * 0.6} ${cy} Q ${cx} ${cy + r * 0.6} ${cx - r * 0.6} ${cy}`}
        fill="none"
        stroke="#FFF8DC"
        strokeWidth={0.8}
        opacity={0.75}
      />
      <Path
        d={`M ${cx} ${cy - r * 0.6} Q ${cx - r * 0.6} ${cy} ${cx} ${cy + r * 0.6} Q ${cx + r * 0.6} ${cy} ${cx} ${cy - r * 0.6}`}
        fill="none"
        stroke="#FFF8DC"
        strokeWidth={0.8}
        opacity={0.75}
      />

      {/* Top Bindu & Crown Specular Sparkle */}
      <Circle cx={cx - r * 0.3} cy={cy - r * 0.32} r={r * 0.24} fill="#FFFFFF" opacity={0.95} />
      <Circle cx={cx} cy={cy} r={2.8} fill="#FFFFFF" stroke="#D97706" strokeWidth={0.8} />

      {/* Left/Right Thread Connectors */}
      <Circle cx={cx - r - 2} cy={cy} r={3.2} fill={threadColor} stroke="#FFD700" strokeWidth={0.8} />
      <Circle cx={cx + r + 2} cy={cy} r={3.2} fill={threadColor} stroke="#FFD700" strokeWidth={0.8} />
    </G>
  );
}
