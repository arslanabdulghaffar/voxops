import type { ReactNode } from "react";
import type { ConnectionState, VoiceToolObservation } from "./VoiceAgentPanel";
import {
  incidentScenarios,
  type Incident,
  type IncidentScenario,
  type ScenarioId,
  type Service,
} from "@/lib/voxops/scenarios";
import type { RecoveryProposal } from "@/lib/voxops/incident-tools";

export type RecoveryStatus =
  "idle" | "pending" | "executing" | "completed" | "rejected";
export type ProductView = "command" | "evaluation" | "audit";

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return (
    <span className={`status-badge tone-${tone}`}>
      <span className="status-dot" />
      {children}
    </span>
  );
}

export function OpsIcon({
  kind = "shield",
}: {
  kind?: "shield" | "mic" | "pulse" | "layers";
}) {
  const paths = {
    shield: (
      <>
        <path d="M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Z" />
        <path d="m8 12 3 3 5-6" />
      </>
    ),
    mic: (
      <>
        <rect x="9" y="3" width="6" height="12" rx="3" />
        <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" />
      </>
    ),
    pulse: <path d="M2 12h5l3-8 4 16 3-8h5" />,
    layers: (
      <>
        <path d="m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5" />
      </>
    ),
  };
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[kind]}
    </svg>
  );
}

export function AppHeader({
  connection,
  incident,
  healthy,
  view,
  onViewChange,
}: {
  connection: ConnectionState;
  incident: Incident | null;
  healthy: boolean;
  view: ProductView;
  onViewChange: (view: ProductView) => void;
}) {
  const labels: Record<ConnectionState, string> = {
    disconnected: "Offline",
    connecting: "Connecting",
    connected: "Connected",
    error: "Error",
  };
  return (
    <>
      <header className="app-header">
        <div className="brand">
          <svg
            className="brand-mark"
            viewBox="0 0 40 40"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="m20 2 16 9v18l-16 9L4 29V11L20 2Z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="m10 16 7 13 13-18M16 13l4 7"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div>
            <h1>
              VoxOps<span className="brand-tag">COMMAND</span>
            </h1>
            <p>Evidence-Gated AI Incident Commander</p>
          </div>
        </div>
        <div className="header-indicators">
          <div>
            <span>AssemblyAI Voice Agent</span>
            <StatusBadge
              tone={
                connection === "connected"
                  ? "cyan"
                  : connection === "error"
                    ? "red"
                    : "neutral"
              }
            >
              {labels[connection]}
            </StatusBadge>
          </div>
          <div>
            <span>Safety policy</span>
            <StatusBadge tone="green">Active</StatusBadge>
          </div>
          <div>
            <span>System · simulated</span>
            <StatusBadge tone={incident ? "red" : healthy ? "green" : "amber"}>
              {incident ? "Incident" : healthy ? "Operational" : "Degraded"}
            </StatusBadge>
          </div>
        </div>
      </header>
      <nav className="command-nav" aria-label="Product views">
        {(
          [
            ["command", "Command Center"],
            ["evaluation", "Evaluation"],
            ["audit", "Audit & Postmortem"],
          ] as const
        ).map(([id, label], index) => (
          <button
            key={id}
            aria-current={view === id ? "page" : undefined}
            aria-controls={`view-${id}`}
            onClick={() => onViewChange(id)}
          >
            <span className="nav-number">0{index + 1}</span>
            {label}
          </button>
        ))}
        <span className="nav-note">
          Voice for speed. Evidence for decisions. Humans for control.
        </span>
      </nav>
    </>
  );
}

const neutralDescriptions: Record<ScenarioId, string> = {
  "checkout-regression":
    "Checkout requests are failing and response times are rising.",
  "auth-regression":
    "Authentication requests are experiencing elevated failures.",
  "payment-provider":
    "Payment requests are timing out and latency is elevated.",
};

