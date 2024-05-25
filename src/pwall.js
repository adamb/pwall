const axios = require('axios');
const https = require('node:https');
const { KVNamespace } = require('@cloudflare/kv-asset-handler');

const TESLA_PASSWORD = env.TESLA_PASSWORD || 'default_password';

// Load the Powerwall certificate (optional, if using a self-signed certificate)
const httpsAgent = new https.Agent({
    rejectUnauthorized: false
});


async function login() {
    const url = `https://teg.dev.pr/login/Basic`;
    const headers = {
        'CF-Access-Client-Id': env.CF_ACCESS_CLIENT_ID,
        'CF-Access-Client-Secret': env.CF_ACCESS_CLIENT_SECRET
    };
    const payload = {
        username: 'customer',
        password: TESLA_PASSWORD
    };

    try {
        const response = await axios.post(url, payload, { httpsAgent, headers });
        const cookie = response.headers['set-cookie'];
        return cookie;
    } catch (error) {
        console.error('Error during login:', error.response ? error.response.data : error.message);
        throw error;
    }
}

async function getMeterAggregates(cookie) {
    const url = 'https://teg.dev.pr/api/meters/site';

    try {
        const response = await axios.get(url, {
            headers: { 'Cookie': cookie },
            httpsAgent
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching meter site:', error.response ? error.response.data : error.message);
        throw error;
    }
}

async function main() {
    try {
        const cookie = await login();

        const kv = new KVNamespace({ binding: 'KV', apiToken: env.CLOUDFLARE_API_TOKEN });

        // let maxL1 = -Infinity, minL1 = Infinity;
        // let maxL2 = -Infinity, minL2 = Infinity;

        for (let i = 0; i < 10; i++) {
            setTimeout(async () => {
                const meterData = await getMeterAggregates(cookie);

                // Print the entire meterData object
                // console.log('Meter Data:', JSON.stringify(meterData, null, 2));
                if (meterData && meterData[0].Cached_readings) {
                    const v_l1n = meterData[0].Cached_readings.v_l1n; // Adjust this line based on actual JSON structure
                    const v_l2n = meterData[0].Cached_readings.v_l2n; // Adjust this line based on actual JSON structure
                    const lastUpdateTime = meterData[0].Cached_readings.last_phase_voltage_communication_time;

                    // Store the values in Cloudflare KV
                    await kv.put(lastUpdateTime, JSON.stringify({ v_l1n, v_l2n }));

                    console.log(`Last Update Time (raw): ${lastUpdateTime}`);
                    console.log(`Grid Voltage L1: ${v_l1n} V`);
                    console.log(`Grid Voltage L2: ${v_l2n} V`);
                    console.log(`Grid Voltage L1: ${v_l1n} V`);
                    console.log(`Grid Voltage L2: ${v_l2n} V`);

                    // Compute and print the time difference
                    const lastUpdateDate = new Date(lastUpdateTime);
                    const currentDate = new Date();
                    const timeDifference = Math.abs(currentDate - lastUpdateDate);
                    const seconds = Math.floor(timeDifference / 1000);
                    const minutes = Math.floor(seconds / 60);
                    const hours = Math.floor(minutes / 60);
                    const days = Math.floor(hours / 24);

                    console.log(`Last voltage update was ${days} days, ${hours % 24} hours, ${minutes % 60} minutes, and ${seconds % 60} seconds ago.`);
                } else {
                    console.error('Error: Cached_readings not found in meterData');
                }
            }, i * 5000);
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

main();
