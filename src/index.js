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
	async fetch(request) {
		return handleFetch(request);
	},
};

async function handleFetch(request) {
    const clientIp = request.headers.get('CF-Connecting-IP');
    const userAgent = request.headers.get('User-Agent');
    console.log(`Incoming request from IP: ${clientIp}, User-Agent: ${userAgent}`);
    console.log('Request details:', {
        method: request.method,
        url: request.url,
        headers: [...request.headers.entries()],
    });
    return new Response('Request logged', { status: 200 });
}



