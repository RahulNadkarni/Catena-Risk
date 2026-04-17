# Catena API exploration report

OpenAPI pin: `catena-sdk-go@5dec2ea7540ab248960548b91cfe5b1d2141b744`

## Section 1: Endpoints used in Catena Risk (primary)

_Edit this mapping as the product surface solidifies._

### List Connections (`/v2/integrations/connections`)

- **Status**: OK
- **Latency (ms)**: 186
- **Row count**: 7
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "id": "7c2f6fec-3097-499c-84b4-e165872097e5",
  "created_at": "2026-03-13T22:42:49.569980Z",
  "updated_at": "2026-03-13T22:42:49.569980Z",
  "fleet_id": "405f1ac5-1a52-4ac1-b149-248b96dd8a8b",
  "fleet_ref": "sandbox",
  "tsp_id": "e3e0aed1-c472-4e9a-b614-63db5eb16df0",
  "source_name": "samsara",
  "credentials": {
    "api_key": "*****",
    "url": null,
    "user_id": null
  },
  "status": "paused",
  "description": "Catena Data Sandbox Connection"
}
```

### List Fleets (`/v2/orgs/fleets`)

- **Status**: OK
- **Latency (ms)**: 219
- **Row count**: 4
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "name": "Fleet 019c776d-80e5-766d-9653-e91cbf3050fc",
  "description": null,
  "display_name": null,
  "legal_name": null,
  "dba_name": null,
  "websites": [
    "https://unknown-fleet-019c776d-80e5-766d-9653-e91cbf3050fc-ye7vyy.com/"
  ],
  "invitation_id": "019c776d-80e5-766d-9653-e91cbf3050fc",
  "fleet_ref": "demo",
  "regulatory_id": null,
  "regulatory_id_type": null,
  "regulatory_id_date": null,
  "regulatory_id_status": null,
  "registered_email": null,
  "registered_phone": null,
  "registered_fax": null,
  "address": null,
  "city": null,
  "province": null,
  "postal_code": null,
  "country_code": null,
  "id": "3a6cf33b-1fd1-4cee-8eea-db36182df590",
  "created_at": "2026-02-19T19:43:22.384013Z",
  "updated_at": "2026-02-19T19:43:22.384013Z"
}
```

### List Invitations (`/v2/orgs/invitations`)

- **Status**: OK
- **Latency (ms)**: 217
- **Row count**: 4
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "id": "019c776d-80e5-766d-9653-e91cbf3050fc",
  "created_at": "2026-02-19T19:43:11.077916Z",
  "magic_link": "https://connect.catenatelematics.com/?invite=019c776d-80e5-766d-9653-e91cbf3050fc",
  "expires_at": "2026-02-20T19:43:11.077892Z",
  "expires_in_hours": 24,
  "status": "accepted",
  "fleet_name": null,
  "accepted_at": "2026-02-19T19:43:23.944562Z",
  "pre_registration_access_token": "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICItOVA5ZEZRVnJiTzUwaTFObUxFT3JiQmlTMFFWVUpkbTFKSUpncW1tcWF3In0.eyJleHAiOjE3NzE1Mzc0MDMsImlhdCI6MTc3MTUzMDIwMywianRpIjoib25ydHJvOjg5MmJiZDVkLTFiMWEtNDgxMC1iODg1LWYwODhmZjRiZjRmOCIsImlzcyI6Imh0dHBzOi8vYXV0aC5jYXRlbmF0ZWxlbWF0aWNzLmNvbS9yZWFsbXMvY2F0ZW5hIiwic3ViIjoiOTgwZTZjZmYtMTkwZi00YzM1LTkzOTYtOTZkMWY5N2ZiNjg2IiwidHlwIjoiQmVhcmVyIiwiYXpwIjoicHJlLXJlZ2lzdHJhdGlvbi1jbGllbnQiLCJzaWQiOiI2YzUzOWQ1OS01NmNjLTQ4MTEtYTQzOC1hMGJhNjI5M2JjNmUiLCJhY3IiOiIxIiwiYWxsb3dlZC1vcmlnaW5zIjpbIioiXSwic2NvcGUiOiJvcGVuaWQgb3JnYW5pemF0aW9uIHNoYXJlLWFncmVlbWVudDpyZWFkIHBhcnRuZXI6cmVhZCBwcm9maWxlIGNvbm5lY3Rpb246Y3JlYXRlIGNvbm5lY3Rpb246cmVhZCBlbWFpbCIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJvcmciOnsiZmxlZXQtMDE5Yzc3NmQtODBlNS03NjZkLTk2NTMtZTkxY2JmMzA1MGZjLXllN3Z5eSI6eyJvcmdfdHlwZSI6WyJmbGVldCJdLCJpZCI6IjNhNmNmMzNiLTFmZDEtNGNlZS04ZWVhLWRiMzYxODJkZjU5MCJ9fSwicm9sZXMiOlsiaW1wZXJzb25hdG9yIl0sIm5hbWUiOiJGbGVldCBBZG1pbiIsInByZWZlcnJlZF91c2VybmFtZSI6ImZsZWV0LmFkbWluQDNhNmNmMzNiLTFmZDEtNGNlZS04ZWVhLWRiMzYxODJkZjU5MC5jb20iLCJnaXZlbl9uYW1lIjoiRmxlZXQiLCJmYW1pbHlfbmFtZSI6IkFkbWluIiwiZW1haWwiOiJmbGVldC5hZG1pbkAzYTZjZjMzYi0xZmQxLTRjZWUtOGVlYS1kYjM2MTgyZGY1OTAuY29tIn0.cOosg6WEGJfEoH8xVyQmqbBVO2j8EJFParRpICSQ_EiyXN1UAdZ2tAmyUBWPaBZ0IU3rgOJtYCeEwnzHFdqFif07cBVjRdoKbTRZ9pRNH-9cJp2dTXbLlA_qWbTbgtvTUAwfY9aQQ_o7GPGWzzW62CDquh6laGE3eY1BJ457Fr_AFZkyCCdIi8RWpGqJSxsZ8JHy6kBL0IqIdvCE9Mt-SrhKnSqyH3MNXiaFiyuz98gKIANiATi9XiPH7tlrf8dUeaEuIIRZQ_CbPkVLrxGpi73XkJ7cDngIDbsCMdNlhJ5MmJQXd5iA_1-GlS2EnqQ76CzGWS50hhBKDPpbma_8hQ",
  "pre_registration_refresh_token": "eyJhbGciOiJIUzUxMiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICIyMTVkMTlkOC1jZTAxLTQwYjgtOWY5Mi1hZDI4ZWE2NDMzMjcifQ.eyJleHAiOjE3NzM5NDk0MDMsImlhdCI6MTc3MTUzMDIwMywianRpIjoiODZmOWY1NTktNGM5ZC00ZjE3LWI0N2UtMjFmOWEwMDczN2NjIiwiaXNzIjoiaHR0cHM6Ly9hdXRoLmNhdGVuYXRlbGVtYXRpY3MuY29tL3JlYWxtcy9jYXRlbmEiLCJhdWQiOiJodHRwczovL2F1dGguY2F0ZW5hdGVsZW1hdGljcy5jb20vcmVhbG1zL2NhdGVuYSIsInN1YiI6Ijk4MGU2Y2ZmLTE5MGYtNGMzNS05Mzk2LTk2ZDFmOTdmYjY4NiIsInR5cCI6IlJlZnJlc2giLCJhenAiOiJwcmUtcmVnaXN0cmF0aW9uLWNsaWVudCIsInNpZCI6IjZjNTM5ZDU5LTU2Y2MtNDgxMS1hNDM4LWEwYmE2MjkzYmM2ZSIsInNjb3BlIjoib3BlbmlkIHdlYi1vcmlnaW5zIG9yZ2FuaXphdGlvbiBzaGFyZS1hZ3JlZW1lbnQ6cmVhZCByb2xlcyBwYXJ0bmVyOnJlYWQgcHJvZmlsZSBiYXNpYyBhY3IgY29ubmVjdGlvbjpjcmVhdGUgY29ubmVjdGlvbjpyZWFkIGVtYWlsIn0.t7_hbAmNGFyLEohi9-1MTBSM5syKZ-2r-vncDCm8XD96hrJjX--XXnVWHZJfew77wM7NAVN1nrRIgnvivEEeHA",
  "callback_url": null,
  "success_redirect_url": null,
  "failure_redirect_url": null,
  "limit_tsps": null,
  "fleet_id": "3a6cf33b-1fd1-4cee-8eea-db36182df590",
  "partner_slug": "catena-candidates",
  "partner_id": "b43575ec-f3d4-486e-8ee0-c88fd63dc3ed",
  "decline_reason": null,
  "declined_at": null,
  "fleet_ref": "demo",
  "permissions": {
    "user": "read_write",
    "asset": "read_write",
    "trailer": "read_write",
    "vehicle": "read_write",
    "dvir_log": "read_write",
    "hos_event": "read_write",
    "engine_log": "read_write",
    "ifta_summary": "read_write",
    "hos_violation": "read_write",
    "trailer_status": "read_write",
    "vehicle_sensor": "read_write",
    "dvir_log_defect": "read_write",
    "driver_event_log": "read_write",
    "hos_availability": "read_write",
    "location_segment": "read_write",
    "trailer_location": "read_write",
    "vehicle_location": "read_write",
    "hos_daily_snapshot": "read_write",
    "driver_safety_event": "read_write",
    "hos_event_annotation": "read_write",
    "hos_event_attachment": "read_write"
  },
  "fleet_email": null,
  "fleet_regulatory_id": null,
  "fleet_regulatory_id_type": null,
  "fleet_phone": null,
  "fleet_website": null,
  "fleet_country_code": null,
  "partner_provided_fleet_name": null,
  "partner_provided_fleet_email": null,
  "partner_provided_fleet_regulatory_id": null,
  "partner_provided_fleet_regulatory_id_type": null,
  "partner_provided_fleet_phone": null,
  "partner_provided_fleet_website": null,
  "partner_provided_fleet_country_code": null
}
```

### List Share Agreements (`/v2/orgs/share_agreements`)

- **Status**: OK
- **Latency (ms)**: 257
- **Row count**: 4
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "id": "019c776d-b117-7c1a-af6e-7076c4071e37",
  "fleet_id": "3a6cf33b-1fd1-4cee-8eea-db36182df590",
  "partner_id": "b43575ec-f3d4-486e-8ee0-c88fd63dc3ed",
  "fleet_ref": "demo",
  "status": "active",
  "effective_date": "2026-02-19T19:43:23.414841Z",
  "expiration_date": null,
  "scopes": {
    "user": "read_write",
    "asset": "read_write",
    "trailer": "read_write",
    "vehicle": "read_write",
    "dvir_log": "read_write",
    "hos_event": "read_write",
    "engine_log": "read_write",
    "ifta_summary": "read_write",
    "hos_violation": "read_write",
    "trailer_status": "read_write",
    "vehicle_sensor": "read_write",
    "dvir_log_defect": "read_write",
    "driver_event_log": "read_write",
    "hos_availability": "read_write",
    "location_segment": "read_write",
    "trailer_location": "read_write",
    "vehicle_location": "read_write",
    "hos_daily_snapshot": "read_write",
    "driver_safety_event": "read_write",
    "hos_event_annotation": "read_write",
    "hos_event_attachment": "read_write"
  }
}
```

### List TSPs (`/v2/orgs/tsps`)

