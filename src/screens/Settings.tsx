import { useAppState, store } from "../store/store";

export function Settings() {
  const { settings } = useAppState();

  return (
    <div className="page">
      <p className="kicker">Settings</p>
      <h1>Preferences</h1>
      <p className="lede">Provider is abstracted as NVIDIA. Swap later without rewriting the app.</p>
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
            onChange={(e) => store.updateSettings({ nvidiaModel: e.target.value })}
          />
        </label>
        <label>
          <span>NVIDIA API key</span>
          <input
            className="field"
            type="password"
            autoComplete="off"
            value={settings.nvidiaApiKey}
            onChange={(e) => store.updateSettings({ nvidiaApiKey: e.target.value })}
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
