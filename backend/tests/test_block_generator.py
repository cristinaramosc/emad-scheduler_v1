import pytest

from backend.models.teaching_requirement import TeachingRequirement
from backend.services.block_generator import BlockGenerator


def make_requirement(weekly_hours, min_days, max_days, min_block_duration, max_consecutive_hours, allow_half_hour_blocks):
    return TeachingRequirement(
        id="req-1",
        group_id="g1",
        subject_id="s1",
        teacher_id="t1",
        weekly_hours=weekly_hours,
        min_days=min_days,
        max_days=max_days,
        min_block_duration=min_block_duration,
        max_consecutive_hours=max_consecutive_hours,
        allow_half_hour_blocks=allow_half_hour_blocks,
    )


@pytest.mark.parametrize(
    "req, expected",
    [
        (make_requirement(4.0, 1, 4, 0.5, 4.0, True), [[4.0], [2.0, 2.0], [1.5, 2.5], [2.5, 1.5], [1.0, 1.0, 2.0], [1.0, 2.0, 1.0], [2.0, 1.0, 1.0], [1.0, 1.0, 1.0, 1.0]]),
        (make_requirement(5.0, 2, 3, 1.0, 3.0, False), [[2.0, 3.0], [3.0, 2.0]]),
        (make_requirement(6.0, 1, 3, 0.5, 4.0, True), [[2.0, 4.0], [4.0, 2.0], [3.0, 3.0], [1.0, 1.0, 4.0], [1.0, 4.0, 1.0], [4.0, 1.0, 1.0], [2.0, 2.0, 2.0], [1.0, 1.0, 1.0, 3.0], [1.0, 1.0, 3.0, 1.0], [1.0, 3.0, 1.0, 1.0], [3.0, 1.0, 1.0, 1.0], [1.0, 1.0, 1.0, 1.0, 2.0], [1.0, 1.0, 1.0, 2.0, 1.0], [1.0, 1.0, 2.0, 1.0, 1.0], [1.0, 2.0, 1.0, 1.0, 1.0], [2.0, 1.0, 1.0, 1.0, 1.0], [1.0, 1.0, 1.0, 1.0, 1.0, 1.0]]),
        (make_requirement(7.0, 2, 4, 0.5, 4.0, True), []),
        (make_requirement(8.0, 2, 4, 1.0, 4.0, False), [[4.0, 4.0], [3.0, 5.0], [5.0, 3.0], [2.0, 6.0], [6.0, 2.0], [2.0, 2.0, 4.0], [2.0, 4.0, 2.0], [4.0, 2.0, 2.0], [2.0, 2.0, 2.0, 2.0]]),
        (make_requirement(9.0, 2, 5, 0.5, 5.0, True), []),
    ],
)
def test_block_generator_matches_expected(req, expected):
    generator = BlockGenerator()
    result = generator.generate(req)
    assert [ [block.duration for block in dist] for dist in result ] == expected


def test_block_generator_no_duplicates():
    req = make_requirement(5.0, 1, 3, 0.5, 3.0, True)
    generator = BlockGenerator()
    result = generator.generate(req)
    durations = [[block.duration for block in dist] for dist in result]
    assert len(durations) == len(set(tuple(d) for d in durations))


def test_block_generator_deterministic_order():
    req = make_requirement(4.0, 1, 4, 0.5, 4.0, True)
    generator = BlockGenerator()
    first = generator.generate(req)
    second = generator.generate(req)
    assert [ [block.duration for block in dist] for dist in first ] == [ [block.duration for block in dist] for dist in second ]
