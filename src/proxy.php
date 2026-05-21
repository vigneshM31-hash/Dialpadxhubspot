<?php
/**
 * HubSpot PHP Proxy for Calling Extension
 */
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Exit early for preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit;
}

// --- Configuration ---
// Note: For HubSpot Marketplace Apps, you should use the Node.js backend (server.js)
// which supports the full OAuth 2.0 flow and dynamic portal token resolution.
// proxy.php is a legacy file and does not support dynamic OAuth without a database.
$headers = function_exists('getallheaders') ? getallheaders() : [];
// Fallback to checking $_SERVER directly for Authorization
$authHeader = $headers['Authorization'] ?? $_SERVER['HTTP_AUTHORIZATION'] ?? null;
$HUBSPOT_ACCESS_TOKEN = $authHeader ? trim(str_replace('Bearer ', '', $authHeader)) : null;
$DIALPAD_API_KEY = "3g8sGmnmsWckr3N2F5jn5J4TGGb7ZSrwNph5CLPPpNtxnhLHrKDDyXRSjpJYVDVjTVCMsjCXA9auuFpTyWqx4fQ82s3Ctf8HWQWT"; // TO USER: Add your Dialpad API Key here
$DEFAULT_PIPELINE = "default";
$DEFAULT_STAGE = "new";
$EVENTS_FILE = 'dialpad_events.json';

// --- Route Handling ---
$requestUri = $_SERVER['REQUEST_URI'];
$method = $_SERVER['REQUEST_METHOD'];
$body = json_decode(file_get_contents('php://input'), true);

// Extract the action (e.g., contacts, tickets, etc.)
// Assumes URL structure: /api/hubspot/contacts OR /proxy.php?action=contacts
$path = parse_url($requestUri, PHP_URL_PATH);
$parts = explode('/', trim($path, '/'));

// Log the request for debugging (View this in your server's error_log)
// error_log("Proxy Request URI: " . $requestUri);

$action = '';
// Robust action detection (works even in subfolders)
$hubspotIndex = array_search('hubspot', $parts);
if ($hubspotIndex !== false && isset($parts[$hubspotIndex + 1])) {
    $action = $parts[$hubspotIndex + 1];
    // If the path is /api/hubspot/tickets/123, then parts[hubspotIndex + 2] is the ID
    $entityId = $parts[$hubspotIndex + 2] ?? null;
} elseif (isset($_GET['action'])) {
    $action = $_GET['action'];
    $entityId = $_GET['id'] ?? null;
}

// 0. Ping for testing
if ($action === 'ping') {
    $dialpadTest = makeDialpadRequest("https://api.dialpad.com/v2/ping", "GET", null, "dummy_token");
    echo json_encode([
        "status" => "pong", 
        "server_time" => date('Y-m-d H:i:s'), 
        "php_version" => phpversion(),
        "dialpad_connectivity" => [
            "status" => $dialpadTest['status'],
            "reachable" => ($dialpadTest['status'] > 0),
            "error" => $dialpadTest['data']['curl_error'] ?? null
        ]
    ]);
    exit;
}

function makeHubSpotRequest($url, $method = 'GET', $data = null, $token)
{
    $ch = curl_init($url);
    $headers = [
        "Authorization: Bearer $token",
        "Content-Type: application/json",
        "Accept: application/json"
    ];

    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($data) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
    }

    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return ['status' => $status, 'data' => json_decode($response, true)];
}

function makeDialpadRequest($url, $method = 'GET', $data = null, $token)
{
    $ch = curl_init($url);
    $headers = [
        "Authorization: Bearer $token",
        "Content-Type: application/json",
        "Accept: application/json"
    ];

    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        if ($data) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }
    } elseif ($method === 'DELETE') {
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "DELETE");
    }

    $response = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_err = curl_error($ch);
    curl_close($ch);

    $decoded = json_decode($response, true);
    
    // Catch complete connection failures (status 0) or non-JSON errors
    if (($status >= 400 || $status === 0) && !$decoded) {
        return [
            'status' => $status, 
            'data' => [
                'error' => 'Connection Failed or Invalid JSON', 
                'curl_error' => $curl_err,
                'http_status' => $status,
                'raw_response' => $response
            ]
        ];
    }

    return ['status' => $status, 'data' => $decoded];
}

