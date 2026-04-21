// Fixture data for the prototype. One focal game with rich annotations.
// Evals are in centipawns from White's POV. Positive = White better.

const SAMPLE_GAMES = [
  {
    id: "g-2026-04-18",
    opponent: "kn1ghtr1der",
    oppRating: 1612,
    youRating: 1584,
    result: "loss",           // "win" | "loss" | "draw"
    color: "white",
    timeControl: "10+0",
    playedAt: "2026-04-18",
    ply: 42,
    errorCount: 3,
    interest: 0.92,
    opening: "Italian Game, Giuoco Piano",
    phase: "unreviewed",      // "unreviewed" | "in_progress" | "done"
    focal: true,
  },
  {
    id: "g-2026-04-17a",
    opponent: "rookiemoves",
    oppRating: 1554,
    youRating: 1581,
    result: "win",
    color: "black",
    timeControl: "10+0",
    playedAt: "2026-04-17",
    ply: 58,
    errorCount: 1,
    interest: 0.71,
    opening: "Caro-Kann, Advance Variation",
    phase: "done",
  },
  {
    id: "g-2026-04-17b",
    opponent: "BishopsPair",
    oppRating: 1623,
    youRating: 1579,
    result: "loss",
    color: "black",
    timeControl: "10+0",
    playedAt: "2026-04-17",
    ply: 31,
    errorCount: 4,
    interest: 0.68,
    opening: "Ruy Lopez, Berlin Defense",
    phase: "in_progress",
  },
  {
    id: "g-2026-04-16",
    opponent: "pawnstorm99",
    oppRating: 1490,
    youRating: 1571,
    result: "win",
    color: "white",
    timeControl: "5+0",
    playedAt: "2026-04-16",
    ply: 48,
    errorCount: 2,
    interest: 0.55,
    opening: "King's Indian Attack",
    phase: "done",
  },
  {
    id: "g-2026-04-15",
    opponent: "endgamewizard",
    oppRating: 1648,
    youRating: 1569,
    result: "draw",
    color: "white",
    timeControl: "15+10",
    playedAt: "2026-04-15",
    ply: 76,
    errorCount: 1,
    interest: 0.49,
    opening: "Queen's Gambit Declined",
    phase: "done",
  },
  {
    id: "g-2026-04-14",
    opponent: "openingtheory",
    oppRating: 1532,
    youRating: 1573,
    result: "loss",
    color: "black",
    timeControl: "10+0",
    playedAt: "2026-04-14",
    ply: 29,
    errorCount: 3,
    interest: 0.42,
    opening: "Sicilian Defense, Najdorf",
    phase: "unreviewed",
  },
];

// The focal game. 42 plies. We'll store a tiny sample of FENs at critical points;
// for the rest we synthesize a coarse position via move strings (the board is
// schematic — we don't need chess.js for a prototype).
//
// Move classifications: "book" | "best" | "good" | "ok" | "inaccuracy" | "mistake" | "blunder" | "brilliant"
// eval is post-move (centipawns, White POV). null means "book" / not computed.

