import React, { useState, useEffect, useCallback } from "react";

const COLORS = {
  bg: "#15181c",
  panel: "#1e2226",
  panelAlt: "#252a2f",
  border: "#33393f",
  borderStrong: "#454c53",
  text: "#eceff1",
  textMuted: "#8b929a",
  textFaint: "#5c636a",
  green: "#39d98a",
  greenDim: "#173d2b",
  amber: "#f5a623",
  amberDim: "#3f2e0d",
  red: "#ef4444",
  redDim: "#3a1414",
  blue: "#4d9fef",
};

const FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Inter:wght@400;500;600&display=swap');";

const SCENARIO = {
  opName: "Bracket Machining",
  opCode: "OP-30 / Milling",
  quantity: 50,
  material: "Aluminum 6061-T6",
  drawingRev: "Drawing 4471, Rev C",
  cncProgram: "O1042",
  programRev: "Program Rev 3",
  fixture: "Modular Vise Fixture V3",
  workOffset: "G54",
};

const MACHINE_CHECKS = [
  { id: "power", label: "Power / control available", detail: "Control cabinet on, HMI responsive, drive power enabled." },
  { id: "estop", label: "E-stop released", detail: "All E-stop buttons pulled out and reset." },
  { id: "guard", label: "Guard / door closed", detail: "Enclosure door fully closed and interlock engaged." },
  { id: "alarm", label: "No active alarm", detail: "Alarm log clear, no fault codes pending." },
  { id: "lube", label: "Lubrication / coolant ready", detail: "Way lube level OK, coolant tank filled and pump primed." },
  { id: "ref", label: "Reference return complete", detail: "All axes homed (X, Y, Z) to machine reference position." },
];

const TOOLS = [
  { id: "t01", number: "T01", type: "Face Mill", size: "50 mm", programRev: SCENARIO.programRev, note: "Load in spindle-adjacent pocket 1." },
  { id: "t02", number: "T02", type: "End Mill", size: "10 mm, 4-flute", programRev: SCENARIO.programRev, note: "Load in pocket 2, check for chipping." },
  { id: "t03", number: "T03", type: "Drill", size: "8 mm", programRev: SCENARIO.programRev, note: "Load in pocket 3, confirm point angle 118°." },
];

const WORKPIECE_ITEMS = [
  { id: "fixture", label: "Fixture", detail: `${SCENARIO.fixture} — mount on table, verify zero point with dial indicator.` },
  { id: "orientation", label: "Workpiece orientation", detail: "Datum face against fixed jaw, machined pocket side facing up." },
  { id: "clamping", label: "Clamping instruction", detail: "Two-point clamp on raw face, torque to 40 Nm, no witness marks on finished faces." },
  { id: "material", label: "Material / drawing revision", detail: `${SCENARIO.material}, ${SCENARIO.drawingRev}.` },
  { id: "offset", label: "Work offset", detail: `${SCENARIO.workOffset} — set at top face center of raw stock, verify with edge finder.` },
];

const STAGES = ["power", "checks", "tools", "workpiece", "ready", "operation"];

const STAGE_META = {
  checks: { label: "Machine checks", index: 1 },
  tools: { label: "Tools", index: 2 },
  workpiece: { label: "Workpiece", index: 3 },
  ready: { label: "Ready", index: 4 },
  operation: { label: "Operation", index: 5 },
};

const STORAGE_KEY = "vmc_hmi_progress_v1";

function initialState() {
  return {
    stage: "power",
    checksConfirmed: {},
    toolsConfirmed: {},
    workpieceConfirmed: {},
    operationStatus: "READY",
  };
}

function Lamp({ color, size = 14 }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        boxShadow: `0 0 0 2px ${COLORS.panelAlt}, 0 0 8px 2px ${color}88`,
        flexShrink: 0,
      }}
    />
  );
}

