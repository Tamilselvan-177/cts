"""
Data service: reads ML pipeline outputs from local CSV files.
All floats are sanitized (NaN/Inf → None) before returning to prevent JSON errors.
"""
from __future__ import annotations

import json
import math
import os
from pathlib import Path
from typing import Any

import pandas as pd
from dotenv import load_dotenv

load_dotenv()

ML_DATA_DIR = Path(os.getenv("ML_DATA_DIR", "C:/Users/gowsi/project/cts/cts_ml_pipeline/source_data"))
ML_OUTPUT_DIR = Path(os.getenv("ML_OUTPUT_DIR", "C:/Users/gowsi/project/cts/cts_ml_pipeline/outputs"))


# ─── helpers ─────────────────────────────────────────────────────────────────

def _csv(relative: str) -> Path:
    return ML_DATA_DIR / relative


def _out(relative: str) -> Path:
    return ML_OUTPUT_DIR / relative


def _clean(obj: Any) -> Any:
    """Recursively replace NaN/Inf with None so JSON serialization never fails."""
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return round(obj, 4)
    if isinstance(obj, dict):
        return {k: _clean(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_clean(i) for i in obj]
    return obj


def _df_to_records(df: pd.DataFrame) -> list[dict]:
    """Convert DataFrame to clean JSON-safe records."""
    return _clean(df.to_dict("records"))


# ─── Executive Dashboard ──────────────────────────────────────────────────────

def get_executive_summary() -> dict:
    orders = pd.read_csv(_csv("orders.csv"), parse_dates=["order_date"])
    order_items = pd.read_csv(_csv("order_items.csv"))
    products = pd.read_csv(_csv("products.csv"))
    stores = pd.read_csv(_csv("stores.csv"))

    fact = orders.merge(order_items, on="order_id").merge(products, on="product_id").merge(stores, on="store_id")

    total_revenue = round(float(fact["line_total"].sum()), 2)
    total_orders = int(fact["order_id"].nunique())
    total_customers = int(fact["customer_id"].nunique())

    fact["month"] = fact["order_date"].dt.to_period("M")
    monthly = fact.groupby("month")["line_total"].sum().sort_index()
    if len(monthly) >= 2:
        prev = float(monthly.iloc[-2])
        curr = float(monthly.iloc[-1])
        growth_pct = round((curr - prev) / prev * 100, 2) if prev else 0.0
    else:
        growth_pct = 0.0

    top_products = (
        fact.groupby("product_name")["quantity"]
        .sum()
        .sort_values(ascending=False)
        .head(5)
        .reset_index()
        .rename(columns={"quantity": "units_sold"})
    )

    store_perf = pd.read_csv(_out("reports/store_performance.csv"))
    worst_stores = store_perf.sort_values("revenue").head(5)[["store_name", "revenue", "orders", "performance_label"]]
    best_stores = store_perf.sort_values("revenue", ascending=False).head(5)[["store_name", "revenue", "orders", "performance_label"]]

    tomorrow_rev = pd.read_csv(_out("predictions/tomorrow_store_revenue.csv"))
    predicted_tomorrow_total = round(float(tomorrow_rev["predicted_revenue"].sum()), 2)

    metrics = json.loads(_out("metrics.json").read_text())

    return _clean({
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "total_customers": total_customers,
        "revenue_growth_pct": growth_pct,
        "predicted_tomorrow_revenue": predicted_tomorrow_total,
        "top_products": top_products.to_dict("records"),
        "worst_stores": worst_stores.to_dict("records"),
        "best_stores": best_stores.to_dict("records"),
        "ml_metrics": metrics,
        "data_last_updated": pd.Timestamp.now().isoformat(),
    })


# ─── Sales Prediction ────────────────────────────────────────────────────────

def get_sales_predictions() -> dict:
    orders = pd.read_csv(_csv("orders.csv"), parse_dates=["order_date"])
    order_items = pd.read_csv(_csv("order_items.csv"))
    products = pd.read_csv(_csv("products.csv"))
    fact = orders.merge(order_items, on="order_id").merge(products, on="product_id")

    daily = (
        fact.groupby("order_date")["line_total"]
        .sum()
        .reset_index()
        .sort_values("order_date")
        .tail(90)
    )
    daily["order_date"] = daily["order_date"].dt.strftime("%Y-%m-%d")
    daily_chart = daily.rename(columns={"line_total": "actual_revenue"})

    fact["month"] = fact["order_date"].dt.to_period("M").dt.to_timestamp()
    monthly = (
        fact.groupby("month")["line_total"]
        .sum()
        .reset_index()
        .sort_values("month")
    )
    monthly["month"] = monthly["month"].dt.strftime("%Y-%m")
    monthly_chart = monthly.rename(columns={"line_total": "revenue"})

    tomorrow_store = pd.read_csv(_out("predictions/tomorrow_store_revenue.csv"))
    tomorrow_product = pd.read_csv(_out("predictions/tomorrow_product_demand.csv"))

    tomorrow_total = round(float(tomorrow_store["predicted_revenue"].sum()), 2)
    weekly_forecast = round(tomorrow_total * 7, 2)
    monthly_forecast = round(tomorrow_total * 30, 2)

    cat_trends = pd.read_csv(_out("reports/category_trends.csv"))
    # replace inf/nan in growth columns
    cat_trends = cat_trends.replace([float("inf"), float("-inf")], None)
    cat_trends = cat_trends.where(cat_trends.notna(), None)

    return _clean({
        "daily_chart": daily_chart.to_dict("records"),
        "monthly_chart": monthly_chart.to_dict("records"),
        "tomorrow_revenue": tomorrow_total,
        "weekly_forecast": weekly_forecast,
        "monthly_forecast": monthly_forecast,
        "tomorrow_top_products": tomorrow_product.sort_values("predicted_quantity", ascending=False).head(10).to_dict("records"),
        "category_trends": cat_trends.to_dict("records"),
        "tomorrow_store_predictions": tomorrow_store.to_dict("records"),
    })


# ─── Inventory / Demand ──────────────────────────────────────────────────────

def get_inventory_data() -> dict:
    products = pd.read_csv(_csv("products.csv"))
    order_items = pd.read_csv(_csv("order_items.csv"))
    orders = pd.read_csv(_csv("orders.csv"), parse_dates=["order_date"])
    fact = orders.merge(order_items, on="order_id").merge(products, on="product_id")

    recent = fact[fact["order_date"] >= fact["order_date"].max() - pd.Timedelta(days=30)]
    recent_demand = recent.groupby(["product_id", "product_name", "category"])["quantity"].sum().reset_index()
    recent_demand = recent_demand.rename(columns={"quantity": "actual_demand_30d"})

    tomorrow_demand = pd.read_csv(_out("predictions/tomorrow_product_demand.csv"))

    merged = recent_demand.merge(
        tomorrow_demand[["product_id", "predicted_quantity"]],
        on="product_id",
        how="left",
    )
    merged["predicted_quantity"] = merged["predicted_quantity"].fillna(0).round(1)
    merged["avg_daily_demand"] = (merged["actual_demand_30d"] / 30).round(2)
    merged["stock_status"] = merged.apply(
        lambda r: "Low Stock" if r["predicted_quantity"] > r["avg_daily_demand"] * 0.9 else "OK", axis=1
    )

    low_stock = merged[merged["stock_status"] == "Low Stock"].sort_values("predicted_quantity", ascending=False)
    overstock = merged[merged["predicted_quantity"] < merged["avg_daily_demand"] * 0.5].sort_values("predicted_quantity")

    store_perf = pd.read_csv(_out("reports/store_performance.csv"))

    return _clean({
        "product_demand": merged.to_dict("records"),
        "low_stock_alerts": low_stock.head(10).to_dict("records"),
        "overstock_products": overstock.head(10).to_dict("records"),
        "low_stock_count": int(len(low_stock)),
        "total_products": int(len(merged)),
        "store_performance": store_perf.to_dict("records"),
        "category_trends": pd.read_csv(_out("reports/category_trends.csv")).replace([float("inf"), float("-inf")], None).where(lambda x: x.notna(), None).to_dict("records"),
        "data_last_updated": pd.Timestamp.now().isoformat(),
    })


# ─── Raw data for agents ─────────────────────────────────────────────────────

def get_all_data_for_agents() -> dict:
    """Returns a compact, JSON-safe data snapshot for the AI agents."""
    store_perf = pd.read_csv(_out("reports/store_performance.csv"))
    tomorrow_rev = pd.read_csv(_out("predictions/tomorrow_store_revenue.csv"))
    tomorrow_dem = pd.read_csv(_out("predictions/tomorrow_product_demand.csv"))
    cat_trends = pd.read_csv(_out("reports/category_trends.csv")).replace([float("inf"), float("-inf")], None)
    metrics = json.loads(_out("metrics.json").read_text())

    # Also load raw source for richer context
    orders = pd.read_csv(_csv("orders.csv"), parse_dates=["order_date"])
    order_items = pd.read_csv(_csv("order_items.csv"))
    products = pd.read_csv(_csv("products.csv"))
    fact = orders.merge(order_items, on="order_id").merge(products, on="product_id")

    total_revenue = round(float(fact["line_total"].sum()), 2)
    total_orders = int(fact["order_id"].nunique())

    return _clean({
        "store_performance": store_perf.to_dict("records"),
        "tomorrow_store_revenue": tomorrow_rev.to_dict("records"),
        "tomorrow_product_demand": tomorrow_dem.to_dict("records"),
        "category_trends": cat_trends.to_dict("records"),
        "ml_metrics": metrics,
        "total_revenue": total_revenue,
        "total_orders": total_orders,
        "data_last_updated": pd.Timestamp.now().isoformat(),
    })
