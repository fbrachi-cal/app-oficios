import re
from app.domain.cv.ports import CvStoragePort
from firebase_admin import storage
from app.shared.logger import log

class FirebaseCvStorageAdapter(CvStoragePort):
    
    def _sanitize_filename(self, filename: str) -> str:
        # Keep alphanumeric, dot, dash, underscore
        safe = re.sub(r'[^a-zA-Z0-9.\-_]', '_', filename)
        return safe

    def upload_cv(self, file_content: bytes, file_name: str, uploader_id: str, cv_id: str, content_type: str) -> dict:
        safe_name = self._sanitize_filename(file_name)
        storage_path = f"cvs/{uploader_id}/{cv_id}/{safe_name}"
        
        blob = storage.bucket().blob(storage_path)
        blob.upload_from_string(file_content, content_type=content_type)
        blob.make_public()
        
        url = blob.public_url
        
        log.info(f"CV uploaded to Firebase Storage at {storage_path}")
        
        return {
            "url": url,
            "storage_path": storage_path
        }

    def delete_cv(self, storage_path: str) -> bool:
        try:
            blob = storage.bucket().blob(storage_path)
            if blob.exists():
                blob.delete()
                log.info(f"Deleted CV from Storage: {storage_path}")
                return True
            else:
                log.warning(f"Attempted to delete non-existent CV blob: {storage_path}")
                return False
        except Exception as e:
            log.error(f"Error deleting CV from storage {storage_path}: {e}")
            return False
