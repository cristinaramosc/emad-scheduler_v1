from dataclasses import dataclass, field
from typing import Dict, Optional


@dataclass
class TeachingBlock:
    """Domini: bloc docent no programat.

    Un bloc només coneix durada i ordre; no coneix dia ni hora ni aula.
    """

    id: str
    duration: float
    order: int
    preferred_room_id: Optional[str] = None
    preferred_teacher_id: Optional[str] = None
    fixed: bool = False
    metadata: Dict[str, object] = field(default_factory=dict)
