from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime
import re
from typing import Iterable


_LINE_PATTERNS = (
    re.compile(r"^(?P<date>\d{1,2}/\d{1,2}/\d{2,4}),?\s+(?P<time>\d{1,2}:\d{2}(?:\s?[APap][Mm])?)\s[-–]\s(?P<author>[^:]+):\s(?P<body>.*)$"),
    re.compile(r"^\[(?P<date>\d{1,2}/\d{1,2}/\d{2,4}),?\s+(?P<time>\d{1,2}:\d{2}(?:\s?[APap][Mm])?)\]\s(?P<author>[^:]+):\s(?P<body>.*)$"),
)
_SYSTEM_AUTHORS = {"system", "you created group", "messages and calls are end-to-end encrypted"}


@dataclass(frozen=True)
class AggregateStats:
    total_messages: int = 0
    total_attachments: int = 0
    member_messages: dict[str, int] = field(default_factory=dict)
    hourly_messages: dict[int, int] = field(default_factory=dict)
    weekday_messages: dict[str, int] = field(default_factory=dict)
    average_response_minutes: float | None = None


def _parse_timestamp(date_text: str, time_text: str) -> datetime | None:
    for date_format in ("%d/%m/%Y", "%m/%d/%Y", "%d/%m/%y", "%m/%d/%y"):
        for time_format in ("%H:%M", "%I:%M %p"):
            try:
                return datetime.strptime(f"{date_text} {time_text.upper()}", f"{date_format} {time_format}")
            except ValueError:
                continue
    return None


def parse_chat(lines: Iterable[str]) -> AggregateStats:
    """Parse an export into aggregates; message bodies are intentionally never returned."""
    member_messages: Counter[str] = Counter()
    hourly_messages: Counter[int] = Counter()
    weekday_messages: Counter[str] = Counter()
    response_gaps: list[float] = []
    previous_timestamp: datetime | None = None
    total_messages = 0
    total_attachments = 0

    current_message: tuple[datetime, str, str] | None = None

    def consume(message: tuple[datetime, str, str]) -> None:
        nonlocal total_messages, total_attachments, previous_timestamp
        timestamp, author, body = message
        nonlocal member_messages, hourly_messages, weekday_messages, response_gaps
        total_messages += 1
        member_messages[author] += 1
        hourly_messages[timestamp.hour] += 1
        weekday_messages[timestamp.strftime("%A")] += 1
        if "<media omitted>" in body.lower() or "(file attached)" in body.lower():
            total_attachments += 1
        if previous_timestamp is not None:
            gap = (timestamp - previous_timestamp).total_seconds() / 60
            if 0 <= gap <= 24 * 60:
                response_gaps.append(gap)
        previous_timestamp = timestamp

    for line in lines:
        match = next((pattern.match(line.strip()) for pattern in _LINE_PATTERNS), None)
        if not match:
            if current_message is not None:
                current_message = (current_message[0], current_message[1], f"{current_message[2]} {line.strip()}")
            continue
        timestamp = _parse_timestamp(match.group("date"), match.group("time"))
        if timestamp is None:
            continue
        author = match.group("author").strip()
        body = match.group("body")
        if current_message is not None and current_message[1].lower() not in _SYSTEM_AUTHORS:
            consume(current_message)
        current_message = (timestamp, author, body)

    if current_message is not None and current_message[1].lower() not in _SYSTEM_AUTHORS:
        consume(current_message)

    return AggregateStats(
        total_messages=total_messages,
        total_attachments=total_attachments,
        member_messages=dict(member_messages),
        hourly_messages=dict(hourly_messages),
        weekday_messages=dict(weekday_messages),
        average_response_minutes=round(sum(response_gaps) / len(response_gaps), 2) if response_gaps else None,
    )
