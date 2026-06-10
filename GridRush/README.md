# GridRush: The Logic Race

A browser implementation of the GridRush board game (iClover, Group 4).

## Run

Open `index.html` in any modern browser. No build step required.

> Note: `board.svg` is loaded via `<object>`. If your browser blocks `file://`
> requests, run a tiny local server instead, e.g.:
>
> ```
> python3 -m http.server 8000
> ```
> Then open http://localhost:8000.

## Files

- `index.html` — Markup and panels
- `style.css` — Styling
- `game.js`   — Game logic (dice, timer, Sudoku validation, movement, win condition, sudden death)
- `board.svg` — Original board artwork
- `logo.png`  — iClover brand logo

## Rules implemented

- 2–4 players, clover-shaped tokens (Blue/Red/Green/White)
- Must roll a 6 to enter the track from START
- Each turn: roll dice → 15 s to place that number into a valid grid cell
- Sudoku validation: rows, columns, and 2×3 boxes
- Wrong placement or timeout → no movement
- "Move Ahead 2" green spaces add +2; "Lose Next Turn" red spaces skip the next turn
- If no legal cell exists for the rolled number, the player stays
- First to reach (or pass) FINISH wins
- Sudden Death: if the grid fills before anyone wins, rolls move directly

*Race the Grid. Master the Mind.*