- **Status**: OK
- **Latency (ms)**: 633
- **Row count**: 202
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "name": "3PL Tek",
  "description": "3PL Tek",
  "websites": [
    "https://3pltek.us/"
  ],
  "source_name": "hos247",
  "status": "active",
  "conn_type": "company_id",
  "is_sandbox": false,
  "logo_url": "https://cdn.sanity.io/images/4znj3g2f/production/5c5dce34e8836bb8d39910bc1dcd564cb79f9991-240x240.png",
  "logo_dark_url": null,
  "id": "3da622c3-8b23-4923-b67e-1f515f978215",
  "slug": "3pl-tek",
  "ext_tsp_id": "019d6a63-e072-7bcf-a03b-e51a72a4c855",
  "created_at": "2026-01-26T15:40:23.624104Z",
  "updated_at": "2026-04-15T23:09:41.743125Z",
  "registry": "fmcsa",
  "compliance_status": "compliant"
}
```

### List driver summaries (`/v2/telematics/analytics/drivers`)

- **Status**: OK
- **Latency (ms)**: 356
- **Row count**: 50
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "fleet_id": "405f1ac5-1a52-4ac1-b149-248b96dd8a8b",
  "fleet_ref": "sandbox",
  "connection_id": "79313565-ec27-4616-8023-07ee31e460c1",
  "user_id": "fffb6b00-7704-4268-b0a0-a784b5f5a128",
  "tsp_id": "0d5df06e-3f7e-4f36-89b3-5e537c3d514a",
  "tsp_slug": "geotab",
  "source_name": "geotab",
  "source_id": "fc779688-46cb-55b3-94f8-9544e14e82b6",
  "employee_number": "EMP-ccb3280f",
  "first_name": "Driver_8d49db",
  "last_name": "Last_838fb9",
  "username": "user_ccb3280f",
  "status": "INACTIVE",
  "phone_number": null,
  "license_country": "CAN",
  "license_region": null,
  "license_number": null,
  "license_expiration": null,
  "hos_ruleset_code": "US_INT_PROP_70_8_SLPVAR",
  "safety_events_30d": 0,
  "hos_violations_30d": 0
}
```

### Get driver growth time series (`/v2/telematics/analytics/drivers/time-series`)

- **Status**: OK
- **Latency (ms)**: 187
- **Row count**: 31
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "date": "2026-03-18",
  "daily_count": 3,
  "cumulative_count": 4327
}
```

### List fleet summaries (`/v2/telematics/analytics/fleets`)

- **Status**: OK
- **Latency (ms)**: 273
- **Row count**: 2
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "fleet_ref": "sandbox",
  "fleet_ids": [
    "405f1ac5-1a52-4ac1-b149-248b96dd8a8b"
  ],
  "connections": 6,
  "drivers": 4369,
  "vehicles": 2729,
  "vehicles_with_locations": 985
}
```

### Get fleet growth time series (`/v2/telematics/analytics/fleets/time-series`)

- **Status**: OK
- **Latency (ms)**: 199
- **Row count**: 31
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "date": "2026-03-18",
  "daily_count": 0,
  "cumulative_count": 2
}
```

### Get analytics overview (`/v2/telematics/analytics/overview`)

- **Status**: OK
- **Latency (ms)**: 221
- **Row count**: 0
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "fleets": 7,
  "vehicles": 2734,
  "drivers": 4374,
  "trailers": 26496
}
```

### List trailer summaries (`/v2/telematics/analytics/trailers`)

- **Status**: OK
- **Latency (ms)**: 298
- **Row count**: 50
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "fleet_id": "405f1ac5-1a52-4ac1-b149-248b96dd8a8b",
  "fleet_ref": "sandbox",
  "connection_id": "4cd17be0-0362-45aa-91f3-c0d6aaeaaf83",
  "trailer_id": "ffffe01a-81f9-481d-ae59-eef86c97cff3",
  "source_id": "ad8bec30-c89a-5300-8f51-cc73c0368e3e",
  "trailer_name": "trailer_3a100e48",
  "tsp_id": "b480ecc4-3fa9-419a-9838-bd8901a39c17",
  "tsp_slug": "isaac",
  "source_name": "isaac",
  "location": null,
  "h3_index_11": null
}
```

### List trailer live locations (`/v2/telematics/analytics/trailers/live-locations`)

- **Status**: OK
- **Latency (ms)**: 368
- **Row count**: 50
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "trailer_id": "efe8b1cf-50e1-4101-bedd-199fe9f711f0",
  "tsp_id": "0d5df06e-3f7e-4f36-89b3-5e537c3d514a",
  "tsp_slug": "geotab",
  "source_name": "geotab",
  "trailer_name": "trailer_ef0825aa",
  "vehicle_id": "11cb0dcf-bce6-49ac-9f85-cc2e6334712c",
  "driver_id": "c4be0482-afa1-4879-a564-7d9242854a83",
  "driver_name": "user_505fb7f5",
  "trailer_h3_index_11": 626675743016566800,
  "trailer_location_occurred_at": "2026-04-17T01:29:19.357000Z",
  "trailer_location": {
    "type": "Point",
    "coordinates": [
      -88.1530914,
      41.5221214
    ],
    "bbox": null
  },
  "vehicle_h3_index_11": 626675743016566800,
  "vehicle_location_occurred_at": "2026-04-17T01:29:19.357000Z",
  "vehicle_location": {
    "type": "Point",
    "coordinates": [
      -88.1530914,
      41.5221214
    ],
    "bbox": null
  }
}
```

### Get trailer growth time series (`/v2/telematics/analytics/trailers/time-series`)

- **Status**: OK
- **Latency (ms)**: 191
- **Row count**: 31
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "date": "2026-03-18",
  "daily_count": 5,
  "cumulative_count": 26405
}
```

### List vehicle summaries (`/v2/telematics/analytics/vehicles`)

- **Status**: OK
- **Latency (ms)**: 257
- **Row count**: 50
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "fleet_id": "405f1ac5-1a52-4ac1-b149-248b96dd8a8b",
  "fleet_ref": "sandbox",
  "connection_id": "79313565-ec27-4616-8023-07ee31e460c1",
  "vehicle_id": "ffb42dfa-7900-4ce4-a8cd-22b1ab4bc4d3",
  "tsp_id": "0d5df06e-3f7e-4f36-89b3-5e537c3d514a",
  "tsp_slug": "geotab",
  "source_name": "geotab",
  "source_id": "f024b121-585b-5c07-bd16-ef93e596c676",
  "status": "IN_SERVICE",
  "vehicle_name": "vehicle_b8d9d022",
  "oem": null,
  "model_type": null,
  "model_year": null,
  "vin": "VIN-238797dfa69ff",
  "engine_vin": "VIN-8a8de823d5ed3",
  "license_plate_country": null,
  "license_plate_region": "",
  "license_plate_number": "PLT-e3b0c4",
  "last_location_ping": null,
  "last_location_h3_index_11": null,
  "last_location": null,
  "last_fuel_level": null,
  "last_odometer_reading": null,
  "last_engine_hours": null,
  "last_speed_reading": null
}
```

### List vehicle live locations (`/v2/telematics/analytics/vehicles/live-locations`)

- **Status**: OK
- **Latency (ms)**: 275
- **Row count**: 50
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "vehicle_id": "eb4b26f5-cfb7-5212-8b62-68f41fa1f896",
  "vin": "4EFF312E497FBC1EB",
  "vehicle_name": "Nissan D21",
  "tsp_id": "a8bc9b98-8ea0-4f65-b8d1-fa4b948c2d95",
  "tsp_slug": "groundhog",
  "source_name": "groundhog",
  "driver_id": null,
  "driver_name": null,
  "h3_index_11": 626692562405449700,
  "speed": 0.447,
  "odometer": 117820428.987,
  "fuel_level": 6.328540900125851,
  "engine_hours": 5561.09111109252,
  "oil_pressure": 356.771,
  "coolant_temperature": 364.529,
  "occurred_at": "2026-04-17T01:41:18.263362Z",
  "location": {
    "type": "Point",
    "coordinates": [
      -88.448443262,
      42.311691732
    ],
    "bbox": null
  }
}
```

### Get vehicle growth time series (`/v2/telematics/analytics/vehicles/time-series`)

- **Status**: OK
- **Latency (ms)**: 190
- **Row count**: 31
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "date": "2026-03-18",
  "daily_count": 0,
  "cumulative_count": 2683
}
```

### List Driver Safety Events (`/v2/telematics/driver-safety-events`)

- **Status**: OK
- **Latency (ms)**: 244
- **Row count**: 50
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "fleet_id": "405f1ac5-1a52-4ac1-b149-248b96dd8a8b",
  "fleet_ref": "sandbox",
  "id": "b671ab7b-dd0b-4518-882e-f515c06bc84f",
  "created_at": "2026-04-17T01:26:21.886776Z",
  "updated_at": "2026-04-17T01:26:21.886776Z",
  "deleted_at": null,
  "connection_id": "79313565-ec27-4616-8023-07ee31e460c1",
  "tsp_id": "0d5df06e-3f7e-4f36-89b3-5e537c3d514a",
  "tsp_slug": "geotab",
  "source_name": "geotab",
  "source_data": {},
  "source_id": "25796d99-5d3f-519e-a05f-0e2e4e55818c",
  "source_data_hash": "fda48fe8a08df2d5f0513c31bf26323916bf1a40f07b7ca100acbd4a3f2ed239",
  "occurred_at": "2026-04-17T01:25:58.340000Z",
  "execution_id": null,
  "schedule_id": null,
  "extras": {},
  "driver_id": "6faf3950-d5fd-487b-a6ad-55a0a3237c8e",
  "vehicle_id": "648f6d6b-d42c-4126-9b39-29a7d2f7a1da",
  "source_driver_id": "drv_84a6d227",
  "source_vehicle_id": "veh_5c7e111a",
  "event": "speeding",
  "location": null,
  "inferred_address": null,
  "h3_index_11": null,
  "duration_seconds": 20,
  "event_metadata": {}
}
```

### List Dvir Log Defects (`/v2/telematics/dvir-defects`)

- **Status**: ERROR
- **Latency (ms)**: 87
- **Row count**: n/a
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
null
```

### List Dvir Logs (`/v2/telematics/dvir-logs`)

- **Status**: OK
- **Latency (ms)**: 246
- **Row count**: 50
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "fleet_id": "405f1ac5-1a52-4ac1-b149-248b96dd8a8b",
  "fleet_ref": "sandbox",
  "id": "12f5fd8b-b757-4761-9b78-26ac6305e39f",
  "created_at": "2026-04-17T01:26:21.647811Z",
  "updated_at": "2026-04-17T01:26:21.647811Z",
  "deleted_at": null,
  "connection_id": "79313565-ec27-4616-8023-07ee31e460c1",
  "tsp_id": "0d5df06e-3f7e-4f36-89b3-5e537c3d514a",
  "tsp_slug": "geotab",
  "source_name": "geotab",
  "source_data": {},
  "source_id": "cfc6b6a3-6179-5efa-9899-ff3cdea1b008",
  "source_data_hash": "dc0d3d1c11da0560b09eaf36ce4a1c65ea9405add51b4d3916a7260722f73255",
  "occurred_at": "2026-04-17T01:25:48.151000Z",
  "execution_id": null,
  "schedule_id": null,
  "extras": {},
  "vehicle_id": null,
  "driver_id": "d63ea479-0a40-402d-a095-a4150b34ab80",
  "trailer_id": "15a35618-c3c8-4202-9d53-ba23544e4ea5",
  "source_driver_id": "drv_14517cc9",
  "source_vehicle_id": null,
  "source_trailer_id": "trl_6ce84205",
  "log_type": "post_trip",
  "authority_name": "auth_e646dd2d",
  "authority_address": "addr_faa5771d",
  "duration_seconds": 3,
  "odometer_km": null,
  "engine_hours": null,
  "location": {
    "type": "Point",
    "coordinates": [
      -88.183395,
      41.49625
    ],
    "bbox": null
  },
  "h3_index_11": 626675908724854800,
  "inspected_by": "insp_14517cc9",
  "certify_comment": null,
  "driver_comment": null,
  "defect_count": null,
  "version": "000000000010a824",
  "defects": null,
  "is_safety_critical": null
}
```

### List Engine Logs (`/v2/telematics/engine-logs`)

- **Status**: OK
- **Latency (ms)**: 194
- **Row count**: 0
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "items": [],
  "total": 0,
  "current_page": "Pg%3D%3D",
  "current_page_backwards": "PA%3D%3D",
  "previous_page": null,
  "next_page": null
}
```

### List HOS Availabilities (`/v2/telematics/hos-availabilities`)

