import uuid
import fitz # PyMuPDF
from datetime import datetime, timezone
from app.domain.cv.models import CV, CVUploadData
from app.domain.cv.ports import CvRepositoryPort, CvStoragePort
from app.shared.logger import log

class CvService:
    def __init__(self, repo: CvRepositoryPort, storage: CvStoragePort):
        self.repo = repo
        self.storage = storage

    def extract_text(self, file_content: bytes, content_type: str) -> str:
        if content_type == "application/pdf":
            try:
                doc = fitz.open(stream=file_content, filetype="pdf")
                text = ""
                for page in doc:
                    text += page.get_text() + " "
                return text.strip()
            except Exception as e:
                log.error(f"Error extracting PDF text: {e}")
                return ""
        # For DOCX or others, we skip for MVP
        log.info(f"Skipping text extraction for content type: {content_type}")
        return ""

    def _generate_search_text(self, data: CVUploadData, cv_text: str) -> str:
        parts = [
            data.candidate_name,
            data.email or "",
            data.phone or "",
            " ".join(data.tags),
            " ".join(data.skills),
            data.seniority,
            data.residence_zone or "",
            data.salary_expectation or "",
            data.casa_rayuela_interview_result or "",
            data.client_interview_notes or "",
            cv_text
        ]
        # Clean up whitespace and lower
        return " ".join([p for p in parts if p]).lower()

    def process_upload(self, upload_data: CVUploadData, file_content: bytes, file_name: str, content_type: str, uploader_id: str) -> CV:
        cv_id = str(uuid.uuid4())
        
        # 1. Upload to storage
        storage_info = self.storage.upload_cv(
            file_content=file_content,
            file_name=file_name,
            uploader_id=uploader_id,
            cv_id=cv_id,
            content_type=content_type
        )
        
        # 2. Extract text natively
        cv_text = self.extract_text(file_content, content_type)
        
        # 3. Create search index
        search_text = self._generate_search_text(upload_data, cv_text)
        
        # 4. Save metadata
        now = datetime.now(timezone.utc)
        cv = CV(
            id=cv_id,
            candidate_name=upload_data.candidate_name,
            email=upload_data.email,
            phone=upload_data.phone,
            file_url=storage_info["url"],
            file_name=file_name,
            storage_path=storage_info["storage_path"],
            content_type=content_type,
            size_bytes=len(file_content),
            uploaded_by=uploader_id,
            created_at=now,
            updated_at=now,
            tags=upload_data.tags,
            skills=upload_data.skills,
            seniority=upload_data.seniority,
            status="New",
            status_history=[{
                "status": "New",
                "date": now
            }],
            notes=upload_data.notes or "",
            source=upload_data.source,
            residence_zone=upload_data.residence_zone,
            age=upload_data.age,
            salary_expectation=upload_data.salary_expectation,
            casa_rayuela_interview_result=upload_data.casa_rayuela_interview_result,
            client_interview_notes=upload_data.client_interview_notes,
            search_text=search_text,
            cv_text=cv_text
        )
        
        try:
            saved_cv = self.repo.save_cv(cv)
            log.info(f"Successfully saved CV metadata for {cv_id}")
            return saved_cv
        except Exception as e:
            log.error(f"Failed to save CV metadata to DB, rolling back storage for {cv_id}. Error: {e}")
            self.storage.delete_cv(storage_info["storage_path"])
            raise
