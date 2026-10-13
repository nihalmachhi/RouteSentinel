from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from routesentinel.detector import detect
from routesentinel.models import Asset, Feedback, ReplayRequest
from routesentinel.security import Role, require_role
from routesentinel.store import Store


def create_app(database_path="data/routesentinel.sqlite3"):
    app = FastAPI(title="RouteSentinel", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
        allow_methods=["GET", "POST"],
        allow_headers=["Authorization", "Content-Type"],
    )
    store = Store(database_path)
    app.state.store = store

    @app.get("/health")
    def health():
        return {"status": "ok", "mode": "offline-passive"}

    @app.get("/api/v1/assets")
    def assets(_=Depends(require_role(Role.viewer))):
        return store.assets()

    @app.post("/api/v1/assets", status_code=201)
    def add_asset(asset: Asset, _=Depends(require_role(Role.operator))):
        return store.add_asset(asset.model_dump())

    @app.post("/api/v1/replay", status_code=201)
    def replay(request: ReplayRequest, _=Depends(require_role(Role.operator))):
        results = []
        for event in request.events:
            route = store.save_route(event.model_dump())
            alerts = [
                store.save_alert(alert)
                for alert in detect(event, [Asset.model_validate(item) for item in store.assets()])
            ]
            results.append({"route": route, "alerts": alerts})
        return {
            "events_processed": len(results),
            "alert_count": sum(len(item["alerts"]) for item in results),
            "results": results,
            "mode": "offline-passive-replay",
        }

    @app.get("/api/v1/routes")
    def routes(_=Depends(require_role(Role.viewer))):
        return store.list_table("routes")

    @app.get("/api/v1/alerts")
    def alerts(_=Depends(require_role(Role.viewer))):
        return store.list_table("alerts")

    @app.post("/api/v1/alerts/{alert_id}/feedback", status_code=201)
    def feedback(alert_id: str, payload: Feedback, _=Depends(require_role(Role.operator))):
        result = store.feedback(alert_id, payload.model_dump())
        if result is None:
            raise HTTPException(404, "Alert not found")
        return result

    @app.get("/api/v1/graph/{prefix:path}")
    def graph(prefix: str, _=Depends(require_role(Role.viewer))):
        routes = [item for item in store.list_table("routes") if item["prefix"] == prefix]
        return {
            "prefix": prefix,
            "paths": [
                {
                    "origin_as": item["origin_as"],
                    "as_path": item["as_path"],
                    "timestamp": item["timestamp"],
                }
                for item in routes
            ],
        }

    return app


app = create_app()
