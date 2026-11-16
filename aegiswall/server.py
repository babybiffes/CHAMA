"""Local AegisWall server.

Serves this folder at http://localhost:8765 for this machine only and tells the
browser to revalidate files on every visit, so edits show up without clearing caches.

    python server.py [port]
"""
import http.server
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler) as httpd:
        print("AegisWall at http://localhost:%d  (Ctrl+C to stop)" % PORT)
        httpd.serve_forever()
