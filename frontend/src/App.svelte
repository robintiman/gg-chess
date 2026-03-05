<script>
  import { onMount, onDestroy } from "svelte";
  import GameList from "./lib/GameList.svelte";
  import Board from "./lib/Board.svelte";
  import MoveList from "./lib/MoveList.svelte";
  import EvalBar from "./lib/EvalBar.svelte";
  import ErrorPanel from "./lib/ErrorPanel.svelte";
  import Chat from "./lib/Chat.svelte";
  import { history, currentIndex, currentGame, currentAnalysis } from "./stores.js";

  function navigate(delta) {
    currentIndex.update((i) => {
      const next = i + delta;
      const len = $history.length;
      if (next < 0 || next >= len) return i;
      currentAnalysis.set(null);
      return next;
    });
  }

  function onKey(e) {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    if (e.key === "ArrowLeft") navigate(-1);
    if (e.key === "ArrowRight") navigate(1);
  }

  onMount(() => window.addEventListener("keydown", onKey));
  onDestroy(() => window.removeEventListener("keydown", onKey));

  $: canPrev = $currentIndex > 0;
  $: canNext = $currentIndex < $history.length - 1;
</script>

<div class="app">
  <header>
    <h1>Patzer Review</h1>
  </header>
  <main>
    <!-- Left column: game list -->
    <aside class="games-col">
      <GameList />
    </aside>

    <!-- Center column: board + controls + move list -->
    <section class="board-col">
      <div class="board-row">
        <EvalBar />
        <div class="board-center">
          <Board />
        </div>
      </div>
      <div class="controls">
        <button on:click={() => { currentIndex.set(0); currentAnalysis.set(null); }} disabled={!canPrev}>|&lt;</button>
        <button on:click={() => navigate(-1)} disabled={!canPrev}>&lt;</button>
        <span class="move-counter">
          {$currentIndex}/{$history.length > 0 ? $history.length - 1 : 0}
        </span>
        <button on:click={() => navigate(1)} disabled={!canNext}>&gt;</button>
        <button on:click={() => { currentIndex.set($history.length - 1); currentAnalysis.set(null); }} disabled={!canNext}>&gt;|</button>
      </div>
      {#if $currentGame}
        <MoveList />
      {/if}
    </section>

    <!-- Right column: analysis + chat -->
    <aside class="analysis-col">
      <ErrorPanel />
      <Chat />
    </aside>
  </main>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }
  header {
    background: #16213e;
    border-bottom: 1px solid #0f3460;
    padding: 8px 16px;
    flex-shrink: 0;
  }
  h1 {
    margin: 0;
    font-size: 18px;
    color: #a9cce3;
    font-weight: 600;
    letter-spacing: 0.5px;
  }
  main {
    display: grid;
    grid-template-columns: 200px 1fr 260px;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }
  .games-col {
    border-right: 1px solid #0f3460;
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
  .board-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .board-center { flex-shrink: 0; }
  .controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .controls button {
    padding: 6px 12px;
    background: #16213e;
    border: 1px solid #0f3460;
    border-radius: 4px;
    color: #e0e0e0;
    cursor: pointer;
    font-size: 14px;
  }
  .controls button:hover:not(:disabled) { background: #0f3460; }
  .controls button:disabled { opacity: 0.3; cursor: default; }
  .move-counter { font-size: 13px; color: #888; min-width: 60px; text-align: center; }
  .analysis-col {
    border-left: 1px solid #0f3460;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow: hidden;
  }
</style>
