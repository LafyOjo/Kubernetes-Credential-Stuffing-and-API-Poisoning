from __future__ import annotations


def calculate_security_score(
    password: str,
    *,
    two_factor: bool = False,
    security_question: bool = False,
) -> int:
    """Return a simple 0-100 score estimating account security."""
    score = 0
    if len(password) >= 8:
        score += 20
    if len(password) >= 12:
        score += 20
    if any(ch.isdigit() for ch in password):
        score += 20
    if any(not ch.isalnum() for ch in password):
        score += 20
    if two_factor:
        score += 10
    if security_question:
        score += 10
    return min(score, 100)
