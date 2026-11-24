"""Builds single-file editions of a no-build web app (Sites 3D skill).

    python build_single_file.py <project-dir> [--name "App Name"]

The project's index.html must wrap its parts in markers:

    <head> ... <!--BUILD:HEAD--> <title>, <link rel="stylesheet" href="css/x.css"> ... <!--/BUILD:HEAD--> </head>
    <body> <!--BUILD:BODY--> markup <!--/BUILD:BODY-->
           <!--BUILD:SCRIPTS--> <script src="vendor/three.min.js"></script> ... <!--/BUILD:SCRIPTS--> </body>

Outputs, in <project-dir>/dist/:
    <AppName>.html      standalone document: opens with a double click, no server or internet needed
                        (Google Fonts, if linked, fall back to system fonts when offline)
    <app-name>-embed.html  body-only variant for viewers that wrap the page in their own document
                        (e.g. a claude.ai Artifact); it sets window.APP_ENV = {viewer: true}

Local stylesheets, scripts and logo.svg (as favicon, if present) are inlined.
"""
import argparse
import base64
import io
import os
import re


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("project", nargs="?", default=".")
    ap.add_argument("--name", default=None, help="name for <title> and file names (default: index.html <title>)")
    args = ap.parse_args()
    root = os.path.abspath(args.project)

    def read(path):
        return io.open(os.path.join(root, path), encoding="utf-8").read()

    def block(html, name):
        m = re.search(r"<!--BUILD:%s-->(.*?)<!--/BUILD:%s-->" % (name, name), html, re.S)
        if not m:
            raise SystemExit("index.html is missing the <!--BUILD:%s--> ... <!--/BUILD:%s--> markers" % (name, name))
        return m.group(1)

    html = read("index.html")
    head, body, scripts = block(html, "HEAD"), block(html, "BODY").strip(), block(html, "SCRIPTS")
    t = re.search(r"<title>([^<]+)</title>", head)
    name = args.name or (t.group(1).strip() if t else "App")

    css = "\n".join(read(h) for h in re.findall(r'<link rel="stylesheet" href="(?!https?:)([^"]+)"', head))
    m = re.search(r'<link rel="stylesheet" href="(https://fonts[^"]+)"', head)
    fonts = m.group(1) if m else ""
    icon = ""
    if os.path.exists(os.path.join(root, "logo.svg")):
        icon = '<link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,%s">\n' % base64.b64encode(
            read("logo.svg").encode("utf-8")).decode("ascii")

    def inline_scripts(extra=""):
        out = [extra] if extra else []
        for src in re.findall(r'<script src="([^"]+)"></script>', scripts):
            code = read(src).replace("</script", "<\\/script")   # keep inlined code from closing the tag
            out.append("<script>/* %s */\n%s\n</script>" % (src, code))
        return "\n".join(out)

    font_async = ('<link rel="stylesheet" href="%s" media="print" onload="this.media=\'all\'">\n' % fonts) if fonts else ""
    font_plain = ('<link rel="stylesheet" href="%s">\n' % fonts) if fonts else ""

    standalone = (
        '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        "<title>%s</title>\n%s%s<style>\n%s\n</style>\n</head>\n<body>\n%s\n%s\n</body>\n</html>\n"
    ) % (name, icon, font_async, css, body, inline_scripts())

    embed = (
        "<title>%s</title>\n"
        '<meta name="claude:viewport-fit-sides" content="cover">\n'
        "%s<style>\n%s\n</style>\n%s\n%s\n"
    ) % (name, font_plain, css, body, inline_scripts("<script>window.APP_ENV = { viewer: true };</script>"))

    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "app"
    os.makedirs(os.path.join(root, "dist"), exist_ok=True)
    for fname, text in ((re.sub(r"\s+", "", name) + ".html", standalone), (slug + "-embed.html", embed)):
        path = os.path.join(root, "dist", fname)
        io.open(path, "w", encoding="utf-8", newline="\n").write(text)
        print("%s - %d KB" % (os.path.relpath(path), len(text.encode("utf-8")) // 1024))


if __name__ == "__main__":
    main()
