require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ── MongoDB Connection ──────────────────────────────────────────────
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// ── Schemas & Models ───────────────────────────────────────────────
const SettingsSchema = new mongoose.Schema({
  name:               { type: String, default: 'Mohammed Natsha' },
  tagline:            { type: String, default: 'Full-Stack Developer' },
  bio:                { type: String, default: '' },
  email:              { type: String, default: '' },
  linkedin:           { type: String, default: '' },
  github:             { type: String, default: '' },
  photo_url:          { type: String, default: '', maxlength: 2000000 },
  resume_url:         { type: String, default: '', maxlength: 8000000 },
  available:          { type: String, default: '0' },
  show_testimonials:  { type: Boolean, default: true },
  show_projects:      { type: Boolean, default: true },
  show_skills:        { type: Boolean, default: true },
  show_career:        { type: Boolean, default: true },
  show_contact:       { type: Boolean, default: true },
  show_blog:          { type: Boolean, default: true },
  freelance:          { type: Boolean, default: false },
  admin_password_hash:{ type: String, select: false }
}, { timestamps: true });

const ProjectSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  description: { type: String, default: '' },
  status:      { type: String, enum: ['Live','WIP','Archived'], default: 'WIP' },
  github:      { type: String, default: '' },
  live:        { type: String, default: '' },
  image_url:   { type: String, default: '' },
  tech_tags:   [String],
  featured:    { type: Boolean, default: false },
  is_featured: { type: Boolean, default: false },
  order:       { type: Number, default: 0 }
}, { timestamps: true });

const JobSchema = new mongoose.Schema({
  company:     { type: String, required: true },
  role:        { type: String, default: '' },
  date_text:   { type: String, default: '' },
  is_current:  { type: Boolean, default: false },
  bullets:     [String],
  tech_tags:   [String],
  panel_theme: { type: String, default: 'theme-blue' },
  panel_title: { type: String, default: '' },
  panel_tags:  [String],
  order:       { type: Number, default: 0 }
}, { timestamps: true });

const SkillCategorySchema = new mongoose.Schema({
  title:       { type: String, required: true },
  description: { type: String, default: '' },
  tools:       [{ name: String, icon_url: String, needs_dark_invert: Boolean }],
  tags:        [{ label: String }],
  order:       { type: Number, default: 0 }
}, { timestamps: true });

const TestimonialSchema = new mongoose.Schema({
  author_name:  { type: String, default: '' },
  author_role:  { type: String, default: '' },
  author_emoji: { type: String, default: '🧑' },
  quote:        { type: String, default: '' },
  visible:      { type: Boolean, default: true }
}, { timestamps: true });

const BlogPostSchema = new mongoose.Schema({
  title:        { type: String, required: true },
  slug:         { type: String, default: '' },
  category:     { type: String, default: '' },
  read_time:    { type: String, default: '' },
  excerpt:      { type: String, default: '' },
  cover_image:  { type: String, default: '' },
  external_url: { type: String, default: '' },
  published:    { type: Boolean, default: true }
}, { timestamps: true });

const ContactSchema = new mongoose.Schema({
  name:    { type: String, required: true },
  email:   { type: String, required: true },
  subject: { type: String, default: '' },
  message: { type: String, required: true },
  read:    { type: Boolean, default: false },
  starred: { type: Boolean, default: false }
}, { timestamps: true });

const Settings    = mongoose.model('Settings',      SettingsSchema);
const Project     = mongoose.model('Project',       ProjectSchema);
const Job         = mongoose.model('Job',           JobSchema);
const SkillCat    = mongoose.model('SkillCategory', SkillCategorySchema);
const Testimonial = mongoose.model('Testimonial',   TestimonialSchema);
const BlogPost    = mongoose.model('BlogPost',      BlogPostSchema);
const Contact     = mongoose.model('Contact',       ContactSchema);

