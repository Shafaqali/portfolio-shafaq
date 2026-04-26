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
  resume_url:         { type: String, default: '', maxlength: 8000000 }, // ✅ NEW: base64 PDF or external URL
  available:          { type: String, default: '0' },
  show_testimonials:  { type: Boolean, default: true },
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

const Settings    = mongoose.model('Settings',      SettingsSchema);
const Project     = mongoose.model('Project',       ProjectSchema);
const Job         = mongoose.model('Job',           JobSchema);
const SkillCat    = mongoose.model('SkillCategory', SkillCategorySchema);
const Testimonial = mongoose.model('Testimonial',   TestimonialSchema);

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

// ── Health Check ────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ status: 'ok', message: 'Portfolio backend running 🚀' }));

// ── PUBLIC: Portfolio Data ──────────────────────────────────────────
app.get('/api/portfolio', async (req, res) => {
  try {
    const [settings, projects, jobs, skillCategories, testimonials] = await Promise.all([
      Settings.findOne().select('-admin_password_hash'),
      Project.find().sort({ order: 1, createdAt: -1 }),
      Job.find().sort({ order: 1, createdAt: -1 }),
      SkillCat.find().sort({ order: 1 }),
      Testimonial.find({ visible: true })
    ]);
    res.json({
      settings: settings || {},
      projects,
      jobs,
      skillCategories,
      testimonials
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

// ── Start ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));