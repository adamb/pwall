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

async function handleFetch(request,env) {
    const voltage = env.voltage;
    if (!voltage) {
        return new Response('KV storage is not properly initialized.', { status: 500 });
    }

    const keys = await voltage.list();
    if (!Array.isArray(keys) || keys.length === 0) {
        return new Response('No keys found in KV storage.', { status: 404 });
    }

    const mostRecentKey = keys.sort().pop();
    const mostRecentValue = await voltage.get(mostRecentKey);

    if (!mostRecentValue) {
        return new Response('No value found for the most recent key.', { status: 404 });
    }

    const prettyPrintedValue = JSON.stringify(JSON.parse(mostRecentValue), null, 2);
    return new Response(prettyPrintedValue, { status: 200, headers: { 'Content-Type': 'application/json' } });
}



