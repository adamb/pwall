# Powerwall Stats and Website

This repository contains two main components:

1. **Cron Worker**: A scheduled worker that grabs statistics from the Powerwall.
2. **Website**: A website that displays the collected statistics.

## Todo

1. Add some kind of tests.  Use some of the historical data for testing.  I have stats from during the outage, so can use those.  Aug 14 - 18 2024 should work.  on grid to off grid.  
2. Show grid downtime
3. Add alerts or notifications PWA style or SMS/email maybe


## Cron Worker

The cron worker is responsible for periodically fetching data from the Powerwall and storing it. This is done using Cloudflare Workers and KV storage.

### How to Run the Cron Worker

0. **Make sure wrangler is up to do date**:
   - % npm install -g wrangler

1. **Development**: 
   - Run `wrangler dev --test-scheduled --log-level info` in your terminal to start a development server.  This will say that it doesn't support cron triggers.  So you have to trigger it manually with curl.
   - In another terminal run `curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"`
   - Check the console for logs.
   - Note the KV store for dev is not the kv store for production
   - You can then open a browser from the wranger window and see the page



2. **Production**:
   - Update the Cron trigger in `wrangler.toml` (see [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/wrangler/configuration/#triggers)).
   - Run `wrangler deploy` to publish your worker.

## Website

The website displays the statistics collected by the cron worker. It provides a user-friendly interface to view the current usage, state of energy, and other relevant data.

### How to Access the Website

- The website is served by the same Cloudflare Worker that handles the cron jobs. Simply navigate to the worker's URL to view the stats.

## File Structure

- `src/`: Contains the source code for the worker and website.
  - `index.js`: Entry point for the Cloudflare Worker.
  - `pwall.js`: Contains functions for interacting with the Powerwall API.
    - main() is called every 2 minutes as a cron job
  - `handleFetch.js`: Handles fetch requests.
  - `utils.js`: Utility functions.
- `dist/`: Contains built output assets.
- `wrangler.toml`: Configuration file for Cloudflare Workers.

## KV Store

There is a kv store called Voltage.  It has keys that are the current timestamp in Puerto Rico.

Like this:
Key:
```json
2024-08-23T04:00:56.249100391-04:00
```

Value:
```json
{"last_communication_time":"2024-08-23T04:00:56.37401349-04:00","instant_power":2996.5771484375,"instant_reactive_power":-2734.77197265625,"instant_apparent_power":4056.9018165299462,"frequency":60.178279876708984,"energy_exported":18130173.742195815,"energy_imported":67184214.25052916,"instant_average_voltage":124.6713752746582,"instant_average_current":0,"i_a_current":0,"i_b_current":0,"i_c_current":0,"last_phase_voltage_communication_time":"2024-08-23T04:00:56.249100391-04:00","v_l1n":124.57781982421875,"v_l2n":124.73319244384766,"last_phase_power_communication_time":"2024-08-23T04:00:56.37401349-04:00","real_power_a":1474.3201904296875,"real_power_b":1522.2569580078125,"reactive_power_a":-1342.1256103515625,"reactive_power_b":-1392.6463623046875,"last_phase_energy_communication_time":"2024-08-23T03:57:40.917000113-04:00","energy_exported_a":9307998.705833333,"energy_exported_b":9626203.48888889,"energy_imported_a":33645897.54416667,"energy_imported_b":34342090.52944444,"serial_number":"OBB3545100913","version":"67994(1.4.6-Tesla)","timeout":1500000000,"instant_total_current":0}
```

There is also a single key called `system_status_soe` that just holds the most recent battery level.

and I'm adding a key for gridStatus. It will be `gridStatus:current` for the most recent reading.  Then gridStatus:timestamp where the timestamp is the time at the reading.  These will be in UTC since the timestamps don't come from the TEG.




## License

This project is licensed under the MIT License.
