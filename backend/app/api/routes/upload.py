from app.api.dependencies import get_file_uploader
from app.ports.file_uploader import FileUploader
from fastapi import APIRouter, UploadFile, File, Depends
from typing import List
from app.adapters.firebase.firebase_uploader import FirebaseUploader



router = APIRouter(prefix="/upload", tags=["upload"])
uploader = FirebaseUploader()


@router.post("/")
async def subir_archivos(files: List[UploadFile] = File(...), uploader: FileUploader = Depends(get_file_uploader),):
    urls = []
    for file in files:
        contenido = await file.read()
        url = uploader.upload_file(file.filename, contenido, file.content_type)
        urls.append({"filename": file.filename, "url": url})
    return urls
