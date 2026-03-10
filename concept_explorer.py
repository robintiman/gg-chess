#!/usr/bin/env python3
"""
Fetch the latest game from chess.com for a given user, analyze positions
with Stockfish, identify chess concepts using Claude, and generate a
standalone HTML file for interactive review.
"""

import io
import json
import re
import time
from pathlib import Path

import anthropic
import chess
import chess.engine
import chess.pgn
import httpx
from dotenv import load_dotenv

load_dotenv()

USERNAME = "jumpyfile"
MAX_GAMES = 2
USER_AGENT = "Patzer/0.1 (chess improvement tool; contact via github)"
OUTPUT_FILE = Path(__file__).parent / "concept_explorer.html"
CONCEPTS_FILE = Path(__file__).parent / "chess_concepts.md"

STOCKFISH_PATH = str(Path(__file__).parent / "stockfish" / "stockfish-ubuntu-x86-64-avx2")
STOCKFISH_DEPTH = 20
STOCKFISH_PV_MOVES = 8


# ---------------------------------------------------------------------------
# Chess.com fetching
# ---------------------------------------------------------------------------

def fetch_games(username: str, max_games: int) -> list[str]:
    headers = {"User-Agent": USER_AGENT}
    pgn_games: list[str] = []

    with httpx.Client(timeout=30.0, headers=headers) as client:
        archives_resp = client.get(
            f"https://api.chess.com/pub/player/{username}/games/archives"
        )
        archives_resp.raise_for_status()
        archives: list[str] = archives_resp.json().get("archives", [])

        for archive_url in reversed(archives):
            if len(pgn_games) >= max_games:
                break

            while True:
                resp = client.get(archive_url + "/pgn")
                if resp.status_code == 429:
                    time.sleep(int(resp.headers.get("Retry-After", "10")))
                    continue
                resp.raise_for_status()
                break

            chunks = re.split(r"\n\n(?=\[Event)", resp.text)
            for chunk in reversed(chunks):
                chunk = chunk.strip()
                if not chunk or _is_skippable(chunk):
                    continue
                pgn_games.append(chunk)
                if len(pgn_games) >= max_games:
                    break

    return pgn_games[:max_games]


def _is_skippable(pgn_text: str) -> bool:
    if re.search(r'\[Event "[^"]*(?:correspondence|daily)[^"]*"\]', pgn_text, re.I):
        return True
    tc = re.search(r'\[TimeControl "([^"]+)"\]', pgn_text)
    if tc and tc.group(1) in ("-", "1/86400", "1/172800"):
        return True
    rated = re.search(r'\[Rated "([^"]+)"\]', pgn_text)
    if rated and rated.group(1).lower() == "false":
        return True
    return False


def header(pgn: str, tag: str) -> str:
    m = re.search(rf'\[{tag} "([^"]+)"\]', pgn)
    return m.group(1) if m else "?"


# ---------------------------------------------------------------------------
# PGN → move history (list of FENs)
# ---------------------------------------------------------------------------

def build_history(pgn_text: str) -> list[dict]:
    """Return list of {fen, san, ply} starting from ply=0 (start position)."""
    game = chess.pgn.read_game(io.StringIO(pgn_text))
    board = game.board()
    history = [{"fen": board.fen(), "san": None, "ply": 0}]
    for ply, move in enumerate(game.mainline_moves(), start=1):
        san = board.san(move)
        board.push(move)
        history.append({"fen": board.fen(), "san": san, "ply": ply})
    return history


def history_to_move_list(history: list[dict]) -> str:
    """Convert history to readable move string: '1. e4 e5 2. Nf3 ...'"""
    parts = []
    moves = history[1:]  # skip start position
    for i, entry in enumerate(moves):
        if i % 2 == 0:
            parts.append(f"{i // 2 + 1}. {entry['san']}")
        else:
            parts.append(entry["san"])
    return " ".join(parts)


# ---------------------------------------------------------------------------
# Stockfish analysis + Claude concept identification
# ---------------------------------------------------------------------------

def get_user_color(pgn_text: str) -> chess.Color:
    white = header(pgn_text, "White")
    return chess.WHITE if white.lower() == USERNAME.lower() else chess.BLACK


