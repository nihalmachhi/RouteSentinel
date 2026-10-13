import ipaddress
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class Asset(BaseModel):
    prefix: str
    expected_origins: list[int] = Field(min_length=1)
    anycast_origins: list[int] = Field(default_factory=list)
    label: str = Field(default="Protected prefix", max_length=120)

    @field_validator("prefix")
    @classmethod
    def canonical_prefix(cls, value):
        return str(ipaddress.ip_network(value, strict=False))


class RouteEvent(BaseModel):
    timestamp: str
    prefix: str
    origin_as: int = Field(ge=1, le=4294967295)
    as_path: list[int] = Field(min_length=1, max_length=128)
    roa_status: Literal["valid", "invalid", "unknown"]
    feed: str = Field(default="offline-fixture", max_length=120)

    @field_validator("prefix")
    @classmethod
    def canonical_prefix(cls, value):
        return str(ipaddress.ip_network(value, strict=False))


class ReplayRequest(BaseModel):
    events: list[RouteEvent] = Field(min_length=1, max_length=10000)


class Feedback(BaseModel):
    disposition: Literal["true_positive", "false_positive", "needs_review"]
    note: str = Field(min_length=3, max_length=500)
