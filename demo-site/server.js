// A deliberately flawed online shop: the flaws found on most e-commerce sites, in one place, so that a scanner can find
// them and Mission Zero can fix them with proof, in front of everyone. Fictional brand, fictional data.
// NEVER expose this on a real domain. Local only:  node demo-site/server.js  →  http://127.0.0.1:8098
import http from 'node:http';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const page = (name) => readFileSync(join(here, 'pages', name), 'utf8');

export const PRODUCTS = [
  { id: 1, name: 'Lampe Osier', price: 89 }, { id: 2, name: 'Vase Terracotta', price: 45 }, { id: 3, name: 'Plaid Lin', price: 120 },
];
// Fictional orders: enumerable by number (FLAW: IDOR).
export const ORDERS = {
  1001: { customer: 'Marie Dupont', email: 'marie.dupont@example.org', address: '12 rue des Lilas, 79000 Niort', total: 134, card: '**** **** **** 4242' },
  1002: { customer: 'Karim Benali', email: 'k.benali@example.org', address: '3 allée du Port, 44000 Nantes', total: 89, card: '**** **** **** 1881' },
  1003: { customer: 'Sophie Marchand', email: 'sophie.m@example.org', address: '8 place Royale, 33000 Bordeaux', total: 210, card: '**** **** **** 0005' },
};
const cart = []; // one shared cart, in memory

