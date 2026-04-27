import json
import time
from collections.abc import Callable, Iterator

import anthropic
import openai
from ollama import chat

from gg_chess.config import (
    ANTHROPIC_API_KEY,
    CLAUDE_CHAT_MODEL,
    CLAUDE_CONCEPT_MODEL,
    LOCAL_MODEL_BASE_URL,
    LOCAL_MODEL_NAME,
    USE_LOCAL_MODEL,
)


def _anthropic_to_openai_tools(tools: list[dict]) -> list[dict]:
    return [
        {
            "type": "function",
            "function": {
                "name": t["name"],
                "description": t.get("description", ""),
                "parameters": t["input_schema"],
            },
        }
        for t in tools
    ]


def run_tool_use_loop(
    system_text: str,
    user_prompt: str,
    tools: list[dict],
    tool_executor: Callable[[str, dict], dict],
    terminal_tool: str,
    max_iters: int = 20,
    log_prefix: str = "llm",
) -> dict | None:
    if USE_LOCAL_MODEL:
        return _tool_use_loop_openai(system_text, user_prompt, tools, tool_executor, terminal_tool, max_iters, log_prefix)
    return _tool_use_loop_anthropic(system_text, user_prompt, tools, tool_executor, terminal_tool, max_iters, log_prefix)


def chat_stream(prompt: str, system: str | None = None) -> Iterator[str]:
    if USE_LOCAL_MODEL:
        yield from _chat_stream_local(prompt, system=system)
    else:
        yield from _chat_stream_anthropic(prompt, system=system)


# ── Anthropic backend ──────────────────────────────────────────────────────────

def _tool_use_loop_anthropic(
    system_text: str,
    user_prompt: str,
    tools: list[dict],
    tool_executor: Callable[[str, dict], dict],
    terminal_tool: str,
    max_iters: int,
    log_prefix: str,
) -> dict | None:
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    system_content = [{"type": "text", "text": system_text, "cache_control": {"type": "ephemeral"}}]
    messages = [{"role": "user", "content": user_prompt}]

    for iteration in range(max_iters):
        while True:
            try:
                response = client.messages.create(
                    model=CLAUDE_CONCEPT_MODEL,
                    max_tokens=4096,
                    temperature=0,
                    system=system_content,
                    tools=tools,
                    tool_choice={"type": "auto"},
                    messages=messages,
                )
                break
            except anthropic.RateLimitError as e:
                retry_after = int(e.response.headers.get("retry-after", 60))
                print(f"[{log_prefix}] rate limited, retrying in {retry_after}s")
                time.sleep(retry_after)

        print(f"[{log_prefix}] iter={iteration} stop_reason={response.stop_reason}")
        for block in response.content:
            if block.type == "text" and block.text.strip():
                print(f"[{log_prefix}] reasoning: {block.text.strip()}")

        tool_uses = [b for b in response.content if b.type == "tool_use"]
        if not tool_uses:
            break

        terminal = next((b for b in tool_uses if b.name == terminal_tool), None)
        if terminal:
            print(f"[{log_prefix}] {terminal_tool}: {terminal.input!r}")
            return terminal.input

        messages.append({"role": "assistant", "content": response.content})
        tool_results = []
        for tu in tool_uses:
            result = tool_executor(tu.name, tu.input)
            tool_results.append({"type": "tool_result", "tool_use_id": tu.id, "content": json.dumps(result)})
        messages.append({"role": "user", "content": tool_results})

    return None


def _chat_stream_anthropic(prompt: str, system: str | None = None) -> Iterator[str]:
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    kwargs: dict = dict(
        model=CLAUDE_CHAT_MODEL,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    if system:
        kwargs["system"] = system
    with client.messages.stream(**kwargs) as stream:
        yield from stream.text_stream


# ── OpenAI / Ollama backend ────────────────────────────────────────────────────

def _openai_client() -> openai.OpenAI:
    return openai.OpenAI(base_url=LOCAL_MODEL_BASE_URL, api_key="ollama")


def _tool_use_loop_openai(
    system_text: str,
    user_prompt: str,
    tools: list[dict],
    tool_executor: Callable[[str, dict], dict],
    terminal_tool: str,
    max_iters: int,
    log_prefix: str,
) -> dict | None:
    client = _openai_client()
    oai_tools = _anthropic_to_openai_tools(tools)
    messages: list[dict] = [
        {"role": "system", "content": system_text},
        {"role": "user", "content": user_prompt},
    ]

    for iteration in range(max_iters):
        response = client.chat.completions.create(
            model=LOCAL_MODEL_NAME,
            max_tokens=8192,
            temperature=0,
            tools=oai_tools,
            tool_choice="auto",
            messages=messages,
            extra_body={"think": False},
        )
        choice = response.choices[0]
        finish_reason = choice.finish_reason
        print(f"[{log_prefix}] iter={iteration} finish_reason={finish_reason}")

        text_content = choice.message.content or ""
        if text_content.strip():
            print(f"[{log_prefix}] reasoning: {text_content.strip()}")

        tool_calls = choice.message.tool_calls or []
        if not tool_calls:
            break

        terminal = next((tc for tc in tool_calls if tc.function.name == terminal_tool), None)
        if terminal:
            data = json.loads(terminal.function.arguments)
            print(f"[{log_prefix}] {terminal_tool}: {data!r}")
            return data

        # Add assistant message with tool_calls
        messages.append({
            "role": "assistant",
            "content": text_content or None,
            "tool_calls": [
                {
                    "id": tc.id,
                    "type": "function",
                    "function": {"name": tc.function.name, "arguments": tc.function.arguments},
                }
                for tc in tool_calls
            ],
        })

        for tc in tool_calls:
            inp = json.loads(tc.function.arguments)
            result = tool_executor(tc.function.name, inp)
            messages.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "content": json.dumps(result),
            })

    return None


def _chat_stream_local(prompt: str, system: str | None = None) -> Iterator[str]:
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    stream = chat(
        model=LOCAL_MODEL_NAME,
        messages=messages,
        stream=True,
        think=True,
    )

    in_thinking = False
    for chunk in stream:
        if chunk.message.thinking:
            if not in_thinking:
                in_thinking = True
                print("[thinking]", flush=True)
            print(chunk.message.thinking, end="", flush=True)
        elif chunk.message.content:
            if in_thinking:
                in_thinking = False
                print("\n[/thinking]", flush=True)
            yield chunk.message.content
