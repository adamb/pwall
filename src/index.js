/**
 * Welcome to Cloudflare Workers! This is your first scheduled worker.
 *
 * - Run `wrangler dev --local` in your terminal to start a development server
 * - Run `curl "http://localhost:8787/cdn-cgi/mf/scheduled"` to trigger the scheduled event
 * - Go back to the console to see what your worker has logged
 * - Update the Cron trigger in wrangler.toml (see https://developers.cloudflare.com/workers/wrangler/configuration/#triggers)
 * - Run `wrangler publish --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/runtime-apis/scheduled-event/
 */

import { main, getSystemStatusSOE, getCurrentUsage, getGridStatus } from './pwall';
import { handleFetch } from './handleFetch';
import { getUTCToPuertoRicoISODate } from './utils';


export default {
	async scheduled(controller, env, ctx) {
		ctx.waitUntil(main(env));
	},
	async fetch(request, env) {
		return handleFetch(request, env);
	},
};

export { handleSOE, handleJson, handleVoltage };


async function handleSOE(env) {
    try {
        console.log('handleSOE')
        const systemStatus = await getSystemStatusSOE(env);
        const currentUsage = await getCurrentUsage(env);
        const totalCapacityKWh = 4 * 13; // 4 Powerwalls, each with 13 kWh capacity
        const remainingEnergyKWh = (systemStatus.percentage / 100) * totalCapacityKWh;
        let remainingHours;
        if (currentUsage < 0) {
            remainingHours = "Must be sunny, generating more power than you're using";
        } else {
            remainingHours = remainingEnergyKWh / (currentUsage / 1000); // currentUsage is in watts, convert to kW
        }

        // Fix for -0 issue
        const formattedCurrentUsage = (currentUsage / 1000).toFixed(2).replace('-0.00', '0.00');

        const gridStatus = await getGridStatus(env);
        const responseData = {
            ...systemStatus,
            currentUsage,
            remainingHours,
            gridStatus,
        };
        const htmlTemplate = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Powerwall Stats - No Longer Functional</title>
            <link href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css" rel="stylesheet">
        </head>
        <body class="bg-light">
            <div class="container mt-5">
                <h1 class="mb-4 text-center text-danger">Finca del Mar Battery Status</h1>
                <div class="alert alert-danger mx-auto" style="max-width: 600px;" role="alert">
                    <h4 class="alert-heading">Project No Longer Functional</h4>
                    <p>This Tesla Powerwall monitoring system is no longer operational.</p>
                    <hr>
                    <p class="mb-0"><strong>Reason:</strong> Tesla changed their authentication method and this code no longer works with the updated Tesla Gateway API.</p>
                </div>
                <div class="card mt-3 mx-auto" style="max-width: 600px;">
                    <div class="card-body">
                        <h5 class="card-title">About This Project</h5>
                        <p class="card-text">This was a Cloudflare Worker that monitored Tesla Powerwall statistics by:</p>
                        <ul>
                            <li>Fetching data from the Tesla Gateway every 2 minutes via cron job</li>
                            <li>Storing power usage, battery status, and grid connectivity data</li>
                            <li>Displaying real-time statistics and voltage charts</li>
                        </ul>
                        <p class="card-text"><small class="text-muted">The repository is kept for posterity and reference.</small></p>
                    </div>
                </div>
                <div class="card mt-3 mx-auto" style="max-width: 600px; font-size: 0.9rem; background-color: #e2e3e5;">
                    <div class="card-body text-secondary">
                        <h6 class="card-title">Previous Functionality</h6>
                        <p class="card-text">This system previously tracked:</p>
                        <ul class="small">
                            <li><strong>Battery Status:</strong> State of Energy (SOE), current usage, estimated remaining hours</li>
                            <li><strong>Grid Status:</strong> Connection state, transitions, and fault detection</li>
                            <li><strong>Voltage Monitoring:</strong> L1-N and L2-N voltage readings over time</li>
                            <li><strong>Historical Data:</strong> Stored in Cloudflare KV with Puerto Rico timezone timestamps</li>
                        </ul>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;
        return new Response(htmlTemplate, {
            status: 200,
            headers: {
                'Content-Type': 'text/html'
            }
        });
    } catch (error) {
        console.error('Error fetching system status:', error);
        return new Response('Failed to fetch grid status', { status: 500 });
    }
}


