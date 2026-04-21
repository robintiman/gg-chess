// AI Coach right-rail. Tabs: Think · Hint · Judge · Explore
// Persistent context chip shows the current move.

function CoachPanel({
  currentPly, plies, game, moveData, onRequestSquare, onRequestArrow,
  blindMode, onProposeMove, userAnnotations, onUpdateAnnotation,
  onOpenVariation,
}) {
  const [tab, setTab] = React.useState("think");
  const plyInfo = plies[currentPly];
  const moveDetails = moveData; // focal move with critical details, if any

  // If user just landed on a new critical move, auto-pulse
  React.useEffect(() => {
    if (moveDetails?.isCritical && blindMode) setTab("think");
    if (moveDetails?.isCritical && !blindMode) setTab("judge");
  }, [currentPly, blindMode]);

  return (
    <div className="cp-root">
      <CoachHeader plyInfo={plyInfo} moveDetails={moveDetails} blindMode={blindMode} />

      <div className="cp-tabs">
        <TabBtn active={tab === "think"} onClick={() => setTab("think")} label="Think" badge={moveDetails?.isCritical && blindMode ? "•" : null} />
        <TabBtn active={tab === "hint"} onClick={() => setTab("hint")} label="Hint" icon="bulb" />
        <TabBtn active={tab === "judge"} onClick={() => setTab("judge")} label="Judge" icon="scale" disabled={blindMode} />
        <TabBtn active={tab === "explore"} onClick={() => setTab("explore")} label="Explore" icon="tree" />
        <TabBtn active={tab === "ask"} onClick={() => setTab("ask")} label="Ask" icon="msg" />
      </div>

      <div className="cp-body">
        {tab === "think" && (
          <ThinkTab moveDetails={moveDetails} plyInfo={plyInfo}
            annotation={userAnnotations[plyInfo?.ply] || {}}
            onUpdate={(field, val) => onUpdateAnnotation(plyInfo.ply, field, val)}
            blindMode={blindMode} />
        )}
        {tab === "hint" && (
          <HintTab moveDetails={moveDetails} onRequestSquare={onRequestSquare} />
        )}
        {tab === "judge" && (
          <JudgeTab moveDetails={moveDetails} blindMode={blindMode}
            onProposeMove={onProposeMove} onRequestArrow={onRequestArrow} />
        )}
        {tab === "explore" && (
          <ExploreTab moveDetails={moveDetails} onOpenVariation={onOpenVariation} />
        )}
        {tab === "ask" && (
          <AskTab plyInfo={plyInfo} moveDetails={moveDetails} />
        )}
      </div>

      <style>{`
        .cp-root {
          display: flex; flex-direction: column;
          height: 100%; overflow: hidden;
          background: var(--surface);
          border-left: 1px solid var(--border);
        }
        .cp-tabs {
          display: flex;
          border-bottom: 1px solid var(--border);
          padding: 0 6px;
          flex-shrink: 0;
          background: var(--bg-2);
        }
        .cp-body {
          flex: 1; overflow-y: auto;
          padding: 16px;
        }
      `}</style>
    </div>
  );
}

