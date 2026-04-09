from pathlib import Path
import git

REPO_DIR = Path("schemas")

def get_repo() -> git.Repo:
    REPO_DIR.mkdir(exist_ok=True)
    if not (REPO_DIR / ".git").exists():
        repo = git.Repo.init(REPO_DIR)
        gitignore = REPO_DIR / ".gitignore"
        gitignore.write_text("__pycache__/\n*.tmp\n.DS_Store\n*.log\n")
        repo.index.add([".gitignore"])
        repo.index.commit("Initial commit: .gitignore")
        print(f"Git-репозиторий создан в {REPO_DIR.absolute()}")
    else:
        repo = git.Repo(REPO_DIR)
    return repo

def get_next_schema_id() -> int:
    """Находит максимальный schema_id в папке и возвращает +1"""
    if not REPO_DIR.exists():
        return 1

    max_id = 0
    for file in REPO_DIR.glob("*.json"):
        try:
            # Пытаемся взять имя файла без расширения и преобразовать в int
            file_id = int(file.stem)
            if file_id > max_id:
                max_id = file_id
        except ValueError:
            continue  # пропускаем файлы, у которых имя не число

    return max_id + 1