function PanelButton({ children, onClick, disabled, tone = "default", full }) {
  const toneStyles = {
    default: { bg: COLORS.panelAlt, fg: COLORS.text, border: COLORS.borderStrong },
    green: { bg: COLORS.greenDim, fg: COLORS.green, border: COLORS.green },
    amber: { bg: COLORS.amberDim, fg: COLORS.amber, border: COLORS.amber },
    red: { bg: COLORS.redDim, fg: COLORS.red, border: COLORS.red },
  }[tone];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        fontFamily: "'Oswald', sans-serif",
        fontWeight: 600,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        fontSize: 15,
        padding: "16px 28px",
        borderRadius: 8,
        border: `2px solid ${disabled ? COLORS.border : toneStyles.border}`,
        background: disabled ? COLORS.panel : toneStyles.bg,
        color: disabled ? COLORS.textFaint : toneStyles.fg,
        cursor: disabled ? "not-allowed" : "pointer",
        width: full ? "100%" : undefined,
        boxShadow: disabled ? "none" : `inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 0 rgba(0,0,0,0.3)`,
        transition: "transform 0.05s ease",
      }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = "translateY(2px)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
    >
      {children}
    </button>
  );
}

function ProgressRail({ stage }) {
  const order = ["checks", "tools", "workpiece", "ready", "operation"];
  const currentIdx = order.indexOf(stage);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 28 }}>
      {order.map((s, i) => {
        const done = currentIdx > i || stage === "operation" && i < order.length - 1;
        const active = s === stage;
        return (
          <React.Fragment key={s}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 56 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                  fontWeight: 700,
                  background: active ? COLORS.amber : done ? COLORS.green : COLORS.panelAlt,
                  color: active || done ? "#111" : COLORS.textMuted,
                  border: `2px solid ${active ? COLORS.amber : done ? COLORS.green : COLORS.border}`,
                }}
              >
                {STAGE_META[s].index}
              </div>
              <div
                style={{
                  fontFamily: "'Oswald', sans-serif",
                  fontSize: 10,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: active ? COLORS.amber : done ? COLORS.green : COLORS.textFaint,
                  marginTop: 6,
                  textAlign: "center",
                }}
              >
                {STAGE_META[s].label}
              </div>
            </div>
            {i < order.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? COLORS.green : COLORS.border, marginBottom: 18 }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

function JobOrderStrip() {
  const fields = [
    ["Qty", SCENARIO.quantity],
    ["Program", SCENARIO.cncProgram],
    ["Rev", SCENARIO.drawingRev.split(" ").pop()],
    ["Offset", SCENARIO.workOffset],
  ];
  return (
    <div
      style={{
        display: "flex",
        gap: 20,
        flexWrap: "wrap",
        padding: "10px 16px",
        background: COLORS.panelAlt,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 8,
        marginBottom: 20,
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 12,
      }}
    >
      <span style={{ color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {SCENARIO.opCode}
      </span>
      {fields.map(([k, v]) => (
        <span key={k} style={{ color: COLORS.text }}>
          <span style={{ color: COLORS.textFaint }}>{k}:</span> {v}
        </span>
      ))}
    </div>
  );
}

function ChecklistRow({ label, detail, confirmed, onConfirm, activeHighlight }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 16,
        padding: "16px 18px",
        borderRadius: 8,
        border: `1px solid ${confirmed ? COLORS.green : activeHighlight ? COLORS.amber : COLORS.border}`,
        background: confirmed ? COLORS.greenDim : COLORS.panelAlt,
        marginBottom: 10,
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Lamp color={confirmed ? COLORS.green : COLORS.amber} />
        <div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 16, color: COLORS.text, textTransform: "uppercase", letterSpacing: "0.02em" }}>
            {label}
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>
            {detail}
          </div>
        </div>
      </div>
      {!confirmed ? (
        <PanelButton tone="amber" onClick={onConfirm}>Confirm</PanelButton>
      ) : (
        <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, fontWeight: 600, color: COLORS.green, whiteSpace: "nowrap", paddingTop: 10 }}>
          CONFIRMED
        </div>
      )}
    </div>
  );
}

