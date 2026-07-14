"""
Visualization Agent — uses Gemini to generate Recharts-compatible chart specs
from natural language queries and live business data.
Falls back to Groq (Llama 3) automatically if Gemini API rate limits or errors.
"""
from __future__ import annotations

import json
import os

from dotenv import load_dotenv
import google.generativeai as genai
from groq import Groq

from app.services.data_service import get_all_data_for_agents

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
genai.configure(api_key=GEMINI_API_KEY)

VIZ_SYSTEM_PROMPT = """You are an expert data visualization agent for a restaurant chain analytics dashboard.
Given a business question, you must return a JSON object that describes a Recharts chart.

The JSON must follow this exact schema:
{
  "chart_type": "bar" | "line" | "pie" | "area" | "scatter",
  "title": "Chart title",
  "description": "1-2 sentence insight about this chart",
  "data": [{ "name": "...", "value": number, ...extra keys }],
  "x_key": "name",
  "y_keys": [{ "key": "value", "label": "...", "color": "#hex" }],
  "insight": "Key takeaway from this chart in 1 sentence"
}

Rules:
- Only return valid JSON, no markdown, no explanation outside JSON.
- Use real numbers from the data context provided.
- Colors should be from this palette: #6366f1, #8b5cf6, #34d399, #f59e0b, #ef4444, #06b6d4, #a78bfa
- For pie charts, use { "name": "...", "value": number } format for data items.
- Limit data to max 15 items for readability.
- Always include a meaningful insight field."""


async def generate_chart_spec(query: str) -> dict:
    """Generate a Recharts-compatible chart spec from a natural language query."""
    data = get_all_data_for_agents()
    context = f"""Business Query: {query}

Available Data:
- Store Performance: {json.dumps(data.get('store_performance', [])[:10], default=str)}
- Tomorrow Store Revenue Predictions: {json.dumps(data.get('tomorrow_store_revenue', [])[:10], default=str)}
- Tomorrow Product Demand: {json.dumps(data.get('tomorrow_product_demand', [])[:15], default=str)}
- Category Trends: {json.dumps(data.get('category_trends', []), default=str)}
- Total Revenue: {data.get('total_revenue')}
- Total Orders: {data.get('total_orders')}

Generate a chart spec JSON for this query using the above data."""

    text = ""
    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=VIZ_SYSTEM_PROMPT,
            generation_config=genai.GenerationConfig(
                temperature=0.2,
                max_output_tokens=1024,
                response_mime_type="application/json"
            )
        )
        response = model.generate_content(context)
        text = response.text.strip()
    except Exception as e:
        print(f"[Fallback] Gemini API failed for viz_agent: {str(e)}. Switching to Groq API...")
        try:
            groq_client = Groq(api_key=GROQ_API_KEY)
            completion = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": VIZ_SYSTEM_PROMPT},
                    {"role": "user", "content": context}
                ],
                temperature=0.2,
                response_format={"type": "json_object"}
            )
            text = completion.choices[0].message.content.strip()
        except Exception as groq_e:
            # Complete fallback to hardcoded dict if both fail
            print(f"[Fallback] Groq API also failed: {str(groq_e)}.")
            tomorrow = data.get("tomorrow_product_demand", [])[:10]
            return {
                "chart_type": "bar",
                "title": "Tomorrow's Product Demand Forecast",
                "description": "Predicted units needed for top products tomorrow",
                "data": [
                    {"name": p.get("product_name", "")[:20], "value": round(p.get("predicted_quantity", 0), 1)}
                    for p in tomorrow
                ],
                "x_key": "name",
                "y_keys": [{"key": "value", "label": "Predicted Units", "color": "#6366f1"}],
                "insight": "These are the top predicted demand items for tomorrow based on ML forecasts.",
                "query": query,
                "error": f"Gemini: {str(e)} | Groq: {str(groq_e)}",
            }

    # Clean JSON text
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    text = text.strip()

    try:
        spec = json.loads(text)
        spec["query"] = query
        return spec
    except json.JSONDecodeError as je:
        return {
            "chart_type": "bar",
            "title": "Error parsing AI Chart",
            "description": str(je),
            "data": [],
            "x_key": "name",
            "y_keys": [],
            "insight": f"Raw text received: {text[:100]}...",
            "query": query
        }
