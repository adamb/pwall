
import { getUTCToPuertoRicoISODate } from './utils';

async function login(env) {
    const voltage = env.voltage;
    if (!voltage) {
        throw new Error('KV storage is not properly initialized.');
    }

    const tokenData = await voltage.get('token');
    if (tokenData) {
        const { token, timestamp } = JSON.parse(tokenData);
        const tokenAge = (Date.now() - new Date(timestamp).getTime()) / 1000 / 60; // in minutes

        if (tokenAge < 5) {
            return token;
        }
    }

    const url = `https://teg.dev.pr/api/login/Basic`;
    const requestBody = JSON.stringify({
        username: 'customer',
        password: env.TESLA_PASSWORD,
        email: env.EMAIL,
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

    const newToken = (await response.json()).token;
    await voltage.put('token', JSON.stringify({ token: newToken, timestamp: new Date().toISOString() }));

    return newToken;
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

async function getSystemStatusSOE(env) {

    const token = await login(env);

    const url = 'https://teg.dev.pr/api/system_status/soe';

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
        console.error('Error fetching SOE:', {
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

async function getCurrentUsage(env) {
    const voltage = env.voltage;
    if (!voltage) {
        throw new Error('KV storage is not properly initialized.');
    }

    const currentDate = new Date();
    const currentHourISO = getUTCToPuertoRicoISODate(currentDate).slice(0, 13); // Get the current date and hour in ISO format
    const currentHourKeys = await voltage.list({ prefix: currentHourISO });

    if (!currentHourKeys.keys || currentHourKeys.keys.length === 0) {
        throw new Error('No keys found in KV storage.');
    }

    const latestKey = currentHourKeys.keys[currentHourKeys.keys.length - 1].name;
    const latestValue = await voltage.get(latestKey);
    const parsedValue = JSON.parse(latestValue);

    if (!parsedValue || !parsedValue.load || typeof parsedValue.load.instant_power !== 'number') {
        throw new Error('Invalid data format in KV storage.');
    }

    return parsedValue.load.instant_power;
}

module.exports = {
    getCurrentUsage,
    main,
    getSystemStatusSOE
};