const FOCAL_GAME = {
  id: "g-2026-04-18",
  opponent: "kn1ghtr1der",
  oppRating: 1612,
  you: "you",
  youRating: 1584,
  youColor: "white",
  result: "0-1",
  date: "April 18, 2026",
  timeControl: "10+0",
  opening: "Italian Game, Giuoco Piano",
  ecoCode: "C50",
  // Move list (SAN), 1-indexed in pairs.
  // Each entry: { san, color, eval, class, clock, comment?, fen? }
  moves: [
    { n: 1, white: { san: "e4",    class: "book", eval:   20, clock: "9:58" },
            black: { san: "e5",    class: "book", eval:   20, clock: "9:57" } },
    { n: 2, white: { san: "Nf3",   class: "book", eval:   25, clock: "9:56" },
            black: { san: "Nc6",   class: "book", eval:   25, clock: "9:55" } },
    { n: 3, white: { san: "Bc4",   class: "book", eval:   30, clock: "9:54" },
            black: { san: "Bc5",   class: "book", eval:   30, clock: "9:51" } },
    { n: 4, white: { san: "c3",    class: "book", eval:   35, clock: "9:52" },
            black: { san: "Nf6",   class: "book", eval:   35, clock: "9:48" } },
    { n: 5, white: { san: "d4",    class: "good", eval:   30, clock: "9:45" },
            black: { san: "exd4",  class: "best", eval:   30, clock: "9:44" } },
    { n: 6, white: { san: "cxd4",  class: "good", eval:   25, clock: "9:40" },
            black: { san: "Bb4+",  class: "best", eval:   25, clock: "9:42" } },
    { n: 7, white: { san: "Nc3",   class: "good", eval:   30, clock: "9:32" },
            black: { san: "Nxe4",  class: "best", eval:   30, clock: "9:38" } },
    { n: 8, white: { san: "O-O",   class: "good", eval:   25, clock: "9:20" },
            black: { san: "Bxc3",  class: "best", eval:   30, clock: "9:30" } },
    { n: 9, white: { san: "d5",    class: "good", eval:   40, clock: "9:05" },
            black: { san: "Bf6",   class: "ok",   eval:   55, clock: "9:15" } },
    { n: 10, white: { san: "Re1",  class: "best", eval:   60, clock: "8:42" },
             black: { san: "Ne7",  class: "inaccuracy", eval: 110, clock: "8:55" } },
    { n: 11, white: { san: "Rxe4", class: "best", eval:  120, clock: "8:25" },
             black: { san: "d6",   class: "good", eval:  120, clock: "8:30" } },
    { n: 12, white: { san: "Bg5",  class: "best", eval:  130, clock: "8:02" },
             black: { san: "Bxg5", class: "ok",   eval:  145, clock: "8:05" } },
    { n: 13, white: { san: "Nxg5", class: "best", eval:  145, clock: "7:50" },
             black: { san: "O-O",  class: "best", eval:  140, clock: "7:45" } },
    { n: 14, white: { san: "Qh5",  class: "best", eval:  180, clock: "7:15",
                      comment: "Attack building. Threat on h7." },
             black: { san: "h6",   class: "ok",   eval:  190, clock: "7:02" } },
    { n: 15, white: { san: "Rh4",  class: "brilliant", eval: 280, clock: "6:40",
                      comment: "Quiet rook lift — key piece to the attack." },
             black: { san: "Ng6",  class: "inaccuracy", eval: 330, clock: "6:10" } },
    // === Critical moment 1: move 16 — you had a winning tactic ===
    { n: 16, white: { san: "Nxf7", class: "mistake", eval:   80, clock: "5:55",
                      isCritical: true,
                      comment: "You went for the flashy sacrifice. There was something quieter and stronger.",
                      playerMove: "Nxf7",
                      bestMove: "Qxg6",
                      bestLine: ["Qxg6", "fxg6", "Rxh6", "gxh6", "Rh4", "Kg7"],
                      evalBefore: 330, evalAfter: 80,
                      conceptName: "Missed decisive sacrifice",
                      conceptTag: "Tactics · Attack",
                      concepts: ["Mating net", "Quiet move", "Overworked defender"],
                      square: "f7",
                      coachSocratic: [
                        "Pause — before calculating any capture, count the defenders of h7 and h6.",
                        "If your knight vanished, which of your pieces would still be threatening the king? And which Black pieces are holding things together?",
                        "What does the g6 knight do for Black? What happens if that piece disappears?",
                      ],
                      coachJudge: {
                        // What the coach says about the *played* move vs. what the user suggests.
                        played: "Nxf7 wins the exchange and the pawn, but trades your most active attacker for a rook. The engine's eval falls from +3.3 to +0.8 — still better, but no longer winning.",
                      },
                      userAttempts: [
                        { move: "Qxh6", verdict: "close",
                          note: "Strong idea! But after 16...Qxh6 gxh6 17.Rxh6, Black has Ng6–e7 covering f5 and blocking. You're still better, but it's not the killer.",
                          evalAfter: 170 },
                        { move: "Qxg6", verdict: "best",
                          note: "Yes — this is the move. The queen sacrifice forces fxg6 (otherwise Qxh7#), and now Rxh6 gxh6 Rh4 creates an unstoppable mating threat with just rook, bishop and pawns.",
                          evalAfter: 550 },
                        { move: "Rxh6", verdict: "inaccurate",
                          note: "Too early. After gxh6 Qxh6, Black has Ne7 covering everything. You've given up the rook for only two pawns.",
                          evalAfter: 40 },
                      ],
                      examples: [
                        { title: "Pattern: rook lift + queen sac on g6",
                          caption: "Short vs. Timman, 1991 — the exact motif. King's rook joins the attack, queen clears a file.",
                          fen: "r1bq1rk1/ppp2ppp/2n2n2/2bp4/2B5/2N2N2/PPPP1PPP/R1BQ1RK1" },
                      ],
                    },
             black: { san: "Rxf7", class: "best", eval:   80, clock: "5:30" } },
    { n: 17, white: { san: "Rxh6", class: "ok",   eval:   50, clock: "5:20" },
             black: { san: "gxh6", class: "best", eval:   60, clock: "5:10" } },
    { n: 18, white: { san: "Qxg6+", class: "ok", eval:   40, clock: "5:00" },
             black: { san: "Rg7",  class: "best", eval:   45, clock: "4:55" } },
    { n: 19, white: { san: "Qxh6", class: "ok",  eval:   30, clock: "4:42" },
             black: { san: "Bf5",  class: "best", eval:   25, clock: "4:25" } },
    { n: 20, white: { san: "Qh5",  class: "good", eval:   10, clock: "4:10" },
             black: { san: "Qf6",  class: "best", eval:   0, clock: "4:00" } },
    // === Critical moment 2: move 21 — you lost track of a simple defender ===
    { n: 21, white: { san: "Nd2",  class: "blunder", eval: -220, clock: "3:40",
                      isCritical: true,
                      comment: "This walks into a fork you could have seen. The knight was defending e4.",
                      playerMove: "Nd2",
                      bestMove: "Re1",
                      bestLine: ["Re1", "Bg4", "f3", "Bh5"],
                      evalBefore: 0, evalAfter: -220,
                      conceptName: "Overlooked defender",
                      conceptTag: "Blunder-check · Defender",
                      concepts: ["Hanging piece", "Tactical vision", "Blunder-check"],
                      square: "e4",
                      coachSocratic: [
                        "Before any move, one question: which of my pieces are undefended right now?",
                        "Your rook on e4 — who defends it after Nd2?",
                        "What does Black's bishop see from f5?",
                      ],
                      coachJudge: {
                        played: "Nd2 loses the exchange. After Bxe4 Nxe4 Qxb2, you've lost a whole rook for a knight with no compensation.",
                      },
                      userAttempts: [
                        { move: "Re1", verdict: "best",
                          note: "Exactly right — preserve the rook, keep the extra pawn, and the position is roughly equal.",
                          evalAfter: 0 },
                        { move: "Re3", verdict: "inaccurate",
                          note: "The rook stays defended, but Bxh3 gxh3 Qxh5 wins a pawn and exposes your king.",
                          evalAfter: -80 },
                      ],
                      patternMatch: {
                        count: 3,
                        title: "You've made this mistake 3 times this month",
                        detail: "In each case you moved a minor piece without checking whether it was the last defender of a pawn or rook.",
                      },
                    },
             black: { san: "Bxe4", class: "best", eval: -220, clock: "3:35" } },
    { n: 22, white: { san: "Nxe4", class: "ok",  eval: -230, clock: "3:20" },
             black: { san: "Qxb2", class: "best", eval: -240, clock: "3:10" } },
    { n: 23, white: { san: "Rb1",  class: "good", eval: -200, clock: "3:00" },
             black: { san: "Qxa2", class: "best", eval: -210, clock: "2:50" } },
    { n: 24, white: { san: "Qh4",  class: "ok",  eval: -240, clock: "2:30" },
             black: { san: "Qa5",  class: "good", eval: -240, clock: "2:15" } },
    { n: 25, white: { san: "Ng3",  class: "good", eval: -220, clock: "2:00" },
             black: { san: "c6",   class: "best", eval: -230, clock: "1:50" } },
    { n: 26, white: { san: "d5",   class: "inaccuracy", eval: -310, clock: "1:35" },
             black: { san: "cxd5",  class: "best", eval: -320, clock: "1:28" } },
    { n: 27, white: { san: "Bxd5", class: "ok",  eval: -330, clock: "1:20" },
             black: { san: "Rc7",  class: "best", eval: -340, clock: "1:05" } },
    { n: 28, white: { san: "Qd4",  class: "mistake", eval: -560, clock: "0:50",
                      isCritical: true,
                      comment: "The queen walks into a pin. Time pressure showing here.",
                      playerMove: "Qd4",
                      bestMove: "Nf5",
                      evalBefore: -340, evalAfter: -560,
                      concepts: ["Pin", "Time pressure"],
                      conceptName: "Walking into a pin",
                      conceptTag: "Time pressure · Pin",
                      square: "d4",
                      coachSocratic: [
                        "Your queen is heavy material. Before placing it on d4, what piece could attack it along the long diagonal?",
                      ],
                      userAttempts: [],
                    },
             black: { san: "Rd7",  class: "best", eval: -560, clock: "0:58" } },
    { n: 29, white: { san: "Qc4",  class: "ok",  eval: -600, clock: "0:35" },
             black: { san: "Rxd5", class: "best", eval: -620, clock: "0:50" } },
    { n: 30, white: { san: "Qxd5", class: "ok",  eval: -620, clock: "0:20" },
             black: { san: "Qxa1", class: "best", eval: -650, clock: "0:45" } },
    { n: 31, white: { san: "Kf1", class: "ok",   eval: -700, clock: "0:10" },
             black: { san: "Qxb1+", class: "best", eval: -720, clock: "0:40" } },
  ],
};

