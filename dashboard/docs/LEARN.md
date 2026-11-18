# Learn RouteSentinel

This dashboard is a small, self-contained teaching project. It ports the Python
detector's rules into TypeScript, then lets you replay two synthetic feeds in the
browser and inspect the evidence behind every alert. Nothing here talks to a
router, a live BGP feed or the Python API at runtime.

Use this file as a guided tour. Every section names the files involved so you can
read the code next to the explanation.

## 1. The mental model

One **route event** describes what a network claims to be announcing:

```text
timestamp  prefix              origin AS  AS path          RPKI status
00:00:03   203.0.113.0/24      64666      64496 → 64666    invalid
```

One **protected asset** describes what you expect:

```text
prefix              expected origin  anycast origin
203.0.113.0/24      AS64500          AS64501
```

The detector does five things, in this order:

1. Canonicalise the event prefix.
2. Find the **least-specific** protected asset that contains it.
3. Check for a more-specific announcement.
4. Check the origin against the asset's expected and anycast origins.
5. Check RPKI status, AS-path length and bogon space.

A finding is emitted only when a check fails. The order matters because it is the
order the Python backend uses, and the browser demo is meant to be a faithful
port rather than a nicer-looking reimplementation.

## 2. Where the rules live

| Concern | TypeScript | Python source of truth |
| --- | --- | --- |
| Prefix parsing and canonicalisation | `src/lib/engine.ts` | `routesentinel/models.py` |
| Detection order and severities | `src/lib/engine.ts` | `routesentinel/detector.py` |
| Bogon classification | `src/lib/engine.ts` | `routesentinel/detector.py` |
| Shared demo data | `src/data/fixtures.ts` | `tests/test_detector.py` |
| Tour content | `src/data/tour.ts` | dashboard copy |
| Marketing copy | `src/data/content.ts` | dashboard copy |

The engine is pure: no React, no DOM, no network. That is why the simulator and
the tests can share it without mocking anything.

## 3. Canonicalisation

`parsePrefix` accepts IPv4 text, clears host bits and returns a canonical string:

```ts
canonicalPrefix('203.0.113.5/24'); // '203.0.113.0/24'
canonicalPrefix('203.0.113.5');    // '203.0.113.5/32'
```

IPv6 returns a typed `unsupported` result instead of throwing. The Python backend
accepts an IPv6 prefix and then fails while matching it to an IPv4 asset, so the
demo chooses an honest local result rather than reproducing an HTTP 500. See
`docs/BACKEND-NOTES.md`.

Malformed prefixes return `null` from `canonicalPrefix` and an `invalid` result
from `parsePrefix`.

## 4. Least-specific matching

If two protected assets contain the event, the broader one wins:

```text
asset A: 203.0.0.0/16
asset B: 203.0.113.0/24
event:   203.0.113.128/25
match:   asset A  (prefix length 16 is smaller than 24)
```

This mirrors `min(matches, key=lambda item: item[1].prefixlen)` in the backend.
The fixture `NESTED_ASSETS` and the test `least-specific matching` pin it.

A consequence worth noticing: because the `/16` wins, the `/25` is automatically
"more specific" and raises `unexpected-subprefix`. The rule is simple, but it is
not the same as "closest match".

## 5. The six findings

| Kind | Severity | Trigger |
| --- | --- | --- |
| `unexpected-subprefix` | high | Event prefix is longer than the matched asset |
| `unexpected-origin` | high | Origin AS is not in expected or anycast origins |
| `rpki-invalid` | critical | Event's `roa` is `invalid` |
| `rpki-unknown` | medium | Event's `roa` is `unknown` |
| `long-as-path` | medium | AS path has more than 32 hops |
| `bogon-prefix` | high | Prefix is in private, loopback, link-local, multicast or reserved space |

Documentation ranges (`192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`) are
explicitly allowed before the bogon test, because Python's `is_private` flags
them in recent versions.

## 6. Confidence is not a probability

The backend assigns one of three fixed values:

```text
0.95  RPKI invalid
0.82  origin is allowed
0.90  anything else
```

It is a ranking hint attached to a finding. It is not calibrated and it does not
mean "95% likely to be a hijack". The UI repeats this in the results note and in
the FAQ so the number is not over-read.

The backend only returns findings, and only attaches confidence to findings. A
clean event produces an empty list, so no confidence is stored for it. The
browser engine returns an `EventResult` with a confidence for every matched
event so the evidence panel always has something to show; treat that value as a
demo convenience, not a backend field.

## 7. The fixtures

`src/data/fixtures.ts` is the single source of demo data. It contains:

- two assets: a documentation prefix and a private range;
- eight events: three clean, five incident;
- `EXPECTED`, a table of exact kinds, severities and confidence values;
- `EXPECTED_TOTALS` and `EXPECTED_BY_KIND` for the results section;
- `NESTED_ASSETS` for the least-specific test.

The tests import the same fixtures. If a fixture changes, the engine tests and
the UI tests change together, which is the point.

### Worked example: E4

```text
prefix      203.0.113.128/25
origin      AS64666
AS path     64496 → 64666
RPKI        unknown
```

