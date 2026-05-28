const express = require('express');
const axios = require('axios');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve static files from the React app (dist folder)
app.use(express.static(path.join(__dirname, 'dist')));

const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID;
const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET;
const HUBSPOT_REDIRECT_URI = process.env.HUBSPOT_REDIRECT_URI;

/**
 * In-memory store for installed accounts (replace with a DB in production).
 * Key: HubSpot portal/account ID, Value: token data
 */
const installedAccounts = {};

/**
 * Refresh an expired HubSpot OAuth access token and update the store.
 */
async function refreshAccessToken(hubId) {
  const account = installedAccounts[hubId];
  if (!account?.refresh_token) return false;
  try {
    const response = await axios.post(
      'https://api.hubapi.com/oauth/v1/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: HUBSPOT_CLIENT_ID,
        client_secret: HUBSPOT_CLIENT_SECRET,
        refresh_token: account.refresh_token,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    const { access_token, refresh_token: newRefreshToken, expires_in } = response.data;
    installedAccounts[hubId] = {
      ...account,
      access_token,
      refresh_token: newRefreshToken || account.refresh_token,
      expires_at: Date.now() + ((expires_in || 21600) * 1000),
    };
    console.log(`🔄 Token refreshed for portal ${hubId}`);
    return true;
  } catch (err) {
    console.error(`❌ Token refresh failed for portal ${hubId}:`, err.response?.data || err.message);
    return false;
  }
}

// --- Webhook Logic ---

/**
 * Webhook Receiver Endpoint
 * IMPORTANT: Set your Target URL in HubSpot Developer Portal -> Webhooks to:
 * https://nonmagnetical-berneice-satisfactorily.ngrok-free.dev/api/hubspot/webhooks
 */
app.post('/api/hubspot/webhooks', (req, res) => {
  const events = req.body;
  console.log(`📨 Received ${events.length} HubSpot webhook event(s)`);

  events.forEach(event => {
    console.log(`✅ App activity registered: ${event.eventType} from Portal: ${event.portalId}`);
  });

  // Always return 200 immediately
  res.status(200).send('OK');
});

/**
 * OAuth Callback — exchanges the authorization code for tokens.
 */
app.get('/oauth-callback', async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    console.error(`OAuth error: ${error} - ${error_description}`);
    return res.status(400).send(`<h2>OAuth Error</h2><p>${error_description}</p>`);
  }

  if (!code) return res.status(400).send('<h2>Missing code</h2>');

  try {
    const tokenResponse = await axios.post('https://api.hubapi.com/oauth/v1/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: HUBSPOT_CLIENT_ID,
        client_secret: HUBSPOT_CLIENT_SECRET,
        redirect_uri: HUBSPOT_REDIRECT_URI,
        code: code,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, refresh_token } = tokenResponse.data;
    const accountInfo = await axios.get('https://api.hubapi.com/oauth/v1/access-tokens/' + access_token);
    const { hub_id, hub_domain, user } = accountInfo.data;

    console.log(`✅ OAuth Successful for Portal: ${hub_id}`);

    const expiresAt = Date.now() + ((tokenResponse.data.expires_in || 21600) * 1000);
    installedAccounts[hub_id] = {
      hub_id,
      hub_domain,
      user,
      access_token,
      refresh_token,
      expires_at: expiresAt,
      installed_at: new Date().toISOString()
    };

    res.send(`<!DOCTYPE html>
      <html>
      <head><title>HubSpot Connected</title></head>
      <body style="font-family:sans-serif;text-align:center;padding:50px;background:#f8faff;">
        <div style="max-width:400px;margin:0 auto;padding:40px;background:white;border-radius:16px;box-shadow:0 8px 30px rgba(0,0,0,0.1);">
          <div style="font-size:56px;margin-bottom:16px;">✅</div>
          <h2 style="color:#00bda5;margin:0 0 8px 0;">HubSpot Connected!</h2>
          <p style="color:#555;margin:0 0 6px 0;">Portal <b>${hub_id}</b> is now connected.</p>
          ${hub_domain ? `<p style="color:#888;font-size:13px;margin:0 0 16px 0;">${hub_domain}</p>` : ''}
          <p style="color:#aaa;font-size:12px;">Closing this window automatically...</p>
        </div>
        <script>
          try {
            if (window.opener) {
              const message = ${JSON.stringify({
                type: 'HUBSPOT_OAUTH_SUCCESS',
                hub_id,
                user: user || '',
                hub_domain: hub_domain || '',
                access_token,
                refresh_token,
                expires_at: expiresAt
              })};
              window.opener.postMessage(message, '*');
              setTimeout(function() { window.close(); }, 2000);
            } else {
              document.querySelector('p:last-child').textContent = 'Connected! You can close this tab and return to the app.';
            }
          } catch(e) {
            console.error('postMessage failed:', e);
          }
        </script>
      </body>
      </html>
    `);
  } catch (err) {
    console.error('OAuth failed:', err.response?.data || err.message);
    res.status(500).send(`<h2>Failed</h2><pre>${JSON.stringify(err.response?.data || err.message, null, 2)}</pre>`);
  }
});