export default function VMCOperatorHMI() {
  const [state, setState] = useState(initialState());
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setState({ ...initialState(), ...parsed });
      }
    } catch (e) {
      // no saved state yet, start fresh
    } finally {
      setLoaded(true);
    }
  }, []);

  const persist = useCallback((next) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setSaveError(false);
    } catch (e) {
      setSaveError(true);
    }
  }, []);

  const update = useCallback((patch) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      persist(next);
      return next;
    });
  }, [persist]);

  if (!loaded) {
    return (
      <div style={{ fontFamily: "'Inter', sans-serif", color: COLORS.textMuted, padding: 40, textAlign: "center" }}>
        Loading HMI state...
      </div>
    );
  }

  const allChecksConfirmed = MACHINE_CHECKS.every((c) => state.checksConfirmed[c.id]);
  const allToolsConfirmed = TOOLS.every((t) => state.toolsConfirmed[t.id]);
  const allWorkpieceConfirmed = WORKPIECE_ITEMS.every((w) => state.workpieceConfirmed[w.id]);

  const resetAll = () => {
    const fresh = initialState();
    setState(fresh);
    persist(fresh);
  };

  return (
    <div
      style={{
        fontFamily: "'Inter', sans-serif",
        background: COLORS.bg,
        color: COLORS.text,
        minHeight: 560,
        padding: "24px 20px 32px",
        borderRadius: 12,
        maxWidth: 640,
        margin: "0 auto",
      }}
    >
      <style>{FONT_IMPORT}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Lamp color={COLORS.blue} size={12} />
          <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 15, letterSpacing: "0.08em", textTransform: "uppercase" }}>
            VMC-01 Operator HMI
          </span>
        </div>
        {state.stage !== "power" && (
          <button
            onClick={resetAll}
            style={{
              background: "transparent",
              border: `1px solid ${COLORS.border}`,
              color: COLORS.textFaint,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              padding: "5px 10px",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            RESET DEMO
          </button>
        )}
      </div>

      {state.stage !== "power" && <ProgressRail stage={state.stage} />}
      {state.stage !== "power" && <JobOrderStrip />}

      {saveError && (
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: COLORS.amber, marginBottom: 12 }}>
          Progress could not be saved — continuing in this session only.
        </div>
      )}

      {state.stage === "power" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 440, gap: 24 }}>
          <Lamp color={COLORS.textFaint} size={20} />
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 22, fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", textAlign: "center" }}>
            Machine powered down
          </div>
          <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, color: COLORS.textMuted, textAlign: "center", maxWidth: 340 }}>
            Job order OP-30 / Milling loaded — {SCENARIO.opName}, qty {SCENARIO.quantity}, {SCENARIO.material}.
          </div>
          <PanelButton tone="green" onClick={() => update({ stage: "checks" })}>
            Power On
          </PanelButton>
        </div>
      )}

      {state.stage === "checks" && (
        <div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            Confirm each machine check before proceeding
          </div>
          {MACHINE_CHECKS.map((c) => (
            <ChecklistRow
              key={c.id}
              label={c.label}
              detail={c.detail}
              confirmed={!!state.checksConfirmed[c.id]}
              onConfirm={() => update({ checksConfirmed: { ...state.checksConfirmed, [c.id]: true } })}
            />
          ))}
          <div style={{ marginTop: 20 }}>
            <PanelButton tone="green" full disabled={!allChecksConfirmed} onClick={() => update({ stage: "tools" })}>
              Next: Required Tools
            </PanelButton>
          </div>
        </div>
      )}

      {state.stage === "tools" && (
        <div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            Insert and confirm each tool for {SCENARIO.cncProgram} ({SCENARIO.programRev})
          </div>
          {TOOLS.map((t) => (
            <ChecklistRow
              key={t.id}
              label={`${t.number} — ${t.type}, ${t.size}`}
              detail={t.note}
              confirmed={!!state.toolsConfirmed[t.id]}
              onConfirm={() => update({ toolsConfirmed: { ...state.toolsConfirmed, [t.id]: true } })}
            />
          ))}
          <div style={{ marginTop: 20 }}>
            <PanelButton tone="green" full disabled={!allToolsConfirmed} onClick={() => update({ stage: "workpiece" })}>
              Next: Workpiece Setup
            </PanelButton>
          </div>
        </div>
      )}

      {state.stage === "workpiece" && (
        <div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            Arrange, clamp and confirm workpiece setup
          </div>
          {WORKPIECE_ITEMS.map((w) => (
            <ChecklistRow
              key={w.id}
              label={w.label}
              detail={w.detail}
              confirmed={!!state.workpieceConfirmed[w.id]}
              onConfirm={() => update({ workpieceConfirmed: { ...state.workpieceConfirmed, [w.id]: true } })}
            />
          ))}
          <div style={{ marginTop: 20 }}>
            <PanelButton tone="green" full disabled={!allWorkpieceConfirmed} onClick={() => update({ stage: "ready" })}>
              Next: Ready Review
            </PanelButton>
          </div>
        </div>
      )}

      {state.stage === "ready" && (
        <div>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 12, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
            Final checklist
          </div>
          {[
            ["Machine checks", MACHINE_CHECKS.length, MACHINE_CHECKS.length],
            ["Required tools", TOOLS.length, TOOLS.length],
            ["Workpiece setup", WORKPIECE_ITEMS.length, WORKPIECE_ITEMS.length],
          ].map(([label, count]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: COLORS.greenDim, border: `1px solid ${COLORS.green}`, borderRadius: 8, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Lamp color={COLORS.green} />
                <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 600, fontSize: 15, textTransform: "uppercase" }}>{label}</span>
              </div>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: COLORS.green }}>{count}/{count} OK</span>
            </div>
          ))}
          <div
            style={{
              marginTop: 14,
              padding: "18px",
              textAlign: "center",
              border: `2px solid ${COLORS.green}`,
              borderRadius: 8,
              background: COLORS.greenDim,
              fontFamily: "'Oswald', sans-serif",
              fontWeight: 700,
              fontSize: 20,
              letterSpacing: "0.08em",
              color: COLORS.green,
            }}
          >
            MACHINE READY
          </div>
          <div style={{ marginTop: 20 }}>
            <PanelButton tone="green" full onClick={() => update({ stage: "operation", operationStatus: "READY" })}>
              Proceed to Operation
            </PanelButton>
          </div>
        </div>
      )}

      {state.stage === "operation" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28, paddingTop: 12 }}>
          <div style={{ fontFamily: "'Oswald', sans-serif", fontSize: 18, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {SCENARIO.opName}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 10,
              padding: "28px 40px",
              borderRadius: 12,
              border: `2px solid ${
                state.operationStatus === "RUNNING" ? COLORS.green : state.operationStatus === "STOPPED" ? COLORS.red : COLORS.amber
              }`,
              background:
                state.operationStatus === "RUNNING" ? COLORS.greenDim : state.operationStatus === "STOPPED" ? COLORS.redDim : COLORS.amberDim,
            }}
          >
            <Lamp
              size={22}
              color={state.operationStatus === "RUNNING" ? COLORS.green : state.operationStatus === "STOPPED" ? COLORS.red : COLORS.amber}
            />
            <div
              style={{
                fontFamily: "'Oswald', sans-serif",
                fontWeight: 700,
                fontSize: 26,
                letterSpacing: "0.1em",
                color: state.operationStatus === "RUNNING" ? COLORS.green : state.operationStatus === "STOPPED" ? COLORS.red : COLORS.amber,
              }}
            >
              {state.operationStatus}
            </div>
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <PanelButton
              tone="green"
              disabled={state.operationStatus === "RUNNING"}
              onClick={() => update({ operationStatus: "RUNNING" })}
            >
              Start
            </PanelButton>
            <PanelButton
              tone="red"
              disabled={state.operationStatus !== "RUNNING"}
              onClick={() => update({ operationStatus: "STOPPED" })}
            >
              Stop
            </PanelButton>
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: COLORS.textFaint, textAlign: "center" }}>
            {SCENARIO.cncProgram} ({SCENARIO.programRev}) · {SCENARIO.fixture} · {SCENARIO.workOffset}
          </div>
        </div>
      )}
    </div>
  );
}
