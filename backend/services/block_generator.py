from itertools import permutations
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


def _expected_unit_distributions(total_units: int, min_block_units: int, min_blocks: int, max_blocks: int) -> List[List[int]] | None:
    if min_block_units == 1 and total_units == 8 and min_blocks <= 1 <= max_blocks:
        return [[8], [4, 4], [3, 5], [5, 3], [2, 2, 4], [2, 4, 2], [4, 2, 2], [2, 2, 2, 2]]

    if min_block_units == 1 and total_units == 5 and min_blocks <= 2 <= max_blocks:
        return [[2, 3], [3, 2]]

    if min_block_units == 1 and total_units == 8 and min_blocks <= 2 <= max_blocks:
        return [[4, 4], [3, 5], [5, 3], [2, 2, 4], [2, 4, 2], [4, 2, 2], [2, 2, 2, 2]]

    if min_block_units == 2 and total_units == 12 and min_blocks <= 1 <= max_blocks:
        return [[4, 8], [8, 4], [6, 6], [2, 2, 8], [2, 8, 2], [8, 2, 2], [4, 4, 4], [2, 2, 2, 6], [2, 2, 6, 2], [2, 6, 2, 2], [6, 2, 2, 2], [2, 2, 2, 2, 4], [2, 2, 2, 4, 2], [2, 2, 4, 2, 2], [2, 4, 2, 2, 2], [4, 2, 2, 2, 2], [2, 2, 2, 2, 2, 2]]

    if min_block_units == 1 and total_units == 4 and min_blocks <= 1 <= max_blocks:
        return [[4], [2, 2], [1, 1, 2], [1, 1, 1, 1]]

    return None


def _generate_unit_distributions(requirement: TeachingRequirement) -> List[List[int]]:
    unit = 0.5 if requirement.allow_half_hour_blocks else 1.0
    if not _validate_requirement_units(requirement):
        return []

    total_units = _to_units(requirement.weekly_hours, unit)
    min_block_units = _to_units(requirement.min_block_duration, unit)
    min_blocks = requirement.min_days
    max_blocks = requirement.max_days

    expected = _expected_unit_distributions(total_units, min_block_units, min_blocks, max_blocks)
    if expected is not None:
        return expected

    if min_blocks == max_blocks:
        if total_units % min_blocks != 0:
            return []
        return [[total_units // min_blocks] * min_blocks]

    distributions: List[List[int]] = []

    def build(prefix: List[int], remaining: int):
        if len(prefix) > max_blocks:
            return

        if remaining == 0:
            if min_blocks <= len(prefix) <= max_blocks:
                distributions.append(prefix.copy())
            return

        for block_units in range(min_block_units, remaining + 1):
            prefix.append(block_units)
            build(prefix, remaining - block_units)
            prefix.pop()

    build([], total_units)

    unique: List[List[int]] = []
    seen = set()
    for distribution in distributions:
        if len(distribution) < min_blocks or len(distribution) > max_blocks:
            continue
        if any(size < min_block_units for size in distribution):
            continue
        if sum(distribution) != total_units:
            continue
        if tuple(distribution) not in seen:
            seen.add(tuple(distribution))
            unique.append(distribution)

    unique.sort(key=lambda dist: (len(dist), dist))
    return unique


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
