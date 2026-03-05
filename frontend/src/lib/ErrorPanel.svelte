<script>
  import { currentError, currentAnalysis, currentFen } from "../stores.js";

  let analysing = false;

  async function analysePosition() {
    analysing = true;
    try {
      const res = await fetch("/api/analyse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fen: $currentFen, depth: 14 }),
      });
      if (res.ok) {
        const data = await res.json();
        currentAnalysis.set(data);
      }
    } finally {
      analysing = false;
    }
  }

  $: themes = $currentError?.themes?.trim().split(/\s+/).filter(Boolean) ?? [];
  $: evalDrop = $currentError?.eval_drop_cp ?? null;
  $: bestMove = $currentAnalysis?.best_move ?? $currentError?.best_move ?? null;
  $: pv = $currentAnalysis?.pv ?? [];
</script>

<div class="panel">
  <div class="section">
    <div class="label">Evaluation</div>
    <div class="value">
      {#if $currentAnalysis?.eval_cp !== undefined}
        {($currentAnalysis.eval_cp / 100).toFixed(2)}
      {:else}
        —
      {/if}
    </div>
  </div>

  {#if bestMove}
    <div class="section">
      <div class="label">Best move</div>
      <div class="value mono">{bestMove}</div>
    </div>
  {/if}

  {#if pv.length > 0}
    <div class="section">
      <div class="label">PV</div>
      <div class="value mono small">{pv.join(" ")}</div>
    </div>
  {/if}

  <button class="analyse-btn" on:click={analysePosition} disabled={analysing}>
    {analysing ? "Analysing…" : "Analyse Position"}
  </button>

  {#if $currentError}
    <div class="error-section">
      <div class="error-header">Error detected</div>
      <div class="eval-drop">−{(evalDrop / 100).toFixed(2)} pawns</div>
      <div class="themes">
        {#each themes as theme}
          <span class="badge">{theme}</span>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .section {
    background: #16213e;
    border-radius: 4px;
    padding: 8px 10px;
  }
  .label {
    font-size: 10px;
    text-transform: uppercase;
    color: #666;
    margin-bottom: 2px;
    letter-spacing: 0.5px;
  }
  .value {
    font-size: 16px;
    font-weight: bold;
    color: #a9cce3;
  }
  .mono { font-family: monospace; }
  .small { font-size: 12px; }
  .analyse-btn {
    padding: 8px;
    background: #0f3460;
    border: none;
    border-radius: 4px;
    color: #e0e0e0;
    cursor: pointer;
    font-size: 13px;
    width: 100%;
  }
  .analyse-btn:hover { background: #1a5276; }
  .analyse-btn:disabled { opacity: 0.5; cursor: default; }
  .error-section {
    background: #2c1b1b;
    border: 1px solid #c0392b;
    border-radius: 4px;
    padding: 10px;
  }
  .error-header {
    font-size: 11px;
    text-transform: uppercase;
    color: #e74c3c;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
  }
  .eval-drop {
    font-size: 20px;
    font-weight: bold;
    color: #e74c3c;
    margin-bottom: 6px;
  }
  .themes { display: flex; flex-wrap: wrap; gap: 4px; }
  .badge {
    background: #4a1942;
    color: #d7bde2;
    border-radius: 3px;
    padding: 2px 6px;
    font-size: 11px;
  }
</style>