export function handle(method, url, body = '', headers = {}) {
  const [path, qs = ''] = url.split('?');
  const q = Object.fromEntries(new URLSearchParams(qs));
  // FLAW 1 (headers): no Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Referrer-Policy or HSTS.
  // FLAW 2 (information disclosure): Server and X-Powered-By reveal an old stack.
  const html = (b, extra = {}) => [200, { 'content-type': 'text/html; charset=utf-8', server: 'Apache/2.4.29 (Ubuntu) PHP/7.2.24', 'x-powered-by': 'PHP/7.2.24 WooCommerce/3.5.1', ...extra }, b];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  if (path === '/') return html(page('index.html').replace('<!--PRODUCTS-->', PRODUCTS.map((p) => `<div class="card"><h3>${p.name}</h3><p class="price">${p.price} €</p><form method="post" action="/cart"><input type="hidden" name="id" value="${p.id}"><input type="hidden" name="price" value="${p.price}"><button>Ajouter au panier</button></form></div>`).join('')));
  if (path === '/search') return html(page('search.html').replace('<!--Q-->', q.q || '')); // FLAW 3 (reflected XSS): the query is echoed raw
  if (path === '/cart') {
    if (method === 'POST') {
      const p = Object.fromEntries(new URLSearchParams(body));
      // FLAW 4 (business logic): the price comes from the client and is trusted.
      cart.push({ id: Number(p.id), price: Number(p.price) });
    }
    const total = cart.reduce((a, c) => a + c.price, 0);
    return html(page('cart.html').replace('<!--LINES-->', cart.map((c) => `<li>${esc((PRODUCTS.find((x) => x.id === c.id) || {}).name || 'article')} · ${c.price} €</li>`).join('')).replace('<!--TOTAL-->', String(total)));
  }
  if (path === '/checkout') {
    // FLAW 5 (payment): the card form is served and posted over plain HTTP, no CSRF token, card number handled by the shop itself.
    if (method === 'POST') {
      const p = Object.fromEntries(new URLSearchParams(body));
      // The order is registered to the customer, who gets a cookie and a link to follow it. The cookie is not checked by /order (FLAW 6).
      const id = 1004; ORDERS[id] = { customer: p.name || '', email: p.email || '', address: p.address || '', total: cart.reduce((a, c) => a + c.price, 0), card: '**** **** **** ' + String(p.card || '').slice(-4) };
      return html(page('checkout.html').replace('<!--DONE-->', `<p class="ok">Commande n° ${id} enregistrée pour ${p.name || ''}. Carte ${p.card || ''}. <a href="/order?id=${id}">Suivre ma commande</a></p>`), { 'set-cookie': `customer=${encodeURIComponent(p.email || '')}; Path=/` }); // FLAW 3 again, and the card number echoed
    }
    return html(page('checkout.html'));
  }
  if (path === '/order') {
    // FLAW 6 (IDOR): any order is readable by changing its number, no login needed.
    const o = ORDERS[q.id];
    return o ? html(page('order.html').replace('<!--ORDER-->', `<p><b>Commande ${esc(q.id)}</b></p><p>${esc(o.customer)} · ${esc(o.email)}<br>${esc(o.address)}<br>Total ${o.total} € · carte ${o.card}</p>`)) : html('<h1>Commande introuvable</h1>');
  }
  if (path === '/login') {
    if (method === 'POST') {
      const p = Object.fromEntries(new URLSearchParams(body));
      // FLAW 7 (authentication): hard-coded password, no rate limit, verbose error that confirms the username.
      if (p.user === 'admin' && p.password === 'maisonverde2019') return [302, { location: '/admin', 'set-cookie': 'session=admin-7c9e; Path=/' }, '']; // FLAW 8 (cookie): no HttpOnly, Secure or SameSite
      return html(page('login.html').replace('<!--ERR-->', p.user === 'admin' ? '<p class="err">Mot de passe incorrect pour admin.</p>' : '<p class="err">Utilisateur inconnu.</p>'));
    }
    return html(page('login.html'));
  }
  if (path === '/admin') {
    // FLAW 9 (access control): the cookie value is trusted as is; whoever sets session=admin-7c9e is admin.
    if (/session=admin-7c9e/.test(headers.cookie || '')) return html(page('admin.html'));
    return [302, { location: '/login' }, ''];
  }
  if (path === '/robots.txt') return [200, { 'content-type': 'text/plain' }, 'User-agent: *\nDisallow: /admin\nDisallow: /backup/\nDisallow: /.env\nDisallow: /export/\n']; // FLAW 10: robots.txt advertises the sensitive paths
  if (path === '/.env') return [200, { 'content-type': 'text/plain' }, 'DB_HOST=localhost\nDB_USER=shop\nDB_PASSWORD=Verde2019!\nSMTP_PASSWORD=jardin\nSTRIPE_SECRET=sk_live_EXAMPLE_NOT_REAL\n']; // FLAW 11: secrets served to anyone
  if (path === '/backup/') return html('<h1>Index of /backup/</h1><ul><li><a href="/backup/wp-config.php.bak">wp-config.php.bak</a></li><li><a href="/backup/shop-2024-03-01.sql">shop-2024-03-01.sql</a></li></ul>'); // FLAW 12: directory listing with backups
  if (path === '/backup/wp-config.php.bak') return [200, { 'content-type': 'text/plain' }, "<?php\ndefine('DB_PASSWORD', 'Verde2019!');\ndefine('AUTH_KEY', 'example-not-real');\n"];
  if (path === '/export/customers.csv') return [200, { 'content-type': 'text/csv' }, 'name,email,phone\nMarie Dupont,marie.dupont@example.org,0600000000\nKarim Benali,k.benali@example.org,0611111111\n']; // FLAW 13: customer export without authentication (GDPR)
  if (path === '/js/jquery-1.8.3.min.js') return [200, { 'content-type': 'application/javascript' }, '/*! jQuery v1.8.3 jquery.com | jquery.org/license */ window.jQuery=window.$=function(){};']; // FLAW 14: outdated library (CVE-2020-11022, CVE-2020-11023)
  if (path === '/mentions-legales') return html(page('mentions.html')); // FLAW 15 (compliance): no privacy policy, no cookie notice, personal data collected without information
  if (path === '/style.css') return [200, { 'content-type': 'text/css' }, page('style.css')];
  return [404, { 'content-type': 'text/html; charset=utf-8' }, '<h1>404</h1><p>Page introuvable : ' + path + '</p>']; // FLAW 3 again: the path is reflected
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 8098;
  http.createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 100000) req.destroy(); });
    req.on('end', () => { const [code, headers, out] = handle(req.method, req.url || '/', raw, req.headers); res.writeHead(code, headers); res.end(out); });
  }).listen(port, '127.0.0.1', () => console.log('Flawed demo shop (LOCAL ONLY) on http://127.0.0.1:' + port));
}
