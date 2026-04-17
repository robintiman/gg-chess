import { writable, derived } from "svelte/store";

function localStorageStore(key, initial) {
  const stored = typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
  const store = writable(stored !== null ? JSON.parse(stored) : initial);
  store.subscribe(v => {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, JSON.stringify(v));
  });
  return store;
}

export const username = localStorageStore("gg_username", "");

export const appView = writable("home"); // "home" | "review" | "comparison"
export const reviewGame = writable(null);
export const reviewPhase = writable(null); // "self_analysis" | "comparison" | null
export const annotations = writable({});   // { [move_number]: annotation }
export const hintMessages = writable({});  // { [move_number]: [{role, text}] }
export const comparisonResults = writable([]);

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
