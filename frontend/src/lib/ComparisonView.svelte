<script>
  import Board from "./Board.svelte";
  import MoveList from "./MoveList.svelte";
  import ComparisonPanel from "./ComparisonPanel.svelte";
  import { currentIndex, history, currentAnalysis, appView } from "../stores.js";

  let flipped = false;

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
</script>

<div class="comparison-layout">
  <section class="board-col">
    <div class="col-header">
      <span class="col-title">Engine analysis</span>
      <button class="back-btn" on:click={() => appView.set("review")}>← Back to self-analysis</button>
    </div>

    <div class="board-wrap">
      <Board {flipped} showEngineArrows={true} />
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
      <MoveList hideErrors={false} />
    </div>
  </section>

  <aside class="panel-col">
    <ComparisonPanel />
  </aside>
</div>

<style>
  .comparison-layout {
    display: grid;
    grid-template-columns: 1fr 380px;
    height: calc(100vh - 52px);
    overflow: hidden;
  }
  .board-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px;
    gap: 10px;
    overflow: auto;
  }
  .col-header {
    width: 100%;
    max-width: 640px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .col-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .back-btn {
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-dim);
    cursor: pointer;
    font-size: 12px;
    padding: 4px 10px;
    font-family: var(--font-ui);
    transition: color 0.15s, background 0.15s;
  }
  .back-btn:hover { color: var(--text); background: var(--surface2); }
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
  .panel-col {
    border-left: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
</style>
