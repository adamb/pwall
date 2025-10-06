# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Tesla Powerwall monitoring system built as a Cloudflare Worker. **Note: The Tesla authentication method has changed and this code is no longer functional.** The repository is kept for posterity.

The system consists of:
1. **Cron Worker**: Scheduled job that fetches Powerwall statistics every 2 minutes
2. **Website**: Displays collected statistics via web interface

## Development Commands

### Cloudflare Workers Development
- **Development server**: `wrangler dev --test-scheduled --log-level info`
- **Trigger scheduled event manually**: `curl "http://localhost:8787/__scheduled?cron=*+*+*+*+*"`
- **Deploy to production**: `wrangler deploy`
- **Update global wrangler**: `npm install -g wrangler`

### Testing
- **Run tests**: `npm test` (uses Jest)
- **Individual test file**: `npx jest src/index.test.js`

## Architecture

### Core Components
- `src/index.js`: Main Cloudflare Worker entry point with scheduled and fetch handlers
- `src/pwall.js`: Tesla Powerwall API client with authentication and data fetching
- `src/handleFetch.js`: HTTP request routing and response handling
- `src/utils.js`: Date/time utilities for Puerto Rico timezone conversion
- `src/staticHtml.js`: Static HTML content

### Data Storage (Cloudflare KV)
- **KV Store**: "voltage" namespace stores timestamped power data
- **Key format**: ISO timestamps in Puerto Rico timezone (e.g., `2024-08-23T04:00:56.249100391-04:00`)
- **Special keys**:
  - `system_status_soe`: Most recent battery level
  - `gridStatus:current`: Most recent grid status
  - `gridStatus:{timestamp}`: Historical grid status (UTC timestamps)
  - `token`: Cached authentication token

### API Endpoints
- `/`: Main battery status dashboard
- `/voltage`: Voltage chart for last hour
- `/voltage24`: Voltage chart for last 24 hours  
- `/json`: JSON data view (last 5 readings)

### Authentication
Uses Cloudflare Access with client ID/secret headers to reach Tesla Gateway at `teg.dev.pr`. Token caching prevents excessive login requests.

## Configuration

Environment variables required:
- `TESLA_PASSWORD`: Tesla Gateway password
- `EMAIL`: Account email
- `CF_ACCESS_CLIENT_ID`: Cloudflare Access client ID
- `CF_ACCESS_CLIENT_SECRET`: Cloudflare Access client secret

KV namespace binding: `voltage` (dev uses preview_id for testing)

## Development Notes

- Cron trigger is commented out in `wrangler.toml` (runs every 2 minutes when enabled)
- Dev and production use separate KV namespaces
- All timestamps use Puerto Rico timezone for data storage
- Grid status and voltage data are the primary metrics collected