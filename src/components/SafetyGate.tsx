"use client";

import type { RecoveryProposal } from "@/lib/voxops/incident-tools";
import type { VoiceToolObservation } from "./VoiceAgentPanel";
import {
  OpsIcon,
  RecoveryDecisionPanel,
  StatusBadge,
  type RecoveryStatus,
} from "./CommandCenter";

type Props = {
  proposal: RecoveryProposal | null;
  status: RecoveryStatus;
  blocked: VoiceToolObservation | null;
  onApprove: () => void;
  onReject: () => void;
};

export default function SafetyGate({
  proposal,
  status,
  blocked,
  onApprove,
  onReject,
}: Props) {
  // A rejected request never creates approval controls. An earlier valid proposal
  // remains independently actionable, preserving the existing authorization flow.
  const actionable = proposal && status === "pending";
  const policyLocked = blocked && !proposal;
  const labels: Record<RecoveryStatus, string> = {
    idle: "Protected",
    pending: "Human approval required",
    executing: "Executing recovery",
    completed: "Recovery completed",
    rejected: "Rejected by human",
  };
  return (
    <section
      className={`panel safety-gate ${policyLocked ? "gate-blocked" : actionable ? "gate-pending" : status === "completed" ? "gate-completed" : ""}`}
    >
      <div className="gate-header">
        <div className="gate-identity">
          <span className="gate-icon">
            <OpsIcon />
          </span>
          <div>
            <p className="eyebrow">Human Safety Gate</p>
            <h2>
              {policyLocked ? "Policy blocked. Gate locked." : labels[status]}
            </h2>
          </div>
        </div>
        <StatusBadge
          tone={
            policyLocked || status === "rejected"
              ? "red"
              : actionable
                ? "amber"
                : "green"
          }
        >
          {policyLocked
            ? "Policy blocked"
            : status === "idle"
              ? "Protected"
              : labels[status]}
        </StatusBadge>
      </div>
      {blocked && <RecoveryDecisionPanel blocked={blocked} />}
      {!proposal ? (
        <p className="gate-description">
          {blocked
            ? "This request did not pass deterministic policy validation. Human approval is unavailable."
            : "No state-changing action awaiting authorization. Evidence must validate a proposal before approval becomes available."}
        </p>
      ) : (
        <div className="gate-proposal">
          <div>
            <p className="eyebrow">
              {blocked ? "Previously validated proposal" : "Recovery proposal"}
            </p>
            <h3>
              {proposal.service}{" "}
              <span className="version-change">
                {proposal.fromVersion} <span>&rarr;</span> {proposal.toVersion}
              </span>
            </h3>
            <div className="gate-checks">
              <StatusBadge tone="green">Evidence supported</StatusBadge>
              <StatusBadge tone="green">Policy validated</StatusBadge>
            </div>
            <p className="gate-description">{proposal.reason}</p>
            <details className="evidence-details">
              <summary>
                Supporting evidence &middot; {proposal.evidence.length}{" "}
                observations
              </summary>
              <ul className="evidence-list">
                {proposal.evidence.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </details>
          </div>
          {actionable && (
            <div className="gate-actions">
              <button className="button button-approve" onClick={onApprove}>
                Approve Rollback
              </button>
              <button className="button button-quiet" onClick={onReject}>
                Reject Action
              </button>
            </div>
          )}
          {status === "rejected" && (
            <p className="muted">
              Human authorization denied. No state change occurred.
            </p>
          )}
          {status === "completed" && (
            <p className="recovery-complete">
              Simulated rollback completed. Verification is a separate tool
              check.
            </p>
          )}
        </div>
      )}
      <div className="gate-footer">
        <OpsIcon />
        <strong>AI cannot bypass this gate.</strong>
        <span>Deterministic policy + explicit human control</span>
      </div>
    </section>
  );
}
