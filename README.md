# Catena Risk

A pilot application that turns Catena's normalized telematics data into four insurance-shaped workflows for a commercial-auto carrier:

1. **New-business underwriting** — pull a fleet's dossier, compute a risk score from live behavior, recommend a quoting action.
2. **In-force portfolio monitoring** — track fleet growth, risk distribution, top-risk drivers, and deterioration alerts across the book.
3. **Dispatch board** — real-time HOS status, live GPS, near-limit warnings, and a safety-event feed for fleet ops.
4. **Claims defense packet** — reconstruct an incident from Catena telematics, fuse external weather/road/carrier data, and export a chain-of-custody PDF for litigation.

The app is a single Next.js 14 project using server actions (no separate API service).

---

## Build & Run

### Prerequisites
- Node.js `>= 18.17`
- A working C toolchain for `better-sqlite3` (macOS: Xcode CLT; Linux: `build-essential` + `python3`)

### Setup

```bash
npm install
```

`postinstall` runs [scripts/apply-next-semver-patch.mjs](scripts/apply-next-semver-patch.mjs), which patches a Next 14 semver resolution issue on newer Node versions. This is expected.

### Environment

Create `.env.local` in the project root. The credentials below are the ones used during development against the Catena sandbox and are included with the submission; swap in your own at any time:

```bash
CATENA_BASE_URL=https://api.catenatelematics.com
CATENA_AUTH_BASE_URL=https://auth.catenatelematics.com/realms/catena
CATENA_CLIENT_ID=<client id>
CATENA_CLIENT_SECRET=<client secret>

# Optional
# CATENA_ACCESS_TOKEN=<bearer>    # skip OAuth exchange (short-lived)
# CATENA_PARTNER_SLUG=<slug>      # used on POST /v2/orgs/invitations
# CATENA_DEBUG=1                  # verbose request/response logging
```

Auth precedence: `CATENA_ACCESS_TOKEN` (if set) → OAuth2 client-credentials exchange against `CATENA_AUTH_BASE_URL`. Tokens are cached in-process and auto-refreshed.

### Run

```bash
npm run dev        # http://localhost:3000
npm run build
npm run start
npm run lint
npm run test       # vitest — 18 unit tests across scoring, derived metrics, and 429-retry behavior
```

### Demo seed data

Submissions and claims persist to SQLite at `data/submissions.db`. A pre-seeded DB ships with the repo so the portfolio, dispatch, and claims pages have content on first load. To rebuild from scratch:

```bash
npm run seed:fixtures   # snapshot hero fleets for peer benchmarks
npm run seed:claims     # seed demo claims
npm run seed:real       # build one real claim packet end-to-end
```

Utility scripts (not required to run the app):

```bash
npm run explore:api                       # one-off endpoint probes
npm run inspect:fleet                     # dump a fleet's raw telematics tables
npm run score:fleet                       # run the risk scorer against a fleet id
npm run rehearse                          # walk the full demo path
npx tsx scripts/validate-claim-fields.ts  # live field-by-field provenance proof
```

---

## User guide — one section per service

### Dashboard (`/`)

**What it is.** The landing page. A live KPI strip (insured fleets, active vehicles, active drivers, data-sync freshness) pulled from `getAnalyticsOverview` + `listConnections`, a portfolio table of all scored fleets, and a pipeline column of recent submissions.

**How you use it.** Open it to get oriented: KPIs answer "how healthy is my book today," the portfolio table is the door into any underwriting report, and the pipeline shows what's in flight. Hero CTAs link to the four services.

### Submission (`/underwriting/new` → `/underwriting/[id]`)

**What it is.** A three-step wizard that captures a prospect's identifiers, runs the consent flow against `/v2/orgs/invitations` and `/v2/orgs/share_agreements`, then performs a 14-endpoint parallel dossier pull and computes a six-factor risk score. The resulting report page shows a composite 0–100 score with tier badge (Preferred / Standard / Substandard / Decline), six sub-score cards (speeding, hard braking, harsh cornering, night exposure, HOS compliance, vehicle maintenance), peer benchmarks, driver roster, fleet map, recommended action (quote / surcharge / refer / decline + rationale), and a PDF export.

