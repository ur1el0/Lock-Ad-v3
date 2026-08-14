def get_travel_advisory(distance, duration, weather_code, temperature):
    """
    Mock function to simulate an LLM analyzing route conditions.
    """
    if weather_code <= 3:
        return f"The weather is clear and {temperature}℃. It's a great day to travel, Your {distance}m trip should take about {duration //60 } minutes."
    elif weather_code <= 48:
        return f"There is fog in the area. Please drive carefully and keep your headlights on for your {duration // 60}-minute trip."
    elif weather_code <= 65:
        return f"It is currently raining ({temperature}℃). Roads may be slippery, so maintain a safe following distance and expect slight delays on your {distance}m route."
    elif weather_code <= 75:
        return f"Snow is falling. Proceed with extreme caution and ensure your vehicle is equipped for winter conditions."
    else:
        return f"Severe weather (thunderstorms or worse) detected. Consider delaying your {duration //60}-minute trip until conditions improve."