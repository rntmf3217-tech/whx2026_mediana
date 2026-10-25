import type { VercelRequest, VercelResponse } from '@vercel/node';
import { format, parseISO } from 'date-fns';

// Internal email to the meeting host (Meeting With) when a booking is assigned
// to them, taken away from them, or changed/cancelled while assigned.
//
// Host emails live only in the server-side HOST_EMAILS env var
// (JSON: {"Michael":"michael@mediana.co.kr", ...}) — not in the editions table,
// which the public anon key can read.

const ACTIONS: Record<string, { tag: string; title: string }> = {
  assigned:   { tag: '배정',      title: '새 미팅이 배정되었습니다.' },
  unassigned: { tag: '배정 해제', title: '담당하던 미팅의 배정이 해제되었습니다.' },
  updated:    { tag: '변경',      title: '담당 미팅의 일정이 변경되었습니다.' },
  cancelled:  { tag: '취소',      title: '담당 미팅이 취소되었습니다.' },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    action, host,
    customer_name, customer_email, company, country, inquiry_type, product, message,
    date, time, exhibition, booth, location,
  } = req.body || {};

  const STIBEE_API_KEY = process.env.STIBEE_ACCESS_TOKEN || process.env.VITE_STIBEE_ACCESS_TOKEN;
  const HOST_LIST_ID = process.env.STIBEE_HOST_LIST_ID;
  const TRIGGER_URL = process.env.STIBEE_TRIGGER_HOST_NOTIFY;
  const SITE_URL = process.env.SITE_URL || "https://reservation.mediana-global.com";

  const meta = ACTIONS[String(action)];
  if (!meta || !host) {
    return res.status(400).json({ error: 'Missing or invalid action/host' });
  }

  if (!STIBEE_API_KEY || !HOST_LIST_ID || !TRIGGER_URL) {
    console.log('Skipping host notification: missing STIBEE_HOST_LIST_ID / STIBEE_TRIGGER_HOST_NOTIFY');
    return res.status(200).json({ skipped: 'not configured' });
  }

  let hostEmails: Record<string, string> = {};
  try {
    hostEmails = JSON.parse(process.env.HOST_EMAILS || '{}');
  } catch {
    console.error('HOST_EMAILS is not valid JSON');
  }
  const hostKey = Object.keys(hostEmails).find(k => k.toLowerCase() === String(host).trim().toLowerCase());
  const hostEmail = hostKey ? hostEmails[hostKey] : undefined;
  if (!hostEmail) {
    console.log(`Skipping host notification: no email for host "${host}"`);
    return res.status(200).json({ skipped: 'unknown host' });
  }

  // Same display format as the customer emails ("November 16, 2026")
  let meetingDate = date;
  try { if (date) meetingDate = format(parseISO(date), "MMMM d, yyyy"); } catch { /* keep raw value */ }

  try {
    // 1. Stamp this booking's details onto the host's record right before
    //    triggering — one Stibee record per email, so the latest call wins.
    const upsertRes = await fetch(`https://api.stibee.com/v2/lists/${HOST_LIST_ID}/subscribers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'AccessToken': STIBEE_API_KEY },
      body: JSON.stringify({
        subscriber: {
          email: hostEmail,
          status: 'subscribed',
          fields: {
            host_name: hostKey,
            host_action: meta.title,
            host_action_tag: meta.tag,
            customer_name: String(customer_name || "").trim(),
            customer_email: String(customer_email || "").trim(),
            company: String(company || "").trim(),
            country: String(country || "").trim(),
            inquiry_type: String(inquiry_type || "").trim(),
            product: String(product || "").trim(),
            message: String(message || "").trim(),
            meeting_date: String(meetingDate || "").trim(),
            meeting_time: String(time || "").trim(),
            exhibition: String(exhibition || "").trim(),
            booth: String(booth || "").trim(),
            location: String(location || "").trim(),
            manage_link: `${SITE_URL}/admin`,
          }
        },
        updateEnabled: true
      })
    });

    if (!upsertRes.ok) {
      console.error('Host subscriber update failed:', upsertRes.status, await upsertRes.text());
    }

    // 2. Trigger the host email
    const triggerRes = await fetch(TRIGGER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'AccessToken': STIBEE_API_KEY },
      body: JSON.stringify({ subscriber: hostEmail })
    });

    if (!triggerRes.ok) {
      const triggerError = await triggerRes.text();
      console.error('Stibee Host Trigger Failed:', triggerError);
      throw new Error(`Trigger failed: ${triggerError}`);
    }

    console.log(`Host notification (${action}) sent to ${hostKey}`);
    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('Notify Host Error:', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
}
