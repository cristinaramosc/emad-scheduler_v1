from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

from .activity import Activity
from .conflict import Conflict


@dataclass
class ScheduleProposal:
    """Represents a complete proposed schedule before it is accepted."""

    id: str
    activities: List[Activity] = field(default_factory=list)
    score: float = 0.0
    conflicts: List[Conflict] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    metadata: Optional[Dict[str, Any]] = field(default_factory=dict)
