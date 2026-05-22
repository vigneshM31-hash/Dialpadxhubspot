import React from "react";
import styled from "styled-components";
import { SLINKY, CALYPSO, CALYPSO_DARK, CALYPSO_LIGHT, CALYPSO_MEDIUM, KOALA } from "../utils/colors";
import { Constants } from "@hubspot/calling-extensions-sdk";
import { getHubspotHeaders, handleHubspotResponse } from "../utils/hubspotAuth";
import type { IconBaseProps } from "react-icons/lib";
import { 
  FiUser as _FiUser, 
  FiPhone as _FiPhone, 
  FiSettings as _FiSettings, 
  FiRefreshCw as _FiRefreshCw, 
  FiSearch as _FiSearch, 
  FiPlus as _FiPlus, 
  FiChevronRight as _FiChevronRight
} from "react-icons/fi";

// react-icons' IconType returns React.ReactNode which isn't valid as a JSX element.
// Cast to React.ComponentType so TypeScript accepts them in JSX.
const FiUser = _FiUser as React.ComponentType<IconBaseProps>;
const FiPhone = _FiPhone as React.ComponentType<IconBaseProps>;
const FiSettings = _FiSettings as React.ComponentType<IconBaseProps>;
const FiRefreshCw = _FiRefreshCw as React.ComponentType<IconBaseProps>;
const FiSearch = _FiSearch as React.ComponentType<IconBaseProps>;
const FiPlus = _FiPlus as React.ComponentType<IconBaseProps>;
const FiChevronRight = _FiChevronRight as React.ComponentType<IconBaseProps>;

const { thirdPartyToHostEvents } = Constants;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100%;
  background: white;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden; /* Prevent the container itself from scrolling */
`;

const Header = styled.div`
  padding: 16px 20px;
  background: white;
  border-bottom: 1px solid ${KOALA};
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Title = styled.h2`
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #2d3e50;
  letter-spacing: -0.5px;
`;

const ContactList = styled.div`
  flex: 1;
  overflow-y: scroll; /* Force the scrollbar to be active when needed */
  min-height: 0;
  padding: 20px;
  -webkit-overflow-scrolling: touch; /* Smooth scrolling for mobile-like feel */
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: ${KOALA};
    border-radius: 10px;
  }
`;

const ContactItem = styled.div`
  background: white;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border: 1px solid ${KOALA};

  &:hover {
    box-shadow: 0 6px 15px rgba(0,0,0,0.06);
    border-color: ${CALYPSO_LIGHT};
  }
`;

const ContactInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const ContactName = styled.span`
  font-weight: 700;
  color: #2d3e50;
  font-size: 15px;
`;

const ContactNumber = styled.span`
  font-size: 12px;
  color: ${SLINKY};
  font-weight: 500;
`;


const CallButton = styled.button<{ danger?: boolean }>`
  background: ${props => props.danger ? 'linear-gradient(135deg, #ff4d4d 0%, #d43f3f 100%)' : `linear-gradient(135deg, ${CALYPSO} 0%, ${CALYPSO_DARK} 100%)`};
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 700;
  font-size: 13px;
  transition: all 0.2s;
  box-shadow: 0 4px 10px ${props => props.danger ? 'rgba(255, 77, 77, 0.3)' : 'rgba(0, 164, 189, 0.3)'};
  
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 6px 15px ${props => props.danger ? 'rgba(255, 77, 77, 0.4)' : 'rgba(0, 164, 189, 0.4)'};
  }
`;

const ActiveCallOverlay = styled.div`
  padding: 20px;
  background: #2d3e50;
  color: white;
  border-bottom: 2px solid ${CALYPSO};
`;

const TicketSection = styled.div`
  padding: 24px;
  background: white;
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  border-radius: 24px 24px 0 0;
  box-shadow: 0 -10px 30px rgba(0,0,0,0.05);
`;

const TicketItem = styled.div`
  background: white;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 12px;
  border-left: 4px solid ${CALYPSO};
  transition: all 0.2s;

  &:hover {
    background: white;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  }
`;

const TicketTitle = styled.div`
  font-weight: 700;
  font-size: 14px;
  color: #2d3e50;
  cursor: pointer;
  margin-bottom: 4px;

  &:hover {
    color: ${CALYPSO};
  }
`;

