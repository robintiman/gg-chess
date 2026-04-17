<script>
  import GameList from "./GameList.svelte";
</script>

<div class="home">
  <aside class="games-col">
    <GameList />
  </aside>
  <div class="home-main">
    <div class="welcome">
      <div class="welcome-icon">♟</div>
      <h2>Pick a game to review</h2>
      <p>
        Games are ranked by learning value — the ones with the most critical moments appear first.
        Select a game to begin your self-analysis before comparing with the engine.
      </p>
      <div class="steps">
        <div class="step">
          <span class="step-num">1</span>
          <div>
            <strong>Self-analysis</strong>
            <p>Navigate through your game. Annotate your thinking at key moments and classify any errors you spot — without seeing the engine.</p>
          </div>
        </div>
        <div class="step">
          <span class="step-num">2</span>
          <div>
            <strong>Hints on demand</strong>
            <p>Stuck? Ask for a hint. The coach will ask guiding questions to help you think more deeply — without revealing the answer.</p>
          </div>
        </div>
        <div class="step">
          <span class="step-num">3</span>
          <div>
            <strong>Engine comparison</strong>
            <p>After your review, Stockfish and the AI compare your assessment against objective analysis, with personalised coaching feedback.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .home {
    display: grid;
    grid-template-columns: 240px 1fr;
    flex: 1;
    min-height: 0;
    overflow: hidden;
    height: calc(100vh - 52px);
  }
  .games-col {
    border-right: 1px solid var(--border);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .home-main {
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: auto;
    padding: 40px;
  }
  .welcome {
    max-width: 520px;
    text-align: center;
  }
  .welcome-icon { font-size: 48px; margin-bottom: 16px; line-height: 1; }
  .welcome h2 {
    font-size: 22px;
    font-weight: 600;
    color: var(--text);
    margin: 0 0 12px;
  }
  .welcome > p {
    font-size: 14px;
    color: var(--text-muted);
    line-height: 1.6;
    margin: 0 0 32px;
  }
  .steps {
    display: flex;
    flex-direction: column;
    gap: 20px;
    text-align: left;
  }
  .step {
    display: flex;
    gap: 16px;
    align-items: flex-start;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 16px;
  }
  .step-num {
    flex-shrink: 0;
    width: 28px;
    height: 28px;
    background: var(--accent-muted);
    color: var(--accent);
    border: 1px solid var(--accent);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    font-family: var(--font-mono);
  }
  .step strong {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: var(--text);
    margin-bottom: 4px;
  }
  .step p {
    font-size: 13px;
    color: var(--text-muted);
    margin: 0;
    line-height: 1.5;
  }
</style>
