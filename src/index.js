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

import main from './pwall';
import htmlContent from './staticHtml.js';

export default {
	async scheduled(controller, env, ctx) {
		ctx.waitUntil(main(env));
	},
	async fetch(request, env) {
		return handleFetch(request, env);
	},
};

import { getUTCToPuertoRicoISODate } from './utils';

import { getSystemStatusSOE } from './pwall';

async function handleSOE(env) {
    try {
        const systemStatus = await getSystemStatusSOE(env);
        return new Response(JSON.stringify(systemStatus), {
            status: 200,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    } catch (error) {
        console.error('Error fetching system status:', error);
        return new Response('Failed to fetch system status', { status: 500 });
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

    let allKeys = [];
    let cursor = null;

    do {
        const response = await voltage.list({ cursor });
        allKeys = allKeys.concat(response.keys);
        cursor = response.cursor;
    } while (cursor);

    if (allKeys.length === 0) {
        return new Response('No keys found in KV storage.', { status: 404 });
    }

    const allKeysValues = {};
    let getCalls = 0;
    let getCallsResults = [];
    const batchPromises = async (items, batchSize, fn) => {
        const results = [];
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize).map(fn);
            results.push(...await Promise.all(batch));
        }
        return results;
    };

    try {
        getCallsResults = await batchPromises(allKeys, 6, async (key) => {
            const value = await voltage.get(key.name);
            const parsedValue = JSON.parse(value);
            if (parsedValue) {
                allKeysValues[key.name] = parsedValue;
                return 1;
            } else {
                console.warn(`Parsed value for key ${key.name} is null`);
                return 0;
            }
        });

        getCalls = getCallsResults.reduce((acc, curr) => acc + curr, 0);

        const jsonContent = JSON.stringify({ data: allKeysValues }, null, 2);
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
            <p>Total get calls: ${getCalls}</p>
            <a href="data:text/json;charset=utf-8,${encodeURIComponent(jsonContent)}" download="voltage_data.json">Download JSON</a>
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
        console.error(`Error during get calls: ${error}`);
        getCalls = getCallsResults.reduce((acc, curr) => acc + curr, 0);
        const errorHtmlTemplate = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Error</title>
        </head>
        <body>
            <h1>Error fetching data from KV storage</h1>
            <p>Total get calls: ${getCalls}</p>
            <pre>${JSON.stringify({ error: 'Error fetching data from KV storage.', getCalls }, null, 2)}</pre>
        </body>
        </html>
        `;
        return new Response(errorHtmlTemplate, { status: 500 });
    }
}

async function handleFetch(request, env) {
    const url = new URL(request.url);
    const voltage = env.voltage;

    if (url.pathname === '/voltage24') {
        const handleFetchStartTime = Date.now();
        console.log('handleFetch started');
        const fetchKeysStartTime = Date.now();
        console.log('Fetch current and previous day keys started');
        if (!voltage) {
            return new Response('KV storage is not properly initialized.', { status: 500 });
        }

        const currentDate = new Date();
        const currentDateISO = getUTCToPuertoRicoISODate(currentDate);
        const currentDayPrefix = currentDateISO.slice(0, 10); // Get the current date in ISO format

        const previousDayDate = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
        const previousDayISO = getUTCToPuertoRicoISODate(previousDayDate);
        const previousDayPrefix = previousDayISO.slice(0, 10);

        console.log(`current day prefix: ${currentDayPrefix} ${currentDate}`);
        console.log(`previous day prefix: ${previousDayPrefix} ${previousDayDate.toISOString()}`);

        const currentDayKeys = await voltage.list({ prefix: currentDayPrefix });
        const previousDayKeys = await voltage.list({ prefix: previousDayPrefix });

        const allKeysValues = {};
        const fetchKeysEndTime = Date.now();
        console.log(`Fetch current and previous day keys took ${fetchKeysEndTime - fetchKeysStartTime} ms`);

        if ((!currentDayKeys || !currentDayKeys.keys || currentDayKeys.keys.length === 0) &&
            (!previousDayKeys || !previousDayKeys.keys || previousDayKeys.keys.length === 0)) {
            return new Response('No keys found in KV storage.', { status: 404 });
        }

        const oneDayAgo = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
        const oneDayAgoISO = getUTCToPuertoRicoISODate(oneDayAgo);

        const filteredPreviousDayKeys = (previousDayKeys.keys || []).filter(key => {
            const keyDate = new Date(key.name);
            return keyDate >= oneDayAgo;
        });

        const allKeys = [...filteredPreviousDayKeys, ...(currentDayKeys.keys || [])];

        console.log(`Total keys to process: ${allKeys.length}`);

        const processKeysStartTime = Date.now();
        console.log('Process all keys started');
        await Promise.all(allKeys.map(async (key) => {
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

        const processKeysEndTime = Date.now();
        console.log(`Process all keys took ${processKeysEndTime - processKeysStartTime} ms`);

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
                const labels = keys.map(key => key.slice(0, 13)); // Extract year, month, day, and hour
                const v_l1nData = keys.map(key => voltageData[key].v_l1n);
                const v_l2nData = keys.map(key => voltageData[key].v_l2n);
                

                const average = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
                const v_l1nAverage = average(v_l1nData);
                const v_l2nAverage = average(v_l2nData);

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
                            },
                            {
                                label: 'Average Voltage L1-N',
                                data: Array(labels.length).fill(v_l1nAverage),
                                borderColor: 'rgba(75, 192, 192, 0.5)',
                                borderWidth: 1,
                                borderDash: [5, 5],
                                fill: false
                            },
                            {
                                label: 'Average Voltage L2-N',
                                data: Array(labels.length).fill(v_l2nAverage),
                                borderColor: 'rgba(153, 102, 255, 0.5)',
                                borderWidth: 1,
                                borderDash: [5, 5],
                                fill: false
                        }]
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
    } else if (url.pathname === '/voltage') {
        return handleVoltage(env);
    } else if (url.pathname === '/json') {
        return handleJson(env)
    } else if (url.pathname === '/battery') {
        return handleSOE(env)
    } else if (url.pathname === '/') {
        return new Response(htmlContent, { status: 200, headers: { 'Content-Type': 'text/html' } });
    }
}



