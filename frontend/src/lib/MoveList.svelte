<script>
  import { history, currentIndex, currentGame, currentAnalysis } from "../stores.js";

  function goTo(idx) {
    currentIndex.set(idx);
    currentAnalysis.set(null);
  }

  function isError(entry) {
    if (!$currentGame) return false;
    return !!$currentGame.errors_by_fen?.[$history[entry]?.fen];
  }

  // Group moves into pairs for display
  $: pairs = (() => {
    const result = [];
    const moves = $history.slice(1); // skip initial position
    for (let i = 0; i < moves.length; i += 2) {
      result.push({
        number: Math.floor(i / 2) + 1,
        white: { san: moves[i].san, idx: i + 1, fen: moves[i].fen },
        black: moves[i + 1] ? { san: moves[i + 1].san, idx: i + 2, fen: moves[i + 1].fen } : null,
      });
    }
    return result;
  })();
</script>

<div class="move-list">
  {#each pairs as pair}
    <span class="move-number">{pair.number}.</span>
    <span
      class="move"
      class:current={$currentIndex === pair.white.idx}
      class:blunder={$currentGame?.errors_by_fen?.[pair.white.fen]}
      on:click={() => goTo(pair.white.idx)}
    >
      {pair.white.san}{$currentGame?.errors_by_fen?.[pair.white.fen] ? "?!" : ""}
    </span>
    {#if pair.black}
      <span
        class="move"
        class:current={$currentIndex === pair.black.idx}
        class:blunder={$currentGame?.errors_by_fen?.[pair.black.fen]}
        on:click={() => goTo(pair.black.idx)}
      >
        {pair.black.san}{$currentGame?.errors_by_fen?.[pair.black.fen] ? "?!" : ""}
      </span>
    {/if}
  {/each}
</div>

<style>
  .move-list {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 4px;
    padding: 8px;
    font-family: monospace;
    font-size: 13px;
    overflow-y: auto;
    max-height: 120px;
    background: #16213e;
    border-radius: 4px;
  }
  .move-number {
    color: #666;
    user-select: none;
  }
  .move {
    cursor: pointer;
    padding: 1px 4px;
    border-radius: 3px;
  }
  .move:hover { background: #0f3460; }
  .move.current { background: #1a5276; font-weight: bold; }
  .move.blunder { color: #e67e22; }
</style>
