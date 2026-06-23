/**
 * GoPlanet Backend Server
 * Handles: email verification, user persistence, Groq proxy
 * Run with: node server/index.js
 */

import express from 'express'
import cors from 'cors'
import nodemailer from 'nodemailer'
import { v4 as uuidv4 } from 'uuid'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import dotenv from 'dotenv'

dotenv.config()

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = join(__dirname, 'db.json')
const app = express()
const PORT = process.env.PORT || 4000

// ── Middleware ────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }))
app.use(express.json())

// ── Simple JSON "database" ────────────────────────────────
const readDB = () => {
  if (!existsSync(DB_PATH)) writeFileSync(DB_PATH, JSON.stringify({ users: [], chats: {}, projects: {} }))
  return JSON.parse(readFileSync(DB_PATH, 'utf8'))
}
const writeDB = (data) => writeFileSync(DB_PATH, JSON.stringify(data, null, 2))

// ── Nodemailer transporter ────────────────────────────────
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS   // Use Gmail App Password
  }
})

// ── Routes ────────────────────────────────────────────────

// POST /api/register  — Step 1+2: create user, send verify email
app.post('/api/register', async (req, res) => {
  const { email, password, name, mobile } = req.body
  const db = readDB()

  if (db.users.find(u => u.email === email))
    return res.status(409).json({ error: 'Email already registered' })

  const token = uuidv4()
  const newUser = {
    id: uuidv4(), email, password, name, mobile,
    verified: false, verifyToken: token,
    isAdmin: db.users.length === 0,   // first user = admin
    isPro: false,
    joinedAt: new Date().toISOString(),
    examScore: null, certDate: null, certGranted: false
  }

  db.users.push(newUser)
  writeDB(db)

  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}#verify=${token}`

  try {
    await transporter.sendMail({
      from: `"GoPlanet AI" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '🌍 Verify your GoPlanet account',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;background:#f7f7fc;border-radius:16px">
          <h2 style="color:#6c5ce7">Welcome to GoPlanet, ${name}!</h2>
          <p style="color:#444">Click the button below to verify your email and start using GoPlanet AI.</p>
          <a href="${verifyUrl}"
             style="display:inline-block;margin:24px 0;padding:14px 28px;background:#6c5ce7;color:#fff;border-radius:10px;text-decoration:none;font-weight:700">
            ✅ Verify My Account
          </a>
          <p style="color:#888;font-size:12px">If you didn't create this account, ignore this email.</p>
        </div>`
    })
    res.json({ success: true, message: 'Verification email sent' })
  } catch (err) {
    console.error('Email error:', err.message)
    res.json({ success: true, message: 'User created. Email sending failed — use dev token.', devToken: token })
  }
})

// GET /api/verify/:token  — confirm email
app.get('/api/verify/:token', (req, res) => {
  const db = readDB()
  const user = db.users.find(u => u.verifyToken === req.params.token)
  if (!user) return res.status(404).json({ error: 'Invalid or expired token' })

  user.verified = true
  user.verifyToken = null
  writeDB(db)

  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}?verified=true&email=${encodeURIComponent(user.email)}`)
})

// POST /api/login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body
  const db = readDB()
  const user = db.users.find(u => u.email === email && u.password === password)
  if (!user) return res.status(401).json({ error: 'Invalid credentials' })
  if (!user.verified) return res.status(403).json({ error: 'Email not verified' })
  const { password: _, verifyToken: __, ...safeUser } = user
  res.json({ success: true, user: safeUser })
})

// GET /api/users  — admin: list all users
app.get('/api/users', (req, res) => {
  const db = readDB()
  const users = db.users.map(({ password, verifyToken, ...u }) => u)
  res.json(users)
})

// PATCH /api/users/:id  — admin: update user (grant pro, admin, etc.)
app.patch('/api/users/:id', (req, res) => {
  const db = readDB()
  const idx = db.users.findIndex(u => u.id === req.params.id)
  if (idx === -1) return res.status(404).json({ error: 'User not found' })
  db.users[idx] = { ...db.users[idx], ...req.body }
  writeDB(db)
  res.json({ success: true })
})

// POST /api/exam-result  — save exam score
app.post('/api/exam-result', (req, res) => {
  const { email, score } = req.body
  const db = readDB()
  const idx = db.users.findIndex(u => u.email === email)
  if (idx === -1) return res.status(404).json({ error: 'User not found' })
  const passed = score >= 40
  db.users[idx].examScore = score
  db.users[idx].certGranted = passed
  db.users[idx].certDate = passed ? new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : db.users[idx].certDate
  writeDB(db)
  res.json({ success: true, passed, certDate: db.users[idx].certDate })
})

// POST /api/subscribe  — activate pro
app.post('/api/subscribe', (req, res) => {
  const { email } = req.body
  const db = readDB()
  const idx = db.users.findIndex(u => u.email === email)
  if (idx === -1) return res.status(404).json({ error: 'User not found' })
  db.users[idx].isPro = true
  writeDB(db)
  res.json({ success: true })
})

// Health check
app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }))

app.listen(PORT, () => console.log(`🌍 GoPlanet server running on http://localhost:${PORT}`))
