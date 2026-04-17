/**
 * Node/tsx scripts do not use Next.js env loading. Load the same files devs use locally:
 * `.env` then `.env.local` (override) — mirrors Next.js precedence for secrets.
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Default import avoids CJS/ESM named-export interop issues under tsx (dotenv 17+).
dotenv.config({ path: path.join(ROOT, ".env") });
dotenv.config({ path: path.join(ROOT, ".env.local"), override: true });
