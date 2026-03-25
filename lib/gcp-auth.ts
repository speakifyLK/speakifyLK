import { GoogleAuth } from "google-auth-library";

const SCOPES = [
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/generative-language",
];
const EXPIRY_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

let cachedToken: string | null = null;
let cachedExpiry: number = 0;

function getServiceAccountKey(): Record<string, unknown> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_KEY environment variable is not set. " +
        "Add the service account JSON key to your .env or .env.local file."
    );
  }

  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_KEY is not valid JSON. " +
        "Ensure the environment variable contains the full service account JSON key."
    );
  }
}

let _auth: GoogleAuth | null = null;

function getOrCreateAuth(): GoogleAuth {
  if (!_auth) {
    const credentials = getServiceAccountKey();
    _auth = new GoogleAuth({
      credentials,
      scopes: SCOPES,
    });
  }
  return _auth;
}

export async function getAccessToken(): Promise<string> {
  const now = Date.now();

  if (cachedToken && now < cachedExpiry - EXPIRY_BUFFER_MS) {
    return cachedToken;
  }

  const auth = getOrCreateAuth();
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();

  if (!tokenResponse.token) {
    throw new Error("Failed to obtain OAuth2 access token from service account.");
  }

  cachedToken = tokenResponse.token;
  // Default token lifetime is 1 hour (3600s)
  cachedExpiry = now + 3600 * 1000;

  return cachedToken;
}

export async function getAuthHeaders(): Promise<{ Authorization: string }> {
  const token = await getAccessToken();
  return { Authorization: `Bearer ${token}` };
}
