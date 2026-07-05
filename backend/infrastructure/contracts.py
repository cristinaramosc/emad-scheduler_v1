from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

try:
    from scheduler_engine.models import Schedule
except ModuleNotFoundError:  # pragma: no cover
    from backend.scheduler_engine.models import Schedule


@dataclass
class DocumentRecord:
    id: str
    name: str
    payload: bytes
    content_type: str = "application/octet-stream"
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ExportArtifact:
    format_name: str
    payload: bytes
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ImportPayload:
    format_name: str
    payload: bytes
    metadata: Dict[str, Any] = field(default_factory=dict)


class PersistenceProvider(ABC):
    @abstractmethod
    def save_schedule(self, schedule: Schedule) -> str:
        raise NotImplementedError

    @abstractmethod
    def load_schedule(self, schedule_id: str) -> Optional[Schedule]:
        raise NotImplementedError

    @abstractmethod
    def list_schedules(self) -> List[str]:
        raise NotImplementedError


class DocumentProvider(ABC):
    @abstractmethod
    def save_document(self, document: DocumentRecord) -> str:
        raise NotImplementedError

    @abstractmethod
    def load_document(self, document_id: str) -> Optional[DocumentRecord]:
        raise NotImplementedError

    @abstractmethod
    def list_documents(self) -> List[str]:
        raise NotImplementedError


class ExportProvider(ABC):
    @abstractmethod
    def export_schedule(self, schedule: Schedule, target: str = "default") -> ExportArtifact:
        raise NotImplementedError


class ImportProvider(ABC):
    @abstractmethod
    def import_schedule(self, payload: ImportPayload) -> Schedule:
        raise NotImplementedError


class BackupProvider(ABC):
    @abstractmethod
    def create_backup(self, label: Optional[str] = None) -> str:
        raise NotImplementedError

    @abstractmethod
    def restore_backup(self, backup_id: str) -> bool:
        raise NotImplementedError

    @abstractmethod
    def list_backups(self) -> List[str]:
        raise NotImplementedError
