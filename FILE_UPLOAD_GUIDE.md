# 📁 File Upload Guide - Using /downloads Folder

Your Vitech SAS Downloader now supports uploading .exe, .apk, .msi, and other files directly to a `/downloads` folder on your server. This works like MediaFire!

---

## Overview

1. **Upload files** to `/downloads` folder via FTP/SFTP
2. **Register apps** in admin panel with the filename
3. **Download URL is automatic**: `/downloads/yourfile.exe`
4. **Users download** by clicking the Download button

---

## Step 1: Get FTP/SFTP Access

### If hosting on Netlify:
1. Login to Netlify dashboard
2. Go to your site → Site settings → Danger zone
3. Scroll to "Build & Deploy" → look for FTP/SFTP details
4. Use **FileSilla** or **WinSCP** to connect

### If hosting on Vercel:
1. Vercel uses **Git-based** deployment
2. Instead, create a `/public/downloads` folder in your project
3. Add files there and push to GitHub

### If hosting on GitHub Pages:
1. Add `/downloads` folder to your repository
2. Add files to that folder
3. Commit and push to GitHub
4. Files will be at: `https://yourusername.github.io/repo/downloads/filename`

### If self-hosted server:
1. Ask your host for FTP/SFTP credentials
2. Usually in hosting control panel (cPanel, Plesk, etc.)

---

## Step 2: Connect via FTP/SFTP

### Using FileZilla (Windows/Mac/Linux) - FREE

**Download:** https://filezilla-project.org/

**Steps:**
1. Open FileZilla
2. Go to File → Site Manager
3. Click "New Site"
4. Enter:
   - Host: `your-domain.com` or FTP host from provider
   - Username: Your FTP username
   - Password: Your FTP password
   - Port: 21 (FTP) or 22 (SFTP)
   - Protocol: FTP or SFTP
5. Click "Connect"
6. Navigate to public folder (usually `public_html` or `www`)
7. Create new folder: `/downloads`
8. **Done!** Now you can drag & drop files

### Using WinSCP (Windows) - FREE

**Download:** https://winscp.net/

**Steps:**
1. Open WinSCP
2. Enter:
   - Host: Your FTP host
   - Username: Your FTP username
   - Password: Your FTP password
   - Port: 22 (SFTP recommended)
3. Click "Login"
4. Right-click → "Create Folder" → name it "downloads"
5. Drag & drop your files into it

### Using Command Line (Linux/Mac)

```bash
# Via SFTP
sftp username@your-domain.com

# Once connected:
mkdir downloads
cd downloads
put /path/to/your/file.exe
put /path/to/your/app.apk
ls  # verify files uploaded
quit
```

---

## Step 3: Upload Your Files

1. Connect via FTP/SFTP (see above)
2. Navigate to `/downloads` folder in the `/public_html` or `/www` directory
3. Upload your files:
   - `MyApp-2.5.0.exe`
   - `MyGame-1.0.apk`
   - `Software-setup.msi`
   - etc.

**Make sure file names are:**
- ✅ Exact (with version numbers, extensions)
- ✅ No spaces or special characters (use hyphens instead)
- ✅ All lowercase recommended

---

## Step 4: Register in Admin Panel

1. Open your site → **Admin Panel** link
2. Fill in the form:
   - **App Name**: "My Awesome App"
   - **Icon**: 📱 (any emoji)
   - **Version**: "2.5.0"
   - **Description**: "What it does..."
   - **File Name**: `MyApp-2.5.0.exe` (MUST match what you uploaded)
   - **Changelog**: Version history

3. Click **"Add App"**

That's it! The download URL is automatically set to `/downloads/MyApp-2.5.0.exe`

---

## Verify It Works

1. Go to your homepage (index.html)
2. You should see the new app
3. Click the "Download" button
4. File should download to your computer

If it doesn't work:
- ✅ Check filename matches exactly (case-sensitive on Linux servers)
- ✅ Verify file is actually in `/downloads` folder via FTP
- ✅ Make sure `/downloads` folder exists
- ✅ Clear browser cache (Ctrl+Shift+Delete)

---

## File Size Limits

| Hosting Platform | Max File Size | Notes |
|------------------|---------------|-------|
| **Netlify** | 100GB+ | Free tier generous |
| **Vercel** | 100MB limited | Better for static |
| **GitHub** | 100MB per file | Easy for git-based |
| **Self-hosted** | Depends on hosting | Usually 500MB - unlimited |