// ── Auth Middleware ─────────────────────────────────────────────────
function authRequired(req, res, next) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'No token' });
  try {
    req.admin = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// ── Resend Email Helper ─────────────────────────────────────────────
async function sendEmailViaResend({ to, senderName, senderEmail, subject, message }) {
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) {
    console.warn('⚠️  RESEND_API_KEY not set — skipping email send');
    return;
  }

  const html = `
    <div style="font-family:'Segoe UI',sans-serif;max-width:560px;margin:0 auto;background:#0d0d18;color:#eeeef5;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.1)">
      <div style="background:linear-gradient(135deg,#1a1a2e,#13131f);padding:28px 32px;border-bottom:1px solid rgba(255,255,255,0.08)">
        <div style="font-size:1.2rem;font-weight:800;letter-spacing:-0.02em;color:#eeeef5">
          📬 New Contact Message
        </div>
        <div style="font-size:0.78rem;color:rgba(238,238,245,0.5);margin-top:4px">
          From your portfolio contact form
        </div>
      </div>
      <div style="padding:28px 32px">
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px">
          <tr>
            <td style="padding:8px 0;font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(238,238,245,0.4);width:80px">Name</td>
            <td style="padding:8px 0;font-size:0.88rem;color:#eeeef5;font-weight:600">${senderName}</td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(238,238,245,0.4)">Email</td>
            <td style="padding:8px 0;font-size:0.88rem;color:#c084fc"><a href="mailto:${senderEmail}" style="color:#c084fc;text-decoration:none">${senderEmail}</a></td>
          </tr>
          <tr>
            <td style="padding:8px 0;font-size:0.75rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(238,238,245,0.4)">Subject</td>
            <td style="padding:8px 0;font-size:0.88rem;color:#eeeef5">${subject || '—'}</td>
          </tr>
        </table>
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:18px 20px">
          <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:rgba(238,238,245,0.4);margin-bottom:10px">Message</div>
          <div style="font-size:0.88rem;color:rgba(238,238,245,0.85);line-height:1.7;white-space:pre-wrap">${message}</div>
        </div>
        <div style="margin-top:20px">
          <a href="mailto:${senderEmail}?subject=Re: ${encodeURIComponent(subject || 'Your message')}" style="display:inline-block;background:#c084fc;color:#0d0d18;text-decoration:none;padding:10px 20px;border-radius:9px;font-size:0.82rem;font-weight:700">
            ↩ Reply to ${senderName}
          </a>
        </div>
      </div>
      <div style="padding:16px 32px;border-top:1px solid rgba(255,255,255,0.06);font-size:0.7rem;color:rgba(238,238,245,0.28);text-align:center">
        Sent via your portfolio contact form
      </div>
    </div>
  `;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + RESEND_KEY,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({
        from:     'Portfolio Contact <onboarding@resend.dev>',
        to:       [to],
        reply_to: senderEmail,
        subject:  `📬 [Portfolio] ${subject || 'New message from ' + senderName}`,
        html
      })
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      console.error('❌ Resend error:', err);
    } else {
      console.log('✅ Email sent via Resend to', to);
    }
  } catch (e) {
    console.error('❌ Resend fetch failed:', e.message);
  }
}

// ── Health Check ────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'ok', message: 'Portfolio backend running 🚀' }));

