# Vitech SAS Downloader - Professional App Download Platform

A modern, professional, and easy-to-use web application for distributing and managing app downloads.

## Features

✅ **Professional UI/UX** - Clean, modern design with gradient backgrounds and smooth animations  
✅ **Download Management** - Add, edit, and delete apps from the admin panel  
✅ **Download Tracking** - Track total downloads per app with real-time statistics  
✅ **Changelog Management** - Display version history and updates for each app  
✅ **Local Data Storage** - Uses browser localStorage (no backend required)  
✅ **Responsive Design** - Works perfectly on desktop, tablet, and mobile  
✅ **Easy Deployment** - Pure HTML/CSS/JavaScript - no dependencies or build process  

---

## Quick Start

### 1. Setup Your Files

The project includes these files:
- `index.html` - Main download page
- `admin.html` - Admin panel for managing apps
- `style.css` - Professional styling
- `script.js` - All functionality (downloads, tracking, etc.)
- `README.md` - This file

### 2. Add Your Apps

**Option A: Via Admin Panel (Easiest)**
1. Open `admin.html` in your browser
2. Fill in the app details:
   - **App Name**: Name of your application
   - **Icon Emoji**: Pick any emoji (📊 📁 💻 🎮 etc.)
   - **Version**: Version number (e.g., 2.5.0)
   - **Description**: What the app does
   - **File Name**: The file name with extension (e.g., MyApp-2.5.0.exe)
   - **Download URL**: Where users download from (see below)
   - **Changelog**: Version history (one per line)
3. Click "Add App" and it's saved automatically!

**Option B: Edit script.js Directly**
Edit the `DEFAULT_APPS` array in `script.js`:
```javascript
const DEFAULT_APPS = [
    {
        id: 1,
        name: 'Your App Name',
        icon: '📊',
        version: '1.0.0',
        description: 'What your app does',
        fileName: 'YourApp-1.0.0.exe',
        downloadUrl: '/downloads/YourApp-1.0.0.exe',
        changelog: [
            'v1.0.0 - Initial release',
            'v0.9.0 - Beta release'
        ],
        downloads: 0
    }
];
```

### 3. Configure Download URLs

The `downloadUrl` field can be:

**Local Files (Same server):**
```javascript
downloadUrl: '/downloads/MyApp.exe'
downloadUrl: '/files/setup.msi'
```

**External Links (Cloud storage, GitHub releases, etc.):**
```javascript
downloadUrl: 'https://github.com/yourrepo/releases/download/v2.5.0/app.exe'
downloadUrl: 'https://dropbox.com/s/xxxxx/MyApp.exe?dl=1'
downloadUrl: 'https://drive.google.com/uc?export=download&id=xxxxx'
```

---

## Deployment

### Option 1: Static Hosting (Recommended - Free)

Choose any of these free platforms:

**Netlify (Easiest)**
1. Drag & drop your folder into https://app.netlify.com/drop
2. Done! Your site is live

**GitHub Pages**
1. Push files to GitHub repository
2. Go to Settings → Pages → Select main branch
3. Site deployed at `https://yourusername.github.io/your-repo`

**Vercel**
1. Sign up at https://vercel.com
2. Connect your GitHub repo or upload files
3. Auto-deployed on every push

**Firebase Hosting**
1. Install Firebase: `npm install -g firebase-tools`
2. `firebase init hosting`
3. `firebase deploy`

### Option 2: Your Own Server

**If you have a web server:**
1. Upload all files to your server's public directory
2. For local file downloads, create a `/downloads` folder and place files there
3. Access at your domain: `https://yourdomain.com`

**Node.js Simple Server (Local Testing)**
```bash
# Install http-server globally
npm install -g http-server

# Run in your project directory
http-server

# Visit http://localhost:8080
```

---

## File Structure

```
SAS Downloader Website/
├── index.html          # Main download page
├── admin.html          # Admin panel
├── style.css           # Styling
├── script.js           # Functionality
├── README.md           # This file
└── downloads/          # (Optional) Place your .exe/.msi files here
    ├── MyApp-1.0.exe
    └── MyApp-2.0.exe
```

---

## Usage Guide

