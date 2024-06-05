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
    
    return (await response.json()).token;
}

async function getMeterAggregates(token, env) {
    const url = 'https://teg.dev.pr/api/meters/site';

    const headers = {
        'Content-Type': 'application/json',
        'CF-Access-Client-Id': env.CF_ACCESS_CLIENT_ID,
        'CF-Access-Client-Secret': env.CF_ACCESS_CLIENT_SECRET,
        'Authorization': `Bearer ${token}`
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
    return data;
}

async function main(env) {
    try {
        const token = await login(env);

        const voltage = env.voltage;


        const meterData = await getMeterAggregates(token, env);

        // Print the entire meterData object
        if (meterData && meterData[0].Cached_readings) {
            const cachedReadings = meterData[0].Cached_readings;
            const lastUpdateTime = cachedReadings.last_phase_voltage_communication_time;

            if (voltage) {
                // Store the entire Cached_readings in Cloudflare KV
                await voltage.put(lastUpdateTime, JSON.stringify(cachedReadings));
                let result = await voltage.get(lastUpdateTime)
            } else {
                console.error('Error: KV storage is not properly initialized.');
            }

            console.log(`Last Update Time (raw): ${lastUpdateTime}`);
            console.log(`Grid Voltage L1: ${cachedReadings.v_l1n} V`);
            console.log(`Grid Voltage L2: ${cachedReadings.v_l2n} V`);

        } else {
            console.error('Error: Cached_readings not found in meterData');
        }
    } catch (error) {
        console.error('Errors:', error.message);
    }
}

module.exports = main;




