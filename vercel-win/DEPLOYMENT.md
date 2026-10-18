# WIN Vercel deployment

Production URL: https://2027course.win-lin.com
Previous Vercel alias remains available: https://win-lecturer-20261018.vercel.app
Project: interstellas-projects/win-lecturer-20261018
GitHub production branch: win-sites-2026-10-18
Root directory: vercel-win

The existing winwinwin Vercel project and main/v11 branches remain unchanged. Page components, CSS and Hero bytes match Sites v23.

Architecture: Vercel serves Next.js pages and a fixed allowlist of uncached API proxy routes. The existing Sites Cloudflare backend retains D1 orders, PAYUNi credentials and Resend credentials. This is a frontend hosting migration with the existing payment backend retained, not a database or secret export. Do not delete the Sites project or its runtime variables.

New Vercel orders store the allowlisted Vercel origin. Their encrypted PAYUNi ReturnURL/NotifyURL/BackURL point to Vercel; callbacks preserve raw signed form fields and forward to the existing verifying backend. Old orders keep the original origin. The browser return never marks an order paid. Only a verified provider notification does.

Backend changes relative to sites-win-2026-10-18 are in backend-vercel-bridge.patch. Runtime deployment v24 backend SHA: 09ff801e7a381c7227a793ef68e73153c41d43f7. The patch additionally includes a mocked migration regression check.

Validation: Next production build, npm audit 0 findings, 17 mocked backend payment checks, proxy regression checks; live homepage 200; live create fixes amount at NT$399; signed gateway form generated; forged callback 400 INVALID; previous real NT$1 order readable as paid/emailSent via Vercel. Resend dashboard previously confirmed Delivered. No new NT$399 charge was performed during migration.

Commands: npm ci; npm run build; node checks/proxy.test.cjs.
