"""Builds the single-file editions of AegisWall.

    python build.py

dist/AegisWall.html          - standalone: open it with a double click, no server or internet needed
                               (fonts fall back to system fonts when offline).
dist/aegiswall-embed.html    - body-only variant for viewers that wrap the page in their own document.

Everything (styles, scripts, icons, Three.js) is inlined. Sources stay in css/ and js/.
"""
import base64
import io
import os
import re

ROOT = os.path.dirname(os.path.abspath(__file__))


def read(path):
    return io.open(os.path.join(ROOT, path), encoding="utf-8").read()


def block(html, name):
    m = re.search(r"<!--BUILD:%s-->(.*?)<!--/BUILD:%s-->" % (name, name), html, re.S)
    return m.group(1)


def inline_scripts(fragment, extra=""):
    out = [extra] if extra else []
    for src in re.findall(r'<script src="([^"]+)"></script>', fragment):
        code = read(src).replace("</script", "<\\/script")
        out.append("<script>/* %s */\n%s\n</script>" % (src, code))
    return "\n".join(out)


def main():
    html = read("index.html")
    css = read("css/style.css")
    body = block(html, "BODY").strip()
    scripts = block(html, "SCRIPTS")
    fonts = re.search(r'<link rel="stylesheet" href="(https://fonts[^"]+)"', html).group(1)
    icon = "data:image/svg+xml;base64," + base64.b64encode(read("logo.svg").encode("utf-8")).decode("ascii")
    os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)

    standalone = (
        '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        "<title>AegisWall</title>\n"
        '<link rel="icon" type="image/svg+xml" href="%s">\n'
        '<link rel="stylesheet" href="%s" media="print" onload="this.media=\'all\'">\n'
        "<style>\n%s\n</style>\n</head>\n<body>\n%s\n%s\n</body>\n</html>\n"
    ) % (icon, fonts, css, body, inline_scripts(scripts))

    embed = (
        "<title>AegisWall</title>\n"
        '<meta name="claude:viewport-fit-sides" content="cover">\n'
        '<link rel="stylesheet" href="%s">\n'
        "<style>\n%s\n</style>\n%s\n%s\n"
    ) % (fonts, css, body, inline_scripts(scripts, "<script>window.AW_ENV = { viewer: true };</script>"))

    for name, text in (("AegisWall.html", standalone), ("aegiswall-embed.html", embed)):
        path = os.path.join(ROOT, "dist", name)
        io.open(path, "w", encoding="utf-8", newline="\n").write(text)
        print("%s - %d KB" % (os.path.join("dist", name), len(text.encode("utf-8")) // 1024))


if __name__ == "__main__":
    main()