function CoachHeader({ plyInfo, moveDetails, blindMode }) {
  return (
    <div className="cph">
      <div className="cph-left">
        <div className="cph-avatar">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2a4 4 0 0 0-4 4v1H6a2 2 0 0 0-2 2v3a8 8 0 0 0 16 0V9a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4z"/>
            <circle cx="9" cy="11" r="1" fill="currentColor"/>
            <circle cx="15" cy="11" r="1" fill="currentColor"/>
            <path d="M9 16c1 1 2 1.5 3 1.5s2-.5 3-1.5"/>
          </svg>
        </div>
        <div>
          <div className="cph-name">gg <span className="cph-nameAccent">coach</span></div>
          <div className="cph-mode">{blindMode ? "Blind mode · engine hidden" : "Review mode · engine revealed"}</div>
        </div>
      </div>
      {plyInfo?.san && (
        <div className="cph-context">
          <span className="cph-move">{plyInfo.moveNo}{plyInfo.color === "w" ? "." : "…"} {plyInfo.san}</span>
          {moveDetails?.isCritical && !blindMode && (
            <span className="cph-crit" title={moveDetails.conceptName}>{CLASS_META[moveDetails.class]?.label}</span>
          )}
          {moveDetails?.isCritical && blindMode && (
            <span className="cph-crit-blind">critical moment</span>
          )}
        </div>
      )}
      <style>{`
        .cph {
          padding: 14px 16px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-2);
          flex-shrink: 0;
        }
        .cph-left { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
        .cph-avatar {
          width: 32px; height: 32px;
          border-radius: 50%;
          background: var(--accent-muted);
          color: var(--accent);
          display: flex; align-items: center; justify-content: center;
          border: 1px solid var(--accent-dim);
        }
        .cph-name {
          font-size: 13px; font-weight: 600; color: var(--text);
          font-family: var(--font-serif);
          font-style: italic;
          letter-spacing: 0.3px;
        }
        .cph-nameAccent { color: var(--accent); }
        .cph-mode {
          font-size: 11px; color: var(--text-dim);
          font-family: var(--font-mono);
        }
        .cph-context {
          display: flex; align-items: center; gap: 8px;
          padding: 6px 10px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          font-family: var(--font-mono);
          font-size: 12px;
        }
        .cph-move { color: var(--text); font-weight: 600; }
        .cph-crit {
          margin-left: auto;
          color: var(--warn);
          background: var(--warn-muted);
          border: 1px solid var(--warn);
          padding: 1px 6px;
          border-radius: 99px;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }
        .cph-crit-blind {
          margin-left: auto;
          color: var(--warn);
          font-style: italic;
          font-family: var(--font-serif);
          font-size: 12px;
          text-transform: lowercase;
        }
      `}</style>
    </div>
  );
}

function TabBtn({ active, onClick, label, icon, badge, disabled }) {
  return (
    <button className={`tb ${active ? "active" : ""} ${disabled ? "disabled" : ""}`}
      onClick={disabled ? undefined : onClick}
      title={disabled ? "Available after you reveal engine analysis" : undefined}
    >
      <TabIcon name={icon} />
      <span>{label}</span>
      {badge && <span className="tb-badge">{badge}</span>}
      <style>{`
        .tb {
          display: inline-flex; align-items: center; gap: 5px;
          background: none; border: none;
          padding: 10px 10px;
          font-size: 12px; color: var(--text-dim);
          font-family: var(--font-ui);
          font-weight: 500;
          cursor: pointer;
          border-bottom: 2px solid transparent;
          margin-bottom: -1px;
          position: relative;
          transition: color 0.12s, border-color 0.12s;
        }
        .tb:hover:not(.disabled) { color: var(--text); }
        .tb.active {
          color: var(--text);
          border-bottom-color: var(--accent);
        }
        .tb.disabled { opacity: 0.35; cursor: not-allowed; }
        .tb-badge {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--warn);
        }
      `}</style>
    </button>
  );
}

function TabIcon({ name }) {
  const common = { width: 13, height: 13, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };
  if (name === "bulb") return <svg viewBox="0 0 24 24" {...common}><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.7.6 1 1.4 1 2.3h6c0-.9.3-1.7 1-2.3A7 7 0 0 0 12 2z"/></svg>;
  if (name === "scale") return <svg viewBox="0 0 24 24" {...common}><path d="M12 3v18M5 7h14M5 7l-2 6c0 2 2 3 4 3s4-1 4-3L9 7zm10 0l-2 6c0 2 2 3 4 3s4-1 4-3l-2-6"/></svg>;
  if (name === "tree") return <svg viewBox="0 0 24 24" {...common}><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><circle cx="12" cy="12" r="2"/><path d="M7.4 7.4l3.2 3.2M16.6 7.4l-3.2 3.2M13.4 13.4l3.2 3.2"/></svg>;
  if (name === "msg") return <svg viewBox="0 0 24 24" {...common}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
  return null;
}

