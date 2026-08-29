import logging
from django.conf import settings
from google import genai

logger = logging.getLogger(__name__)

def get_travel_advisory(distance, duration, weather_code, temperature):
    """
    Calls Google Gemini API for a smart route advisory.
    Gracefully falls backe to hardcoded logic if the API fails.
    """
    try: 
        # 1. Retrieve the secure key
        api_key = getattr(settings, 'GEMINI_API_KEY', None)
        if not api_key:
            raise ValueError("Gemini API Key is missing.")
        
        # 2. Initialize the official client
        client = genai.Client(api_key=api_key)

        # 3. Construct a strict prompt (Prompt Engineering)
        prompt = (
            f"You are a personal safety navigation assistant for a system in the Philippines."
            f"A user is planning a walking route that is {distance} meters long and takes {duration // 60} minutes."
            f"The current weather code is {weather_code} and temperature is {temperature}℃."
            f"Provide a brief, 2-sentence safty advisory. Be cautious but practical. Do not user markdown."
        )

        # 4. Call the Free Tier Flash Model
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=prompt,
        )

        return response.text.strip()

    except Exception as e:
        # 5. Graceful Degration (Fallback)
        logger.warning(f"Gemini API failed or timed out: {e}. Falling back to standard advisory.")
        return _get_fallback_advisory(distance, duration, weather_code, temperature)
    

def _get_fallback_advisory(distance, duration, weather_code, temperature):
    """Original hardcoded logic used as a highly resilient safe fallback."""
    if weather_code <= 3:
        return f"The weather is clear and {temperature}℃. It's a great day to travel. Your {distance}m trip should take about {duration // 60} minutes."
    elif weather_code <= 48:
        return f"There is fog in the area. Please walk carefully and stay visible for your {duration // 60}-minute trip."
    elif weather_code <= 65:
        return f"It is currently raining ({temperature}℃). Walkways may be slippery, so expect slight delays on your {distance}m route."
    elif weather_code <= 75:
        return f"Heavy rain or severe conditions. Proceed with extreme caution."
    else:
        return f"Severe weather detected. Consider delaying your {duration // 60}-minute trip until conditions improve."