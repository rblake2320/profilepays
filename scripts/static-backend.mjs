// Restart only the owned local backend after a rebuild. Keep its durable database and connector.
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
Object.assign(
  process.env,
  JSON.parse(readFileSync(resolve(root, '.local/static-pilot/backend-env.json')))
);
await import(pathToFileURL(resolve(root, 'backend/dist/src/main.js')).href);