// ================ THINK TAB =================
function ThinkTab({ moveDetails, plyInfo, annotation, onUpdate, blindMode }) {
  const classifications = [
    { v: "good", label: "Good move", color: "var(--accent)" },
    { v: "inaccuracy", label: "Inaccuracy", color: "#dcb75a" },
    { v: "mistake", label: "Mistake", color: "var(--warn)" },
    { v: "blunder", label: "Blunder", color: "var(--danger)" },
  ];

  const isCritical = moveDetails?.isCritical;

  return (
    <div className="think fade-up">
      {blindMode && isCritical && (
        <div className="think-flag">
          <span className="flag-bullet" />
          <div>
            <div className="flag-title">Something important happened here</div>
            <div className="flag-sub">Take your time. What did you see? What did you miss?</div>
          </div>
        </div>
      )}

      <section>
        <label className="sec-lbl">Your thinking</label>
        <textarea
          className="think-ta"
          placeholder="What were you calculating? What candidate moves did you see?"
          value={annotation.thought || ""}
          onChange={(e) => onUpdate("thought", e.target.value)}
          rows="4"
        />
      </section>

      <section>
        <label className="sec-lbl">How would you rate your move?</label>
        <div className="think-cls">
          {classifications.map((c) => (
            <button key={c.v}
              className={`cls-btn ${annotation.classification === c.v ? "on" : ""}`}
              style={{ "--cls-color": c.color }}
              onClick={() => onUpdate("classification", annotation.classification === c.v ? null : c.v)}
            >
              <span className="cls-dot" />
              {c.label}
            </button>
          ))}
        </div>
      </section>

      {!blindMode && moveDetails?.isCritical && (
        <section className="think-verdict">
          <div className="verdict-label">Engine verdict</div>
          <div className="verdict-row">
            <span className="v-chip" style={{ color: CLASS_META[moveDetails.class]?.color, borderColor: CLASS_META[moveDetails.class]?.color }}>
              {CLASS_META[moveDetails.class]?.label}
            </span>
            <span className="v-swing">
              {formatEval(moveDetails.evalBefore)}
              <span className="v-arrow">→</span>
              {formatEval(moveDetails.evalAfter)}
            </span>
          </div>
          <p className="v-copy">{moveDetails.comment}</p>
        </section>
      )}

      <style>{`
        .think { display: flex; flex-direction: column; gap: 18px; }
        .think-flag {
          display: flex; gap: 10px; align-items: flex-start;
          padding: 12px;
          background: var(--warn-muted);
          border: 1px solid var(--warn);
          border-radius: var(--radius);
        }
        .flag-bullet {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--warn);
          margin-top: 6px;
          flex-shrink: 0;
          animation: pulse 1.8s ease-in-out infinite;
        }
        .flag-title { font-size: 13px; font-weight: 600; color: var(--text); }
        .flag-sub {
          font-size: 12px; color: var(--text-muted);
          font-style: italic; font-family: var(--font-serif);
          margin-top: 2px;
        }
        .sec-lbl {
          display: block;
          font-size: 11px; font-weight: 500;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin-bottom: 6px;
        }
        .think-ta {
          width: 100%;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text);
          font-family: var(--font-ui);
          font-size: 13px;
          padding: 10px;
          resize: vertical;
          min-height: 80px;
          line-height: 1.5;
          outline: none;
          transition: border-color 0.15s;
        }
        .think-ta:focus { border-color: var(--accent); }
        .think-cls { display: flex; flex-wrap: wrap; gap: 6px; }
        .cls-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 10px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 99px;
          font-size: 12px;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.12s;
        }
        .cls-btn:hover { border-color: var(--cls-color); color: var(--cls-color); }
        .cls-btn.on {
          background: color-mix(in srgb, var(--cls-color) 14%, transparent);
          border-color: var(--cls-color);
          color: var(--cls-color);
          font-weight: 600;
        }
        .cls-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--cls-color);
        }
        .think-verdict {
          padding: 12px;
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-left: 3px solid var(--warn);
          border-radius: var(--radius-sm);
        }
        .verdict-label {
          font-size: 10px; font-weight: 600;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 0.6px;
          margin-bottom: 6px;
        }
        .verdict-row {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 8px;
        }
        .v-chip {
          padding: 2px 8px;
          border: 1px solid;
          border-radius: 99px;
          font-size: 11px;
          font-weight: 600;
        }
        .v-swing {
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--text-muted);
          display: inline-flex; gap: 4px; align-items: center;
        }
        .v-arrow { color: var(--text-dim); }
        .v-copy {
          margin: 0;
          font-size: 13px;
          line-height: 1.55;
          color: var(--text);
          font-family: var(--font-serif);
          font-style: italic;
        }
      `}</style>
    </div>
  );
}

