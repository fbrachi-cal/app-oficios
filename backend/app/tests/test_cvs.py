import pytest
from unittest.mock import Mock
from app.domain.cv.service import CvService
from app.domain.cv.models import CVUploadData

# Basic test to ensure orchestration and mocked Firebase rollback flow works
def test_cv_upload_rollback_on_db_fail():
    mock_repo = Mock()
    mock_storage = Mock()
    
    # Mock storage upload to succeed
    mock_storage.upload_cv.return_value = {
        "url": "https://fake.url",
        "storage_path": "cvs/test/123/fake.pdf"
    }
    
    # Mock DB save to fail
    mock_repo.save_cv.side_effect = Exception("DB Error")
    
    service = CvService(repo=mock_repo, storage=mock_storage)
    
    upload_data = CVUploadData(
        candidate_name="Test User",
        phone="123456789",
        tags=["python"],
        skills=[],
        seniority="Junior"
    )
    
    with pytest.raises(Exception, match="DB Error"):
        service.process_upload(
            upload_data=upload_data,
            file_content=b"dummy content",
            file_name="test.pdf",
            content_type="application/pdf",
            uploader_id="user123"
        )
        
    # Verify rollback was called explicitly
    mock_storage.delete_cv.assert_called_once_with("cvs/test/123/fake.pdf")