function decodeJWT($jwt)
{
    $parts = explode('.', $jwt);
    if (count($parts) !== 3)
        return null;
    $payload = $parts[1];

    // Use strtr for faster base64url to base64 conversion
    $decoded = base64_decode(strtr($payload, '-_', '+/'));
    if (!$decoded)
        return null;

    return json_decode($decoded, true);
}

// 1. GET/POST Contacts
if ($action === 'contacts') {
    if ($method === 'GET') {
        $url = "https://api.hubapi.com/crm/v3/objects/contacts?properties=firstname,lastname,phone,mobilephone&limit=100";
        $res = makeHubSpotRequest($url, 'GET', null, $HUBSPOT_ACCESS_TOKEN);
        http_response_code($res['status']);
        echo json_encode($res['data']);
    } 
    else if ($method === 'POST') {
        $url = "https://api.hubapi.com/crm/v3/objects/contacts";
        $contactData = [
            "properties" => [
                "firstname" => $body['firstname'] ?? "New",
                "lastname" => $body['lastname'] ?? "Contact",
                "phone" => $body['phone'] ?? "",
                "mobilephone" => $body['phone'] ?? ""
            ]
        ];
        $res = makeHubSpotRequest($url, 'POST', $contactData, $HUBSPOT_ACCESS_TOKEN);
        http_response_code($res['status']);
        echo json_encode($res['data']);
    }
}

// 2. GET Tickets for a Contact
else if ($action === 'tickets' && $method === 'GET' && $entityId) {
    $contactId = $entityId;

    // Step A: Get associations
    $assocUrl = "https://api.hubapi.com/crm/v3/associations/contacts/tickets/batch/read";
    $assocData = ["inputs" => [["id" => $contactId]]];
    $assocRes = makeHubSpotRequest($assocUrl, 'POST', $assocData, $HUBSPOT_ACCESS_TOKEN);

    $ticketIds = [];
    if (isset($assocRes['data']['results'][0]['to'])) {
        foreach ($assocRes['data']['results'][0]['to'] as $t) {
            $ticketIds[] = ["id" => $t['id']];
        }
    }

    if (empty($ticketIds)) {
        echo json_encode(["results" => []]);
        exit;
    }

    // Step B: Get ticket details
    $ticketsUrl = "https://api.hubapi.com/crm/v3/objects/tickets/batch/read";
    $ticketsData = [
        "properties" => ["subject", "content", "hs_pipeline_stage", "createdate"],
        "inputs" => $ticketIds
    ];
    $ticketsRes = makeHubSpotRequest($ticketsUrl, 'POST', $ticketsData, $HUBSPOT_ACCESS_TOKEN);
    http_response_code($ticketsRes['status']);
    echo json_encode($ticketsRes['data']);
}

// 3. POST Create Ticket
else if ($action === 'tickets' && $method === 'POST') {
    $subject = $body['subject'] ?? '';
    $content = $body['content'] ?? 'No content provided.';
    $contactId = $body['contactId'] ?? null;

    // Auto-discovery logic (Fetch first available pipeline/stage)
    $pipeline = $DEFAULT_PIPELINE;
    $stage = $DEFAULT_STAGE;

    $pipeUrl = "https://api.hubapi.com/crm/v3/pipelines/tickets";
    $pipeRes = makeHubSpotRequest($pipeUrl, 'GET', null, $HUBSPOT_ACCESS_TOKEN);

    if (isset($pipeRes['data']['results'][0])) {
        $pipeline = $pipeRes['data']['results'][0]['id'];
        $stage = $pipeRes['data']['results'][0]['stages'][0]['id'] ?? $stage;
    }

    // Step A: Create Ticket
    $ticketUrl = "https://api.hubapi.com/crm/v3/objects/tickets";
    $ticketData = [
        "properties" => [
            "subject" => $subject,
            "content" => $content,
            "hs_pipeline" => $pipeline,
            "hs_pipeline_stage" => $stage
        ]
    ];
    $ticketRes = makeHubSpotRequest($ticketUrl, 'POST', $ticketData, $HUBSPOT_ACCESS_TOKEN);

    if ($ticketRes['status'] === 201 && $contactId) {
        $newTicketId = $ticketRes['data']['id'];
        // Step B: Associate
        $assocUrl = "https://api.hubapi.com/crm/v3/associations/tickets/contacts/batch/create";
        $assocData = [
            "inputs" => [
                [
                    "from" => ["id" => $newTicketId],
                    "to" => ["id" => $contactId],
                    "type" => "ticket_to_contact"
                ]
            ]
        ];
        makeHubSpotRequest($assocUrl, 'POST', $assocData, $HUBSPOT_ACCESS_TOKEN);
    }

    http_response_code($ticketRes['status']);
    echo json_encode($ticketRes['data']);
}

