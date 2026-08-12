from uuid import UUID
from typing import Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.performance import PerformanceCycle
from app.models.system_config import SystemConfig
from app.models.enums import PerformanceCycleStatus, AuditAction
from app.utils.audit import log_audit

class PerformanceService:
    @staticmethod
    def activate_cycle(db: Session, cycle_id: UUID, current_user: dict) -> PerformanceCycle:
        cycle = db.query(PerformanceCycle).filter(
            PerformanceCycle.id == cycle_id,
            PerformanceCycle.entity_id == UUID(current_user["entity_id"])
        ).first()
        
        if not cycle:
            raise HTTPException(status_code=404, detail="Performance cycle not found")
        
        if cycle.status != PerformanceCycleStatus.DRAFT:
            raise HTTPException(status_code=400, detail="Only DRAFT cycles can be activated")
            
        # 1. Fetch ALL active system configs to snapshot
        configs = db.query(SystemConfig).filter(SystemConfig.is_active == True).all()
        snapshot = {c.config_key: c.config_value for c in configs}
        
        # 2. Update cycle
        cycle.config_snapshot = snapshot
        cycle.status = PerformanceCycleStatus.ACTIVE
        
        # 3. Audit Log
        log_audit(
            db=db,
            user=current_user,
            action=AuditAction.PERFORMANCE_CYCLE_ACTIVATED,
            module="PERFORMANCE",
            resource_type="PerformanceCycle",
            resource_id=str(cycle.id),
            new_values={"status": "ACTIVE", "snapshot_keys": list(snapshot.keys())}
        )
        
        db.commit()
        return cycle

    @staticmethod
    def get_config_value(db: Session, key: str, cycle_id: Optional[UUID] = None) -> Any:
        """
        Config resolution hierarchy:
          - ACTIVE / CLOSED cycle → ALWAYS use frozen config_snapshot (never live system_configs)
          - DRAFT cycle or no cycle → fall back to live system_configs
        """
        if cycle_id:
            cycle = db.query(PerformanceCycle).filter(PerformanceCycle.id == cycle_id).first()
            if cycle:
                if cycle.status in (PerformanceCycleStatus.ACTIVE, PerformanceCycleStatus.CLOSED):
                    # Hard-frozen: return snapshot value or None — never read live config
                    return (cycle.config_snapshot or {}).get(key)
                # DRAFT — snapshot may not exist yet, fall through to live config
                if cycle.config_snapshot and key in cycle.config_snapshot:
                    return cycle.config_snapshot[key]

        # Fallback to current live config (DRAFT cycles or no cycle context)
        config = db.query(SystemConfig).filter(
            SystemConfig.config_key == key,
            SystemConfig.is_active == True
        ).first()
        return config.config_value if config else None
