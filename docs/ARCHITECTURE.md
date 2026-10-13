# RouteSentinel data flow

~~~mermaid
flowchart LR
  F[Offline JSON event batch] --> V[Schema and prefix validation]
  A[Operator asset baseline] --> D[Origin and prefix detector]
  V --> D
  R[RPKI status in event] --> D
  D --> I[Evidence-backed findings]
  I --> S[Local SQLite]
  S --> U[Protected dashboard and API]
~~~

The detector is passive. It compares each event with configured assets. An origin is expected when present in either the regular or anycast allowlist. More-specific announcements and invalid RPKI states create findings even when an origin is otherwise allowed. Unconfigured prefixes do not create a monitored-asset alert.

## Current boundaries

The provided feed name is provenance text; this MVP does not validate an upstream feed signature. Route origins and RPKI status are accepted from the offline event input and are not independently fetched or verified. No AS-relationship leak analysis, live feed subscription, or incident correlation window is implemented.

