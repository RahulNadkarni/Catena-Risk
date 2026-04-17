/** Pinned OpenAPI source: see `openapi-endpoint-catalog.json` field `specSourceSha`. */
export const CATENA_OPENAPI_SPEC_SHA = "5dec2ea7540ab248960548b91cfe5b1d2141b744";

export class MethodNotInPublicSpecError extends Error {
  readonly methodName: string;
  constructor(methodName: string, detail: string) {
    super(
      `[Catena] ${methodName}: ${detail} (public OpenAPI pin: catena-sdk-go@${CATENA_OPENAPI_SPEC_SHA})`,
    );
    this.name = "MethodNotInPublicSpecError";
    this.methodName = methodName;
  }
}
