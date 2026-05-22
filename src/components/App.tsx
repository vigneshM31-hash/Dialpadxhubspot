import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import styled, { ThemeProvider } from "styled-components";
import CallingExtensions, { OnInitialized, Constants } from "@hubspot/calling-extensions-sdk";
import { createTheme } from "../visitor-ui-component-library/theme/createTheme";
import {
  setDisabledBackgroundColor,
  setPrimaryColor,
  setTextColor,
} from "../visitor-ui-component-library/theme/defaultThemeOperators";
import { setTooltipBackgroundColor } from "../visitor-ui-component-library/tooltip/theme/tooltipThemeOperators";
import CrmView from "./CrmView";
import { useCti } from "../hooks/useCti";
import { useDialpad, DialpadPayload } from "../hooks/useDialpad";
import { useDialpadWebhookEvents, WebhookEvent } from "../hooks/useDialpadWebhookEvents";
import { useCallDurationTimer } from "../hooks/useTimer";
import {
  Availability,
  Direction,
  CallStatus,
} from "../types/ScreenTypes";
import { CALYPSO, CALYPSO_DARK, GYPSUM, KOALA, OLAF, SLINKY } from "../utils/colors";
import { FROM_NUMBER_ONE } from "../utils/phoneNumberUtils";
import { getHubspotHeaders, handleHubspotResponse, saveHubspotTokens } from "../utils/hubspotAuth";

const { thirdPartyToHostEvents } = Constants;

const AppContainer = styled.div`
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  color: ${SLINKY};
  width: 400px;
  height: 600px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 12px 40px rgba(0,0,0,0.25);
  border-radius: 16px;
  overflow: hidden;
  position: relative;
  font-family: 'Lexend', sans-serif;
`;

const TabContainer = styled.div`
  display: flex;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  position: relative;
  z-index: 20;
  height: 54px;
  padding: 0 8px;
`;

const Tab = styled.div<{ active: boolean }>`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  color: ${props => props.active ? CALYPSO : SLINKY};
  border-bottom: 3px solid ${props => props.active ? CALYPSO : 'transparent'};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  margin: 0 4px;

  &:hover {
    color: ${CALYPSO};
    background-color: rgba(0, 164, 189, 0.05);
  }
`;

const ContentArea = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  position: relative;
  background: transparent;
  min-height: 0;
`;

const IframeWrapper = styled.div<{ visible: boolean }>`
  display: flex;
  flex-direction: column;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: white;
  z-index: ${props => props.visible ? 10 : -1};
  opacity: ${props => props.visible ? 1 : 0};
  transform: ${props => props.visible ? 'scale(1)' : 'scale(0.98)'};
  pointer-events: ${props => props.visible ? 'all' : 'none'};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
`;

const MainApp = styled.div<{ visible: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: 0;
  ${props => !props.visible && `
    position: absolute;
    left: -9999px;
    top: -9999px;
    width: 100%;
    height: 100%;
    pointer-events: none;
  `}
`;

const CrmWrapper = styled.div<{ visible: boolean }>`
  flex: 1;
  display: ${props => props.visible ? 'flex' : 'none'};
  flex-direction: column;
  overflow: hidden;
  position: relative;
  z-index: 5;
  min-height: 0;
  animation: ${props => props.visible ? 'fadeIn 0.3s ease-out' : 'none'};

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const SettingsOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  animation: fadeIn 0.2s ease-out;
`;

const SettingsCard = styled.div`
  background: white;
  width: 340px;
  padding: 32px;
  border-radius: 20px;
  box-shadow: 0 20px 50px rgba(0,0,0,0.3);
  transform: scale(1);
  transition: transform 0.2s;
  max-height: 90%;
  overflow-y: auto;
  box-sizing: border-box;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 14px;
  border: 2px solid ${KOALA};
  border-radius: 10px;
  font-size: 14px;
  margin-top: 6px;
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: ${CALYPSO};
    box-shadow: 0 0 0 4px rgba(0, 164, 189, 0.1);
  }
`;

