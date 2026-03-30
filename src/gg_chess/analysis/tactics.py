import json
import time
from pathlib import Path

import anthropic
import chess
import chess.engine

from gg_chess.analysis.engine import ErrorPosition
from gg_chess.config import ANTHROPIC_API_KEY, CLAUDE_CONCEPT_MODEL, STOCKFISH_PATH
from gg_chess.ingestion.parser import Game


TACTICS_FILE = Path(__file__).parent.parent.parent.parent / "chess-docs" / "tactics.md"


def identify_tactic(error_pos: ErrorPosition, game: Game) -> tuple[str, str]:
    """Ask Claude to identify the tactical pattern missed in this position.

    Claude can interactively query Stockfish to verify hypotheses before naming
    a tactic. Returns (tactic_name, explanation). Both are empty strings if
    nothing notable is found or if the API call fails.
    """
    if not ANTHROPIC_API_KEY:
        raise RuntimeError("ANTHROPIC_API_KEY is not set")

    return _identify_tactic_claude(error_pos, game)


def _identify_tactic_claude(error_pos: ErrorPosition, game: Game) -> tuple[str, str]:
    """Run the Claude tool-use loop to identify the tactical pattern."""
    board = chess.Board(error_pos.fen_before)
    try:
        player_san = board.san(chess.Move.from_uci(error_pos.player_move))
    except Exception:
        player_san = error_pos.player_move

    pv_str = " ".join(error_pos.pv_san) if error_pos.pv_san else "?"
    user_side = "White" if game.player_color == "white" else "Black"
    move_num = error_pos.move_number

    alt_pvs = error_pos.alt_pvs_san if error_pos.alt_pvs_san else []
    alt_lines_text = ""
    for i, alt_pv in enumerate(alt_pvs, start=2):
        alt_lines_text += f"  Line {i}: {' '.join(alt_pv) if alt_pv else '?'}\n"

    best_move_context = _best_move_context(board, error_pos.pv_san)
    tactics_reference = TACTICS_FILE.read_text(encoding="utf-8") if TACTICS_FILE.exists() else ""

    system_content = [
        {
            "type": "text",
            "text": "You are an expert chess tactics coach. Use the following tactics reference when naming tactical patterns:\n\n" + tactics_reference,
            "cache_control": {"type": "ephemeral"},
        }
    ]

    prompt = f"""Analyse a position where {game.username} ({user_side}) missed a tactical opportunity.

Position (move {move_num}, {user_side} to move):
{best_move_context}
  FEN: {error_pos.fen_before}
  {user_side} played: {player_san}
  Evaluation drop: {error_pos.eval_drop_cp} centipawns ({error_pos.win_pct_drop:.1f}% winning chances lost)
  Classification: {error_pos.move_classification}

Stockfish best line: {pv_str}
Alternative lines considered:
{alt_lines_text}
Step 1 — Trace each Stockfish line move-by-move using `apply_move`:
  For each of the top lines (Line 1, Line 2, Line 3), call `apply_move` on the first 3-4
  moves in sequence, passing the FEN returned by each call as input to the next.
  Start from FEN: {error_pos.fen_before}
  After each move, if it gives check or is a capture, call `get_hanging_pieces` on the
  resulting FEN to see what material is now loose.

Step 2 — Compare the three lines:
  What tactical idea is common to all three? Look for a shared target piece, recurring motif
  (fork, pin, skewer, discovered attack, back-rank mate, etc.), or structural weakness that
  all lines exploit. State it explicitly before moving on.

Step 3 — Verify with position tools if needed:
  If a pin is suspected, call `get_pinned_pieces`. For a fork, call `get_piece_attacks` on
  the forking square (using the FEN after applying the move). Use `query_stockfish` only to
  confirm a specific continuation is winning — not for open-ended exploration.

Step 4 — Name the tactical pattern. Only name it after tracing at least one full line through
  `apply_move` and concretely confirming the pattern. Do not guess from move notation alone.
  Use the tactics reference for the name.

Step 5 — Write a 1-2 sentence coach explanation using specific square and piece names. Speak
  directly to the player as a coach. Never mention engines or analysis tools. Only state
  what the tool calls confirmed.

Only flag a tactic if it is genuinely and clearly present — the best line should directly illustrate or set up the tactical pattern. If no tactic is clearly present, use empty strings for name and explanation."""

    get_square_info_tool = {
        "name": "get_square_info",
        "description": "Get information about a square: what piece is on it, who attacks it, and who defends it.",
        "input_schema": {
            "type": "object",
            "properties": {
                "fen": {"type": "string", "description": "FEN string of the position"},
                "square": {"type": "string", "description": "Square name (e.g. 'e4')"},
            },
            "required": ["fen", "square"],
        },
    }

    get_piece_attacks_tool = {
        "name": "get_piece_attacks",
        "description": "Get all squares a piece attacks and any enemy pieces on those squares.",
        "input_schema": {
            "type": "object",
            "properties": {
                "fen": {"type": "string", "description": "FEN string of the position"},
                "square": {"type": "string", "description": "Square of the piece to query (e.g. 'd5')"},
            },
            "required": ["fen", "square"],
        },
    }

    get_hanging_pieces_tool = {
        "name": "get_hanging_pieces",
        "description": "Find all pieces that are attacked and undefended (hanging/en-prise) in the position.",
        "input_schema": {
            "type": "object",
            "properties": {
                "fen": {"type": "string", "description": "FEN string of the position"},
            },
            "required": ["fen"],
        },
    }

    get_pinned_pieces_tool = {
        "name": "get_pinned_pieces",
        "description": "Find all pieces of the given color that are pinned to their king.",
        "input_schema": {
            "type": "object",
            "properties": {
                "fen": {"type": "string", "description": "FEN string of the position"},
                "color": {"type": "string", "description": "'white' or 'black'"},
            },
            "required": ["fen", "color"],
        },
    }

    query_stockfish_tool = {
        "name": "query_stockfish",
        "description": "Evaluate a chess position with Stockfish. Returns eval in centipawns (from White's perspective), best moves, and principal variation lines.",
        "input_schema": {
            "type": "object",
            "properties": {
                "fen": {"type": "string", "description": "FEN string of the position to evaluate"},
                "depth": {"type": "integer", "description": "Search depth (default 14, max 18)"},
                "multipv": {"type": "integer", "description": "Number of best lines to return (default 3, max 5)"},
            },
            "required": ["fen"],
        },
    }

    apply_move_tool = {
        "name": "apply_move",
        "description": (
            "Apply a single move to a position and return the resulting FEN. "
            "Accepts UCI (e.g. 'e2e4') or SAN (e.g. 'Nf3', 'O-O') format. "
            "Returns the new FEN, whether the move gives check, is a capture, or is checkmate."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "fen": {"type": "string", "description": "FEN string before the move"},
                "move": {"type": "string", "description": "Move in UCI or SAN notation"},
            },
            "required": ["fen", "move"],
        },
    }

    report_tactic_tool = {
        "name": "report_tactic",
        "description": "Report the tactical pattern identified in the position.",
        "input_schema": {
            "type": "object",
            "properties": {
                "reasoning": {"type": "string", "description": "Step-by-step analysis of the position"},
                "name": {"type": "string", "description": "Name of the tactical pattern, or empty string if none"},
                "explanation": {"type": "string", "description": "1-2 sentence coach explanation mentioning specific moves, or empty string if no tactic"},
                "missing_info": {"type": "string", "description": "If no tactic could be identified, describe specifically what information is missing or ambiguous that prevented a confident identification. Empty string if a tactic was found."},
            },
            "required": ["reasoning", "name", "explanation", "missing_info"],
        },
    }

    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    messages = [{"role": "user", "content": prompt}]

    with chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH) as engine:
        engine.configure({"Threads": 2, "Hash": 64})

        for iteration in range(20):  # more tools = more calls expected before report_tactic
            while True:
                try:
                    response = client.messages.create(
                        model=CLAUDE_CONCEPT_MODEL,
                        max_tokens=4096,
                        temperature=0,
                        system=system_content,
                        tools=[
                            get_square_info_tool,
                            get_piece_attacks_tool,
                            get_hanging_pieces_tool,
                            get_pinned_pieces_tool,
                            apply_move_tool,
                            query_stockfish_tool,
                            report_tactic_tool,
                        ],
                        tool_choice={"type": "auto"},
                        messages=messages,
                    )
                    break
                except anthropic.RateLimitError as e:
                    retry_after = int(e.response.headers.get("retry-after", 60))
                    print(f"[identify_tactic] rate limited, retrying in {retry_after}s")
                    time.sleep(retry_after)
            print(f"[identify_tactic] iter={iteration} stop_reason={response.stop_reason}")
            for block in response.content:
                if block.type == "text" and block.text.strip():
                    print(f"[identify_tactic] reasoning: {block.text.strip()}")

            tool_uses = [b for b in response.content if b.type == "tool_use"]
            if not tool_uses:
                break

            report = next((b for b in tool_uses if b.name == "report_tactic"), None)
            if report:
                data = report.input
                print(f"[identify_tactic] response: {data!r}")
                missing = data.get("missing_info", "")
                if missing:
                    print(f"[identify_tactic] missing info: {missing}")
                return (data.get("name", ""), data.get("explanation", ""))

            messages.append({"role": "assistant", "content": response.content})
            tool_results = []
            for tu in tool_uses:
                if tu.name == "query_stockfish":
                    result = _run_stockfish_query(engine, tu.input)
                    print(f"[identify_tactic] stockfish query fen={tu.input.get('fen', '')[:40]} -> eval={result.get('eval_cp')}")
                elif tu.name == "get_square_info":
                    result = _tool_get_square_info(tu.input.get("fen", ""), tu.input.get("square", ""))
                    print(f"[identify_tactic] get_square_info {tu.input.get('square')} -> {result.get('piece')}")
                elif tu.name == "get_piece_attacks":
                    result = _tool_get_piece_attacks(tu.input.get("fen", ""), tu.input.get("square", ""))
                    print(f"[identify_tactic] get_piece_attacks {tu.input.get('square')} -> {result.get('attacks')}")
                elif tu.name == "get_hanging_pieces":
                    result = _tool_get_hanging_pieces(tu.input.get("fen", ""))
                    print(f"[identify_tactic] get_hanging_pieces -> {result.get('hanging')}")
                elif tu.name == "get_pinned_pieces":
                    result = _tool_get_pinned_pieces(tu.input.get("fen", ""), tu.input.get("color", "white"))
                    print(f"[identify_tactic] get_pinned_pieces {tu.input.get('color')} -> {result.get('pinned')}")
                elif tu.name == "apply_move":
                    result = _tool_apply_move(tu.input.get("fen", ""), tu.input.get("move", ""))
                    print(f"[identify_tactic] apply_move {tu.input.get('move')} -> check={result.get('gives_check')} capture={result.get('is_capture')}")
                else:
                    result = {"error": f"Unknown tool: {tu.name}"}
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tu.id,
                    "content": json.dumps(result),
                })
            messages.append({"role": "user", "content": tool_results})

    return ("", "")


