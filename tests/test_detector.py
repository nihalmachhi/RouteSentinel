from routesentinel.detector import detect
from routesentinel.models import Asset, RouteEvent

ASSET = Asset(prefix="203.0.113.0/24", expected_origins=[64500], anycast_origins=[64501])


def event(prefix, origin, status="valid"):
    return RouteEvent(
        timestamp="2026-01-01T00:00:00Z",
        prefix=prefix,
        origin_as=origin,
        as_path=[64501, origin],
        roa_status=status,
    )


def test_valid_declared_anycast_origin_does_not_alert():
    assert detect(event("203.0.113.0/24", 64501), [ASSET]) == []


def test_invalid_origin_is_alerted():
    findings = detect(event("203.0.113.0/24", 64599, "invalid"), [ASSET])
    assert {item["kind"] for item in findings} == {"unexpected-origin", "rpki-invalid"}


def test_unknown_origin_subprefix_is_alerted():
    findings = detect(event("203.0.113.0/25", 64599, "unknown"), [ASSET])
    assert "unexpected-subprefix" in {item["kind"] for item in findings}
    assert "unexpected-origin" in {item["kind"] for item in findings}
