// BKR Matriz — recebimento pelo menu Compartilhar do Android.
const APP = 'bkr-app-v3';
const RECEBIDOS = 'bkr-recebidos';
const ARQUIVOS_APP = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './logo.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(APP).then((c) => c.addAll(ARQUIVOS_APP)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Recebe o que foi compartilhado (ex.: WhatsApp > Exportar conversa > BKR Matriz).
  if (e.request.method === 'POST' && url.pathname.endsWith('/receber')) {
    e.respondWith((async () => {
      const dados = await e.request.formData();
      const arquivos = dados.getAll('arquivos').filter((f) => f && typeof f !== 'string');
      const cache = await caches.open(RECEBIDOS);
      for (const k of await cache.keys()) await cache.delete(k);   // guarda só o último envio

      const lista = [];
      for (let i = 0; i < arquivos.length; i++) {
        const f = arquivos[i];
        const chave = './recebido/' + i;
        await cache.put(chave, new Response(f, { headers: { 'Content-Type': f.type || 'application/octet-stream' } }));
        lista.push({ chave, nome: f.name || ('arquivo-' + (i + 1)), tamanho: f.size, tipo: f.type || '?' });
      }
      const info = {
        quando: new Date().toISOString(),
        titulo: dados.get('title') || '',
        texto: dados.get('text') || '',
        arquivos: lista
      };
      await cache.put('./recebido/info', new Response(JSON.stringify(info), { headers: { 'Content-Type': 'application/json' } }));
      return Response.redirect('./?recebido=1', 303);
    })());
    return;
  }

  if (e.request.method !== 'GET') return;
  e.respondWith((async () => {
    const r = await caches.match(e.request, { ignoreSearch: true });
    if (r) return r;
    try { return await fetch(e.request); }
    catch (_) { return caches.match('./'); }
  })());
});
