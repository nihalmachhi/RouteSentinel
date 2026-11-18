# Decisions

This file records the choices that shaped the dashboard, especially where the
reference design and the backend disagreed. Each entry states the decision, the
reason and the cost.

## 1. Port the reference layout instead of inventing a new one

**Decision.** Keep the structure, spacing, type scale and interaction model of
`TraceForge-v5__1_.html`, replacing only the project-specific content.

**Why.** The reference is a proven single-page marketing layout with a hero tour,
pipeline steps, an interactive simulator, results cards, a bento grid, quick
start, scope, FAQ and a flow diagram. Reusing it keeps the three DevOps sites
visually consistent and makes the port reviewable.

**Cost.** Some class names and section shapes are inherited even where the
content differs. The CSS is split into `tokens`, `base`, `layout`, `components`
and `animations` so the inherited rules stay readable.

**Reference copy.** The built reference DOM is committed at
`e2e/reference.html`. It is a reading aid and a visual baseline, not a runtime
dependency.

## 2. React 18 + TypeScript strict + Vite 5, no UI library or router

**Decision.** Use React 18.3.1, TypeScript 5.9.3 and Vite 5.4.21 with strict mode,
plain CSS and in-page anchors.

**Why.** The page is a single document with anchor navigation. A router would add
state and history for no benefit. A component library would fight the reference
styling. Strict TypeScript catches the fixture and engine shape errors that
matter most here.

**Cost.** Reusable widgets such as tabs and disclosures are hand-written. They
are small and covered by tests, so the maintenance cost stays low.

## 3. Keep the engine pure and share it with the tests

**Decision.** Put all detection logic in `src/lib/engine.ts` as pure functions.
The simulator, results section and tests all call the same functions.

**Why.** A demo that hard-codes its own output can drift from the backend without
anyone noticing. A shared engine makes the fixtures executable documentation.

**Cost.** The browser engine has to reproduce backend quirks, including the
least-specific match and the missing `origin_as`/`as_path` cross-check. Those
quirks are documented rather than silently fixed.

## 4. Use `useReducer` for the simulator

**Decision.** Model replay state as a reducer with explicit actions.

**Why.** There are five actions (`run`, `run-both`, `select`, `threshold`,
`reset`) and several derived values. A reducer keeps transitions atomic and makes
the tests read like a specification.

**Cost.** Slightly more code than local `useState` calls. The payoff is that the
state machine can be tested without rendering.

## 5. Derive results from fixtures, never duplicate numbers

**Decision.** `Results`, the simulator totals and the tests all compute from
`ASSETS` and `EVENTS` via `runFeed`.

**Why.** The page claims "8 alerts: 1 critical, 4 high, 3 medium". If that number
were typed into JSX, a fixture change would make the page lie. The tests pin the
same expectations independently.

**Cost.** The results section runs the engine at render time. It is a handful of
events, so the cost is negligible.

## 6. Canonicalise IPv4 and return a typed IPv6 result

**Decision.** Implement IPv4 parsing and canonicalisation in TypeScript. Return
`{ ok: false, reason: 'unsupported' }` for IPv6 rather than throwing.

**Why.** The demo needs deterministic matching without a network stack. IPv6 in
the backend currently produces an HTTP 500 when matched against an IPv4 asset, so
pretending to support it would be dishonest.

**Cost.** The browser engine is not a general IP library. It intentionally
supports only the IPv4 subset the demo uses.

## 7. Label all data as synthetic

**Decision.** Every visible disclaimer says the prefixes, ASNs and scores are
synthetic. Documentation ranges and private space are used throughout.

**Why.** A route-hijack demo that looks like live data invites false conclusions.
Documentation ranges are safe to publish and easy to recognise.

**Cost.** The demo cannot show real-world route diversity. That is acceptable for
a teaching tool.

## 8. Keep the backend untouched except for documentation

**Decision.** Do not edit Python source. Record backend limitations in
`docs/BACKEND-NOTES.md` and adapt the demo honestly.

**Why.** The task is a dashboard port. Changing detector semantics would require
new backend tests and could break the API contract. Documenting the gap is more
useful than quietly patching one side.

**Cost.** The demo shows a local "unsupported" result for IPv6 and does not
reproduce the backend's HTTP 500. The notes explain the difference.

## 9. Accessibility is part of the port, not a later pass

**Decision.** Use semantic landmarks, one `h1`, ordered headings, real buttons,
a labelled range input, live regions, a skip link, visible focus and reduced
motion from the start.

**Why.** Retrofitting accessibility into a visual port usually leaves gaps. The
reference already has a strong structure; the port keeps it and fixes the
heading-order issue in the footer.

**Cost.** The footer column headings are `h3` instead of the reference's `h5`.
The visual result is identical because the styles are class-based.

## 10. Test behaviour, not snapshots

**Decision.** Use Testing Library queries and engine assertions. Do not commit
component snapshots. Use Playwright only for browser-level smoke and visual
checks.

**Why.** Snapshots fail on harmless markup changes and hide intent. Behavioural
tests describe what the page must do.

**Cost.** Some structural regressions are only caught by the Playwright visual
spec. That is the right layer for them.

## 11. Coverage thresholds at 80/75

**Decision.** Enforce 80% lines, statements and functions, and 75% branches.

**Why.** The project brief asks for at least 80% overall and 90% on `src/lib` and
`src/data`. The suite currently clears both comfortably. A single global
threshold is simple to run in CI and in a pre-push check.

**Cost.** The threshold is a floor, not a target. Reviewers should still read the
coverage report rather than trusting the number.

## 12. Playwright visual checks with reduced motion

**Decision.** Run visual tests with `prefers-reduced-motion: reduce`, disable
animations and hide the SMIL flow dot before taking screenshots.

**Why.** Animated screenshots are flaky. Reduced motion makes the tour static and
the reveal immediate, so the captured pixels represent the layout rather than a
random animation frame.

**Cost.** The visual test does not prove that the animations work. The Vitest tour
tests cover the behaviour, and the smoke test covers the interactive states.

## 13. Pin exact dependency versions and commit the lockfile

**Decision.** Every dependency in `package.json` is an exact version, and
`package-lock.json` is committed. CI uses `npm ci`.

**Why.** Reproducible builds and a reviewable dependency diff. Floating ranges
make a marketing site fail for reasons unrelated to its code.

**Cost.** Upgrades are explicit pull requests. That is intentional.

## 14. Deploy to GitHub Pages with a project base path

**Decision.** Build with `VITE_BASE=/RouteSentinel/` and deploy `dashboard/dist`
through the Pages workflow.

**Why.** The repository is a project site, so assets must resolve under the
repository name. Local development uses the same default.

**Cost.** A user who opens `dist/index.html` from the filesystem sees broken asset
paths. The README points to `npm run preview` instead.

## 15. No claims beyond the backend

**Decision.** The copy says offline replay, read-only alerts, evidence retention,
role checks and the six checks. It does not claim live feeds, mitigation, IPv6,
de-duplication or production readiness.

**Why.** The backend genuinely implements the first list and genuinely lacks the
second. The FAQ and scope sections state the gaps in plain language.

**Cost.** The page is less impressive than it could be. It is also accurate, which
matters more for a security-themed demo.
