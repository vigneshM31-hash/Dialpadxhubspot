import { useEffect, useRef } from "react";

export interface WebhookEvent {
  call_id: string | number;
  state: string;
  direction: string;
  external_number?: string;
  internal_number?: string;
  event_timestamp?: number;
  target?: {
    email: string;
    name: string;
    phone: string;
  };
  contact?: {
    name: string;
    phone: string;
    email: string;
  };
  _received_at: number;
}

export const useDialpadWebhookEvents = (onEvent: (event: WebhookEvent) => void, userId?: string) => {
  const lastEventTimestampRef = useRef<number>(Date.now()); // Start from "now" to avoid old history
  const pollIntervalRef = useRef<any>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch("/api/hubspot/dialpad_events");
        if (response.ok) {
          const events: any[] = await response.json();
          
          const newEvents = events
            .filter(e => e._received_at > lastEventTimestampRef.current)
            .filter(e => {
              // Only filter if a userId is selected
              if (!userId) return true;
              
              // Dialpad events usually have target.id for the agent
              const eventTargetId = e.target?.id || e.user_id;
              const isMatch = String(eventTargetId) === String(userId);
              
              if (!isMatch) {
                console.log(`[Webhook Debug] Ignoring event for target ${eventTargetId} (Selected: ${userId})`);
              } else {
                console.log(`[Webhook Debug] MATCH found for target ${eventTargetId}!`);
              }
              
              return isMatch;
            })
            .reverse();

          if (newEvents.length > 0) {
            console.log(`[Webhook] Found ${newEvents.length} events for User ${userId}`);
            newEvents.forEach(event => {
              onEvent(event);
            });
            lastEventTimestampRef.current = Math.max(...newEvents.map(e => e._received_at));
          }
        }
      } catch (err) {
        console.error("Failed to poll Dialpad events:", err);
      }
    };

    // Initial fetch to clear existing backlog
    fetchEvents();

    pollIntervalRef.current = setInterval(fetchEvents, 3000); // Poll every 3 seconds

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [onEvent, userId]);
};
