| Endpoint | Method | Category | Status | Used in Pilot? | Notes |
| --- | --- | --- | --- | --- | --- |
| /v2/integrations/connections | GET | Connections | OK | Yes | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/integrations/tsps | GET | TSP Integrations | OK | No | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/notifications/webhooks | GET | Webhook Subscriptions | OK | No | Webhook subscriptions — Sandbox fleet does not deliver events via EDA; use REST for pilot. Subscribing to webhooks for the Sandbox fleet does not work as expected because that fleet is hydrated outside the normal event-driven path (EDA). Use REST endpoints for Phase 0 / demos. |
| /v2/orgs/fleets | GET | Fleets | OK | Yes | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/orgs/invitations | GET | Invitations | OK | Yes | Happy-path only for pilot; lifecycle management required for production hardening |
| /v2/orgs/partners | GET | Partners | OK | No | Partners admin surface — not required for initial underwriting views |
| /v2/orgs/share_agreements | GET | Share Agreements | OK | Yes | Happy-path only for pilot; lifecycle management required for production hardening |
| /v2/orgs/tsps | GET | TSPs | OK | Yes | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/telematics/analytics/drivers | GET | Analytics | OK | Yes | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/telematics/analytics/drivers/time-series | GET | Analytics | OK | Yes | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/telematics/analytics/fleets | GET | Analytics | OK | Yes | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/telematics/analytics/fleets/time-series | GET | Analytics | OK | Yes | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/telematics/analytics/overview | GET | Analytics | OK | Yes | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/telematics/analytics/trailers | GET | Analytics | OK | Yes | Trailers are not a primary risk signal for commercial auto underwriting — would revisit for a freight broker or shipper customer |
| /v2/telematics/analytics/trailers/live-locations | GET | Analytics | OK | Yes | Trailers are not a primary risk signal for commercial auto underwriting — would revisit for a freight broker or shipper customer |
| /v2/telematics/analytics/trailers/time-series | GET | Analytics | OK | Yes | Trailers are not a primary risk signal for commercial auto underwriting — would revisit for a freight broker or shipper customer |
| /v2/telematics/analytics/vehicles | GET | Analytics | OK | Yes | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/telematics/analytics/vehicles/live-locations | GET | Analytics | OK | Yes | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/telematics/analytics/vehicles/time-series | GET | Analytics | OK | Yes | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/telematics/driver-safety-events | GET | Safety & Driver Behavior | OK | Yes | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/telematics/dvir-defects | GET | Compliance & Regulation | ERROR | Yes | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/telematics/dvir-logs | GET | Compliance & Regulation | OK | Yes | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/telematics/engine-logs | GET | Maintenance & Vehicle Health | OK | Yes | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/telematics/hos-availabilities | GET | Compliance & Regulation | OK | Yes | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/telematics/hos-daily-snapshots | GET | Compliance & Regulation | OK | Yes | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/telematics/hos-events | GET | Compliance & Regulation | OK | Yes | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/telematics/hos-violations | GET | Compliance & Regulation | OK | Yes | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/telematics/ifta-summaries | GET | Compliance & Regulation | ERROR | Yes | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/telematics/ref-hos-event-codes | GET | Reference Data (Supporting Tables) | OK | No | Lookup table — cached at startup, not a primary data surface |
| /v2/telematics/ref-hos-malfunction-codes | GET | Reference Data (Supporting Tables) | OK | No | Lookup table — cached at startup, not a primary data surface |
| /v2/telematics/ref-hos-record-origins | GET | Reference Data (Supporting Tables) | OK | No | Lookup table — cached at startup, not a primary data surface |
| /v2/telematics/ref-hos-record-statuses | GET | Reference Data (Supporting Tables) | OK | No | Lookup table — cached at startup, not a primary data surface |
| /v2/telematics/ref-hos-regions | GET | Reference Data (Supporting Tables) | OK | No | Lookup table — cached at startup, not a primary data surface |
| /v2/telematics/ref-hos-rulesets | GET | Reference Data (Supporting Tables) | OK | No | Lookup table — cached at startup, not a primary data surface |
| /v2/telematics/ref-hos-violation-codes | GET | Reference Data (Supporting Tables) | OK | No | Lookup table — cached at startup, not a primary data surface |
| /v2/telematics/ref-timezones | GET | Reference Data (Supporting Tables) | OK | No | Lookup table — cached at startup, not a primary data surface |
| /v2/telematics/trailer-locations | GET | Fleet Operations & Tracking | OK | No | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/telematics/trailers | GET | Fleet Operations & Tracking | OK | Yes | Trailers are not a primary risk signal for commercial auto underwriting — would revisit for a freight broker or shipper customer |
| /v2/telematics/users | GET | Drivers & Users | OK | Yes | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/telematics/vehicle-locations | GET | Fleet Operations & Tracking | OK | Yes | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/telematics/vehicle-sensor-events | GET | Fleet Operations & Tracking | OK | No | Sensor stream — optional enrichment beyond core HOS/location/safety signals |
| /v2/telematics/vehicles | GET | Fleet Operations & Tracking | OK | Yes | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| (not in public OpenAPI) | POST | Maintenance & Vehicle Health | NOT_IN_PUBLIC_SPEC | No | No fuel transaction paths in published telematics OpenAPI. |
| (not in public OpenAPI) | POST | Drivers & Users | NOT_IN_PUBLIC_SPEC | No | No messaging paths in published telematics OpenAPI. |
| (not in public OpenAPI) | POST | Drivers & Users | NOT_IN_PUBLIC_SPEC | No | Telematics users collection is GET-only in published OpenAPI. |
| (not in public OpenAPI) | POST | Fleet Operations & Tracking | NOT_IN_PUBLIC_SPEC | No | Telematics vehicles collection is GET-only in published OpenAPI. |
| (not in public OpenAPI) | GET | Integrations | NOT_IN_PUBLIC_SPEC | No | No dedicated data-freshness route in published OpenAPI; connection GET schema does not expose freshness fields. |
| (not in public OpenAPI) | GET | Resource Operations (meta) | NOT_IN_PUBLIC_SPEC | No | No matching paths in catena-sdk-go specs. |
| (not in public OpenAPI) | GET | Fleet Operations & Tracking | NOT_IN_PUBLIC_SPEC | No | No association list paths in published OpenAPI. |
| (not in public OpenAPI) | GET | Fleet Operations & Tracking | NOT_IN_PUBLIC_SPEC | No | No engine-status paths; closest reads are engine-logs and vehicle-sensor-events. |
| (not in public OpenAPI) | GET | Maintenance & Vehicle Health | NOT_IN_PUBLIC_SPEC | No | No fuel transaction paths in published telematics OpenAPI. |
| (not in public OpenAPI) | GET | Drivers & Users | NOT_IN_PUBLIC_SPEC | No | No messaging paths in published telematics OpenAPI. |
| (not in public OpenAPI) | GET | Resource Operations (meta) | NOT_IN_PUBLIC_SPEC | No | No matching paths in catena-sdk-go specs (telematics, integrations, orgs, notifications, authentication). |
| (not in public OpenAPI) | GET | Fleet Operations & Tracking | NOT_IN_PUBLIC_SPEC | No | No association list paths in published OpenAPI. |
| (not in public OpenAPI) | GET | Fleet Operations & Tracking | NOT_IN_PUBLIC_SPEC | No | No region-segment paths in published telematics OpenAPI. |
| (not in public OpenAPI) | PATCH | Drivers & Users | NOT_IN_PUBLIC_SPEC | No | Telematics users collection is GET-only in published OpenAPI. |
| (not in public OpenAPI) | PATCH | Fleet Operations & Tracking | NOT_IN_PUBLIC_SPEC | No | Telematics vehicles collection is GET-only in published OpenAPI. |
| /protocol/openid-connect/revoke | POST | OAuth 2.0 | OK_OAUTH_VIA_CLIENT | No | Out of scope for a read-heavy insurance pilot |
| /protocol/openid-connect/token | POST | OAuth 2.0 | OK_OAUTH_VIA_CLIENT | No | Out of scope for a read-heavy insurance pilot |
| /v2/integrations/connections | POST | Connections | SKIPPED_WRITE | No | Out of scope for a read-heavy insurance pilot |
| /v2/integrations/connections/schedules/backfill | POST | Connections | SKIPPED_WRITE | No | Out of scope for a read-heavy insurance pilot |
| /v2/notifications/webhooks | POST | Webhook Subscriptions | SKIPPED_WRITE | No | Out of scope for a read-heavy insurance pilot Subscribing to webhooks for the Sandbox fleet does not work as expected because that fleet is hydrated outside the normal event-driven path (EDA). Use REST endpoints for Phase 0 / demos. |
| /v2/orgs/fleets | POST | Fleets | SKIPPED_WRITE | No | Out of scope for a read-heavy insurance pilot |
| /v2/orgs/invitations | POST | Invitations | SKIPPED_WRITE | No | Out of scope for a read-heavy insurance pilot |
| /v2/orgs/partners | POST | Partners | SKIPPED_WRITE | No | Out of scope for a read-heavy insurance pilot |
| /v2/orgs/share_agreements | POST | Share Agreements | SKIPPED_WRITE | No | Out of scope for a read-heavy insurance pilot |
| /v2/orgs/tsps | POST | TSPs | SKIPPED_WRITE | No | Out of scope for a read-heavy insurance pilot |
| /v2/integrations/connections/{connection_id} | DELETE | Connections | SKIPPED_WRITE | No | Out of scope for a read-heavy insurance pilot |
| /v2/notifications/webhooks/{webhook_id} | DELETE | Webhook Subscriptions | SKIPPED_WRITE | No | Out of scope for a read-heavy insurance pilot Subscribing to webhooks for the Sandbox fleet does not work as expected because that fleet is hydrated outside the normal event-driven path (EDA). Use REST endpoints for Phase 0 / demos. |
| /v2/orgs/fleets/{fleet_id} | DELETE | Fleets | SKIPPED_WRITE | No | Out of scope for a read-heavy insurance pilot |
| /v2/orgs/invitations/{invitation_id} | DELETE | Invitations | SKIPPED_WRITE | No | Out of scope for a read-heavy insurance pilot |
| /v2/orgs/partners/{partner_id} | DELETE | Partners | SKIPPED_WRITE | No | Out of scope for a read-heavy insurance pilot |
| /v2/orgs/share_agreements/{share_agreement_id} | DELETE | Share Agreements | SKIPPED_WRITE | No | Out of scope for a read-heavy insurance pilot |
| /v2/orgs/tsps/{tsp_id} | DELETE | TSPs | SKIPPED_WRITE | No | Out of scope for a read-heavy insurance pilot |
| /v2/integrations/connections/{connection_id} | GET | Connections | OK | Yes | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/integrations/connections/{connection_id}/schedules | GET | Connections | ERROR | No | Relevant for a batch processing workflow, not on-demand underwriting — flagged in product recommendations as the path to webhook-driven alerts |
| /v2/integrations/tsps/{tsp_id} | GET | TSP Integrations | OK | No | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/notifications/schemas/{event_name} | GET | Webhook Event Schemas | OK | No | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/notifications/webhooks/{webhook_id} | GET | Webhook Subscriptions | OK | No | Webhook subscriptions — Sandbox fleet does not deliver events via EDA; use REST for pilot. Subscribing to webhooks for the Sandbox fleet does not work as expected because that fleet is hydrated outside the normal event-driven path (EDA). Use REST endpoints for Phase 0 / demos. |
| /v2/notifications/webhooks/{webhook_id}/logs | GET | Webhook Subscriptions | OK | No | Webhook subscriptions — Sandbox fleet does not deliver events via EDA; use REST for pilot. Subscribing to webhooks for the Sandbox fleet does not work as expected because that fleet is hydrated outside the normal event-driven path (EDA). Use REST endpoints for Phase 0 / demos. |
| /v2/notifications/webhooks/{webhook_id}/metrics | GET | Webhook Subscriptions | OK | No | Webhook subscriptions — Sandbox fleet does not deliver events via EDA; use REST for pilot. Subscribing to webhooks for the Sandbox fleet does not work as expected because that fleet is hydrated outside the normal event-driven path (EDA). Use REST endpoints for Phase 0 / demos. |
| /v2/orgs/fleets/{fleet_id} | GET | Fleets | OK | Yes | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/orgs/fleets/{fleet_id}/properties | GET | Fleets | OK | No | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/orgs/invitations/{invitation_id} | GET | Invitations | OK | No | Happy-path only for pilot; lifecycle management required for production hardening |
| /v2/orgs/partners/{partner_id} | GET | Partners | OK | No | Partners admin surface — not required for initial underwriting views |
| /v2/orgs/partners/{partner_id}/properties | GET | Partners | OK | No | Partners admin surface — not required for initial underwriting views |
| /v2/orgs/share_agreements/{share_agreement_id} | GET | Share Agreements | OK | Yes | Happy-path only for pilot; lifecycle management required for production hardening |
| /v2/orgs/tsps/{tsp_id} | GET | TSPs | OK | Yes | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/telematics/dvir-logs/{dvir_log_id}/defects | GET | Compliance & Regulation | OK | No | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/telematics/hos-events/{hos_event_id}/attachments | GET | Compliance & Regulation | OK | No | Attachment binary metadata — not needed for tabular pilot UI |
| /v2/telematics/trailers/{trailer_id} | GET | Fleet Operations & Tracking | OK | Yes | Trailers are not a primary risk signal for commercial auto underwriting — would revisit for a freight broker or shipper customer |
| /v2/telematics/users/{user_id} | GET | Drivers & Users | OK | Yes | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/telematics/vehicles/{vehicle_id} | GET | Fleet Operations & Tracking | OK | Yes | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/telematics/vehicles/{vehicle_id}/sensor-events | GET | Fleet Operations & Tracking | ERROR | No | Sensor stream — optional enrichment beyond core HOS/location/safety signals |
| /v2/integrations/connections/{connection_id} | PATCH | Connections | SKIPPED_WRITE | No | Out of scope for a read-heavy insurance pilot |
| /v2/notifications/webhooks/{webhook_id} | PATCH | Webhook Subscriptions | SKIPPED_WRITE | No | Out of scope for a read-heavy insurance pilot Subscribing to webhooks for the Sandbox fleet does not work as expected because that fleet is hydrated outside the normal event-driven path (EDA). Use REST endpoints for Phase 0 / demos. |
| /v2/orgs/fleets/{fleet_id} | PATCH | Fleets | SKIPPED_WRITE | No | Out of scope for a read-heavy insurance pilot |
| /v2/orgs/partners/{partner_id} | PATCH | Partners | SKIPPED_WRITE | No | Out of scope for a read-heavy insurance pilot |
| /v2/orgs/share_agreements/{share_agreement_id} | PATCH | Share Agreements | SKIPPED_WRITE | No | Out of scope for a read-heavy insurance pilot |
| /v2/orgs/tsps/{tsp_id} | PATCH | TSPs | SKIPPED_WRITE | No | Out of scope for a read-heavy insurance pilot |
| /v2/integrations/connections/{connection_id}/schedules | POST | Connections | SKIPPED_WRITE | No | Out of scope for a read-heavy insurance pilot |
| /v2/notifications/webhooks/{webhook_id}/replay | POST | Webhook Subscriptions | SKIPPED_WRITE | No | Out of scope for a read-heavy insurance pilot Subscribing to webhooks for the Sandbox fleet does not work as expected because that fleet is hydrated outside the normal event-driven path (EDA). Use REST endpoints for Phase 0 / demos. |
| /v2/orgs/fleets/{fleet_id}/properties | POST | Fleets | SKIPPED_WRITE | No | Out of scope for a read-heavy insurance pilot |
| /v2/orgs/invitations/{invitation_id}/accept | POST | Invitations | SKIPPED_WRITE | No | Out of scope for a read-heavy insurance pilot |
| /v2/orgs/invitations/{invitation_id}/decline | POST | Invitations | SKIPPED_WRITE | No | Out of scope for a read-heavy insurance pilot |
| /v2/orgs/partners/{partner_id}/properties | POST | Partners | SKIPPED_WRITE | No | Out of scope for a read-heavy insurance pilot |
| /v2/integrations/connections/{connection_id}/schedules/{schedule_id} | DELETE | Connections | SKIPPED_WRITE | No | Out of scope for a read-heavy insurance pilot |
| /v2/orgs/fleets/{fleet_id}/properties/{property_id} | DELETE | Fleets | SKIPPED_WRITE | No | Out of scope for a read-heavy insurance pilot |
| /v2/orgs/partners/{partner_id}/properties/{property_id} | DELETE | Partners | SKIPPED_WRITE | No | Out of scope for a read-heavy insurance pilot |
| /v2/integrations/connections/{connection_id}/schedules/{schedule_id} | GET | Connections | EMPTY_LIST_NO_DETAIL_PROBE | No | Relevant for a batch processing workflow, not on-demand underwriting — flagged in product recommendations as the path to webhook-driven alerts |
| /v2/integrations/connections/{connection_id}/schedules/{schedule_id}/executions | GET | Connections | EMPTY_LIST_NO_DETAIL_PROBE | No | Relevant for a batch processing workflow, not on-demand underwriting — flagged in product recommendations as the path to webhook-driven alerts |
| /v2/notifications/schemas/{event_name}/versions/{version} | GET | Webhook Event Schemas | ERROR | No | Evaluated for API completeness; not prioritized for Catena Risk Phase 0 pilot UI. |
| /v2/integrations/connections/{connection_id}/schedules/{schedule_id} | PATCH | Connections | SKIPPED_WRITE | No | Out of scope for a read-heavy insurance pilot |

> Subscribing to webhooks for the Sandbox fleet does not work as expected because that fleet is hydrated outside the normal event-driven path (EDA). Use REST endpoints for Phase 0 / demos.