def analyze_with_stockfish(history: list[dict], user_color: chess.Color) -> list[dict]:
    """Run Stockfish on each position where it's the user's turn (before their move)."""
    analyses = []

    with chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH) as engine:
        for entry in history[1:]:  # skip initial position entry
            ply = entry["ply"]
            # White moves at odd plies (1, 3, 5, ...), black at even plies (2, 4, 6, ...)
            is_user_move = (ply % 2 == 1) if user_color == chess.WHITE else (ply % 2 == 0)
            if not is_user_move:
                continue

            # Analyze the position BEFORE this move was made
            prev_fen = history[ply - 1]["fen"]
            board = chess.Board(prev_fen)

            info = engine.analyse(board, chess.engine.Limit(depth=STOCKFISH_DEPTH))

            # Skip positions where the user played the best move or near-best move (within 10cp)
            pv = info.get("pv", [])
            if pv:
                played_move = board.parse_san(entry["san"])
                best_score = info["score"].white()
                if not best_score.is_mate():
                    info_played = engine.analyse(board, chess.engine.Limit(depth=STOCKFISH_DEPTH), root_moves=[played_move])
                    played_score = info_played["score"].white()
                    if not played_score.is_mate():
                        cp_loss = abs(best_score.score() - played_score.score())
                        if cp_loss <= 10:
                            continue
                elif played_move == pv[0]:
                    continue

            # Convert PV to SAN notation
            pv_sans = []
            temp_board = board.copy()
            for move in pv[:STOCKFISH_PV_MOVES]:
                try:
                    pv_sans.append(temp_board.san(move))
                    temp_board.push(move)
                except Exception:
                    break

            score = info["score"].white()
            if score.is_mate():
                score_str = f"Mate in {score.mate()}"
            else:
                cp = score.score()
                score_str = f"{cp / 100:+.2f}" if cp is not None else "?"

            analyses.append({
                "ply": ply,
                "fen": prev_fen,
                "san": entry["san"],
                "pv": pv_sans,
                "score": score_str,
            })

    return analyses


def identify_concepts(pgn_text: str, history: list[dict], analyses: list[dict]) -> list[dict]:
    """Batch-ask Claude to identify chess concepts from Stockfish-analyzed positions."""
    if not analyses:
        return []

    white = header(pgn_text, "White")
    black = header(pgn_text, "Black")
    user_side = "White" if header(pgn_text, "White").lower() == USERNAME.lower() else "Black"

    positions_text = ""
    for a in analyses:
        move_num = (a["ply"] + 1) // 2
        side = "White" if a["ply"] % 2 == 1 else "Black"
        positions_text += (
            f"Ply {a['ply']} — Move {move_num} ({side} to move, played: {a['san']}):\n"
            f"  FEN: {a['fen']}\n"
            f"  Evaluation: {a['score']}\n"
            f"  Stockfish best line: {' '.join(a['pv'])}\n\n"
        )

    concepts_reference = CONCEPTS_FILE.read_text(encoding="utf-8") if CONCEPTS_FILE.exists() else ""

    prompt = f"""You are an expert chess coach analyzing the game {white} (White) vs {black} (Black). You are coaching {USERNAME} who plays {user_side}.

Use the following chess concepts reference when naming and identifying concepts:

{concepts_reference}

For each position below, Stockfish analyzed the position before {USERNAME} moved and provided the best continuation. Identify notable chess concepts that {USERNAME} could take advantage of in that position — opportunities that the Stockfish line helps illustrate or execute.

Only flag a concept if it is genuinely and clearly present. The best line should directly illustrate or set up the concept. Skip quiet positions with no standout theme.

Write explanations naturally, as a coach speaking directly to the player. Never mention engines or analysis tools. Use phrasing like "By playing Nxc6 first..." or "...gives you a structural advantage". Mention specific moves from the best line.

{positions_text}Respond ONLY with valid JSON:
{{"concepts": [{{"ply": N, "name": "concept name", "explanation": "1-2 sentences mentioning specific moves from the best line"}}]}}

Only include plies where a notable concept exists. If no concepts found, return {{"concepts": []}}."""

    client = anthropic.Anthropic()
    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2048,
        temperature=0,
        messages=[{"role": "user", "content": prompt}],
    )
    raw = message.content[0].text.strip()

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        m = re.search(r'\{.*\}', raw, re.DOTALL)
        data = json.loads(m.group()) if m else {"concepts": []}

    concepts = []
    for c in data.get("concepts", []):
        ply = int(c.get("ply", 0))
        if 0 < ply < len(history):
            concepts.append({
                "name": c.get("name", ""),
                "ply": ply,
                "fen": history[ply]["fen"],
                "san": history[ply]["san"],
                "explanation": c.get("explanation", ""),
            })
    return concepts