### For Visitors

1. **Homepage**: See all available apps with icons, descriptions, and download counts
2. **Download**: Click "Download" button - file downloads automatically
3. **View Details**: Click "Details" to see full description, version, changelog, and download stats
4. **Statistics**: See total downloads and apps available at the bottom

### For Admins

1. **Access Admin Panel**: Open `admin.html` in your browser
2. **Add Apps**: Fill the form and click "Add App"
3. **Edit Apps**: Click "Edit" on any app to modify it
4. **Delete Apps**: Click "Delete" to remove an app (with confirmation)
5. **Track Stats**: See total downloads and creation count in real-time

---

## Data Storage

**All data is stored locally in your browser** using localStorage. This means:
- ✅ No backend server needed
- ✅ No database to maintain
- ✅ Fast and private
- ✅ Works offline

**To clear data:**
- Open DevTools (F12)
- Console tab
- Type: `localStorage.clear()`
- Press Enter

**To export/backup data:**
```javascript
// In DevTools console
copy(JSON.stringify(localStorage))

// You can paste this somewhere safe and restore later:
const data = /* pasted JSON */;
localStorage.clear();
Object.entries(JSON.parse(data)).forEach(([k,v]) => localStorage.setItem(k,v));
```

---

## Customization

### Change Colors

Edit the CSS variables in `style.css`:
```css
:root {
    --primary-color: #2563eb;      /* Main blue - change to your brand color */
    --primary-dark: #1e40af;       /* Darker blue */
    --accent-color: #f59e0b;       /* Orange - used for highlights */
    --success-color: #10b981;      /* Green */
}
```

### Change Branding/Titles

**In index.html:**
- Line 13: Change the title
- Line 14: Change the brand name in navbar

**In admin.html:**
- Line 13: Change the title
- Line 21: Change the admin title

### Customize Styles

All CSS is in `style.css` with clear sections:
- Navigation bar
- Hero section
- Download cards
- Statistics
- Footer
- Responsive design

---

## Troubleshooting

**Q: Apps don't show up**
- Check browser console (F12) for errors
- Make sure `script.js` is loaded (check Network tab)
- Try clearing localStorage: `localStorage.clear()`

**Q: Downloads don't work**
- Verify the `downloadUrl` is correct (test in a new tab)
- For local files, ensure they're in the correct `/downloads` folder
- For external links, verify the full URL is correct

**Q: Data resets when I close the browser**
- localStorage persists across sessions - check if private/incognito mode
- Verify localStorage is allowed (not blocked by browser settings)

**Q: I want to add more features**
- Download counter: ✅ Already included
- Version history: ✅ Already included via changelog
- Admin panel: ✅ Already included
- Email notifications: Would need backend server
- User authentication: Would need backend server

---

## Security Notes

🔒 **This is a public download platform** - anyone can see admin panel URL  
✅ Data is stored locally, no cloud exposure  
⚠️ For production with sensitive data, consider:
- Password protecting admin panel (requires backend)
- Using HTTPS only
- Validating file downloads

---

## Browser Support

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

---

## Tips for Success

1. **Use Clear App Names** - Help users understand what each app does
2. **Keep Descriptions Short** - 1-2 sentences max
3. **Update Changelog** - Users like to see what's new
4. **Choose Good Emojis** - Match the app purpose (📊=analytics, 📁=file manager, etc.)
5. **Test Downloads** - Click each download button to verify URLs work
6. **Monitor Stats** - Check download trends in the admin panel
7. **Keep Files Small** - Users appreciate fast downloads

---

## Support

Need help? Here's what you can do:

1. **Check the Troubleshooting section** above
2. **Check browser console** (F12 → Console tab) for error messages
3. **Test URLs directly** in your browser to verify download links
4. **Clear browser cache** and try again

---

## License & Attribution

Created for Vitech SAS  
Feel free to modify and use as needed!

---

## Version History

**v1.0.0** (March 2026)
- Initial release
- Download management system
- Admin panel with full CRUD operations
- Download tracking and statistics
- Professional UI with responsive design
- Local storage persistence

---

**Ready to go public? Upload these files to your hosting and share the link!** 🚀
