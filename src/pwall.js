const axios = require('axios');
const { connectDatabaseEmulator } = require('firebase/database');

async function login(env) {
    const url = `https://teg.dev.pr/api/login/Basic`;

    const requestBody = JSON.stringify({
        username: 'customer',
        password: env.TESLA_PASSWORD,
        email: 'adam@beguelin.com',
        force_sm_off: false
    });

    const requestHeaders = {
        'Content-Type': 'application/json',
        'CF-Access-Client-Id': env.CF_ACCESS_CLIENT_ID,
        'CF-Access-Client-Secret': env.CF_ACCESS_CLIENT_SECRET
    };

    console.log('Request Body:', requestBody);

    const curlCommand = `curl -X POST ${url} \\
    -H "Content-Type: application/json" \\
    -H "CF-Access-Client-Id: ${env.CF_ACCESS_CLIENT_ID}" \\
    -H "CF-Access-Client-Secret: ${env.CF_ACCESS_CLIENT_SECRET}" \\
    -d '${requestBody}'`;

    console.log('Equivalent cURL command:', curlCommand);

    const response = await fetch(url, {
        method: 'POST',
        headers: requestHeaders,
        body: requestBody
    });


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

    console.log('Response:', response);

    const token = response.token

    return token;
}

async function getMeterAggregates(cookie, env) {
    const url = 'https://teg.dev.pr/api/meters/site';

    const headers = {
        'Content-Type': 'application/json',
        'CF-Access-Client-Id': env.CF_ACCESS_CLIENT_ID,
        'CF-Access-Client-Secret': env.CF_ACCESS_CLIENT_SECRET,
        'Cookie': cookie
    };

    const response = await fetch(url, {
        method: 'GET',
        headers: headers
    });

    if (!response.ok) {
        console.error('Error fetching meter site:', {
            status: response.status,
            statusText: response.statusText,
            headers: [...response.headers.entries()],
        });

        let errorData;
        try {
            errorData = await response.json();
        } catch (jsonError) {
            console.error('Error parsing JSON response:', jsonError, 'Response:', response);
            throw new Error('Failed to fetch meter site and error response could not be parsed');
        }

        console.error('Error data:', errorData);
        throw new Error('Failed to fetch meter site');
    }

    const data = await response.json();
    console.log('Fetched Meter Data:', JSON.stringify(data, null, 2));
    return data;
}

async function main(env) {
    console.log('Starting main function...');
    try {
        const cookie = await login(env);

        const kv = env.KV;

        // let maxL1 = -Infinity, minL1 = Infinity;
        // let maxL2 = -Infinity, minL2 = Infinity;
        console.log('Calling getMeterAggregates...');
        const meterData = await getMeterAggregates(cookie, env);
        if (meterData) {
            console.log('Received Meter Data:', JSON.stringify(meterData, null, 2));
        } else {
            console.log('No Meter Data received.');
        }

        // Print the entire meterData object
        console.log('Meter Data:', JSON.stringify(meterData, null, 2));
        if (meterData && meterData[0].Cached_readings) {
            const v_l1n = meterData[0].Cached_readings.v_l1n; // Adjust this line based on actual JSON structure
            const v_l2n = meterData[0].Cached_readings.v_l2n; // Adjust this line based on actual JSON structure
            const lastUpdateTime = meterData[0].Cached_readings.last_phase_voltage_communication_time;

            // Store the values in Cloudflare KV
            console.log(`Storing in KV: Key = ${lastUpdateTime}, Value = ${JSON.stringify({ v_l1n, v_l2n })}`);
            await kv.put(lastUpdateTime, JSON.stringify({ v_l1n, v_l2n }));

            console.log(`Last Update Time (raw): ${lastUpdateTime}`);
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
    } catch (error) {
        console.error('Errorz:', error.message);
    }
}

module.exports = main;