def _tool_get_square_info(fen: str, square: str) -> dict:
    try:
        board = chess.Board(fen)
        sq = chess.parse_square(square)
    except Exception as e:
        return {"error": str(e)}
    piece = board.piece_at(sq)
    if piece is None:
        return {"piece": None, "color": None, "attackers": [], "defenders": [], "is_hanging": False}

    attackers_color = not piece.color
    defenders_color = piece.color
    attackers = []
    for asq in board.attackers(attackers_color, sq):
        ap = board.piece_at(asq)
        if ap:
            attackers.append({"piece": ap.symbol().upper(), "color": "white" if ap.color == chess.WHITE else "black", "square": chess.square_name(asq)})
    defenders = []
    for dsq in board.attackers(defenders_color, sq):
        dp = board.piece_at(dsq)
        if dp:
            defenders.append({"piece": dp.symbol().upper(), "color": "white" if dp.color == chess.WHITE else "black", "square": chess.square_name(dsq)})
    return {
        "piece": piece.symbol().upper(),
        "color": "white" if piece.color == chess.WHITE else "black",
        "attackers": attackers,
        "defenders": defenders,
        "is_hanging": bool(attackers) and not bool(defenders),
    }


def _tool_get_piece_attacks(fen: str, square: str) -> dict:
    try:
        board = chess.Board(fen)
        sq = chess.parse_square(square)
    except Exception as e:
        return {"error": str(e)}
    piece = board.piece_at(sq)
    if piece is None:
        return {"error": f"No piece on {square}"}
    attacked_squares = list(board.attacks(sq))
    attacked_enemy = []
    for asq in attacked_squares:
        target = board.piece_at(asq)
        if target and target.color != piece.color:
            attacked_enemy.append({"piece": target.symbol().upper(), "square": chess.square_name(asq)})
    return {
        "piece": piece.symbol().upper(),
        "color": "white" if piece.color == chess.WHITE else "black",
        "attacks": [chess.square_name(asq) for asq in attacked_squares],
        "attacked_enemy_pieces": attacked_enemy,
    }


