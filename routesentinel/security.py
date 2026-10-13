import hmac
import os
from enum import IntEnum

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer


class Role(IntEnum):
    viewer = 1
    operator = 2
    admin = 3


bearer = HTTPBearer(auto_error=False)


def require_role(required: Role):
    def check(credentials: HTTPAuthorizationCredentials | None = Depends(bearer)):
        if credentials is None:
            raise HTTPException(
                401, "Bearer token required", headers={"WWW-Authenticate": "Bearer"}
            )
        options = (
            (os.getenv("ROUTESENTINEL_VIEWER_TOKEN", "local-viewer-token"), Role.viewer),
            (os.getenv("ROUTESENTINEL_OPERATOR_TOKEN", "local-operator-token"), Role.operator),
            (os.getenv("ROUTESENTINEL_ADMIN_TOKEN", "local-admin-token"), Role.admin),
        )
        role = next(
            (
                role
                for token, role in options
                if hmac.compare_digest(credentials.credentials, token)
            ),
            None,
        )
        if role is None:
            raise HTTPException(401, "Invalid bearer token", headers={"WWW-Authenticate": "Bearer"})
        if role < required:
            raise HTTPException(403, "Insufficient role")
        return role

    return check
