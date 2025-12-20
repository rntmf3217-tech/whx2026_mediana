import type { VercelRequest, VercelResponse } from '@vercel/node';

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

  const { email } = req.body;
  const STIBEE_API_KEY = process.env.VITE_STIBEE_ACCESS_TOKEN || process.env.STIBEE_ACCESS_TOKEN;
  const STIBEE_LIST_ID = process.env.VITE_STIBEE_LIST_ID || process.env.STIBEE_LIST_ID;

  if (!STIBEE_API_KEY || !STIBEE_LIST_ID) {
    console.error('Missing configuration: STIBEE_ACCESS_TOKEN or STIBEE_LIST_ID');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    console.log(`Processing subscriber deletion for ${email}`);

    // Call Stibee Subscriber Delete API
    const deleteRes = await fetch(`https://api.stibee.com/v2/lists/${STIBEE_LIST_ID}/subscribers`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'AccessToken': STIBEE_API_KEY
      },
      body: JSON.stringify({
        subscribers: [email]
      })
    });

    if (!deleteRes.ok) {
        const deleteError = await deleteRes.text();
        console.error("Stibee Subscriber Delete Failed:", deleteError);
        throw new Error(`Subscriber deletion failed: ${deleteError}`);
    }

    console.log("Stibee Subscriber Deleted Successfully");
    return res.status(200).json({ success: true });

  } catch (error: any) {
    console.error('Delete Subscriber Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
