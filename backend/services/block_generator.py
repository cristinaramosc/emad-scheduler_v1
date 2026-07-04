from typing import List
from uuid import uuid4

from backend.models.teaching_block import TeachingBlock
from backend.models.teaching_requirement import TeachingRequirement


def _to_units(value: float, unit: float) -> int:
    return int(round(value / unit))


def _from_units(value: int, unit: float) -> float:
    return value * unit


def _is_integral_multiple(value: float, unit: float) -> bool:
    return abs(round(value / unit) - (value / unit)) < 1e-9


def _validate_requirement_units(requirement: TeachingRequirement) -> bool:
    unit = 0.5 if requirement.allow_half_hour_blocks else 1.0
    if not _is_integral_multiple(requirement.weekly_hours, unit):
        return False
    if not _is_integral_multiple(requirement.min_block_duration, unit):
        return False
    if not _is_integral_multiple(requirement.max_consecutive_hours, unit):
        return False
    return True


def _generate_unit_distributions(requirement: TeachingRequirement) -> List[List[int]]:
    unit = 0.5 if requirement.allow_half_hour_blocks else 1.0
    if not _validate_requirement_units(requirement):
        return []

    total_units = _to_units(requirement.weekly_hours, unit)
    min_block_units = _to_units(requirement.min_block_duration, unit)
    max_block_units = _to_units(requirement.max_consecutive_hours, unit)
    min_blocks = requirement.min_days
    max_blocks = requirement.max_days

    distributions: List[List[int]] = []

    def build(prefix: List[int], remaining: int):
        if len(prefix) > max_blocks:
            return

        if remaining == 0:
            if min_blocks <= len(prefix) <= max_blocks:
                distributions.append(prefix.copy())
            return

        for block_units in range(min_block_units, min(max_block_units, remaining) + 1):
            prefix.append(block_units)
            build(prefix, remaining - block_units)
            prefix.pop()

    build([], total_units)
    return distributions


def generate_distributions(requirement: TeachingRequirement) -> List[List[float]]:
    unit = 0.5 if requirement.allow_half_hour_blocks else 1.0
    distributions = _generate_unit_distributions(requirement)
    unique = []
    seen = set()

    for dist_units in distributions:
        dist = [_from_units(value, unit) for value in dist_units]
        key = tuple(dist)
        if key not in seen:
            seen.add(key)
            unique.append(dist)

    unique.sort()
    return unique


class BlockGenerator:
    """Genera distribucions de TeachingBlocks per a un TeachingRequirement."""

    def generate(self, requirement: TeachingRequirement) -> List[List[TeachingBlock]]:
        distributions = generate_distributions(requirement)
        result: List[List[TeachingBlock]] = []

        for dist in distributions:
            blocks = [
                TeachingBlock(
                    id=str(uuid4()),
                    duration=duration,
                    order=index + 1,
                )
                for index, duration in enumerate(dist)
            ]
            result.append(blocks)

        return result
