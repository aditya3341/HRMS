from typing import Optional

def normalize_status(status: Optional[str]) -> Optional[str]:
    """
    Safely normalizes any status string to UPPERCASE for consistency.
    Handles None and existing uppercase values efficiently.
    """
    if status is None:
        return None
    return str(status).strip().upper()
