from fastapi import APIRouter, Request, Body, HTTPException, Depends, Header, Path as FastPath
import json
from pathlib import Path
from typing import Optional
import git
from app.core.git import get_repo, get_next_schema_id, REPO_DIR
from datetime import datetime

router = APIRouter()

@router.get("/my")
async def get_my_schemas(
    user_id: str = Header(..., alias="X-User-ID")
):
    try:
        user_id_int = int(user_id)

        schemas = []

        # Ищем все .json файлы в REPO_DIR
        for file_path in REPO_DIR.glob("*.json"):
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    file_content = json.load(f)

                # Проверяем, принадлежит ли схема этому пользователю
                if file_content.get("user_id") == user_id_int:
                    schemas.append(file_content)

            except (json.JSONDecodeError, IOError, KeyError):
                continue  # пропускаем повреждённые файлы

        # Сортируем по schema_id (от большего к меньшему)
        schemas.sort(key=lambda x: x["schema_id"], reverse=True)

        return {
            "schemas": schemas
        }

    except ValueError:
        raise HTTPException(status_code=400, detail="X-User-ID должен быть числом")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения списка схем: {str(e)}")

@router.post("/save")
async def save_schema(
    payload: list = Body(...),
    schema_id: int | None = Body(None),
    schema_name: str = Body(...),
    user_id: str = Header(..., alias="X-User-ID"),
    repo: git.Repo = Depends(get_repo)
):
    try:
        if schema_id is None:
            schema_id = get_next_schema_id()

        if schema_id <= 0:
            raise HTTPException(status_code=400, detail="schema_id должен быть положительным числом")
        
        # Защита от path traversal
        filename = f"{schema_id}.json"
        if ".." in filename or filename.startswith("/"):
            raise HTTPException(status_code=400, detail="Недопустимый путь к файлу")
        
        # Полный путь относительно REPO_DIR
        file_path = Path(filename)
        
        # Полный путь к файлу
        full_path = REPO_DIR / file_path
        full_path.parent.mkdir(parents=True, exist_ok=True)

        file_content = {
            "schema_id": schema_id,
            "schema_name": schema_name,
            "user_id": int(user_id),
            "payload": payload                    # оригинальный payload лежит отдельно
        }

        # Сохраняем JSON красиво отформатированным
        with open(full_path, "w", encoding="utf-8") as f:
            json.dump(file_content, f, ensure_ascii=False, indent=2)

        # Сообщение коммита
        commit_msg = f"Save schema: {file_path}"

        # Git commit
        repo.index.add([str(file_path)])
        commit = repo.index.commit(commit_msg)

        return {
            "status": "success"
        }

    except ValueError:
        # Сработает, если пытаются выйти за пределы REPO_DIR
        raise HTTPException(status_code=400, detail="Недопустимый путь к файлу")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка сохранения: {str(e)}")
    
@router.get("/{schema_id}/history")
async def get_schema_history(
    schema_id: int = FastPath(..., description="ID схемы"),
    user_id: str = Header(..., alias="X-User-ID"),
    repo: git.Repo = Depends(get_repo)
):
    try:
        user_id_int = int(user_id)

        filename = f"{schema_id}.json"

        # Защита от path traversal
        if ".." in filename or filename.startswith("/"):
            raise HTTPException(status_code=400, detail="Недопустимый путь к файлу")

        full_path = REPO_DIR / filename

        # Проверяем, существует ли файл
        if not full_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Схема с ID {schema_id} не найдена"
            )

        # Читаем текущий файл, чтобы проверить владельца
        with open(full_path, "r", encoding="utf-8") as f:
            file_content = json.load(f)

        # === Проверка владельца ===
        saved_user_id = file_content.get("user_id")
        if saved_user_id is None or saved_user_id != user_id_int:
            raise HTTPException(
                status_code=403,
                detail="Доступ запрещён: вы не являетесь владельцем этой схемы"
            )

        # === Получаем историю изменений файла из Git ===
        history = []
        try:
            # reverse=True — от старых коммитов к новым
            for commit in repo.iter_commits(paths=str(filename), reverse=False):
                history.append({
                    "commit_sha": commit.hexsha,
                    "date": commit.committed_datetime.isoformat(),
                })
        except Exception:
            # Если по какой-то причине история недоступна
            history = []

        return {
            "history": history
        }

    except ValueError:
        raise HTTPException(status_code=400, detail="X-User-ID должен быть числом")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения истории: {str(e)}")
    
@router.get("/{schema_id}/version/{commit_sha}")
async def get_schema_version(
    schema_id: int = FastPath(..., description="ID схемы"),
    commit_sha: str = FastPath(..., description="Хеш коммита"),
    user_id: str = Header(..., alias="X-User-ID"),
    repo: git.Repo = Depends(get_repo)
):
    try:
        user_id_int = int(user_id)

        filename = f"{schema_id}.json"

        # Защита пути
        if ".." in filename or filename.startswith("/"):
            raise HTTPException(status_code=400, detail="Недопустимый путь к файлу")

        full_path = REPO_DIR / filename

        # Проверяем, что схема вообще существует (хотя бы текущая версия)
        if not full_path.exists():
            raise HTTPException(status_code=404, detail=f"Схема с ID {schema_id} не найдена")

        # Проверяем владельца по текущей версии
        with open(full_path, "r", encoding="utf-8") as f:
            current_content = json.load(f)

        if current_content.get("user_id") != user_id_int:
            raise HTTPException(
                status_code=403,
                detail="Доступ запрещён: вы не являетесь владельцем этой схемы"
            )

        # Получаем конкретную версию из Git
        try:
            commit = repo.commit(commit_sha)
            # Получаем файл из дерева коммита
            blob = commit.tree / filename
            
            # Читаем содержимое
            file_bytes = blob.data_stream.read()
            file_content = json.loads(file_bytes.decode('utf-8'))

            return {
                "data": file_content
            }

        except KeyError:
            raise HTTPException(
                status_code=404,
                detail=f"Версия с commit_sha {commit_sha} не найдена для схемы {schema_id}"
            )
        except Exception as git_error:
            raise HTTPException(
                status_code=400,
                detail=f"Неверный commit_sha или ошибка Git: {str(git_error)}"
            )

    except ValueError:
        raise HTTPException(status_code=400, detail="X-User-ID должен быть числом")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения версии: {str(e)}")
    
@router.get("/{schema_id}")
async def get_schema(
    schema_id: int = FastPath(..., description="ID схемы"),
    user_id: str = Header(..., alias="X-User-ID")   # ← Теперь обязательно
):
    try:
        user_id_int = int(user_id)

        # Защита от path traversal
        filename = f"{schema_id}.json"
        if ".." in filename or filename.startswith("/"):
            raise HTTPException(status_code=400, detail="Недопустимый путь к файлу")
        
        # Полный путь относительно REPO_DIR
        file_path = Path(filename)
        
        # Полный путь к файлу
        full_path = REPO_DIR / file_path

        if not full_path.exists():
            raise HTTPException(
                status_code=404,
                detail=f"Схема с ID {schema_id} не найдена"
            )

        # Читаем файл
        with open(full_path, "r", encoding="utf-8") as f:
            file_content = json.load(f)

        # === Проверка владельца ===
        saved_user_id = file_content.get("user_id")
        if saved_user_id is None or saved_user_id != user_id_int:
            raise HTTPException(
                status_code=403,
                detail="Доступ запрещён: вы не являетесь владельцем этой схемы"
            )

        return {
            "data": file_content
        }

    except ValueError:
        raise HTTPException(status_code=400, detail="X-User-ID должен быть числом")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения схемы: {str(e)}")