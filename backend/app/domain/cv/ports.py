from typing import List, Dict, Optional, Any
from abc import ABC, abstractmethod
from app.domain.cv.models import CV

class CvRepositoryPort(ABC):
    @abstractmethod
    def save_cv(self, cv: CV) -> CV:
        pass

    @abstractmethod
    def get_cv(self, cv_id: str) -> Optional[CV]:
        pass

    @abstractmethod
    def update_cv(self, cv_id: str, data: dict) -> Optional[CV]:
        pass

    @abstractmethod
    def list_cvs(self, filters: dict = None) -> List[CV]:
        pass

    @abstractmethod
    def delete_cv(self, cv_id: str) -> bool:
        pass


class CvStoragePort(ABC):
    @abstractmethod
    def upload_cv(self, file_content: bytes, file_name: str, uploader_id: str, cv_id: str, content_type: str) -> dict:
        """
        Uploads the given file content to storage.
        Must return a dictionary containing at minimum:
        - 'url': The public or signed URL to access the file
        - 'storage_path': The explicit path in storage (can be used for deletion later)
        """
        pass

    @abstractmethod
    def delete_cv(self, storage_path: str) -> bool:
        pass
