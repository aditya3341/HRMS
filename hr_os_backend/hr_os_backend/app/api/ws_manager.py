import json
from typing import List, Dict
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        # active_connections[user_id] = [WebSocket, ...]
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # user_metadata[user_id] = {"role": str, "manager_id": uuid, "department_id": uuid}
        self.user_metadata: Dict[str, dict] = {}

    async def connect(self, websocket: WebSocket, user_id: str, metadata: dict):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)
        self.user_metadata[user_id] = metadata

    def disconnect(self, websocket: WebSocket, user_id: str):
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                if user_id in self.user_metadata:
                    del self.user_metadata[user_id]

    async def broadcast_event(self, event_data: dict, target_employee_id: str, target_manager_id: str = None):
        """
        Broadcasts an attendance event only to permitted users.
        - HR/Admins see everything.
        - Managers only see their direct reports.
        """
        payload = json.dumps(event_data)
        
        for user_id, connections in self.active_connections.items():
            metadata = self.user_metadata.get(user_id, {})
            role = metadata.get("role")
            
            # Permission Check
            is_permitted = False
            if role in ["SUPER_ADMIN", "HR_ADMIN"]:
                is_permitted = True
            elif role == "MANAGER":
                # If the connected user is the manager of the person who punched
                if str(user_id) == str(target_manager_id):
                    is_permitted = True

            if is_permitted:
                for connection in connections:
                    try:
                        await connection.send_text(payload)
                    except Exception:
                        # Stale connection handling
                        pass

# Global instance
manager = ConnectionManager()
