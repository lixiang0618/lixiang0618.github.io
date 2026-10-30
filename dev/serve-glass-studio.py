#!/usr/bin/env python3
"""Explicit local-only Studio entrypoint. Normal HTML and deployments stay untouched."""
import argparse
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]

class StudioHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        path = urlsplit(self.path).path
        if path in ('/moments.html', '/zh/moments.html'):
            text = (ROOT / path.lstrip('/')).read_text(encoding='utf-8')
            assets = ('<link rel="stylesheet" href="/dev/glass-studio.css">'
                      '<script src="/dev/glass-model.js"></script>'
                      '<script src="/dev/glass-studio.js" data-glass-studio="local"></script>')
            review = ROOT / 'dev/glass-review.json'
            if review.exists():
                config = json.dumps(json.loads(review.read_text(encoding='utf-8')), ensure_ascii=True).replace('<', '\\u003c')
                assets = assets.replace('<script src="/dev/glass-studio.js"', '<script>window.GlassStudioReview=' + config + ';</script><script src="/dev/glass-studio.js"')
            data = text.replace('</body>', assets + '\n</body>').encode('utf-8')
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
        super().do_GET()

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8092)
    args = parser.parse_args()
    print(f'Local Glass Studio: http://127.0.0.1:{args.port}/moments.html', flush=True)
    ThreadingHTTPServer(('127.0.0.1', args.port), StudioHandler).serve_forever()
