import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
const src=resolve('node_modules/sql.js/dist/sql-wasm.wasm');
const dest=resolve('public/sql-wasm.wasm');
await mkdir(dirname(dest),{recursive:true});
await copyFile(src,dest);
