from backend.infrastructure import (
    CloudSyncService,
    DocumentRecord,
    ImportPayload,
    InMemoryBackupProvider,
    InMemoryDocumentProvider,
    InMemoryPersistenceProvider,
    PlaceholderExportProvider,
    PlaceholderImportProvider,
)
from scheduler_engine.models import Activity, Schedule


def _schedule_with_one_activity() -> Schedule:
    schedule = Schedule()
    schedule.add(
        Activity(
            id=1,
            teacher="t1",
            subject="s1",
            group="g1",
            room="r1",
            day="Day 0",
            start="Period 0",
            duration=2,
        )
    )
    return schedule


def test_persistence_provider_roundtrip_keeps_schedule_data():
    persistence = InMemoryPersistenceProvider()
    schedule_id = persistence.save_schedule(_schedule_with_one_activity())

    loaded = persistence.load_schedule(schedule_id)

    assert loaded is not None
    assert len(loaded.all()) == 1
    assert loaded.all()[0].subject == "s1"


def test_backup_provider_creates_and_restores_snapshots():
    persistence = InMemoryPersistenceProvider()
    backups = InMemoryBackupProvider(persistence)

    first_id = persistence.save_schedule(_schedule_with_one_activity())
    backup_id = backups.create_backup("seed")

    persistence.replace_all({})
    assert persistence.list_schedules() == []

    restored = backups.restore_backup(backup_id)

    assert restored is True
    assert persistence.list_schedules() == [first_id]


def test_document_provider_stores_and_retrieves_records():
    provider = InMemoryDocumentProvider()
    document_id = provider.save_document(
        DocumentRecord(
            id="",
            name="draft",
            payload=b"hello",
            content_type="text/plain",
        )
    )

    loaded = provider.load_document(document_id)

    assert loaded is not None
    assert loaded.name == "draft"
    assert loaded.payload == b"hello"


def test_import_export_placeholders_return_contract_objects():
    schedule = _schedule_with_one_activity()
    exporter = PlaceholderExportProvider()
    importer = PlaceholderImportProvider()

    artifact = exporter.export_schedule(schedule, target="manual")
    imported = importer.import_schedule(ImportPayload(format_name="placeholder", payload=artifact.payload))

    assert artifact.format_name == "placeholder"
    assert artifact.metadata["activity_count"] == 1
    assert imported.all() == []


def test_cloud_sync_service_tracks_state_without_network_io():
    sync = CloudSyncService()
    sync_id = sync.queue_sync("backup")

    queued = sync.get_status(sync_id)
    done = sync.mark_completed(sync_id)
    completed = sync.get_status(sync_id)

    assert queued is not None
    assert queued.state == "queued"
    assert done is True
    assert completed is not None
    assert completed.state == "completed"
