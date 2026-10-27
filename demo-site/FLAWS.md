# The flawed shop: 15 flaws, and the fix each one expects

`demo-site/` is a fictional online shop (Maison Verde) built with the flaws that scanners find on most e-commerce
sites. It runs locally only (`node demo-site/server.js`, http://127.0.0.1:8098). It is the target of the repair
mode: a scanner reports the flaws, Mission Zero proposes each fix with a primary-source citation, a human applies it.

| # | Flaw | Where | Expected fix (what a green proof must support) |
|---|------|-------|-----------------------------------------------|
| 1 | No security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS) | every page | add the headers; OWASP Secure Headers / MDN define each |
| 2 | Server and X-Powered-By reveal old versions (Apache 2.4.29, PHP 7.2, WooCommerce 3.5.1) | every page | remove the headers, update the stack; PHP 7.2 is end-of-life |
| 3 | Reflected XSS: search query, contact echo, 404 path | `/search?q=`, `/checkout`, 404 | escape output; OWASP XSS Prevention Cheat Sheet |
| 4 | Price trusted from the client | `POST /cart` (`price` field) | price looked up server-side by product id; OWASP business logic |
| 5 | Card form served and posted over plain HTTP, card number handled by the shop | `/checkout` | HTTPS everywhere, card data to a PCI-compliant provider; PCI DSS v4.0 req. 4 and 3 |
| 6 | IDOR: any order readable by its number | `/order?id=1001` | authorization check tied to the session; OWASP Top 10 A01:2021 |
| 7 | Hard-coded admin password, no rate limit, error reveals valid usernames | `POST /login` | hashed passwords, generic error, rate limiting; NIST SP 800-63B |
| 8 | Session cookie without HttpOnly, Secure, SameSite | `Set-Cookie` after login | set the three attributes; MDN Set-Cookie |
| 9 | Admin trusts a guessable cookie value | `/admin` | random session ids, server-side session store; OWASP Session Management |
| 10 | robots.txt lists the sensitive paths | `/robots.txt` | never list protected paths; protect them with auth instead |
| 11 | `.env` served with database, SMTP and payment secrets | `/.env` | deny dotfiles at the web server, rotate every secret |
| 12 | Directory listing with configuration backups | `/backup/` | disable listing, remove backups from the web root |
| 13 | Customer export without authentication (personal data) | `/export/customers.csv` | authentication + authorization; GDPR art. 32, breach notification art. 33 |
| 14 | jQuery 1.8.3 with known CVEs | `/js/jquery-1.8.3.min.js` | update to a supported release; CVE-2020-11022, CVE-2020-11023 |
| 15 | No privacy policy, no cookie information, data collected without notice | `/mentions-legales`, forms | privacy policy; GDPR art. 13 |

The scanner's report is expected in the generic findings format (`findings.example.json`): one entry per flaw with
`id`, `severity`, `type`, `url`, `evidence`, `description`. Any scanner can produce it.
