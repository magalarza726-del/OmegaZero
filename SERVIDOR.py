#!/usr/bin/env python3
from __future__ import annotations

import argparse
import http.server
import json
import os
import socket
import socketserver
import threading
import webbrowser
from functools import partial
from pathlib import Path


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


def port_is_free(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as probe:
        probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            probe.bind((host, port))
        except OSError:
            return False
        return True


def choose_port(host: str, preferred: int, maximum: int, strict: bool) -> int:
    if strict:
        return preferred
    for port in range(preferred, maximum + 1):
        if port_is_free(host, port):
            return port
    raise OSError(
        f"No se encontró un puerto libre entre {preferred} y {maximum}. "
        "Cierra algún servidor anterior o usa --port con otro valor."
    )


def read_build_id(root: Path) -> str:
    try:
        data = json.loads((root / "version.json").read_text(encoding="utf-8"))
        return str(data.get("buildId") or data.get("version") or "current")
    except (OSError, ValueError, TypeError):
        return "current"


def main() -> None:
    parser = argparse.ArgumentParser(description="Servidor local de OmegaZero sin caché persistente")
    parser.add_argument("--port", type=int, default=8080, help="Primer puerto que se intentará usar")
    parser.add_argument("--max-port", type=int, default=8099, help="Último puerto permitido para búsqueda automática")
    parser.add_argument("--strict-port", action="store_true", help="Fallar en lugar de buscar otro puerto")
    parser.add_argument("--directory", default="dist")
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()

    host = "127.0.0.1"
    root = Path(args.directory).resolve()
    port = choose_port(host, args.port, max(args.port, args.max_port), args.strict_port)
    build_id = read_build_id(root)
    base_url = f"http://{host}:{port}"
    url = f"{base_url}/?build={build_id}"
    handler = partial(NoCacheHandler, directory=str(root))

    if port != args.port:
        print(f"El puerto {args.port} está ocupado por otra aplicación o versión.")
        print(f"OmegaZero usará automáticamente el puerto {port}.")

    try:
        with ReusableTCPServer((host, port), handler) as server:
            Path("ULTIMA_DIRECCION.txt").write_text(url + "\n", encoding="utf-8")
            print(f"OmegaZero: {url}")
            print(f"Sirviendo: {root}")
            print("Caché HTTP desactivada. Presiona Ctrl+C para cerrar.")
            if not args.no_browser:
                threading.Timer(0.5, lambda: webbrowser.open_new_tab(url)).start()
            server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor OmegaZero cerrado.")


if __name__ == "__main__":
    main()
