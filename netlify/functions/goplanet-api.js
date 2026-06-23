/**
 * Netlify Function: goplanet-api
 * Handles register, verify, login, exam results
 * Deployed at: /.netlify/functions/goplanet-api
 */

import nodemailer from 'nodemailer'

// In production use a real DB (Supabase, PlanetScale, MongoDB Atlas, etc.)
// This demo uses in-memory store — replace with your DB calls
const users = []

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }

  const path = event.path.replace('/.netlify/functions/goplanet-api', '')
  const body = event.body ? JSON.parse(event.body) : {}

  // POST /register
  if (event.httpMethod === 'POST' && path === '/register') {
    const { email, password, name, mobile } = body
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36)
    const verifyUrl = `${process.env.URL}#verify=${token}`

    try {
      await transporter.sendMail({
        from: `"GoPlanet AI" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🌍 Verify your GoPlanet account',
        html: `<div style="font-family:sans-serif;padding:32px">
          <h2 style="color:#6c5ce7">Welcome to GoPlanet, ${name}!</h2>
          <a href="${verifyUrl}" style="display:inline-block;padding:14px 28px;background:#6c5ce7;color:#fff;border-radius:10px;text-decoration:none;font-weight:700">
            ✅ Verify My Account
          </a></div>`
      })
    } catch (e) {
      console.error('Email error', e.message)
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, token }) }
  }

  return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) }
}
