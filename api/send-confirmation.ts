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

  const { subscriber, name, meeting_date, meeting_time, manage_link } = req.body;

  if (!subscriber || !name || !meeting_date || !meeting_time) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // 1. 설정 (사용자가 제공한 정보 기반)
  const STIBEE_API_KEY = "58c4936ec3b11ed206fa744bccde14cace1fafe71ed93b49b8b2ead92bbc0fe1c692fe09193ea4b4fd53fb30b83c2d1008f01572144a7f9a4b4b26059102ab07";
  const STIBEE_LIST_ID = (process.env.STIBEE_LIST_ID || "461332").trim();
  // 사용자가 제공한 자동 메일 트리거 URL (API 발송용)
  const STIBEE_AUTO_URL = "https://stibee.com/api/v1.0/auto/MDViMjczMTItYmI0Yy00ODk1LWI3MjUtNDkyZmI1YTY1MDMw";

  // 디버깅
  console.log(`[DEBUG] Processing Reservation for: ${subscriber} (${name})`);

  try {
    // ---------------------------------------------------------
    // Step 1: 구독자 주소록에 추가 (v1.0 API)
    // ---------------------------------------------------------
    // 참고: 자동 메일 트리거가 주소록 추가를 겸할 수도 있지만, 
    // 명시적으로 추가하여 정보를 갱신하는 것이 안전함.
    console.log("Step 1: Adding subscriber to list (v1.0)...");
    
    const addParams = {
      eventOccuredBy: 'SUBSCRIBER',
      confirmEmailYN: 'N', // 자동 메일 트리거를 별도로 하므로 N 설정
      subscribers: [
        {
          email: String(subscriber).trim(),
          name: String(name).trim(),
          // 사용자 정의 필드 (주소록에 저장될 정보)
          $meeting_date: String(meeting_date).trim(),
          $meeting_time: String(meeting_time).trim(),
          $manage_link: String(manage_link || "").trim(),
          $status: 'RESERVED'
        }
      ]
    };

    const addResponse = await fetch(`https://stibee.com/api/v1.0/lists/${STIBEE_LIST_ID}/subscribers`, {
      method: 'POST',
      headers: {
        'AccessToken': STIBEE_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(addParams)
    });

    if (!addResponse.ok) {
      const errorText = await addResponse.text();
      console.warn(`Warning: Failed to add subscriber to list. Status: ${addResponse.status}, Msg: ${errorText}`);
      // 리스트 추가 실패해도 메일 발송은 시도해봄
    } else {
      const addResult = await addResponse.json();
      console.log("Subscriber added/updated:", addResult);
    }

    // ---------------------------------------------------------
    // Step 2: 자동 메일 트리거 (v1.0 Auto API)
    // ---------------------------------------------------------
    // 사용자가 제공한 URL로 직접 요청
    console.log("Step 2: Triggering Auto Email...");

    const triggerParams = {
      subscriber: String(subscriber).trim(), // Auto API에서는 key가 'subscriber'일 수 있음
      name: String(name).trim(),
      $meeting_date: String(meeting_date).trim(),
      $meeting_time: String(meeting_time).trim(),
      $manage_link: String(manage_link || "").trim()
    };
    
    console.log("Trigger Payload:", JSON.stringify(triggerParams));

    const triggerResponse = await fetch(STIBEE_AUTO_URL, {
      method: 'POST',
      headers: {
        'AccessToken': STIBEE_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(triggerParams)
    });

    if (!triggerResponse.ok) {
      const errorText = await triggerResponse.text();
      console.error(`Auto Email Trigger Failed: ${triggerResponse.status} ${errorText}`);
      throw new Error(`Email Trigger Error: ${triggerResponse.status} ${errorText}`);
    }

    const triggerResult = await triggerResponse.json();
    console.log("Auto Email Triggered Successfully:", triggerResult);

    return res.status(200).json({ 
      success: true, 
      message: "Reservation confirmed and email triggered.",
      data: triggerResult
    });

  } catch (error: any) {
    console.error("Handler Error:", error);
    return res.status(500).json({ error: error.message || "Internal Server Error" });
  }
}