- **Status**: OK
- **Latency (ms)**: 3410
- **Row count**: 50
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "fleet_id": "3a6cf33b-1fd1-4cee-8eea-db36182df590",
  "fleet_ref": "demo",
  "id": "ffd261f3-8137-5d9e-a868-8391c9b4a858",
  "created_at": "2026-02-24T01:42:20.729039Z",
  "updated_at": "2026-04-17T01:41:20.962948Z",
  "deleted_at": null,
  "connection_id": "019bc2e8-c69b-7c6c-a166-f47044e77174",
  "tsp_id": "a8bc9b98-8ea0-4f65-b8d1-fa4b948c2d95",
  "tsp_slug": "groundhog",
  "source_name": "catena_simulator",
  "source_data": {},
  "source_id": "user:rita_hanson",
  "source_data_hash": "58e31a8d30afcf95321e87642f76c4a226a32eda9aad0576e2d9c561693e97ee",
  "occurred_at": "2026-04-17T01:41:18.263362Z",
  "execution_id": "019d9919-72ac-7f5b-8adc-2c4b721f32f8",
  "schedule_id": "019bc2e8-c76c-7a5b-9432-bdab05370a60",
  "extras": null,
  "driver_id": "ffd261f3-8137-5d9e-a868-8391c9b4a858",
  "vehicle_id": null,
  "hos_ruleset_code": "US_INT_PROP_70_8",
  "duty_status_code": "OFF",
  "cycle_started_at": "2026-04-11T00:00:00Z",
  "cycle_ends_at": "2026-04-18T00:00:00Z",
  "available_drive_seconds": 39600,
  "available_shift_seconds": 50400,
  "available_cycle_seconds": 0,
  "available_tomorrow_seconds": null,
  "available_day2_seconds": null,
  "available_day3_seconds": null,
  "forecast_horizon_days": 0,
  "time_until_break_seconds": 28800,
  "rest_remaining_seconds": null,
  "cycle_violation_duration_seconds": null,
  "shift_driving_violation_duration_seconds": null,
  "shift_ends_at": "2026-04-17T15:41:18.263362Z",
  "next_break_due_at": "2026-04-17T09:41:18.263362Z",
  "next_10hr_reset_eligible_at": "2026-04-17T11:41:18.263362Z",
  "next_34hr_reset_eligible_at": null,
  "is_personal_conveyance_applied": null,
  "is_yard_move_applied": null,
  "is_adverse_driving_exemption_available": null,
  "is_adverse_driving_applied": null,
  "is_meal_break_required": true,
  "meal_break_due_at": null,
  "meal_break_min_duration_seconds": null,
  "meal_break_time_until_due_seconds": null,
  "is_split_sleep_applied": null,
  "is_sleeper_eligible": true,
  "sleeper_required_remaining_seconds": null,
  "sleeper_split_window_ends_at": null,
  "is_cycle_applicable": true,
  "exception_codes": null,
  "notes": null
}
```

### List Hos Daily Snapshots (`/v2/telematics/hos-daily-snapshots`)

- **Status**: OK
- **Latency (ms)**: 569
- **Row count**: 50
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "fleet_id": "405f1ac5-1a52-4ac1-b149-248b96dd8a8b",
  "fleet_ref": "sandbox",
  "id": "e9bcd075-9183-41ca-b19b-0296373aed0c",
  "created_at": "2026-04-16T22:23:12.994004Z",
  "updated_at": "2026-04-16T22:23:12.994004Z",
  "deleted_at": null,
  "connection_id": "79313565-ec27-4616-8023-07ee31e460c1",
  "tsp_id": "0d5df06e-3f7e-4f36-89b3-5e537c3d514a",
  "tsp_slug": "geotab",
  "source_name": "geotab",
  "source_data": {},
  "source_id": "21c50501-5f9d-552f-9671-a41a7a64842a",
  "source_data_hash": "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
  "occurred_at": "2026-04-16T22:23:13.366576Z",
  "execution_id": null,
  "schedule_id": null,
  "extras": {},
  "driver_id": "591d8126-6e39-44af-8516-87d3ffefad77",
  "source_driver_id": "drv_25e8e4d6",
  "snapshot_date": "2026-04-14",
  "duration_off_duty_seconds": 0,
  "duration_sleeper_berth_seconds": 86400,
  "duration_on_duty_seconds": 0,
  "duration_driving_seconds": 0,
  "duration_personal_conveyance_seconds": 0,
  "duration_yard_move_seconds": 0,
  "duration_waiting_seconds": 0,
  "duration_unknown_seconds": 0,
  "duration_cycle_on_duty_seconds": 0
}
```

### List HOS Events (`/v2/telematics/hos-events`)

- **Status**: OK
- **Latency (ms)**: 1510
- **Row count**: 50
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "fleet_id": "405f1ac5-1a52-4ac1-b149-248b96dd8a8b",
  "fleet_ref": "sandbox",
  "id": "180d9a88-5ddc-4805-b4b5-1e0bc8b0b29c",
  "created_at": "2026-04-17T01:24:39.798151Z",
  "updated_at": "2026-04-17T01:24:39.798151Z",
  "deleted_at": null,
  "connection_id": "4cd17be0-0362-45aa-91f3-c0d6aaeaaf83",
  "tsp_id": "b480ecc4-3fa9-419a-9838-bd8901a39c17",
  "tsp_slug": "isaac",
  "source_name": "isaac",
  "source_data": {},
  "source_id": "17e5c455-6e03-52ac-aa0d-a306a0012d1a",
  "source_data_hash": "e9282f2ae49560ece3d1a4d967b89cd9b7e51b0bcd1da3047a30eec62e6100f4",
  "occurred_at": "2026-04-17T01:21:56.027000Z",
  "execution_id": null,
  "schedule_id": null,
  "extras": {},
  "driver_id": "c69ca6c2-6938-45c1-b05b-79d8476962c3",
  "vehicle_id": "57dcc5dd-2425-4e47-b4e3-99afa808f7bb",
  "co_driver_id": null,
  "additional_driver_ids": {},
  "started_at": "2026-04-17T01:21:56.027000Z",
  "ended_at": null,
  "driver_last_edit_at": null,
  "driver_certified_at": null,
  "hos_ruleset_code": null,
  "time_zone_code": "America/Chicago",
  "annotations": null,
  "duty_status_code": "OFF",
  "event_type_code": "1",
  "event_code": "OFF",
  "log_state_code": "ACTIVE",
  "log_origin_code": "AUTO",
  "deferral_status": null,
  "deferral_minutes": null,
  "eld_malfunction_code": null,
  "is_excluded": false,
  "is_transitioning": true,
  "record_status": "ACTIVE",
  "region_code": "US-MO",
  "location_name": "loc_b52ec772",
  "location": {
    "type": "Point",
    "coordinates": [
      -90.2221120039622,
      38.6916721979777
    ],
    "bbox": null
  },
  "inferred_address": null,
  "h3_index_11": 630267641798443000,
  "odometer": null,
  "engine_hours": null,
  "sequence": null,
  "version": null
}
```

### List HOS Violations (`/v2/telematics/hos-violations`)

- **Status**: OK
- **Latency (ms)**: 206
- **Row count**: 50
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "fleet_id": "405f1ac5-1a52-4ac1-b149-248b96dd8a8b",
  "fleet_ref": "sandbox",
  "id": "2d0b3dd4-322b-45f8-a4dc-489dc419cf65",
  "created_at": "2026-04-17T00:04:35.372399Z",
  "updated_at": "2026-04-17T00:04:35.372399Z",
  "deleted_at": null,
  "connection_id": "79313565-ec27-4616-8023-07ee31e460c1",
  "tsp_id": "0d5df06e-3f7e-4f36-89b3-5e537c3d514a",
  "tsp_slug": "geotab",
  "source_name": "geotab",
  "source_data": {},
  "source_id": "b3a53739-37e4-51f7-8b9b-e7877588d6b4",
  "source_data_hash": "4e7ee1f012c9c5019636fd06e4c40b582466ecccb89d9097ae1adfb15e5a9428",
  "occurred_at": "2026-04-17T00:04:35.663326Z",
  "execution_id": null,
  "schedule_id": null,
  "extras": {},
  "hos_event_id": "1a841410-cbd5-48b3-bab7-db44549c073d",
  "driver_id": "32dd5ddf-cfa8-4226-bab2-f935325f6922",
  "source_driver_id": "drv_9f7cf9a3",
  "source_hos_event_id": "evt_184439d4",
  "violation_code": "WD_WINDOW_OVER",
  "violation_category": "Workday",
  "violation_description": "Total on-duty time exceeded the allowed daily/shift limit.",
  "start_time": "2026-04-16T23:58:54.203000Z",
  "end_time": null,
  "duration": null,
  "hours_limit": 14
}
```

### List Ifta Summaries (`/v2/telematics/ifta-summaries`)

- **Status**: ERROR
- **Latency (ms)**: 25146
- **Row count**: n/a
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
null
```

### List Trailers (`/v2/telematics/trailers`)

- **Status**: OK
- **Latency (ms)**: 258
- **Row count**: 50
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "fleet_id": "405f1ac5-1a52-4ac1-b149-248b96dd8a8b",
  "fleet_ref": "sandbox",
  "id": "fa2e5693-3c52-4497-99a0-dad3fa809e3e",
  "created_at": "2026-04-16T18:25:22.516657Z",
  "updated_at": "2026-04-16T18:25:22.516657Z",
  "deleted_at": null,
  "connection_id": "4cd17be0-0362-45aa-91f3-c0d6aaeaaf83",
  "tsp_id": "b480ecc4-3fa9-419a-9838-bd8901a39c17",
  "tsp_slug": "isaac",
  "source_name": "isaac",
  "source_data": {},
  "source_id": "2c818aa6-a8ca-5c7e-bad8-1031d4b9ced5",
  "source_data_hash": "41bfc3be99d927aef7a94251dc1bd2b31b73c5a5053b99d225484b9fbba5d845",
  "occurred_at": "2026-04-16T18:25:33.369806Z",
  "execution_id": null,
  "schedule_id": null,
  "extras": {},
  "trailer_name": "trailer_242ee4d9",
  "oem": null,
  "model_type": null,
  "model_year": null,
  "vin": null,
  "license_plate_region": "QC",
  "license_plate_country": "CAN",
  "license_plate_number": "PLT-241a51",
  "started_at": null,
  "ended_at": null,
  "is_active": true,
  "status": "active",
  "notes": null,
  "eld_id": null,
  "eld_serial_number": null,
  "eld_device_type": null,
  "eld_product_id": null,
  "total_axles": null,
  "trailer_groups": {},
  "external_id": null,
  "trailer_length": null,
  "trailer_type": null,
  "speed_unit": null,
  "odometer_unit": null,
  "fuel_unit": null,
  "fuel_capacity": null,
  "engine_type": null
}
```

### List Users (`/v2/telematics/users`)