// 4. Dialpad Webhook Receiver
else if ($action === 'dialpad_webhook' && $method === 'POST') {
    $rawBody = file_get_contents('php://input');

    // Log raw body for debugging
    file_put_contents(__DIR__ . '/webhook_raw.log', date('Y-m-d H:i:s') . " - " . $rawBody . PHP_EOL, FILE_APPEND);

    $eventData = decodeJWT($rawBody);

    if ($eventData) {
        file_put_contents(__DIR__ . '/webhook_debug.log', date('Y-m-d H:i:s') . " - Decoded: " . json_encode($eventData) . PHP_EOL, FILE_APPEND);
    } else {
        $eventData = json_decode($rawBody, true);
        file_put_contents(__DIR__ . '/webhook_debug.log', date('Y-m-d H:i:s') . " - JSON: " . json_encode($eventData) . PHP_EOL, FILE_APPEND);
    }

    if ($eventData) {
        $events = [];
        $eventsPath = __DIR__ . '/' . $EVENTS_FILE;
        if (file_exists($eventsPath)) {
            $events = json_decode(file_get_contents($eventsPath), true) ?: [];
        }

        $finalEvent = $eventData['payload'] ?? $eventData['event'] ?? $eventData;

        // Use milliseconds for consistency with JS Date.now()
        $finalEvent['_received_at'] = round(microtime(true) * 1000);
        array_unshift($events, $finalEvent);
        $events = array_slice($events, 0, 50);

        if (file_put_contents($eventsPath, json_encode($events)) === false) {
            file_put_contents(__DIR__ . '/webhook_error.log', date('Y-m-d H:i:s') . " - Failed to write to $eventsPath" . PHP_EOL, FILE_APPEND);
        }
    }

    echo json_encode(["status" => "ok"]);
}

