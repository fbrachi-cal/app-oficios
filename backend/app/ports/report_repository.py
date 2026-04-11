from abc import ABC, abstractmethod
from typing import List, Dict, Optional


class ReportRepository(ABC):

    @abstractmethod
    def create_report(self, data: dict) -> str:
        """Persist a new report and return its generated ID."""
        pass

    @abstractmethod
    def get_all_reports(
        self,
        status_filter: Optional[str] = None,
        limit: int = 20,
        start_after_id: Optional[str] = None,
    ) -> List[Dict]:
        """Return all reports, optionally filtered by status, with cursor-based pagination."""
        pass

    @abstractmethod
    def get_report_by_id(self, report_id: str) -> Optional[Dict]:
        """Return a single report or None if not found."""
        pass

    @abstractmethod
    def update_report(self, report_id: str, campos: dict) -> None:
        """Partially update a report document."""
        pass