**How you use it.** Pick a fleet, fill out prospect fields, run consent. If the sandbox rejects the invitation or share agreement the wizard **stops** and shows the real HTTP error — you must pick Retry or Continue in demo mode; there's no silent auto-advance. Step 3 streams per-endpoint latency live as the dossier is built. On the report page, expand any sub-score for raw rates and peer percentiles, open the API trace dialog to see every Catena call with its latency, and export the PDF for the carrier's file. A "Partial telematics data" banner appears if any score-critical endpoint returned an error — with the exact endpoint label and error message. A "Simulated consent" banner appears with the HTTP status detail if the submission was created in demo mode.

**Value.** New-business onboarding compressed from days to under a minute. The data-gap and simulated-consent banners make the honest answer to "what happened when the API failed?" visible to the underwriter rather than silently fudging the score.

### Portfolio (`/portfolio` → `/portfolio/fleets/[id]` → `/portfolio/drivers/[id]`)

**What it is.** A book-of-business dashboard with KPI band (fleets, vehicles, drivers, avg risk score), a **projected loss-cost tile** that sizes the $ impact of deteriorating fleets using documented assumptions, a risk-tier distribution histogram, 30-day fleet/driver growth charts from `getFleetGrowthTimeSeries` and `getDriverGrowthTimeSeries`, a top-risk drivers card, a safety-event type breakdown, the fleet risk register table, and a deterioration alerts panel (fleets whose score dropped more than 10 points vs. their prior snapshot). The fleet drill-in adds five fleet-level KPIs, a duty-status mix from `listHosAvailabilities`, and a recent-events feed. The driver drill-in shows individual safety-event history and HOS violations.

**How you use it.** Portfolio manager opens it daily: the projected-loss tile and deterioration list point you at which fleets to call this week. Click a fleet to see its internal composition; click a driver to see an individual history for coaching or litigation prep. Use the "Launch underwriting" link on a fleet drill-in to re-score for renewal.

**Value.** Proactive loss control. The dollar-number tile + deterioration alerts turn the renewal conversation from "why did this account's loss ratio spike?" to "your score dropped 14 points — let's do a site visit."

### Dispatch (`/dispatch` → `/dispatch/[driverId]`)

**What it is.** A live driver board: six KPI tiles (total / driving / on-duty / off-duty / near-limit / in-violation), a driver table sorted near-limit-first with drive/cycle/shift remaining hours, a 24-hour safety-event feed, and an active-violations card. All eight Catena calls fan out in parallel via [src/app/actions/dispatch.ts](src/app/actions/dispatch.ts) — no mocks, no silent fallbacks. The driver-detail page adds live GPS on a Leaflet map, vehicle year/make/model/VIN/odometer, live speed, OSM road classification + posted speed limit, NOAA weather, an HOS duty-status timeline of the last 15 ELD events, a DVIR inspection history, and a safety-event history. At the bottom of the driver page, a **"Simulate incident"** card deep-links into `/claims/new` pre-filled with the current driver and vehicle context.

**How you use it.** A dispatcher watches the board during shift hours. Near-limit rows bubble to the top; click through to the driver detail to check whether a fresh driver can be swapped in, or to review HOS + DVIR + weather before greenlighting a run. When something happens, one click on "Simulate incident" captures the live state into a claim — closing the loop between ops and claims counsel.

**Value.** Regulatory exposure reduction (live HOS compliance) and real-time behavior coaching. Catena's cross-TSP normalization is what makes the "single pane of glass" viable without per-ELD integration work.

### Claim (`/claims` → `/claims/new` → `/claims/[claimId]`)

**What it is.** A claims table with data-completeness badges (COMPLETE / PARTIAL / SYNTHETIC_FALLBACK), a claim-intake form, and a defense packet page. The packet shows the incident header with completeness + provenance, a KPI band (speed at impact, posted limit, safety events in the 30-min window, HOS compliance), a **speed timeline chart** with posted-limit reference line, impact marker, and safety-event markers (speeding events plot as a dot on the line; hard-brake / harsh-corner / FCW / distraction get a labeled vertical rule), an HOS snapshot at incident time, DVIR records, a Leaflet route map with the trip origin and waypoint trail, NOAA weather + OSM road context panels, an evidence manifest with SHA-256 hashes per snapshotted file for chain-of-custody, and a PDF export.

