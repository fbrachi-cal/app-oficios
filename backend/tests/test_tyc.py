from app.domain.services.tyc_service import TycService
from datetime import datetime, timezone, timedelta

def test_requires_acceptance_missing_tyc():
    user_data = {}
    assert TycService.requires_acceptance(user_data) is True

def test_requires_acceptance_not_accepted():
    user_data = {"tyc": {"accepted": False, "version": TycService.CURRENT_VERSION, "expires_at": TycService.CURRENT_EXPIRES_AT}}
    assert TycService.requires_acceptance(user_data) is True

def test_requires_acceptance_version_mismatch():
    user_data = {"tyc": {"accepted": True, "version": "v0.9", "expires_at": TycService.CURRENT_EXPIRES_AT}}
    assert TycService.requires_acceptance(user_data) is True

def test_requires_acceptance_expired():
    expired_date = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
    user_data = {"tyc": {"accepted": True, "version": TycService.CURRENT_VERSION, "expires_at": expired_date}}
    assert TycService.requires_acceptance(user_data) is True

def test_requires_acceptance_valid():
    valid_date = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()
    user_data = {"tyc": {"accepted": True, "version": TycService.CURRENT_VERSION, "expires_at": valid_date}}
    assert TycService.requires_acceptance(user_data) is False

def test_accept_terms():
    tyc = TycService.accept_terms()
    assert tyc["accepted"] is True
    assert tyc["version"] == TycService.CURRENT_VERSION
    assert tyc["expires_at"] == TycService.CURRENT_EXPIRES_AT
    assert "accepted_at" in tyc
