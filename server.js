require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = mongoose.model('User', new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 60 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true }
}));
const Task = mongoose.model('Task', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  title: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, default: '', maxlength: 500 },
  status: { type: String, enum: ['todo', 'in-progress', 'done'], default: 'todo' },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  dueDate: Date
}, { timestamps: true }));

const app = express();
app.use(express.json({ limit: '50kb' }));
app.use(express.static(path.join(__dirname, 'public')));

const SECRET = process.env.JWT_SECRET;
const token = (u) => jwt.sign({ id: u._id }, SECRET, { expiresIn: '7d' });
const auth = (req, res, next) => {
  try {
    req.uid = jwt.verify((req.get('authorization') || '').replace('Bearer ', ''), SECRET).id;
    next();
  } catch (e) {
    res.status(401).json({ error: 'Please log in again.' });
  }
};
const pick = (b) => ({ title: b.title, description: b.description, status: b.status, priority: b.priority, dueDate: b.dueDate || null });

// ---- Authentication ----
app.post('/api/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '') || (password || '').length < 6) {
    return res.status(400).json({ error: 'Enter your name, a valid email and a password of 6+ characters.' });
  }
  try {
    const user = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
    res.status(201).json({ token: token(user), name: user.name });
  } catch (e) {
    res.status(e.code === 11000 ? 409 : 500).json({ error: e.code === 11000 ? 'That email is already registered.' : 'Could not register.' });
  }
});
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  const user = await User.findOne({ email: (email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(password || '', user.password))) {
    return res.status(401).json({ error: 'Wrong email or password.' });
  }
  res.json({ token: token(user), name: user.name });
});

// ---- Tasks (every query is limited to the logged-in user) ----
app.get('/api/tasks', auth, async (req, res) => {
  res.json(await Task.find({ user: req.uid }).sort({ createdAt: -1 }));
});
app.post('/api/tasks', auth, async (req, res) => {
  try { res.status(201).json(await Task.create({ ...pick(req.body), user: req.uid })); }
  catch (e) { res.status(400).json({ error: 'A title is required.' }); }
});
app.put('/api/tasks/:id', auth, async (req, res) => {
  try {
    const t = await Task.findOneAndUpdate({ _id: req.params.id, user: req.uid }, pick(req.body), { new: true, runValidators: true });
    t ? res.json(t) : res.status(404).json({ error: 'Task not found.' });
  } catch (e) { res.status(400).json({ error: 'Could not update the task.' }); }
});
app.delete('/api/tasks/:id', auth, async (req, res) => {
  try { await Task.findOneAndDelete({ _id: req.params.id, user: req.uid }); res.json({ ok: true }); }
  catch (e) { res.status(400).json({ error: 'Could not delete the task.' }); }
});

if (!SECRET || !process.env.MONGODB_URI) { console.error('Set MONGODB_URI and JWT_SECRET in .env'); process.exit(1); }
mongoose.connect(process.env.MONGODB_URI).then(() => {
  console.log('MongoDB connected');
  app.listen(process.env.PORT || 3000, () => console.log('Server running'));
}).catch((e) => { console.error('MongoDB connection failed:', e.message); process.exit(1); });
