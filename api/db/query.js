/**
 * /api/db/query.js — Secure Neon PostgreSQL Proxy
 * Vercel Serverless Function
 *
 * All SQL queries from the browser are routed through this function.
 * The Neon connection string NEVER reaches the client browser.
 *
 * Security layers:
 *  - DB credentials loaded from Vercel env vars only (never in client code)
 *  - CORS restricted to known origins
 *  - Blocked: DROP, TRUNCATE, schema-altering queries, and password_hash retrieval
 *  - Write queries require Authorization header (except student order creation)
 *  - Sensitive RBAC tables restricted to platform admin role
 */

import { createHash } from 'crypto';

const ALLOWED_ORIGINS = [
  process.env.ALLOWED_ORIGIN || '',
  'https://campus-connect.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:3000',
  'http://localhost:8080',
];

// Patterns that are NEVER allowed
const BLOCKED_PATTERNS = [
  /\bDROP\s+(TABLE|DATABASE|SCHEMA|INDEX)\b/i,
  /\bTRUNCATE\b/i,
  /\bGRANT\b/i,
  /\bREVOKE\b/i,
  /\bCREATE\s+USER\b/i,
  /password_hash/i,
  /\bpg_read_file\b/i,
  /\bpg_ls_dir\b/i,
];

function verifySessionToken(token) {
  try {
    const secret = process.env.JWT_SECRET || 'campus-connect-production-secret-2026-key';
    const [encoded, sig] = token.split('.');
    if (!encoded || !sig) return null;
    const expected = createHash('sha256').update(secret + encoded).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(encoded, 'base64url').toString());
    const expiryMs = payload.role === 'admin' ? 86400000 : 28800000;
    if (Date.now() - payload.iat > expiryMs) return null;
    return payload;
  } catch {
    return null;
  }
}

function setCORSHeaders(req, res) {
  const origin = req.headers.origin || '';
  const isAllowed = ALLOWED_ORIGINS.some(o => o && o === origin);
  if (isAllowed || process.env.NODE_ENV === 'development') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else if (!origin) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export default async function handler(req, res) {
  setCORSHeaders(req, res);

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { query, params } = req.body || {};
    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid query' });
    }

    // Block dangerous operations
    if (BLOCKED_PATTERNS.some(p => p.test(query))) {
      console.warn('[API/DB] Blocked query pattern:', query.substring(0, 80));
      return res.status(403).json({ error: 'Query not permitted' });
    }

    // Write operations validation
    const isWrite = /^\s*(INSERT|UPDATE|DELETE)\b/i.test(query);
    if (isWrite) {
      // Check if it's a student order insertion or demand request (customer checkout)
      const isPublicWrite = /^\s*INSERT\s+INTO\s+(unimall_orders|unimall_order_items|unimall_demand_requests)\b/i.test(query);

      if (!isPublicWrite) {
        const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
        if (!token) {
          return res.status(401).json({ error: 'Authentication required for this operation' });
        }

        // Sensitive tables only platform admin can write to
        const isAuthTableWrite = /\b(neon_auth|unimall_admins|user_roles)\b/i.test(query);
        if (isAuthTableWrite) {
          const session = verifySessionToken(token);
          if (!session || session.role !== 'admin') {
            return res.status(403).json({ error: 'Only platform admin can modify roles or admin accounts' });
          }
        }
      }
    }

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Derive SQL HTTP API endpoint from connection string
    const afterAt = dbUrl.split('@')[1] || '';
    const host = afterAt.split('/')[0];
    const sqlUrl = `https://${host}/sql`;

    const neonRes = await fetch(sqlUrl, {
      method: 'POST',
      headers: { 'Neon-Connection-String': dbUrl },
      body: JSON.stringify({ query, params: Array.isArray(params) ? params : [] }),
    });

    if (!neonRes.ok) {
      const errData = await neonRes.json().catch(() => ({}));
      return res.status(neonRes.status).json({ error: errData.message || 'Database query failed' });
    }

    const data = await neonRes.json();
    return res.status(200).json({ rows: data.rows || [] });

  } catch (err) {
    console.error('[API/DB] Error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
