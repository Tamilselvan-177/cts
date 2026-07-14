"""Sales Agent — answers questions about revenue, forecasts, and sales trends."""
from __future__ import annotations


def run(data: dict, query: str) -> dict:
    store_perf = data.get("store_performance", [])
    tomorrow_rev = data.get("tomorrow_store_revenue", [])

    total_revenue = sum(s.get("revenue", 0) for s in store_perf)
    predicted_tomorrow = sum(s.get("predicted_revenue", 0) for s in tomorrow_rev)

    top_stores = sorted(store_perf, key=lambda x: x.get("revenue", 0), reverse=True)[:5]
    worst_stores = sorted(store_perf, key=lambda x: x.get("revenue", 0))[:5]
    tomorrow_top = sorted(tomorrow_rev, key=lambda x: x.get("predicted_revenue", 0), reverse=True)[:5]

    return {
        "agent": "Sales Agent",
        "total_actual_revenue": round(total_revenue, 2),
        "predicted_tomorrow_total": round(predicted_tomorrow, 2),
        "top_performing_stores": top_stores,
        "worst_performing_stores": worst_stores,
        "tomorrow_top_stores": tomorrow_top,
        "ml_metrics": data.get("ml_metrics", {}),
    }
