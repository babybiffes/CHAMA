"""Gera portatil/AegisWall.html: o painel inteiro em um único arquivo.

O arquivo gerado não precisa de servidor, Python nem internet: basta copiá-lo
para outra máquina e abrir com dois cliques em qualquer navegador atual.
Rode de novo sempre que alterar index.html, css/ ou js/:

    python empacotar.py
"""
import io
import os
import urllib.parse

RAIZ = os.path.dirname(os.path.abspath(__file__))


def ler(caminho):
    with io.open(os.path.join(RAIZ, caminho), encoding="utf-8") as f:
        return f.read()


def trocar(texto, antigo, novo):
    assert texto.count(antigo) == 1, "trecho esperado não encontrado: " + antigo
    return texto.replace(antigo, novo)


def script(caminho):
    codigo = ler(caminho)
    assert "</script" not in codigo.lower(), caminho + " contém </script"
    return "<script>\n" + codigo + "</script>"


html = ler("index.html")
icone = "data:image/svg+xml," + urllib.parse.quote(ler("logo.svg").strip())

html = trocar(html, '<link rel="icon" type="image/svg+xml" href="logo.svg">',
              '<link rel="icon" type="image/svg+xml" href="' + icone + '">')
html = trocar(html, '<link rel="stylesheet" href="css/estilo.css">',
              "<style>\n" + ler("css/estilo.css") + "</style>")
html = trocar(html, '<script src="js/integracao-demo.js"></script>', script("js/integracao-demo.js"))
# No arquivo único, a área de Configurações já vai embutida (não há de onde baixá-la depois).
html = trocar(html, '<script src="js/app.js"></script>', script("js/app.js") + "\n" + script("js/configuracoes.js"))

assert 'src="' not in html and 'rel="stylesheet"' not in html, "sobrou referência a arquivo externo"

destino = os.path.join(RAIZ, "portatil", "AegisWall.html")
os.makedirs(os.path.dirname(destino), exist_ok=True)
with io.open(destino, "w", encoding="utf-8", newline="\n") as f:
    f.write(html)
print("Gerado:", destino, "-", round(os.path.getsize(destino) / 1024), "KB")
