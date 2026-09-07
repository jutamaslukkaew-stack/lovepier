import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { authenticate } from '../middleware/authenticate.js';
const router = Router(); const google = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
router.post('/google', async (req, res, next) => { try {
  const ticket = await google.verifyIdToken({ idToken: req.body.credential, audience: process.env.GOOGLE_CLIENT_ID }); const profile = ticket.getPayload();
  const { rows } = await query(`INSERT INTO users (google_sub,email,name,avatar_url) VALUES ($1,$2,$3,$4) ON CONFLICT (google_sub) DO UPDATE SET email=EXCLUDED.email,name=EXCLUDED.name,avatar_url=EXCLUDED.avatar_url,updated_at=NOW() RETURNING id,email,name,avatar_url`, [profile.sub, profile.email, profile.name, profile.picture]);
  const user = rows[0]; const token = jwt.sign({ sub: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '1h', issuer: 'quiz-platform', algorithm: 'HS256' }); res.json({ token, user });
} catch (error) { next(Object.assign(error, { status: 401 })); } });
router.get('/me', authenticate, async (req, res, next) => { try { const { rows } = await query('SELECT id,email,name,avatar_url FROM users WHERE id=$1', [req.user.sub]); if (!rows[0]) return res.status(404).json({ error: 'User not found' }); res.json({ user: rows[0] }); } catch (e) { next(e); } });
export default router;
