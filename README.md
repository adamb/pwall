# Powerwall Stats and Website

This repository contains two main components:

1. **Cron Worker**: A scheduled worker that grabs statistics from the Powerwall.
2. **Website**: A website that displays the collected statistics.

## Todo

1. Add some kind of tests.  Use some of the historical data for testing.  I have stats from during the outage, so can use those.  Aug 14 - 18 2024 should work.  on grid to off grid.  
2. add grid on/off status
3. Add alerts or notifications PWA style or SMS/email maybe
4. pwall.dev.pr/json showing data from June 2024?? (check logs?, check cloud)


## Cron Worker

The cron worker is responsible for periodically fetching data from the Powerwall and storing it. This is done using Cloudflare Workers and KV storage.

### How to Run the Cron Worker

1. **Development**: 
   - Run `wrangler dev --test-scheduled --log-level info` in your terminal to start a development server.  This will say that it doesn't support cron triggers.  So you have to trigger it manually with curl.
   - In another terminal run `curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"`
   - Check the console for logs.
   - Note the KV store for dev is not the kv store for production
   - You can then open a browser from the wranger window and see the page



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
