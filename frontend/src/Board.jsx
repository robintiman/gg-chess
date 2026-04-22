// Chess board component with SVG pieces, arrows, highlights, and coordinates.

const PIECE_GLYPHS = {
  K: "\u265A", Q: "\u265B", R: "\u265C", B: "\u265D", N: "\u265E", P: "\u265F",
  k: "\u265A", q: "\u265B", r: "\u265C", b: "\u265D", n: "\u265E", p: "\u265F",
};

export default function Board({
  board,
  flipped = false,
  size = 560,
  lastMove = null,
  highlight = null,
  highlightKind = "critical",
  arrow = null,
  arrows = [],
  showCoords = true,
  onSquareClick = null,
  selectedSquare = null,
  annotations = [],
  ghostPiece = null,
}) {
  const sqSize = size / 8;
  const files = flipped ? ["h","g","f","e","d","c","b","a"] : ["a","b","c","d","e","f","g","h"];
  const ranks = flipped ? ["1","2","3","4","5","6","7","8"] : ["8","7","6","5","4","3","2","1"];

  function sqToXY(sq) {
    if (!sq) return null;
    const f = "abcdefgh".indexOf(sq[0]);
    const r = parseInt(sq[1]) - 1;
    const x = flipped ? (7 - f) : f;
    const y = flipped ? r : (7 - r);
    return { x: x * sqSize, y: y * sqSize, cx: x * sqSize + sqSize / 2, cy: y * sqSize + sqSize / 2 };
  }

  const allArrows = arrow ? [arrow, ...arrows] : arrows;

  function squareAt(dispX, dispY) {
    const f = flipped ? (7 - dispX) : dispX;
    const r = flipped ? dispY : (7 - dispY);
    return "abcdefgh"[f] + (r + 1);
  }

  const highlightPos = highlight ? sqToXY(highlight) : null;

  return (
    <div className="board-root" style={{ width: size, height: size }}>
      <svg
        viewBox={`0 0 ${size} ${size}`}
        width={size}
        height={size}
        className="board-svg"
        style={{ display: "block" }}
      >
        {Array.from({ length: 8 }).map((_, y) =>
          Array.from({ length: 8 }).map((_, x) => {
            const isLight = (x + y) % 2 === 0;
            const sqName = squareAt(x, y);
            const isSelected = selectedSquare === sqName;
            const isLastFrom = lastMove?.from === sqName;
            const isLastTo = lastMove?.to === sqName;
            return (
              <g key={`sq-${x}-${y}`}>
                <rect
                  x={x * sqSize} y={y * sqSize}
                  width={sqSize} height={sqSize}
                  fill={isLight ? "var(--square-light)" : "var(--square-dark)"}
                  onClick={onSquareClick ? () => onSquareClick(sqName) : undefined}
                  style={{ cursor: onSquareClick ? "pointer" : "default" }}
                />
                {(isLastFrom || isLastTo) && (
                  <rect x={x * sqSize} y={y * sqSize} width={sqSize} height={sqSize}
                    fill="var(--accent)" opacity="0.22" pointerEvents="none" />
                )}
                {isSelected && (
                  <rect x={x * sqSize + 1} y={y * sqSize + 1}
                    width={sqSize - 2} height={sqSize - 2}
                    fill="none" stroke="var(--accent)" strokeWidth="3" pointerEvents="none" />
                )}
                {showCoords && x === 0 && (
                  <text x={x * sqSize + 4} y={y * sqSize + 13}
                    fontSize={Math.round(sqSize * 0.18)} fontFamily="var(--font-mono)"
                    fill={isLight ? "var(--square-dark)" : "var(--square-light)"}
                    opacity="0.55" pointerEvents="none">{ranks[y]}</text>
                )}
                {showCoords && y === 7 && (
                  <text x={x * sqSize + sqSize - 10} y={y * sqSize + sqSize - 4}
                    fontSize={Math.round(sqSize * 0.18)} fontFamily="var(--font-mono)"
                    fill={isLight ? "var(--square-dark)" : "var(--square-light)"}
                    opacity="0.55" pointerEvents="none">{files[x]}</text>
                )}
              </g>
            );
          })
        )}

        {highlightPos && (
          <g pointerEvents="none">
            <rect
              x={highlightPos.x + 2} y={highlightPos.y + 2}
              width={sqSize - 4} height={sqSize - 4}
              fill="none"
              stroke={
                highlightKind === "critical" ? "var(--warn)" :
                highlightKind === "danger"   ? "var(--danger)" :
                highlightKind === "best"     ? "var(--accent)" :
                highlightKind === "hint"     ? "var(--info)" : "var(--accent)"
              }
              strokeWidth="3"
              strokeDasharray={highlightKind === "hint" ? "6 4" : undefined}
              rx="3"
              style={{
                animation: highlightKind === "critical" ? "pulse 1.8s ease-in-out infinite" : undefined,
                transformOrigin: `${highlightPos.cx}px ${highlightPos.cy}px`,
              }}
            />
          </g>
        )}

        {board.map((row, ry) =>
          row.map((piece, rx) => {
            if (!piece) return null;
            const dispX = flipped ? (7 - rx) : rx;
            const dispY = flipped ? ry : (7 - ry);
            const glyph = PIECE_GLYPHS[piece];
            const isWhite = piece === piece.toUpperCase();
            return (
              <text key={`p-${ry}-${rx}`}
                x={dispX * sqSize + sqSize / 2}
                y={dispY * sqSize + sqSize / 2 + sqSize * 0.05}
                fontSize={sqSize * 0.82}
                textAnchor="middle" dominantBaseline="central"
                fill={isWhite ? "#ffffff" : "#111111"}
                stroke={isWhite ? "#111111" : "#ffffff"}
                strokeWidth={1} paintOrder="stroke"
                style={{
                  pointerEvents: "none", userSelect: "none",
                  fontFamily: "'Segoe UI Symbol', 'Apple Symbols', 'Noto Sans Symbols 2', sans-serif",
                  filter: isWhite
                    ? "drop-shadow(0 1px 1px rgba(0,0,0,0.3))"
                    : "drop-shadow(0 1px 1px rgba(0,0,0,0.25))",
                }}
              >{glyph}</text>
            );
          })
        )}

        {ghostPiece && (() => {
          const pos = sqToXY(ghostPiece.square);
          if (!pos) return null;
          const isWhite = ghostPiece.piece === ghostPiece.piece.toUpperCase();
          return (
            <text x={pos.cx} y={pos.cy + sqSize * 0.05}
              fontSize={sqSize * 0.82} textAnchor="middle" dominantBaseline="central"
              fill={isWhite ? "#ffffff" : "#111111"} stroke="var(--info)" strokeWidth="2"
              paintOrder="stroke" opacity="0.65"
              style={{ pointerEvents: "none", fontFamily: "'Segoe UI Symbol', sans-serif" }}
            >{PIECE_GLYPHS[ghostPiece.piece]}</text>
          );
        })()}

        {annotations.map((a, i) => {
          const pos = sqToXY(a.square);
          if (!pos || a.type !== "circle") return null;
          return (
            <circle key={`ann-${i}`} cx={pos.cx} cy={pos.cy} r={sqSize * 0.42}
              fill="none" stroke={a.color || "var(--info)"}
              strokeWidth="3" opacity="0.8" pointerEvents="none" />
          );
        })}

        <defs>
          {["accent", "info", "danger", "warn"].map((c) => (
            <marker key={c} id={`arrow-${c}`} viewBox="0 0 10 10" refX="6" refY="5"
              markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={`var(--${c})`} />
            </marker>
          ))}
        </defs>
        {allArrows.map((a, i) => {
          const from = sqToXY(a.from);
          const to = sqToXY(a.to);
          if (!from || !to) return null;
          const color = a.color || "accent";
          const strokeColor =
            color === "info" ? "var(--info)" :
            color === "danger" ? "var(--danger)" :
            color === "warn" ? "var(--warn)" : "var(--accent)";
          return (
            <line key={`ar-${i}`}
              x1={from.cx} y1={from.cy} x2={to.cx} y2={to.cy}
              stroke={strokeColor} strokeWidth={sqSize * 0.14} strokeLinecap="round"
              opacity="0.85" markerEnd={`url(#arrow-${color})`} pointerEvents="none" />
          );
        })}
      </svg>

      <style>{`
        .board-root {
          position: relative;
          border-radius: var(--radius);
          overflow: hidden;
          box-shadow: var(--shadow-2);
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

export function EvalBar({ evalCp, height = 560, flipped = false }) {
  const clamped = Math.max(-800, Math.min(800, evalCp ?? 0));
  const whiteShare = 0.5 + clamped / 1600;
  const whitePct = Math.round(whiteShare * 100);
  const label = (() => {
    if (Math.abs(evalCp) >= 1000) return (evalCp > 0 ? "+" : "-") + "M";
    const v = (evalCp / 100).toFixed(1);
    return evalCp > 0 ? `+${v}` : v;
  })();

  return (
    <div className="eval-bar" style={{ height }}>
      <div className="eval-fill-white" style={{
        height: flipped ? `${100 - whitePct}%` : `${whitePct}%`,
        bottom: flipped ? "auto" : 0,
        top: flipped ? 0 : "auto",
      }} />
      <div className={`eval-label ${evalCp >= 0 ? "top" : "bot"} ${evalCp >= 0 ? "on-white" : "on-black"}`}>
        {label}
      </div>
      <style>{`
        .eval-bar {
          position: relative; width: 22px;
          background: #111; border-radius: 3px;
          overflow: hidden;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05);
        }
        .eval-fill-white {
          position: absolute; left: 0; right: 0;
          background: #f5f2e8;
          transition: height 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .eval-label {
          position: absolute; left: 0; right: 0;
          text-align: center;
          font-family: var(--font-mono); font-size: 10px;
          font-weight: 600; letter-spacing: 0.3px;
        }
        .eval-label.top { top: 4px; }
        .eval-label.bot { bottom: 4px; }
        .eval-label.on-white { color: #222; }
        .eval-label.on-black { color: #ddd; }
      `}</style>
    </div>
  );
}
