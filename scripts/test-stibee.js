import 'dotenv/config';

// Mock browser env for testing
if (!process.env.VITE_STIBEE_ACCESS_TOKEN && process.env.STIBEE_ACCESS_TOKEN) {
    // If running in node with .env loaded but keys don't have VITE_ prefix or we want to map them
}

// Read from process.env directly since we are in node
const stibeeToken = process.env.VITE_STIBEE_ACCESS_TOKEN || "58c4936ec3b11ed206fa744bccde14cace1fafe71ed93b49b8b2ead92bbc0fe1c692fe09193ea4b4fd53fb30b83c2d1008f01572144a7f9a4b4b26059102ab07";
const listId = process.env.VITE_STIBEE_LIST_ID || "461332";
const manageUrl = process.env.VITE_MANAGE_BOOKING_URL || "https://whx2026-mediana.vercel.app/my-booking";

const testData = {
    email: "trae.test.user@example.com",
    name: "Trae Test User",
    date: "2026-02-09",
    time: "10:00",
    manage_link: manageUrl
};

async function testStibee() {
    console.log("Starting Stibee API Test...");
    console.log("List ID:", listId);
    
    try {
        // 1. Add Subscriber
        console.log("\n1. Testing Subscriber Add API...");
        const subRes = await fetch(`https://api.stibee.com/v2/lists/${listId}/subscribers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'AccessToken': stibeeToken
            },
            body: JSON.stringify({
                subscriber: {
                    email: testData.email,
                    status: 'subscribed',
                    marketingAllowed: true,
                    fields: {
                        name: testData.name,
                        meeting_date: testData.date,
                        meeting_time: testData.time,
                        manage_link: testData.manage_link
                    }
                },
                updateEnabled: true
            })
        });

        const subText = await subRes.text();
        console.log("Subscriber API Status:", subRes.status);
        console.log("Subscriber API Response:", subText);

        if (subRes.ok) {
            console.log("✅ Subscriber added successfully - Email should be sent automatically by Stibee");
            try {
                const subJson = JSON.parse(subText);
                console.log("Parsed JSON:", subJson);
            } catch (e) {
                console.log("Response was not JSON");
            }
        } else {
            console.error("❌ Subscriber add failed");
            return; 
        }

    } catch (error) {
        console.error("❌ Test script error:", error);
    }
}

testStibee();
