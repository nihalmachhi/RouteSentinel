def test_route_api_requires_authentication_and_operator_for_replay(client, tokens):
    assert client.get("/health").status_code == 200
    assert client.get("/api/v1/alerts").status_code == 401
    assert (
        client.get("/api/v1/alerts", headers={"Authorization": "Bearer invalid"}).status_code == 401
    )
    assert (
        client.post(
            "/api/v1/assets",
            headers=tokens["viewer"],
            json={"prefix": "203.0.113.0/24", "expected_origins": [64500]},
        ).status_code
        == 403
    )
    assert (
        client.post(
            "/api/v1/assets",
            headers=tokens["operator"],
            json={"prefix": "203.0.113.0/24", "expected_origins": [64500]},
        ).status_code
        == 201
    )
    body = {
        "events": [
            {
                "timestamp": "2026-01-01T00:00:00Z",
                "prefix": "203.0.113.0/24",
                "origin_as": 64500,
                "as_path": [64500],
                "roa_status": "valid",
            }
        ]
    }
    assert client.post("/api/v1/replay", headers=tokens["viewer"], json=body).status_code == 403
    response = client.post("/api/v1/replay", headers=tokens["operator"], json=body)
    assert response.status_code == 201 and response.json()["alert_count"] == 0
    assert client.get("/api/v1/routes", headers=tokens["viewer"]).status_code == 200