const TicketBody = styled.div`
  font-size: 13px;
  color: ${SLINKY};
  line-height: 1.4;
`;

const TicketForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 16px;
  padding: 20px;
  background: ${CALYPSO_LIGHT};
  border-radius: 16px;
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;

const Input = styled.input`
  padding: 12px 16px;
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 10px;
  font-size: 14px;
  width: 100%;
  box-sizing: border-box;
  
  &:focus {
    outline: none;
    border-color: ${CALYPSO};
  }
`;

const TextArea = styled.textarea`
  padding: 12px 16px;
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 10px;
  resize: none;
  font-size: 14px;
  width: 100%;
  
  &:focus {
    outline: none;
    border-color: ${CALYPSO};
  }
`;

const ActionButton = styled.button<{ secondary?: boolean }>`
  background: ${props => props.secondary ? 'rgba(255,255,255,0.8)' : `linear-gradient(135deg, ${CALYPSO} 0%, ${CALYPSO_DARK} 100%)`};
  color: ${props => props.secondary ? '#2d3e50' : 'white'};
  border: 1px solid ${props => props.secondary ? 'rgba(0,0,0,0.05)' : 'transparent'};
  padding: 10px 18px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
  font-size: 13px;
  transition: all 0.2s;
  box-shadow: ${props => props.secondary ? '0 2px 4px rgba(0,0,0,0.05)' : '0 4px 10px rgba(0, 164, 189, 0.2)'};
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: ${props => props.secondary ? '0 4px 8px rgba(0,0,0,0.1)' : '0 6px 14px rgba(0, 164, 189, 0.3)'};
  }

  .spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
`;

const ErrorBanner = styled.div`
  background-color: #fff5f5;
  color: #c53030;
  padding: 12px 16px;
  margin: 12px 20px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid #fed7d7;
  display: flex;
  align-items: center;
  gap: 8px;
`;

interface Contact {
  id: string;
  name: string;
  number: string;
}

interface Ticket {
  id: string;
  properties: {
    subject: string;
    content?: string;
    createdate: string;
  };
}

interface CrmViewProps {
  cti: any;
  onCall: boolean;
  portalId?: string | null;
  activeContact?: {
    name: string;
    number: string;
  };
  dialpadSettings: {
    accountType: string;
    clientId: string;
    accessToken: string;
    dialpadUserId: string;
  };
  hubspotSettings: {
    accessToken: string;
    pipeline: string;
    stage: string;
  };
  onOpenSettings: () => void;
  hangUpAllCalls: () => void;
}

