# Portfolio Backend

Node.js + Express + MongoDB Atlas backend for the portfolio + admin panel.

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
     - `MONGODB_URI` = `mongodb+srv://alishafaq782_db_user:TNS37YO5629ZrmIq@cluster0.jvpyl8v.mongodb.net/portfolio`
     - `JWT_SECRET` = koi bhi random string (e.g. `meri_secret_key_2024_xyz`)
     - `ADMIN_PASSWORD` = `admin123` (ya jo chahiye)
   - "Create Web Service" click karo

3. **Deploy hone ke baad:**
   - Render ek URL dega jaise: `https://portfolio-backend-xxxx.onrender.com`
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
