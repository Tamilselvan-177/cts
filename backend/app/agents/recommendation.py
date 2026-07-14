"""Recommendation Agent — synthesises all agent outputs and calls Gemini for a natural-language response.
Falls back to Groq (Llama 3) automatically if Gemini API rate limits or errors.
"""
from __future__ import annotations

import json
import os

from dotenv import load_dotenv
import google.generativeai as genai
from groq import Groq

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
genai.configure(api_key=GEMINI_API_KEY)

SYSTEM_PROMPT = """You are Sibi, an expert AI Business Assistant for a restaurant chain.
You are given the outputs of three specialized analytical agents:
1. Sales Agent (analyzes historical revenue and future forecasts)
2. Inventory Agent (analyzes stock levels, demand, and reorder alerts)
3. Trend Agent (analyzes category momentum and growth)

Your job is to synthesize these findings into a concise, actionable, and conversational response for a busy restaurant executive.
If the user asks a specific question, answer it directly using the data provided.
If the data indicates a problem (e.g. low stock on a top-selling item), proactively highlight it.

Rules:
- Keep the response under 3 paragraphs.
- Use bullet points for key metrics if helpful.
- Be professional but approachable.
- DO NOT invent numbers. Only use the numbers provided in the agent outputs.
- IMPORTANT: If the user asks for a chart or visualization, DO NOT apologize and DO NOT say you cannot generate one. A separate visualization engine automatically creates the charts on the screen. Simply say "Here is the chart you requested" and provide the textual insights.
"""


def run(query: str, sales_output: dict, inventory_output: dict, trend_output: dict) -> str:
    """Takes the user query and the outputs of the sub-agents, and generates a final answer."""
    user_message = f"""
User Query: {query}

--- Sales Agent Data ---
{json.dumps(sales_output, indent=2)}

--- Inventory Agent Data ---
{json.dumps(inventory_output, indent=2)}

--- Trend Agent Data ---
{json.dumps(trend_output, indent=2)}

Please provide your final synthesized response.
"""
    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction=SYSTEM_PROMPT,
        )
        response = model.generate_content(user_message)
        return response.text
    except Exception as e:
        print(f"[Fallback] Gemini API failed: {str(e)}. Switching to Groq API...")
        try:
            groq_client = Groq(api_key=GROQ_API_KEY)
            completion = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_message}
                ],
                temperature=0.2,
            )
            return completion.choices[0].message.content
        except Exception as groq_e:
            return f"Error connecting to AI Assistants (Gemini & Groq both failed). Gemini: {str(e)} | Groq: {str(groq_e)}"