/**
 * Proxy middleware to inject HubSpot token if not provided by client
 */
const injectToken = async (req, res, next) => {
  try {
    const headerPortalId = req.headers['x-hubspot-portal-id'];
    const portalId = headerPortalId || req.query.portalId;
    const oauthAccessToken = req.headers['x-hubspot-oauth-access-token'];
    const oauthRefreshToken = req.headers['x-hubspot-oauth-refresh-token'];
    const oauthExpiresAt = req.headers['x-hubspot-oauth-expires-at'];
    const oauthHubId = req.headers['x-hubspot-oauth-hub-id'];

    const resolvedPortalId = portalId || oauthHubId;

    if (resolvedPortalId && !installedAccounts[resolvedPortalId] && oauthAccessToken && oauthRefreshToken && oauthHubId) {
      installedAccounts[resolvedPortalId] = {
        hub_id: oauthHubId,
        access_token: String(oauthAccessToken),
        refresh_token: String(oauthRefreshToken),
        expires_at: Number(oauthExpiresAt) || Date.now() + 3600 * 1000,
        installed_at: new Date().toISOString()
      };
      console.log(`🔁 Rehydrated HubSpot token for portal ${resolvedPortalId} from client headers`);
    }

    if (resolvedPortalId && installedAccounts[resolvedPortalId]) {
      const account = installedAccounts[resolvedPortalId];
      if (account.expires_at && Date.now() > account.expires_at - 5 * 60 * 1000) {
        console.log(`🔄 Auto-refreshing expiring token for portal ${resolvedPortalId}...`);
        const refreshed = await refreshAccessToken(resolvedPortalId);
        if (refreshed) {
          const refreshedAccount = installedAccounts[resolvedPortalId];
          res.setHeader('X-HubSpot-OAuth-Access-Token', refreshedAccount.access_token);
          res.setHeader('X-HubSpot-OAuth-Refresh-Token', refreshedAccount.refresh_token);
          res.setHeader('X-HubSpot-OAuth-Expires-At', String(refreshedAccount.expires_at));
          res.setHeader('X-HubSpot-OAuth-Hub-Id', String(refreshedAccount.hub_id));
          if (refreshedAccount.hub_domain) {
            res.setHeader('X-HubSpot-OAuth-Hub-Domain', String(refreshedAccount.hub_domain));
          }
          if (refreshedAccount.user) {
            res.setHeader('X-HubSpot-OAuth-User', String(refreshedAccount.user));
          }
        }
      }
      req.headers.authorization = `Bearer ${installedAccounts[resolvedPortalId].access_token}`;
    }
    next();
  } catch (err) {
    console.error('Token injection error:', err.message);
    next(); // Don't block the request if refresh fails
  }
};

app.use('/api/hubspot', injectToken);

/**
 * Proxy endpoint to HubSpot to avoid CORS issues.
 */
