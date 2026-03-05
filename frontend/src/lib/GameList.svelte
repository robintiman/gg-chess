<script>
  import { games, currentGame, history, currentIndex, currentAnalysis, chatMessages } from "../stores.js";
  import { Chess } from "chess.js";

  let username = "";
  let loading = false;
  let error = "";

  async function fetchGames() {
    if (!username.trim()) return;
    loading = true;
    error = "";
    try {
      const res = await fetch(`/api/games?username=${encodeURIComponent(username)}`);
      if (!res.ok) throw new Error("Failed to fetch games");
      games.set(await res.json());
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  async function selectGame(game) {
    const res = await fetch(`/api/game/${game.id}`);
    if (!res.ok) return;
    const data = await res.json();

    // Parse PGN into move history
    const chess = new Chess();
    chess.loadPgn(data.pgn);
    const moves = chess.history({ verbose: true });

    const chess2 = new Chess();
    const hist = [{ fen: chess2.fen(), san: null, uci: null, move_number: 0 }];
    for (const m of moves) {
      chess2.move(m);
      hist.push({ fen: chess2.fen(), san: m.san, uci: m.from + m.to + (m.promotion || ""), move_number: m.color === "w" ? Math.ceil(hist.length / 2) : Math.floor(hist.length / 2) });
    }

    currentGame.set({ ...game, ...data });
    history.set(hist);
    currentIndex.set(0);
    currentAnalysis.set(null);
    chatMessages.set([]);
  }

  function formatDate(d) {
    if (!d) return "";
    return new Date(d).toLocaleDateString();
  }
</script>

<div class="game-list">
  <div class="search">
    <input
      bind:value={username}
      placeholder="Chess.com / Lichess username"
      on:keydown={(e) => e.key === "Enter" && fetchGames()}
    />
    <button on:click={fetchGames} disabled={loading}>
      {loading ? "..." : "Load"}
    </button>
  </div>

  {#if error}
    <p class="error">{error}</p>
  {/if}

  <ul>
    {#each $games as game (game.id)}
      <li
        class:active={$currentGame?.id === game.id}
        on:click={() => selectGame(game)}
      >
        <span class="result">{game.result}</span>
        <span class="date">{formatDate(game.played_at)}</span>
        {#if game.error_count > 0}
          <span class="errors">{game.error_count}!</span>
        {/if}
      </li>
    {/each}
  </ul>
</div>

<style>
  .game-list {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }
  .search {
    display: flex;
    gap: 4px;
    padding: 8px;
  }
  input {
    flex: 1;
    padding: 6px 8px;
    background: #16213e;
    border: 1px solid #0f3460;
    border-radius: 4px;
    color: #e0e0e0;
    font-size: 13px;
  }
  button {
    padding: 6px 12px;
    background: #0f3460;
    border: none;
    border-radius: 4px;
    color: #e0e0e0;
    cursor: pointer;
    font-size: 13px;
  }
  button:hover { background: #1a5276; }
  button:disabled { opacity: 0.5; cursor: default; }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    flex: 1;
  }
  li {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    cursor: pointer;
    border-bottom: 1px solid #0f3460;
    font-size: 13px;
  }
  li:hover { background: #16213e; }
  li.active { background: #0f3460; }
  .result { font-weight: bold; color: #a9cce3; min-width: 28px; }
  .date { flex: 1; color: #888; font-size: 11px; }
  .errors {
    background: #c0392b;
    color: white;
    border-radius: 10px;
    padding: 1px 6px;
    font-size: 11px;
    font-weight: bold;
  }
  .error { color: #e74c3c; padding: 8px; font-size: 12px; }
</style>
