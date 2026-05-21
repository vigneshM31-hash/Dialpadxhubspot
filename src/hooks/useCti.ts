import CallingExtensions, { OnInitialized, Constants } from "@hubspot/calling-extensions-sdk";

export interface OnDialNumber {
  phoneNumber: string;
}

export interface OnEngagementCreated {
  engagementId: number;
}

export interface OnVisibilityChanged {
  isHidden: boolean;
}
import { useState, useMemo, useEffect, useRef } from "react";

const APP_ID = "calling-extensions-demo";

export const useCti = (
  setDialNumber: (phoneNumber: string) => void,
  dialpadFrameRef: React.RefObject<HTMLIFrameElement>
) => {
  const [engagementId, setEngagementId] = useState<number | null>(null);
  const [incomingContactName, setIncomingContactName] = useState("");
  const [dialpadConnection, setDialpadConnection] = useState<any>(null);
  const portalIdRef = useRef<number | null>(null);
  
  // Helper to get portalId from URL if onReady hasn't fired yet
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPortalId = params.get("portalId");
    if (urlPortalId) {
      portalIdRef.current = parseInt(urlPortalId, 10);
      console.log("Captured portalId from URL:", portalIdRef.current);
    }
  }, []);

  const cti = useMemo(() => {
    let contract: CallingExtensions;
    const isFromWindow = window.name === APP_ID;
    const isFromRemoteWithoutWindow = !isFromWindow && window.opener === null;

    const eventHandlers: any = {
      onReady: (data: OnInitialized) => {
        console.log("HubSpot Ready", data);
        portalIdRef.current = (data as any).portalId;

        const initData: any = {
          isLoggedIn: true,
          sizeInfo: { width: 400, height: 600 },
          engagementId: (data as any).engagementId,
        };

        contract.initialized(initData);

        if ((data as any).engagementId) {
          console.log("Existing engagement found:", (data as any).engagementId);
          setEngagementId((data as any).engagementId);

          // Trigger UI sync for existing engagement
          instance.broadcastMessage({
            type: "INCOMING_CALL",
            payload: {
              engagementId: (data as any).engagementId,
              fromNumber: "Existing Call" // Fallback if number unknown
            }
          });
        }

        instance.broadcastChannel.postMessage({
          type: "INITIALIZED",
          payload: initData,
        });
      },
      onDialNumber: (data: OnDialNumber) => {
        setDialNumber(data.phoneNumber);
      },
      onEngagementCreated: (data: OnEngagementCreated) => {
        setEngagementId(data.engagementId);
      },
      onVisibilityChanged: (data: OnVisibilityChanged) => {
        console.log("Visibility changed", data);
      },
      onCallerIdMatchSucceeded: (data: any) => {
        console.log("Caller ID match succeeded:", data);
        if (data.callerIdMatches && data.callerIdMatches.length > 0) {
          const match = data.callerIdMatches[0];
          setIncomingContactName(match.name);
        }
      },
      onNavigateToRecordFailed: (data: any) => {
        console.error("HubSpot Navigation Failed:", data);
      },
      onNavigateToRecordSucceeded: (data: any) => {
        console.log("HubSpot Navigation Succeeded:", data);
      }
    };

    contract = new CallingExtensions({
      debugMode: true,
      eventHandlers,
    });

    const { thirdPartyToHostEvents } = Constants;

    const instance: any = {
      contract,
      broadcastChannel: new BroadcastChannel(APP_ID),
      isFromWindow,
      isFromRemoteWithoutWindow,
      usesCallingWindow: false,
      externalCallId: "",
      broadcastMessage: (data: any) => {
        console.log("Broadcasting event:", data.type);
        // Add a flag so we don't process our own broadcast recursively
        instance.broadcastChannel.postMessage({ ...data, isInternal: true });
      },
      userLoggedIn: () => instance.broadcastMessage({ type: thirdPartyToHostEvents.LOGGED_IN }),
      userLoggedOut: () => instance.broadcastMessage({ type: thirdPartyToHostEvents.LOGGED_OUT }),
      userAvailable: () => instance.broadcastMessage({ type: thirdPartyToHostEvents.USER_AVAILABLE }),
      userUnavailable: () => instance.broadcastMessage({ type: thirdPartyToHostEvents.USER_UNAVAILABLE }),
      incomingCall: (payload: any) => instance.broadcastMessage({ type: thirdPartyToHostEvents.INCOMING_CALL, payload }),
      outgoingCall: (payload: any) => instance.broadcastMessage({ type: thirdPartyToHostEvents.OUTGOING_CALL_STARTED, payload }),
      answerCall: (payload: any) => instance.broadcastMessage({ type: thirdPartyToHostEvents.CALL_ANSWERED, payload }),
      callEnded: (payload: any) => instance.broadcastMessage({ type: thirdPartyToHostEvents.CALL_ENDED, payload }),
      callCompleted: (payload: any) => instance.broadcastMessage({ type: thirdPartyToHostEvents.CALL_COMPLETED, payload }),
      // Helper for opening records in a NEW TAB
      openRecordInNewTab: (recordType: string, recordId: number | string) => {
        const id = String(recordId);
        const pId = portalIdRef.current || new URLSearchParams(window.location.search).get("portalId") || "unknown";
        const isContact = recordType.toLowerCase().includes('contact');
        const objectType = isContact ? '0-1' : '0-5'; // 0-1 for contact, 0-5 for ticket
        
        const url = `https://app.hubspot.com/contacts/${pId}/record/${objectType}/${id}`;
        console.log(`Opening in new tab: ${url}`);
        window.open(url, '_blank');
      }
    };

    return instance;
  }, [setDialNumber]);

  useEffect(() => {
    return () => {
      if (cti && cti.broadcastChannel) {
        cti.broadcastChannel.close();
      }
    };
  }, [cti]);

  return {
    cti,
    engagementId,
    incomingContactName,
    dialpadConnection,
  };
};