app.get('/api/hubspot/contacts', async (req, res) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.error('Contacts Error: No Authorization header found');
    return res.status(401).json({ error: 'Missing Authorization' });
  }

  try {
    const API_URL = "https://api.hubapi.com/crm/v3/objects/contacts?properties=firstname,lastname,phone&limit=100";

    const response = await axios.get(API_URL, {
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    res.json(response.data);
  } catch (error) {
    if (error.response?.status === 401) {
      console.error('HubSpot Contacts Error: Token is invalid or expired (401)');
    } else if (error.response?.status === 403) {
      console.error('HubSpot Contacts Error: Token lacks "contacts" scope (403)');
    } else {
      console.error('HubSpot Contacts Error:', error.message);
    }
    const status = error.response ? error.response.status : 500;
    const data = error.response ? error.response.data : { error: 'Internal Server Error' };
    res.status(status).json(data);
  }
});

/**
 * Fetch tickets for a contact
 */
app.get('/api/hubspot/tickets/:contactId', async (req, res) => {
  const { contactId } = req.params;
  const authHeader = req.headers.authorization;

  try {
    // 1. Get associations for tickets
    const assocUrl = `https://api.hubapi.com/crm/v3/associations/contacts/tickets/batch/read`;
    const assocResponse = await axios.post(assocUrl, {
      inputs: [{ id: contactId }]
    }, {
      headers: { 'Authorization': authHeader }
    });

    const ticketIds = assocResponse.data.results?.[0]?.to?.map(t => t.id) || [];

    if (ticketIds.length === 0) {
      return res.json({ results: [] });
    }

    // 2. Fetch ticket details
    const ticketsUrl = `https://api.hubapi.com/crm/v3/objects/tickets/batch/read`;
    const ticketsResponse = await axios.post(ticketsUrl, {
      properties: ["subject", "content", "hs_pipeline_stage", "createdate"],
      inputs: ticketIds.map(id => ({ id }))
    }, {
      headers: { 'Authorization': authHeader }
    });

    res.json(ticketsResponse.data);
  } catch (error) {
    console.error('HubSpot Tickets Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Helper to fetch the first available ticket pipeline and its first stage
 */
async function getTicketDefaults(authHeader) {
  try {
    const response = await axios.get("https://api.hubapi.com/crm/v3/pipelines/tickets", {
      headers: { 'Authorization': authHeader }
    });

    const firstPipeline = response.data.results?.[0];
    if (firstPipeline) {
      const firstStage = firstPipeline.stages?.[0];
      return {
        pipeline: firstPipeline.id,
        stage: firstStage?.id
      };
    }
  } catch (error) {
    console.error('Error fetching ticket defaults:', error.message);
  }
  return { pipeline: "default", stage: "new" };
}

/**
 * Create a new ticket and associate it with a contact
 */
app.post('/api/hubspot/tickets', async (req, res) => {
  const { subject, content, contactId, pipeline: bodyPipeline, stage: bodyStage } = req.body;
  const authHeader = req.headers.authorization;

  try {
    // Auto-discover pipeline and stage if not in body
    let pipeline = bodyPipeline || "default";
    let stage = bodyStage || "new";

    if (pipeline === "default" && stage === "new") {
      console.log('Auto-discovering ticket pipeline and stage...');
      const defaults = await getTicketDefaults(authHeader);
      pipeline = defaults.pipeline;
      stage = defaults.stage;
      console.log(`Using discovered pipeline: ${pipeline}, stage: ${stage}`);
    }

    // 1. Create ticket
    const ticketUrl = "https://api.hubapi.com/crm/v3/objects/tickets";
    const ticketResponse = await axios.post(ticketUrl, {
      properties: {
        subject,
        content: content || "No content provided.",
        hs_pipeline: pipeline,
        hs_pipeline_stage: stage
      }
    }, {
      headers: { 'Authorization': authHeader }
    });

    const ticketId = ticketResponse.data.id;

    // 2. Associate with contact
    if (contactId) {
      const assocUrl = `https://api.hubapi.com/crm/v3/associations/tickets/contacts/batch/create`;
      await axios.post(assocUrl, {
        inputs: [{
          from: { id: ticketId },
          to: { id: contactId },
          type: "ticket_to_contact"
        }]
      }, {
        headers: { 'Authorization': authHeader }
      });
    }

    res.json(ticketResponse.data);
  } catch (error) {
    if (error.response) {
      console.error('HubSpot Create Ticket Error:', JSON.stringify(error.response.data, null, 2));
      res.status(error.response.status).json(error.response.data);
    } else {
      console.error('HubSpot Create Ticket Error:', error.message);
      res.status(500).json({ error: error.message });
    }
  }
});

// --- Dialpad Webhook Logic ---
let dialpadEvents = [];
const EVENTS_LIMIT = 50;

/**
 * Endpoint to receive Dialpad Webhooks
 */
app.post('/api/hubspot/dialpad_webhook', (req, res) => {
  const eventData = req.body;
  console.log('[Webhook] Received event:', eventData.state || 'unknown');

  // Extract payload if it exists (Dialpad sometimes wraps it)
  const finalEvent = eventData.payload || eventData.event || eventData;
  finalEvent._received_at = Date.now();

  dialpadEvents.unshift(finalEvent);
  if (dialpadEvents.length > EVENTS_LIMIT) {
    dialpadEvents = dialpadEvents.slice(0, EVENTS_LIMIT);
  }

  res.json({ status: 'ok' });
});

/**
 * Endpoint for the React app to poll for new events
 */
app.get('/api/hubspot/dialpad_events', (req, res) => {
  res.json(dialpadEvents);
});

/**
 * Endpoint to fetch Dialpad users
 */
app.post('/api/hubspot/dialpad_users', async (req, res) => {
  const { accessToken, accountType } = req.body;
  const apiBaseUrl = accountType === 'sandbox' ? "https://dialpadbeta.com/api" : "https://dialpad.com/api";

  try {
    const response = await axios.get(`${apiBaseUrl}/v2/users`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Dialpad Users Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

/**
 * Endpoint to subscribe to Dialpad Webhooks
 */
app.post('/api/hubspot/dialpad_subscribe', async (req, res) => {
  const { webhookUrl, accessToken, accountType } = req.body;
  const apiBaseUrl = accountType === 'sandbox' ? "https://dialpadbeta.com" : "https://api.dialpad.com";

  try {
    // 1. Create Webhook
    const webhookRes = await axios.post(`${apiBaseUrl}/v2/webhooks`, {
      hook_url: webhookUrl,
      secret: "dialpad_secret_" + Math.random().toString(36).substring(7)
    }, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    const webhookId = webhookRes.data.id;

    // 2. Create Call Subscription
    const subRes = await axios.post(`${apiBaseUrl}/v2/subscriptions/call`, {
      webhook_id: webhookId,
      call_states: ["all"]
    }, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    res.json({
      webhook: webhookRes.data,
      subscription: subRes.data
    });
  } catch (error) {
    console.error('Dialpad Subscription Error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

/**
 * OAuth URL — returns the HubSpot authorization URL to initiate the OAuth popup.
 */
app.get('/api/hubspot/oauth-url', (req, res) => {
  if (!HUBSPOT_CLIENT_ID || !HUBSPOT_REDIRECT_URI) {
    return res.status(500).json({ error: 'OAuth credentials (HUBSPOT_CLIENT_ID, HUBSPOT_REDIRECT_URI) not configured in .env' });
  }
  const scopes = [
    'tickets',
    'crm.objects.contacts.write',
    'oauth',
    'crm.objects.contacts.read',
  ].join(' ');
  const authUrl = `https://app.hubspot.com/oauth/authorize?client_id=${HUBSPOT_CLIENT_ID}&redirect_uri=${encodeURIComponent(HUBSPOT_REDIRECT_URI)}&scope=${encodeURIComponent(scopes)}`;
  res.json({ url: authUrl });
});

/**
 * OAuth Status — check whether a HubSpot portal has completed OAuth.
 * Pass portalId as a query param or X-HubSpot-Portal-Id header.
 */
app.get('/api/hubspot/oauth-status', (req, res) => {
  const portalId = req.query.portalId || req.headers['x-hubspot-portal-id'];
  if (portalId && installedAccounts[portalId]) {
    const account = installedAccounts[portalId];
    return res.json({
      connected: true,
      hub_id: account.hub_id,
      hub_domain: account.hub_domain,
      user: account.user,
      installed_at: account.installed_at,
    });
  }
  res.json({ connected: false });
});

/**
 * Endpoint to get HubSpot settings from .env
 */
app.get('/api/hubspot/settings', (req, res) => {
  res.json({
    pipeline: "default",
    stage: "new"
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
