"""Trend Agent — analyses category trends, growth, and seasonal patterns."""
from __future__ import annotations


def run(data: dict, query: str) -> dict:
    cat_trends = data.get("category_trends", [])

    growing = [c for c in cat_trends if c.get("trend") == "Growing"]
    stable = [c for c in cat_trends if c.get("trend") == "Stable"]
    declining = [c for c in cat_trends if c.get("trend") == "Declining"]

    # Top growth categories
    top_growth = sorted(
        [c for c in growing if c.get("revenue_growth_pct") is not None],
        key=lambda x: x.get("revenue_growth_pct", 0),
        reverse=True,
    )

    return {
        "agent": "Trend Agent",
        "category_trends": cat_trends,
        "growing_categories": growing,
        "stable_categories": stable,
        "declining_categories": declining,
        "top_growth_categories": top_growth[:3],
        "summary": (
            f"{len(growing)} categories growing, "
            f"{len(stable)} stable, "
            f"{len(declining)} declining."
        ),
    }
