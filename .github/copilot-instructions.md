# Copilot Instructions

## Game structure

This is a dependency-free browser game that models six IBDP subject scores and the TOK/EE core grades. Keep application code in the three separate files:

- `index.html` defines the Japanese game UI and loads the stylesheet and script.
- `style.css` styles the responsive timing meter, HL/SL color modes, score history, and final results.
- `game.js` owns the eight-round flow, mode-dependent meter animation, TOK/EE core matrix, and IBDP criteria checks.

## Run and validate

- Open `index.html` directly, or serve the repository root with `python3 -m http.server 8000`.
- Check JavaScript syntax with `node --check game.js`.
- There is no configured build system, linter, or automated test suite.

## Game behavior

- Group1–Group3 are HL numeric meters (0–7) and Group4–Group6 are SL numeric meters (0–7); HL runs faster than SL and the modes use distinct colors.
- TOK and EE are letter-grade meters (A–E). The game has eight rounds total.
- The final result checks total points (including the TOK/EE core matrix), no E in TOK/EE, subject minimums, number of low scores, and HL/SL subtotals.
- Keep the IBDP core point table and pass criteria in sync with `README.md`.
- Keep gameplay state in `game.js` and avoid adding framework or build dependencies for this static game.
- `README.md` contains player instructions and local startup steps.
