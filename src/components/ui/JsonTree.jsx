/** Mostra qualquer resposta JSON de forma legível (React escapa o texto, sem risco de injeção). */
export function JsonTree({ data }) {
  if (data === null || data === undefined) return <span className="muted">—</span>;
  if (Array.isArray(data))
    return data.length ? <ol className="json-list">{data.map((x, i) => <li key={i}><JsonTree data={x} /></li>)}</ol> : <span className="muted">vazio</span>;
  if (typeof data === "object")
    return <dl className="json-dl">{Object.entries(data).map(([k, v]) => <div key={k}><dt>{k}</dt><dd><JsonTree data={v} /></dd></div>)}</dl>;
  return <span>{String(data)}</span>;
}