**How you use it.** Claims counsel types a claim number (or dispatch pre-fills from the driver-detail page). On submit, the app runs 10 parallel Catena calls + NOAA + OSM + FMCSA and assembles the full packet in seconds. Counsel reviews the speed timeline, HOS snapshot, and DVIR records to assess liability; exports the PDF for defense; points at the provenance panel to confirm every field is traceable. The completeness badge on the claims table tells you at a glance which files are ready for settlement or litigation vs. which have evidence gaps.

**Value.** Defense packets assembled in seconds, not the weeks it takes to subpoena ELD records from each TSP directly. The chain-of-custody manifest makes the packet legally defensible.

---

## Architecture

```
src/app/             Next.js routes + server actions (actions/*.ts)
src/components/      React components, grouped by feature area
src/lib/catena/      Catena API client, Zod schemas, portfolio/fleet/risk fetchers
src/lib/domain/      fleet-dossier composer, derived metrics, safety taxonomy
src/lib/risk/        Risk scoring (sub-scores, weights, peer benchmarks)
src/lib/claims/      Incident reconstruction, narrative, PDF rendering
src/lib/enrichment/  External data (NOAA weather, OSM roads, FMCSA carrier)
src/lib/db/          SQLite persistence (submissions, claims)
src/lib/cache/       Dossier cache (SQLite-backed)
src/lib/pdf/         @react-pdf/renderer templates
scripts/             Seeding & probe scripts (tsx)
tests/               Vitest
exploration/         Early API-discovery notes (not part of runtime)
```

### API client
[src/lib/catena/client.ts](src/lib/catena/client.ts) is the single integration point. It provides:
- OAuth2 client-credentials with auto-refresh and a single-flight refresh lock
- 401 → invalidate-and-retry-once; 429 → exponential backoff respecting `Retry-After` (tested in [tests/client-retry.test.ts](tests/client-retry.test.ts))
- Cursor pagination (`page()`) and time-windowed pagination (`timePaged()`, default 30 days)
- Per-method Zod validation (strict in dev, soft-fail + log in prod) via [src/lib/catena/schemas/](src/lib/catena/schemas/)

### Dossier fetch + data-gap tracking
[src/lib/domain/fleet-dossier.ts](src/lib/domain/fleet-dossier.ts) fans out parallel paginated reads for a single fleet. Each endpoint's outcome (ok / pages / items / error) is recorded in `meta.fetchStatus`. The **5 score-critical endpoints** (`listDriverSafetyEvents`, `listVehicleLocations`, `listHosViolations`, `listHosAvailabilities`, `listDvirLogs`) are marked `critical: true`: a first-page failure throws `DossierFetchError` rather than silently returning `[]` and producing a falsely-clean risk score. Partial failures surface as `dossier.dataGaps` and show up as an alert on the risk report.

### Risk scoring
[src/lib/risk/scoring.ts](src/lib/risk/scoring.ts) produces six sub-scores from the dossier, combines them with the weights in [src/lib/risk/weights.ts](src/lib/risk/weights.ts), and returns a composite score + tier. Peer benchmarks are computed in [src/lib/risk/peer-benchmarks.ts](src/lib/risk/peer-benchmarks.ts) against snapshots of hero fleets stored under [src/lib/fixtures/fleets/](src/lib/fixtures/fleets/).

### Claims packet
[src/lib/claims/fetch-scenario.ts](src/lib/claims/fetch-scenario.ts) pulls a ±6h window of telematics around an incident, enriches with NOAA weather, OSM Overpass road context, and FMCSA SAFER carrier data, then renders a PDF via [src/lib/claims/pdf.tsx](src/lib/claims/pdf.tsx). Every field is tagged with its source (`catena_api | catena_analytics | noaa | osm | fmcsa | synthetic`).

---

## Catena endpoints used

Across the four workflows the app calls ~24 distinct endpoints:

- `orgs`: `/v2/orgs/fleets`, `/v2/orgs/fleets/{id}`, `/v2/orgs/invitations`, `/v2/orgs/share_agreements` (GET + PATCH to activate)
- `telematics`: `/vehicles`, `/vehicle-locations`, `/analytics/vehicles/live-locations`, `/users`, `/driver-safety-events`, `/hos-events`, `/hos-violations`, `/hos-availabilities`, `/hos-daily-snapshots`, `/dvir-logs`, `/dvir-logs/{id}/defects`, `/engine-logs`
- `analytics`: `/overview`, `/fleets`, `/drivers`, and the `/time-series` variants of each
- `integrations`: `/connections` (data freshness)

