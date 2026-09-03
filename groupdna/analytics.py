from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import asdict, dataclass
from datetime import datetime
import re
from typing import Iterable

import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from .parser import AggregateStats, _LINE_PATTERNS, _parse_timestamp

_WORD_RE = re.compile(r"[A-Za-z][A-Za-z']{2,}")
_STOP_WORDS = {
    "about", "after", "again", "been", "from", "have", "just", "that", "this",
    "the", "their", "there", "they", "what", "when", "where", "which", "with",
    "your", "you", "are", "for", "and", "but", "not", "was", "were", "will",
}
_ARCHETYPES = ("The Catalyst", "The Anchor", "The Night Owl", "The Spark", "The Observer")


@dataclass(frozen=True)
class AnalysisResult:
    stats: AggregateStats
    members: list[dict[str, object]]
    sentiment_trend: list[dict[str, object]]
    top_words: dict[str, int]

    def to_dict(self) -> dict[str, object]:
        return {
            "stats": asdict(self.stats),
            "members": self.members,
            "sentiment_trend": self.sentiment_trend,
            "top_words": self.top_words,
        }


def _message_records(lines: Iterable[str]) -> list[tuple[datetime, str, str]]:
    records: list[tuple[datetime, str, str]] = []
    current: tuple[datetime, str, str] | None = None
    for line in lines:
        match = next((pattern.match(line.strip()) for pattern in _LINE_PATTERNS), None)
        if not match:
            if current:
                current = (current[0], current[1], f"{current[2]} {line.strip()}")
            continue
        timestamp = _parse_timestamp(match.group("date"), match.group("time"))
        if timestamp is None:
            continue
        if current:
            records.append(current)
        current = (timestamp, match.group("author").strip(), match.group("body"))
    if current:
        records.append(current)
    return [record for record in records if record[1].lower() not in {"system", "you created group"}]


def analyze_chat(lines: Iterable[str]) -> AnalysisResult:
    records = _message_records(lines)
    stats = _aggregate_records(records)
    by_author: dict[str, list[tuple[datetime, str]]] = defaultdict(list)
    for timestamp, author, body in records:
        by_author[author].append((timestamp, body))

    feature_rows: list[dict[str, float | str]] = []
    for author, messages in by_author.items():
        bodies = [body for _, body in messages]
        words = [word for body in bodies for word in _WORD_RE.findall(body)]
        joined = " ".join(bodies)
        hours = [timestamp.hour for timestamp, _ in messages]
        feature_rows.append({
            "author": author,
            "message_volume": float(len(messages)),
            "night_message_pct": sum(hour >= 22 or hour < 6 for hour in hours) / len(messages),
            "avg_words": float(sum(len(_WORD_RE.findall(body)) for body in bodies) / len(messages)),
            "caps_exclamation_pct": sum(body.isupper() or "!" in body for body in bodies) / len(messages),
            "question_pct": sum("?" in body for body in bodies) / len(messages),
            "emoji_rate": sum(not character.isascii() for character in joined) / max(len(joined), 1),
            "caring_keyword_rate": sum(word.lower() in {"thanks", "thank", "love", "care", "sorry", "help"} for word in words) / max(len(words), 1),
            "response_speed_minutes": float(_response_speed(messages)),
            "silent_day_pct": float(_silent_day_pct(messages)),
        })

    if feature_rows:
        feature_names = [key for key in feature_rows[0] if key != "author"]
        matrix = np.array([[float(row[key]) for key in feature_names] for row in feature_rows])
        scaled = StandardScaler().fit_transform(matrix) if len(feature_rows) > 1 else matrix
        cluster_count = min(5, len(feature_rows))
        labels = KMeans(n_clusters=cluster_count, n_init=10, random_state=42).fit_predict(scaled) if cluster_count > 1 else np.array([0])
        for row, label in zip(feature_rows, labels):
            row["cluster"] = int(label)
            row["archetype"] = _ARCHETYPES[int(label) % len(_ARCHETYPES)]

    analyzer = SentimentIntensityAnalyzer()
    sentiment_by_day: dict[str, list[float]] = defaultdict(list)
    for timestamp, _, body in records:
        sentiment_by_day[timestamp.date().isoformat()].append(analyzer.polarity_scores(body)["compound"])
    trend = [{"date": date, "score": round(sum(scores) / len(scores), 3)} for date, scores in sorted(sentiment_by_day.items())]
    words = Counter(word.lower() for _, _, body in records for word in _WORD_RE.findall(body) if word.lower() not in _STOP_WORDS)
    return AnalysisResult(stats, feature_rows, trend, dict(words.most_common(20)))


def _aggregate_records(records: list[tuple[datetime, str, str]]) -> AggregateStats:
    member_messages = Counter(author for _, author, _ in records)
    hourly_messages = Counter(timestamp.hour for timestamp, _, _ in records)
    weekday_messages = Counter(timestamp.strftime("%A") for timestamp, _, _ in records)
    attachments = sum("<media omitted>" in body.lower() or "(file attached)" in body.lower() for _, _, body in records)
    gaps = [(records[index][0] - records[index - 1][0]).total_seconds() / 60 for index in range(1, len(records))]
    valid_gaps = [gap for gap in gaps if 0 <= gap <= 24 * 60]
    return AggregateStats(len(records), attachments, dict(member_messages), dict(hourly_messages), dict(weekday_messages), round(sum(valid_gaps) / len(valid_gaps), 2) if valid_gaps else None)


def _response_speed(messages: list[tuple[datetime, str]]) -> float:
    gaps = [(messages[index][0] - messages[index - 1][0]).total_seconds() / 60 for index in range(1, len(messages))]
    valid = [gap for gap in gaps if 0 <= gap <= 24 * 60]
    return sum(valid) / len(valid) if valid else 0.0


def _silent_day_pct(messages: list[tuple[datetime, str]]) -> float:
    days = {timestamp.date() for timestamp, _ in messages}
    if not days:
        return 1.0
    span = (max(days) - min(days)).days + 1
    return max(0.0, (span - len(days)) / span)
