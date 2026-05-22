import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile, HTTPException
from fastapi.responses import FileResponse

router = APIRouter()

UPLOAD_ROOT = Path(__file__).resolve().parent.parent.parent.parent / "uploads"


@router.post("/upload/{schema_id}")
async def upload_image(schema_id: int, file: UploadFile):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Только изображения разрешены")

    ext = Path(file.filename).suffix if file.filename else ".png"
    if ext.lower() not in (".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp"):
        raise HTTPException(status_code=400, detail="Неподдерживаемый формат")

    schema_dir = UPLOAD_ROOT / str(schema_id)
    schema_dir.mkdir(parents=True, exist_ok=True)

    file_id = uuid.uuid4().hex + ext
    file_path = schema_dir / file_id
    content = await file.read()
    file_path.write_bytes(content)

    return {"file_id": file_id}


@router.get("/uploads/{schema_id}/{file_id}")
async def get_upload(schema_id: int, file_id: str):
    file_path = UPLOAD_ROOT / str(schema_id) / file_id
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Файл не найден")
    return FileResponse(file_path)
