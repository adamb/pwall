# Powerwall Stats and Website

This repository contains two main components:

1. **Cron Worker**: A scheduled worker that grabs statistics from the Powerwall.
2. **Website**: A website that displays the collected statistics.

## Cron Worker

The cron worker is responsible for periodically fetching data from the Powerwall and storing it. This is done using Cloudflare Workers and KV storage.

### How to Run the Cron Worker

1. **Development**: 
   - Run `wrangler dev --local` in your terminal to start a development server.
   - Trigger the scheduled event with `curl "http://localhost:8787/cdn-cgi/mf/scheduled"`.
   - Check the console for logs.

2. **Production**:
   - Update the Cron trigger in `wrangler.toml` (see [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/wrangler/configuration/#triggers)).
   - Run `wrangler publish --name my-worker` to publish your worker.

## Website

The website displays the statistics collected by the cron worker. It provides a user-friendly interface to view the current usage, state of energy, and other relevant data.

### How to Access the Website

- The website is served by the same Cloudflare Worker that handles the cron jobs. Simply navigate to the worker's URL to view the stats.

## File Structure

- `src/`: Contains the source code for the worker and website.
  - `index.js`: Entry point for the Cloudflare Worker.
  - `pwall.js`: Contains functions for interacting with the Powerwall API.
  - `handleFetch.js`: Handles fetch requests.
  - `utils.js`: Utility functions.
- `dist/`: Contains built output assets.
- `wrangler.toml`: Configuration file for Cloudflare Workers.

## License

This project is licensed under the MIT License.
