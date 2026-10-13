import ipaddress

from routesentinel.models import Asset, RouteEvent

_DOCUMENTATION_RANGES = [
    ipaddress.ip_network(item) for item in ("192.0.2.0/24", "198.51.100.0/24", "203.0.113.0/24")
]


def is_bogon(network):
    if any(network.subnet_of(doc_range) for doc_range in _DOCUMENTATION_RANGES):
        return False
    return network.is_private or network.is_reserved or network.is_loopback or network.is_multicast


def detect(event: RouteEvent, assets: list[Asset]) -> list[dict]:
    network = ipaddress.ip_network(event.prefix)
    matches = []
    for asset in assets:
        protected = ipaddress.ip_network(asset.prefix)
        if network.subnet_of(protected):
            matches.append((asset, protected))
    if not matches:
        return []
    asset, protected = min(matches, key=lambda item: item[1].prefixlen)
    findings = []
    more_specific = network.prefixlen > protected.prefixlen
    allowed = set(asset.expected_origins) | set(asset.anycast_origins)
    origin_allowed = event.origin_as in allowed
    if more_specific:
        findings.append(
            (
                "unexpected-subprefix",
                "high",
                "Announcement is more specific than the protected prefix",
            )
        )
    if not origin_allowed:
        findings.append(("unexpected-origin", "high", "Origin AS is not in the asset allowlist"))
    if event.roa_status == "invalid":
        findings.append(
            ("rpki-invalid", "critical", "Route Origin Validation reports this route as invalid")
        )
    if len(event.as_path) > 32:
        findings.append(
            ("long-as-path", "medium", "AS path exceeds the configured anomaly threshold")
        )
    if is_bogon(network):
        findings.append(("bogon-prefix", "high", "Announcement uses a non-public address range"))
    if not findings:
        return []
    confidence = 0.95 if event.roa_status == "invalid" else (0.82 if origin_allowed else 0.9)
    return [
        {
            "kind": kind,
            "severity": severity,
            "confidence": confidence,
            "prefix": event.prefix,
            "origin_as": event.origin_as,
            "asset_prefix": asset.prefix,
            "message": message,
            "evidence": {
                "as_path": event.as_path,
                "roa_status": event.roa_status,
                "feed": event.feed,
                "timestamp": event.timestamp,
            },
            "suggested_action": "Review route and RPKI evidence; no action was taken.",
        }
        for kind, severity, message in findings
    ]
