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

  const STIBEE_API_URL = process.env.STIBEE_API_URL;
  // 환경변수 공백 제거 (매우 중요: Vercel 환경변수 복사 시 공백이 들어가는 경우가 많음)
  const STIBEE_API_KEY = (process.env.STIBEE_API_KEY || "").trim();
  const STIBEE_LIST_ID = (process.env.STIBEE_LIST_ID || "461332").trim();

  if (!STIBEE_API_URL || !STIBEE_API_KEY) {
    console.error("Missing Stibee configuration");
    return res.status(500).json({ error: 'Server configuration error' });
  }

  // 디버깅: 키 길이 및 앞부분 확인 (혹시 키가 잘못 복사되었는지 확인)
  const keyPrefix = STIBEE_API_KEY.substring(0, 4);
  console.log(`[DEBUG V2] Config Check - API Key Length: ${STIBEE_API_KEY.length}, Prefix: ${keyPrefix}****, List ID: ${STIBEE_LIST_ID}`);

  try {
    // 0. API 키 유효성 테스트 (전체 리스트 조회)
    console.log("Step 0: Testing API Key validity with GET /lists ...");
    const healthCheckResponse = await fetch(`https://stibee.com/api/v1.0/lists`, {
      method: 'GET',
      headers: {
        'AccessToken': STIBEE_API_KEY,
        // GET 요청에는 Content-Type이 필요 없음 (오히려 에러 유발 가능성 있음)
        'User-Agent': 'WHX-Reservation-Server/1.0'
      }
    });

    if (!healthCheckResponse.ok) {
      const healthCheckError = await healthCheckResponse.text();
      console.error("API Key Test Failed:", healthCheckResponse.status, healthCheckError);
      
      // 500 에러가 계속되면 키 문제일 확률이 매우 높음
      if (healthCheckResponse.status === 500) {
        return res.status(500).json({ 
          error: `Stibee API Internal Error (500). Please regenerate your API Key and check permissions. Server message: ${healthCheckError}` 
        });
      }
      
      return res.status(500).json({ 
        error: `Stibee API Key Error. Status: ${healthCheckResponse.status}. Message: ${healthCheckError}` 
      });
    }
    
    const listsData = await healthCheckResponse.json();
    console.log("API Key Verified. Found lists:", listsData.map((l: any) => `${l.name} (${l.id})`).join(", "));

    // 리스트 ID가 실제 존재하는지 확인
    const targetList = listsData.find((l: any) => String(l.id) === STIBEE_LIST_ID);
    if (!targetList) {
      console.error(`List ID ${STIBEE_LIST_ID} not found in the account.`);
      return res.status(500).json({ error: `List ID ${STIBEE_LIST_ID} not found. Available lists: ${listsData.map((l: any) => l.id).join(", ")}` });
    }
    console.log(`Target List '${targetList.name}' (${targetList.id}) confirmed.`);

    // 1. 구독자 추가 (Add Subscriber)
    // 이미 있는 경우 업데이트됨
    console.log("Adding subscriber to list:", STIBEE_LIST_ID);
    
    // 만약의 경우를 대비해 사용자 정의 필드 없이 기본 정보만 먼저 시도
    const subscriberPayload = {
      eventOccuredBy: "SUBSCRIBER", // MANUAL -> SUBSCRIBER 변경 (권한 이슈 가능성 배제)
      confirmEmailYN: "N",
      subscribers: [
        {
          email: String(subscriber).trim(),
          name: String(name).trim()
          // 사용자 정의 필드 일단 제거 (에러 원인 파악용)
          // $meeting_date: String(meeting_date || "").trim(),
          // $meeting_time: String(meeting_time || "").trim(),
          // $manage_link: String(manage_link || "").trim()
        }
      ]
    };
    
    console.log("Subscriber Payload:", JSON.stringify(subscriberPayload));

    const addSubscriberResponse = await fetch(`https://stibee.com/api/v1.0/lists/${STIBEE_LIST_ID}/subscribers`, {
      method: 'POST',
      headers: {
        'AccessToken': STIBEE_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscriberPayload)
    });

    // 구독자 추가 실패 시 로그만 남기고 계속 진행 (이미 있거나 오류 발생 시에도 발송 시도)
    if (!addSubscriberResponse.ok) {
      const errorText = await addSubscriberResponse.text();
      console.warn("Subscriber add warning:", errorText);
    } else {
      console.log("Subscriber added successfully");
    }

    // 2. 자동 메일 발송 (Send Auto Email)
    const response = await fetch(STIBEE_API_URL, {
      method: 'POST',
      headers: {
        'AccessToken': STIBEE_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscriber: String(subscriber),
        name: String(name)
        // 변수 치환 데이터 일단 제외 (발송 성공 우선)
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Stibee API Error:", errorText);
      // Log error but return 500 to indicate failure to client logger
      return res.status(500).json({ error: 'Failed to send email' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error("Server Error:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
