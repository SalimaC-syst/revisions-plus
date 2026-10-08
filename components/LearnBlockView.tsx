type Block = { id: string; type: string; title: string; data: any };

function safeUrl(u: string) {
  try { const x = new URL(u, "http://local"); return ["http:", "https:"].includes(x.protocol) || u.startsWith("/") ? u : null; } catch { return null; }
}

function embedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  if (/^https:\/\/digipad\.app\//.test(url)) return url;
  return null;
}

export function LearnBlockView({ block }: { block: Block }) {
  const d = block.data ?? {};
  let body: React.ReactNode = null;
  switch (block.type) {
    case "TEXT": body = <p style={{ whiteSpace: "pre-line" }}>{d.text}</p>; break;
    case "KEYPOINTS": body = <ul>{(d.items ?? []).map((i: string, k: number) => <li key={k}>{i}</li>)}</ul>; break;
    case "DEFINITIONS": body = <dl className="deflist">{(d.items ?? []).map((i: any, k: number) => <div key={k}><dt>{i.term}</dt><dd>{i.definition}</dd></div>)}</dl>; break;
    case "TIMELINE": body = <ol className="timeline">{[...(d.events ?? [])].sort((a: any, b: any) => a.year - b.year).map((e: any, k: number) => <li key={k}><strong>{e.date || e.year}</strong> — {e.label}</li>)}</ol>; break;
    case "TABLE": body = (
      <div className="table-wrap"><table>
        <thead><tr>{(d.headers ?? []).map((h: string, k: number) => <th key={k}>{h}</th>)}</tr></thead>
        <tbody>{(d.rows ?? []).map((r: string[], k: number) => <tr key={k}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
      </table></div>
    ); break;
    case "EXAMPLE": body = <><p style={{ whiteSpace: "pre-line" }}>{d.text}</p>{d.comment && <p className="alert alert-info" style={{ whiteSpace: "pre-line" }}>💬 {d.comment}</p>}</>; break;
    case "MEDIA": {
      const url = safeUrl(String(d.url ?? ""));
      const embed = url && d.kind !== "image" ? embedUrl(url) : null;
      body = (
        <figure style={{ margin: 0 }}>
          {url && d.kind === "image" && <img src={url} alt={d.alt || d.caption || block.title} />}
          {embed && <iframe src={embed} title={block.title} style={{ width: "100%", aspectRatio: "16/9", border: 0, borderRadius: 12 }} allowFullScreen sandbox="allow-scripts allow-same-origin allow-presentation" referrerPolicy="strict-origin-when-cross-origin" />}
          {url && !embed && d.kind !== "image" && <a href={url} target="_blank" rel="noopener noreferrer">Ouvrir la ressource ↗</a>}
          {d.caption && <figcaption className="small muted">{d.caption}</figcaption>}
        </figure>
      );
      break;
    }
  }
  return (
    <section className="card">
      <h2>{block.title}</h2>
      {body}
    </section>
  );
}