# ---------------------------------------------------------------------------
# HTML generation
# ---------------------------------------------------------------------------

HTML_TEMPLATE = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Chess Concept Explorer</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
         background: #1a1a2e; color: #e0e0e0; height: 100vh; display: flex;
         flex-direction: column; overflow: hidden; }

  header { background: #16213e; border-bottom: 1px solid #0f3460;
           padding: 10px 16px; display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
  header h1 { font-size: 17px; color: #a9cce3; font-weight: 600; }
  header .subtitle { font-size: 12px; color: #666; }

  .main { display: grid; grid-template-columns: 230px 1fr 300px;
          flex: 1; min-height: 0; overflow: hidden; }

  /* --- Left panel: game list --- */
  .games-col { border-right: 1px solid #0f3460; display: flex;
               flex-direction: column; overflow: hidden; }
  .games-col h2 { font-size: 12px; color: #888; padding: 10px 12px 6px;
                  text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #0f3460; }
  .game-list { overflow-y: auto; flex: 1; }
  .game-item { padding: 10px 12px; border-bottom: 1px solid #0f3460;
               cursor: pointer; transition: background 0.15s; }
  .game-item:hover { background: #16213e; }
  .game-item.active { background: #0f3460; }
  .game-item .players { font-size: 13px; font-weight: 500; color: #c8d6e5; }
  .game-item .meta { font-size: 11px; color: #666; margin-top: 3px; display: flex; gap: 8px; }
  .game-item .result { font-weight: bold; }
  .result-win { color: #2ecc71; }
  .result-loss { color: #e74c3c; }
  .result-draw { color: #f39c12; }
  .concept-count { background: #0f3460; color: #a9cce3; border-radius: 10px;
                   padding: 1px 7px; font-size: 11px; margin-top: 4px; display: inline-block; }

  /* --- Center: board + move list --- */
  .board-col { display: flex; flex-direction: column; align-items: center;
               padding: 16px; gap: 12px; overflow: auto; }
  .board-wrap { position: relative; }
  .board-table { border-collapse: collapse; border: 2px solid #0f3460; }
  .board-table td { width: 60px; height: 60px; text-align: center;
                    font-size: 42px; line-height: 60px; cursor: default;
                    position: relative; user-select: none; }
  .sq-light { background: #f0d9b5; }
  .sq-dark  { background: #b58863; }
  .sq-highlight { outline: 4px solid rgba(255, 255, 0, 0.6); outline-offset: -4px; z-index: 1; }
  .sq-from { background: rgba(20, 85, 30, 0.5) !important; }
  .sq-to   { background: rgba(20, 85, 30, 0.5) !important; }
  .coord-file { position: absolute; bottom: 2px; right: 4px;
                font-size: 10px; color: rgba(0,0,0,0.4); font-family: monospace; }
  .coord-rank { position: absolute; top: 2px; left: 4px;
                font-size: 10px; color: rgba(0,0,0,0.4); font-family: monospace; }
  .sq-light .coord-file, .sq-light .coord-rank { color: rgba(139,90,43,0.7); }
  .sq-dark  .coord-file, .sq-dark  .coord-rank { color: rgba(240,217,181,0.7); }

  .piece-w { color: #ffffff; text-shadow: 0 0 2px #000, 0 0 4px #000; }
  .piece-b { color: #1a1a1a; text-shadow: 0 0 2px #fff, 0 0 4px rgba(255,255,255,0.6); }

  .controls { display: flex; align-items: center; gap: 8px; }
  .controls button { padding: 6px 12px; background: #16213e; border: 1px solid #0f3460;
                     border-radius: 4px; color: #e0e0e0; cursor: pointer; font-size: 13px; }
  .controls button:hover:not(:disabled) { background: #0f3460; }
  .controls button:disabled { opacity: 0.3; cursor: default; }
  .move-counter { font-size: 13px; color: #888; min-width: 60px; text-align: center; }

  .move-list { display: flex; flex-wrap: wrap; gap: 2px 4px; padding: 8px;
               font-family: monospace; font-size: 13px; max-height: 120px;
               overflow-y: auto; background: #16213e; border-radius: 4px; width: 100%; max-width: 480px; }
  .mn { color: #555; }
  .mv { cursor: pointer; padding: 1px 5px; border-radius: 3px; }
  .mv:hover { background: #0f3460; }
  .mv.cur { background: #1a5276; font-weight: bold; }
  .mv.has-concept { color: #f39c12; }

  /* --- Right panel: concepts --- */
  .concepts-col { border-left: 1px solid #0f3460; display: flex;
                  flex-direction: column; overflow: hidden; }
  .concepts-col h2 { font-size: 12px; color: #888; padding: 10px 12px 6px;
                     text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #0f3460; }
  .concept-list { overflow-y: auto; flex: 1; padding: 8px; display: flex; flex-direction: column; gap: 8px; }
  .concept-card { background: #16213e; border: 1px solid #0f3460; border-radius: 6px;
                  padding: 10px 12px; cursor: pointer; transition: border-color 0.15s; }
  .concept-card:hover { border-color: #1a5276; background: #1a2744; }
  .concept-card.active { border-color: #f39c12; background: #1f2a10; }
  .concept-name { font-size: 13px; font-weight: 600; color: #a9cce3; }
  .concept-move { font-size: 11px; color: #f39c12; font-family: monospace; margin-top: 2px; }
  .concept-explanation { font-size: 12px; color: #aaa; margin-top: 6px; line-height: 1.5; }
  .no-game { color: #555; font-size: 13px; padding: 16px 12px; }
</style>
</head>
<body>
<header>
  <h1>Chess Concept Explorer</h1>
  <span class="subtitle">jumpyfile · last __GAME_COUNT__ games</span>
</header>
<div class="main">
  <div class="games-col">
    <h2>Games</h2>
    <div class="game-list" id="gameList"></div>
  </div>
  <div class="board-col">
    <div class="board-wrap">
      <table class="board-table" id="board"></table>
    </div>
    <div class="controls">
      <button id="btnStart" onclick="goTo(0)">|&lt;</button>
      <button id="btnPrev"  onclick="navigate(-1)">&lt;</button>
      <span class="move-counter" id="moveCounter">0 / 0</span>
      <button id="btnNext"  onclick="navigate(1)">&gt;</button>
      <button id="btnEnd"   onclick="goTo(state.history.length - 1)">&gt;|</button>
    </div>
    <div class="move-list" id="moveList"></div>
  </div>
  <div class="concepts-col">
    <h2>Concepts</h2>
    <div class="concept-list" id="conceptList">
      <p class="no-game">Select a game to see identified concepts.</p>
    </div>
  </div>
</div>

<script>
const GAMES = __GAMES_JSON__;

const PIECES = {
  K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙',
  k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟',
};

const FILES = 'abcdefgh';

const state = {
  gameIdx: -1,
  history: [],
  currentPly: 0,
  conceptPly: -1,
};

function fenToBoard(fen) {
  const rows = fen.split(' ')[0].split('/');
  const grid = [];
  for (const row of rows) {
    const r = [];
    for (const ch of row) {
      if (/\d/.test(ch)) r.push(...Array(+ch).fill(null));
      else r.push(ch);
    }
    grid.push(r);
  }
  return grid;
}

function renderBoard(fen, fromSq, toSq) {
  const grid = fenToBoard(fen);
  const table = document.getElementById('board');
  let html = '';
  for (let rank = 7; rank >= 0; rank--) {
    html += '<tr>';
    for (let file = 0; file < 8; file++) {
      const sq = FILES[file] + (rank + 1);
      const isLight = (rank + file) % 2 === 1;
      const piece = grid[7 - rank][file];
      let cls = isLight ? 'sq-light' : 'sq-dark';
      if (sq === fromSq) cls += ' sq-from';
      else if (sq === toSq) cls += ' sq-to';
      const pieceHtml = piece
        ? `<span class="${piece === piece.toUpperCase() ? 'piece-w' : 'piece-b'}">${PIECES[piece] || ''}</span>`
        : '';
      const fileCoord = rank === 0 ? `<span class="coord-file">${FILES[file]}</span>` : '';
      const rankCoord = file === 0 ? `<span class="coord-rank">${rank + 1}</span>` : '';
      html += `<td class="${cls}">${pieceHtml}${fileCoord}${rankCoord}</td>`;
    }
    html += '</tr>';
  }
  table.innerHTML = html;
}

function uciSquares(uci) {
  if (!uci || uci.length < 4) return [null, null];
  return [uci.slice(0, 2), uci.slice(2, 4)];
}

function goTo(ply) {
  if (!state.history.length) return;
  ply = Math.max(0, Math.min(ply, state.history.length - 1));
  state.currentPly = ply;

  const entry = state.history[ply];
  const prev = ply > 0 ? state.history[ply - 1] : null;

  // Compute move squares from FEN diff
  const [from, to] = computeMovedSquares(prev?.fen, entry.fen);
  renderBoard(entry.fen, from, to);
  renderMoveList();
  renderControls();
}

function computeMovedSquares(fenBefore, fenAfter) {
  if (!fenBefore) return [null, null];
  const before = fenToBoard(fenBefore);
  const after = fenToBoard(fenAfter);
  let disappeared = null, appeared = null;
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const b = before[rank][file];
      const a = after[rank][file];
      if (b && !a) disappeared = FILES[file] + (8 - rank);
      else if (!b && a && disappeared) appeared = FILES[file] + (8 - rank);
    }
  }
  return [disappeared, appeared];
}

function navigate(delta) {
  goTo(state.currentPly + delta);
}

function renderControls() {
  const total = state.history.length - 1;
  document.getElementById('moveCounter').textContent = `${state.currentPly} / ${total}`;
  document.getElementById('btnStart').disabled = state.currentPly === 0;
  document.getElementById('btnPrev').disabled = state.currentPly === 0;
  document.getElementById('btnNext').disabled = state.currentPly >= total;
  document.getElementById('btnEnd').disabled = state.currentPly >= total;
}

function getConceptPlies() {
  if (state.gameIdx < 0) return new Set();
  return new Set(GAMES[state.gameIdx].concepts.map(c => c.ply));
}

function renderMoveList() {
  const moves = state.history.slice(1);
  const conceptPlies = getConceptPlies();
  let html = '';
  for (let i = 0; i < moves.length; i += 2) {
    const num = Math.floor(i / 2) + 1;
    const w = moves[i];
    const b = moves[i + 1];
    const wPly = w.ply;
    const bPly = b ? b.ply : -1;
    const wCls = `mv${wPly === state.currentPly ? ' cur' : ''}${conceptPlies.has(wPly) ? ' has-concept' : ''}`;
    const bCls = b ? `mv${bPly === state.currentPly ? ' cur' : ''}${conceptPlies.has(bPly) ? ' has-concept' : ''}` : '';
    html += `<span class="mn">${num}.</span>`;
    html += `<span class="${wCls}" onclick="goTo(${wPly})">${w.san}</span>`;
    if (b) html += `<span class="${bCls}" onclick="goTo(${bPly})">${b.san}</span>`;
  }
  document.getElementById('moveList').innerHTML = html;
}

function renderConceptList() {
  const el = document.getElementById('conceptList');
  if (state.gameIdx < 0) {
    el.innerHTML = '<p class="no-game">Select a game to see identified concepts.</p>';
    return;
  }
  const concepts = GAMES[state.gameIdx].concepts;
  if (!concepts.length) {
    el.innerHTML = '<p class="no-game">No concepts identified in this game.</p>';
    return;
  }
  let html = '';
  for (const c of concepts) {
    const moveNum = Math.ceil(c.ply / 2);
    const side = c.ply % 2 === 1 ? 'White' : 'Black';
    const active = c.ply === state.currentPly ? ' active' : '';
    html += `
      <div class="concept-card${active}" onclick="jumpToConcept(${c.ply})">
        <div class="concept-name">${escHtml(c.name)}</div>
        <div class="concept-move">Move ${moveNum} (${side}) — ${escHtml(c.san || '')}</div>
        <div class="concept-explanation">${escHtml(c.explanation)}</div>
      </div>`;
  }
  el.innerHTML = html;
}

function jumpToConcept(ply) {
  goTo(ply);
  renderConceptList();
}

function resultClass(result, username) {
  if (result === '1/2-1/2') return 'result-draw';
  const game = GAMES.find(g => g.white.toLowerCase() === username.toLowerCase() || g.black.toLowerCase() === username.toLowerCase());
  return result === '1-0' ? 'result-win' : 'result-loss';
}

function renderGameList() {
  const el = document.getElementById('gameList');
  const username = '__USERNAME__'.toLowerCase();
  let html = '';
  GAMES.forEach((g, i) => {
    const isActive = i === state.gameIdx;
    let rClass = 'result-draw';
    if (g.result === '1-0') rClass = g.white.toLowerCase() === username ? 'result-win' : 'result-loss';
    if (g.result === '0-1') rClass = g.black.toLowerCase() === username ? 'result-win' : 'result-loss';
    html += `
      <div class="game-item${isActive ? ' active' : ''}" onclick="selectGame(${i})">
        <div class="players">${escHtml(g.white)} vs ${escHtml(g.black)}</div>
        <div class="meta">
          <span class="result ${rClass}">${g.result}</span>
          <span>${g.date}</span>
          <span>${g.time_control}</span>
        </div>
        <span class="concept-count">${g.concepts.length} concept${g.concepts.length !== 1 ? 's' : ''}</span>
      </div>`;
  });
  el.innerHTML = html;
}

function selectGame(idx) {
  state.gameIdx = idx;
  state.history = GAMES[idx].history;
  state.currentPly = 0;
  state.conceptPly = -1;
  goTo(0);
  renderGameList();
  renderConceptList();
}

function escHtml(str) {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'ArrowLeft') navigate(-1);
  if (e.key === 'ArrowRight') navigate(1);
});

// Init
renderBoard('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', null, null);
renderGameList();
renderControls();
</script>
</body>
</html>
"""


def generate_html(games_data: list[dict]) -> str:
    html = HTML_TEMPLATE
    html = html.replace("__GAMES_JSON__", json.dumps(games_data, ensure_ascii=False))
    html = html.replace("__GAME_COUNT__", str(len(games_data)))
    html = html.replace("__USERNAME__", USERNAME)
    return html


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print(f"Fetching latest game for {USERNAME}...")
    pgn_list = fetch_games(USERNAME, MAX_GAMES)
    print(f"Fetched {len(pgn_list)} game(s).\n")

    games_data = []

    for i, pgn_text in enumerate(pgn_list, 1):
        white = header(pgn_text, "White")
        black = header(pgn_text, "Black")
        result = header(pgn_text, "Result")
        date = header(pgn_text, "Date")
        tc = header(pgn_text, "TimeControl")
        print(f"[{i}/{len(pgn_list)}] {white} vs {black} ({result})")

        try:
            hist = build_history(pgn_text)
        except Exception as e:
            print(f"  ⚠ Failed to parse PGN: {e}")
            continue

        user_color = get_user_color(pgn_text)
        user_side = "White" if user_color == chess.WHITE else "Black"
        print(f"  Playing as {user_side} — analysing {len([h for h in hist[1:] if (h['ply'] % 2 == 1) == (user_color == chess.WHITE)])} positions with Stockfish (depth {STOCKFISH_DEPTH})...")

        try:
            analyses = analyze_with_stockfish(hist, user_color)
            print(f"  Stockfish done. Asking Claude to identify concepts...")
        except Exception as e:
            print(f"  ⚠ Stockfish error: {e}")
            analyses = []

        try:
            concepts = identify_concepts(pgn_text, hist, analyses)
        except Exception as e:
            print(f"  ⚠ Claude error: {e}")
            concepts = []

        print(f"  → {len(concepts)} concept(s) found")

        games_data.append({
            "white": white,
            "black": black,
            "result": result,
            "date": date,
            "time_control": tc,
            "history": hist,
            "concepts": concepts,
        })

    html = generate_html(games_data)
    OUTPUT_FILE.write_text(html, encoding="utf-8")
    print(f"\nDone! Open: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
