import axios, { AxiosInstance } from "axios";
import https from "https";
import fs from "fs";
import path from "path";

// ── Module-level caches ───────────────────────────────────────────────────────
// Reused across invocations within the same warm serverless instance.

let _httpsAgent: https.Agent | null = null;

interface TokenCache {
  value: string;
  expiresAt: number; // epoch ms
}
let _tokenCache: TokenCache | null = null;

// ── HTTPS agent (mTLS) ────────────────────────────────────────────────────────

function loadCertificate(): Buffer {
  console.log("[EFI CLIENT INIT]", {
    hasClientId:    Boolean(process.env.EFI_CLIENT_ID),
    hasSecret:      Boolean(process.env.EFI_CLIENT_SECRET),
    hasCertBase64:  Boolean(process.env.EFI_CERT_BASE64),
    hasCertPath:    Boolean(process.env.EFI_CERTIFICATE_PATH),
    baseUrl:        process.env.EFI_BASE_URL ?? "(not set)",
  });

  // Preferred: path to PFX file on disk
  const certPath = process.env.EFI_CERTIFICATE_PATH;
  if (certPath) {
    const resolved = path.isAbsolute(certPath)
      ? certPath
      : path.resolve(process.cwd(), certPath);

    if (!fs.existsSync(resolved)) {
      throw new Error(`[efiClient] Certificate not found at: ${resolved}`);
    }

    const buf = fs.readFileSync(resolved);
    console.log("[EFI CLIENT INIT] cert source: EFI_CERTIFICATE_PATH, path:", resolved, "buffer length:", buf.length);
    return buf;
  }

  // Fallback: base64-encoded cert in env var
  if (process.env.EFI_CERT_BASE64) {
    const buf = Buffer.from(process.env.EFI_CERT_BASE64, "base64");
    console.log("[EFI CLIENT INIT] cert source: EFI_CERT_BASE64, buffer length:", buf.length);
    return buf;
  }

  throw new Error(
    "[efiClient] No certificate configured. Set EFI_CERTIFICATE_PATH (preferred) or EFI_CERT_BASE64 (fallback).",
  );
}

function getHttpsAgent(): https.Agent {
  if (_httpsAgent) return _httpsAgent;

  _httpsAgent = new https.Agent({
    pfx:        loadCertificate(),
    passphrase: "",
  });

  return _httpsAgent;
}

// ── OAuth token ───────────────────────────────────────────────────────────────

// Single authoritative base URL — must be the same for both OAuth and API calls.
const EFI_API_BASE = (process.env.EFI_BASE_URL || "https://api.efipay.com.br").trim();

async function fetchToken(agent: https.Agent): Promise<TokenCache> {
  const clientId     = process.env.EFI_CLIENT_ID;
  const clientSecret = process.env.EFI_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("[efiClient] EFI_CLIENT_ID or EFI_CLIENT_SECRET is not set");
  }

  console.log("[EFI TOKEN] fetching from:", `${EFI_API_BASE}/v1/authorize`);

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await axios.post<{ access_token: string; expires_in: number }>(
    `${EFI_API_BASE}/v1/authorize`,
    { grant_type: "client_credentials" },
    {
      httpsAgent: agent,
      headers: {
        Authorization:  `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
    },
  );

  const { access_token, expires_in } = res.data;

  console.log("[EFI TOKEN] obtained, expires_in:", expires_in);

  return {
    value:     access_token,
    expiresAt: Date.now() + (expires_in - 60) * 1000, // 60 s safety buffer
  };
}

async function getToken(agent: https.Agent): Promise<string> {
  const now = Date.now();
  if (_tokenCache && now < _tokenCache.expiresAt) return _tokenCache.value;
  _tokenCache = await fetchToken(agent);
  return _tokenCache.value;
}

// ── Public factories ──────────────────────────────────────────────────────────

function makeClient(agent: https.Agent, token: string, baseUrl: string): AxiosInstance {
  return axios.create({
    baseURL:    baseUrl,
    httpsAgent: agent,
    headers: {
      Authorization:  `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

/**
 * Generic Efí client — always uses EFI_API_BASE (https://api.efipay.com.br).
 * Pass baseUrlOverride only when explicitly targeting a different host.
 */
export async function getEfiClient(baseUrlOverride?: string): Promise<AxiosInstance> {
  const agent   = getHttpsAgent();
  const token   = await getToken(agent);
  const baseUrl = baseUrlOverride ? baseUrlOverride.trim() : EFI_API_BASE;

  if (!baseUrl.startsWith("http")) {
    throw new Error(`[efiClient] Invalid base URL: ${baseUrl || "missing"}`);
  }

  console.log("[EFI CLIENT] baseUrl:", baseUrl, "tokenBase:", EFI_API_BASE);
  return makeClient(agent, token, baseUrl);
}

/**
 * Efí PIX client — uses the same EFI_API_BASE as OAuth so the token is always valid.
 * Used for /v2/cob, /v2/loc, /v2/gn/pix/enviar.
 */
export async function getEfiPixClient(): Promise<AxiosInstance> {
  const agent = getHttpsAgent();
  const token = await getToken(agent);

  if (!EFI_API_BASE.startsWith("http")) {
    throw new Error(`[efiClient] Invalid EFI_BASE_URL: ${EFI_API_BASE || "missing"}`);
  }

  console.log("[EFI PIX CLIENT INIT]", { baseUrl: EFI_API_BASE, tokenBase: EFI_API_BASE });
  return makeClient(agent, token, EFI_API_BASE);
}