// ── PUBLIC: Portfolio Data ──────────────────────────────────────────
app.get('/api/portfolio', async (req, res) => {
  try {
    const [settings, projects, jobs, skillCategories, testimonials, blogPosts] = await Promise.all([
      Settings.findOne().select('-admin_password_hash'),
      Project.find().sort({ order: 1, createdAt: -1 }),
      Job.find().sort({ order: 1, createdAt: -1 }),
      SkillCat.find().sort({ order: 1 }),
      Testimonial.find({ visible: true }),
      BlogPost.find({ published: true }).sort({ createdAt: -1 })
    ]);
    res.json({
      settings: settings || {},
      projects,
      jobs,
      skillCategories,
      testimonials,
      blogPosts
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUBLIC: Contact Form Submit ─────────────────────────────────────
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Basic validation
    if (!name || !name.trim())    return res.status(400).json({ error: 'Name is required' });
    if (!email || !email.trim())  return res.status(400).json({ error: 'Email is required' });
    if (!message || !message.trim()) return res.status(400).json({ error: 'Message is required' });

    // Save to MongoDB
    const contact = await Contact.create({
      name:    name.trim(),
      email:   email.trim().toLowerCase(),
      subject: (subject || '').trim(),
      message: message.trim()
    });

    // Get owner email from Settings to send notification
    const settings = await Settings.findOne().select('email');
    if (settings?.email) {
      await sendEmailViaResend({
        to:          settings.email,
        senderName:  name.trim(),
        senderEmail: email.trim(),
        subject:     (subject || '').trim(),
        message:     message.trim()
      });
    }

    res.json({ ok: true, id: contact._id });
  } catch (err) {
    console.error('Contact submit error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// ── AUTH: Login ─────────────────────────────────────────────────────
app.post('/api/auth/login', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });

    const settings = await Settings.findOne().select('+admin_password_hash');
    let valid = false;

    if (settings?.admin_password_hash) {
      valid = await bcrypt.compare(password, settings.admin_password_hash);
    } else {
      valid = (password === (process.env.ADMIN_PASSWORD || 'admin123'));
    }

    if (!valid) return res.status(401).json({ error: 'Wrong password' });

    const token = jwt.sign({ admin: true }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ADMIN: Settings ─────────────────────────────────────────────────
app.get('/api/admin/settings', authRequired, async (req, res) => {
  const s = await Settings.findOne().select('-admin_password_hash');
  res.json(s || {});
});

app.put('/api/admin/settings', authRequired, async (req, res) => {
  try {
    const update = { ...req.body };
    if (update.new_password && update.new_password.length >= 6) {
      update.admin_password_hash = await bcrypt.hash(update.new_password, 10);
    }
    delete update.new_password;
    const s = await Settings.findOneAndUpdate({}, update, {
      upsert: true, new: true, select: '-admin_password_hash'
    });
    res.json(s);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── ADMIN: Projects ─────────────────────────────────────────────────
app.get('/api/admin/projects', authRequired, async (req, res) => {
  res.json(await Project.find().sort({ order: 1, createdAt: -1 }));
});

app.post('/api/admin/projects', authRequired, async (req, res) => {
  try { res.json(await Project.create(req.body)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/projects/:id', authRequired, async (req, res) => {
  try { res.json(await Project.findByIdAndUpdate(req.params.id, req.body, { new: true })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/projects/:id', authRequired, async (req, res) => {
  await Project.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// ── ADMIN: Jobs ─────────────────────────────────────────────────────
app.get('/api/admin/jobs', authRequired, async (req, res) => {
  res.json(await Job.find().sort({ order: 1, createdAt: -1 }));
});

app.post('/api/admin/jobs', authRequired, async (req, res) => {
  try { res.json(await Job.create(req.body)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/jobs/:id', authRequired, async (req, res) => {
  try { res.json(await Job.findByIdAndUpdate(req.params.id, req.body, { new: true })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/jobs/:id', authRequired, async (req, res) => {
  await Job.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// ── ADMIN: Skills ───────────────────────────────────────────────────
app.get('/api/admin/skills', authRequired, async (req, res) => {
  res.json(await SkillCat.find().sort({ order: 1 }));
});

app.post('/api/admin/skills', authRequired, async (req, res) => {
  try { res.json(await SkillCat.create(req.body)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/skills/:id', authRequired, async (req, res) => {
  try { res.json(await SkillCat.findByIdAndUpdate(req.params.id, req.body, { new: true })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/skills/:id', authRequired, async (req, res) => {
  await SkillCat.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// ── ADMIN: Testimonials ─────────────────────────────────────────────
app.get('/api/admin/testimonials', authRequired, async (req, res) => {
  res.json(await Testimonial.find().sort({ createdAt: -1 }));
});

app.post('/api/admin/testimonials', authRequired, async (req, res) => {
  try { res.json(await Testimonial.create(req.body)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/testimonials/:id', authRequired, async (req, res) => {
  try { res.json(await Testimonial.findByIdAndUpdate(req.params.id, req.body, { new: true })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/testimonials/:id', authRequired, async (req, res) => {
  await Testimonial.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// ── ADMIN: Blog Posts ───────────────────────────────────────────────
app.get('/api/admin/blog', authRequired, async (req, res) => {
  res.json(await BlogPost.find().sort({ createdAt: -1 }));
});

app.post('/api/admin/blog', authRequired, async (req, res) => {
  try { res.json(await BlogPost.create(req.body)); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/blog/:id', authRequired, async (req, res) => {
  try { res.json(await BlogPost.findByIdAndUpdate(req.params.id, req.body, { new: true })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/blog/:id', authRequired, async (req, res) => {
  await BlogPost.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// ── ADMIN: Contacts ─────────────────────────────────────────────────
app.get('/api/admin/contacts', authRequired, async (req, res) => {
  res.json(await Contact.find().sort({ createdAt: -1 }));
});

app.put('/api/admin/contacts/:id/read', authRequired, async (req, res) => {
  try {
    const c = await Contact.findByIdAndUpdate(
      req.params.id, { read: req.body.read }, { new: true }
    );
    res.json(c);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/contacts/:id/star', authRequired, async (req, res) => {
  try {
    const c = await Contact.findByIdAndUpdate(
      req.params.id, { starred: req.body.starred }, { new: true }
    );
    res.json(c);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/contacts/:id', authRequired, async (req, res) => {
  await Contact.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

// ── Start ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
