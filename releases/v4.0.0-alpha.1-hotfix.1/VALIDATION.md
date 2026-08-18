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
| Remote public shell desktop/mobile | PASS | Desktop and 390×844 mobile; approved 2048×682 asset, no horizontal overflow |
| Public `/facts?tab=myths` deep-link | PASS | Branch preview отвечает приложением без 404 и сохраняет route/query |
| Authenticated `/facts` desktop/mobile | НЕ ПРОВЕРЕНО | Требуется owner authenticated session на preview |
| GitHub Actions | PASS | `ALIVE frontend CI`, run `32161206081`, success за 19 секунд |
| Cloudflare preview | PASS | Branch preview deploy successful: `https://agent-v4-0-0-alpha-1-hotfix.alive-aw2.pages.dev/` |

PR: `#11`, base `agent/v4.0.0-alpha.1`, code commit `8738c3d8f5df3e197e3db6faaa71e81bd348d10f`.

Новых DB migrations нет; database CI не является изменённым gate этого hotfix.
