<script>
  import { onMount, onDestroy } from "svelte";
  import { Chessground } from "chessground";
  import { currentFen, currentAnalysis, currentError, history, currentIndex } from "../stores.js";

  let el;
  let cg;

  // Parse FEN to get pieces for chessground
  function fenToPieces(fen) {
    const pieces = new Map();
    const rows = fen.split(" ")[0].split("/");
    const files = "abcdefgh";
    rows.forEach((row, rankIdx) => {
      let fileIdx = 0;
      for (const ch of row) {
        if (/\d/.test(ch)) {
          fileIdx += parseInt(ch);
        } else {
          const key = files[fileIdx] + (8 - rankIdx);
          const color = ch === ch.toUpperCase() ? "white" : "black";
          const roleMap = { p: "pawn", r: "rook", n: "knight", b: "bishop", q: "queen", k: "king" };
          pieces.set(key, { role: roleMap[ch.toLowerCase()], color });
          fileIdx++;
        }
      }
    });
    return pieces;
  }

  function uciToFromDest(uci) {
    if (!uci || uci.length < 4) return null;
    return { orig: uci.slice(0, 2), dest: uci.slice(2, 4) };
  }

  function updateBoard(fen, analysis, error) {
    if (!cg) return;
    const pieces = fenToPieces(fen);
    const turnColor = fen.split(" ")[1] === "w" ? "white" : "black";
    const shapes = [];

    if (analysis?.best_move) {
      const fd = uciToFromDest(analysis.best_move);
      if (fd) shapes.push({ orig: fd.orig, dest: fd.dest, brush: "blue" });
    } else if (error?.best_move) {
      const fd = uciToFromDest(error.best_move);
      if (fd) shapes.push({ orig: fd.orig, dest: fd.dest, brush: "blue" });
    }

    if (error?.player_move) {
      const fd = uciToFromDest(error.player_move);
      if (fd) shapes.push({ orig: fd.orig, dest: fd.dest, brush: "red" });
    }

    cg.set({
      fen,
      turnColor,
      movable: { color: undefined, dests: new Map() },
      drawable: { shapes },
    });
  }

  onMount(() => {
    cg = Chessground(el, {
      movable: { color: undefined, dests: new Map() },
      draggable: { enabled: false },
      selectable: { enabled: false },
      drawable: { enabled: true, visible: true },
    });

    const unsubscribeFen = currentFen.subscribe((fen) => {
      let analysis, error;
      currentAnalysis.subscribe((a) => (analysis = a))();
      currentError.subscribe((e) => (error = e))();
      updateBoard(fen, analysis, error);
    });

    const unsubscribeAnalysis = currentAnalysis.subscribe((analysis) => {
      let fen, error;
      currentFen.subscribe((f) => (fen = f))();
      currentError.subscribe((e) => (error = e))();
      updateBoard(fen, analysis, error);
    });

    return () => {
      unsubscribeFen();
      unsubscribeAnalysis();
    };
  });

  onDestroy(() => {
    if (cg) cg.destroy();
  });
</script>

<div class="board-wrap">
  <div bind:this={el} class="cg-board-wrap"></div>
</div>

<style>
  @import "chessground/assets/chessground.base.css";
  @import "chessground/assets/chessground.brown.css";
  @import "chessground/assets/chessground.cburnett.css";

  .board-wrap {
    display: flex;
    justify-content: center;
    align-items: center;
  }
  .cg-board-wrap {
    width: 480px;
    height: 480px;
  }
</style>
