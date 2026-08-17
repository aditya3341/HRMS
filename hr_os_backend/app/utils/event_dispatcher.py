"""
=============================================================
 HR OS — Central Event Dispatcher
 
 All business events flow through this module.
 To emit an event from any API route:
 
   from app.utils.event_dispatcher import emit_event
   emit_event("OFFER_APPROVED", payload={"offer": offer, "application": app}, db=db)
 
 Handlers are registered in the HANDLERS dict below.
=============================================================
"""
import traceback
from typing import Any
from sqlalchemy.orm import Session


# ------------------------------------
# HANDLER IMPORTS
# ------------------------------------
from app.utils.event_hooks import (
    handle_offer_approved,
    handle_onboarding_started,
    handle_leave_applied,
    handle_interview_moved,
)


# ------------------------------------
# EVENT REGISTRY
# Key   = event name (string constant)
# Value = list of handler callables
# Each handler receives: (payload: dict, db: Session)
# ------------------------------------
HANDLERS: dict[str, list] = {
    "OFFER_APPROVED":       [handle_offer_approved],
    "ONBOARDING_STARTED":   [handle_onboarding_started],
    "LEAVE_APPLIED":        [handle_leave_applied],
    "INTERVIEW_MOVED":      [handle_interview_moved],
}


# ------------------------------------
# DISPATCHER
# ------------------------------------
def emit_event(event_name: str, payload: dict[str, Any], db: Session) -> None:
    """
    Fire all handlers registered for the given event.
    Handlers are isolated — one failing handler does NOT
    abort the rest (logged but swallowed).
    """
    handlers = HANDLERS.get(event_name, [])
    if not handlers:
        print(f"[event_dispatcher] No handlers for event: {event_name}")
        return

    for handler in handlers:
        try:
            handler(payload=payload, db=db)
        except Exception as e:
            print(f"[event_dispatcher] Handler {handler.__name__} failed for event '{event_name}': {e}")
            traceback.print_exc()
