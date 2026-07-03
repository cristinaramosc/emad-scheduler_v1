from dataclasses import dataclass, field
from typing import Any


@dataclass
class Conflict:
    type: str
    message: str
    severity: str = "error"
    data: dict[str, Any] = field(default_factory=dict)