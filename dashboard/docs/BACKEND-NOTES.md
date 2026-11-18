# Backend notes

The dashboard is a faithful port of the Python detector, not a replacement for
it. This file records what the backend actually does, where it differs from the
demo, and which limitations are visible to a user. No Python source was changed
for the dashboard work.

All observations below were made against the repository at the time of the
dashboard port, with `uv sync --extra dev` and `uv run pytest`.

## Verified behaviour

```text
$ uv run pytest -q
5 passed
```

The five tests cover detector expectations, asset/event validation, and the
viewer/operator/admin checks. The API is a single-process FastAPI app created by
`routesentinel/api.py`.

## Limitations and quirks

### 1. IPv6 produces HTTP 500

`detect()` calls `ipaddress.ip_network(event.prefix)` and then
`network.subnet_of(protected)`. An IPv6 event against an IPv4 asset raises a
`TypeError`, which FastAPI returns as HTTP 500.

Reproduction:

```python
c.post("/api/v1/replay", headers=operator, json={"events": [{
    "timestamp": "2026-01-01T00:00:00Z",
    "prefix": "2001:db8::/32",
    "origin_as": 64500,
    "as_path": [64500],
    "roa_status": "valid",
}]})
# 500 Internal Server Error
```

**Demo handling.** `parsePrefix` returns an `unsupported` result for IPv6 and the
simulator shows no findings. The FAQ says IPv6 is not covered by the demo and
names the backend limitation.

**Suggested backend fix (not applied).** Reject mixed address families with a
422 before detection, or compare `version` before calling `subnet_of`.

### 2. `origin_as` is never compared with the tail of `as_path`

The detector trusts the `origin_as` field. An event can claim AS64500 while its
path ends in AS64666 and still pass if RPKI is valid and AS64500 is allowed.

Reproduction:

```python
{"origin_as": 64500, "as_path": [64496, 64666], "roa_status": "valid"}
# alert_count == 0
```

**Demo handling.** The port preserves the behaviour, and the engine test
`does not compare origin_as with the tail of as_path` documents it.

**Suggested backend fix (not applied).** If `as_path` is non-empty, compare
`origin_as` with `as_path[-1]` and raise an `origin-path-mismatch` finding. That
is a semantic change and needs its own severity decision.

### 3. Replayed events are not de-duplicated

Every replay inserts a new route row and new alert rows. Replaying the same
incident twice doubles the stored evidence and the alert count.

Reproduction:

```python
# same event twice in one request
# events_processed == 2, alert_count == 4
```

**Demo handling.** The engine test `counts a duplicate replay twice` pins the
behaviour. The dashboard never writes to SQLite, so a browser reset is clean.

**Suggested backend fix (not applied).** Add an idempotency key or a uniqueness
constraint on `(timestamp, prefix, origin_as, as_path, roa_status, feed)`, and
document whether duplicates should update or be ignored.

### 4. Alerts are per finding, not per event

`detect()` returns one dict per finding. A single event can produce several
alerts, and a clean event produces none. The UI's "8 alerts" therefore means
eight findings across five incident events, not eight bad events.

**Demo handling.** `runFeed` counts findings, and the results copy says "alerts"
rather than "events". The compare table shows both events and alerts.

### 5. Clean events have no confidence or evidence row

Because `detect()` returns `[]` when nothing is wrong, there is no stored result
for a clean event. Confidence is attached only to findings.

**Demo handling.** The browser engine returns an `EventResult` for every matched
event so the evidence panel always has content. Its confidence is a UI
convenience. The results note explains that confidence is a fixed value per
event, not a calibrated probability.

### 6. `graph/{prefix}` matches the raw string

The route table stores the canonical prefix produced by Pydantic, but the graph
endpoint compares the URL segment literally:

```python
routes = [item for item in store.list_table("routes") if item["prefix"] == prefix]
```

A request for `203.0.113.5/24` returns no paths even though the stored route is
`203.0.113.0/24`.

**Demo handling.** The demo does not call this endpoint. The evidence panel
canonicalises before display.

**Suggested backend fix (not applied).** Canonicalise the path parameter with the
same validator used by `RouteEvent`, or return 422 for non-canonical input.

### 7. CORS is limited to the Vite dev server

`allow_origins` is exactly `http://127.0.0.1:5173` and
`http://localhost:5173`. The Playwright preview server runs on port 4173, so a
future browser integration against the API would need either a CORS update or a
same-origin proxy.

**Demo handling.** The dashboard makes no API calls. The simulator is entirely
client-side.

### 8. Default tokens are known demo values

`security.py` falls back to `local-viewer-token`, `local-operator-token` and
`local-admin-token` when the environment variables are unset. The README and
quick start both say to replace them.

**Demo handling.** The quick start shows `Copy-Item .env.example .env` and a
comment to replace the tokens.

**Suggested backend fix (not applied).** Fail startup outside an explicit demo
mode when defaults are in use. Add token rotation and expiry if the service ever
leaves loopback.

### 9. SQLite access is single-process and unbounded

Each store method opens a new connection. There is no WAL mode, busy timeout,
pagination or retention policy. `GET /api/v1/routes` and `GET /api/v1/alerts`
return every row, newest first.

**Demo handling.** The dashboard does not read the store. The scope section says
the project is a teaching-sized, single-process tool.

### 10. Asset management is append-only

`POST /api/v1/assets` inserts a new row. There is no update or delete endpoint,
and duplicate assets are allowed. Detection picks the least-specific matching
asset, so a duplicate does not change the verdict, but it does add noise.

**Demo handling.** The tour shows a single protected prefix and explains the
least-specific rule.

### 11. Feedback is stored but not used

`POST /api/v1/alerts/{id}/feedback` saves a disposition and note. Nothing reads
feedback back into detection, and there is no endpoint to list it.

**Demo handling.** The Review tab says "Stored, not yet used" and explains that
feedback does not tune detection in this release.

### 12. Replay is synchronous and bounded

`ReplayRequest.events` accepts 1 to 10,000 events. The handler loops over them
synchronously, saving a route and its alerts per event. Large replays block the
event loop and can create many rows.

**Demo handling.** The demo replays eight events in the browser. The quick start
posts one event.

### 13. AS-path validation and the detection threshold differ

The model accepts 1 to 128 ASNs. Detection flags anything longer than 32. A path
of 33 to 128 is valid input but always raises `long-as-path`.

**Demo handling.** The fixture uses a 33-hop path, and the test proves 32 does not
alert while 33 does.

### 14. Importing the API has filesystem side effects

`app = create_app()` runs at import time and constructs `Store`, which creates
the parent directory and the SQLite tables. Tests that import the module without
overriding the database path will create `data/routesentinel.sqlite3`.

**Demo handling.** None needed; the dashboard never imports Python. This is noted
so CI authors know why a `data/` directory can appear during tests.

## Dependency note

The dev extra lists `httpx2>=2,<3`. That is a real package, and the current test
suite passes with it; it is not treated as a typo here. Anyone changing the
dependency should verify `fastapi.testclient` still resolves its HTTP client
before merging.

## What the dashboard intentionally does not do

- It does not call the API at runtime, so it cannot show real stored alerts.
- It does not reproduce the IPv6 500; it reports IPv6 as unsupported.
- It does not add a client-side origin/path cross-check that the backend lacks.
- It does not hide duplicate-replay behaviour; the limitation is documented and
  tested.
- It does not claim de-duplication, live feeds, mitigation or production
  readiness.
