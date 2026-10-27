export function DangerMeter({ status, distance }: { status: "Healthy" | "Warning" | "Danger"; distance: number | null }) {
  const span = distance === null ? 100 : Math.max(4, Math.min(100, distance));
  const cls = status === "Danger" || (distance !== null && distance < 5) ? "danger" : status === "Warning" ? "warning" : "healthy";
  return (
    <div className={`depth ${cls}`} title={`${status}${distance === null ? "" : ` ${distance.toFixed(1)}%`}`}>
      <div className="depth-track">
        <i className="depth-mark" />
        <i className="depth-fill" style={{ height: `${span}%` }} />
        <i className="depth-liq" style={{ top: `${span}%` }} />
      </div>
      <span className="depth-cap">mark</span>
    </div>
  );
}