- **Status**: OK
- **Latency (ms)**: 317
- **Row count**: 50
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "fleet_id": "405f1ac5-1a52-4ac1-b149-248b96dd8a8b",
  "fleet_ref": "sandbox",
  "id": "b613baf5-86ca-4e06-8b6f-f4350517a5ea",
  "created_at": "2026-04-01T17:17:36.493154Z",
  "updated_at": "2026-04-17T01:29:22.093316Z",
  "deleted_at": null,
  "connection_id": "0c6995b7-8c10-4aef-b1c2-bbd53481ad62",
  "tsp_id": "ee3c32b4-25c0-43d7-876f-e644cabc62c8",
  "tsp_slug": "motive",
  "source_name": "motive",
  "source_data": {},
  "source_id": "dc28ccff-8aed-5816-9a92-98cd8d5580e3",
  "source_data_hash": "133bafb36cfcaed2d9496fdd96625bbd26ebb9f095253299242f606dd42d5a28",
  "occurred_at": "2026-04-17T01:29:22.316543Z",
  "execution_id": "019d4a0c-af64-76e5-bbdb-5abb5b6759c2",
  "schedule_id": "019cdef2-6e08-7c92-81d5-57602522d63e",
  "extras": {},
  "username": null,
  "started_at": "2026-04-01T17:07:19Z",
  "ended_at": null,
  "is_active": true,
  "status": "ACTIVE",
  "is_driver": false,
  "user_designation": null,
  "user_email": "bb9d2a6a380a@sandbox.com",
  "first_name": "Driver_5f4c74",
  "last_name": "Last_282c8c",
  "phone_number": "555-8d2f7a9",
  "country_code": null,
  "license_country": null,
  "license_region": null,
  "license_number": null,
  "license_expiration": null,
  "employee_number": "EMP-65d5918a",
  "company_groups": {},
  "private_user_groups": {},
  "report_groups": {},
  "security_groups": {},
  "authority_name": null,
  "authority_address": null,
  "company_name": null,
  "company_address": null,
  "carrier_number": null,
  "last_tsp_login": "2026-04-17T01:21:00Z",
  "notes": null,
  "hos_ruleset_code": null,
  "allow_yard_move": null,
  "allow_personal_conveyance": null,
  "allow_adverse_driving": null,
  "default_time_zone": null
}
```

### List Vehicle Locations (`/v2/telematics/vehicle-locations`)

- **Status**: OK
- **Latency (ms)**: 220
- **Row count**: 50
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "fleet_id": "3a6cf33b-1fd1-4cee-8eea-db36182df590",
  "fleet_ref": "demo",
  "id": "dfd85263-d596-57a4-a31c-7315dca13568",
  "created_at": "2026-02-11T12:58:16.524707Z",
  "updated_at": "2026-04-17T01:41:20.178524Z",
  "deleted_at": null,
  "connection_id": "019bc2e8-c69b-7c6c-a166-f47044e77174",
  "tsp_id": "a8bc9b98-8ea0-4f65-b8d1-fa4b948c2d95",
  "tsp_slug": "groundhog",
  "source_name": "catena_simulator",
  "source_data": {},
  "source_id": "loc:veh:chevy_c10:20260417014118",
  "source_data_hash": "d95c2a1c4e881af1d2c5580d6d1cbb6b1899a095bc4041625e4f57b33d271dc6",
  "occurred_at": "2026-04-17T01:41:18.263362Z",
  "execution_id": "019d9919-72ad-7b7f-af84-4ceb9c23f022",
  "schedule_id": "019bc2e8-c772-769d-98e4-ba5f9a4519c6",
  "extras": null,
  "vehicle_id": "28e4a9e0-b75d-5573-bf24-56026d2af4f3",
  "driver_id": "47ddb360-156d-5ae8-9fb0-0a81d6bc499a",
  "co_driver_id": null,
  "source_driver_id": "user:phil_connors",
  "source_vehicle_id": "veh:chevy_c10",
  "source_co_driver_id": null,
  "location": {
    "type": "Point",
    "coordinates": [
      -88.451424678,
      42.314338903
    ],
    "bbox": null
  },
  "h3_index_11": 626692562405187600,
  "speed": 0.447,
  "odometer": 136027560.622,
  "fuel_level": 1,
  "fuel_value": null,
  "engine_hours": 5581.406944423851,
  "oil_pressure": 370.688,
  "coolant_temperature": 361.277,
  "inferred_address": {
    "city": "Woodstock",
    "province": "IL",
    "country_code": "USA"
  }
}
```

### List Vehicles (`/v2/telematics/vehicles`)

- **Status**: OK
- **Latency (ms)**: 207
- **Row count**: 50
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "fleet_id": "405f1ac5-1a52-4ac1-b149-248b96dd8a8b",
  "fleet_ref": "sandbox",
  "id": "e6b923c9-8d2a-4900-af4b-1469cbeb678f",
  "created_at": "2026-03-10T15:22:31.773081Z",
  "updated_at": "2026-04-17T01:16:23.317339Z",
  "deleted_at": null,
  "connection_id": "79313565-ec27-4616-8023-07ee31e460c1",
  "tsp_id": "0d5df06e-3f7e-4f36-89b3-5e537c3d514a",
  "tsp_slug": "geotab",
  "source_name": "geotab",
  "source_data": {},
  "source_id": "cccc3a6b-a63c-52bc-8d52-06cc54915972",
  "source_data_hash": "2db786e1231bfa8d1adc1999a1b11b3238482b680c36b0225a1660100331f641",
  "occurred_at": "2026-04-17T01:16:24.999285Z",
  "execution_id": "019cecd1-bf23-71ef-9520-abca1153f66e",
  "schedule_id": "019cd856-dbb8-7fa1-8b2c-89b442b6b714",
  "extras": {},
  "vehicle_name": "vehicle_325322ed",
  "oem": null,
  "model_type": null,
  "model_year": null,
  "vin": "VIN-b3faee4ce0122",
  "engine_vin": "VIN-b3faee4ce0122",
  "license_plate_region": "",
  "license_plate_country": null,
  "license_plate_number": "PLT-d3b996",
  "started_at": "2023-08-24T15:24:40.683000Z",
  "ended_at": "2050-01-01T00:00:00Z",
  "is_active": true,
  "status": "IN_SERVICE",
  "notes": "notes_afbc1b4a",
  "eld_id": null,
  "eld_serial_number": "ser_ceaefda5",
  "eld_device_type": "GO9",
  "eld_product_id": "120",
  "total_axles": null,
  "vehicle_groups": {},
  "external_id": null,
  "speed_unit": null,
  "odometer_unit": null,
  "fuel_unit": null,
  "fuel_capacity": null,
  "engine_type": null
}
```

### Get Connection (`/v2/integrations/connections/{connection_id}`)

- **Status**: OK
- **Latency (ms)**: 182
- **Row count**: 0
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "id": "7c2f6fec-3097-499c-84b4-e165872097e5",
  "created_at": "2026-03-13T22:42:49.569980Z",
  "updated_at": "2026-03-13T22:42:49.569980Z",
  "fleet_id": "405f1ac5-1a52-4ac1-b149-248b96dd8a8b",
  "fleet_ref": null,
  "tsp_id": "e3e0aed1-c472-4e9a-b614-63db5eb16df0",
  "source_name": "samsara",
  "credentials": {
    "api_key": "*****",
    "url": null,
    "user_id": null
  },
  "status": "paused",
  "description": "Catena Data Sandbox Connection"
}
```

### Get Fleet (`/v2/orgs/fleets/{fleet_id}`)

- **Status**: OK
- **Latency (ms)**: 179
- **Row count**: 0
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "name": "Fleet 019c776d-80e5-766d-9653-e91cbf3050fc",
  "description": null,
  "display_name": null,
  "legal_name": null,
  "dba_name": null,
  "websites": [
    "https://unknown-fleet-019c776d-80e5-766d-9653-e91cbf3050fc-ye7vyy.com/"
  ],
  "invitation_id": "019c776d-80e5-766d-9653-e91cbf3050fc",
  "fleet_ref": "demo",
  "regulatory_id": null,
  "regulatory_id_type": null,
  "regulatory_id_date": null,
  "regulatory_id_status": null,
  "registered_email": null,
  "registered_phone": null,
  "registered_fax": null,
  "address": null,
  "city": null,
  "province": null,
  "postal_code": null,
  "country_code": null,
  "id": "3a6cf33b-1fd1-4cee-8eea-db36182df590",
  "created_at": "2026-02-19T19:43:22.384013Z",
  "updated_at": "2026-02-19T19:43:22.384013Z"
}
```

### Get Share Agreement (`/v2/orgs/share_agreements/{share_agreement_id}`)

- **Status**: OK
- **Latency (ms)**: 222
- **Row count**: 0
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "id": "019c776d-b117-7c1a-af6e-7076c4071e37",
  "fleet_id": "3a6cf33b-1fd1-4cee-8eea-db36182df590",
  "partner_id": "b43575ec-f3d4-486e-8ee0-c88fd63dc3ed",
  "fleet_ref": "demo",
  "status": "active",
  "effective_date": "2026-02-19T19:43:23.414841Z",
  "expiration_date": null,
  "scopes": {
    "user": "read_write",
    "asset": "read_write",
    "trailer": "read_write",
    "vehicle": "read_write",
    "dvir_log": "read_write",
    "hos_event": "read_write",
    "engine_log": "read_write",
    "ifta_summary": "read_write",
    "hos_violation": "read_write",
    "trailer_status": "read_write",
    "vehicle_sensor": "read_write",
    "dvir_log_defect": "read_write",
    "driver_event_log": "read_write",
    "hos_availability": "read_write",
    "location_segment": "read_write",
    "trailer_location": "read_write",
    "vehicle_location": "read_write",
    "hos_daily_snapshot": "read_write",
    "driver_safety_event": "read_write",
    "hos_event_annotation": "read_write",
    "hos_event_attachment": "read_write"
  }
}
```

### Get TSP (`/v2/orgs/tsps/{tsp_id}`)

- **Status**: OK
- **Latency (ms)**: 363
- **Row count**: 0
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "name": "3PL Tek",
  "description": "3PL Tek",
  "websites": [
    "https://3pltek.us/"
  ],
  "source_name": "hos247",
  "status": "active",
  "conn_type": "company_id",
  "is_sandbox": false,
  "logo_url": "https://cdn.sanity.io/images/4znj3g2f/production/5c5dce34e8836bb8d39910bc1dcd564cb79f9991-240x240.png",
  "logo_dark_url": null,
  "id": "3da622c3-8b23-4923-b67e-1f515f978215",
  "slug": "3pl-tek",
  "ext_tsp_id": "019d6a63-e072-7bcf-a03b-e51a72a4c855",
  "created_at": "2026-01-26T15:40:23.624104Z",
  "updated_at": "2026-04-15T23:09:41.743125Z",
  "registry": "fmcsa",
  "compliance_status": "compliant"
}
```

### Get Trailer (`/v2/telematics/trailers/{trailer_id}`)

- **Status**: OK
- **Latency (ms)**: 176
- **Row count**: 0
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "fleet_id": "405f1ac5-1a52-4ac1-b149-248b96dd8a8b",
  "fleet_ref": "sandbox",
  "id": "fa2e5693-3c52-4497-99a0-dad3fa809e3e",
  "created_at": "2026-04-16T18:25:22.516657Z",
  "updated_at": "2026-04-16T18:25:22.516657Z",
  "deleted_at": null,
  "connection_id": "4cd17be0-0362-45aa-91f3-c0d6aaeaaf83",
  "tsp_id": "b480ecc4-3fa9-419a-9838-bd8901a39c17",
  "tsp_slug": "isaac",
  "source_name": "isaac",
  "source_data": {},
  "source_id": "2c818aa6-a8ca-5c7e-bad8-1031d4b9ced5",
  "source_data_hash": "41bfc3be99d927aef7a94251dc1bd2b31b73c5a5053b99d225484b9fbba5d845",
  "occurred_at": "2026-04-16T18:25:33.369806Z",
  "execution_id": null,
  "schedule_id": null,
  "extras": {},
  "trailer_name": "trailer_242ee4d9",
  "oem": null,
  "model_type": null,
  "model_year": null,
  "vin": null,
  "license_plate_region": "QC",
  "license_plate_country": "CAN",
  "license_plate_number": "PLT-241a51",
  "started_at": null,
  "ended_at": null,
  "is_active": true,
  "status": "active",
  "notes": null,
  "eld_id": null,
  "eld_serial_number": null,
  "eld_device_type": null,
  "eld_product_id": null,
  "total_axles": null,
  "trailer_groups": {},
  "external_id": null,
  "trailer_length": null,
  "trailer_type": null,
  "speed_unit": null,
  "odometer_unit": null,
  "fuel_unit": null,
  "fuel_capacity": null,
  "engine_type": null
}
```

### Get User (`/v2/telematics/users/{user_id}`)