To verify every claim-packet field actually resolves from a live Catena response, run:

```bash
npx tsx scripts/validate-claim-fields.ts
```

It hits 7 endpoints, prints the raw JSON of the first item of each, and then builds a real `IncidentPacket` showing `driverName`, `vehicleUnit`, `vehicleVin`, `incidentAt`, `incidentLat/Lng`, `safetyEventsInWindow`, `dvirRecords`, `hosSnapshot`, and `roadContext` with provenance tags.

---

## Dependencies beyond the Catena API

Runtime:
- **Next.js 14** + React 18 — framework, server actions, RSC
- **axios** — HTTP client
- **zod** — response validation
- **better-sqlite3** — local persistence
- **@tanstack/react-table** — tables
- **recharts** — charts
- **react-leaflet** + **leaflet** — maps (OSM tiles, no API key required)
- **@react-pdf/renderer** — server-side PDF generation
- **date-fns** — date math
- **shadcn / @base-ui/react / @radix-ui/\*** + **tailwindcss** + **lucide-react** — UI primitives and icons

Dev / tooling: **tsx**, **vitest**, **eslint-config-next**, **typescript**.

External APIs (all free / public, called from the claims enrichment layer):
- **NOAA Weather API** (`api.weather.gov`)
- **OpenStreetMap Overpass** (`overpass-api.de`) + **Nominatim** for reverse geocoding
- **FMCSA SAFER** for carrier safety ratings

The `GOOGLE_MAPS_API_KEY` referenced in one dispatch map component is optional — the app falls back to Leaflet/OSM if it is unset.

---

## Notes for reviewers

- **Sandbox + webhooks**: the sandbox fleet is hydrated outside EDA so webhook subscriptions don't fire. The app uses REST polling exclusively.
- **Hardcoded HOS event codes**: `/v2/telematics/ref-hos-event-codes` is wrapped in the client but inlined in the dispatch fetcher to save a roundtrip on every page load. In production this would be fetched once at boot and cached.
- **Score-critical endpoints fail loudly.** The 5 endpoints whose output feeds a risk sub-score throw `DossierFetchError` if their first page fails, rather than silently returning `[]`. Partial failures show as a **Partial telematics data** alert on the risk report naming each failed endpoint. Designed so a flaky sandbox can't fool an evaluator into thinking the app produces clean scores when half the data is missing.
- **Consent step is blocking.** If `POST /v2/orgs/invitations` or `PATCH /v2/orgs/share_agreements` fails, the wizard stops and shows the real HTTP error. The user must explicitly click **Retry** or **Continue in demo mode**; any submission created after the latter carries a prominent `Simulated consent` alert on the report that includes the HTTP status detail.
- **Speed chart fallback (claims)** is deliberately kept as a proof-of-concept. When the Catena sandbox reports sub-2-mph speeds for the chosen vehicle (common for simulator fleets), [buildDemoSpeedTimeline](src/lib/claims/fetch-scenario.ts) fills the 72-minute chart. Every synthetic sample is flagged `fromApi: false` and the provenance panel shows `speedTimeline: synthetic`. In production this fallback would be removed.
- **Projected loss-cost tile** on `/portfolio` uses directional industry constants (premium-per-power-unit, loss-ratio lift per score point) documented in the component; a production deployment would read these from the carrier rating plan.
- **Risk weights** in [src/lib/risk/weights.ts](src/lib/risk/weights.ts) are informed defaults for commercial auto, not a calibrated actuarial model.
- **Tier cutoffs and confidence thresholds** in scoring are hardcoded policy constants, not from Catena. In production they would come from an internal rating-policy service.
- **No test coverage for the UI**; the 18 vitest tests target scoring, domain, and the HTTP client's retry behavior. Integration tests against the sandbox are deliberately omitted to avoid flakiness in a submission.
- **AI assistance** was used during development. The architecture, API integration, risk model, and claims-packet composition are hand-authored decisions; generated code was reviewed and edited before commit.
