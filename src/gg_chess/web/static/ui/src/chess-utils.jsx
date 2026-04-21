// Minimal chess position helpers for the prototype.
// We represent the board as an 8x8 array of piece codes, where uppercase = White.
// Files a-h map to x=0..7, ranks 1-8 map to y=0..7 (y=0 is rank 1 = bottom).

const STARTING_BOARD = [
  ["R","N","B","Q","K","B","N","R"],
  ["P","P","P","P","P","P","P","P"],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  [null,null,null,null,null,null,null,null],
  ["p","p","p","p","p","p","p","p"],
  ["r","n","b","q","k","b","n","r"],
];

function cloneBoard(b) { return b.map(row => row.slice()); }
function sq(file, rank) { return file + "" + rank; }
function fileCh(x) { return "abcdefgh"[x]; }

function findPiece(board, color, pieceChar, toX, toY, disambig) {
  const results = [];
  const piece = color === "w" ? pieceChar.toUpperCase() : pieceChar.toLowerCase();
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (board[y][x] !== piece) continue;
      if (canReach(board, color, pieceChar, x, y, toX, toY)) {
        if (disambig) {
          if (/^[a-h]$/.test(disambig) && fileCh(x) !== disambig) continue;
          if (/^[1-8]$/.test(disambig) && (y + 1) !== parseInt(disambig)) continue;
        }
        results.push({ x, y });
      }
    }
  }
  return results[0] || null;
}

function canReach(board, color, pieceChar, fx, fy, tx, ty) {
  const dx = tx - fx, dy = ty - fy;
  const adx = Math.abs(dx), ady = Math.abs(dy);
  const p = pieceChar.toUpperCase();
  if (p === "N") return (adx === 1 && ady === 2) || (adx === 2 && ady === 1);
  if (p === "K") return adx <= 1 && ady <= 1;
  if (p === "B") {
    if (adx !== ady) return false;
    return clearLine(board, fx, fy, tx, ty);
  }
  if (p === "R") {
    if (dx !== 0 && dy !== 0) return false;
    return clearLine(board, fx, fy, tx, ty);
  }
  if (p === "Q") {
    if (!(dx === 0 || dy === 0 || adx === ady)) return false;
    return clearLine(board, fx, fy, tx, ty);
  }
  return false;
}

function clearLine(board, fx, fy, tx, ty) {
  const sx = Math.sign(tx - fx), sy = Math.sign(ty - fy);
  let x = fx + sx, y = fy + sy;
  while (x !== tx || y !== ty) {
    if (board[y][x]) return false;
    x += sx; y += sy;
  }
  return true;
}

// Apply SAN move to board. Return new board (or same board if can't parse).
function applySan(board, san, color) {
  if (!san) return board;
  const b = cloneBoard(board);

  // Castling
  if (san === "O-O" || san === "O-O-O") {
    const rank = color === "w" ? 0 : 7;
    const kingPiece = color === "w" ? "K" : "k";
    const rookPiece = color === "w" ? "R" : "r";
    b[rank][4] = null;
    if (san === "O-O") {
      b[rank][6] = kingPiece;
      b[rank][5] = rookPiece;
      b[rank][7] = null;
    } else {
      b[rank][2] = kingPiece;
      b[rank][3] = rookPiece;
      b[rank][0] = null;
    }
    return b;
  }

  // Strip check/mate glyphs
  const clean = san.replace(/[+#!?]+$/, "");

  // Pawn move: e4, exd5, e8=Q, exd8=Q
  const pawnMatch = clean.match(/^([a-h])(?:x([a-h]))?([1-8])(?:=([QRBN]))?$/);
  if (pawnMatch) {
    const fromFile = pawnMatch[1];
    const toFile = pawnMatch[2] || pawnMatch[1];
    const toRank = parseInt(pawnMatch[3]);
    const promo = pawnMatch[4];
    const tx = "abcdefgh".indexOf(toFile);
    const ty = toRank - 1;
    const pawn = color === "w" ? "P" : "p";
    const dir = color === "w" ? -1 : 1;

    // Find the pawn
    const fx = "abcdefgh".indexOf(fromFile);
    let fy = null;
    for (let y = 0; y < 8; y++) {
      if (b[y][fx] === pawn) {
        if (pawnMatch[2]) { // capture
          if (Math.abs(fx - tx) === 1 && y + -dir === ty) { fy = y; break; }
        } else {
          // straight
          if (fx === tx) {
            if (y + -dir === ty) { fy = y; break; }
            // two-square initial push
            const startRank = color === "w" ? 1 : 6;
            if (y === startRank && y + -dir * 2 === ty) { fy = y; break; }
          }
        }
      }
    }
    if (fy == null) return b;
    b[fy][fx] = null;
    let placed = pawn;
    if (promo) placed = color === "w" ? promo : promo.toLowerCase();
    b[ty][tx] = placed;
    return b;
  }

  // Piece move: Nf3, Nxe5, Ngf3, N1f3, Ngxf3
  const pieceMatch = clean.match(/^([KQRBN])([a-h1-8])?(x)?([a-h])([1-8])$/);
  if (pieceMatch) {
    const piece = pieceMatch[1];
    const disambig = pieceMatch[2];
    const toFile = pieceMatch[4];
    const toRank = parseInt(pieceMatch[5]);
    const tx = "abcdefgh".indexOf(toFile);
    const ty = toRank - 1;
    const found = findPiece(b, color, piece, tx, ty, disambig);
    if (!found) return b;
    b[ty][tx] = color === "w" ? piece : piece.toLowerCase();
    b[found.y][found.x] = null;
    return b;
  }

  return b;
}

// Build board at ply index from FOCAL_PLIES.
function boardAtPly(plies, plyIndex) {
  let b = cloneBoard(STARTING_BOARD);
  for (let i = 1; i <= plyIndex && i < plies.length; i++) {
    const p = plies[i];
    b = applySan(b, p.san, p.color);
  }
  return b;
}

// Convert san destination square for a move (best-effort; for arrow drawing).
function sanDest(san) {
  if (!san) return null;
  const clean = san.replace(/[+#!?]+$/, "").replace(/=\w$/, "");
  if (clean === "O-O") return null;
  if (clean === "O-O-O") return null;
  const m = clean.match(/([a-h][1-8])$/);
  return m ? m[1] : null;
}

function squareToCoord(sq) {
  if (!sq || sq.length < 2) return null;
  return { x: "abcdefgh".indexOf(sq[0]), y: parseInt(sq[1]) - 1 };
}

Object.assign(window, {
  STARTING_BOARD, boardAtPly, applySan, sanDest, squareToCoord, fileCh,
});
