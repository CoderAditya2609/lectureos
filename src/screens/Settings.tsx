import { useState } from "react";
import { useAppState, store } from "../store/store";
import { LiquidMetalButton } from "../components/LiquidMetal";
import { verifyNvidiaApiKey, normalizeNvidiaKey, maskApiKey, type NvidiaVerifyResult } from "../ai/provider";

export function Settings() {
  const { settings } = useAppState();
  const [busy, setBusy] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [result, setResult] = useState<NvidiaVerifyResult | null>(null);

  async function verifyKey() {
    const key = normalizeNvidiaKey(settings.nvidiaApiKey);
    if (!key) {
      setResult({
        ok: false,
        code: "empty",
        message: "Paste an NVIDIA API key first.",
        model: settings.nvidiaModel,
        provider: "NVIDIA",
      });
      return;
    }
    setBusy(true);
    setResult(null);
    try {
      const next = await verifyNvidiaApiKey(key, settings.nvidiaModel);
      store.updateSettings({
        nvidiaApiKey: key,
        nvidiaApiKeyVerified: next.ok,
        nvidiaModel: next.model,
      });
      setResult(next);
    } finally {
      setBusy(false);
    }
  }

  const status = result ?? (settings.nvidiaApiKeyVerified
    ? {
        ok: true,
        code: "ok" as const,
        message: `Connected to NVIDIA AI · ${settings.nvidiaModel}`,
        model: settings.nvidiaModel,
        provider: "NVIDIA" as const,
      }
    : null);

  return (
    <div className="page">
      <p className="kicker">Settings</p>
      <h1>Preferences</h1>
      <p className="lede">Keep the planner honest. Connect NVIDIA when you want model-backed recommendations.</p>

      <section className="ai-card">
        <p className="kicker">AI connection</p>
        <h2>NVIDIA AI</h2>
        <p className="ai-card-copy">Power Lecture OS intelligence with your own NVIDIA API key.</p>

        <label className="ai-key-label">
          <span>API key</span>
          <div className="ai-key-row">
            <input
              className="field"
              type={showKey ? "text" : "password"}
              autoComplete="off"
              spellCheck={false}
              value={settings.nvidiaApiKey}
              placeholder="nvapi-…"
              onChange={(e) => {
                store.updateSettings({ nvidiaApiKey: e.target.value });
                setResult(null);
              }}
            />
            <button className="btn" type="button" onClick={() => setShowKey((v) => !v)}>
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
        </label>

        <div className="ai-verify-row">
          <LiquidMetalButton size="sm" onClick={verifyKey} disabled={busy || !settings.nvidiaApiKey.trim()}>
            {busy ? "Verifying" : "Verify connection"}
          </LiquidMetalButton>
        </div>

        <div className={`ai-status ${busy ? "pending" : status?.ok ? "ok" : status ? "bad" : ""}`}>
          {busy && (
            <p className="ai-thinking">
              <span className="pulse-dot" /> Connecting to NVIDIA…
            </p>
          )}
          {!busy && status?.ok && (
            <>
              <p className="ai-status-title">✓ Connected</p>
              <p>NVIDIA AI</p>
              <p>Model: {status.model}</p>
              {status.latencyMs != null && <p>Response: {status.latencyMs} ms</p>}
              {settings.nvidiaApiKey && <p className="meta-line">{maskApiKey(settings.nvidiaApiKey)}</p>}
            </>
          )}
          {!busy && status && !status.ok && (
            <>
              <p className="ai-status-title">✕ Connection failed</p>
              <p>{status.message}</p>
              <button className="btn" type="button" onClick={verifyKey}>
                Try again
              </button>
            </>
          )}
          {!busy && !status && (
            <p className="meta-line">AI will not call NVIDIA until this key verifies against a real request.</p>
          )}
        </div>
      </section>

      <div className="fields" style={{ maxWidth: 520 }}>
        <label>
          <span>Display name</span>
          <input className="field" value={settings.displayName} onChange={(e) => store.updateSettings({ displayName: e.target.value })} />
        </label>
        <label>
          <span>AI provider</span>
          <input className="field" value={settings.aiProvider} readOnly />
        </label>
        <label>
          <span>NVIDIA model</span>
          <input
            className="field"
            value={settings.nvidiaModel}
            onChange={(e) => store.updateSettings({ nvidiaModel: e.target.value, nvidiaApiKeyVerified: false })}
          />
        </label>
        <label>
          <span>Planning buffer (%)</span>
          <input
            className="field"
            type="number"
            value={settings.bufferPercent}
            onChange={(e) => store.updateSettings({ bufferPercent: Number(e.target.value) })}
          />
        </label>
        <label>
          <span>Revision intervals (days, comma-separated)</span>
          <input
            className="field"
            value={settings.revisionIntervals.join(", ")}
            onChange={(e) =>
              store.updateSettings({
                revisionIntervals: e.target.value
                  .split(",")
                  .map((n) => Number(n.trim()))
                  .filter((n) => n > 0),
              })
            }
          />
        </label>
      </div>
      <div className="toolbar" style={{ marginTop: 24 }}>
        <button className="btn" onClick={() => store.resetSeed()}>
          Reload sample JEE map
        </button>
        <button className="btn" onClick={() => store.clearAll()}>
          Clear all data
        </button>
      </div>
    </div>
  );
}
