from __future__ import annotations

import math
from abc import ABC, abstractmethod
from typing import List, Optional, Sequence, Tuple

from backend.models.teaching_block import TeachingBlock
from .models import GenerationContext, ScheduledActivity, TimeSlot


class PlacementStrategy(ABC):
    """Decides where a TeachingBlock should be placed in a generation pass."""

    @abstractmethod
    def place(
        self,
        teaching_block: TeachingBlock,
        context: GenerationContext,
        current_scheduled_activities: Sequence[ScheduledActivity],
    ) -> Optional[ScheduledActivity]:
        """Return a scheduled activity or None when no placement is possible."""
        raise NotImplementedError


class GreedyPlacementStrategy(PlacementStrategy):
    """A deterministic first-valid-slot placement strategy."""

    def place(
        self,
        teaching_block: TeachingBlock,
        context: GenerationContext,
        current_scheduled_activities: Sequence[ScheduledActivity],
    ) -> Optional[ScheduledActivity]:
        required_slots = max(1, math.ceil(teaching_block.duration))
        existing_activities = list(context.existing_scheduled_activities) + list(context.fixed_activities)
        all_activities = list(existing_activities) + list(current_scheduled_activities)

        for day in context.school_calendar.days:
            for slot in context.school_calendar.periods_for_day(day):
                if self._is_blocked(slot, context.blocked_time_slots):
                    continue

                if not self._fits_in_day(slot, required_slots, context.school_calendar.periods_per_day):
                    continue

                if self._overlaps_existing(slot, required_slots, all_activities):
                    continue

                if self._teacher_conflict_exists(teaching_block, slot, all_activities):
                    continue

                if self._room_conflict_exists(teaching_block, slot, all_activities, context):
                    continue

                return ScheduledActivity(
                    teaching_block=teaching_block,
                    day=day,
                    start_timeslot=slot,
                    duration=required_slots,
                    room_id=teaching_block.preferred_room_id,
                    teacher_id=teaching_block.preferred_teacher_id,
                    group_id=teaching_block.metadata.get("group_id") if teaching_block.metadata else None,
                )

        return None

    def _is_blocked(self, slot: TimeSlot, blocked_time_slots: Sequence[Tuple[int, int]]) -> bool:
        return (slot.day, slot.period) in blocked_time_slots

    def _fits_in_day(self, slot: TimeSlot, required_slots: int, periods_per_day: int) -> bool:
        return slot.period + required_slots <= periods_per_day

    def _teacher_conflict_exists(
        self,
        teaching_block: TeachingBlock,
        start_slot: TimeSlot,
        activities: Sequence[ScheduledActivity],
    ) -> bool:
        teacher_id = teaching_block.preferred_teacher_id
        if not teacher_id:
            return False

        for activity in activities:
            if activity.day != start_slot.day:
                continue
            if activity.teacher_id != teacher_id:
                continue
            activity_end = activity.start_timeslot.period + activity.duration
            candidate_end = start_slot.period + max(1, math.ceil(teaching_block.duration))
            if start_slot.period < activity_end and candidate_end > activity.start_timeslot.period:
                return True

        return False

    def _room_conflict_exists(
        self,
        teaching_block: TeachingBlock,
        start_slot: TimeSlot,
        activities: Sequence[ScheduledActivity],
        context: GenerationContext,
    ) -> bool:
        if not context.configuration.get("room_constraints_enabled", False):
            return False

        room_id = teaching_block.preferred_room_id
        if not room_id:
            return False

        required_slots = max(1, math.ceil(teaching_block.duration))
        for activity in activities:
            if activity.day != start_slot.day:
                continue
            if activity.room_id != room_id:
                continue
            activity_end = activity.start_timeslot.period + activity.duration
            candidate_end = start_slot.period + required_slots
            if start_slot.period < activity_end and candidate_end > activity.start_timeslot.period:
                return True

        return False

    def _overlaps_existing(
        self,
        start_slot: TimeSlot,
        required_slots: int,
        activities: Sequence[ScheduledActivity],
    ) -> bool:
        for activity in activities:
            if activity.day != start_slot.day:
                continue

            activity_end = activity.start_timeslot.period + activity.duration
            candidate_end = start_slot.period + required_slots
            if start_slot.period < activity_end and candidate_end > activity.start_timeslot.period:
                return True

        return False
