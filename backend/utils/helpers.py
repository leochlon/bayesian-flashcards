# General helpers (interval_to_text, etc.)

def interval_to_text(minutes):
    """Convert an interval in minutes to a human-readable string."""
    if minutes < 60:
        return f"{minutes} minutes"
    elif minutes < 1440:
        return f"{minutes // 60} hours"
    else:
        days = minutes // 1440
        hours = (minutes % 1440) // 60
        return f"{days} days, {hours} hours" if hours else f"{days} days"
