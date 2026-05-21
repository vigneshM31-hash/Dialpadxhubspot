import { useState, useCallback, useEffect } from "react";


export interface DialpadPayload {
  user_authenticated?: boolean;
  user_id?: number;
  state?: "on" | "off";
  id?: number;
  contact?: {
    id: string;
    phone: string;
    type: string;
    name: string;
    email: string;
  };
  target?: {
    id: number;
    phone: string;
    type: string;
    name: string;
    email: string;
  };
  internal_number?: string;
  external_number?: string;
  phone_number?: string;
  enable_current_tab?: boolean;
  identity_type?: string;
  identity_id?: number;
  direction?: string;
  custom_data?: string;
  outbound_caller_id?: string;
}

export interface DialpadMessage {
  api: "opencti_dialpad";
  version: "1.0";
  method: string;
  payload?: DialpadPayload;
}

export const useDialpad = (
  iframeRef: React.RefObject<HTMLIFrameElement>,
  dialpadOrigin: string,
  onEvent?: (method: string, payload: DialpadPayload) => void
) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [dialpadUserId, setDialpadUserId] = useState<number | null>(null);

  const postToDialpad = useCallback((method: string, payload?: any) => {
    if (iframeRef.current?.contentWindow) {
      const message: DialpadMessage = {
        api: "opencti_dialpad",
        version: "1.0",
        method,
        payload,
      };
      console.log(`[Dialpad] Sending: ${method}`, payload);
      iframeRef.current.contentWindow.postMessage(message, dialpadOrigin);
    } else {
      console.warn(`[Dialpad] Cannot send ${method}: iframe window not found`);
    }
  }, [iframeRef, dialpadOrigin]);

  const initiateCall = useCallback((phoneNumber: string, options: Partial<DialpadPayload> = {}) => {
    postToDialpad("initiate_call", {
      phone_number: phoneNumber,
      enable_current_tab: true,
      ...options,
    });
  }, [postToDialpad]);

  const enableCurrentTab = useCallback(() => {
    postToDialpad("enable_current_tab");
  }, [postToDialpad]);

  const hangUpAllCalls = useCallback(() => {
    postToDialpad("hang_up_all_calls");
  }, [postToDialpad]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { data, origin } = event;
      
      // Log EVERYTHING for debugging
      console.log(`[Incoming Message] Origin: ${origin}`, data);

      if (data?.api !== "opencti_dialpad") return;

      console.log(`[Dialpad] Received: ${data.method}`, data.payload);

      switch (data.method) {
        case "user_authentication":
          if (data.payload) {
            setIsAuthenticated(!!data.payload.user_authenticated);
            setDialpadUserId(data.payload.user_id || null);
          }
          break;
      }

      if (onEvent) {
        onEvent(data.method, data.payload || {});
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onEvent]);

  return {
    isAuthenticated,
    dialpadUserId,
    initiateCall,
    enableCurrentTab,
    hangUpAllCalls,
  };
};
