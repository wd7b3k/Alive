# Validation

| Gate | Статус | Факт |
|---|---|---|
| Approved logo hash | PASS | SHA-256 `6b58071efb328d970d921ea6e03d30e15a148d8c36a92f6e9ec05455a830d832`, 486931 bytes |
| Logo natural dimensions | PASS | Browser: 2048×682; rendered asset generated from approved PNG |
| Static heading punctuation contract | PASS | Contract scan: no static `h1`–`h6` ending with `.` |
| Facts/Myths route contract | PASS | `/facts`, two tabs and three entry surfaces present |
| `npm run typecheck` | PASS | Exit 0 |
| `npm test` | PASS | 14/14 tests |
| `npm run build` | PASS | Vite production build; known chunk-size warning remains |
| Local browser public shell | PASS | Logo and heading rendered correctly |
| Authenticated `/facts` desktop/mobile | НЕ ПРОВЕРЕНО | Требуется deployed preview и authenticated session |
| GitHub Actions | НЕ ПРОВЕРЕНО | До публикации branch |
| Cloudflare preview | НЕ ПРОВЕРЕНО | До публикации branch |

Новых DB migrations нет; database CI не является изменённым gate этого hotfix.
