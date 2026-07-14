"""Inventory Agent — answers questions about stock, demand, and reorder needs."""
from __future__ import annotations


def run(data: dict, query: str) -> dict:
    tomorrow_demand = data.get("tomorrow_product_demand", [])

    # Top demand items
    top_demand = sorted(tomorrow_demand, key=lambda x: x.get("predicted_quantity", 0), reverse=True)[:10]

    # Simulate inventory thresholds: if predicted_quantity > 5 → low stock alert
    low_stock = [p for p in tomorrow_demand if p.get("predicted_quantity", 0) > 5.0]
    overstock = [p for p in tomorrow_demand if p.get("predicted_quantity", 0) < 1.0]

    total_predicted_units = sum(p.get("predicted_quantity", 0) for p in tomorrow_demand)

    return {
        "agent": "Inventory Agent",
        "total_predicted_units_tomorrow": round(total_predicted_units, 1),
        "top_demand_products": top_demand,
        "low_stock_alerts": low_stock[:10],
        "overstock_products": overstock[:10],
        "low_stock_count": len(low_stock),
        "overstock_count": len(overstock),
    }