// Flattened ply list for navigation. Index 0 = start position.
function flattenPlies(game) {
  const plies = [{ fen: "start", san: null, ply: 0, moveNo: 0, color: null, eval: 20, class: "book" }];
  game.moves.forEach((m) => {
    if (m.white) plies.push({ ...m.white, moveNo: m.n, color: "w", ply: plies.length });
    if (m.black) plies.push({ ...m.black, moveNo: m.n, color: "b", ply: plies.length });
  });
  return plies;
}

const FOCAL_PLIES = flattenPlies(FOCAL_GAME);

// Critical moment indices (ply indices into FOCAL_PLIES)
const CRITICAL_PLIES = FOCAL_PLIES
  .map((p, i) => p.isCritical ? i : -1)
  .filter((i) => i >= 0);

// Pattern stats derived across the month.
const PATTERN_STATS = [
  { tag: "Overlooked defender", count: 7, trend: "up",
    detail: "Moving a minor piece that was quietly holding a rook or central pawn.",
    lastSeen: "Today",
    severity: "high" },
  { tag: "Queen forays", count: 4, trend: "flat",
    detail: "Bringing the queen out too early without support.",
    lastSeen: "2d ago",
    severity: "med" },
  { tag: "Missed tempo", count: 6, trend: "down",
    detail: "Preferring safe developing moves over forcing sequences.",
    lastSeen: "Today",
    severity: "med" },
  { tag: "Time-pressure drift", count: 3, trend: "up",
    detail: "Eval swings in the final 60 seconds.",
    lastSeen: "Today",
    severity: "high" },
];

const DRILL_SUGGESTIONS = [
  { title: "Mating nets with rook-lift",
    from: "Move 15 of this game",
    difficulty: "Intermediate",
    length: "5 positions",
    tag: "Tactics" },
  { title: "Blunder-check: overlooked defenders",
    from: "Recurring pattern",
    difficulty: "Foundational",
    length: "8 positions",
    tag: "Calculation" },
  { title: "Italian Game, Giuoco Piano — main line",
    from: "Opening deviation at move 9",
    difficulty: "Opening",
    length: "12 moves",
    tag: "Opening" },
];

Object.assign(window, {
  SAMPLE_GAMES, FOCAL_GAME, FOCAL_PLIES, CRITICAL_PLIES, PATTERN_STATS, DRILL_SUGGESTIONS,
});