async function handleVoltage(env) {
    const handleFetchStartTime = Date.now();
    console.log('handleFetch started');
    const fetchKeysStartTime = Date.now();
    console.log('Fetch keys from the previous hour started');
    const voltage = env.voltage;
    if (!voltage) {
        return new Response('KV storage is not properly initialized.', { status: 500 });
    }

    const currentDate = new Date();
    const currentHourISO = getUTCToPuertoRicoISODate(currentDate).slice(0, 13); // Get the current date and hour in ISO format
    const previousHourDate = new Date(currentDate.getTime() - 60 * 60 * 1000);
    const previousHourISO = getUTCToPuertoRicoISODate(previousHourDate).slice(0, 13); // Get the previous date and hour in ISO format

    console.log(`current hour prefix: ${currentHourISO} ${currentDate}`);
    console.log(`previous hour prefix: ${previousHourISO} ${previousHourDate}`);

    const currentHourKeys = await voltage.list({ prefix: currentHourISO });
    const previousHourKeys = await voltage.list({ prefix: previousHourISO });

    const allKeys = [...(previousHourKeys.keys || []), ...(currentHourKeys.keys || [])];

    const oneHourAgo = new Date(currentDate.getTime() - 60 * 60 * 1000);

    const filteredKeys = allKeys.filter(key => {
        const keyDate = new Date(key.name);
        return keyDate >= oneHourAgo;
    });

    const fetchKeysEndTime = Date.now();
    console.log(`Fetch keys from the current and previous hour took ${fetchKeysEndTime - fetchKeysStartTime} ms`);

    if (filteredKeys.length === 0) {
        return new Response('No keys found in KV storage.', { status: 404 });
    }

    const allKeysValues = {};
    await Promise.all(filteredKeys.map(async (key) => {
        const value = await voltage.get(key.name);
        const parsedValue = JSON.parse(value);
        if (parsedValue) {
            allKeysValues[key.name] = {
                v_l1n: parsedValue.v_l1n,
                v_l2n: parsedValue.v_l2n
            };
        } else {
            console.warn(`Parsed value for key ${key.name} is null`);
        }
    }));

    const generateHTMLStartTime = Date.now();
    console.log('Generate HTML template started');
    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Voltage Chart</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    </head>
    <body>
        <canvas id="voltageChart" width="400" height="200"></canvas>
        <script>
            const ctx = document.getElementById('voltageChart').getContext('2d');
            const voltageData = ${JSON.stringify(allKeysValues)};
            const keys = Object.keys(voltageData);
            const labels = keys.map(key => key.slice(0, 16)); // Extract year, month, day, hour, and minute
            const v_l1nData = keys.map(key => voltageData[key].v_l1n);
            const v_l2nData = keys.map(key => voltageData[key].v_l2n);

            new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Voltage L1-N',
                            data: v_l1nData,
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 1,
                            fill: false
                        },
                        {
                            label: 'Voltage L2-N',
                            data: v_l2nData,
                            borderColor: 'rgba(153, 102, 255, 1)',
                            borderWidth: 1,
                            fill: false
                        }
                    ]
                },
                options: {
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: 'Time'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Voltage (V)'
                            }
                        }
                    }
                }
            });
        </script>
    </body>
    </html>
    `;
    const generateHTMLEndTime = Date.now();
    console.log(`Generate HTML template took ${generateHTMLEndTime - generateHTMLStartTime} ms`);
    const handleFetchEndTime = Date.now();
    console.log(`handleFetch total time took ${handleFetchEndTime - handleFetchStartTime} ms`);
    console.log('Generate HTML template ended');
    return new Response(htmlTemplate, { status: 200, headers: { 'Content-Type': 'text/html' } });
}

async function handleJson(env) {
    const voltage = env.voltage;
    if (!voltage) {
        return new Response('KV storage is not properly initialized.', { status: 500 });
    }

    const currentDate = new Date();
    const currentHourISO = getUTCToPuertoRicoISODate(currentDate).slice(0, 13); // Get the current date and hour in ISO format
    let allKeys = [];
    const currentHourKeys = await voltage.list({ prefix: currentHourISO });
    allKeys = currentHourKeys.keys || [];

    if (allKeys.length === 0) {
        const previousHourDate = new Date(currentDate.getTime() - 60 * 60 * 1000);
        const previousHourISO = getUTCToPuertoRicoISODate(previousHourDate).slice(0, 13);
        const previousHourKeys = await voltage.list({ prefix: previousHourISO });
        allKeys = previousHourKeys.keys || [];

        if (allKeys.length === 0) {
            return new Response('No keys found in KV storage.', { status: 404 });
        }
    }

    // Remove the token and system_status_soe keys if they exist
    allKeys = allKeys.filter(key => key.name !== 'token' && key.name !== 'system_status_soe');

    // Sort the keys by timestamp in descending order
    allKeys.sort((a, b) => new Date(b.name) - new Date(a.name));

    // Get the last 5 keys
    const lastFiveKeys = allKeys.slice(0, 5);

    const allKeysValues = {};
    await Promise.all(lastFiveKeys.map(async (key) => {
        const value = await voltage.get(key.name);
        const parsedValue = JSON.parse(value);
        if (parsedValue) {
            allKeysValues[key.name] = parsedValue;
        } else {
            console.warn(`Parsed value for key ${key.name} is null`);
        }
    }));

    const htmlTemplate = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Voltage Data</title>
    </head>
    <body>
        <h1>Voltage Data</h1>
        <p>Here are the last five results returned from the TEG /api/meters/site. </p>
        <ul>
            ${Object.entries(allKeysValues).map(([key, value]) => `
                <li>
                    <strong>${key}</strong>: <pre>${JSON.stringify(value, null, 2)}</pre>
                </li>
            `).join('')}
        </ul>
    </body>
    </html>
    `;
    return new Response(htmlTemplate, {
        status: 200,
        headers: {
            'Content-Type': 'text/html'
        }
    });
}



