export interface HubspotOAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  hubId: string;
  hubDomain?: string;
  user?: string;
}

const STORAGE_KEY = 'hubspot_oauth_tokens';

export function getSavedHubspotTokens(): HubspotOAuthTokens | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.expiresAt || !parsed.hubId) return null;
    return {
      accessToken: String(parsed.accessToken),
      refreshToken: String(parsed.refreshToken),
      expiresAt: Number(parsed.expiresAt),
      hubId: String(parsed.hubId),
      hubDomain: parsed.hubDomain ? String(parsed.hubDomain) : undefined,
      user: parsed.user ? String(parsed.user) : undefined,
    };
  } catch (err) {
    console.warn('Failed to parse saved HubSpot OAuth tokens', err);
    return null;
  }
}

export function saveHubspotTokens(tokens: HubspotOAuthTokens) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
  } catch (err) {
    console.warn('Failed to save HubSpot OAuth tokens', err);
  }
}

export function clearHubspotTokens() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Failed to clear HubSpot OAuth tokens', err);
  }
}

export function getHubspotHeaders(hubspotSettings: { accessToken?: string } = {}, portalId?: string | null) {
  const headers: Record<string, string> = {};

  if (hubspotSettings.accessToken) {
    headers.Authorization = `Bearer ${hubspotSettings.accessToken}`;
    return headers;
  }

  const tokens = getSavedHubspotTokens();
  if (!tokens) return headers;
  if (portalId && tokens.hubId !== portalId) return headers;

  headers['X-HubSpot-Portal-Id'] = tokens.hubId;
  headers['X-HubSpot-OAuth-Access-Token'] = tokens.accessToken;
  headers['X-HubSpot-OAuth-Refresh-Token'] = tokens.refreshToken;
  headers['X-HubSpot-OAuth-Expires-At'] = String(tokens.expiresAt);
  headers['X-HubSpot-OAuth-Hub-Id'] = tokens.hubId;
  if (tokens.hubDomain) headers['X-HubSpot-OAuth-Hub-Domain'] = tokens.hubDomain;
  return headers;
}

export function handleHubspotResponse(response: Response) {
  try {
    const accessToken = response.headers.get('X-HubSpot-OAuth-Access-Token');
    const refreshToken = response.headers.get('X-HubSpot-OAuth-Refresh-Token');
    const expiresAt = response.headers.get('X-HubSpot-OAuth-Expires-At');
    const hubId = response.headers.get('X-HubSpot-OAuth-Hub-Id');
    const hubDomain = response.headers.get('X-HubSpot-OAuth-Hub-Domain') || undefined;
    const user = response.headers.get('X-HubSpot-OAuth-User') || undefined;

    if (!accessToken || !refreshToken || !expiresAt || !hubId) {
      return;
    }

    const expiresAtNumber = Number(expiresAt);
    if (!Number.isFinite(expiresAtNumber)) return;

    saveHubspotTokens({
      accessToken,
      refreshToken,
      expiresAt: expiresAtNumber,
      hubId,
      hubDomain,
      user,
    });
  } catch (err) {
    console.warn('Failed to handle HubSpot response headers', err);
  }
}
