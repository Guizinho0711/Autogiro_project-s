// Silhuetas originais por categoria, pintadas com a cor do veículo. Sem imagens externas: carregam na hora.
const SHAPES = {
  hatch: "M20 108 L28 84 Q32 76 42 74 L84 70 Q96 50 118 46 L178 46 Q204 48 220 72 L262 78 Q284 82 292 100 L296 112 L20 112 Z",
  sedan: "M14 108 L22 86 Q26 78 38 76 L92 72 Q112 50 140 46 L186 46 Q214 50 232 72 L274 78 Q296 82 304 100 L306 112 L14 112 Z",
  suv: "M16 110 L22 80 Q26 70 38 68 L76 64 Q86 44 108 40 L216 40 Q240 44 252 66 L282 72 Q300 78 302 98 L304 112 L16 112 Z",
  picape: "M12 110 L18 82 Q22 74 34 72 L84 68 Q96 46 118 42 L172 42 Q186 44 192 60 L196 72 L296 72 Q304 76 306 86 L308 112 L12 112 Z",
};
const WINDOWS = {
  hatch: "M96 70 Q106 54 122 52 L176 52 Q196 54 208 70 Z",
  sedan: "M106 72 Q120 54 142 52 L184 52 Q206 54 220 72 Z",
  suv: "M92 64 Q100 48 114 46 L214 46 Q232 48 240 64 Z",
  picape: "M102 66 Q110 52 124 48 L170 48 Q180 50 184 64 Z",
};

export function VehicleArt({ category, color = "#6d28d9", label }) {
  const decorative = !label;
  if (category === "moto") {
    return (
      <svg viewBox="0 0 320 140" role={decorative ? "presentation" : "img"} aria-label={label} aria-hidden={decorative || undefined} className="art">
        <circle cx="86" cy="104" r="26" className="art__wheel" /><circle cx="86" cy="104" r="10" className="art__hub" />
        <circle cx="244" cy="104" r="26" className="art__wheel" /><circle cx="244" cy="104" r="10" className="art__hub" />
        <path d="M86 104 L128 62 L176 62 L204 90 L244 104 M128 62 L112 44 L136 40 M176 62 L204 52 L226 58 M150 62 L168 88 L204 90" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M132 58 Q150 46 176 52 L184 62 L132 66 Z" fill={color} />
        <path d="M88 84 L112 46" stroke="#bdb8d6" strokeWidth="5" strokeLinecap="round" />
      </svg>
    );
  }
  const body = SHAPES[category] ?? SHAPES.hatch;
  const glass = WINDOWS[category] ?? WINDOWS.hatch;
  const rear = category === "picape" ? 232 : category === "suv" ? 236 : 240;
  return (
    <svg viewBox="0 0 320 140" role={decorative ? "presentation" : "img"} aria-label={label} aria-hidden={decorative || undefined} className="art">
      <ellipse cx="160" cy="124" rx="140" ry="6" className="art__shadow" />
      <path d={body} fill={color} />
      <path d={glass} className="art__glass" />
      <path d="M20 104 L296 104" className="art__line" />
      <circle cx="84" cy="112" r="20" className="art__wheel" /><circle cx="84" cy="112" r="8" className="art__hub" />
      <circle cx={rear} cy="112" r="20" className="art__wheel" /><circle cx={rear} cy="112" r="8" className="art__hub" />
    </svg>
  );
}
