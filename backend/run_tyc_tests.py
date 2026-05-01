import sys
from tests.test_tyc import *

try:
    test_requires_acceptance_missing_tyc()
    test_requires_acceptance_not_accepted()
    test_requires_acceptance_version_mismatch()
    test_requires_acceptance_expired()
    test_requires_acceptance_valid()
    test_accept_terms()
    print("All tests passed successfully.")
except AssertionError as e:
    print(f"Test failed: {e}")
    sys.exit(1)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
