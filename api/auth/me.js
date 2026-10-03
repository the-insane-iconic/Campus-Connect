/**
 * /api/auth/me.js — Current Session & User Profile
 * Vercel Serverless Function
 *
 * GET /api/auth/me
 * Headers: Authorization: Bearer <token>
 */

import { createHash } from 'crypto';

const ADMIN_EMAIL = 'anupamyadav6477@gmail.com';

function verifySessionToken(token) {
  try {
    const secret = process.env.JWT_SECRET || 'campus-connect-production-secret-2026-key';
    const [encoded, sig] = token.split('.');
    if (!encoded || !sig) return null;
    const expected = createHash('sha256').update(secret + encoded).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    const expiryMs = payload.role === 'admin' || payload.role === 'platform_admin' ? 86400000 : 28800000;
    if (Date.now() - payload.iat > expiryMs) return null;
    return payload;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  const payload = verifySessionToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }

  const email = (payload.email || '').toLowerCase();
  const isPlatform = payload.role === 'platform_admin' || payload.role === 'admin' || email === ADMIN_EMAIL.toLowerCase();

  const user = {
    id: payload.sub || (isPlatform ? 'admin' : (payload.store_id || 'merchant')),
    name: payload.name || (isPlatform ? 'Campus Connect Admin' : `${payload.store_id || 'Store'} Owner`),
    email: payload.email || (isPlatform ? ADMIN_EMAIL : `${payload.store_id || 'store'}@campus.edu`),
    role: isPlatform ? 'platform_admin' : 'store_owner',
    store_id: isPlatform ? null : (payload.store_id || null)
  };

  const stores = payload.store_id ? [
    {
      store_id: payload.store_id,
      store_name: payload.store_name || payload.store_id,
      membership_role: 'owner'
    }
  ] : [];

  return res.status(200).json({
    user,
    stores
  });
}
