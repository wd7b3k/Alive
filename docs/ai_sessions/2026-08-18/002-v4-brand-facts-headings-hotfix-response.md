# Response

Branch: `agent/v4.0.0-alpha.1-hotfix.1`

Base: `agent/v4.0.0-alpha.1`

Implemented:

- restored owner-approved `brand-logo-full.png` and removed generated SVG replacement;
- restored `/facts` with Facts/Myths tabs over R1 Evidence Registry;
- restored header, Today and Profile entries;
- removed periods from static user headings;
- added executable contract tests and permanent development rules.

Validation:

- logo hash and dimensions: PASS;
- typecheck: PASS;
- tests: PASS, 14/14;
- build: PASS;
- local public-shell browser smoke: PASS;
- Cloudflare branch preview: PASS, `https://agent-v4-0-0-alpha-1-hotfix.alive-aw2.pages.dev/`;
- public `/facts?tab=myths` deep-link: PASS;
- GitHub Actions: PASS, run `32161206081`;
- authenticated `/facts` desktop/mobile: pending owner preview test.

GitHub: draft PR `#11`, code commit `8738c3d8f5df3e197e3db6faaa71e81bd348d10f`.

No schema, RLS, product strategy or user-data changes.
