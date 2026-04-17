import math
import sqlite3


def score_game(errors: list[dict], total_player_moves: int) -> float:
    """Score a game's learning value on a 0-1 scale."""
    if total_player_moves == 0:
        return 0.0

    blunders = sum(1 for e in errors if e.get("move_classification") == "blunder")
    mistakes = sum(1 for e in errors if e.get("move_classification") == "mistake")
    decisive_swings = sum(1 for e in errors if (e.get("win_pct_drop") or 0) >= 30)

    # Blunder density (0-1)
    blunder_density = min(1.0, blunders / max(1, total_player_moves))

    # Decisive swing count: 3+ = full score
    swing_score = min(1.0, decisive_swings / 3)

    # Critical moment spread across game thirds
    spread_score = _spread_score(errors, total_player_moves)

    # Game length complexity: sigmoid centred at 35 moves
    length_score = _sigmoid(total_player_moves, centre=35, scale=10)

    # Closeness: last eval — closer games are more instructive
    evals = [abs(e.get("eval_drop_cp") or 0) for e in errors]
    last_eval = evals[-1] if evals else 500
    closeness = max(0.0, 1.0 - last_eval / 500)

    return (
        0.30 * blunder_density +
        0.30 * swing_score +
        0.20 * spread_score +
        0.10 * length_score +
        0.10 * closeness
    )


def _sigmoid(x: float, centre: float, scale: float) -> float:
    return 1 / (1 + math.exp(-(x - centre) / scale))


def _spread_score(errors: list[dict], total_moves: int) -> float:
    if not errors or total_moves == 0:
        return 0.0
    third = total_moves / 3
    thirds = [0, 0, 0]
    for e in errors:
        mn = e.get("move_number") or 0
        idx = min(2, int(mn / third))
        thirds[idx] += 1
    total = sum(thirds)
    if total == 0:
        return 0.0
    probs = [t / total for t in thirds]
    # Shannon entropy, normalised to [0,1] by dividing by log(3)
    entropy = -sum(p * math.log(p) for p in probs if p > 0)
    return entropy / math.log(3)


def score_game_from_db(db: sqlite3.Connection, game_db_id: int) -> float:
    rows = db.execute(
        "SELECT move_number, move_classification, win_pct_drop, eval_drop_cp FROM positions WHERE game_id = ?",
        (game_db_id,),
    ).fetchall()

    # Estimate total player moves from max move_number in errors
    move_numbers = [r["move_number"] for r in rows] if rows else []
    total_player_moves = max(move_numbers) if move_numbers else 1

    errors = [dict(r) for r in rows]
    score = score_game(errors, total_player_moves)

    db.execute("UPDATE games SET interest_score = ? WHERE id = ?", (score, game_db_id))
    db.commit()
    return score
