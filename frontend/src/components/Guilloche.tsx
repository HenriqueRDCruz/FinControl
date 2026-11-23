// Rosetão de guilhochê: o desenho de linhas finas que protege as cédulas.
// Gerado por uma hipotrocoide; o caminho é calculado uma vez e reaproveitado com <use>.

const R = 90;
const r = 17;
const d = 40;
const TURNS = 17;
const STEPS = 2600;
const COPIES = 5;

function buildPath(): string {
  const k = (R - r) / r;
  let p = '';
  for (let i = 0; i <= STEPS; i++) {
    const t = (i / STEPS) * Math.PI * 2 * TURNS;
    const x = (R - r) * Math.cos(t) + d * Math.cos(k * t);
    const y = (R - r) * Math.sin(t) - d * Math.sin(k * t);
    p += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${p}Z`;
}

const PATH = buildPath();

/** `id` precisa ser único na página (o mesmo SVG pode aparecer em mais de um lugar). */
export function Guilloche({
  id,
  className,
  strokeWidth = 0.3,
  opacity = 0.55,
}: {
  id: string;
  className?: string;
  strokeWidth?: number;
  opacity?: number;
}) {
  return (
    <svg
      viewBox="-130 -130 260 260"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeOpacity={opacity}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <path id={id} d={PATH} />
      </defs>
      {Array.from({ length: COPIES }, (_, i) => (
        <use key={i} href={`#${id}`} transform={`rotate(${(360 / COPIES) * i})`} />
      ))}
    </svg>
  );
}
