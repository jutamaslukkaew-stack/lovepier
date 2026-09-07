import jwt from 'jsonwebtoken';

export function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'Bearer token required' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'], issuer: 'quiz-platform' }); next(); }
  catch { return res.status(401).json({ error: 'Invalid or expired token' }); }
}
