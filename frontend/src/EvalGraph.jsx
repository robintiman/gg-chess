// Eval graph: area chart of centipawn eval across all plies with critical-moment markers.
import { useState, useRef } from "react";

export function formatMoveLabel(p) {
  if (!p || !p.san) return "start";
  return `${p.moveNo}${p.color === "w" ? "." : "..."} ${p.san}`;
}

export function formatEval(v) {
  if (v == null) return "0.0";
  const s = (v / 100).toFixed(1);
  return v >= 0 ? `+${s}` : s;
}

export default function EvalGraph({ plies, currentPly, onSeek, criticalPlies = [] }) {
  const [hoverPly, setHoverPly] = useState(null);
  const ref = useRef(null);

  const width = 760;
  const height = 96;
  const padX = 10;
  const padY = 12;
  const n = plies.length - 1;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;

  const clamp = (v) => Math.max(-800, Math.min(800, v));
  const evalToY = (v) => padY + (1 - (clamp(v) + 800) / 1600) * innerH;
  const plyToX = (i) => padX + (i / Math.max(1, n)) * innerW;

  const pts = plies.slice(1).map((p, i) => ({
    i: i + 1,
    x: plyToX(i + 1),
    y: evalToY(p.eval ?? 0),
    val: p.eval ?? 0,
  }));

  function smoothPath(points) {
    if (points.length < 2) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
    }
    return d;
  }

  const linePath = smoothPath(pts);
  const zeroY = evalToY(0);

  function handleMove(e) {
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (width / rect.width);
    const i = Math.round(((x - padX) / innerW) * n);
    setHoverPly(Math.max(1, Math.min(n, i)));
  }

  const hoverPt = hoverPly != null ? pts[hoverPly - 1] : null;
  const currentPt = currentPly > 0 ? pts[currentPly - 1] : null;

  return (
    <div className="eval-graph">
      <svg
        ref={ref}
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverPly(null)}
        onClick={() => hoverPly != null && onSeek?.(hoverPly)}
        style={{ display: "block", cursor: "pointer" }}
      >
        <rect x="0" y="0" width={width} height={height} fill="var(--bg-2)" rx="4" />
        <line x1={padX} y1={zeroY} x2={width - padX} y2={zeroY}
          stroke="var(--border-2)" strokeDasharray="2 3" strokeWidth="1" />
        <defs>
          <linearGradient id="eg-white" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.06" />
          </linearGradient>
          <linearGradient id="eg-black" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--danger)" stopOpacity="0.06" />
            <stop offset="100%" stopColor="var(--danger)" stopOpacity="0.28" />
          </linearGradient>
          <clipPath id="eg-clip-white">
            <rect x="0" y="0" width={width} height={zeroY} />
          </clipPath>
          <clipPath id="eg-clip-black">
            <rect x="0" y={zeroY} width={width} height={height - zeroY} />
          </clipPath>
        </defs>
        <path d={`${linePath} L ${pts[pts.length - 1]?.x || padX} ${height - padY} L ${padX} ${height - padY} Z`}
          fill="url(#eg-white)" clipPath="url(#eg-clip-white)" />
        <path d={`${linePath} L ${pts[pts.length - 1]?.x || padX} ${padY} L ${padX} ${padY} Z`}
          fill="url(#eg-black)" clipPath="url(#eg-clip-black)" />
        <path d={linePath} fill="none" stroke="var(--text)" strokeWidth="1.3" opacity="0.9" />

        {criticalPlies.map((cp) => {
          const pt = pts[cp - 1];
          if (!pt) return null;
          return (
            <g key={`crit-${cp}`} pointerEvents="none">
              <line x1={pt.x} y1={padY} x2={pt.x} y2={height - padY}
                stroke="var(--warn)" strokeWidth="1" strokeDasharray="3 2" opacity="0.5" />
              <circle cx={pt.x} cy={pt.y} r="5" fill="var(--warn)" opacity="0.9" />
              <circle cx={pt.x} cy={pt.y} r="5" fill="none" stroke="var(--bg)" strokeWidth="1.5" />
            </g>
          );
        })}

        {currentPt && (
          <g pointerEvents="none">
            <line x1={currentPt.x} y1={padY} x2={currentPt.x} y2={height - padY}
              stroke="var(--accent)" strokeWidth="1.5" />
            <circle cx={currentPt.x} cy={currentPt.y} r="4" fill="var(--accent)" />
            <circle cx={currentPt.x} cy={currentPt.y} r="4" fill="none" stroke="var(--bg)" strokeWidth="1.5" />
          </g>
        )}

        {hoverPt && hoverPly !== currentPly && (
          <g pointerEvents="none">
            <line x1={hoverPt.x} y1={padY} x2={hoverPt.x} y2={height - padY}
              stroke="var(--text-muted)" strokeWidth="1" opacity="0.4" />
            <circle cx={hoverPt.x} cy={hoverPt.y} r="3" fill="var(--text)" />
          </g>
        )}
      </svg>

      {hoverPt && (
        <div className="eg-tip" style={{ left: `${(hoverPt.x / width) * 100}%` }}>
          <div className="eg-tip-move">{formatMoveLabel(plies[hoverPly])}</div>
          <div className="eg-tip-eval">{formatEval(hoverPt.val)}</div>
        </div>
      )}

      <style>{`
        .eval-graph { position: relative; width: 100%; }
        .eg-tip {
          position: absolute; top: -6px;
          transform: translate(-50%, -100%);
          background: var(--surface-3);
          border: 1px solid var(--border-2);
          border-radius: var(--radius-sm);
          padding: 4px 8px;
          font-family: var(--font-mono); font-size: 11px;
          color: var(--text); white-space: nowrap;
          pointer-events: none; box-shadow: var(--shadow-1);
        }
        .eg-tip-move { font-weight: 600; }
        .eg-tip-eval { color: var(--text-muted); font-size: 10px; }
      `}</style>
    </div>
  );
}
