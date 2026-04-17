<script>
  import { onMount, onDestroy } from "svelte";
  import HomeView from "./lib/HomeView.svelte";
  import ReviewView from "./lib/ReviewView.svelte";
  import ComparisonView from "./lib/ComparisonView.svelte";
  import { appView, username, currentIndex, history, currentAnalysis } from "./stores.js";

  let usernameInput = "";

  function submitUsername() {
    const trimmed = usernameInput.trim();
    if (!trimmed) return;
    username.set(trimmed);
  }

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
</script>

<div class="app">
  <header>
    <a class="logo" href="/" on:click|preventDefault={() => appView.set("home")}>gg-chess</a>
    <nav>
      {#if $appView !== "home"}
        <button class="nav-back" on:click={() => appView.set("home")}>← Games</button>
      {/if}
      {#if $username}
        <span class="nav-user">{$username}</span>
        <button class="nav-link" on:click={() => username.set("")}>Switch</button>
      {/if}
    </nav>
  </header>

  {#if !$username}
    <div class="username-gate">
      <div class="gate-card">
        <div class="gate-icon">♟</div>
        <h1>gg-chess</h1>
        <p>Enter your Chess.com username to start reviewing your games.</p>
        <form on:submit|preventDefault={submitUsername}>
          <input
            bind:value={usernameInput}
            placeholder="Chess.com username"
            autocomplete="off"
            autocorrect="off"
            autocapitalize="off"
            spellcheck="false"
          />
          <button type="submit" disabled={!usernameInput.trim()}>Start reviewing →</button>
        </form>
      </div>
    </div>
  {:else if $appView === "home"}
    <HomeView />
  {:else if $appView === "review"}
    <ReviewView />
  {:else if $appView === "comparison"}
    <ComparisonView />
  {/if}
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
  }
  header {
    height: 52px;
    background: var(--surface);
    border-bottom: 1px solid var(--border);
    padding: 0 20px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .logo {
    font-family: var(--font-mono);
    font-size: 16px;
    font-weight: 500;
    color: var(--accent);
    text-decoration: none;
    letter-spacing: -0.3px;
  }
  nav {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .nav-back {
    background: none;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    cursor: pointer;
    font-size: 13px;
    padding: 4px 10px;
    font-family: var(--font-ui);
    transition: color 0.15s, background 0.15s;
  }
  .nav-back:hover { color: var(--text); background: var(--surface2); }
  .nav-link {
    background: none;
    border: none;
    color: var(--text-dim);
    cursor: pointer;
    font-size: 13px;
    padding: 4px 8px;
    font-family: var(--font-ui);
    transition: color 0.15s;
  }
  .nav-link:hover { color: var(--text); }
  .nav-user {
    font-size: 13px;
    color: var(--text-muted);
    font-family: var(--font-mono);
  }
  .username-gate {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg);
  }
  .gate-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 40px 48px;
    text-align: center;
    max-width: 400px;
    width: 100%;
  }
  .gate-icon {
    font-size: 48px;
    line-height: 1;
    margin-bottom: 16px;
  }
  .gate-card h1 {
    font-family: var(--font-mono);
    font-size: 22px;
    font-weight: 500;
    color: var(--accent);
    margin: 0 0 8px;
    letter-spacing: -0.3px;
  }
  .gate-card p {
    font-size: 14px;
    color: var(--text-muted);
    margin: 0 0 24px;
    line-height: 1.5;
  }
  .gate-card form {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .gate-card input {
    width: 100%;
    padding: 10px 12px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    color: var(--text);
    font-size: 15px;
    font-family: var(--font-mono);
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.15s;
  }
  .gate-card input:focus { border-color: var(--accent); }
  .gate-card button[type="submit"] {
    padding: 10px;
    background: var(--accent-muted);
    color: var(--accent);
    border: 1px solid var(--accent);
    border-radius: var(--radius-sm);
    font-size: 14px;
    font-weight: 600;
    font-family: var(--font-ui);
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .gate-card button[type="submit"]:hover:not(:disabled) {
    background: var(--accent);
    color: #000;
  }
  .gate-card button[type="submit"]:disabled { opacity: 0.4; cursor: default; }
</style>
