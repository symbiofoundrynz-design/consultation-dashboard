"""Local-only static preview; does not run the database server."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os

ROOT = Path(__file__).resolve().parent
os.chdir(ROOT)

class DemoHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

if __name__ == "__main__":
    print("Open http://127.0.0.1:8765/")
    ThreadingHTTPServer(("127.0.0.1", 8765), DemoHandler).serve_forever()
