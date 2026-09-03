from groupdna.parser import parse_chat


def test_parser_returns_aggregates_without_message_text():
    stats = parse_chat([
        "01/09/2026, 10:15 - Asha: this private message must not be persisted",
        "01/09/2026, 10:16 - Ravi: <Media omitted>",
    ])

    assert stats.total_messages == 2
    assert stats.total_attachments == 1
    assert stats.member_messages == {"Asha": 1, "Ravi": 1}
    assert not hasattr(stats, "messages")
    assert "private" not in repr(stats)