For large files (.apk, .exe):
- Use self-hosted VPS ($5-10/month)
- Or compress files with 7-Zip before uploading

---

## Example Workflow

### You have these files to upload:
- `ViTechApp-v1.0.exe` (50MB)
- `ViTechApp-v1.0.apk` (120MB)
- `ViTechApp-v1.0-manual.pdf` (5MB)

### Step 1: Upload via FTP
```
/public_html/downloads/
├── ViTechApp-v1.0.exe
├── ViTechApp-v1.0.apk
└── ViTechApp-v1.0-manual.pdf
```

### Step 2: Register each in Admin Panel

**App 1:**
- Name: ViTech App (Windows)
- File Name: `ViTechApp-v1.0.exe`
- Version: 1.0
- Icon: 💻

**App 2:**
- Name: ViTech App (Android)
- File Name: `ViTechApp-v1.0.apk`
- Version: 1.0
- Icon: 📱

**App 3:**
- Name: ViTech Manual (PDF)
- File Name: `ViTechApp-v1.0-manual.pdf`
- Version: 1.0
- Icon: 📖

### Step 3: Users Download
- They visit your site
- Click "Download" on any app
- File downloads automatically
- Exactly like MediaFire! ✅

---

## Troubleshooting

### "File not found" error when downloading

**Causes:**
- File name doesn't match exactly (case matters!)
- `/downloads` folder doesn't exist
- File not fully uploaded
- Wrong folder uploaded to

**Fix:**
1. Double-check filename in admin panel
2. Verify file exists in `/downloads` folder via FTP
3. Ensure `/downloads` is in public folder, not root
4. Try uploading again

### Can't connect via FTP/SFTP

**Causes:**
- Wrong credentials
- Wrong host address
- Wrong port number
- FTP disabled on account

**Fix:**
1. Verify credentials in hosting control panel
2. Try different port (21 for FTP, 22 for SFTP)
3. Contact hosting support for FTP details
4. Consider enabling SFTP in control panel

### File too large to upload

**Solutions:**
1. Split file into smaller parts (WinRAR, 7-Zip)
2. Compress with zip/7z before uploading
3. Use cloud storage instead (Gdrive, Dropbox)
4. Upgrade to VPS hosting for larger limits

### Files disappear after deployment

**Causes:**
- Netlify/Vercel auto-deletes unknown folders
- Git didn't include `/downloads` folder

**Fix (Netlify):**
1. Add `netlify.toml` file:
```toml
[build]
  command = "mkdir -p public/downloads"
  publish = "public"
```

**Better Solution:**
Use self-hosted server (no deletion issues)

---

## Best Practices

✅ **Do:**
- Use clear, version-numbered filenames: `MyApp-v2.5.0.exe`
- Keep files organized in `/downloads` folder
- Use SFTP instead of FTP (more secure)
- Check file uploads completed before registering
- Use lowercase filenames
- Include version number in filename

❌ **Don't:**
- Use spaces in filenames
- Mix uppercase/lowercase
- Upload to wrong folder
- Delete files without updating admin panel
- Upload without registering in system
- Use very long filenames

---

## Advanced: Using Compression

Large files (.exe, .apk) take time to upload. Compress first:

**Using 7-Zip (Free):**
1. Right-click file → 7-Zip → Add to archive
2. Set compression to "Ultra"
3. Users download .7z file they can extract

**Or split into parts:**
```
MyApp-v2.0.exe.001
MyApp-v2.0.exe.002
MyApp-v2.0.exe.003
```

Then in admin panel, add each part separately with instructions to download all.

---

## Alternative: Cloud Storage Bridge

Don't want to deal with FTP? Use cloud storage URLs instead:

```
Download URL: https://drive.google.com/uc?export=download&id=XXXXX
Download URL: https://dropbox.com/s/xxxxx/app.exe?dl=1
Download URL: https://github.com/yourrepo/releases/download/v2.0/app.exe
```

Then users can download from there. But the `/downloads` folder method is simpler!

---

## Support

**Getting stuck?** Check:
1. Hosting control panel for FTP/SFTP details
2. FileZilla/WinSCP logs for connection errors
3. Verify filenames match exactly (case-sensitive!)
4. Make sure `/downloads` folder exists

Still need help? Your hosting provider's support can help with FTP access!

---

**You're all set!** Your downloader now works exactly like MediaFire. Users can download any files you upload, with beautiful interface and download tracking! 🎉
