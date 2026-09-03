from groupdna.analytics import analyze_chat


CHAT = [
    "01/09/2026, 10:15 - Asha: I love this idea!",
    "01/09/2026, 10:16 - Ravi: What do you think?",
    "01/09/2026, 10:17 - Asha: Thanks for your help.",
]


def test_analysis_assigns_archetypes_and_sentiment():
    result = analyze_chat(CHAT)

    assert result.stats.total_messages == 3
    assert len(result.members) == 2
    assert all(member["archetype"] for member in result.members)
    assert result.sentiment_trend[0]["date"] == "2026-09-01"
    assert "idea" in result.top_words


def test_analysis_handles_single_member_chat():
    result = analyze_chat(["01/09/2026, 10:15 - Asha: hello everyone"])

    assert len(result.members) == 1
    assert result.members[0]["archetype"] == "The Catalyst"
