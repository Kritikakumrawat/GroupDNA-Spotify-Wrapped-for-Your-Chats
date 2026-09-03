from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from .parser import AggregateStats


class AggregateStore:
    """SQLite persistence containing aggregate metrics only."""

    def __init__(self, path: str | Path = "groupdna.db") -> None:
        self.path = str(path)
        self._initialize()

    def _initialize(self) -> None:
        with sqlite3.connect(self.path) as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS analyses (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                    total_messages INTEGER NOT NULL,
                    total_attachments INTEGER NOT NULL,
                    average_response_minutes REAL,
                    member_messages_json TEXT NOT NULL,
                    hourly_messages_json TEXT NOT NULL,
                    weekday_messages_json TEXT NOT NULL
                )
                """
            )

    def save(self, stats: AggregateStats) -> int:
        with sqlite3.connect(self.path) as connection:
            cursor = connection.execute(
                """
                INSERT INTO analyses (
                    total_messages, total_attachments, average_response_minutes,
                    member_messages_json, hourly_messages_json, weekday_messages_json
                ) VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    stats.total_messages,
                    stats.total_attachments,
                    stats.average_response_minutes,
                    json.dumps(stats.member_messages),
                    json.dumps(stats.hourly_messages),
                    json.dumps(stats.weekday_messages),
                ),
            )
            return int(cursor.lastrowid)