// ================ HINT TAB (Socratic) =================
function HintTab({ moveDetails, onRequestSquare }) {
  const [revealed, setRevealed] = React.useState(0);
  const [streaming, setStreaming] = React.useState(false);
  const hints = moveDetails?.coachSocratic || [
    "Take a breath. What's the most forcing move available here?",
    "Count the attackers and defenders on each weak square.",
    "Is there a piece on the edge of the board doing nothing?",
  ];

  function nextHint() {
    if (revealed >= hints.length) return;
    setStreaming(true);
    setTimeout(() => {
      setStreaming(false);
      setRevealed(revealed + 1);
    }, 700);
  }

  return (
    <div className="hint fade-up">
      <div className="hint-prompt">
        <div className="hint-prompt-lbl">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.7.6 1 1.4 1 2.3h6c0-.9.3-1.7 1-2.3A7 7 0 0 0 12 2z"/>
          </svg>
          Socratic hints
        </div>
        <div className="hint-prompt-sub">I won't tell you the answer — I'll ask questions that help you find it.</div>
      </div>

      <div className="hint-stream">
        {hints.slice(0, revealed).map((h, i) => (
          <div className="hint-bubble fade-up" key={i}>
            <div className="hint-num">{i + 1}</div>
            <div className="hint-text">{h}</div>
          </div>
        ))}
        {streaming && (
          <div className="hint-bubble hint-typing">
            <div className="hint-num">{revealed + 1}</div>
            <div className="typing-dots"><span/><span/><span/></div>
          </div>
        )}
      </div>

      <div className="hint-actions">
        {revealed < hints.length ? (
          <button className="btn-primary" onClick={nextHint} disabled={streaming}>
            {revealed === 0 ? "Give me a hint" : "Nudge me further"}
          </button>
        ) : (
          <div className="hint-done">
            <span className="hint-done-lbl">That's all I'll say.</span>
            <span className="hint-done-sub">Try the <em>Judge</em> tab to test a move.</span>
          </div>
        )}
      </div>

      <style>{`
        .hint { display: flex; flex-direction: column; gap: 16px; }
        .hint-prompt {
          padding: 12px;
          background: var(--info-muted);
          border: 1px solid color-mix(in srgb, var(--info) 40%, transparent);
          border-radius: var(--radius);
        }
        .hint-prompt-lbl {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 600;
          color: var(--info);
        }
        .hint-prompt-sub {
          font-size: 12px; color: var(--text-muted);
          font-style: italic; font-family: var(--font-serif);
          margin-top: 4px;
        }
        .hint-stream { display: flex; flex-direction: column; gap: 10px; }
        .hint-bubble {
          display: flex; gap: 10px;
          padding: 12px;
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-left: 3px solid var(--info);
          border-radius: var(--radius-sm);
        }
        .hint-num {
          flex-shrink: 0;
          width: 20px; height: 20px;
          border-radius: 50%;
          background: var(--info-muted);
          color: var(--info);
          font-size: 11px;
          font-weight: 700;
          font-family: var(--font-mono);
          display: flex; align-items: center; justify-content: center;
        }
        .hint-text {
          font-size: 13px; line-height: 1.55;
          color: var(--text);
          font-family: var(--font-serif);
        }
        .typing-dots {
          display: inline-flex; gap: 3px; align-items: center;
          height: 20px;
        }
        .typing-dots span {
          width: 5px; height: 5px; border-radius: 50%;
          background: var(--text-dim);
          animation: td-bounce 1.2s infinite;
        }
        .typing-dots span:nth-child(2) { animation-delay: 0.15s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes td-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-4px); opacity: 1; }
        }
        .hint-actions { margin-top: 4px; }
        .btn-primary {
          width: 100%;
          padding: 10px 14px;
          background: var(--accent);
          color: #0b0c0d;
          border: none;
          border-radius: var(--radius-sm);
          font-size: 13px;
          font-weight: 600;
          font-family: var(--font-ui);
          cursor: pointer;
          transition: filter 0.12s;
        }
        .btn-primary:hover:not(:disabled) { filter: brightness(1.08); }
        .btn-primary:disabled { opacity: 0.6; cursor: default; }
        .hint-done {
          display: flex; flex-direction: column; gap: 2px;
          padding: 10px 12px;
          background: var(--surface-2);
          border: 1px dashed var(--border-2);
          border-radius: var(--radius-sm);
          text-align: center;
        }
        .hint-done-lbl { font-size: 12px; color: var(--text); font-weight: 500; }
        .hint-done-sub { font-size: 12px; color: var(--text-muted); font-style: italic; font-family: var(--font-serif); }
        .hint-done em { color: var(--accent); font-style: normal; font-family: var(--font-ui); font-weight: 600; }
      `}</style>
    </div>
  );
}

