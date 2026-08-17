from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Dict, Any

class BaseBiometricAdapter(ABC):
    """
    Abstract base class for all biometric device adapters.
    Ensures a consistent interface for PULL-based ingestion.
    """
    
    def __init__(self, device_config: Dict[str, Any]):
        self.config = device_config

    @abstractmethod
    def connect(self) -> bool:
        """Establish connection to the device."""
        pass

    @abstractmethod
    def fetch_logs(self, start_time: datetime) -> List[Dict[str, Any]]:
        """
        Fetch logs from the device starting from a specific time.
        Returns a list of standardized punch dictionaries.
        """
        pass

    @abstractmethod
    def disconnect(self):
        """Close connection to the device."""
        pass
