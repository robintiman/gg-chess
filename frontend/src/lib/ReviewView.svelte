<script>
  import { onMount } from "svelte";
  import Board from "./Board.svelte";
  import MoveList from "./MoveList.svelte";
  import AnnotationPanel from "./AnnotationPanel.svelte";
  import { currentGame, history, currentIndex, currentAnalysis, annotations, appView, comparisonResults } from "../stores.js";
  import { get } from "svelte/store";

  let flipped = false;
  let finishing = false;
  let finishStatus = "";

  $: canPrev = $currentIndex > 0;
  $: canNext = $currentIndex < $history.length - 1;

  function navigate(delta) {
    currentIndex.update(i => {
      const next = i + delta;
      const len = $history.length;
      if (next < 0 || next >= len) return i;
      currentAnalysis.set(null);
      return next;
    });
  }

  onMount(async () => {
    if (!$currentGame) return;
    try {
      const res = await fetch(`/api/games/${$currentGame.id}/review`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.annotations) {
        const loaded = {};
        for (const [k, v] of Object.entries(data.annotations)) {
          loaded[parseInt(k)] = v;
        }
        annotations.set(loaded);
      }
    } catch {}
  });

  async function finishReview() {
    if (!$currentGame || finishing) return;
    finishing = true;
    finishStatus = "Running comparison…";
    comparisonResults.set([]);

    const ann = get(annotations);
    const annotationsList = Object.entries(ann).map(([move_number, a]) => ({
      move_number: parseInt(move_number),
      ...a,
    }));

    try {
      const res = await fetch(`/api/games/${$currentGame.id}/review/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ annotations: annotationsList }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop();
        for (const chunk of chunks) {
          const match = chunk.match(/^data: (.+)$/m);
          if (!match) continue;
          try {
            const ev = JSON.parse(match[1]);
            if (ev.type === "done") {
              appView.set("comparison");
              return;
            }
            comparisonResults.update(r => [...r, ev]);
          } catch {}
        }
      }
    } catch (e) {
      finishStatus = `Error: ${e.message}`;
      finishing = false;
    }
  }
</script>

<div class="review-layout">
  <aside class="annotation-col">
    <div class="col-header">
      <span class="col-title">Self-analysis</span>
      <span class="col-hint">No engine — think it through</span>
    </div>
    <div class="annotation-body">
      <AnnotationPanel />
    </div>
  </aside>

  <section class="board-col">
    <div class="board-wrap">
      <Board {flipped} showEngineArrows={false} />
    </div>

    <div class="controls">
      <button on:click={() => { currentIndex.set(0); currentAnalysis.set(null); }} disabled={!canPrev} title="First move">⏮</button>
      <button on:click={() => navigate(-1)} disabled={!canPrev} title="Previous move">⏪</button>
      <span class="move-counter">{$currentIndex}/{$history.length > 0 ? $history.length - 1 : 0}</span>
      <button on:click={() => navigate(1)} disabled={!canNext} title="Next move">⏩</button>
      <button on:click={() => { currentIndex.set($history.length - 1); currentAnalysis.set(null); }} disabled={!canNext} title="Last move">⏭</button>
      <button on:click={() => (flipped = !flipped)} class="flip-btn" title="Flip board">⇅</button>
    </div>

    <div class="move-list-wrap">
      <MoveList hideErrors={true} />
    </div>

    <div class="finish-section">
      {#if finishing}
        <div class="finishing-status">
          <span class="spinner">⟳</span>
          <span>{finishStatus}</span>
        </div>
      {:else}
        <button class="finish-btn" on:click={finishReview}>
          <span>Reveal engine analysis →</span>
        </button>
        <p class="finish-hint">Compare your notes against Stockfish + AI coaching</p>
      {/if}
    </div>
  </section>
</div>

<style>
  .review-layout {
    display: grid;
    grid-template-columns: 320px 1fr;
    height: calc(100vh - 52px);
    overflow: hidden;
  }
  .annotation-col {
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .col-header {
    padding: 12px 16px 10px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .col-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .col-hint {
    font-size: 12px;
    color: var(--text-dim);
    font-style: italic;
  }
  .annotation-body {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .board-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px;
    gap: 10px;
    overflow: auto;
  }
  .board-wrap { flex-shrink: 0; }
  .controls {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .controls button {
    width: 36px;
    height: 30px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    cursor: pointer;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, color 0.15s;
  }
  .controls button:hover:not(:disabled) { background: var(--surface2); color: var(--text); }
  .controls button:disabled { opacity: 0.3; cursor: default; }
  .flip-btn { margin-left: 4px; }
  .move-counter { font-size: 13px; color: var(--text-dim); min-width: 52px; text-align: center; }
  .move-list-wrap { width: 640px; }
  .finish-section {
    width: 100%;
    max-width: 480px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }
  .finish-btn {
    width: 100%;
    height: 44px;
    background: var(--accent-muted);
    color: var(--accent);
    border: 1px solid var(--accent);
    border-radius: var(--radius-sm);
    font-size: 15px;
    font-weight: 600;
    font-family: var(--font-ui);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    letter-spacing: 0.3px;
    transition: background 0.15s, color 0.15s, box-shadow 0.15s;
  }
  .finish-btn:hover {
    background: var(--accent);
    color: #000;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--accent) 30%, transparent);
  }
  .finish-hint { font-size: 12px; color: var(--text-dim); margin: 0; }
  .finishing-status {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--text-muted);
    font-size: 14px;
    font-style: italic;
  }
  .spinner { display: inline-block; animation: spin 1s linear infinite; font-size: 16px; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
