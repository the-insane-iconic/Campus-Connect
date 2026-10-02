/**
 * /api/auth/role.js — Role Resolution Endpoint
 * Vercel Serverless Function
 *
 * Called after any login (Google OAuth or merchant form).
 * Looks up the user's role in the user_roles table and returns it.
 * The response drives where the frontend redirects the user.
 *
 * GET /api/auth/role
 * Headers: Authorization: Bearer <session_token_or_neon_jwt>
 *
 * Response: { role: 'user' | 'merchant' | 'admin', store_id?: string, name?: string, email?: string }
 */

const ADMIN_EMAIL = 'anupamyadav6477@gmail.com';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const authHeader = req.headers.authorization || '';
  const email = (req.query && req.query.email) || (req.body && req.body.email);

  if (!email && !authHeader) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return res.status(500).json({ error: 'Database not configured' });

  try {
    const afterAt = dbUrl.split('@')[1] || '';
    const host = afterAt.split('/')[0];
    const sqlUrl = `https://${host}/sql`;

    async function neonSql(query, params) {
      const r = await fetch(sqlUrl, {
        method: 'POST',
        headers: { 'Neon-Connection-String': dbUrl },
        body: JSON.stringify({ query, params }),
      });
      if (!r.ok) {
        const errText = await r.text().catch(() => '');
        throw new Error(`DB error ${r.status}: ${errText}`);
      }
      const d = await r.json();
      return d.rows || [];
    }

    const userEmail = String(email || '').trim().toLowerCase();

    if (userEmail) {
      // Hardcoded admin check — fastest path
      if (userEmail === ADMIN_EMAIL.toLowerCase()) {
        return res.status(200).json({ role: 'admin', email: userEmail });
      }

      // Check user_roles table
      const roleRows = await neonSql(
        `SELECT role, store_id, email
         FROM user_roles
         WHERE LOWER(email) = $1
         LIMIT 1`,
        [userEmail]
      );

      if (roleRows.length > 0) {
        const r = roleRows[0];
        return res.status(200).json({
          role: r.role,
          store_id: r.store_id || null,
          email: r.email
        });
      }

      // Check legacy unimall_admins table
      const adminRows = await neonSql(
        `SELECT role, store_id, name, email FROM unimall_admins WHERE LOWER(email) = $1 LIMIT 1`,
        [userEmail]
      );

      if (adminRows.length > 0) {
        const r = adminRows[0];
        return res.status(200).json({
          role: r.role === 'platform_admin' ? 'admin' : 'merchant',
          store_id: r.store_id || null,
          name: r.name,
          email: r.email
        });
      }

      // Default: regular user
      return res.status(200).json({ role: 'user', email: userEmail });
    }

    return res.status(400).json({ error: 'Email required' });

  } catch (err) {
    console.error('[API/Auth/Role] Error:', err.message);
    return res.status(500).json({ error: 'Role lookup failed' });
  }
}