const CrmView: React.FC<CrmViewProps> = ({ cti, onCall, portalId, activeContact, dialpadSettings, hubspotSettings, onOpenSettings, hangUpAllCalls }) => {
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [ticketsLoading, setTicketsLoading] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [showTicketForm, setShowTicketForm] = React.useState(false);
  const [ticketSubject, setTicketSubject] = React.useState("");
  const [ticketContent, setTicketContent] = React.useState("");
  const [ticketStatus, setTicketStatus] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submittingWebhook, setSubmittingWebhook] = React.useState(false);
  const [webhookStatus, setWebhookStatus] = React.useState("");

  const fetchContacts = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: any = getHubspotHeaders(hubspotSettings, portalId);
      const response = await fetch("/api/hubspot/contacts", { headers });
      handleHubspotResponse(response);
      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      const data = await response.json();
      if (data.results) {
        setContacts(data.results.map((item: any) => ({
          id: item.id,
          name: `${item.properties.firstname || ""} ${item.properties.lastname || ""}`.trim() || `Contact ${item.id}`,
          number: item.properties.phone || item.properties.mobilephone || "No Phone"
        })));
      }
    } catch (err: any) {
      console.error("Fetch Error:", err);
      setError(`HubSpot not connected. Open ⚙️ Settings and click "Connect HubSpot Account" to authorize via OAuth.`);
      setContacts([
        { id: "1", name: "Vignesh M (Sample)", number: "+91 98765 43210" },
        { id: "2", name: "HubSpot Support", number: "+1 555 123 4567" }
      ]);
    } finally {
      setLoading(false);
    }
  }, [hubspotSettings, portalId]);

  const handleSubscribeWebhook = async () => {
    setSubmittingWebhook(true);
    setWebhookStatus("Subscribing...");
    try {
      const currentOrigin = window.location.origin;
      // Add timestamp to prevent 409 Conflict as in App.tsx
      const webhookUrl = `${currentOrigin}/api/hubspot/dialpad_webhook?t=${Date.now()}`;
      console.log("[Webhook Setup] Subscribing with URL:", webhookUrl);

      const response = await fetch("/api/hubspot/dialpad_subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          webhookUrl,
          accessToken: dialpadSettings.accessToken,
          accountType: dialpadSettings.accountType
        })
      });
      const data = await response.json();
      if (response.ok) {
        setWebhookStatus("Subscribed");
      } else {
        setWebhookStatus(`Error: ${data.error || "Check API Key"}`);
      }
    } catch (err) {
      setWebhookStatus("Failed to connect.");
    } finally {
      setSubmittingWebhook(false);
      setTimeout(() => setWebhookStatus(""), 5000);
    }
  };

  const fetchTickets = React.useCallback(async (contactId: string) => {
    setTicketsLoading(true);
    try {
      const headers: any = getHubspotHeaders(hubspotSettings, portalId);
      const response = await fetch(`/api/hubspot/tickets/${contactId}`, { headers });
      handleHubspotResponse(response);
      if (response.ok) {
        const data = await response.json();
        setTickets(data.results || []);
      }
    } catch (err) {
      console.error("Fetch Tickets Error:", err);
    } finally {
      setTicketsLoading(false);
    }
  }, [hubspotSettings, portalId]);

  React.useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const lastFetchedContactIdRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (onCall && activeContact) {
      const activeNumber = (activeContact.number || "").replace(/\D/g, '');
      const contact = contacts.find(c => {
        const contactNumber = (c.number || "").replace(/\D/g, '');
        if (!activeNumber || !contactNumber) return false;
        if (activeNumber.length < 7 || contactNumber.length < 7) {
          return activeNumber === contactNumber;
        }
        return contactNumber.includes(activeNumber) || activeNumber.includes(contactNumber);
      });
      
      if (contact && contact.id !== lastFetchedContactIdRef.current) {
        lastFetchedContactIdRef.current = contact.id;
        fetchTickets(contact.id);
      }
    } else {
      lastFetchedContactIdRef.current = null;
      setTickets([]);
      setShowTicketForm(false);
    }
  }, [onCall, activeContact, contacts, fetchTickets]);

  const handleCall = (number: string) => {
    console.log("Requesting outbound call to:", number);
    cti.broadcastMessage({
      type: thirdPartyToHostEvents.OUTGOING_CALL_STARTED,
      payload: { toNumber: number }
    });
  };

  const handleCreateTicket = async () => {
    if (!ticketSubject) return;

    setTicketStatus("Creating ticket...");
    const activeNumber = (activeContact?.number || "").replace(/\D/g, '');
    const contact = contacts.find(c =>
      (c.number || "").replace(/\D/g, '').includes(activeNumber)
    );

    try {
      const headers: any = {
        ...getHubspotHeaders(hubspotSettings, portalId),
        "Content-Type": "application/json"
      };
      const response = await fetch("/api/hubspot/tickets", {
        method: "POST",
        headers,
        body: JSON.stringify({
          subject: ticketSubject,
          content: ticketContent,
          contactId: contact?.id,
          pipeline: hubspotSettings.pipeline,
          stage: hubspotSettings.stage
        })
      });
      handleHubspotResponse(response);

      if (response.ok) {
        setTicketStatus("Success!");
        setTicketSubject("");
        setTicketContent("");
        setShowTicketForm(false);
        if (contact) fetchTickets(contact.id);
      }
    } catch (err) {
      setTicketStatus("Failed to create ticket.");
    } finally {
      setTimeout(() => setTicketStatus(""), 3000);
    }
  };

  const [showContactForm, setShowContactForm] = React.useState(false);
  const [newFirstName, setNewFirstName] = React.useState("");
  const [newLastName, setNewLastName] = React.useState("");
  const [contactStatus, setContactStatus] = React.useState("");

  const handleCreateContact = async () => {
    if (!activeContact?.number || !newFirstName) {
      setContactStatus("First Name is required!");
      setTimeout(() => setContactStatus(""), 3000);
      return;
    }
    
    setContactStatus("Saving...");
    try {
      const headers: any = {
        ...getHubspotHeaders(hubspotSettings, portalId),
        "Content-Type": "application/json"
      };
      const response = await fetch("/api/hubspot/contacts", {
        method: "POST",
        headers,
        body: JSON.stringify({
          firstname: newFirstName,
          lastname: newLastName || "Contact",
          phone: activeContact.number
        })
      });
      handleHubspotResponse(response);
      if (response.ok) {
        setContactStatus("Contact Saved!");
        setTimeout(() => {
          setShowContactForm(false);
          setNewFirstName("");
          setNewLastName("");
          setContactStatus("");
        }, 1500);
        await fetchContacts(); // Refresh list
      } else {
        setContactStatus("Failed to save.");
      }
    } catch (err) {
      console.error("Create Contact Error:", err);
      setContactStatus("Error occurred.");
    } finally {
      setTimeout(() => setContactStatus(""), 4000);
    }
  };

  const filteredContacts = contacts.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.number.includes(searchTerm)
  );

  const activeCrmContact = onCall && activeContact ? contacts.find(c => {
    const activeNumber = (activeContact.number || "").replace(/\D/g, '');
    const contactNumber = (c.number || "").replace(/\D/g, '');
    
    if (!activeNumber || !contactNumber) return false;

    // If either number is short (like +1), require an EXACT match
    if (activeNumber.length < 7 || contactNumber.length < 7) {
      return activeNumber === contactNumber;
    }
    
    // For normal numbers, use partial matching (last digits)
    return contactNumber.includes(activeNumber) || activeNumber.includes(contactNumber);
  }) : null;

  const displayCallName = activeCrmContact?.name || activeContact?.name || "Unknown Caller";

  return (
    <Container>
      {onCall && activeContact && (
        <ActiveCallOverlay>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                borderRadius: '50%', 
                background: CALYPSO, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                fontSize: '20px'
              }}>
                <FiUser color="white" />
              </div>
              <div>
                <div style={{ fontWeight: '800', fontSize: '15px', color: 'white' }}>{displayCallName}</div>
                <div style={{ fontSize: '12px', color: CALYPSO_MEDIUM, fontWeight: '600' }}>
                  {activeContact.number && activeContact.number.length > 2 ? activeContact.number : "Unknown Number"}
                </div>
                {!activeCrmContact && !showContactForm && (
                  <button 
                    onClick={() => setShowContactForm(true)}
                    style={{
                      background: 'rgba(255,255,255,0.15)',
                      border: 'none',
                      color: 'white',
                      fontSize: '10px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      marginTop: '4px',
                      cursor: 'pointer',
                      fontWeight: '700',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <FiPlus /> Add to CRM
                  </button>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <CallButton danger onClick={() => { cti.callEnded(); hangUpAllCalls(); }}>
                End Call
              </CallButton>
            </div>
          </div>

          {showContactForm && (
            <div style={{ 
              marginTop: '15px', 
              padding: '12px', 
              background: 'rgba(255,255,255,0.1)', 
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: '800', opacity: 0.8 }}>CREATE NEW CONTACT</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Input 
                  placeholder="First Name" 
                  value={newFirstName}
                  onChange={(e) => setNewFirstName(e.target.value)}
                  style={{ flex: 1, padding: '8px', fontSize: '12px', height: '36px' }}
                />
                <Input 
                  placeholder="Last Name" 
                  value={newLastName}
                  onChange={(e) => setNewLastName(e.target.value)}
                  style={{ flex: 1, padding: '8px', fontSize: '12px', height: '36px' }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  onClick={handleCreateContact}
                  disabled={!newFirstName}
                  style={{ 
                    flex: 1, 
                    padding: '8px', 
                    borderRadius: '4px', 
                    border: 'none', 
                    background: CALYPSO, 
                    color: 'white', 
                    fontWeight: '700',
                    cursor: 'pointer',
                    fontSize: '12px'
                  }}
                >
                  Save Contact
                </button>
                <button 
                  onClick={() => setShowContactForm(false)}
                  style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '12px', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
              {contactStatus && (
                <div style={{ fontSize: '11px', color: CALYPSO_MEDIUM, fontWeight: '700', textAlign: 'center' }}>
                  {contactStatus}
                </div>
              )}
            </div>
          )}
        </ActiveCallOverlay>
      )}

      <Header>
        <Title>CRM Dashboard</Title>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {webhookStatus && (
            <span style={{ 
              fontSize: '11px', 
              fontWeight: '700',
              padding: '4px 8px',
              borderRadius: '6px',
              background: webhookStatus.includes("Error") ? "#fff5f5" : "#f0fff4",
              color: webhookStatus.includes("Error") ? "#c53030" : "#2f855a" 
            }}>
              {webhookStatus}
            </span>
          )}
          {!onCall && (
            <ActionButton 
              secondary 
              onClick={fetchContacts}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <FiRefreshCw className={loading ? "spin" : ""} />
              {loading ? "..." : "Sync"}
            </ActionButton>
          )}
          {!onCall && (
            <ActionButton onClick={onOpenSettings} style={{ padding: '10px' }}>
              <FiSettings />
            </ActionButton>
          )}
        </div>
      </Header>

      {error && <ErrorBanner><span>⚠️</span> {error}</ErrorBanner>}

      {!onCall && (
        <div style={{ padding: '16px 24px', background: 'transparent' }}>
          <div style={{ position: 'relative' }}>
            <FiSearch style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
            <Input
              placeholder="Search members or phone numbers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '44px' }}
            />
          </div>
        </div>
      )}

      {!onCall ? (
        <ContactList>
          {loading ? (
            <div style={{ textAlign: 'center', marginTop: '40px' }}>Loading contacts...</div>
          ) : filteredContacts.length > 0 ? (
            filteredContacts.map(contact => (
              <ContactItem key={contact.id}>
                <ContactInfo onClick={() => cti.openRecordInNewTab("CONTACT", contact.id)}>
                  <ContactName>{contact.name}</ContactName>
                  <ContactNumber>{contact.number}</ContactNumber>
                </ContactInfo>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <CallButton onClick={(e) => { e.stopPropagation(); handleCall(contact.number); }}>
                    <FiPhone style={{ marginBottom: '-2px' }} />
                  </CallButton>
                  <FiChevronRight color="#cbd5e1" />
                </div>
              </ContactItem>
            ))
          ) : (
            <div style={{ textAlign: 'center', marginTop: '40px' }}>No records found.</div>
          )}
        </ContactList>
      ) : (
        <TicketSection>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ margin: 0, fontSize: '15px' }}>Member Tickets</h3>
            <ActionButton onClick={() => setShowTicketForm(!showTicketForm)}>
              {showTicketForm ? "Cancel" : "New Ticket"}
            </ActionButton>
          </div>

          {showTicketForm ? (
            <TicketForm>
              <Input
                placeholder="Subject"
                value={ticketSubject}
                onChange={(e) => setTicketSubject(e.target.value)}
              />
              <TextArea
                placeholder="Description"
                rows={3}
                value={ticketContent}
                onChange={(e) => setTicketContent(e.target.value)}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <ActionButton onClick={handleCreateTicket} disabled={!ticketSubject}>Create Ticket</ActionButton>
                <span style={{ fontSize: '11px', color: CALYPSO }}>{ticketStatus}</span>
              </div>
            </TicketForm>
          ) : (
            <div>
              {ticketsLoading ? (
                <div>Loading tickets...</div>
              ) : tickets.length > 0 ? (
                tickets.map(ticket => (
                  <TicketItem key={ticket.id}>
                    <TicketTitle onClick={() => cti.openRecordInNewTab("TICKET", ticket.id)}>
                      {ticket.properties?.subject || "No Subject"}
                    </TicketTitle>
                    <TicketBody>{ticket.properties?.content || "No description"}</TicketBody>
                    <div style={{ fontSize: '10px', color: '#999', marginTop: '4px' }}>
                      Created: {ticket.properties?.createdate ? new Date(ticket.properties.createdate).toLocaleDateString() : "Unknown date"}
                    </div>
                  </TicketItem>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: '#999', padding: '20px 0' }}>
                  No existing tickets found for this contact.
                </div>
              )}
            </div>
          )}
        </TicketSection>
      )}
    </Container>
  );
};

export default CrmView;
