import pytest
from unittest.mock import MagicMock, patch

@pytest.fixture(autouse=True)
def mock_firebase_get_user():
    with patch("firebase_admin.auth.get_user") as mock_get_user:
        dummy_user = MagicMock()
        dummy_user.phone_number = "+5491112345678"
        mock_get_user.return_value = dummy_user
        yield mock_get_user
