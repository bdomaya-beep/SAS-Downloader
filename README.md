# Mediafire-style Uploader

Simple Express + Multer file uploader with local storage (uploads/ and data/files.json).

Quick notes about hosting and uploads

- This project stores files on the server's local filesystem. That works locally and on full Node hosts (Render, Railway, Heroku, VPS), but it will not persist on serverless platforms (Vercel, Netlify Functions) because their filesystem is ephemeral.
- If you need persistent storage on serverless platforms, you must use external object storage (S3, DigitalOcean Spaces, Cloudinary, or Netlify Blobs) and update the upload handlers to stream files to that storage.

Recommended deployment (easy, minimal changes)

1. Deploy to Render (recommended) or Railway:

   - Connect the repository to Render (https://render.com) or Railway (https://railway.app).
   - Render: Create a new Web Service, choose Node, set the build and start commands to `npm install` and `npm start` (Render detects `Procfile`/`package.json`).
   - Ensure the `uploads/.gitkeep` file is present so the directory exists. The `.gitignore` ignores uploads contents which is fine.

2. Environment variables:

   - `PORT` — automatically set by the host.
   - Optional overrides: `UPLOAD_DIR`, `DATA_DIR`, and `DB_FILE` if you want to customize storage paths (useful for /tmp on some hosts).

Deploying to Vercel/Netlify (NOT recommended without changes)

- Vercel and Netlify Functions are serverless and have ephemeral filesystems. Uploads written to disk will not persist between function invocations.
- To make uploads work on Vercel/Netlify you must:
  1. Move APIs into serverless functions.
  2. Use external persistent storage (S3, Spaces, or Netlify Blobs).
  3. Update the frontend to call the serverless endpoints.

If you want, I can:

- Prepare this repo for Render deployment (one-click ready) — I can finish that now.
- Or convert the upload backend to use S3 (or another storage) and make it deployable to Vercel/Netlify — this requires AWS credentials or storage config.

Vercel + S3 configuration (what to set)

- `AWS_ACCESS_KEY_ID` — Your AWS access key ID (set in Vercel Environment Variables).
- `AWS_SECRET_ACCESS_KEY` — Your AWS secret access key.
- `AWS_REGION` — The region of the S3 bucket (e.g. `us-east-1`).
- `S3_BUCKET` — The name of your S3 bucket.
- Optional: `S3_PREFIX` — prefix/folder inside the bucket (defaults to `uploads/`).
- Optional: `METADATA_KEY` — object key for file index (defaults to `files.json`).

Admin configuration (secure)

- `ADMIN_PASSWORD` — initial admin password used to obtain a short-lived management token (do not expose).
- `ADMIN_JWT_SECRET` — secret used to sign admin JWTs (set this to a long random value).

APIs added for management:
- `POST /api/admin-login` — supply JSON `{ "password": "..." }` to receive a JWT token.
- `POST /api/admin` — management actions (edit/markLatest/delete). Send `Authorization: Bearer <token>` header.
- `GET /api/files` and `POST /api/record` remain as before.

After setting these, Vercel functions in `api/` will provide:
- `POST /api/presign` — returns `uploadUrl`, `key`, `publicUrl` for direct S3 PUT.
- `POST /api/record` — record uploaded file metadata (writes/updates `files.json` in S3).
- `GET /api/files` — list uploaded files from `files.json`.
- `DELETE /api/delete/:id` — delete file and remove metadata entry.

Local usage

1. Install deps:

```
npm install
```

2. Run locally:

```
npm run dev
```

Feedback

Tell me which path you want: `Render` (quick fix) or `Vercel/Netlify with S3` (I will add S3 upload support and serverless functions). I'll implement the chosen option.