const ActionButton = styled.button<{ secondary?: boolean }>`
  background: ${props => props.secondary ? '#f0f2f5' : `linear-gradient(135deg, ${CALYPSO} 0%, ${CALYPSO_DARK} 100%)`};
  color: ${props => props.secondary ? SLINKY : 'white'};
  border: none;
  padding: 12px 20px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
  font-size: 14px;
  transition: all 0.2s;
  box-shadow: ${props => props.secondary ? 'none' : '0 4px 12px rgba(0, 164, 189, 0.3)'};
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: ${props => props.secondary ? '0 2px 8px rgba(0,0,0,0.05)' : '0 6px 16px rgba(0, 164, 189, 0.4)'};
    opacity: 0.95;
  }

  &:active {
    transform: translateY(0);
  }
`;

function App() {
  const [screen, setScreen] = useState<"LOGIN" | "APP">("APP");
  const [showSettings, setShowSettings] = useState(false);
  const [dialpadSettings, setDialpadSettings] = useState(() => {
    const saved = localStorage.getItem("dialpad_settings");
    const settings = saved ? JSON.parse(saved) : {};
    return {
      accountType: settings.accountType || "sandbox",
      clientId: settings.clientId || "ANHP2dBAJSwA4HwwE4aRPztLx",
      accessToken: settings.accessToken || "3g8sGmnmsWckr3N2F5jn5J4TGGb7ZSrwNph5CLPPpNtxnhLHrKDDyXRSjpJYVDVjTVCMsjCXA9auuFpTyWqx4fQ82s3Ctf8HWQWT",
      dialpadUserId: settings.dialpadUserId || ""
    };
  });

  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [hubspotSettings, setHubspotSettings] = useState(() => {
    const saved = localStorage.getItem("hubspot_settings");
    const settings = saved ? JSON.parse(saved) : {};
    return {
      accessToken: settings.accessToken || "",
      pipeline: settings.pipeline || "default",
      stage: settings.stage || "new"
    };
  });
  const [hubspotLoading, setHubspotLoading] = useState(false);
  const [oauthStatus, setOAuthStatus] = useState<'unknown' | 'connected' | 'disconnected'>('unknown');
  const [oauthAccount, setOAuthAccount] = useState<{ hub_id: string; user: string; hub_domain: string } | null>(null);

  const [draftDialpadSettings, setDraftDialpadSettings] = useState(dialpadSettings);
  const [draftHubspotSettings, setDraftHubspotSettings] = useState(hubspotSettings);

  useEffect(() => {
    if (showSettings) {
      setDraftDialpadSettings(dialpadSettings);
      setDraftHubspotSettings(hubspotSettings);
    }
  }, [showSettings, dialpadSettings, hubspotSettings]);

  useEffect(() => {
    // Only fetch if we don't have settings saved in localStorage
    if (!localStorage.getItem("hubspot_settings")) {
      const fetchHubspotSettings = async () => {
        setHubspotLoading(true);
        try {
          const response = await fetch("/api/hubspot/settings");
          if (response.ok) {
            const data = await response.json();
            setHubspotSettings(prev => ({
              ...prev,
              ...data,
              accessToken: prev.accessToken || data.accessToken || ""
            }));
          }
        } catch (err) {
          console.error("Failed to fetch HubSpot settings from server");
        } finally {
          setHubspotLoading(false);
        }
      };
      fetchHubspotSettings();
    }
  }, []);

  useEffect(() => {
    if (showSettings && draftDialpadSettings.accessToken) {
      const fetchUsers = async () => {
        setUsersLoading(true);
        try {
          const response = await fetch("/api/hubspot/dialpad_users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ accessToken: draftDialpadSettings.accessToken, accountType: draftDialpadSettings.accountType })
          });
          const data = await response.json();
          if (data.items) setAvailableUsers(data.items);
        } catch (err) {
          console.error("Failed to fetch Dialpad users");
        } finally {
          setUsersLoading(false);
        }
      };
      fetchUsers();
    }
  }, [showSettings, draftDialpadSettings.accessToken, draftDialpadSettings.accountType]);

  const dialpadOrigin = dialpadSettings.accountType === "production" ? "https://dialpad.com" : "https://dialpadbeta.com";
  const [tab, setTab] = useState<"DIALPAD" | "CRM">("CRM");
  const portalId = useMemo(() => new URLSearchParams(window.location.search).get("portalId"), []);
  const [direction, setDirection] = useState<Direction>("OUTBOUND");
  const [dialNumber, setDialNumber] = useState("+1");
  const [notes, setNotes] = useState("");
  const [isCallRecorded, setIsCallRecorded] = useState(false);
  const [onCall, setOnCall] = useState(false);

  const [fromNumber, setFromNumber] = useState(FROM_NUMBER_ONE);
  const [incomingNumber, setIncomingNumber] = useState("+1");
  const [availability, setAvailability] = useState<Availability>("UNAVAILABLE");
  const [callStatus, setCallStatus] = useState<CallStatus | null>(null);
  const [hubspotReady, setHubspotReady] = useState(false);

  const dialpadFrameRef = useRef<HTMLIFrameElement>(null);

  const {
    callDuration,
    callDurationString,
    startTimer,
    stopTimer,
    resetCallDuration,
  } = useCallDurationTimer();

  const { cti, engagementId, incomingContactName } = useCti(setDialNumber, dialpadFrameRef);

  const resetInputs = useCallback(() => {
    setDialNumber("+1");
    setIncomingNumber("+1");
    setNotes("");
    resetCallDuration();
    setIsCallRecorded(false);
  }, [resetCallDuration]);

  const lastProcessedCallRef = useRef<{ id: string | number, state: string } | null>(null);

  const handleOutgoingCallStarted = useCallback((number?: string) => {
    if (number) setDialNumber(number);
    const callStartTime = Date.now();
    startTimer(callStartTime);
    setDirection("OUTBOUND");
    setOnCall(true);
    setTab("CRM"); // Switch to CRM to show caller details
  }, [startTimer]);

  const handleIncomingCall = useCallback(() => {
    console.log("State Change: setting onCall to true");
    setDirection("INBOUND");
    setOnCall(true);
    setTab("CRM");
  }, []);

  const handleCallEnded = useCallback(() => {
    console.log("State Change: setting onCall to false");
    stopTimer();
    setOnCall(false);
  }, [stopTimer]);

  const handleCallCompleted = useCallback(() => {
    resetInputs();
    setOnCall(false);
  }, [resetInputs]);

  const handleDialpadEvent = useCallback((method: string, payload: DialpadPayload) => {
    console.log(`[Dialpad Event]: ${method}`, payload);
    switch (method) {
      case "user_authentication":
        if (payload.user_authenticated) {
          console.log("Dialpad User Logged In:", payload.user_id);
          cti.userLoggedIn();
        } else {
          console.log("Dialpad User Logged Out");
          cti.userLoggedOut();
        }
        break;
      case "call_ringing":
        console.log(`Dialpad Call Ringing (${payload.state}):`, payload);
        if (payload.state === "on") {
          const fromNumber = payload.external_number || payload.contact?.phone || "";
          setIncomingNumber(fromNumber);
          
          if (payload.direction === "outbound") {
            handleOutgoingCallStarted();
          } else {
            handleIncomingCall();
            cti.incomingCall({
              fromNumber: fromNumber,
              toNumber: payload.internal_number || payload.target?.phone,
            });
          }
        }
        break;
      case "call_connected":
        console.log("Dialpad Call Connected:", payload);
        cti.answerCall({
          externalCallId: cti.externalCallId,
        });
        break;
      case "call_ended":
      case "call_hangup":
        console.log("Dialpad Call Ended from Iframe");
        handleCallEnded();
        cti.callEnded();
        break;
      case "hang_up_all_calls":
        console.log("Dialpad Hang Up All Calls");
        handleCallEnded();
        cti.callEnded();
        break;  
    }
  }, [cti, handleIncomingCall, handleOutgoingCallStarted, handleCallEnded]);

  const handleWebhookEvent = useCallback((event: WebhookEvent) => {
    // Prevent duplicate processing of the same state for the same call
    const callKey = `${event.call_id}-${event.state}`;
    if (lastProcessedCallRef.current?.id === event.call_id && lastProcessedCallRef.current?.state === event.state) {
      return;
    }
    lastProcessedCallRef.current = { id: event.call_id, state: event.state };

    console.warn("[Webhook Event Received]:", event.state, event);

    const state = event.state.toLowerCase();
    const externalNumber = event.external_number || event.contact?.phone || "";
    const callerName = event.contact?.name || "Unknown Caller";

    switch (state) {
      case "preanswer":
      case "ringing":
      case "calling":
        console.warn("Call starting notification from Webhook:", state);
        if (event.direction === "outbound") {
          handleOutgoingCallStarted(externalNumber);
        } else {
          setIncomingNumber(externalNumber);
          handleIncomingCall();
          cti.incomingCall({
            fromNumber: externalNumber,
            toNumber: event.internal_number || event.target?.phone,
            callerName: callerName,
          });
        }
        break;
      case "connected":
        console.warn("Call connected notification from Webhook");
        cti.answerCall({
          externalId: String(event.call_id)
        });
        break;
      case "hangup":
      case "missed":
      case "voicemail":
      case "voicemail_uploaded":
        console.warn("Call ended notification from Webhook:", state);
        handleCallEnded();
        cti.callEnded();
        break;
    }
  }, [cti, handleCallEnded, handleIncomingCall, handleOutgoingCallStarted]);

  const { initiateCall, enableCurrentTab, hangUpAllCalls } = useDialpad(dialpadFrameRef, dialpadOrigin, handleDialpadEvent);
  useDialpadWebhookEvents(handleWebhookEvent, dialpadSettings.dialpadUserId);

  const initiateDialpadCall = useCallback((phoneNumber: string) => {
    console.log("Attempting to initiate Dialpad call to:", phoneNumber);
    initiateCall(phoneNumber);
  }, [initiateCall]);

  useEffect(() => {
    // Handle messages from both BroadcastChannel (internal) and Window (external/Amazon Connect style)
    const handleAction = (data: any) => {
      const action = (data.action || data.type)?.toUpperCase();
      if (!action) return;

      console.log("[Action Received]:", action, data);

      // In sidebar mode (usesCallingWindow: false), we always want the main frame to communicate with HubSpot
      // We ALSO want to ignore messages that are already internal (broadcasts)
      const shouldCommunicateWithHubSpot = hubspotReady && (!cti.usesCallingWindow || cti.isFromWindow) && !data.isInternal;

      if (action === "INITIALIZED") {
        console.log("HubSpot Handshake Confirmed in App");
        setHubspotReady(true);
      }

      if (shouldCommunicateWithHubSpot) {
        if (action === "INCOMING_CALL") {
          cti.externalCallId = uuidv4();
          console.log("Notifying HubSpot of incoming call...");
          cti.contract.incomingCall({
            ...(data.payload || data),
            externalCallId: cti.externalCallId,
          });
        } else if (action === "OUTGOING_CALL_STARTED") {
          cti.externalCallId = uuidv4();
          console.log("Notifying HubSpot of outgoing call...");
          cti.contract.outgoingCall({
            ...(data.payload || data),
            externalCallId: cti.externalCallId,
          });
        }
      }

      // Map actions to UI state updates
      switch (action) {
        case "INCOMING_CALL":
        case thirdPartyToHostEvents.INCOMING_CALL?.toUpperCase():
          if (data.status === "success" || !data.status) {
             const payload = data.payload || data;
             const num = payload.callerId || payload.fromNumber || payload.number;
             setIncomingNumber(num);
             handleIncomingCall();
          }
          break;
        case "OUTGOING_CALL":
        case thirdPartyToHostEvents.OUTGOING_CALL_STARTED?.toUpperCase():
          const payload = data.payload || data;
          const targetNum = payload.toNumber || payload.number || "";
          handleOutgoingCallStarted(targetNum);
          // Physically start the call in Dialpad if it hasn't been started yet
          if (action === "OUTGOING_CALL_STARTED" || action === "OUTGOING_CALL") {
             initiateDialpadCall(targetNum);
          }
          break;
        case "MAKE_OUTBOUND_CALL":
          if (data.number) {
            initiateDialpadCall(data.number);
          }
          break;
        case "CALL_ENDED":
        case "CALL_HANGUP":
        case thirdPartyToHostEvents.CALL_ENDED?.toUpperCase():
          handleCallEnded();
          // ONLY call cti.callEnded() if it's NOT an internal message
          if (!data.isInternal) {
            cti.callEnded();
          }
          break;
        case "CALL_COMPLETED":
        case thirdPartyToHostEvents.CALL_COMPLETED?.toUpperCase():
          handleCallCompleted();
          break;
      }
    };

    const windowMessageHandler = (event: MessageEvent) => {
      if (event.data && typeof event.data === 'object' && event.data.action) {
        handleAction(event.data);
      }
    };

    const broadcastMessageHandler = ({ data }: MessageEvent) => {
      handleAction(data);
    };

    window.addEventListener("message", windowMessageHandler);
    cti.broadcastChannel.onmessage = broadcastMessageHandler;

    return () => {
      window.removeEventListener("message", windowMessageHandler);
      cti.broadcastChannel.onmessage = null;
    };
  }, [cti, handleOutgoingCallStarted, handleIncomingCall, handleCallEnded, handleCallCompleted, initiateDialpadCall]);

  // Handle tab switching
  useEffect(() => {
    if (tab === "DIALPAD") {
      enableCurrentTab();
    }
  }, [tab, enableCurrentTab]);

  // Check HubSpot OAuth connection status on load
  useEffect(() => {
    const checkOAuthStatus = async () => {
      try {
        const params = portalId ? `?portalId=${portalId}` : '';
        const headers = getHubspotHeaders(hubspotSettings, portalId);
        const response = await fetch(`/api/hubspot/oauth-status${params}`, { headers });
        handleHubspotResponse(response);
        const data = await response.json();
        if (data.connected) {
          setOAuthStatus('connected');
          setOAuthAccount({ hub_id: String(data.hub_id), user: data.user || '', hub_domain: data.hub_domain || '' });
        } else {
          setOAuthStatus('disconnected');
        }
      } catch {
        setOAuthStatus('disconnected');
      }
    };
    checkOAuthStatus();
  }, [portalId, hubspotSettings]);

  // Listen for OAuth popup success message
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'HUBSPOT_OAUTH_SUCCESS') {
        const { hub_id, user, hub_domain, access_token, refresh_token, expires_at } = event.data;
        if (access_token && refresh_token && expires_at && hub_id) {
          saveHubspotTokens({
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresAt: Number(expires_at),
            hubId: String(hub_id),
            hubDomain: hub_domain || undefined,
            user: user || undefined,
          });
        }

        setOAuthStatus('connected');
        setOAuthAccount({ hub_id: String(hub_id), user: user || '', hub_domain: hub_domain || '' });
        setHubspotSettings(prev => ({ ...prev, accessToken: '' }));
        setDraftHubspotSettings(prev => ({ ...prev, accessToken: '' }));
        localStorage.removeItem('hubspot_settings');
      }
    };
    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  return (
    <ThemeProvider
      theme={createTheme(
        setPrimaryColor(CALYPSO),
        setTextColor(SLINKY),
        setDisabledBackgroundColor(KOALA),
        setTooltipBackgroundColor(OLAF)
      )}
    >
      <AppContainer>

        <MainApp visible={screen === "APP"}>
          <TabContainer>
            <Tab active={tab === "DIALPAD"} onClick={() => setTab("DIALPAD")}>Dialpad</Tab>
            <Tab active={tab === "CRM"} onClick={() => setTab("CRM")}>HubSpot CRM</Tab>
          </TabContainer>
          <ContentArea>
            <IframeWrapper visible={tab === "DIALPAD"}>
              <iframe
                key={`${dialpadSettings.accountType}-${dialpadSettings.clientId}`}
                ref={dialpadFrameRef}
                src={`${dialpadOrigin}/apps/${dialpadSettings.clientId}`}
                style={{ border: 'none', width: '100%', height: '100%' }}
                title="Dialpad"
                allow="microphone; speaker-selection; autoplay; camera; display-capture; hid"
                sandbox="allow-popups allow-scripts allow-same-origin allow-forms"
              />
            </IframeWrapper>

            <CrmWrapper visible={tab === "CRM"}>
              <CrmView
                cti={cti}
                onCall={onCall}
                portalId={portalId}
                dialpadSettings={dialpadSettings}
                hubspotSettings={hubspotSettings}
                onOpenSettings={() => setShowSettings(true)}
                hangUpAllCalls={hangUpAllCalls}
                activeContact={onCall ? {
                  name: incomingContactName || "Unknown Caller",
                  number: direction === "OUTBOUND" ? dialNumber : incomingNumber
                } : undefined}
              />
            </CrmWrapper>

            {showSettings && (
              <SettingsOverlay>
                <SettingsCard>
                  <h3 style={{ margin: '0 0 16px 0' }}>Dialpad Settings</h3>
                  
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Account Type</label>
                    <select 
                      style={{ width: '100%', padding: '8px', borderRadius: '4px', border: `1px solid ${KOALA}` }}
                      value={draftDialpadSettings.accountType}
                      onChange={(e) => setDraftDialpadSettings({ ...draftDialpadSettings, accountType: e.target.value as any })}
                    >
                      <option value="production">Production (dialpad.com)</option>
                      <option value="sandbox">Sandbox (dialpadbeta.com)</option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Mini CTI Dialer ClientId</label>
                    <Input 
                      placeholder="Enter ClientId"
                      value={draftDialpadSettings.clientId}
                      onChange={(e) => setDraftDialpadSettings({ ...draftDialpadSettings, clientId: e.target.value })}
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Dialpad Access Token</label>
                    <Input 
                      type="password"
                      placeholder="Enter Access Token"
                      value={draftDialpadSettings.accessToken}
                      onChange={(e) => setDraftDialpadSettings({ ...draftDialpadSettings, accessToken: e.target.value })}
                    />
                  </div>

                  <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Select Your Dialpad Agent</label>
                    {usersLoading ? (
                      <div style={{ fontSize: '12px', color: '#666' }}>Loading agents...</div>
                    ) : (
                      <select 
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: `1px solid ${KOALA}`, fontSize: '14px' }}
                        value={draftDialpadSettings.dialpadUserId}
                        onChange={(e) => setDraftDialpadSettings({ ...draftDialpadSettings, dialpadUserId: e.target.value })}
                      >
                        <option value="">-- Select Your Name --</option>
                        {availableUsers.map(user => (
                          <option key={user.id} value={user.id}>{user.first_name} {user.last_name}</option>
                        ))}
                      </select>
                    )}
                    <p style={{ fontSize: '10px', color: '#64748b', marginTop: '4px' }}>
                      Choose your name to only see your own call events.
                    </p>
                  </div>

                  <hr style={{ border: 'none', borderTop: `1px solid ${KOALA}`, margin: '20px 0' }} />
                  
                  <h3 style={{ margin: '0 0 16px 0' }}>HubSpot Settings</h3>

                  {/* OAuth Connection Card */}
                  <div style={{ marginBottom: '16px' }}>
                    {oauthStatus === 'connected' && oauthAccount ? (
                      <div style={{ padding: '14px 16px', background: '#f0fff4', borderRadius: '12px', border: '1px solid #9ae6b4' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '18px' }}>✅</span>
                          <span style={{ fontWeight: 700, color: '#276749', fontSize: '13px' }}>HubSpot Connected</span>
                        </div>
                        <p style={{ margin: '0 0 2px 0', fontSize: '11px', color: '#276749' }}>
                          Portal <b>{oauthAccount.hub_id}</b>
                        </p>
                        {oauthAccount.hub_domain && (
                          <p style={{ margin: '0 0 10px 0', fontSize: '11px', color: '#2f855a' }}>{oauthAccount.hub_domain}</p>
                        )}
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/hubspot/oauth-url');
                              const { url, error } = await res.json();
                              if (error) { alert(error); return; }
                              window.open(url, 'HubSpot OAuth', 'width=600,height=700,left=200,top=80');
                            } catch { alert('Could not reach server. Is it running?'); }
                          }}
                          style={{ fontSize: '11px', color: CALYPSO, background: 'none', border: `1px solid ${CALYPSO}`, borderRadius: '6px', padding: '4px 12px', cursor: 'pointer', fontWeight: 600 }}
                        >
                          🔗 Re-connect / Switch Account
                        </button>
                      </div>
                    ) : oauthStatus === 'disconnected' ? (
                      <div style={{ padding: '14px 16px', background: '#fffbf0', borderRadius: '12px', border: '1px solid #fbd38d' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <span style={{ fontSize: '18px' }}>🔐</span>
                          <span style={{ fontWeight: 700, color: '#744210', fontSize: '13px' }}>HubSpot Not Connected</span>
                        </div>
                        <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#975a16' }}>
                          Connect your HubSpot account via OAuth to fetch contacts and manage tickets.
                        </p>
                        <ActionButton
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/hubspot/oauth-url');
                              const { url, error } = await res.json();
                              if (error) { alert(error); return; }
                              window.open(url, 'HubSpot OAuth', 'width=600,height=700,left=200,top=80');
                            } catch { alert('Could not reach server. Is it running?'); }
                          }}
                          style={{ width: '100%', fontSize: '13px', padding: '11px' }}
                        >
                          🔗 Connect HubSpot Account
                        </ActionButton>
                      </div>
                    ) : (
                      <div style={{ padding: '12px', background: '#f7fafc', borderRadius: '10px', fontSize: '12px', color: '#718096', textAlign: 'center' }}>
                        Checking HubSpot connection...
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Pipeline</label>
                      <Input 
                        placeholder="default"
                        value={draftHubspotSettings.pipeline}
                        onChange={(e) => setDraftHubspotSettings({ ...draftHubspotSettings, pipeline: e.target.value })}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>Stage</label>
                      <Input 
                        placeholder="new"
                        value={draftHubspotSettings.stage}
                        onChange={(e) => setDraftHubspotSettings({ ...draftHubspotSettings, stage: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <ActionButton 
                      onClick={async () => {
                        setDialpadSettings(draftDialpadSettings);
                        setHubspotSettings(draftHubspotSettings);
                        localStorage.setItem("dialpad_settings", JSON.stringify(draftDialpadSettings));
                        localStorage.setItem("hubspot_settings", JSON.stringify(draftHubspotSettings));
                        setShowSettings(false);
                        
                        // Automatic Webhook Subscription on Save
                        const currentOrigin = window.location.origin;
                        // Add a unique timestamp to bypass Dialpad's 409 Conflict
                        const webhookUrl = `${currentOrigin}/api/hubspot/dialpad_webhook?t=${Date.now()}`;
                        const apiBaseUrl = draftDialpadSettings.accountType === 'sandbox' ? "https://dialpadbeta.com/api" : "https://dialpad.com/api";
                        
                        console.log("[Dialpad] Subscribing with Webhook URL:", webhookUrl);
                        console.log("[Dialpad] Using Account Type:", draftDialpadSettings.accountType);

                        try {
                          const response = await fetch("/api/hubspot/dialpad_subscribe", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ 
                              webhookUrl,
                              accessToken: draftDialpadSettings.accessToken,
                              accountType: draftDialpadSettings.accountType
                            })
                          });
                          
                          const result = await response.json();
                          if (response.ok) {
                            console.log("[Dialpad] Automatic subscription successful:", result);
                          } else {
                            console.error("[Dialpad] Subscription server error:", result);
                          }
                        } catch (err) {
                          console.error("[Dialpad] Network error during subscription:", err);
                        }
                      }}
                      style={{ flex: 1 }}
                    >
                      Save & Subscribe
                    </ActionButton>
                    <ActionButton 
                      secondary
                      onClick={() => setShowSettings(false)}
                      style={{ flex: 1 }}
                    >
                      Cancel
                    </ActionButton>
                  </div>
                </SettingsCard>
              </SettingsOverlay>
            )}
          </ContentArea>
        </MainApp>
      </AppContainer>
    </ThemeProvider>
  );
}

export default App;