// ================ JUDGE TAB =================
function JudgeTab({ moveDetails, blindMode, onProposeMove, onRequestArrow }) {
  const [proposal, setProposal] = React.useState("");
  const [verdicts, setVerdicts] = React.useState([]);
  const [judging, setJudging] = React.useState(false);

  const attempts = moveDetails?.userAttempts || [];
  const hinted = ["Qxg6", "Qxh6", "Rxh6", "Re1", "Re3"].filter((m) =>
    (moveDetails?.userAttempts || []).some((a) => a.move === m)
  );

  function judge(move) {
    if (!move) return;
    const found = attempts.find((a) => a.move.toLowerCase() === move.toLowerCase());
    setJudging(true);
    onRequestArrow?.({ from: null, to: null });
    setTimeout(() => {
      setJudging(false);
      if (found) {
        setVerdicts((v) => [...v, found]);
        onProposeMove?.(found);
      } else {
        setVerdicts((v) => [...v, {
          move,
          verdict: "unknown",
          note: `I haven't analyzed ${move} specifically. In this position it's not among the top candidates — want me to work through what happens after it?`,
        }]);
      }
      setProposal("");
    }, 800);
  }

  return (
    <div className="judge fade-up">
      <div className="judge-intro">
        <div className="judge-intro-lbl">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 3v18M5 7h14M5 7l-2 6c0 2 2 3 4 3s4-1 4-3L9 7zm10 0l-2 6c0 2 2 3 4 3s4-1 4-3l-2-6"/>
          </svg>
          Try a move on me
        </div>
        <div className="judge-intro-sub">Propose any move. I'll tell you what the engine thinks and why.</div>
      </div>

      <div className="judge-input">
        <input
          type="text"
          placeholder="e.g. Qxg6, Re1, Nxf7…"
          value={proposal}
          onChange={(e) => setProposal(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && judge(proposal)}
        />
        <button className="btn-primary" onClick={() => judge(proposal)} disabled={!proposal.trim() || judging}>
          {judging ? "…" : "Judge"}
        </button>
      </div>

      {moveDetails?.userAttempts?.length > 0 && (
        <div className="judge-quick">
          <span className="judge-quick-lbl">Try:</span>
          {moveDetails.userAttempts.map((a) => (
            <button key={a.move} className="chip" onClick={() => judge(a.move)}>
              {a.move}
            </button>
          ))}
        </div>
      )}

      <div className="judge-stream">
        {verdicts.map((v, i) => <VerdictCard v={v} key={i} />)}
        {verdicts.length === 0 && !judging && (
          <div className="judge-empty">
            <div className="judge-empty-art">
              <div className="je-line" /><div className="je-line s" /><div className="je-line s" />
            </div>
            <div className="judge-empty-text">
              No judgements yet.<br/>
              <span className="je-hint">Pick a move you'd actually play and test it.</span>
            </div>
          </div>
        )}
        {judging && (
          <div className="judge-thinking">
            <div className="spin" />
            <span>running Stockfish at depth 22…</span>
          </div>
        )}
      </div>

      <style>{`
        .judge { display: flex; flex-direction: column; gap: 14px; }
        .judge-intro {
          padding: 12px;
          background: var(--accent-muted);
          border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
          border-radius: var(--radius);
        }
        .judge-intro-lbl {
          display: flex; align-items: center; gap: 6px;
          font-size: 12px; font-weight: 600;
          color: var(--accent);
        }
        .judge-intro-sub {
          font-size: 12px; color: var(--text-muted);
          font-style: italic; font-family: var(--font-serif);
          margin-top: 4px;
        }
        .judge-input { display: flex; gap: 6px; }
        .judge-input input {
          flex: 1;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text);
          font-family: var(--font-mono);
          font-size: 13px;
          padding: 8px 10px;
          outline: none;
          transition: border-color 0.15s;
        }
        .judge-input input:focus { border-color: var(--accent); }
        .judge-input .btn-primary { width: auto; padding: 8px 14px; }
        .judge-quick {
          display: flex; flex-wrap: wrap; gap: 5px; align-items: center;
        }
        .judge-quick-lbl {
          font-size: 11px; color: var(--text-dim);
          text-transform: uppercase; letter-spacing: 0.5px;
          margin-right: 4px;
        }
        .chip {
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: 99px;
          padding: 3px 9px;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 0.12s;
        }
        .chip:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-muted); }
        .judge-stream { display: flex; flex-direction: column; gap: 10px; min-height: 60px; }
        .judge-empty {
          padding: 20px 12px;
          text-align: center;
          color: var(--text-dim);
          font-size: 12px;
          font-style: italic;
          font-family: var(--font-serif);
        }
        .judge-empty-art {
          display: flex; flex-direction: column; align-items: center; gap: 4px;
          margin-bottom: 10px;
          opacity: 0.4;
        }
        .je-line {
          width: 36px; height: 1.5px;
          background: var(--text-dim);
          border-radius: 1px;
        }
        .je-line.s { width: 20px; }
        .je-hint { font-family: var(--font-ui); font-style: normal; font-size: 11px; }
        .judge-thinking {
          display: flex; align-items: center; gap: 8px;
          padding: 10px;
          color: var(--text-muted);
          font-size: 12px;
          font-family: var(--font-mono);
        }
        .spin {
          width: 12px; height: 12px;
          border: 2px solid var(--border-2);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

function VerdictCard({ v }) {
  const meta = {
    best:       { label: "Best!", color: "var(--accent)", icon: "✓" },
    close:      { label: "Close", color: "#dcb75a", icon: "≈" },
    inaccurate: { label: "Inaccurate", color: "var(--warn)", icon: "?!" },
    blunder:    { label: "Loses", color: "var(--danger)", icon: "??" },
    unknown:    { label: "Off-engine", color: "var(--text-muted)", icon: "?" },
  }[v.verdict] || { label: v.verdict, color: "var(--text-muted)", icon: "·" };

  return (
    <div className="vc fade-up" style={{ "--vc-color": meta.color }}>
      <div className="vc-head">
        <span className="vc-move">{v.move}</span>
        <span className="vc-verdict">{meta.icon} {meta.label}</span>
        {v.evalAfter != null && (
          <span className="vc-eval">{formatEval(v.evalAfter)}</span>
        )}
      </div>
      <div className="vc-note">{v.note}</div>
      <style>{`
        .vc {
          padding: 10px 12px;
          background: color-mix(in srgb, var(--vc-color) 8%, var(--bg-2));
          border: 1px solid color-mix(in srgb, var(--vc-color) 40%, transparent);
          border-left: 3px solid var(--vc-color);
          border-radius: var(--radius-sm);
        }
        .vc-head { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
        .vc-move {
          font-family: var(--font-mono);
          font-size: 13px; font-weight: 600;
          color: var(--text);
        }
        .vc-verdict {
          font-size: 11px; font-weight: 600;
          color: var(--vc-color);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .vc-eval {
          margin-left: auto;
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--text-muted);
        }
        .vc-note {
          font-size: 13px; line-height: 1.55;
          color: var(--text-muted);
          font-family: var(--font-serif);
          font-style: italic;
        }
      `}</style>
    </div>
  );
}

// ================ EXPLORE TAB =================
function ExploreTab({ moveDetails, onOpenVariation }) {
  // Show the best line as a playable variation, plus pattern examples.
  const bestLine = moveDetails?.bestLine || [];
  const examples = moveDetails?.examples || [];

  return (
    <div className="expl fade-up">
      {bestLine.length > 0 ? (
        <section>
          <div className="sec-head">
            <span className="sec-title">What should've happened</span>
            <span className="sec-sub">Click any move to step into the variation</span>
          </div>
          <div className="expl-line">
            {bestLine.map((san, i) => (
              <button key={i} className="expl-move" onClick={() => onOpenVariation?.(i)}>
                <span className="expl-moveNum">{Math.floor(i/2) + (moveDetails.isCritical ? 16 : 16)}{i % 2 === 0 ? "." : "…"}</span>
                <span>{san}</span>
              </button>
            ))}
          </div>
          <button className="btn-ghost full" onClick={() => onOpenVariation?.(0)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 3v18l15-9L5 3z"/></svg>
            Play through the variation
          </button>
        </section>
      ) : (
        <section>
          <div className="sec-head"><span className="sec-title">No critical branches here</span></div>
          <p className="muted-copy">This move was fine. Use the navigator to find the moments that matter — look for the orange markers on the eval graph.</p>
        </section>
      )}

      {examples.length > 0 && (
        <section>
          <div className="sec-head">
            <span className="sec-title">Pattern library</span>
            <span className="sec-sub">Positions where this motif decides the game</span>
          </div>
          {examples.map((ex, i) => <ExampleCard ex={ex} key={i} />)}
        </section>
      )}

      <section>
        <div className="sec-head">
          <span className="sec-title">Drills from this game</span>
        </div>
        {DRILL_SUGGESTIONS.map((d, i) => <DrillCard drill={d} key={i} />)}
      </section>

      <style>{`
        .expl { display: flex; flex-direction: column; gap: 18px; }
        .sec-head {
          margin-bottom: 8px;
        }
        .sec-title {
          font-size: 11px; font-weight: 600;
          color: var(--text-dim);
          text-transform: uppercase;
          letter-spacing: 0.6px;
          display: block;
        }
        .sec-sub {
          font-size: 12px; color: var(--text-muted);
          font-style: italic;
          font-family: var(--font-serif);
        }
        .muted-copy {
          font-size: 13px; line-height: 1.55;
          color: var(--text-muted);
          font-family: var(--font-serif);
          font-style: italic;
          margin: 0;
        }
        .expl-line {
          display: flex; flex-wrap: wrap; gap: 3px;
          padding: 8px;
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          margin-bottom: 8px;
        }
        .expl-move {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 4px 8px;
          background: none;
          border: 1px solid transparent;
          border-radius: 3px;
          font-family: var(--font-mono);
          font-size: 12px;
          color: var(--text);
          cursor: pointer;
          transition: all 0.1s;
        }
        .expl-move:hover {
          background: var(--accent-muted);
          border-color: var(--accent);
        }
        .expl-moveNum { color: var(--text-dim); }
        .btn-ghost {
          display: inline-flex; align-items: center; gap: 6px;
          justify-content: center;
          padding: 8px 12px;
          background: none;
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          font-size: 12px;
          cursor: pointer;
          transition: all 0.12s;
        }
        .btn-ghost.full { width: 100%; }
        .btn-ghost:hover {
          border-color: var(--accent);
          color: var(--accent);
          background: var(--accent-muted);
        }
      `}</style>
    </div>
  );
}

function ExampleCard({ ex }) {
  return (
    <div className="exc">
      <div className="exc-mini">
        <div className="exc-pieces">♖♕</div>
      </div>
      <div className="exc-body">
        <div className="exc-title">{ex.title}</div>
        <div className="exc-caption">{ex.caption}</div>
      </div>
      <style>{`
        .exc {
          display: flex; gap: 10px;
          padding: 10px;
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          margin-bottom: 8px;
          cursor: pointer;
          transition: border-color 0.12s;
        }
        .exc:hover { border-color: var(--border-2); }
        .exc-mini {
          width: 48px; height: 48px;
          flex-shrink: 0;
          background:
            repeating-conic-gradient(var(--square-dark) 0 25%, var(--square-light) 0 50%) 0 0 / 100% 100%;
          border-radius: 3px;
          display: flex; align-items: center; justify-content: center;
        }
        .exc-pieces {
          font-size: 22px;
          color: #111;
          text-shadow: 0 0 2px #fff;
        }
        .exc-body { flex: 1; min-width: 0; }
        .exc-title {
          font-size: 12px; font-weight: 600;
          color: var(--text);
        }
        .exc-caption {
          font-size: 12px; color: var(--text-muted);
          font-family: var(--font-serif); font-style: italic;
          line-height: 1.4;
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
}

function DrillCard({ drill }) {
  return (
    <div className="dc">
      <div className="dc-tag">{drill.tag}</div>
      <div className="dc-title">{drill.title}</div>
      <div className="dc-meta">
        <span>{drill.difficulty}</span>
        <span className="dot">·</span>
        <span>{drill.length}</span>
      </div>
      <div className="dc-from">From: {drill.from}</div>
      <style>{`
        .dc {
          padding: 10px 12px;
          background: var(--bg-2);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          margin-bottom: 8px;
          cursor: pointer;
          transition: border-color 0.12s;
        }
        .dc:hover { border-color: var(--accent); }
        .dc-tag {
          display: inline-block;
          font-size: 10px; font-weight: 600;
          color: var(--accent);
          background: var(--accent-muted);
          padding: 1px 6px;
          border-radius: 99px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .dc-title {
          font-size: 13px; font-weight: 600;
          color: var(--text);
          margin-bottom: 4px;
        }
        .dc-meta {
          display: flex; gap: 5px;
          font-size: 11px;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }
        .dc-meta .dot { opacity: 0.5; }
        .dc-from {
          font-size: 11px;
          color: var(--text-dim);
          font-style: italic;
          font-family: var(--font-serif);
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}

// ================ ASK (free chat) TAB =================
function AskTab({ plyInfo, moveDetails }) {
  const [messages, setMessages] = React.useState([
    { role: "assistant", text: moveDetails?.isCritical
      ? `I'm here. What would you like to understand about ${plyInfo?.san}?`
      : `Ask me anything about this position.`,
    },
  ]);
  const [input, setInput] = React.useState("");
  const [streaming, setStreaming] = React.useState(false);
  const feedRef = React.useRef(null);

  React.useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Scripted responses for prototype
  const scriptedReplies = {
    "why was nxf7 bad": "Nxf7 isn't bad in isolation — it wins the exchange. But it trades your most active attacker for a rook when the king was already nearly mated. Qxg6 was three times better because it kept the h-file open for your rook lift and forced Black into a mating net.",
    "threat": "Black's biggest threat is Bxe4 on the next move — your rook on e4 is only defended by the knight on f3, and if the knight moves, the rook drops with check from the bishop.",
    "best move": moveDetails?.bestMove
      ? `The engine likes ${moveDetails.bestMove}. ${moveDetails.bestLine ? "Main line: " + moveDetails.bestLine.join(" ") : ""}`
      : "The engine considers this move fine — nothing stands out as much better.",
  };

  function send() {
    if (!input.trim() || streaming) return;
    const q = input.trim();
    setMessages((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setStreaming(true);
    const key = Object.keys(scriptedReplies).find((k) => q.toLowerCase().includes(k));
    const reply = scriptedReplies[key]
      || "Good question. Let me look at that — the position has a few key ideas I can walk you through if you want to pick one: the piece activity, the king safety, or the pawn structure.";
    streamReply(reply);
  }

  function streamReply(text) {
    setMessages((m) => [...m, { role: "assistant", text: "" }]);
    let i = 0;
    const step = () => {
      if (i >= text.length) { setStreaming(false); return; }
      i = Math.min(text.length, i + Math.ceil(text.length / 30));
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = { role: "assistant", text: text.slice(0, i) };
        return copy;
      });
      setTimeout(step, 30);
    };
    setTimeout(step, 250);
  }

  return (
    <div className="ask fade-up">
      <div className="ask-feed" ref={feedRef}>
        {messages.map((m, i) => (
          <div key={i} className={`ask-bubble ${m.role}`}>
            {m.text}
          </div>
        ))}
        {streaming && messages[messages.length - 1]?.role === "user" && (
          <div className="ask-bubble assistant"><span className="typing-dots"><span/><span/><span/></span></div>
        )}
      </div>

      <div className="ask-suggested">
        {["What's Black's threat?", "Why was my move bad?", "What should I have played?"].map((s) => (
          <button key={s} className="chip" onClick={() => { setInput(s); }}>{s}</button>
        ))}
      </div>

      <div className="ask-input">
        <textarea
          placeholder="Ask about this position…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows="2"
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
        />
        <button className="btn-primary" onClick={send} disabled={!input.trim() || streaming}>→</button>
      </div>

      <style>{`
        .ask { display: flex; flex-direction: column; gap: 10px; height: 100%; }
        .ask-feed {
          flex: 1;
          display: flex; flex-direction: column; gap: 8px;
          min-height: 160px;
          max-height: 360px;
          overflow-y: auto;
          padding-right: 4px;
        }
        .ask-bubble {
          max-width: 85%;
          padding: 8px 12px;
          border-radius: 12px;
          font-size: 13px;
          line-height: 1.5;
          white-space: pre-wrap;
        }
        .ask-bubble.user {
          align-self: flex-end;
          background: var(--accent);
          color: #0b0c0d;
          border-bottom-right-radius: 3px;
        }
        .ask-bubble.assistant {
          align-self: flex-start;
          background: var(--surface-2);
          border: 1px solid var(--border);
          color: var(--text);
          border-bottom-left-radius: 3px;
        }
        .ask-suggested {
          display: flex; flex-wrap: wrap; gap: 4px;
        }
        .ask-input {
          display: flex; gap: 6px;
        }
        .ask-input textarea {
          flex: 1;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          color: var(--text);
          font-family: var(--font-ui);
          font-size: 13px;
          padding: 8px 10px;
          resize: none;
          outline: none;
        }
        .ask-input textarea:focus { border-color: var(--accent); }
        .ask-input .btn-primary { width: 38px; padding: 0; font-size: 16px; }
      `}</style>
    </div>
  );
}

Object.assign(window, { CoachPanel });
