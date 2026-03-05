<script>
  import { chatMessages, currentFen, currentError } from "../stores.js";

  let question = "";
  let streaming = false;
  let messagesEl;

  $: if ($currentError && !question) {
    const move = $currentError.player_move;
    question = `Why is ${move} a blunder here?`;
  }

  async function sendQuestion() {
    if (!question.trim() || streaming) return;

    const userMsg = question.trim();
    question = "";
    chatMessages.update((msgs) => [...msgs, { role: "user", text: userMsg }]);
    chatMessages.update((msgs) => [...msgs, { role: "assistant", text: "" }]);

    streaming = true;

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fen: $currentFen,
          player_move: $currentError?.player_move ?? "",
          best_move: $currentError?.best_move ?? "",
          eval_drop_cp: $currentError?.eval_drop_cp ?? 0,
          themes: $currentError?.themes ?? "",
          question: userMsg,
        }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete line

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;
          try {
            const { text } = JSON.parse(payload);
            chatMessages.update((msgs) => {
              const copy = [...msgs];
              copy[copy.length - 1] = {
                ...copy[copy.length - 1],
                text: copy[copy.length - 1].text + text,
              };
              return copy;
            });
          } catch {}
        }
      }
    } catch (e) {
      chatMessages.update((msgs) => {
        const copy = [...msgs];
        copy[copy.length - 1] = { role: "assistant", text: "Error: " + e.message };
        return copy;
      });
    } finally {
      streaming = false;
    }
  }

  $: if ($chatMessages.length && messagesEl) {
    setTimeout(() => messagesEl?.scrollTo({ top: messagesEl.scrollHeight, behavior: "smooth" }), 50);
  }
</script>

<div class="chat">
  <div class="chat-label">Chat with Claude</div>
  <div class="messages" bind:this={messagesEl}>
    {#each $chatMessages as msg}
      <div class="msg {msg.role}">
        <span class="role">{msg.role === "user" ? "You" : "Claude"}</span>
        <p>{msg.text}</p>
      </div>
    {/each}
    {#if streaming}
      <div class="typing">Claude is thinking…</div>
    {/if}
  </div>
  <div class="input-row">
    <textarea
      bind:value={question}
      rows="2"
      placeholder="Ask about this position…"
      on:keydown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendQuestion())}
    ></textarea>
    <button on:click={sendQuestion} disabled={streaming || !question.trim()}>
      Ask
    </button>
  </div>
</div>

<style>
  .chat {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
    min-height: 0;
  }
  .chat-label {
    font-size: 11px;
    text-transform: uppercase;
    color: #666;
    letter-spacing: 0.5px;
  }
  .messages {
    flex: 1;
    overflow-y: auto;
    background: #16213e;
    border-radius: 4px;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-height: 80px;
  }
  .msg { font-size: 13px; }
  .role {
    font-size: 10px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    display: block;
    margin-bottom: 2px;
  }
  .msg.user .role { color: #a9cce3; }
  .msg.assistant .role { color: #a9dfbf; }
  .msg p { margin: 0; line-height: 1.5; white-space: pre-wrap; }
  .typing { font-size: 12px; color: #888; font-style: italic; }
  .input-row {
    display: flex;
    gap: 6px;
    align-items: flex-end;
  }
  textarea {
    flex: 1;
    padding: 6px 8px;
    background: #16213e;
    border: 1px solid #0f3460;
    border-radius: 4px;
    color: #e0e0e0;
    font-size: 13px;
    resize: none;
    font-family: inherit;
  }
  button {
    padding: 6px 14px;
    background: #0f3460;
    border: none;
    border-radius: 4px;
    color: #e0e0e0;
    cursor: pointer;
    font-size: 13px;
    align-self: stretch;
  }
  button:hover { background: #1a5276; }
  button:disabled { opacity: 0.5; cursor: default; }
</style>
