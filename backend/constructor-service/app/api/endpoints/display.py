import asyncio
import html as html_lib
import os
from typing import Any

from fastapi import APIRouter
from fastapi.responses import HTMLResponse, StreamingResponse
from pydantic import BaseModel

router = APIRouter()

DISPLAY_FILE = "/opt/pidisplay/display.html"

_sse_clients: list[asyncio.Queue] = []
_current_html: str = ""


def _load_display_html() -> str:
    if os.path.exists(DISPLAY_FILE):
        try:
            with open(DISPLAY_FILE, "r", encoding="utf-8") as f:
                return f.read()
        except OSError:
            pass
    return ""


def _save_full_page(blocks_html: str) -> None:
    page = f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ width: 100vw; height: 100vh; overflow: hidden; background: #000; position: relative; }}
  #content {{ width: 100%; height: 100%; position: relative; }}
</style>
</head>
<body>
<div id="content">{blocks_html}</div>
<script>
  var content = document.getElementById('content');
  function connect() {{
    var es = new EventSource('/api/display/stream');
    es.addEventListener('update', function(e) {{
      if (e.data) content.innerHTML = e.data;
    }});
    es.onerror = function() {{
      es.close();
      setTimeout(connect, 2000);
    }};
  }}
  connect();
</script>
</body>
</html>"""
    try:
        os.makedirs(os.path.dirname(DISPLAY_FILE), exist_ok=True)
        with open(DISPLAY_FILE, "w", encoding="utf-8") as f:
            f.write(page)
    except OSError:
        pass


DEFAULT_PAGE = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { width: 100vw; height: 100vh; overflow: hidden; background: #000; position: relative; }
  #content { width: 100%; height: 100%; position: relative; }
</style>
</head>
<body>
<div id="content">
<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#000;">
<p style="color:#444;font-family:sans-serif;font-size:24px">Ожидание контента...</p>
</div>
</div>
<script>
  var content = document.getElementById('content');
  function connect() {
    var es = new EventSource('/api/display/stream');
    es.addEventListener('update', function(e) {
      if (e.data) content.innerHTML = e.data;
    });
    es.onerror = function() {
      es.close();
      setTimeout(connect, 2000);
    };
  }
  connect();
</script>
</body>
</html>"""

# Загружаем при старте
_initial_page = _load_display_html()

PLACEHOLDER_HTML = (
    '<div style="width:100%;height:100%;display:flex;align-items:center;'
    'justify-content:center;background:#000;">'
    '<p style="color:#444;font-family:sans-serif;font-size:24px">Ожидание контента...</p>'
    '</div>'
)


class DisplayPayload(BaseModel):
    blocks: list[Any]


def render_blocks_to_html(blocks: list) -> str:
    elements = []
    for i, block in enumerate(blocks):
        z = 10 + i
        x = block.get("x", 50)
        y = block.get("y", 50)
        w = block.get("width", 20)
        h = block.get("height", 10)
        base_style = (
            f"position:absolute;"
            f"left:{x}%;"
            f"top:{y}%;"
            f"width:{w}%;"
            f"height:{h}%;"
            f"transform:translate(-50%,-50%);"
            f"z-index:{z};"
            f"overflow:hidden;"
        )

        if block.get("type") == "text":
            content = block.get("content", "")
            font_size = block.get("fontSize", 50)
            font_weight = block.get("fontWeight", "normal")
            color = block.get("color", "#000000")
            text_align = block.get("textAlign", "left")
            vertical_align = block.get("verticalAlign", "center")

            justify = {"left": "flex-start", "right": "flex-end", "center": "center"}.get(text_align, "flex-start")
            align = {"top": "flex-start", "bottom": "flex-end", "center": "center"}.get(vertical_align, "center")
            fs = f"calc({h}vh * {font_size} / 100)"

            inner_style = (
                f"width:100%;height:100%;overflow:hidden;"
                f"font-size:{fs};"
                f"font-weight:{font_weight};"
                f"color:{color};"
                f"text-align:{text_align};"
                f"display:flex;"
                f"align-items:{align};"
                f"justify-content:{justify};"
            )
            escaped = html_lib.escape(content).replace("\n", "<br>")
            elements.append(
                f'<div style="{base_style}">'
                f'<div style="{inner_style}">'
                f'<span style="white-space:pre-wrap;word-break:break-word;">{escaped}</span>'
                f'</div></div>'
            )

        elif block.get("type") == "image":
            src = block.get("src", "")
            if src and not src.startswith("data:") and not src.startswith("http://") and not src.startswith("https://") and not src.startswith("/"):
                src = f"/api/uploads/{src}"
            src = html_lib.escape(src)
            object_fit = block.get("objectFit", "cover")
            img_style = f"width:100%;height:100%;object-fit:{object_fit};display:block;"
            elements.append(
                f'<div style="{base_style}">'
                f'<img src="{src}" alt="" style="{img_style}" />'
                f'</div>'
            )

    return "".join(elements)


@router.get("/", response_class=HTMLResponse)
async def get_display():
    page = _load_display_html()
    if page:
        return HTMLResponse(content=page)
    return HTMLResponse(content=DEFAULT_PAGE)


@router.get("/stream")
async def stream_display():
    queue: asyncio.Queue = asyncio.Queue()
    _sse_clients.append(queue)

    # Читаем свежее состояние из файла (могло быть записано до старта процесса)
    saved = _load_display_html()
    initial_blocks = _current_html if _current_html else PLACEHOLDER_HTML

    async def event_generator():
        try:
            yield f"event: update\ndata: {initial_blocks}\n\n"

            while True:
                try:
                    data = await asyncio.wait_for(queue.get(), timeout=30)
                    yield f"event: update\ndata: {data}\n\n"
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"
        finally:
            if queue in _sse_clients:
                _sse_clients.remove(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/apply")
async def apply_display(payload: DisplayPayload):
    global _current_html

    blocks_html = render_blocks_to_html(payload.blocks)
    _current_html = blocks_html
    _save_full_page(blocks_html)

    for q in list(_sse_clients):
        await q.put(blocks_html)

    return {"status": "ok"}
