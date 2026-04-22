# Copilot Instructions (Repository)

## Product
Build a simple spot-price controlled EV charging scheduler with a beautiful minimal web UI.

## Tech preferences
- Prefer Next.js (App Router) + TypeScript if possible.
- Use a simple local persistence: SQLite (preferred) or JSON file fallback.
- Keep dependencies minimal.

## Code style
- Small functions, clear naming, no cleverness.
- Validate inputs on both client and server.
- Separate concerns: scheduling logic in its own module with unit tests.

## UX
- Minimal, modern design, responsive.
- Price chart must be readable, with selected charging hours clearly highlighted.
- Show a clear textual summary of the schedule and estimated cost.

## Testing
- Add unit tests for scheduling logic (edge cases: insufficient hours, threshold too low, window wraps midnight).
