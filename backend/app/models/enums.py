"""Allowed values for enumerated columns.

Stored as text with CHECK constraints rather than native PostgreSQL enums, so adding
a value is a simple migration. Schemas use the same tuples via `Literal`.
"""

from typing import Literal, get_args

ProjectStatus = Literal["planned", "in_progress", "prototype", "completed", "deployed"]
FeatureStatus = Literal["implemented", "in_progress", "planned"]
ImageKind = Literal["screenshot", "diagram"]
SkillLevel = Literal["beginner", "intermediate", "advanced"]
EmploymentType = Literal["full_time", "part_time", "internship", "freelance", "contract", "volunteer", "open_source"]
WorkMode = Literal["on_site", "remote", "hybrid"]
AchievementType = Literal["award", "achievement", "scholarship", "competition", "publication"]
ArticleStatus = Literal["draft", "published"]
CategoryIcon = Literal[
    "layout",
    "server",
    "layers",
    "chart",
    "brain",
    "network",
    "eye",
    "message",
    "sparkles",
    "workflow",
    "container",
    "cpu",
    "terminal",
]


def values(literal: object) -> tuple[str, ...]:
    return get_args(literal)


def check_in(column: str, literal: object) -> str:
    """SQL for a CHECK constraint restricting `column` to the literal's values."""
    options = ", ".join(f"'{value}'" for value in values(literal))
    return f"{column} IN ({options})"


# "YYYY" or "YYYY-MM": dates on a portfolio rarely have day precision, and inventing
# one would be misleading. Lexicographic order matches chronological order.
PARTIAL_DATE_SQL = r"'^\d{4}(-(0[1-9]|1[0-2]))?$'"
PARTIAL_DATE_PATTERN = r"^\d{4}(-(0[1-9]|1[0-2]))?$"
