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

export default {
	async scheduled(controller, env, ctx) {
		ctx.waitUntil(main(env));
	},
	async fetch(request, env) {
		return handleFetch(request, env);
	},
};

function getUTCToPuertoRicoISODate() {
const date = new Date();

// Get the UTC time
const year = date.getUTCFullYear();
const month = String(date.getUTCMonth() + 1).padStart(2, '0');
const day = String(date.getUTCDate()).padStart(2, '0');
const hours = String(date.getUTCHours()).padStart(2, '0');
const minutes = String(date.getUTCMinutes()).padStart(2, '0');
const seconds = String(date.getUTCSeconds()).padStart(2, '0');
	const milliseconds = String(date.getUTCMilliseconds()).padStart(3, '0');

	// Puerto Rico is UTC-4
	const puertoRicoOffset = -4;
	const puertoRicoOffsetInMs = puertoRicoOffset * 60 * 60 * 1000;

	// Convert the UTC time to Puerto Rico time
	const puertoRicoTime = new Date(date.getTime() + puertoRicoOffsetInMs);

	// Get the Puerto Rico time components
	const prYear = puertoRicoTime.getUTCFullYear();
	const prMonth = String(puertoRicoTime.getUTCMonth() + 1).padStart(2, '0');
	const prDay = String(puertoRicoTime.getUTCDate()).padStart(2, '0');
	const prHours = String(puertoRicoTime.getUTCHours()).padStart(2, '0');
	const prMinutes = String(puertoRicoTime.getUTCMinutes()).padStart(2, '0');
	const prSeconds = String(puertoRicoTime.getUTCSeconds()).padStart(2, '0');
	const prMilliseconds = String(puertoRicoTime.getUTCMilliseconds()).padStart(3, '0');

	// Construct the ISO 8601 string with Puerto Rico offset
	const isoDate = `${prYear}-${prMonth}-${prDay}T${prHours}:${prMinutes}:${prSeconds}.${prMilliseconds}-04:00`;

	return isoDate;
}


async function handleFetch(request,env) {
    const voltage = env.voltage;
    if (!voltage) {
        return new Response('KV storage is not properly initialized.', { status: 500 });
    }

    const currentDate = getUTCToPuertoRicoISODate();
    const currentHourPrefix = currentDate.slice(0, 13); // Get the current date and hour in ISO format
    console.log(`current hour prefix:  ${currentHourPrefix} ${currentDate}`)
	const listResult = await voltage.list({ prefix: currentHourPrefix });
    if (!listResult || !listResult.keys || listResult.keys.length === 0) {
        return new Response('No keys found in KV storage.', { status: 404 });
    }

    let allKeysValues = { };
    for (const key of listResult.keys) {
        const value = await voltage.get(key.name);
        const parsedValue = JSON.parse(value);
        allKeysValues[key.name] = {
            v_l1n: parsedValue.v_l1n,
            v_l2n: parsedValue.v_l2n
        };
        console.log(`v_l1n: ${parsedValue.v_l1n} V`);
    }

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
            //const labels = Object.keys(voltageData);
			const labels = Object.keys(voltageData).map(key => key.slice(11, 16)); // Extract hour and minutes
            const v_l1nData = labels.map(key => voltageData[key].v_l1n);
            const v_l2nData = labels.map(key => voltageData[key].v_l2n);
			

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
    return new Response(htmlTemplate, { status: 200, headers: { 'Content-Type': 'text/html' } });
}



