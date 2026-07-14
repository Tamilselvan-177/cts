"""Orchestrator — routes user queries to appropriate agents and combines outputs."""
from __future__ import annotations

from app.agents import sales, inventory, trend, recommendation
from app.services.data_service import get_all_data_for_agents


async def handle_query(query: str, include_viz: bool = False) -> dict:
    """Main entry point. Runs all agents and returns combined AI response."""
    data = get_all_data_for_agents()

    sales_result = sales.run(data, query)
    inventory_result = inventory.run(data, query)
    trend_result = trend.run(data, query)

    final_answer = recommendation.run(
        query=query,
        sales_output=sales_result,
        inventory_output=inventory_result,
        trend_output=trend_result,
    )

    result = {
        "query": query,
        "answer": final_answer,
        "agent_data": {
            "sales": sales_result,
            "inventory": inventory_result,
            "trends": trend_result,
        },
    }

    if include_viz:
        from app.agents.viz_agent import generate_chart_spec
        try:
            viz = await generate_chart_spec(query)
            result["visualization"] = viz
        except Exception as e:
            result["visualization"] = None

    return result
