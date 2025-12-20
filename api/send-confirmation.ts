import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS setup
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

  const { subscriber, name, company, country, inquiry_type, meeting_date, meeting_time, manage_link } = req.body;

  if (!subscriber || !name || !meeting_date || !meeting_time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Use environment variables
  const STIBEE_API_KEY = process.env.STIBEE_ACCESS_TOKEN || process.env.VITE_STIBEE_ACCESS_TOKEN;
  const STIBEE_LIST_ID = process.env.STIBEE_LIST_ID || process.env.VITE_STIBEE_LIST_ID;
  const TRIGGER_URL = process.env.STIBEE_TRIGGER_CREATE;
  
  // Admin Notification Config
  const ADMIN_LIST_ID = process.env.STIBEE_ADMIN_LIST_ID || "461812";
  const ADMIN_TRIGGER_URL = process.env.STIBEE_TRIGGER_ADMIN_NOTIFY;

  if (!STIBEE_API_KEY || !STIBEE_LIST_ID || !TRIGGER_URL) {
    console.error('Missing configuration:', { STIBEE_LIST_ID_EXISTS: !!STIBEE_LIST_ID, TRIGGER_URL_EXISTS: !!TRIGGER_URL });
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    console.log(`[DEBUG] Processing Reservation for: ${subscriber} (${name})`);
    
    // --- 1. Customer Notification ---

    // Step 1.1: Add/Update subscriber to list (v2 API)
    console.log("Adding/Updating subscriber to Stibee list (v2)...");
    
    const subscriberResponse = await fetch(`https://api.stibee.com/v2/lists/${STIBEE_LIST_ID}/subscribers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'AccessToken': STIBEE_API_KEY
      },
      body: JSON.stringify({
        subscriber: {
          email: String(subscriber).trim(),
          status: 'subscribed',
          marketingAllowed: true,
          fields: {
            name: String(name).trim(),
            // company: String(company || "").trim(), // Stibee v2 API doesn't support 'company' unless defined in address book
            // country: String(country || "").trim(), // Same for country
            // inquiry_type: String(inquiry_type || "").trim(), // Same for inquiry_type
            meeting_date: String(meeting_date).trim(),
            meeting_time: String(meeting_time).trim(),
            manage_link: String(manage_link || "").trim()
          }
        },
        updateEnabled: true
      })
    });

    if (!subscriberResponse.ok) {
      const errorData = await subscriberResponse.json();
      console.error('Failed to add/update subscriber:', subscriberResponse.status, errorData);
      throw new Error(`Subscriber add failed: ${subscriberResponse.status}`);
    }

    console.log('✅ Subscriber added/updated successfully');

    // Step 1.2: Call Customer Trigger API
    console.log("Triggering confirmation email to customer...");
    const triggerRes = await fetch(TRIGGER_URL, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'AccessToken': STIBEE_API_KEY
      },
      body: JSON.stringify({ subscriber: String(subscriber).trim() })
    });

    if (!triggerRes.ok) {
        const triggerError = await triggerRes.text();
        console.error("Stibee Create Trigger Failed:", triggerError);
    } else {
        console.log("✅ Customer confirmation email triggered successfully");
    }

    // --- 2. Admin Notification ---
    if (ADMIN_TRIGGER_URL && ADMIN_LIST_ID) {
        console.log("Starting Admin Notification Process...");
        try {
            // Step 2.1: Fetch all subscribers from Admin List
            const adminListRes = await fetch(`https://api.stibee.com/v2/lists/${ADMIN_LIST_ID}/subscribers?limit=50`, {
                method: 'GET',
                headers: {
                    'AccessToken': STIBEE_API_KEY
                }
            });

            if (adminListRes.ok) {
                const adminData = await adminListRes.json();
                const admins = adminData || []; // Stibee list API returns array directly in test
                console.log(`Found ${admins.length} admins to notify.`);

                // Step 2.2: Trigger email for each admin
                const notifyPromises = admins.map(async (admin: any) => {
                    const adminEmail = admin.email;
                    console.log(`Notifying admin: ${adminEmail}`);
                    
                    const adminTriggerRes = await fetch(ADMIN_TRIGGER_URL, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'AccessToken': STIBEE_API_KEY
                        },
                        body: JSON.stringify({
                            subscriber: adminEmail,
                            name: String(name).trim(),
                            company: String(company || "").trim(),
                            country: String(country || "").trim(),
                            inquiry_type: String(inquiry_type || "").trim(),
                            meeting_date: String(meeting_date).trim(),
                            meeting_time: String(meeting_time).trim(),
                            manage_link: "https://whx2026-mediana.vercel.app/admin"
                        })
                    });
                    
                    if (!adminTriggerRes.ok) {
                        console.error(`Failed to notify admin ${adminEmail}:`, await adminTriggerRes.text());
                    }
                });

                await Promise.all(notifyPromises);
                console.log("✅ Admin notifications processed.");
            } else {
                console.error("Failed to fetch admin list:", await adminListRes.text());
            }
        } catch (adminError) {
            console.error("Error in Admin Notification flow:", adminError);
            // Don't fail the request if admin notification fails
        }
    } else {
        console.log("Skipping Admin Notification: Missing configuration");
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Confirmation processed' 
    });

  } catch (error: any) {
    console.error("Handler Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
