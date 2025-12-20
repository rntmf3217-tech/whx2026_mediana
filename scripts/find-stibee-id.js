import https from 'https';

const STIBEE_API_KEY = "58c4936ec3b11ed206fa744bccde14cace1fafe71ed93b49b8b2ead92bbc0fe1c692fe09193ea4b4fd53fb30b83c2d1008f01572144a7f9a4b4b26059102ab07";

const tryPath = (path) => {
    const options = {
        hostname: 'api.stibee.com',
        path: path,
        method: 'GET',
        headers: {
            'AccessToken': STIBEE_API_KEY,
            'Content-Type': 'application/json'
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            console.log(`[${path}] Status:`, res.statusCode);
            if (res.statusCode === 200) {
                 try {
                    const parsed = JSON.parse(data);
                    console.log(`[${path}] First item:`, JSON.stringify(parsed.Value ? parsed.Value[0] : parsed, null, 2));
                } catch (e) {
                    console.log(`[${path}] Raw:`, data.substring(0, 100));
                }
            }
        });
    });
    req.on('error', (e) => console.error(e));
    req.end();
};

tryPath('/v1/emails?limit=1');
