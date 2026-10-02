/**
 * /api/auth/verify.js — Session Token Verification
 * Vercel Serverless Function
 *
 * Used by admin pages on load to verify the session token is still valid.
 * GET /api/auth/verify
 * Headers: Authorization: Bearer <token>
 *
 * Response: { valid: true, role, email, store_id } | { valid: false }
 */

import { createHash } from 'crypto';

function verifyToken(token) {
  try {
    const secret = process.env.JWT_SECRET || 'campus-connect-production-secret-2026-key';
    const [encoded, sig] = token.split('.');
    if (!encoded || !sig) return null;
    const expected = createHash('sha256').update(secret + encoded).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    const expiryMs = payload.role === 'admin' ? 86400000 : 28800000; // 24h admin, 8h merchant
    if (Date.now() - payload.iat > expiryMs) return null;
    return payload;
  } catch {
    return null;
  }
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ valid: false, error: 'No token provided' });

  const payload = verifyToken(token);
  if (!payload) return res.status(401).json({ valid: false, error: 'Token invalid or expired' });

  return res.status(200).json({
    valid: true,
    role: payload.role,
    email: payload.email,
    store_id: payload.store_id || null,
    sub: payload.sub
  });
}
