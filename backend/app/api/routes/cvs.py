from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from typing import List, Optional
from datetime import datetime
from app.domain.cv.models import CV, CVUploadData, CVUpdateData
from app.domain.cv.service import CvService
from app.adapters.firebase.cv_repository import FirebaseCvRepository
from app.adapters.firebase.storage_adapter import FirebaseCvStorageAdapter
from app.shared.roles import require_role

router = APIRouter()

def get_cv_service() -> CvService:
    repo = FirebaseCvRepository()
    storage = FirebaseCvStorageAdapter()
    return CvService(repo=repo, storage=storage)

@router.post("/upload", response_model=CV)
def upload_cv(
    candidate_name: str = Form(...),
    email: Optional[str] = Form(None),
    phone: str = Form(...),
    tags: str = Form(""),
    skills: str = Form(""),
    seniority: str = Form("Junior"),
    notes: Optional[str] = Form(None),
    source: str = Form("Direct"),
    residence_zone: Optional[str] = Form(None),
    age: Optional[int] = Form(None),
    salary_expectation: Optional[str] = Form(None),
    casa_rayuela_interview_result: Optional[str] = Form(None),
    client_interview_notes: Optional[str] = Form(None),
    file: UploadFile = File(...),
    user_data: dict = Depends(require_role(["admin", "recruiter"])),
    service: CvService = Depends(get_cv_service)
):
    upload_data = CVUploadData(
        candidate_name=candidate_name,
        email=email,
        phone=phone,
        tags=[t.strip() for t in tags.split(",") if t.strip()],
        skills=[s.strip() for s in skills.split(",") if s.strip()],
        seniority=seniority,
        notes=notes,
        source=source,
        residence_zone=residence_zone,
        age=age,
        salary_expectation=salary_expectation,
        casa_rayuela_interview_result=casa_rayuela_interview_result,
        client_interview_notes=client_interview_notes
    )
    
    content = file.file.read()
    
    allowed_types = [
        "application/pdf", 
        "application/msword", 
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ]
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Only PDF, DOC, DOCX are allowed.")
        
    return service.process_upload(
        upload_data=upload_data,
        file_content=content,
        file_name=file.filename,
        content_type=file.content_type,
        uploader_id=user_data["uid"]
    )

@router.get("/", response_model=List[CV])
def list_cvs(
    status: Optional[str] = None,
    seniority: Optional[str] = None,
    search_text: Optional[str] = None,
    salary_expectation: Optional[str] = None,
    casa_rayuela_interview_result: Optional[str] = None,
    residence_zone: Optional[str] = None,
    user_data: dict = Depends(require_role(["admin", "recruiter"])),
    service: CvService = Depends(get_cv_service)
):
    filters = {}
    if status is not None:
        filters["status"] = status
    if seniority is not None:
        filters["seniority"] = seniority
    if search_text is not None:
        filters["search_text"] = search_text
    if salary_expectation is not None:
        filters["salary_expectation"] = salary_expectation
    if casa_rayuela_interview_result is not None:
        filters["casa_rayuela_interview_result"] = casa_rayuela_interview_result
    if residence_zone is not None:
        filters["residence_zone"] = residence_zone

    return service.repo.list_cvs(filters)

@router.get("/{cv_id}", response_model=CV)
def get_cv(
    cv_id: str,
    user_data: dict = Depends(require_role(["admin", "recruiter"])),
    service: CvService = Depends(get_cv_service)
):
    cv = service.repo.get_cv(cv_id)
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")
    return cv

@router.put("/{cv_id}", response_model=CV)
def update_cv(
    cv_id: str,
    update_data: CVUpdateData,
    user_data: dict = Depends(require_role(["admin", "recruiter"])),
    service: CvService = Depends(get_cv_service)
):
    cv = service.repo.get_cv(cv_id)
    if not cv:
        raise HTTPException(status_code=404, detail="CV not found")
        
    update_dict = update_data.model_dump(exclude_unset=True)
    
    # Handle status history if status changed
    if "status" in update_dict and update_dict["status"] != cv.status:
        now = datetime.utcnow()
        new_history = cv.status_history + [{"status": update_dict["status"], "date": now}]
        update_dict["status_history"] = new_history
        update_dict["updated_at"] = now
        
    updated_cv = service.repo.update_cv(cv_id, update_dict)
    return updated_cv