export function ScenarioSelector({
  scenario,
  locked,
  executing,
  active,
  onChange,
  onTrigger,
  onReset,
}: {
  scenario: IncidentScenario;
  locked: boolean;
  executing: boolean;
  active: boolean;
  onChange: (id: ScenarioId) => void;
  onTrigger: () => void;
  onReset: () => void;
}) {
  return (
    <section className="scenario-bar" aria-label="Controlled simulation">
      <div className="scenario-label">
        <OpsIcon kind="layers" />
        <div>
          <label htmlFor="scenario">Load incident scenario</label>
          <span>Controlled simulation</span>
        </div>
      </div>
      <div className="scenario-select">
        <select
          id="scenario"
          value={scenario.id}
          disabled={locked}
          onChange={(e) => onChange(e.target.value as ScenarioId)}
        >
          {incidentScenarios.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <p>{neutralDescriptions[scenario.id]}</p>
      </div>
      <div className="scenario-actions">
        <button
          className="button button-quiet"
          onClick={onReset}
          disabled={executing}
        >
          Reset Environment
        </button>
        <button
          className="button button-incident"
          onClick={onTrigger}
          disabled={locked}
        >
          {active ? "Incident active" : "Trigger Incident"}
        </button>
      </div>
    </section>
  );
}

export function ProductionHealthPanel({ services }: { services: Service[] }) {
  const healthy = services.filter((s) => s.status === "healthy").length;
  return (
    <section className="panel health-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Infrastructure</p>
          <h2>Production Health</h2>
        </div>
        <OpsIcon kind="pulse" />
      </div>
      <div className="health-summary">
        <span>
          <strong>{healthy}</strong> / {services.length} healthy
        </span>
        <span className="simulation-label">Simulated infrastructure</span>
      </div>
      <div className="service-list">
        {services.map((service) => (
          <article
            className={`service-card service-${service.status}`}
            key={service.id}
          >
            <div className="service-heading">
              <h3>{service.name}</h3>
              <StatusBadge
                tone={
                  service.status === "healthy"
                    ? "green"
                    : service.status === "critical"
                      ? "red"
                      : "amber"
                }
              >
                {service.status}
              </StatusBadge>
            </div>
            <dl className="service-metrics">
              <div>
                <dt>Version</dt>
                <dd>{service.version}</dd>
              </div>
              <div>
                <dt>Latency</dt>
                <dd>
                  {service.latency.toLocaleString()}
                  <small> ms</small>
                </dd>
              </div>
              <div>
                <dt>Error rate</dt>
                <dd>
                  {service.errorRate}
                  <small>%</small>
                </dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      <p className="panel-footnote">
        Scenario-driven metrics · No external production connection
      </p>
    </section>
  );
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}
export function investigationData(observation: VoiceToolObservation | null) {
  const data = record(observation?.result.data);
  const diagnosis = record(data.diagnosis);
  const deployments = record(data.deployments).deployments;
  const stableDeployment = Array.isArray(deployments)
    ? deployments.map(record).find((item) => item.state === "previous_stable")
    : undefined;
  return {
    rollbackTarget:
      typeof stableDeployment?.version === "string"
        ? stableDeployment.version
        : "",
    service: typeof data.service === "string" ? data.service : "",
    cause:
      typeof diagnosis.likely_cause === "string" ? diagnosis.likely_cause : "",
    confidence:
      typeof diagnosis.confidence === "string" ? diagnosis.confidence : "",
    action:
      typeof diagnosis.recommended_action === "string"
        ? diagnosis.recommended_action
        : "",
    evidence: Array.isArray(diagnosis.evidence)
      ? diagnosis.evidence.filter(
          (item): item is string => typeof item === "string",
        )
      : [],
  };
}

export function IncidentIntelligencePanel({
  incident,
  investigation,
  blocked,
  completed,
  verified,
}: {
  incident: Incident | null;
  investigation: VoiceToolObservation | null;
  blocked: VoiceToolObservation | null;
  completed: boolean;
  verified: boolean;
}) {
  const data = investigationData(investigation);
  return (
    <section className="panel intelligence-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Evidence before action</p>
          <h2>Incident Intelligence</h2>
        </div>
        <OpsIcon kind="layers" />
      </div>
      <div className="intelligence-content">
        {blocked && (
          <div className="inline-policy-block" role="status">
            <p className="eyebrow">Policy rejected</p>
            <code>{blocked.result.error}</code>
            <p>
              Human gate locked for this request. It did not authorize recovery.
            </p>
          </div>
        )}
        {!incident ? (
          <div className="calm-state">
            <span className="calm-icon">
              <OpsIcon kind="shield" />
            </span>
            <StatusBadge tone="green">
              {completed ? "Recovered" : "Systems healthy"}
            </StatusBadge>
            <h3>{completed ? "Service restored" : "Ready when it matters."}</h3>
            <p>
              {completed
                ? verified
                  ? "Recovery independently verified by the incident tool."
                  : "Ask VoxOps to verify recovery before closing the incident."
                : "Load a scenario, start the voice agent, and ask it to investigate. Evidence will guide every recovery decision."}
            </p>
          </div>
        ) : (
          <>
            <div className="incident-summary">
              <div className="row-between">
                <StatusBadge tone="red">{incident.severity}</StatusBadge>
                <code>{incident.id}</code>
              </div>
              <p className="incident-service">{incident.service}</p>
              <h3>{incident.title}</h3>
              <p>{incident.summary}</p>
            </div>
            <div className="intelligence-section">
              <p className="eyebrow">
                01 /{" "}
                {data.evidence.length
                  ? "Observed evidence"
                  : "Initial evidence"}
              </p>
              <ul className="evidence-list">
                {(data.evidence.length ? data.evidence : incident.evidence).map(
                  (item) => (
                    <li key={item}>{item}</li>
                  ),
                )}
              </ul>
            </div>
          </>
        )}
        {investigation && (
          <>
            <div className="intelligence-section diagnosis">
              <p className="eyebrow">
                02 / Likely diagnosis · {data.confidence} confidence
              </p>
              <h3>{data.cause || investigation.result.summary}</h3>
              <span className="muted">Investigated: {data.service}</span>
            </div>
            {data.action && (
              <div className="intelligence-section">
                <p className="eyebrow">03 / Recommended action</p>
                <p>{data.action}</p>
              </div>
            )}
          </>
        )}
        {incident && !investigation && (
          <div className="awaiting-evidence">
            <span className="status-dot" />
            Awaiting voice investigation. No diagnosis yet.
          </div>
        )}
      </div>
    </section>
  );
}

export function RecoveryDecisionPanel({
  blocked,
}: {
  blocked: VoiceToolObservation;
}) {
  const data = record(blocked.result.data);
  return (
    <div className="policy-decision" role="status">
      <div className="row-between">
        <p className="eyebrow">Recovery decision</p>
        <StatusBadge tone="red">Policy rejected</StatusBadge>
      </div>
      <h3>
        {String(blocked.arguments.service ?? "Requested service")}{" "}
        <span>→</span>{" "}
        {String(blocked.arguments.target_version ?? "Requested version")}
      </h3>
      <code className="policy-error">{blocked.result.error}</code>
      <p>{blocked.result.summary}</p>
      {typeof data.diagnosis === "string" && (
        <div className="decision-cause">
          <span className="eyebrow">Evidence-backed cause</span>
          <p>{data.diagnosis}</p>
        </div>
      )}
      <div className="decision-footer">
        <strong>Human gate locked for this request</strong>
        <span>No state change occurred from this request.</span>
      </div>
    </div>
  );
}

export function IncidentPipeline({
  investigation,
  blocked,
  proposal,
  status,
  verified,
}: {
  investigation: VoiceToolObservation | null;
  blocked: VoiceToolObservation | null;
  proposal: RecoveryProposal | null;
  status: RecoveryStatus;
  verified: boolean;
}) {
  // A later rejected request does not revoke a previously validated proposal.
  const policyLocked = blocked && !proposal;
  const steps = [
    [
      "Evidence",
      investigation
        ? "Complete"
        : proposal
          ? "Policy evidence"
          : "Awaiting tool",
      investigation || proposal ? "green" : "neutral",
    ],
    [
      "Diagnosis",
      investigation ? "Complete" : "Pending",
      investigation ? "green" : "neutral",
    ],
    [
      "Policy validation",
      proposal ? "Validated" : blocked ? "Rejected" : "Pending",
      proposal ? "green" : blocked ? "red" : "neutral",
    ],
    [
      "Human gate",
      policyLocked
        ? "Locked for request"
        : status === "pending"
          ? "Awaiting approval"
          : status === "rejected"
            ? "Rejected by human"
            : status === "executing" || status === "completed"
              ? "Approved"
              : "Protected",
      policyLocked || status === "rejected"
        ? "red"
        : status === "pending"
          ? "amber"
          : proposal
            ? "green"
            : "neutral",
    ],
    [
      "Recovery",
      status === "completed"
        ? "Completed"
        : status === "executing"
          ? "Executing"
          : policyLocked || status === "rejected"
            ? "Blocked"
            : "Pending",
      status === "completed"
        ? "green"
        : policyLocked || status === "rejected"
          ? "red"
          : "neutral",
    ],
    [
      "Verification",
      verified ? "Verified" : "Pending",
      verified ? "green" : "neutral",
    ],
  ];
  return (
    <section
      className="panel pipeline-panel"
      aria-label="Evidence-gated recovery progress"
    >
      <div className="pipeline-heading">
        <p className="eyebrow">Evidence-gated recovery</p>
        <span>
          {blocked && proposal
            ? "Tracking the validated proposal. Separate rejected request below."
            : "Policy first. Human authorization second."}
        </span>
      </div>
      <ol className="incident-pipeline">
        {steps.map(([label, state, tone], index) => (
          <li key={label} className={`tone-${tone}`}>
            <span className="step-number">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h3>{label}</h3>
              <p>{state}</p>
            </div>
            {index < steps.length - 1 && (
              <span className="step-arrow" aria-hidden="true">
                →
              </span>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
