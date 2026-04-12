from fastapi import APIRouter
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Any
import html as html_lib

router = APIRouter()

DISPLAY_FILE = "/tmp/display.html"

PLACEHOLDER_HTML = """<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { background: #000; display: flex; align-items: center; justify-content: center; height: 100vh; }
  p { color: #444; font-family: sans-serif; font-size: 24px; }
</style>
<script>setInterval(() => location.reload(), 5000);</script>
</head>
<body><p>Ожидание контента...</p></body>
</html>"""


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
            src = html_lib.escape(block.get("src", ""))
            object_fit = block.get("objectFit", "cover")
            img_style = f"width:100%;height:100%;object-fit:{object_fit};display:block;"
            elements.append(
                f'<div style="{base_style}">'
                f'<img src="{src}" alt="" style="{img_style}" />'
                f'</div>'
            )

    body = "\n".join(elements)
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * {{ margin: 0; padding: 0; box-sizing: border-box; }}
  body {{ width: 100vw; height: 100vh; overflow: hidden; background: #fff; position: relative; }}
</style>
<script>setInterval(() => location.reload(), 5000);</script>
</head>
<body>
{body}
</body>
</html>"""


@router.post("/apply")
async def apply_display(payload: DisplayPayload):
    html = render_blocks_to_html(payload.blocks)
    with open(DISPLAY_FILE, "w", encoding="utf-8") as f:
        f.write(html)
    return {"status": "ok"}


@router.get("/", response_class=HTMLResponse)
async def get_display():
    try:
        with open(DISPLAY_FILE, "r", encoding="utf-8") as f:
            return HTMLResponse(content=f.read())
    except FileNotFoundError:
        return HTMLResponse(content=PLACEHOLDER_HTML)
