"""
Local test server that behaves like GitHub Pages serving the /docs folder.

    python3 serve.py

1. Rebuilds the site (src/ -> docs/) every time you start it
2. Serves ONLY the docs/ folder, so  /faq -> docs/faq.html,  /static/... -> docs/static/...
3. Shows docs/404.html (status 404) for unknown pages, like GitHub Pages
"""

import http.server
import os
import socket
from pathlib import Path

import build  # build.py in the same folder

PORT = 5500
ROOT = Path(__file__).parent.resolve()
DOCS = ROOT / "docs"


def get_local_ip():
    """Finds the local network IP assigned by your mobile hotspot/Wi-Fi."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
    except Exception:
        ip = "127.0.0.1"
    finally:
        s.close()
    return ip


class CleanURLHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        path, _, query = self.path.partition("?")
        query = f"?{query}" if query else ""
        clean_path = path.rstrip("/")

        # /faq -> /faq.html  (only when the URL has no extension)
        if clean_path and not os.path.splitext(clean_path)[1]:
            if (DOCS / (clean_path.lstrip("/") + ".html")).is_file():
                self.path = clean_path + ".html" + query

        # unknown page -> docs/404.html with a 404 status (like GitHub Pages)
        target = Path(self.translate_path(self.path.partition("?")[0]))
        not_found = not target.exists()
        if not_found and (DOCS / "404.html").is_file():
            body = (DOCS / "404.html").read_bytes()
            self.send_response(404)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return

        return super().do_GET()


if __name__ == "__main__":
    build.main()  # rebuild docs/ from src/
    os.chdir(DOCS)  # serve the docs folder as the site root

    httpd = http.server.HTTPServer(("0.0.0.0", PORT), CleanURLHandler)
    local_ip = get_local_ip()

    print("=" * 55)
    print(" 🚀 Python Clean-URL Server is Running!")
    print("=" * 55)
    print(f" 💻 On this computer:        http://localhost:{PORT}")
    print(f" 📱 Mobile Hotspot / Phone:   http://{local_ip}:{PORT}")
    print("=" * 55)
    print(" Press Ctrl + C to stop the server.\n")

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped.")
