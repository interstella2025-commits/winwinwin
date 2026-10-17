# WIN Sites source snapshot — 2026-10-18

Production: https://signature-speaker.elsaliao.chatgpt.site
Sites saved version: 23
Source commit: f7bc19fdcd52841978a179a13fe3d7a8cfbe2519

This folder contains the complete tracked source of the published Sites app, including images, PAYUNi checkout, Resend email integration, session registration and D1 schema migrations.

The existing repository files and branches are preserved. This is a separate source snapshot, not a replacement of the older static website.

Production secrets, API credentials, .git history, dependencies, local runtime files and live application/payment records are not included. Configure the secret variable names documented in PAYMENT_HANDOFF.md on the deployment platform; the example values in checks/ are mocks only.

The live service remains hosted on the original ChatGPT Sites project. Pushing this folder to GitHub does not migrate hosting or its D1 database. See README.md and PAYMENT_HANDOFF.md for build and integration details.
