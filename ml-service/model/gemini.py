import os
import json
from google import genai

def build_prompt(formula_output):
    scores = formula_output["lot_scores"]
    summary = formula_output["summary"]
    
    ranked = sorted(scores.items(), key=lambda x: x[1]["pressure"])
    ranked_lines = "\n".join(
        f"  Lot {lot}: {data['pressure']:.2f} pressure score ({data['pressure']*100:.0f}% predicted occupancy)"
        for lot, data in ranked
    )

    return f"""You are a parking prediction AI for UT Dallas (a 70% commuter campus).

Campus snapshot:
- {summary['events_active']} active classes, {summary['events_starting']} starting within 30 min, {summary['events_ending']} ended within 15 min
- Total active class capacity: {summary['total_active_capacity']} students (room seats, not enrollment)
- Weather multiplier: {summary['weather_multiplier']} (1.0=clear, 1.3=light rain, 1.6=heavy rain)

These pressure scores already factor in:
- 70% commuter ratio (only commuters need parking)
- 80% class attendance rate
- 60% lot spread factor (students don't all park at the single closest lot)
- Lot-specific capacity from real spot counts
- Building-to-lot affinity weights based on walking distance

Pre-computed lot pressure scores (0.0 = empty, 1.0 = completely full):
{ranked_lines}

IMPORTANT realism rules for your predictions:
- Even low-pressure lots should show 5-15% occupancy during class hours (staff, early arrivals, etc.)
- Lots near engineering buildings (I, J, H) tend to fill faster than remote lots (U, A2, B2)
- Small lots (P=90, N=72, S=110, A1=110, I=114) fill up much faster than large lots (U=780, A2=885)
- During peak hours (10am-2pm weekdays), even far lots should show at least 10-20%
- Never predict exactly 0% unless there are truly zero events on campus
- Rarely predict 100% - even "full" lots usually have 5-10% turnover from cars leaving

Rank the lots from most available to least available.
For the top recommendation write one plain English sentence explaining why, referencing specific buildings and campus conditions.

Respond only in this JSON format, no markdown, no extra text:
{{
  "ranked_lots": [
    {{
      "lot": "U",
      "predicted_occupancy_pct": 22,
      "status": "available",
      "recommended": true,
      "reason": "Lot U has 780 green spaces and sits far from today's active engineering classes, keeping demand low despite moderate campus activity."
    }},
    {{
      "lot": "H",
      "predicted_occupancy_pct": 58,
      "status": "moderate",
      "recommended": false,
      "reason": null
    }}
  ],
  "tts_summary": "Lot U is your best bet right now at twenty two percent occupancy with plenty of green spaces available."
}}

Rules:
- status is "available" if occupancy < 40, "moderate" if 40-70, "full" if above 70
- recommended is true only for the first lot
- tts_summary is a single short sentence suitable for text-to-speech, spell out numbers, no percent signs
- include ALL lots that have a score
- predicted_occupancy_pct should be realistic and nuanced, not just the raw pressure score copied verbatim
"""

def get_parking_recommendation(formula_output):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("WARNING: GEMINI_API_KEY not set!")
        return {"error": "API key missing", "ranked_lots": [], "tts_summary": ""}
    
    client = genai.Client(api_key=api_key)
    prompt = build_prompt(formula_output)
    
    try:
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=prompt
        )
        text = response.text.strip()
        
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
            
        return json.loads(text.strip())
    except Exception as e:
        print(f"ERROR: Gemini parse failed - {e}")
        return {
            "error": str(e),
            "raw_text": response.text if 'response' in locals() else "",
            "ranked_lots": [],
            "tts_summary": "I'm having trouble retrieving parking predictions right now."
        }
