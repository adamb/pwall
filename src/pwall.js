const axios = require('axios');
const { KVNamespace } = require('@cloudflare/kv-asset-handler');
const { connectDatabaseEmulator } = require('firebase/database');

async function login(env) {
    const url = `https://teg.dev.pr/login/Basic`;
    const headers = {
        'Content-Type': 'application/json',
        'CF-Access-Client-Id': env.CF_ACCESS_CLIENT_ID,
        'CF-Access-Client-Secret': env.CF_ACCESS_CLIENT_SECRET
    };
    const response = await fetch(url, {
        headers: headers,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'CF-Access-Client-Id': env.CF_ACCESS_CLIENT_ID,
            'CF-Access-Client-Secret': env.CF_ACCESS_CLIENT_SECRET
        },
        body: JSON.stringify({
            username: 'customer',
            password: env.TESLA_PASSWORD
        })
    });
    console.log('post login fetch' + JSON.stringify(response.ok))
    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (jsonError) {
            console.error('Error parsing JSON response:', jsonError, 'Response:', response);
            throw new Error('Login failed and error response could not be parsed');
        }
        console.error('Error during login:', errorData);
        throw new Error('Login failed');
    }

    const cookie = response.headers.get('set-cookie');
    console.log("got cookie")
    return cookie;
}

async function getMeterAggregates(cookie) {
    const url = 'https://teg.dev.pr/api/meters/site';

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Cookie': cookie
        }
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('Error fetching meter site:', errorData);
        throw new Error('Failed to fetch meter site');
    }

    const data = await response.json();
    return data;
}

async function main(env) {
    // Your main function code
    console.log('main');
    try {
        const cookie = await login(env);

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

module.exports = main;




