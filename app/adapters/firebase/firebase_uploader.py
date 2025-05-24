from app.ports.file_uploader import FileUploader
import uuid
from datetime import timedelta
from firebase_admin import storage
from fastapi import UploadFile, HTTPException
from typing import Any
from PIL import Image
from io import BytesIO
import imghdr
from app.shared.logger import log


class FirebaseUploader(FileUploader):
    MAX_TAMANIO_MB = 5
    TAMANIO_MAXIMO = MAX_TAMANIO_MB * 1024 * 1024
    TIPOS_PERMITIDOS = ["jpeg", "png", "jpg", "webp"]

    def upload_file(self, name: str, content: bytes, content_type: str) -> str:
        unique_name = f"{uuid.uuid4()}_{name}"
        blob = storage.bucket().blob(unique_name)
        blob.upload_from_string(content, content_type=content_type)
        return blob.generate_signed_url(expiration=timedelta(days=7))

    def subir_imagen_a_storage(self, file: UploadFile, carpeta: str = "solicitudes") -> str:
        contenido = file.file.read()

        if len(contenido) > self.TAMANIO_MAXIMO:
            raise HTTPException(status_code=400, detail=f"La imagen excede los {self.MAX_TAMANIO_MB} MB")

        tipo_imagen = imghdr.what(None, h=contenido)
        if tipo_imagen not in self.TIPOS_PERMITIDOS:
            raise HTTPException(status_code=400, detail=f"Tipo de imagen no permitido: {tipo_imagen}")

        extension = file.filename.split(".")[-1]
        nombre_archivo = f"{carpeta}/{uuid.uuid4()}.{extension}"

        blob = storage.bucket().blob(nombre_archivo)
        blob.upload_from_string(contenido, content_type=file.content_type)
        blob.make_public()

        return blob.public_url

    def subir_imagen_con_thumbnail(self, file: UploadFile, carpeta: str = "solicitudes") -> dict:
        file.file.seek(0)
        contenido = file.file.read()

        ext = file.filename.split(".")[-1]
        nombre_archivo = f"{carpeta}/{uuid.uuid4()}.{ext}"

        blob = storage.bucket().blob(nombre_archivo)
        blob.upload_from_string(contenido, content_type=file.content_type)
        blob.make_public()
        url_original = blob.public_url

        # Thumbnail
        thumbnail_data = generar_thumbnail(contenido)
        nombre_thumb = f"{carpeta}/thumb_{uuid.uuid4()}.jpg"
        blob_thumb = storage.bucket().blob(nombre_thumb)
        blob_thumb.upload_from_string(thumbnail_data, content_type="image/jpeg")
        blob_thumb.make_public()
        url_thumbnail = blob_thumb.public_url

        return {
            "original": url_original,
            "thumbnail": url_thumbnail
        }


def generar_thumbnail(contenido: bytes, max_size=(300, 300)) -> bytes:
    image = Image.open(BytesIO(contenido))
    if image.mode not in ("RGB", "L"):
        image = image.convert("RGB")
    image.thumbnail(max_size)
    output = BytesIO()
    image.save(output, format="JPEG", quality=85)
    output.seek(0)
    return output.read()
