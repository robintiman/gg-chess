// Tweaks panel. Floating bottom-right when open.

export default function TweaksPanel({ open, onClose, tweaks, setTweaks }) {
  if (!open) return null;
  const T = tweaks;
  const set = (k, v) => setTweaks({ ...T, [k]: v });

  return (
    <div className="tw-root">
      <div className="tw-head">
        <span className="tw-title">Tweaks</span>
        <button className="tw-close" onClick={onClose}>✕</button>
      </div>
      <div className="tw-body">
        <TwGroup label="Theme">
          {[
            { v: "dark", label: "Dark" },
            { v: "light", label: "Study hall" },
            { v: "editorial", label: "Editorial" },
          ].map((o) => (
            <TwChip key={o.v} on={T.theme === o.v} onClick={() => set("theme", o.v)}>{o.label}</TwChip>
          ))}
        </TwGroup>
        <TwGroup label="Coach tone">
          {[
            { v: "socratic", label: "Socratic" },
            { v: "direct", label: "Direct" },
            { v: "strict", label: "Strict" },
          ].map((o) => (
            <TwChip key={o.v} on={T.tone === o.v} onClick={() => set("tone", o.v)}>{o.label}</TwChip>
          ))}
        </TwGroup>
        <TwGroup label="Engine reveal">
          {[
            { v: "minimal", label: "Minimal" },
            { v: "rich", label: "Rich" },
            { v: "progressive", label: "Progressive" },
          ].map((o) => (
            <TwChip key={o.v} on={T.engineReveal === o.v} onClick={() => set("engineReveal", o.v)}>{o.label}</TwChip>
          ))}
        </TwGroup>
        <TwGroup label="Coach rail">
          {[
            { v: "right", label: "Right" },
            { v: "bottom", label: "Bottom" },
          ].map((o) => (
            <TwChip key={o.v} on={T.coachPosition === o.v} onClick={() => set("coachPosition", o.v)}>{o.label}</TwChip>
          ))}
        </TwGroup>
        <TwGroup label="Default mode">
          {[
            { v: true, label: "Start blind" },
            { v: false, label: "Show engine" },
          ].map((o) => (
            <TwChip key={String(o.v)} on={T.defaultBlind === o.v} onClick={() => set("defaultBlind", o.v)}>{o.label}</TwChip>
          ))}
        </TwGroup>
      </div>
      <style>{`
        .tw-root {
          position: fixed; bottom: 18px; right: 18px; width: 280px;
          background: var(--surface); border: 1px solid var(--border-2);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-2), 0 0 0 6px rgba(0,0,0,0.25);
          z-index: 200; overflow: hidden; animation: fadeUp 0.25s ease-out;
        }
        .tw-head {
          display: flex; justify-content: space-between; align-items: center;
          padding: 10px 14px; border-bottom: 1px solid var(--border); background: var(--bg-2);
        }
        .tw-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.6px; color: var(--text); }
        .tw-close { background: none; border: none; color: var(--text-dim); font-size: 13px; cursor: pointer; width: 22px; height: 22px; border-radius: 3px; }
        .tw-close:hover { color: var(--text); background: var(--surface-2); }
        .tw-body { padding: 12px 14px; display: flex; flex-direction: column; gap: 14px; max-height: 70vh; overflow-y: auto; }
        .twg-lbl { font-size: 10px; font-weight: 600; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.6px; margin-bottom: 5px; }
        .twg-chips { display: flex; flex-wrap: wrap; gap: 4px; }
        .twc {
          background: var(--surface-2); border: 1px solid var(--border); border-radius: 99px;
          padding: 4px 10px; font-size: 11px; color: var(--text-muted);
          cursor: pointer; font-family: var(--font-ui); transition: all 0.12s;
        }
        .twc:hover { color: var(--text); border-color: var(--border-2); }
        .twc.on { background: var(--accent-muted); border-color: var(--accent); color: var(--accent); font-weight: 600; }
      `}</style>
    </div>
  );
}

function TwGroup({ label, children }) {
  return (
    <div>
      <div className="twg-lbl">{label}</div>
      <div className="twg-chips">{children}</div>
    </div>
  );
}

function TwChip({ on, onClick, children }) {
  return (
    <button className={`twc ${on ? "on" : ""}`} onClick={onClick}>{children}</button>
  );
}
