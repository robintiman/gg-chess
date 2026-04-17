<script>
  import ErrorPanel from "./ErrorPanel.svelte";
  import Chat from "./Chat.svelte";
  import { comparisonResults, annotations, currentGame } from "../stores.js";

  let activeTab = "feedback";

  // Collect per-move feedback and summary from streaming results
  $: feedbackByMove = (() => {
    const map = {};
    let summaryText = "";
    for (const ev of $comparisonResults) {
      if (ev.type === "feedback") {
        map[ev.move_number] = {
          engine_classification: ev.engine_classification ?? "",
          user_classification: ev.user_classification ?? "",
          concept: ev.concept ?? "",
          text: "",
        };
      } else if (ev.type === "feedback_text") {
        if (map[ev.move_number]) map[ev.move_number].text += ev.text;
      } else if (ev.type === "summary_text") {
        summaryText += ev.text;
      }
    }
    return { byMove: map, summary: summaryText };
  })();

  $: moveEntries = Object.entries(feedbackByMove.byMove).sort(([a], [b]) => parseInt(a) - parseInt(b));
  $: summary = feedbackByMove.summary;

  $: errorCount = $currentGame?.errors?.length ?? 0;

  function alignmentIcon(userClass, engineClass) {
    if (!userClass || !engineClass) return "—";
    if (userClass === engineClass) return "✓";
    if (userClass === "good" && engineClass !== "") return "✗";
    if (userClass !== "" && engineClass === "good") return "✗";
    return "~";
  }

  function classColor(cls) {
    if (cls === "blunder") return "#e74c3c";
    if (cls === "mistake") return "#e67e22";
    if (cls === "inaccuracy") return "#f1c40f";
    if (cls === "good") return "#81b64c";
    return "var(--text-dim)";
  }
</script>

<div class="comparison-panel">
  <div class="tab-bar">
    <button class="tab-btn" class:active={activeTab === "feedback"} on:click={() => (activeTab = "feedback")}>
      Feedback
      {#if moveEntries.length > 0}
        <span class="badge">{moveEntries.length}</span>
      {/if}
    </button>
    <button class="tab-btn" class:active={activeTab === "errors"} on:click={() => (activeTab = "errors")}>
      Errors
      {#if errorCount > 0}
        <span class="badge">{errorCount}</span>
      {/if}
    </button>
    <button class="tab-btn" class:active={activeTab === "chat"} on:click={() => (activeTab = "chat")}>Chat</button>
  </div>

  <div class="tab-content" class:hidden={activeTab !== "feedback"}>
    {#if moveEntries.length === 0}
      <div class="empty">No feedback yet — analysis is loading.</div>
    {:else}
      <div class="feedback-list">
        {#if summary}
          <div class="summary-card">
            <div class="summary-label">Overall takeaway</div>
            <p>{summary}</p>
          </div>
        {/if}
        {#each moveEntries as [moveNum, fb]}
          <div class="feedback-card">
            <div class="feedback-header">
              <span class="move-label">Move {moveNum}</span>
              {#if fb.concept}
                <span class="concept-tag">{fb.concept}</span>
              {/if}
              <span class="alignment-icon" title="Your assessment vs engine">
                {alignmentIcon(fb.user_classification, fb.engine_classification)}
              </span>
            </div>
            <div class="classification-row">
              <span class="class-chip" style="color: {classColor(fb.engine_classification)}">
                Engine: {fb.engine_classification || "none"}
              </span>
              <span class="class-chip" style="color: {classColor(fb.user_classification)}">
                You: {fb.user_classification || "not classified"}
              </span>
            </div>
            {#if $annotations[parseInt(moveNum)]?.user_thought}
              <div class="user-thought">"{$annotations[parseInt(moveNum)].user_thought}"</div>
            {/if}
            {#if fb.text}
              <p class="feedback-text">{fb.text}</p>
            {:else}
              <p class="feedback-loading">Generating feedback…</p>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <div class="tab-content" class:hidden={activeTab !== "errors"}>
    <ErrorPanel />
  </div>

  <div class="tab-content chat-tab" class:hidden={activeTab !== "chat"}>
    <Chat />
  </div>
</div>

<style>
  .comparison-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }
  .tab-bar {
    display: flex;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }
  .tab-btn {
    flex: 1;
    padding: 12px 8px;
    background: none;
    border: none;
    border-bottom: 2px solid transparent;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 13px;
    font-family: var(--font-ui);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    transition: color 0.15s;
    margin-bottom: -1px;
  }
  .tab-btn:hover { color: var(--text); }
  .tab-btn.active { color: var(--text); border-bottom-color: var(--accent); }
  .badge {
    background: var(--accent);
    color: #000;
    border-radius: 10px;
    padding: 1px 5px;
    font-size: 11px;
    font-weight: 600;
  }
  .tab-content {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  .chat-tab { padding: 0; }
  .hidden { display: none !important; }
  .empty {
    padding: 24px;
    text-align: center;
    color: var(--text-dim);
    font-size: 13px;
    font-style: italic;
  }
  .feedback-list {
    flex: 1;
    overflow-y: auto;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .summary-card {
    background: color-mix(in srgb, var(--accent) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
    border-radius: var(--radius);
    padding: 12px 14px;
  }
  .summary-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: var(--accent);
    margin-bottom: 6px;
  }
  .summary-card p {
    margin: 0;
    font-size: 13px;
    color: var(--text);
    line-height: 1.6;
    white-space: pre-wrap;
  }
  .feedback-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .feedback-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .move-label {
    font-family: var(--font-mono);
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
  }
  .concept-tag {
    background: var(--surface2);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 1px 8px;
    font-size: 11px;
    color: var(--text-muted);
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .alignment-icon {
    font-size: 14px;
    font-weight: 700;
    flex-shrink: 0;
    color: var(--text-muted);
  }
  .classification-row { display: flex; gap: 10px; flex-wrap: wrap; }
  .class-chip {
    font-size: 12px;
    font-weight: 500;
  }
  .user-thought {
    font-size: 12px;
    color: var(--text-dim);
    font-style: italic;
    background: var(--surface2);
    border-radius: var(--radius-sm);
    padding: 4px 8px;
  }
  .feedback-text {
    margin: 0;
    font-size: 13px;
    color: var(--text-muted);
    line-height: 1.6;
    white-space: pre-wrap;
  }
  .feedback-loading {
    margin: 0;
    font-size: 12px;
    color: var(--text-dim);
    font-style: italic;
  }
</style>
