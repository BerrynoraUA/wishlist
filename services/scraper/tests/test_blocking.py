from app.blocking import BlockReason, classify_block


def test_embedded_recaptcha_does_not_block_complete_product_page() -> None:
    body = """
    <html>
      <head>
        <meta property="og:title" content="MORUCHA RFID Wallet">
        <meta property="og:image" content="https://souq.co/product.webp">
      </head>
      <body>
        <span class="discounted-unit-price">$59.99</span>
        <script src="https://www.google.com/recaptcha/api.js"></script>
        <div class="g-recaptcha"></div>
      </body>
    </html>
    """

    assert classify_block(200, body).blocked is False


def test_recaptcha_challenge_without_product_meta_remains_blocked() -> None:
    decision = classify_block(
        200,
        "<html><title>Verify</title><div class='g-recaptcha'></div></html>",
    )

    assert decision.blocked is True
    assert decision.reason == BlockReason.CAPTCHA
