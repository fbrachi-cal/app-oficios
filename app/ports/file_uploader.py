from abc import ABC, abstractmethod
from fastapi import UploadFile

class FileUploader(ABC):
    @abstractmethod
    def upload_file(self, name: str, content: bytes, content_type: str) -> str:
        pass

    @abstractmethod
    def subir_imagen_a_storage(file: UploadFile, carpeta: str) -> str:
        pass
    
    @abstractmethod
    def subir_imagen_con_thumbnail(file: UploadFile, carpeta: str) -> dict:
        pass