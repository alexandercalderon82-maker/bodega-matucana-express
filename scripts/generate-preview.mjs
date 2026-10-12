import { build } from 'esbuild';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const target = resolve(process.argv[2] || '/workspace/matumarket-prueba.html');
const react = resolve(root, 'node_modules/react');
const result = await build({
  stdin: { contents: "import React from 'react'; import {createRoot} from 'react-dom/client'; import Home from './app/page.js'; createRoot(document.getElementById('root')).render(<Home/>);", resolveDir: root, loader: 'jsx' },
  bundle: true, minify: true, write: false, jsx: 'automatic', loader: { '.js': 'jsx' },
  alias: { '@': root, react, 'react-dom': resolve(root, 'node_modules/react-dom') },
  define: { 'process.env.NODE_ENV': '"production"', 'process.env.NEXT_PUBLIC_SUPABASE_URL': '""', 'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': '""', 'process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY': '""' },
  plugins: [{ name: 'portable-links', setup(builder) {
    builder.onResolve({ filter: /^next\/link$/ }, () => ({ path: 'link', namespace: 'preview' }));
    builder.onLoad({ filter: /.*/, namespace: 'preview' }, () => ({ contents: `import React from ${JSON.stringify(resolve(react, 'index.js'))}; export default function Link({children,...props}) { return React.createElement('a',props,children); }`, resolveDir: root }));
  } }],
});
const assets = {};
for (const directory of ['products', 'brand']) {
  for (const file of await readdir(resolve(root, 'public', directory))) {
    if (!file.endsWith('.svg') && !file.endsWith('.png')) continue;
    if (file === 'logo.svg') continue;
    const type = file.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
    assets[`/${directory}/${file}`] = `data:${type};base64,${(await readFile(resolve(root,'public',directory,file))).toString('base64')}`;
  }
}
const css = await readFile(resolve(root, 'app/globals.css'), 'utf8');
const js = result.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
await writeFile(target, `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MatuMarket · Versión de prueba</title><style>${css}</style></head><body><div id="root"></div><script>window.__MATUMARKET_PREVIEW__=true;window.__MATUMARKET_ASSETS__=${JSON.stringify(assets)};</script><script>${js}</script></body></html>`);
console.log(`Prueba independiente generada: ${target}`);
