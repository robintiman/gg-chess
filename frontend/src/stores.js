import { writable, derived } from "svelte/store";

export const games = writable([]);
export const currentGame = writable(null);  // { id, pgn, errors, errors_by_fen }
export const history = writable([]);         // array of { fen, san, move_number, uci }
export const currentIndex = writable(0);
export const currentAnalysis = writable(null); // { eval_cp, best_move, pv }
export const chatMessages = writable([]);    // array of { role, text }

export const currentFen = derived(
  [history, currentIndex],
  ([$history, $currentIndex]) => {
    if ($history.length === 0) return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    return $history[$currentIndex]?.fen ?? "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  }
);

export const currentError = derived(
  [currentFen, currentGame],
  ([$currentFen, $currentGame]) => {
    if (!$currentGame) return null;
    return $currentGame.errors_by_fen?.[$currentFen] ?? null;
  }
);
