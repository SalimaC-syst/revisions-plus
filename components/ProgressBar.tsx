export function ProgressBar({ value, label, accent = false }: { value: number; label: string; accent?: boolean }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={`progress${accent ? " accent" : ""}`} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <span style={{ width: `${v}%` }} />
    </div>
  );
}