Against `203.0.113.0/24` (expected AS64500, anycast AS64501):

1. `/25` is longer than `/24` → `unexpected-subprefix`, high.
2. AS64666 is not allowed → `unexpected-origin`, high.
3. RPKI is unknown → `rpki-unknown`, medium.

Three findings, confidence `0.90` because the origin is not allowed and RPKI is
not invalid. The simulator shows the same three findings when you select E4.

## 8. Feed totals

Alerts are counted **per finding**, not per event. The incident feed has five
events and eight findings:

```text
1 critical  (E3 rpki-invalid)
4 high      (E3 origin, E4 subprefix, E4 origin, E8 bogon)
3 medium    (E4 rpki-unknown, E5 rpki-unknown, E6 long path)
```

The clean feed has three events and zero findings. `runFeed` computes both totals
from the fixtures; no number is hard-coded in a component.

## 9. The simulator

`src/components/Simulator.tsx` is a thin shell around a reducer in
`src/components/simulator/model.ts`.

```text
run clean      → evaluate the clean feed, select its first event
run incident   → evaluate the incident feed, select its first event
run both       → evaluate both feeds, select the first incident event
select         → change the evidence panel
threshold      → filter visible findings, not stored totals
reset          → return to the initial state
```

Why a reducer? Every button produces exactly one predictable state transition,
and the reducer can be reasoned about without a browser. The components only
render state and dispatch actions.

The severity slider filters the findings list at or above the chosen level. It
does not change the totals, because the totals describe the replay, not the
current view.

## 10. The hero tour

`src/hooks/useTour.ts` drives five tabs. The progress bar is CSS; when its
animation ends, `onBarEnd` advances the tour. Hover, focus, the pause button, a
hidden document and an off-screen window all suspend advancement.

Keyboard support follows the WAI-ARIA tabs pattern:

- `ArrowRight` / `ArrowLeft` move and wrap;
- `Home` / `End` jump to the first or last tab;
- only the active tab is in the tab order;
- the panel is labelled by the active tab.

Reduced motion disables the fade and the auto-advance, so the tour becomes a
manual tab switcher.

## 11. Accessibility choices

- A skip link is the first focusable element.
- The page has one `h1`; section headings are `h2`, cards and steps use `h3`.
  Footer column headings are `h3` rather than `h5` so the heading order never
  jumps.
- The tour uses real `role="tab"` buttons with `aria-selected`, `aria-controls`
  and roving `tabIndex`.
- The simulator's severity control is a labelled range input with an `output`.
- The evidence panel and verdict chip use polite live regions.
- External links carry `rel="noopener noreferrer"`.
- `vitest-axe` runs over the full page in `src/__tests__/a11y.test.tsx`.
- `prefers-reduced-motion` removes the reveal, the flow animation and the tour
  progress bar.

## 12. Testing strategy

| Layer | File | What it proves |
| --- | --- | --- |
| Engine | `src/__tests__/engine.test.ts` | Exact findings, order, severity, confidence, bogons, canonicalisation, least-specific match, known limitations |
| Fixtures | `src/__tests__/fixtures.test.ts` | Data shape, safety of address space, expectations stay in sync with the engine |
| Content | `src/__tests__/content.test.tsx` | Anchors resolve, external links are safe, banned phrases absent, no `dangerouslySetInnerHTML` |
| Simulator | `src/__tests__/Simulator.test.tsx` | Reducer behaviour, totals, selection, threshold filtering, reset |
| Tour | `src/__tests__/TourWindow.test.tsx` | Animation-driven advance, hold on hover/focus, pause, keyboard, reduced motion |
| FAQ | `src/__tests__/Faq.test.tsx` | Native disclosure behaviour and the IPv6 answer |
| A11y | `src/__tests__/a11y.test.tsx` | No axe violations on the full page |
| Browser | `e2e/smoke.spec.ts` | Real layout, overflow, replay, links, keyboard |
| Visual | `e2e/visual.spec.ts` | Committed screenshots at desktop and mobile |

Coverage thresholds in `vite.config.ts` are 80% lines/statements/functions and
75% branches overall. The current suite is well above that, with `src/lib` and
`src/data` effectively fully covered.

## 13. Exercises

1. Add a `/25` event inside the private asset and predict its findings before
   running it. (It should raise `bogon-prefix` and possibly
   `unexpected-subprefix`.)
2. Change `MAX_AS_PATH` to 16 and find which fixtures now alert.
3. Add a third asset nested inside `203.0.113.0/24` and confirm the least-specific
   rule still picks the `/24`.
4. Add a malformed prefix to a fixture and confirm the simulator shows no
   findings instead of crashing.
5. Delete the `documentation` allowlist in `isBogon` and watch E1 fail. That is
   why the allowlist exists.

## 14. What this project is not

It is not a BGP speaker, a route collector, an RPKI validator, a mitigation tool
or a production monitor. It does not fetch ROAs, compare `origin_as` with the
tail of `as_path`, de-duplicate replays or support IPv6 in the demo. Those limits
are deliberate and are recorded in `docs/BACKEND-NOTES.md`.
