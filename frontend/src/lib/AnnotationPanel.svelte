<script>
  import { history, currentIndex, currentGame, annotations, hintMessages } from "../stores.js";
  import { get } from "svelte/store";

  $: currentMove = $history[$currentIndex];
  $: moveNumber = currentMove?.move_number ?? 0;
  $: san = currentMove?.san ?? null;
  $: fen = currentMove?.fen ?? "";

  $: annotation = $annotations[moveNumber] ?? { user_thought: "", error_classification: "", error_type: "" };

  let saveTimer = null;
  let saving = false;

  const errorClasses = [
    { value: "blunder", label: "Blunder", color: "#e74c3c" },
    { value: "mistake", label: "Mistake", color: "#e67e22" },
    { value: "inaccuracy", label: "Inaccuracy", color: "#f1c40f" },
    { value: "good", label: "Good move", color: "#81b64c" },
  ];

  const errorTypes = [
    { value: "tactical", label: "Tactical" },
    { value: "strategic", label: "Strategic" },
    { value: "time_pressure", label: "Time pressure" },
  ];

  function updateAnnotation(field, value) {
    const current = get(annotations);
    const updated = { ...current[moveNumber] ?? {}, [field]: value };
    annotations.update(a => ({ ...a, [moveNumber]: updated }));
    scheduleAutoSave();
  }

  function scheduleAutoSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveAnnotation, 800);
  }

  async function saveAnnotation() {
    if (!$currentGame) return;
    const ann = get(annotations)[moveNumber] ?? {};
    if (!ann.user_thought && !ann.error_classification) return;
    saving = true;
    try {
      await fetch(`/api/games/${$currentGame.id}/review/annotate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          move_number: moveNumber,
          fen_before: fen,
          user_thought: ann.user_thought ?? "",
          error_classification: ann.error_classification ?? "",
          error_type: ann.error_type ?? "",
        }),
      });
    } finally {
      saving = false;
    }
  }

  let hintLoading = false;

  async function getHint() {
    if (!$currentGame || hintLoading) return;
    const ann = get(annotations)[moveNumber] ?? {};
    hintLoading = true;
    const move = $history[$currentIndex];

    try {
      const res = await fetch(`/api/games/${$currentGame.id}/review/hint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fen: move?.fen ?? "",
          move_number: moveNumber,
          player_move: move?.uci ?? "",
          user_thought: ann.user_thought ?? "",
        }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let hintText = "";

      // Seed hint slot for this move
      hintMessages.update(h => ({ ...h, [moveNumber]: [...(h[moveNumber] ?? []), { role: "hint", text: "" }] }));
      const msgIndex = (get(hintMessages)[moveNumber] ?? []).length - 1;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop();
        for (const chunk of chunks) {
          const match = chunk.match(/^data: (.+)$/m);
          if (!match) continue;
          if (match[1].trim() === "[DONE]") break;
          try {
            const ev = JSON.parse(match[1]);
            if (ev.text) {
              hintText += ev.text;
              hintMessages.update(h => {
                const arr = [...(h[moveNumber] ?? [])];
                arr[msgIndex] = { role: "hint", text: hintText };
                return { ...h, [moveNumber]: arr };
              });
            }
          } catch {}
        }
      }
    } finally {
      hintLoading = false;
    }
  }

  $: hints = $hintMessages[moveNumber] ?? [];
</script>

