import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import { log } from 'node:console';

// Serve only the owned fixture, bound to loopback; never expose workspace files.
const page = await readFile(new URL('../tests/fixtures/ocr.html', import.meta.url));
const server = createServer((_request, response) => {
  response.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  response.end(page);
});
server.listen(4174, '127.0.0.1', () => {
  log('Croppa OCR fixtures: http://127.0.0.1:4174 — press Ctrl+C to stop.');
});
