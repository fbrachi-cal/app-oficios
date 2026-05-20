"""
Gamification repository port.
Defines the abstract interface that any persistence adapter must implement.
"""
from abc import ABC, abstractmethod
from typing import List, Optional


class GamificationRepository(ABC):

    # ------------------------------------------------------------------
    # Programs
    # ------------------------------------------------------------------

    @abstractmethod
    def get_program(self, program_id: str) -> Optional[dict]:
        """Return a single gamification program document or None."""
        pass

    # ------------------------------------------------------------------
    # Levels
    # ------------------------------------------------------------------

    @abstractmethod
    def get_levels_for_program(self, program_id: str) -> List[dict]:
        """Return all levels for a program, sorted by level_order ascending."""
        pass

    # ------------------------------------------------------------------
    # User profiles
    # ------------------------------------------------------------------

    @abstractmethod
    def get_profile(self, user_id: str, program_id: str) -> Optional[dict]:
        """Return the user gamification profile for (user_id, program_id) or None."""
        pass

    @abstractmethod
    def save_profile(self, profile: dict) -> None:
        """Upsert a user gamification profile."""
        pass

    # ------------------------------------------------------------------
    # Events
    # ------------------------------------------------------------------

    @abstractmethod
    def create_event(self, event: dict) -> str:
        """Persist a gamification event and return its generated ID."""
        pass

    @abstractmethod
    def get_pending_events(self, user_id: str, program_id: str) -> List[dict]:
        """Return unseen gamification events for a user+program."""
        pass

    @abstractmethod
    def mark_event_seen(self, event_id: str, seen_at: str) -> None:
        """Mark a gamification event as seen."""
        pass

    @abstractmethod
    def get_event(self, event_id: str) -> Optional[dict]:
        """Return a single event by ID or None."""
        pass