- **Status**: OK
- **Latency (ms)**: 182
- **Row count**: 0
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "fleet_id": "405f1ac5-1a52-4ac1-b149-248b96dd8a8b",
  "fleet_ref": "sandbox",
  "id": "b613baf5-86ca-4e06-8b6f-f4350517a5ea",
  "created_at": "2026-04-01T17:17:36.493154Z",
  "updated_at": "2026-04-17T01:29:22.093316Z",
  "deleted_at": null,
  "connection_id": "0c6995b7-8c10-4aef-b1c2-bbd53481ad62",
  "tsp_id": "ee3c32b4-25c0-43d7-876f-e644cabc62c8",
  "tsp_slug": "motive",
  "source_name": "motive",
  "source_data": {},
  "source_id": "dc28ccff-8aed-5816-9a92-98cd8d5580e3",
  "source_data_hash": "133bafb36cfcaed2d9496fdd96625bbd26ebb9f095253299242f606dd42d5a28",
  "occurred_at": "2026-04-17T01:29:22.316543Z",
  "execution_id": "019d4a0c-af64-76e5-bbdb-5abb5b6759c2",
  "schedule_id": "019cdef2-6e08-7c92-81d5-57602522d63e",
  "extras": {},
  "username": null,
  "started_at": "2026-04-01T17:07:19Z",
  "ended_at": null,
  "is_active": true,
  "status": "ACTIVE",
  "is_driver": false,
  "user_designation": null,
  "user_email": "bb9d2a6a380a@sandbox.com",
  "first_name": "Driver_5f4c74",
  "last_name": "Last_282c8c",
  "phone_number": "555-8d2f7a9",
  "country_code": null,
  "license_country": null,
  "license_region": null,
  "license_number": null,
  "license_expiration": null,
  "employee_number": "EMP-65d5918a",
  "company_groups": {},
  "private_user_groups": {},
  "report_groups": {},
  "security_groups": {},
  "authority_name": null,
  "authority_address": null,
  "company_name": null,
  "company_address": null,
  "carrier_number": null,
  "last_tsp_login": "2026-04-17T01:21:00Z",
  "notes": null,
  "hos_ruleset_code": null,
  "allow_yard_move": null,
  "allow_personal_conveyance": null,
  "allow_adverse_driving": null,
  "default_time_zone": null
}
```

### Get Vehicle (`/v2/telematics/vehicles/{vehicle_id}`)

- **Status**: OK
- **Latency (ms)**: 161
- **Row count**: 0
- **Used for**: _placeholder — e.g. fleet overview, HOS, safety, locations_

**Sample record**

```json
{
  "fleet_id": "405f1ac5-1a52-4ac1-b149-248b96dd8a8b",
  "fleet_ref": "sandbox",
  "id": "e6b923c9-8d2a-4900-af4b-1469cbeb678f",
  "created_at": "2026-03-10T15:22:31.773081Z",
  "updated_at": "2026-04-17T01:16:23.317339Z",
  "deleted_at": null,
  "connection_id": "79313565-ec27-4616-8023-07ee31e460c1",
  "tsp_id": "0d5df06e-3f7e-4f36-89b3-5e537c3d514a",
  "tsp_slug": "geotab",
  "source_name": "geotab",
  "source_data": {},
  "source_id": "cccc3a6b-a63c-52bc-8d52-06cc54915972",
  "source_data_hash": "2db786e1231bfa8d1adc1999a1b11b3238482b680c36b0225a1660100331f641",
  "occurred_at": "2026-04-17T01:16:24.999285Z",
  "execution_id": "019cecd1-bf23-71ef-9520-abca1153f66e",
  "schedule_id": "019cd856-dbb8-7fa1-8b2c-89b442b6b714",
  "extras": {},
  "vehicle_name": "vehicle_325322ed",
  "oem": null,
  "model_type": null,
  "model_year": null,
  "vin": "VIN-b3faee4ce0122",
  "engine_vin": "VIN-b3faee4ce0122",
  "license_plate_region": "",
  "license_plate_country": null,
  "license_plate_number": "PLT-d3b996",
  "started_at": "2023-08-24T15:24:40.683000Z",
  "ended_at": "2050-01-01T00:00:00Z",
  "is_active": true,
  "status": "IN_SERVICE",
  "notes": "notes_afbc1b4a",
  "eld_id": null,
  "eld_serial_number": "ser_ceaefda5",
  "eld_device_type": "GO9",
  "eld_product_id": "120",
  "total_axles": null,
  "vehicle_groups": {},
  "external_id": null,
  "speed_unit": null,
  "odometer_unit": null,
  "fuel_unit": null,
  "fuel_capacity": null,
  "engine_type": null
}
```

## Section 2: Evaluated but not used (with reasoning)

### List Integrations Per Tsp (`/v2/integrations/tsps`)

- **Status**: OK
- **Why not (seed)**: Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI.


**Sample**
```json
{
  "tsp_id": "847de217-150f-4699-9090-3cefc67f06ba",
  "slug": "raven",
  "source_name": "raven",
  "integrations": {
    "asset": "not_supported",
    "driver_association": "not_supported",
    "driver_vehicle_association": "not_supported",
    "driver_event_log": "not_supported",
    "driver_safety_event": "not_supported",
    "dvir_log": "not_supported",
    "dvir_log_defect": "not_supported",
    "engine_log": "not_supported",
    "engine_status": "not_supported",
    "fuel_transaction": "not_supported",
    "hos_availability": "not_supported",
    "hos_daily_snapshot": "not_supported",
    "hos_event": "not_supported",
    "hos_event_annotation": "not_supported",
    "hos_event_attachment": "not_supported",
    "hos_violation": "not_supported",
    "ifta_summary": "not_supported",
    "location_segment": "not_supported",
    "message": "not_supported",
    "user": "not_supported",
    "vehicle": "not_supported",
    "vehicle_location": "not_supported",
    "vehicle_sensor": "not_supported",
    "vehicle_region_segment": "not_supported",
    "trailer": "not_supported",
    "trailer_association": "not_supported",
    "trailer_vehicle_association": "not_supported",
    "trailer_location": "not_supported",
    "trailer_status": "not_supported"
  },
  "implemented_count": 0,
  "not_implemented_count": 0,
  "not_supported_count": 29
}
```

### List Webhook Subscriptions (`/v2/notifications/webhooks`)

- **Status**: OK
- **Why not (seed)**: Webhook subscriptions — Sandbox fleet does not deliver events via EDA; use REST for pilot. Subscribing to webhooks for the Sandbox fleet does not work as expected because that fleet is hydrated outside the normal event-driven path (EDA). Use REST endpoints for Phase 0 / demos.


**Sample**
```json
{
  "id": "019ca956-8481-771f-82fe-ce9b32c86626",
  "url": "https://catena.angrist.net/*****",
  "event_name": "invitation.created",
  "filters": null,
  "secret": "*****",
  "status": "active",
  "created_at": "2026-03-01T12:19:05.474081Z",
  "updated_at": "2026-03-01T12:19:05.474081Z"
}
```

### List Partners (`/v2/orgs/partners`)

- **Status**: OK
- **Why not (seed)**: Partners admin surface — not required for initial underwriting views


**Sample**
```json
{
  "name": "Catena Candidates",
  "description": "Catena Candidates",
  "websites": [
    "https://candidates.catenaclearing.io/"
  ],
  "categories": [
    "Maintenance & Vehicle Health"
  ],
  "is_sandbox": false,
  "parent_partner_id": null,
  "id": "b43575ec-f3d4-486e-8ee0-c88fd63dc3ed",
  "slug": "catena-candidates",
  "created_at": "2026-02-19T19:38:17.884171Z",
  "updated_at": "2026-02-19T19:38:17.884171Z"
}
```

### List HOS Event Codes (`/v2/telematics/ref-hos-event-codes`)

- **Status**: OK
- **Why not (seed)**: Lookup table — cached at startup, not a primary data surface


**Sample**
```json
{
  "eld_code": "1",
  "event_code": "CERT1",
  "eld_event_type_name": "CERTIFICATION",
  "eld_event_type_description": "A driver's certification of records",
  "eld_event_type_code": "4",
  "description": "Driver's 1st certification of a daily record"
}
```

### List HOS Malfunction Codes (`/v2/telematics/ref-hos-malfunction-codes`)

- **Status**: OK
- **Why not (seed)**: Lookup table — cached at startup, not a primary data surface


**Sample**
```json
{
  "category": "Diagnostic",
  "description": "Engine synchronization data diagnostic event (temporary loss of ECM-required data sources)",
  "malfunction_code": "DIAG_ENGINE_SYNC",
  "eld_code": "2"
}
```

### List HOS Record Origins (`/v2/telematics/ref-hos-record-origins`)

- **Status**: OK
- **Why not (seed)**: Lookup table — cached at startup, not a primary data surface


**Sample**
```json
{
  "description": "Automatically recorded by ELD",
  "eld_code": "1",
  "record_origin_code": "AUTO"
}
```

### List HOS Record Statuses (`/v2/telematics/ref-hos-record-statuses`)

- **Status**: OK
- **Why not (seed)**: Lookup table — cached at startup, not a primary data surface


**Sample**
```json
{
  "eld_code": "1",
  "record_status_code": "ACTIVE",
  "description": "Active"
}
```

### List HOS Regions (`/v2/telematics/ref-hos-regions`)

- **Status**: OK
- **Why not (seed)**: Lookup table — cached at startup, not a primary data surface


**Sample**
```json
{
  "country_name": "Canada",
  "region_code_iso2": "AB",
  "region_code": "CA-AB",
  "region_name": "ALBERTA",
  "country_code": "CA"
}
```

### List HOS Rulesets (`/v2/telematics/ref-hos-rulesets`)

- **Status**: OK
- **Why not (seed)**: Lookup table — cached at startup, not a primary data surface


**Sample**
```json
{
  "jurisdiction_type": "Provincial",
  "max_cycle_hours": 70,
  "restart_frequency_days": null,
  "is_passenger": false,
  "max_drive_hours_per_day": null,
  "is_sleeper_split_allowed": null,
  "is_railroad_exemption": false,
  "hos_ruleset_code": "CA_AB_PROV_PROP_70_7",
  "max_work_hours_per_day": null,
  "sleeper_split_notes": null,
  "is_oilfield": false,
  "issue_authority": "Transport Canada",
  "min_offduty_per_day": null,
  "is_team_rules": false,
  "is_farm_product": false,
  "is_break_required": null,
  "is_big_day_allowed": null,
  "is_flammable": false,
  "region": "CA-AB",
  "break_interval_hours": null,
  "is_short_haul_exemption": false,
  "is_school_pupil": false,
  "hos_ruleset_name": "Alberta Intra - 70h/7d",
  "region_code": "CA-AB",
  "is_restart_allowed": null,
  "short_haul_airmiles": null,
  "is_seasonal_exemption": false,
  "cycle_days": 7,
  "restart_hours": null,
  "short_haul_max_duty_hours": null,
  "is_special_exemption": null
}
```

### List HOS Violation Codes (`/v2/telematics/ref-hos-violation-codes`)

- **Status**: OK
- **Why not (seed)**: Lookup table — cached at startup, not a primary data surface


**Sample**
```json
{
  "name": "Break taken too late",
  "description": "Break taken after exceeding the maximum hours before break.",
  "violation_code": "BR_LATE",
  "category": "Rest"
}
```

### List Timezones (`/v2/telematics/ref-timezones`)

- **Status**: OK
- **Why not (seed)**: Lookup table — cached at startup, not a primary data surface


**Sample**
```json
{
  "timezone_code": "AMER_ADAK",
  "timezone": "America/Adak",
  "dst_utc_offset_minutes": -540,
  "dst_end_rule": "First Sunday in November 02:00 local time",
  "standard_utc_offset_minutes": -600,
  "observes_dst": true,
  "dst_start_rule": "Second Sunday in March 02:00 local time"
}
```

### List Trailer Locations (`/v2/telematics/trailer-locations`)

- **Status**: OK
- **Why not (seed)**: Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI.


**Sample**
```json
{
  "fleet_id": "405f1ac5-1a52-4ac1-b149-248b96dd8a8b",
  "fleet_ref": "sandbox",
  "id": "79306a33-fff9-4b2b-b533-0dc95f858e75",
  "created_at": "2026-03-10T16:12:29.506862Z",
  "updated_at": "2026-04-17T01:29:21.311794Z",
  "deleted_at": null,
  "connection_id": "79313565-ec27-4616-8023-07ee31e460c1",
  "tsp_id": "0d5df06e-3f7e-4f36-89b3-5e537c3d514a",
  "tsp_slug": "geotab",
  "source_name": "geotab",
  "source_data": {},
  "source_id": "e7658235-a3c6-5f90-8225-ab130cbeb501",
  "source_data_hash": "3babbc669d987b8f661c75cbd3de7debbf5a1ad50c52c77a7a54a4b3cfd21314",
  "occurred_at": "2026-04-17T01:29:19.357000Z",
  "execution_id": null,
  "schedule_id": null,
  "extras": {},
  "trailer_id": "efe8b1cf-50e1-4101-bedd-199fe9f711f0",
  "source_trailer_id": "trl_947b973d",
  "source_vehicle_id": "veh_d08ab9bc",
  "vehicle_id": "11cb0dcf-bce6-49ac-9f85-cc2e6334712c",
  "location": {
    "type": "Point",
    "coordinates": [
      -88.1530914,
      41.5221214
    ],
    "bbox": null
  },
  "h3_index_11": 626675743016566800,
  "inferred_address": {
    "city": null,
    "province": null,
    "country_code": null
  }
}
```

### List Vehicle Sensor Events (`/v2/telematics/vehicle-sensor-events`)

- **Status**: OK
- **Why not (seed)**: Sensor stream — optional enrichment beyond core HOS/location/safety signals


**Sample**
```json
{
  "items": [],
  "total": 0,
  "current_page": "Pg%3D%3D",
  "current_page_backwards": "PA%3D%3D",
  "previous_page": null,
  "next_page": null
}
```

### createFuelTransaction (`(not in public OpenAPI)`)

- **Status**: NOT_IN_PUBLIC_SPEC
- **Why not (seed)**: No fuel transaction paths in published telematics OpenAPI.



### createMessage (`(not in public OpenAPI)`)

- **Status**: NOT_IN_PUBLIC_SPEC
- **Why not (seed)**: No messaging paths in published telematics OpenAPI.



### createUser (`(not in public OpenAPI)`)

- **Status**: NOT_IN_PUBLIC_SPEC
- **Why not (seed)**: Telematics users collection is GET-only in published OpenAPI.



### createVehicle (`(not in public OpenAPI)`)

- **Status**: NOT_IN_PUBLIC_SPEC
- **Why not (seed)**: Telematics vehicles collection is GET-only in published OpenAPI.



### getDataFreshness (`(not in public OpenAPI)`)

- **Status**: NOT_IN_PUBLIC_SPEC
- **Why not (seed)**: No dedicated data-freshness route in published OpenAPI; connection GET schema does not expose freshness fields.



### getResourceOperation (`(not in public OpenAPI)`)

- **Status**: NOT_IN_PUBLIC_SPEC
- **Why not (seed)**: No matching paths in catena-sdk-go specs.



### listDriverVehicleAssociations (`(not in public OpenAPI)`)

- **Status**: NOT_IN_PUBLIC_SPEC
- **Why not (seed)**: No association list paths in published OpenAPI.



### listEngineStatuses (`(not in public OpenAPI)`)

- **Status**: NOT_IN_PUBLIC_SPEC
- **Why not (seed)**: No engine-status paths; closest reads are engine-logs and vehicle-sensor-events.



### listFuelTransactions (`(not in public OpenAPI)`)

- **Status**: NOT_IN_PUBLIC_SPEC
- **Why not (seed)**: No fuel transaction paths in published telematics OpenAPI.



### listMessages (`(not in public OpenAPI)`)

- **Status**: NOT_IN_PUBLIC_SPEC
- **Why not (seed)**: No messaging paths in published telematics OpenAPI.



### listResourceOperations (`(not in public OpenAPI)`)

- **Status**: NOT_IN_PUBLIC_SPEC
- **Why not (seed)**: No matching paths in catena-sdk-go specs (telematics, integrations, orgs, notifications, authentication).



### listTrailerVehicleAssociations (`(not in public OpenAPI)`)

- **Status**: NOT_IN_PUBLIC_SPEC
- **Why not (seed)**: No association list paths in published OpenAPI.



### listVehicleRegionSegments (`(not in public OpenAPI)`)

- **Status**: NOT_IN_PUBLIC_SPEC
- **Why not (seed)**: No region-segment paths in published telematics OpenAPI.



### updateUser (`(not in public OpenAPI)`)

- **Status**: NOT_IN_PUBLIC_SPEC
- **Why not (seed)**: Telematics users collection is GET-only in published OpenAPI.



### updateVehicle (`(not in public OpenAPI)`)

- **Status**: NOT_IN_PUBLIC_SPEC
- **Why not (seed)**: Telematics vehicles collection is GET-only in published OpenAPI.



### Revoke Token (`/protocol/openid-connect/revoke`)

- **Status**: OK_OAUTH_VIA_CLIENT
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot



### Get Token (`/protocol/openid-connect/token`)

- **Status**: OK_OAUTH_VIA_CLIENT
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot



### Create Connection (`/v2/integrations/connections`)

- **Status**: SKIPPED_WRITE
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot

**Request body (OpenAPI excerpt)**
```
{"required":true,"content":{"application/json":{"schema":{"$ref":"#/components/schemas/ConnectionCreate"}}}}
```


### Backfill Schedules (`/v2/integrations/connections/schedules/backfill`)

- **Status**: SKIPPED_WRITE
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot

**Request body (OpenAPI excerpt)**
```
{"content":{"application/json":{"schema":{"$ref":"#/components/schemas/ScheduleBackfillRequest"}}},"required":true}
```


### Create Webhook Subscription (`/v2/notifications/webhooks`)

- **Status**: SKIPPED_WRITE
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot Subscribing to webhooks for the Sandbox fleet does not work as expected because that fleet is hydrated outside the normal event-driven path (EDA). Use REST endpoints for Phase 0 / demos.

**Request body (OpenAPI excerpt)**
```
{"required":true,"content":{"application/json":{"schema":{"$ref":"#/components/schemas/WebhookCreate"}}}}
```


### Create Fleet (`/v2/orgs/fleets`)

- **Status**: SKIPPED_WRITE
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot

**Request body (OpenAPI excerpt)**
```
{"required":true,"content":{"application/json":{"schema":{"$ref":"#/components/schemas/FleetCreate"}}}}
```


### Create Invitation (`/v2/orgs/invitations`)

- **Status**: SKIPPED_WRITE
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot

**Request body (OpenAPI excerpt)**
```
{"required":true,"content":{"application/json":{"schema":{"$ref":"#/components/schemas/InvitationCreate"}}}}
```


### Create Partner (`/v2/orgs/partners`)

- **Status**: SKIPPED_WRITE
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot

**Request body (OpenAPI excerpt)**
```
{"required":true,"content":{"application/json":{"schema":{"$ref":"#/components/schemas/PartnerCreate"}}}}
```


### Create Share Agreement (`/v2/orgs/share_agreements`)

- **Status**: SKIPPED_WRITE
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot

**Request body (OpenAPI excerpt)**
```
{"required":true,"content":{"application/json":{"schema":{"$ref":"#/components/schemas/ShareAgreementCreate","description":"Details of the Share Agreement to create"}}}}
```


### Create Tsp (`/v2/orgs/tsps`)

- **Status**: SKIPPED_WRITE
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot

**Request body (OpenAPI excerpt)**
```
{"required":true,"content":{"application/json":{"schema":{"$ref":"#/components/schemas/TspCreate"}}}}
```


### Delete Connection (`/v2/integrations/connections/{connection_id}`)

- **Status**: SKIPPED_WRITE
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot

**Request body (OpenAPI excerpt)**
```
TODO: no requestBody on operation
```


### Delete Webhook Subscription (`/v2/notifications/webhooks/{webhook_id}`)

- **Status**: SKIPPED_WRITE
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot Subscribing to webhooks for the Sandbox fleet does not work as expected because that fleet is hydrated outside the normal event-driven path (EDA). Use REST endpoints for Phase 0 / demos.

**Request body (OpenAPI excerpt)**
```
TODO: no requestBody on operation
```


### Delete Fleet (`/v2/orgs/fleets/{fleet_id}`)

- **Status**: SKIPPED_WRITE
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot

**Request body (OpenAPI excerpt)**
```
TODO: no requestBody on operation
```


### Delete Invitation (`/v2/orgs/invitations/{invitation_id}`)

- **Status**: SKIPPED_WRITE
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot

**Request body (OpenAPI excerpt)**
```
TODO: no requestBody on operation
```


### Delete Partner (`/v2/orgs/partners/{partner_id}`)

- **Status**: SKIPPED_WRITE
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot

**Request body (OpenAPI excerpt)**
```
TODO: no requestBody on operation
```


### Delete Share Agreement (`/v2/orgs/share_agreements/{share_agreement_id}`)

- **Status**: SKIPPED_WRITE
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot

**Request body (OpenAPI excerpt)**
```
TODO: no requestBody on operation
```


### Delete Tsp (`/v2/orgs/tsps/{tsp_id}`)

- **Status**: SKIPPED_WRITE
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot

**Request body (OpenAPI excerpt)**
```
TODO: no requestBody on operation
```


### List Schedules (`/v2/integrations/connections/{connection_id}/schedules`)

- **Status**: ERROR
- **Why not (seed)**: Relevant for a batch processing workflow, not on-demand underwriting — flagged in product recommendations as the path to webhook-driven alerts



### Get Integrations Per Tsp (`/v2/integrations/tsps/{tsp_id}`)

- **Status**: OK
- **Why not (seed)**: Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI.


**Sample**
```json
{
  "tsp_id": "3da622c3-8b23-4923-b67e-1f515f978215",
  "slug": "3pl-tek",
  "source_name": "hos247",
  "integrations": {
    "asset": "not_supported",
    "driver_association": "not_supported",
    "driver_vehicle_association": "not_supported",
    "driver_event_log": "not_supported",
    "driver_safety_event": "not_supported",
    "dvir_log": "not_supported",
    "dvir_log_defect": "not_supported",
    "engine_log": "not_supported",
    "engine_status": "not_supported",
    "fuel_transaction": "not_supported",
    "hos_availability": "not_supported",
    "hos_daily_snapshot": "not_supported",
    "hos_event": "not_supported",
    "hos_event_annotation": "not_supported",
    "hos_event_attachment": "not_supported",
    "hos_violation": "not_supported",
    "ifta_summary": "not_supported",
    "location_segment": "not_supported",
    "message": "not_supported",
    "user": "implemented",
    "vehicle": "implemented",
    "vehicle_location": "implemented",
    "vehicle_sensor": "not_supported",
    "vehicle_region_segment": "not_supported",
    "trailer": "not_supported",
    "trailer_association": "not_supported",
    "trailer_vehicle_association": "not_supported",
    "trailer_location": "not_supported",
    "trailer_status": "not_supported"
  },
  "implemented_count": 3,
  "not_implemented_count": 0,
  "not_supported_count": 26
}
```

### Get Event Schema (`/v2/notifications/schemas/{event_name}`)

- **Status**: OK
- **Why not (seed)**: Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI.


**Sample**
```json
{
  "openapi_schema": "{\"openapi\":\"3.0.3\",\"info\":{\"title\":\"webhook.created Event Schema\",\"version\":\"3.0\"},\"components\":{\"schemas\":{\"BaseWebhookEvent\":{\"description\":\"Base webhook event.\",\"properties\":{\"id\":{\"description\":\"The ID of the webhook\",\"format\":\"uuid\",\"title\":\"Webhook ID\",\"type\":\"string\"},\"url\":{\"description\":\"The URL we will send the event to\",\"title\":\"URL\",\"type\":\"string\"},\"event_name\":{\"$ref\":\"#/components/schemas/WebhookEventNameEnum\",\"description\":\"The name of the event\",\"title\":\"Event Name\"},\"filters\":{\"anyOf\":[{\"$ref\":\"#/components/schemas/WebhookFilters\"},{\"type\":\"null\"}],\"default\":null,\"description\":\"The filters applied to the webhook\",\"title\":\"Filters\"},\"status\":{\"$ref\":\"#/components/schemas/WebhookStatusEnum\",\"description\":\"The status of the webhook\",\"title\":\"Status\"}},\"required\":[\"id\",\"url\",\"event_name\",\"status\"],\"title\":\"BaseWebhookEvent\",\"type\":\"object\"},\"WebhookEventNameEnum\":{\"description\":\"Enum for webhook events\\n\\nWe need this list to be extensive and specific to avoid customers subscribing\\nto events that don't exist or are not supported.\",\"enum\":[\"invitation.created\",\"invitation.rejected\",\"invitation.declined\",\"invitation.viewed\",\"invitation.sent\",\"invitation.accepted\",\"invitation.expired\",\"invitation.deleted\",\"invitation.*\",\"connection.created\",\"connection.staled\",\"connection.*\",\"fleet_connection.created\",\"fleet_connection.*\",\"share_agreement.created\",\"share_agreement.updated\",\"share_agreement.deleted\",\"share_agreement.*\",\"webhook.created\",\"webhook.updated\",\"webhook.deleted\",\"webhook.staled\",\"webhook.activated\",\"webhook.paused\",\"webhook.*\",\"tsp.created\",\"vehicle.added\",\"vehicle.modified\",\"vehicle.removed\",\"vehicle.*\",\"trailer.added\",\"trailer.modified\",\"trailer.removed\",\"trailer.*\",\"trailer_location.added\",\"trailer_location.modified\",\"trailer_location.*\",\"execution.created\",\"execution.staled\",\"execution.failed\",\"execution.*\",\"schedule.deactivated\",\"schedule.*\",\"user.added\",\"user.modified\",\"user.removed\",\"user.*\",\"vehicle_location.added\",\"ifta_summary.added\",\"ifta_summary.modified\",\"ifta_summary.removed\",\"ifta_summary.*\",\"hos_availability.added\",\"hos_availability.modified\",\"hos_availability.removed\",\"hos_availability.*\",\"hos_daily_snapshot.added\",\"hos_daily_snapshot.modified\",\"hos_daily_snapshot.removed\",\"hos_daily_snapshot.*\",\"hos_event.added\",\"hos_event.modified\",\"hos_event.removed\",\"hos_event.*\",\"hos_violation.added\",\"hos_violation.modified\",\"hos_violation.removed\",\"hos_violation.*\",\"engine_log.added\",\"engine_log.modified\",\"engine_log.removed\",\"engine_log.*\"],\"title\":\"WebhookEventNameEnum\",\"type\":\"string\"},\"WebhookFilters\":{\"description\":\"Webhook filters\",\"properties\":{\"fleet_ids\":{\"anyOf\":[{\"items\":{\"format\":\"uuid\",\"type\":\"string\"},\"type\":\"array\"},{\"type\":\"null\"}],\"default\":null,\"description\":\"Filter by the IDs of the fleets\",\"title\":\"Fleet IDs\"},\"fleet_refs\":{\"anyOf\":[{\"items\":{\"type\":\"string\"},\"type\":\"array\"},{\"type\":\"null\"}],\"default\":null,\"description\":\"Filter by the references of the fleets. The reference is the ID of the fleet in the partner's system.\",\"title\":\"Fleet References\"}},\"title\":\"WebhookFilters\",\"type\":\"object\"},\"WebhookStatusEnum\":{\"description\":\"Enum for webhook status\",\"enum\":[\"active\",\"paused\",\"stale\",\"deleted\"],\"title\":\"WebhookStatusEnum\",\"type\":\"string\"},\"WebhookCreated\":{\"description\":\"Webhook created event.\",\"properties\":{\"version\":{\"description\":\"Version of the schema used for this event\",\"examples\":[\"1.0\",\"1.1\",\"2.0\"],\"pattern\":\"^\\\\d+\\\\.\\\\d+$\",\"title\":\"Schema Version\",\"type\":\"string\"},\"event_name\":{\"default\":\"webhook.created\",\"title\":\"Event Name\",\"type\":\"string\"},\"data\":{\"description\":\"The event payload, with one or more records of the specified type\",\"items\":{\"$ref\":\"#/components/schemas/BaseWebhookEvent\"},\"title\":\"Data / Payload\",\"type\":\"array\"},\"webhook_id\":{\"description\":\"Unique identifier for the webhook subscription that triggered this delivery\",\"format\":\"uuid\",\"title\":\"Webhook ID\",\"type\":\"string\"},\"timestamp\":{\"anyOf\":[{\"format\":\"date-time\",\"type\":\"string\"},{\"type\":\"null\"}],\"description\":\"ISO 8601 timestamp when the event occurred\",\"title\":\"Event Timestamp\"},\"id\":{\"anyOf\":[{\"format\":\"uuid\",\"type\":\"string\"},{\"type\":\"null\"}],\"description\":\"Unique identifier for this specific event instance (UUID v7 for time-ordered sorting)\",\"title\":\"Event ID\"},\"delivery_attempt\":{\"default\":0,\"description\":\"The number of times the event has been attempted to be delivered\",\"title\":\"Delivery Attempt\",\"type\":\"integer\"}},\"required\":[\"version\",\"data\",\"webhook_id\"],\"title\":\"WebhookCreated\",\"type\":\"object\"}}}}",
  "changelog": "Changed: root['properties']['event_name']['$ref'], root['properties']['status']['$ref']",
  "created_at": "2026-02-23T16:08:06.152891Z",
  "event_name": "webhook.created",
  "version": "3.0"
}
```

### Get Webhook Subscription (`/v2/notifications/webhooks/{webhook_id}`)

- **Status**: OK
- **Why not (seed)**: Webhook subscriptions — Sandbox fleet does not deliver events via EDA; use REST for pilot. Subscribing to webhooks for the Sandbox fleet does not work as expected because that fleet is hydrated outside the normal event-driven path (EDA). Use REST endpoints for Phase 0 / demos.


**Sample**
```json
{
  "id": "019ca956-8481-771f-82fe-ce9b32c86626",
  "url": "https://catena.angrist.net/*****",
  "event_name": "invitation.created",
  "filters": null,
  "secret": "*****",
  "status": "active",
  "created_at": "2026-03-01T12:19:05.474081Z",
  "updated_at": "2026-03-01T12:19:05.474081Z"
}
```

### Get Webhook Subscription Logs (`/v2/notifications/webhooks/{webhook_id}/logs`)

- **Status**: OK
- **Why not (seed)**: Webhook subscriptions — Sandbox fleet does not deliver events via EDA; use REST for pilot. Subscribing to webhooks for the Sandbox fleet does not work as expected because that fleet is hydrated outside the normal event-driven path (EDA). Use REST endpoints for Phase 0 / demos.


**Sample**
```json
{
  "items": [],
  "current_page": "Pg%3D%3D",
  "current_page_backwards": "PA%3D%3D",
  "previous_page": null,
  "next_page": null
}
```

### Get Webhook Subscription Metrics (`/v2/notifications/webhooks/{webhook_id}/metrics`)

- **Status**: OK
- **Why not (seed)**: Webhook subscriptions — Sandbox fleet does not deliver events via EDA; use REST for pilot. Subscribing to webhooks for the Sandbox fleet does not work as expected because that fleet is hydrated outside the normal event-driven path (EDA). Use REST endpoints for Phase 0 / demos.


**Sample**
```json
{
  "webhook_id": "019ca956-8481-771f-82fe-ce9b32c86626",
  "http_attempts": {
    "6h": 0,
    "24h": 0,
    "7d": 0,
    "14d": 0
  },
  "http_success_attempts": {
    "6h": 0,
    "24h": 0,
    "7d": 0,
    "14d": 0
  },
  "http_failure_attempts": {
    "6h": 0,
    "24h": 0,
    "7d": 0,
    "14d": 0
  },
  "message_count": {
    "6h": 0,
    "24h": 0,
    "7d": 0,
    "14d": 0
  },
  "message_success_count": {
    "6h": 0,
    "24h": 0,
    "7d": 0,
    "14d": 0
  },
  "success_rate": {
    "6h": null,
    "24h": null,
    "7d": null,
    "14d": null
  },
  "avg_response_time_ms": {
    "6h": 0,
    "24h": 0,
    "7d": 0,
    "14d": 0
  },
  "ewma_success_rate": null,
  "dlq_count": 0
}
```

### List Fleet Properties (`/v2/orgs/fleets/{fleet_id}/properties`)

- **Status**: OK
- **Why not (seed)**: Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI.



### Get Invitation (`/v2/orgs/invitations/{invitation_id}`)

- **Status**: OK
- **Why not (seed)**: Happy-path only for pilot; lifecycle management required for production hardening


**Sample**
```json
{
  "id": "019c776d-80e5-766d-9653-e91cbf3050fc",
  "created_at": "2026-02-19T19:43:11.077916Z",
  "magic_link": "https://connect.catenatelematics.com/?invite=019c776d-80e5-766d-9653-e91cbf3050fc",
  "expires_at": "2026-02-20T19:43:11.077892Z",
  "expires_in_hours": 24,
  "status": "accepted",
  "fleet_name": null,
  "accepted_at": "2026-02-19T19:43:23.944562Z",
  "pre_registration_access_token": "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICItOVA5ZEZRVnJiTzUwaTFObUxFT3JiQmlTMFFWVUpkbTFKSUpncW1tcWF3In0.eyJleHAiOjE3NzE1Mzc0MDMsImlhdCI6MTc3MTUzMDIwMywianRpIjoib25ydHJvOjg5MmJiZDVkLTFiMWEtNDgxMC1iODg1LWYwODhmZjRiZjRmOCIsImlzcyI6Imh0dHBzOi8vYXV0aC5jYXRlbmF0ZWxlbWF0aWNzLmNvbS9yZWFsbXMvY2F0ZW5hIiwic3ViIjoiOTgwZTZjZmYtMTkwZi00YzM1LTkzOTYtOTZkMWY5N2ZiNjg2IiwidHlwIjoiQmVhcmVyIiwiYXpwIjoicHJlLXJlZ2lzdHJhdGlvbi1jbGllbnQiLCJzaWQiOiI2YzUzOWQ1OS01NmNjLTQ4MTEtYTQzOC1hMGJhNjI5M2JjNmUiLCJhY3IiOiIxIiwiYWxsb3dlZC1vcmlnaW5zIjpbIioiXSwic2NvcGUiOiJvcGVuaWQgb3JnYW5pemF0aW9uIHNoYXJlLWFncmVlbWVudDpyZWFkIHBhcnRuZXI6cmVhZCBwcm9maWxlIGNvbm5lY3Rpb246Y3JlYXRlIGNvbm5lY3Rpb246cmVhZCBlbWFpbCIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJvcmciOnsiZmxlZXQtMDE5Yzc3NmQtODBlNS03NjZkLTk2NTMtZTkxY2JmMzA1MGZjLXllN3Z5eSI6eyJvcmdfdHlwZSI6WyJmbGVldCJdLCJpZCI6IjNhNmNmMzNiLTFmZDEtNGNlZS04ZWVhLWRiMzYxODJkZjU5MCJ9fSwicm9sZXMiOlsiaW1wZXJzb25hdG9yIl0sIm5hbWUiOiJGbGVldCBBZG1pbiIsInByZWZlcnJlZF91c2VybmFtZSI6ImZsZWV0LmFkbWluQDNhNmNmMzNiLTFmZDEtNGNlZS04ZWVhLWRiMzYxODJkZjU5MC5jb20iLCJnaXZlbl9uYW1lIjoiRmxlZXQiLCJmYW1pbHlfbmFtZSI6IkFkbWluIiwiZW1haWwiOiJmbGVldC5hZG1pbkAzYTZjZjMzYi0xZmQxLTRjZWUtOGVlYS1kYjM2MTgyZGY1OTAuY29tIn0.cOosg6WEGJfEoH8xVyQmqbBVO2j8EJFParRpICSQ_EiyXN1UAdZ2tAmyUBWPaBZ0IU3rgOJtYCeEwnzHFdqFif07cBVjRdoKbTRZ9pRNH-9cJp2dTXbLlA_qWbTbgtvTUAwfY9aQQ_o7GPGWzzW62CDquh6laGE3eY1BJ457Fr_AFZkyCCdIi8RWpGqJSxsZ8JHy6kBL0IqIdvCE9Mt-SrhKnSqyH3MNXiaFiyuz98gKIANiATi9XiPH7tlrf8dUeaEuIIRZQ_CbPkVLrxGpi73XkJ7cDngIDbsCMdNlhJ5MmJQXd5iA_1-GlS2EnqQ76CzGWS50hhBKDPpbma_8hQ",
  "pre_registration_refresh_token": "eyJhbGciOiJIUzUxMiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICIyMTVkMTlkOC1jZTAxLTQwYjgtOWY5Mi1hZDI4ZWE2NDMzMjcifQ.eyJleHAiOjE3NzM5NDk0MDMsImlhdCI6MTc3MTUzMDIwMywianRpIjoiODZmOWY1NTktNGM5ZC00ZjE3LWI0N2UtMjFmOWEwMDczN2NjIiwiaXNzIjoiaHR0cHM6Ly9hdXRoLmNhdGVuYXRlbGVtYXRpY3MuY29tL3JlYWxtcy9jYXRlbmEiLCJhdWQiOiJodHRwczovL2F1dGguY2F0ZW5hdGVsZW1hdGljcy5jb20vcmVhbG1zL2NhdGVuYSIsInN1YiI6Ijk4MGU2Y2ZmLTE5MGYtNGMzNS05Mzk2LTk2ZDFmOTdmYjY4NiIsInR5cCI6IlJlZnJlc2giLCJhenAiOiJwcmUtcmVnaXN0cmF0aW9uLWNsaWVudCIsInNpZCI6IjZjNTM5ZDU5LTU2Y2MtNDgxMS1hNDM4LWEwYmE2MjkzYmM2ZSIsInNjb3BlIjoib3BlbmlkIHdlYi1vcmlnaW5zIG9yZ2FuaXphdGlvbiBzaGFyZS1hZ3JlZW1lbnQ6cmVhZCByb2xlcyBwYXJ0bmVyOnJlYWQgcHJvZmlsZSBiYXNpYyBhY3IgY29ubmVjdGlvbjpjcmVhdGUgY29ubmVjdGlvbjpyZWFkIGVtYWlsIn0.t7_hbAmNGFyLEohi9-1MTBSM5syKZ-2r-vncDCm8XD96hrJjX--XXnVWHZJfew77wM7NAVN1nrRIgnvivEEeHA",
  "callback_url": null,
  "success_redirect_url": null,
  "failure_redirect_url": null,
  "limit_tsps": null,
  "fleet_id": "3a6cf33b-1fd1-4cee-8eea-db36182df590",
  "partner_slug": "catena-candidates",
  "partner_id": "b43575ec-f3d4-486e-8ee0-c88fd63dc3ed",
  "decline_reason": null,
  "declined_at": null,
  "fleet_ref": "demo",
  "permissions": {
    "user": "read_write",
    "asset": "read_write",
    "trailer": "read_write",
    "vehicle": "read_write",
    "dvir_log": "read_write",
    "hos_event": "read_write",
    "engine_log": "read_write",
    "ifta_summary": "read_write",
    "hos_violation": "read_write",
    "trailer_status": "read_write",
    "vehicle_sensor": "read_write",
    "dvir_log_defect": "read_write",
    "driver_event_log": "read_write",
    "hos_availability": "read_write",
    "location_segment": "read_write",
    "trailer_location": "read_write",
    "vehicle_location": "read_write",
    "hos_daily_snapshot": "read_write",
    "driver_safety_event": "read_write",
    "hos_event_annotation": "read_write",
    "hos_event_attachment": "read_write"
  },
  "fleet_email": null,
  "fleet_regulatory_id": null,
  "fleet_regulatory_id_type": null,
  "fleet_phone": null,
  "fleet_website": null,
  "fleet_country_code": null,
  "partner_provided_fleet_name": null,
  "partner_provided_fleet_email": null,
  "partner_provided_fleet_regulatory_id": null,
  "partner_provided_fleet_regulatory_id_type": null,
  "partner_provided_fleet_phone": null,
  "partner_provided_fleet_website": null,
  "partner_provided_fleet_country_code": null
}
```

### Get Partner (`/v2/orgs/partners/{partner_id}`)

- **Status**: OK
- **Why not (seed)**: Partners admin surface — not required for initial underwriting views


**Sample**
```json
{
  "name": "Catena Candidates",
  "description": "Catena Candidates",
  "websites": [
    "https://candidates.catenaclearing.io/"
  ],
  "categories": [
    "Maintenance & Vehicle Health"
  ],
  "is_sandbox": false,
  "parent_partner_id": null,
  "id": "b43575ec-f3d4-486e-8ee0-c88fd63dc3ed",
  "slug": "catena-candidates",
  "created_at": "2026-02-19T19:38:17.884171Z",
  "updated_at": "2026-02-19T19:38:17.884171Z"
}
```

### List Partner Properties (`/v2/orgs/partners/{partner_id}/properties`)

- **Status**: OK
- **Why not (seed)**: Partners admin surface — not required for initial underwriting views



### Get Dvir Log Defects (`/v2/telematics/dvir-logs/{dvir_log_id}/defects`)

- **Status**: OK
- **Why not (seed)**: Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI.


**Sample**
```json
{
  "items": [],
  "total": 0,
  "current_page": "Pg%3D%3D",
  "current_page_backwards": "PA%3D%3D",
  "previous_page": null,
  "next_page": null
}
```

### Get Hos Event Attachments (`/v2/telematics/hos-events/{hos_event_id}/attachments`)

- **Status**: OK
- **Why not (seed)**: Attachment binary metadata — not needed for tabular pilot UI


**Sample**
```json
{
  "items": [],
  "total": 0,
  "current_page": "Pg%3D%3D",
  "current_page_backwards": "PA%3D%3D",
  "previous_page": null,
  "next_page": null
}
```

### Get Vehicle Sensor Events (`/v2/telematics/vehicles/{vehicle_id}/sensor-events`)

- **Status**: ERROR
- **Why not (seed)**: Sensor stream — optional enrichment beyond core HOS/location/safety signals



### Update Connection (`/v2/integrations/connections/{connection_id}`)

- **Status**: SKIPPED_WRITE
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot

**Request body (OpenAPI excerpt)**
```
{"required":true,"content":{"application/json":{"schema":{"$ref":"#/components/schemas/ConnectionUpdate"}}}}
```


### Update Webhook Subscription (`/v2/notifications/webhooks/{webhook_id}`)

- **Status**: SKIPPED_WRITE
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot Subscribing to webhooks for the Sandbox fleet does not work as expected because that fleet is hydrated outside the normal event-driven path (EDA). Use REST endpoints for Phase 0 / demos.

**Request body (OpenAPI excerpt)**
```
{"required":true,"content":{"application/json":{"schema":{"$ref":"#/components/schemas/WebhookUpdate"}}}}
```


### Update Fleet (`/v2/orgs/fleets/{fleet_id}`)

- **Status**: SKIPPED_WRITE
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot

**Request body (OpenAPI excerpt)**
```
{"required":true,"content":{"application/json":{"schema":{"$ref":"#/components/schemas/FleetUpdate"}}}}
```


### Update Partner (`/v2/orgs/partners/{partner_id}`)

- **Status**: SKIPPED_WRITE
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot

**Request body (OpenAPI excerpt)**
```
{"required":true,"content":{"application/json":{"schema":{"$ref":"#/components/schemas/PartnerUpdate"}}}}
```


### Update Share Agreement (`/v2/orgs/share_agreements/{share_agreement_id}`)

- **Status**: SKIPPED_WRITE
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot

**Request body (OpenAPI excerpt)**
```
{"required":true,"content":{"application/json":{"schema":{"$ref":"#/components/schemas/ShareAgreementUpdate","description":"Details to be updated int Share Agreement"}}}}
```


### Update Tsp (`/v2/orgs/tsps/{tsp_id}`)

- **Status**: SKIPPED_WRITE
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot

**Request body (OpenAPI excerpt)**
```
{"required":true,"content":{"application/json":{"schema":{"$ref":"#/components/schemas/TspUpdate"}}}}
```


### Create Schedule (`/v2/integrations/connections/{connection_id}/schedules`)

- **Status**: SKIPPED_WRITE
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot

**Request body (OpenAPI excerpt)**
```
{"required":true,"content":{"application/json":{"schema":{"$ref":"#/components/schemas/ScheduleCreate"}}}}
```


### Replay Undelivered Messages From Dlq (`/v2/notifications/webhooks/{webhook_id}/replay`)

- **Status**: SKIPPED_WRITE
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot Subscribing to webhooks for the Sandbox fleet does not work as expected because that fleet is hydrated outside the normal event-driven path (EDA). Use REST endpoints for Phase 0 / demos.

**Request body (OpenAPI excerpt)**
```
TODO: no requestBody on operation
```


### Create Fleet Properties (`/v2/orgs/fleets/{fleet_id}/properties`)

- **Status**: SKIPPED_WRITE
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot

**Request body (OpenAPI excerpt)**
```
{"required":true,"content":{"application/json":{"schema":{"type":"array","items":{"$ref":"#/components/schemas/FleetPropertyCreate"},"title":"New"}}}}
```


### Accept Invitation (`/v2/orgs/invitations/{invitation_id}/accept`)

- **Status**: SKIPPED_WRITE
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot

**Request body (OpenAPI excerpt)**
```
{"required":true,"content":{"application/json":{"schema":{"$ref":"#/components/schemas/InvitationAccept"}}}}
```


### Decline Invitation (`/v2/orgs/invitations/{invitation_id}/decline`)

- **Status**: SKIPPED_WRITE
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot

**Request body (OpenAPI excerpt)**
```
{"required":true,"content":{"application/json":{"schema":{"$ref":"#/components/schemas/InvitationDecline"}}}}
```


### Create Partner Properties (`/v2/orgs/partners/{partner_id}/properties`)

- **Status**: SKIPPED_WRITE
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot

**Request body (OpenAPI excerpt)**
```
{"required":true,"content":{"application/json":{"schema":{"type":"array","items":{"$ref":"#/components/schemas/PartnerPropertyCreate"},"title":"New"}}}}
```


### Delete Schedule (`/v2/integrations/connections/{connection_id}/schedules/{schedule_id}`)

- **Status**: SKIPPED_WRITE
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot

**Request body (OpenAPI excerpt)**
```
TODO: no requestBody on operation
```


### Delete Fleet Property (`/v2/orgs/fleets/{fleet_id}/properties/{property_id}`)

- **Status**: SKIPPED_WRITE
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot

**Request body (OpenAPI excerpt)**
```
TODO: no requestBody on operation
```


### Delete Partner Property (`/v2/orgs/partners/{partner_id}/properties/{property_id}`)

- **Status**: SKIPPED_WRITE
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot

**Request body (OpenAPI excerpt)**
```
TODO: no requestBody on operation
```


### Get Schedule (`/v2/integrations/connections/{connection_id}/schedules/{schedule_id}`)

- **Status**: EMPTY_LIST_NO_DETAIL_PROBE
- **Why not (seed)**: Relevant for a batch processing workflow, not on-demand underwriting — flagged in product recommendations as the path to webhook-driven alerts



### List Executions (`/v2/integrations/connections/{connection_id}/schedules/{schedule_id}/executions`)

- **Status**: EMPTY_LIST_NO_DETAIL_PROBE
- **Why not (seed)**: Relevant for a batch processing workflow, not on-demand underwriting — flagged in product recommendations as the path to webhook-driven alerts



### Get Event Schema Version (`/v2/notifications/schemas/{event_name}/versions/{version}`)

- **Status**: ERROR
- **Why not (seed)**: Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI.



### Update Schedule (`/v2/integrations/connections/{connection_id}/schedules/{schedule_id}`)

- **Status**: SKIPPED_WRITE
- **Why not (seed)**: Out of scope for a read-heavy insurance pilot

**Request body (OpenAPI excerpt)**
```
{"required":true,"content":{"application/json":{"schema":{"$ref":"#/components/schemas/ScheduleUpdate"}}}}
```


## Section 3: Coverage summary

| Metric | Count |
| --- | ---:|
| Total catalog rows | 113 |
| Successful GET (list / no path params) | 40 |
| Successful GET (detail / path params) | 18 |
| Skipped writes (POST/PATCH/DELETE) | 31 |
| OAuth rows (documented only) | 2 |
| Phantom / not in public spec | 15 |
| Empty list → no detail probe | 2 |
| Errors | 5 |
| Coverage % (OK + skipped write + phantom + empty over non-OAuth rows) | 95.5% |

> Subscribing to webhooks for the Sandbox fleet does not work as expected because that fleet is hydrated outside the normal event-driven path (EDA). Use REST endpoints for Phase 0 / demos.
