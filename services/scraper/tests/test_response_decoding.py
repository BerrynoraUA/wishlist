from app.fetching.http import decode_response_body


def test_response_decoder_respects_declared_iso_8859_1_charset() -> None:
    text = "Cendrars refuse avec véhémence"

    decoded = decode_response_body(
        text.encode("iso-8859-1"),
        {"content-type": "text/html;charset=ISO-8859-1"},
    )

    assert decoded == text
