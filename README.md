# Portfolio Backend

Node.js + Express + MongoDB Atlas backend for the portfolio + admin panel.

## Dashboard: project images and video

- **Cover Image:** one main photo for the portfolio card and project detail page. Leave it blank to use the first gallery image. Pasting multiple image links here puts the first in the cover and the rest in the gallery.
- **Gallery Images:** up to 8 extra screenshots or photos. Paste direct public image links separated by **commas or new lines**, including MediaDrop links, or select files from your device (max 5MB per image). Use **Make cover** or **Remove** under a thumbnail. The portfolio shows a carousel with one clear center project and smaller, softly blurred neighbors. Projects advance every 5 seconds and hold on hover or keyboard focus; previous/next buttons, side-card selection, keyboard arrows, and touch swipe also navigate all projects. The center project's complete images automatically change every 3.5 seconds, including while the project is held. The detail page keeps its separate image buttons, swipe, thumbnails, and fullscreen viewer.
- **Project Video:** one optional YouTube link (including Shorts), direct MP4/WebM/OGG link, or device video up to 8MB. These show a player on the detail page. Other public video pages open in a new tab.
- **Dashboard Link / Website Link:** optional buttons on the detail page; these fields do not upload images.

Check the previews, then click **Save Project**. Selecting a file only prepares it; it is saved with the project. A broken image stays visible as an error so you can replace its link. Previously saved comma-separated image lists also display correctly.

Portfolio cards use larger previews with compact category, status, and title captions. Phone screenshots get taller cards; wide website screenshots get wider cards, with the full image visible. Full descriptions and technology tags remain on the project detail page.

Keep `project-media.js`, `project-gallery.js`, and `project-deck.js` alongside `dashboard.html`, `index.html`, and `project.html` when deploying the frontend. Run `npm test` for the media parsing regression tests.

## Local Setup

```bash
npm install
# .env file already configured
npm start
```

Server runs at: http://localhost:3000

## Deploy to Render (Step-by-Step)

1. **GitHub pe upload karo:**
   - GitHub.com pe new repository banao (e.g. `portfolio-backend`)
   - Is folder ki saari files upload karo

2. **Render pe deploy karo:**
   - https://render.com pe signup/login karo
   - "New +" → "Web Service" click karo
   - Apna GitHub repo connect karo
   - Settings:
     - **Name:** portfolio-backend
     - **Build Command:** `npm install`
     - **Start Command:** `node server.js`
   - "Environment Variables" section mein ye add karo:
     - `MONGODB_URI` = `your url`
     - `JWT_SECRET` = koi bhi random string (e.g. `meri_secret_key_2024_xyz`)
     - `ADMIN_PASSWORD` = `xyz` (ya jo chahiye)
   - "Create Web Service" click karo

3. **Deploy hone ke baad:**
   - Render url : `url paste here`
   - Ye URL copy karo

4. **dashboard.html aur index.html mein URL update karo:**
   - `dashboard.html` open karo → line 1 ke paas `API_BASE` variable dhundo
   - `const API_BASE = 'https://portfolio-backend-xxxx.onrender.com';` mein apna URL paste karo
   - `index.html` mein bhi same karo

## API Endpoints

### Public
- `GET /api/portfolio` — portfolio ka saara data

### Auth
- `POST /api/auth/login` — `{ password }` → `{ token }`

### Admin (Bearer token required)
- `GET/PUT /api/admin/settings`
- `GET/POST /api/admin/projects`
- `PUT/DELETE /api/admin/projects/:id`
- `GET/POST /api/admin/jobs`
- `PUT/DELETE /api/admin/jobs/:id`
- `GET/POST /api/admin/skills`
- `PUT/DELETE /api/admin/skills/:id`
- `GET/POST /api/admin/testimonials`
- `PUT/DELETE /api/admin/testimonials/:id`

## Default Login Password
`admin123` (settings se change kar sakte ho)