def _tool_get_hanging_pieces(fen: str) -> dict:
    try:
        board = chess.Board(fen)
    except Exception as e:
        return {"error": str(e)}
    hanging = []
    for sq in chess.SQUARES:
        piece = board.piece_at(sq)
        if piece is None:
            continue
        attackers = board.attackers(not piece.color, sq)
        defenders = board.attackers(piece.color, sq)
        if attackers and not defenders:
            hanging.append({
                "piece": piece.symbol().upper(),
                "color": "white" if piece.color == chess.WHITE else "black",
                "square": chess.square_name(sq),
            })
    return {"hanging": hanging}


def _tool_get_pinned_pieces(fen: str, color: str) -> dict:
    try:
        board = chess.Board(fen)
    except Exception as e:
        return {"error": str(e)}
    pin_color = chess.WHITE if color.lower() == "white" else chess.BLACK
    king_sq = board.king(pin_color)
    if king_sq is None:
        return {"pinned": []}
    pinned = []
    for sq in chess.SQUARES:
        piece = board.piece_at(sq)
        if piece is None or piece.color != pin_color or sq == king_sq:
            continue
        if board.is_pinned(pin_color, sq):
            # Find the pinner: the ray from king through sq, look for an enemy slider
            pin_mask = board.pin(pin_color, sq)
            pinner_sq = None
            pinner_piece = None
            for psq in chess.SQUARES:
                if psq == sq:
                    continue
                if chess.BB_SQUARES[psq] & pin_mask:
                    pp = board.piece_at(psq)
                    if pp and pp.color != pin_color:
                        pinner_sq = psq
                        pinner_piece = pp
                        break
            pinned.append({
                "piece": piece.symbol().upper(),
                "square": chess.square_name(sq),
                "pinned_by": pinner_piece.symbol().upper() if pinner_piece else None,
                "pinner_square": chess.square_name(pinner_sq) if pinner_sq is not None else None,
            })
    return {"pinned": pinned}


