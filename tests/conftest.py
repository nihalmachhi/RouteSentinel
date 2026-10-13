import pytest
from fastapi.testclient import TestClient

from routesentinel.api import create_app


@pytest.fixture
def client(tmp_path):
    with TestClient(create_app(str(tmp_path / "test.sqlite3"))) as client:
        yield client


@pytest.fixture
def tokens():
    return {
        role: {"Authorization": f"Bearer local-{role}-token"}
        for role in ("viewer", "operator", "admin")
    }
