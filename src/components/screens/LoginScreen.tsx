import { useState, ChangeEvent } from "react";
import { useAutoFocus } from "../../hooks/useAutoFocus";
import {
  Wrapper,
  RoundedInput,
  RoundedButton,
  LinkButton,
  Row,
} from "../Components";
import { PANTERA } from "../../utils/colors";
import { LOG_IN } from "../../constants/buttonIds";

interface LoginScreenProps {
  cti: any;
  handleNextScreen: () => void;
}

function LoginScreen({ cti, handleNextScreen }: LoginScreenProps) {
  const usernameInput = useAutoFocus();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [subStatus, setSubStatus] = useState("");

  const handleLogin = () => {
    cti.userLoggedIn();
    handleNextScreen();
  };

  const handleSubscribe = async () => {
    setSubmitting(true);
    setSubStatus("Subscribing...");
    try {
      // Get current origin for webhook URL
      const currentOrigin = window.location.origin;
      const webhookUrl = `${currentOrigin}/api/hubspot/dialpad_webhook`;
      console.log("[Webhook Setup] Subscribing with URL:", webhookUrl);

      const response = await fetch("/api/hubspot/dialpad_subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl })
      });
      const data = await response.json();
      if (response.ok) {
        setSubStatus("Success! Subscribed.");
      } else {
        setSubStatus(`Error: ${data.error || "Unknown"}`);
      }
    } catch (err) {
      setSubStatus("Failed to connect to proxy.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUsername = ({
    target: { value },
  }: ChangeEvent<HTMLInputElement>) => setUsername(value);
  const handlePassword = ({
    target: { value },
  }: ChangeEvent<HTMLInputElement>) => setPassword(value);

  const handleOpenWindow = () => {
    const url = `${cti.hostUrl}/calling-integration-popup-ui/${cti.portalId}?usesCallingWindow=false`;
    window.open(url, "_blank");
  };

  return (
    <Wrapper style={{ color: PANTERA }}>
      <form>
        <h4 style={{ textAlign: "center" }}>Log into your calling account</h4>
        <div style={{ marginBottom: "5px", fontSize: "14px" }}>User Name</div>
        <RoundedInput
          value={username}
          onChange={handleUsername}
          ref={usernameInput}
          autoComplete="username"
        />
        <div style={{ marginBottom: "5px", fontSize: "14px" }}>Password</div>
        <RoundedInput
          type="password"
          value={password}
          onChange={handlePassword}
          autoComplete="current-password"
        />
        <br />
        <Row>
          <RoundedButton
            use="primary"
            onClick={handleLogin}
            type="button"
            data-test-id={LOG_IN}
          >
            Log in
          </RoundedButton>
        </Row>
        <br />
        <Row>
          <LinkButton
            use="transparent-on-primary"
            onClick={handleLogin}
            type="button"
          >
            Sign in with SSO
          </LinkButton>
        </Row>
        <br />
        {!cti.usesCallingWindow && (
          <Row>
            <LinkButton
              use="transparent-on-primary"
              onClick={handleOpenWindow}
              type="button"
            >
              Open calling window
            </LinkButton>
          </Row>
        )}
        <br />
        <div style={{ borderTop: "1px solid #eee", paddingTop: "15px", marginTop: "10px" }}>
          <div style={{ fontSize: "11px", color: "#666", marginBottom: "8px", textAlign: "center" }}>
            Admin: Setup Dialpad Events Webhook
          </div>
          <Row>
            <RoundedButton
              use="secondary"
              onClick={handleSubscribe}
              type="button"
              disabled={submitting}
              style={{ fontSize: "12px", padding: "4px 8px" }}
            >
              {submitting ? "Processing..." : "Subscribe to Webhooks"}
            </RoundedButton>
          </Row>
          {subStatus && (
            <div style={{ fontSize: "10px", textAlign: "center", marginTop: "5px", color: subStatus.includes("Success") ? "green" : "red" }}>
              {subStatus}
            </div>
          )}
        </div>
      </form>
    </Wrapper>
  );
}

export default LoginScreen;