def _tool_apply_move(fen: str, move: str) -> dict:
    try:
        board = chess.Board(fen)
    except Exception as e:
        return {"error": f"Invalid FEN: {e}"}

    chess_move = None
    try:
        chess_move = chess.Move.from_uci(move)
        if chess_move not in board.legal_moves:
            chess_move = None
    except Exception:
        pass

    if chess_move is None:
        try:
            chess_move = board.parse_san(move)
        except Exception as e:
            return {"error": f"Cannot parse move '{move}': {e}"}

    is_capture = board.is_capture(chess_move)
    gives_check = board.gives_check(chess_move)
    san_before_push = board.san(chess_move)  # must be called BEFORE push

    captured_piece = None
    if is_capture:
        cap_sq = chess_move.to_square
        if board.is_en_passant(chess_move):
            cap_sq = chess.square(
                chess.square_file(chess_move.to_square),
                chess.square_rank(chess_move.from_square),
            )
        cp = board.piece_at(cap_sq)
        if cp:
            captured_piece = {
                "piece": cp.symbol().upper(),
                "color": "white" if cp.color == chess.WHITE else "black",
                "square": chess.square_name(cap_sq),
            }

    board.push(chess_move)

    return {
        "fen_after": board.fen(),
        "move_san": san_before_push,
        "is_capture": is_capture,
        "captured_piece": captured_piece,
        "gives_check": gives_check,
        "is_checkmate": board.is_checkmate(),
        "is_stalemate": board.is_stalemate(),
    }


def _run_stockfish_query(engine, params: dict) -> dict:
    fen = params.get("fen", "")
    depth = min(int(params.get("depth", 14)), 18)
    multipv = min(int(params.get("multipv", 3)), 5)
    try:
        board = chess.Board(fen)
    except Exception as e:
        return {"error": f"Invalid FEN: {e}"}

    results = engine.analyse(board, chess.engine.Limit(depth=depth), multipv=multipv)
    if not isinstance(results, list):
        results = [results]

    pv_lines = []
    best_moves = []
    eval_cp = None

    for i, info in enumerate(results):
        score = info["score"].white().score(mate_score=10000)
        if i == 0:
            eval_cp = score
        pv_moves = []
        temp_board = board.copy()
        for mv in info.get("pv", [])[:8]:
            try:
                pv_moves.append(temp_board.san(mv))
                temp_board.push(mv)
            except Exception:
                break
        pv_lines.append(pv_moves)
        if pv_moves:
            best_moves.append(pv_moves[0])

    return {"eval_cp": eval_cp, "best_moves": best_moves, "pv_lines": pv_lines}


