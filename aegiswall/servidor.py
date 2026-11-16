"""Servidor local do AegisWall.

Serve esta pasta em http://localhost:8765, somente para esta máquina.
Manda o navegador revalidar os arquivos a cada acesso, para que uma alteração
em HTML, CSS ou JS apareça ao recarregar a página (sem versão antiga em cache).
"""
import os
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

PORTA = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
PASTA = os.path.dirname(os.path.abspath(__file__))


class Manipulador(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()


if __name__ == "__main__":
    servidor = ThreadingHTTPServer(("127.0.0.1", PORTA), partial(Manipulador, directory=PASTA))
    print(f"AegisWall em http://localhost:{PORTA}  (Ctrl+C para encerrar)")
    try:
        servidor.serve_forever()
    except KeyboardInterrupt:
        pass
