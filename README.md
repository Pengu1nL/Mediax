<div align="center">
<img width="1200" height="475" alt="Mediax Banner" src="./public/mediax-banner.svg" />
</div>

# Mediax

Mediax is a Vite + React content operations workspace prototype for a single brand team.  
This version turns the original static UI into a local-first app with:

- route-based navigation
- server-backed login guard
- persistent brand profile data through the local API server
- plan -> task -> draft workflow
- draft editing and local storage persistence
- local asset folder management for images, PDFs, videos, and common documents

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS 4
- React Router
- Vitest + Testing Library

## Local Development

**Prerequisites:** Node.js 20+ recommended

1. Install dependencies

```bash
npm install
```

2. Copy the example env file if needed

```bash
cp .env.example .env
```

`npm run dev` provides local fallback credentials when `.env` is absent. For production, set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and a strong `JWT_SECRET`.

3. Start the API server and Vite client

```bash
npm run dev
```

This starts the API server on `http://localhost:3001` and the Vite client on `http://localhost:3000`.

4. Open the app

```text
http://localhost:3000
```

## Demo Login

Use these local development credentials when `.env` is not overriding them:

```text
Email: admin@mediax.local
Password: mediax2026
```

## Available Scripts

```bash
npm run dev
npm run server
npm run dev:client
npm test
npm run lint
npm run build
```

## Project Notes

- App data is stored by the local API server in `data.json`, which is ignored by Git.
- This repository currently targets a single-brand, single-admin workflow.
- `Library` binds to a local asset folder through the File System Access API. Use Chrome or Edge for folder selection, recursive scanning, current-directory folder/file browsing, upload-to-folder, folder upload with nested paths preserved, rename, download, and delete operations.
- Local asset management supports images, PDFs, videos, and common documents (`.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`, `.txt`, `.md`, `.csv`, `.rtf`) up to 50MB per file.
- External publishing integrations and AI features are not part of the current release.

## Origin

This project started from an AI Studio-exported front-end prototype and was then adapted into a more usable local-first workflow app.
