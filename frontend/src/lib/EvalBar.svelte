<script>
  import { currentAnalysis, currentError } from "../stores.js";

  $: evalCp = $currentAnalysis?.eval_cp ?? null;

  // White's percentage of the bar (from white's perspective)
  $: whitePercent = evalCp === null
    ? 50
    : Math.max(5, Math.min(95, 50 + evalCp / 10));

  $: evalText = evalCp === null
    ? "?"
    : evalCp > 9000
    ? "M"
    : evalCp < -9000
    ? "-M"
    : (evalCp / 100).toFixed(1);
</script>

<div class="eval-bar">
  <div class="bar">
    <div class="white-portion" style="height: {whitePercent}%"></div>
  </div>
  <div class="eval-text">{evalText}</div>
</div>

<style>
  .eval-bar {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    height: 480px;
  }
  .bar {
    width: 20px;
    flex: 1;
    background: #1a1a2e;
    border: 1px solid #0f3460;
    border-radius: 3px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    overflow: hidden;
  }
  .white-portion {
    background: #e0e0e0;
    transition: height 0.4s ease;
    width: 100%;
  }
  .eval-text {
    font-size: 11px;
    color: #888;
    font-family: monospace;
  }
</style>