// 5. Fetch Dialpad Events
else if ($action === 'dialpad_events' && $method === 'GET') {
    header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
    header("Cache-Control: post-check=0, pre-check=0", false);
    header("Pragma: no-cache");
    
    $eventsPath = __DIR__ . '/' . $EVENTS_FILE;
    if (file_exists($eventsPath)) {
        echo file_get_contents($eventsPath);
    } else {
        echo json_encode([]);
    }
} else if ($action === 'dialpad_users') {
    $accessToken = $body['accessToken'] ?? $DIALPAD_API_KEY;
    $accountType = $body['accountType'] ?? 'production';
    $baseUrl = $accountType === 'sandbox' ? "https://dialpadbeta.com/api" : "https://dialpad.com/api";
    
    $url = "$baseUrl/v2/users";
    $res = makeDialpadRequest($url, 'GET', null, $accessToken);
    http_response_code($res['status']);
    echo json_encode($res['data']);
} else if ($action === 'dialpad_subscribe' && $method === 'POST') {
    if (empty($DIALPAD_API_KEY)) {
        http_response_code(400);
        echo json_encode(["error" => "Dialpad API Key not configured in proxy.php"]);
        exit;
    }

    $webhookUrl = $body['webhookUrl'] ?? '';
    if (empty($webhookUrl)) {
        http_response_code(400);
        echo json_encode(["error" => "webhookUrl is required"]);
        exit;
    }

    $accessToken = $body['accessToken'] ?? $DIALPAD_API_KEY;
    $accountType = $body['accountType'] ?? 'production';
    $apiBaseUrl = ($accountType === 'sandbox') ? "https://dialpadbeta.com/api" : "https://dialpad.com/api";
    $listUrl = "$apiBaseUrl/v2/webhooks";

    // 1. Try to create the Webhook
    $createWebhookUrl = "$apiBaseUrl/v2/webhooks";
    $webhookData = [
        "hook_url" => $webhookUrl,
        "secret" => "dialpad_secret_" . bin2hex(random_bytes(8))
    ];
    $webhookRes = makeDialpadRequest($createWebhookUrl, 'POST', $webhookData, $accessToken);

    $webhookId = null;
    if ($webhookRes['status'] === 201 || $webhookRes['status'] === 200) {
        $webhookId = $webhookRes['data']['id'];
    } elseif ($webhookRes['status'] === 409 || $webhookRes['status'] === 400) {
        // CONFLICT or LIMIT: Try to find an existing one for our domain
        $listRes = makeDialpadRequest($listUrl, 'GET', null, $accessToken);
        if ($listRes['status'] === 200 && isset($listRes['data']['items'])) {
            // Strip protocol, www, and query params for a domain-level match
            $cleanTarget = preg_replace('/^https?:\/\/(www\.)?/', '', explode('?', rtrim($webhookUrl, '/'))[0]);
            
            foreach ($listRes['data']['items'] as $hook) {
                $hookUrl = $hook['hook_url'] ?? $hook['url'] ?? '';
                if (empty($hookUrl)) continue;
                
                $cleanHook = preg_replace('/^https?:\/\/(www\.)?/', '', explode('?', rtrim($hookUrl, '/'))[0]);
                if ($cleanHook === $cleanTarget) {
                    $webhookId = $hook['id'];
                    break;
                }
            }
        }
    }

    if (!$webhookId) {
        $errorMessage = $webhookRes['data']['error']['message'] ?? $webhookRes['data']['error'] ?? "Unknown Dialpad Error";
        http_response_code($webhookRes['status'] ?: 500);
        echo json_encode(["error" => "Failed to create or find webhook", "message" => $errorMessage, "details" => $webhookRes['data']]);
        exit;
    }

    // 2. Cleanup existing Call Subscriptions to avoid the "Limit of 10" error
    $subListUrl = "$apiBaseUrl/v2/subscriptions/call";
    $subListRes = makeDialpadRequest($subListUrl, 'GET', null, $accessToken);
    if ($subListRes['status'] === 200 && isset($subListRes['data']['items'])) {
        $subs = $subListRes['data']['items'];
        
        // Strategy: Delete any subscription already using our webhook_id
        foreach ($subs as $s) {
            if ($s['webhook_id'] == $webhookId) {
                makeDialpadRequest("$subListUrl/" . $s['id'], 'DELETE', null, $accessToken);
            }
        }
        
        // If still at the limit (10), delete the oldest one to make space
        if (count($subs) >= 10) {
            makeDialpadRequest("$subListUrl/" . $subs[0]['id'], 'DELETE', null, $accessToken);
        }
    }

    // 3. Create Call Subscription
    $subUrl = "$apiBaseUrl/v2/subscriptions/call";
    $subData = [
        "webhook_id" => $webhookId,
        "call_states" => ["all"]
    ];
    $subRes = makeDialpadRequest($subUrl, 'POST', $subData, $accessToken);

    // If subscription already exists (409), it's a success for us
    if ($subRes['status'] === 201 || $subRes['status'] === 200 || $subRes['status'] === 409) {
        http_response_code(200);
        echo json_encode([
            "status" => "success",
            "webhook_id" => $webhookId,
            "subscription" => $subRes['data']
        ]);
    } else {
        http_response_code($subRes['status']);
        echo json_encode(["error" => "Failed to create subscription", "details" => $subRes['data']]);
    }
} else {
    http_response_code(404);
    echo json_encode(["error" => "Route not found: $action"]);
}
