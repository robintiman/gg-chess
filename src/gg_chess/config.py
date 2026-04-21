import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")

STOCKFISH_PATH: str = os.getenv("STOCKFISH_PATH", "stockfish")

DB_PATH: Path = Path(
    os.getenv("GG_CHESS_DB_PATH", Path.home() / ".local" / "share" / "gg-chess" / "gg-chess.db")
)

PUZZLE_CSV_PATH: Path = Path(
    os.getenv("PUZZLE_CSV_PATH", "./data/lichess_db_puzzle.csv")
)

STOCKFISH_THREADS: int = int(os.getenv("STOCKFISH_THREADS", os.cpu_count() or 1))
STOCKFISH_HASH: int = int(os.getenv("STOCKFISH_HASH", 256))  # MB

STOCKFISH_NODES: int = 1_500_000      # Full analysis node budget (≈ depth 23-27, adaptive)
STOCKFISH_NODES_SCAN: int = 500_000   # Pass-1 quick scan to find best move
STOCKFISH_NODES_AFTER: int = 300_000  # Post-move eval for blunder confirmation

# Win-probability thresholds (Lichess methodology)
BLUNDER_WIN_PCT_THRESHOLD: float = 30.0
MISTAKE_WIN_PCT_THRESHOLD: float = 20.0
INACCURACY_WIN_PCT_THRESHOLD: float = 10.0

CLAUDE_CONCEPT_MODEL: str = "claude-haiku-4-5-20251001"  # Fast model for structured concept extraction
CLAUDE_CHAT_MODEL: str = "claude-opus-4-6"               # High-quality model for interactive chat

USE_LOCAL_MODEL: bool = os.getenv("USE_LOCAL_MODEL", "false").lower() == "true"
LOCAL_MODEL_BASE_URL: str = os.getenv("LOCAL_MODEL_BASE_URL", "http://localhost:11434/v1")
LOCAL_MODEL_NAME: str = os.getenv("LOCAL_MODEL_NAME", "qwen3:30b")
MULTI_PV_COUNT: int = 3