<div class="annotation-panel">
  {#if san}
    <div class="move-header">
      <span class="move-badge">{moveNumber}. {san}</span>
      {#if saving}<span class="saving">saving…</span>{/if}
    </div>

    <div class="section">
      <label class="section-label" for="thought-input">What were you thinking?</label>
      <textarea
        id="thought-input"
        class="thought-input"
        placeholder="Describe your reasoning for this move…"
        value={annotation.user_thought}
        on:input={e => updateAnnotation("user_thought", e.target.value)}
        rows="4"
      ></textarea>
    </div>

    <div class="section">
      <div class="section-label">Classify this move</div>
      <div class="btn-group">
        {#each errorClasses as ec}
          <button
            class="class-btn"
            class:active={annotation.error_classification === ec.value}
            style="--btn-color: {ec.color}"
            on:click={() => updateAnnotation("error_classification",
              annotation.error_classification === ec.value ? "" : ec.value)}
          >{ec.label}</button>
        {/each}
      </div>
    </div>

    {#if annotation.error_classification && annotation.error_classification !== "good"}
      <div class="section">
        <div class="section-label">Error type</div>
        <div class="btn-group">
          {#each errorTypes as et}
            <button
              class="type-btn"
              class:active={annotation.error_type === et.value}
              on:click={() => updateAnnotation("error_type",
                annotation.error_type === et.value ? "" : et.value)}
            >{et.label}</button>
          {/each}
        </div>
      </div>
    {/if}

    <div class="section">
      <button class="hint-btn" on:click={getHint} disabled={hintLoading}>
        {#if hintLoading}
          <span class="hint-spinner">⟳</span> Thinking…
        {:else}
          💡 Get a hint
        {/if}
      </button>

      {#if hints.length > 0}
        <div class="hints">
          {#each hints as h}
            <div class="hint-bubble">{h.text}</div>
          {/each}
        </div>
      {/if}
    </div>
  {:else}
    <div class="empty">
      <p>Navigate to a move to annotate your thinking.</p>
    </div>
  {/if}
</div>

<style>
  .annotation-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
    overflow-y: auto;
    height: 100%;
  }
  .move-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .move-badge {
    font-family: var(--font-mono);
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    background: var(--surface2);
    padding: 3px 8px;
    border-radius: var(--radius-sm);
  }
  .saving { font-size: 12px; color: var(--text-dim); font-style: italic; }
  .section { display: flex; flex-direction: column; gap: 6px; }
  .section-label {
    font-size: 12px;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--text-dim);
  }
  .thought-input {
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-family: var(--font-ui);
    font-size: 13px;
    padding: 8px 10px;
    resize: vertical;
    min-height: 72px;
    outline: none;
    transition: border-color 0.15s;
    line-height: 1.5;
  }
  .thought-input:focus { border-color: var(--accent); }
  .btn-group { display: flex; flex-wrap: wrap; gap: 6px; }
  .class-btn, .type-btn {
    padding: 5px 12px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-family: var(--font-ui);
    cursor: pointer;
    border: 1px solid var(--border);
    background: var(--surface2);
    color: var(--text-muted);
    transition: background 0.12s, color 0.12s, border-color 0.12s;
  }
  .class-btn:hover { border-color: var(--btn-color, var(--accent)); color: var(--btn-color, var(--accent)); }
  .class-btn.active {
    background: color-mix(in srgb, var(--btn-color, var(--accent)) 15%, transparent);
    border-color: var(--btn-color, var(--accent));
    color: var(--btn-color, var(--accent));
    font-weight: 600;
  }
  .type-btn:hover { border-color: var(--accent); color: var(--accent); }
  .type-btn.active {
    background: var(--accent-muted);
    border-color: var(--accent);
    color: var(--accent);
    font-weight: 600;
  }
  .hint-btn {
    width: 100%;
    padding: 8px 12px;
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    font-size: 13px;
    font-family: var(--font-ui);
    cursor: pointer;
    transition: background 0.15s, color 0.15s, border-color 0.15s;
  }
  .hint-btn:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); background: var(--accent-muted); }
  .hint-btn:disabled { opacity: 0.5; cursor: default; }
  .hint-spinner { display: inline-block; animation: spin 1s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .hints { display: flex; flex-direction: column; gap: 8px; }
  .hint-bubble {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-left: 3px solid var(--accent);
    border-radius: var(--radius-sm);
    padding: 8px 10px;
    font-size: 13px;
    color: var(--text-muted);
    line-height: 1.5;
    white-space: pre-wrap;
  }
  .empty {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: var(--text-dim);
    font-size: 13px;
    text-align: center;
  }
</style>
