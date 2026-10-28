import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createHash, timingSafeEqual } from 'node:crypto';

// Meeting host (Meeting With) directory for the admin page.
//
// GET  → names + active flags only (no emails), for the "Meeting With" dropdowns.
// POST → { password, op, ... } manage the list; requires HOST_ADMIN_PASSWORD,
//        a server-only env var, so the check can't be read from the site bundle.
//        op: 'list' | 'create' | 'update' | 'delete'
//
// The hosts table has RLS on with no policies: only this server (service_role
// key) can read or write it.

const NO_HOST = '담당자 미선택';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function passwordMatches(given: unknown, expected: string) {
  // Hash both sides so timingSafeEqual gets equal-length buffers
  const a = createHash('sha256').update(String(given ?? '')).digest();
  const b = createHash('sha256').update(expected).digest();
  return timingSafeEqual(a, b);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');

  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ADMIN_PASSWORD = process.env.HOST_ADMIN_PASSWORD;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    // The admin page falls back to the edition's host list when this happens
    return res.status(503).json({ error: 'Host directory not configured (SUPABASE_SERVICE_ROLE_KEY)' });
  }
  const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

  if (req.method === 'GET') {
    const { data, error } = await db
      .from('hosts')
      .select('name, active')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ hosts: data });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!ADMIN_PASSWORD) {
    return res.status(503).json({ error: 'Host management not configured (HOST_ADMIN_PASSWORD)' });
  }

  const { password, op, id } = req.body || {};
  if (!passwordMatches(password, ADMIN_PASSWORD)) {
    return res.status(401).json({ error: 'Wrong password' });
  }

  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : undefined;
  const email = typeof req.body?.email === 'string' ? req.body.email.trim() : undefined;
  const active = typeof req.body?.active === 'boolean' ? req.body.active : undefined;

  if (name !== undefined && (!name || name === NO_HOST)) {
    return res.status(400).json({ error: 'Enter a host name' });
  }
  if (email !== undefined && !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'Enter a valid email' });
  }

  try {
    if (op === 'list') {
      const [hostsRes, bookingsRes] = await Promise.all([
        db.from('hosts').select('id, name, email, active, sort_order')
          .order('sort_order', { ascending: true }).order('name', { ascending: true }),
        db.from('bookings').select('meeting_with'),
      ]);
      if (hostsRes.error) throw hostsRes.error;
      if (bookingsRes.error) throw bookingsRes.error;

      // How many bookings (all editions) each host is assigned to — shown before delete
      const counts: Record<string, number> = {};
      for (const b of bookingsRes.data) {
        const key = String(b.meeting_with || '').toLowerCase();
        if (key) counts[key] = (counts[key] || 0) + 1;
      }
      const hosts = hostsRes.data.map(h => ({ ...h, assigned: counts[h.name.toLowerCase()] || 0 }));
      return res.status(200).json({ hosts });
    }

    if (op === 'create') {
      if (!name || !email) return res.status(400).json({ error: 'Name and email are required' });
      const { data: last } = await db.from('hosts').select('sort_order')
        .order('sort_order', { ascending: false }).limit(1);
      const { error } = await db.from('hosts').insert([{
        name, email, active: active ?? true, sort_order: (last?.[0]?.sort_order ?? 0) + 1,
      }]);
      if (error) {
        if (error.code === '23505') return res.status(409).json({ error: `"${name}" already exists` });
        throw error;
      }
      return res.status(200).json({ success: true });
    }

    if (op === 'update') {
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const { data: current, error: findError } = await db.from('hosts').select('name').eq('id', id).single();
      if (findError || !current) return res.status(404).json({ error: 'Host not found' });

      const updates: Record<string, unknown> = {};
      if (name !== undefined) updates.name = name;
      if (email !== undefined) updates.email = email;
      if (active !== undefined) updates.active = active;

      const { error } = await db.from('hosts').update(updates).eq('id', id);
      if (error) {
        if (error.code === '23505') return res.status(409).json({ error: `"${name}" already exists` });
        throw error;
      }

      // Bookings point at hosts by name: carry existing assignments over on rename,
      // otherwise their host emails would stop
      if (name !== undefined && name !== current.name) {
        const { error: renameError } = await db.from('bookings')
          .update({ meeting_with: name }).eq('meeting_with', current.name);
        if (renameError) throw renameError;
      }
      return res.status(200).json({ success: true });
    }

    if (op === 'delete') {
      if (!id) return res.status(400).json({ error: 'Missing id' });
      const { error } = await db.from('hosts').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ error: 'Unknown op' });
  } catch (error) {
    console.error('Hosts API error:', error);
    const message = error && typeof error === 'object' && 'message' in error ? String(error.message) : String(error);
    return res.status(500).json({ error: message });
  }
}
