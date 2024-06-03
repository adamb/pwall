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

function getFormattedDate() {
	const date = new Date();
	
	const pad = (number, length) => {
	  let str = String(number);
	  while (str.length < length) {
		str = '0' + str;
	  }
	  return str;
	};
	
	const year = date.getFullYear();
	const month = pad(date.getMonth() + 1, 2);
	const day = pad(date.getDate(), 2);
	const hours = pad(date.getHours(), 2);
	const minutes = pad(date.getMinutes(), 2);
	
	const timezoneOffset = -date.getTimezoneOffset();
	const absOffset = Math.abs(timezoneOffset);
	const offsetHours = pad(Math.floor(absOffset / 60), 2);
	const offsetMinutes = pad(absOffset % 60, 2);
	const offsetSign = timezoneOffset >= 0 ? '+' : '-';
	
	return `${year}-${month}-${day}T${hours}:${minutes}${offsetSign}${offsetHours}:${offsetMinutes}`;
  }


async function handleFetch(request,env) {
    const voltage = env.voltage;
    if (!voltage) {
        return new Response('KV storage is not properly initialized.', { status: 500 });
    }

    const currentDate = getFormattedDate();
    const currentHourPrefix = currentDate.slice(0, 15); // Get the current date and hour in ISO format
    console.log(`current hour prefix:  ${currentHourPrefix} ${currentDate}`)
	const listResult = await voltage.list({ prefix: currentHourPrefix });
    if (!listResult || !listResult.keys || listResult.keys.length === 0) {
        return new Response('No keys found in KV storage.', { status: 404 });
    }

    let allKeysValues = { keys: [] };
    for (const key of listResult.keys) {
        allKeysValues.keys.push(key.name);
        const value = await voltage.get(key.name);
        allKeysValues[key.name] = JSON.parse(value);
    }

    const prettyPrintedValues = JSON.stringify(allKeysValues, null, 2);
    return new Response(prettyPrintedValues, { status: 200, headers: { 'Content-Type': 'application/json' } });
}