def _board_to_prompt(board: chess.Board, player_side: str) -> str:
    """Render the board as ASCII with piece lists, oriented from the player's perspective."""
    flip = player_side == "Black"

    rows = []
    ranks = range(7, -1, -1) if not flip else range(8)
    for rank in ranks:
        files = range(8) if not flip else range(7, -1, -1)
        rank_label = str(rank + 1)
        squares = []
        for file in files:
            sq = chess.square(file, rank)
            piece = board.piece_at(sq)
            squares.append(piece.symbol() if piece else ".")
        rows.append(f"  {rank_label} | {' '.join(squares)}")

    file_labels = "    a b c d e f g h" if not flip else "    h g f e d c b a"
    separator = "    ----------------"
    board_str = "\n".join(rows) + f"\n{separator}\n{file_labels}"

    # Piece lists
    def piece_list(color: chess.Color) -> str:
        pieces = []
        for pt in [chess.QUEEN, chess.ROOK, chess.BISHOP, chess.KNIGHT, chess.PAWN]:
            for sq in board.pieces(pt, color):
                sq_color = "L" if chess.BB_LIGHT_SQUARES & chess.BB_SQUARES[sq] else "D"
                pieces.append(f"{chess.piece_symbol(pt).upper()}{chess.square_name(sq)}[{sq_color}]")
        king_sq = board.king(color)
        if king_sq is not None:
            sq_color = "L" if chess.BB_LIGHT_SQUARES & chess.BB_SQUARES[king_sq] else "D"
            pieces.insert(0, f"K{chess.square_name(king_sq)}[{sq_color}]")
        return " ".join(pieces)

    white_pieces = piece_list(chess.WHITE)
    black_pieces = piece_list(chess.BLACK)

    # Hanging / en-prise pieces
    hanging = _hanging_pieces(board)
    hanging_note = f"  Hanging/en-prise: {hanging}" if hanging else ""

    return (
        f"{board_str}\n"
        f"  White: {white_pieces}\n"
        f"  Black: {black_pieces}\n"
        f"{hanging_note}"
    )


def _best_move_context(board: chess.Board, pv_san: list[str]) -> str:
    """Compute what the best move concretely attacks after it is played."""
    if not pv_san:
        return ""
    try:
        uci_moves = []
        temp = board.copy()
        for san in pv_san[:1]:  # only the first move (the recommended move)
            move = temp.parse_san(san)
            uci_moves.append(move)
            temp.push(move)
    except Exception:
        return ""

    move = uci_moves[0]
    to_sq = move.to_square
    piece = temp.piece_at(to_sq)
    if piece is None:
        return ""

    # Squares the moved piece now attacks
    attacked = temp.attacks(to_sq)
    attacked_pieces = []
    for sq in attacked:
        target = temp.piece_at(sq)
        if target and target.color != piece.color:
            attacked_pieces.append(
                f"{target.symbol().upper()}{chess.square_name(sq)}"
            )

    gives_check = temp.is_check()
    parts = []
    if gives_check:
        parts.append("gives check")
    if attacked_pieces:
        parts.append(f"attacks: {', '.join(attacked_pieces)}")
    if not parts:
        parts.append("no direct captures or check")

    return f"  After {pv_san[0]}: {'; '.join(parts)}\n"


def _hanging_pieces(board: chess.Board) -> str:
    """Return a short string listing pieces that are attacked and not defended."""
    results = []
    for sq in chess.SQUARES:
        piece = board.piece_at(sq)
        if piece is None:
            continue
        attackers = board.attackers(not piece.color, sq)
        defenders = board.attackers(piece.color, sq)
        if attackers and not defenders:
            results.append(
                f"{'W' if piece.color == chess.WHITE else 'B'}"
                f"{piece.symbol().upper()}{chess.square_name(sq)}"
            )
    return " ".join(results) if results else ""
