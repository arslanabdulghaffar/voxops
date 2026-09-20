"use client";

import { useState } from "react";

import VoiceAgentPanel from "@/components/VoiceAgentPanel";
import SafetyGate from "@/components/SafetyGate";
import IncidentTimeline from "@/components/IncidentTimeline";
import PostmortemReport from "@/components/PostmortemReport";

import {
  checkoutFailureServices,
  checkoutIncident,
  healthyServices,
  recoveredServices,
  type Incident,
  type Service,
} from "@/lib/voxops/scenarios";

import type {
  IncidentToolResult,
  RecoveryProposal,
} from "@/lib/voxops/incident-tools";

import type {
  TimelineEvent,
  TimelineEventType,
} from "@/lib/voxops/timeline";

type RecoveryStatus =
  | "idle"
  | "pending"
  | "executing"
  | "completed"
  | "rejected";

export default function Home() {
  const [services, setServices] =
    useState<Service[]>(
      healthyServices
    );

  const [incident, setIncident] =
    useState<Incident | null>(
      null
    );

  const [
    recoveryProposal,
    setRecoveryProposal,
  ] =
    useState<RecoveryProposal | null>(
      null
    );

  const [
    recoveryStatus,
    setRecoveryStatus,
  ] =
    useState<RecoveryStatus>(
      "idle"
    );

  const [
    recoveryVerified,
    setRecoveryVerified,
  ] = useState(false);

  const [
    timeline,
    setTimeline,
  ] =
    useState<TimelineEvent[]>(
      []
    );

  function createTimelineEvent(
    type: TimelineEventType,
    title: string,
    detail: string
  ): TimelineEvent {
    return {
      id:
        crypto.randomUUID(),

      type,
      title,
      detail,

      timestamp:
        Date.now(),
    };
  }

  function addTimelineEvent(
    type: TimelineEventType,
    title: string,
    detail: string
  ) {
    const event =
      createTimelineEvent(
        type,
        title,
        detail
      );

    setTimeline(
      (current) => [
        ...current,
        event,
      ]
    );
  }

  const triggerIncident = () => {
    setServices(
      checkoutFailureServices
    );

    const newIncident = {
      ...checkoutIncident,

      startedAt:
        new Date().toISOString(),
    };

    setIncident(
      newIncident
    );

    setRecoveryProposal(
      null
    );

    setRecoveryStatus(
      "idle"
    );

    setRecoveryVerified(
      false
    );

    setTimeline([
      createTimelineEvent(
        "incident",
        "SEV-1 incident detected",
        "Checkout API error rate increased to 27.3% and latency reached 1480 ms."
      ),
    ]);
  };

  const resetSystem = () => {
    setServices(
      healthyServices
    );

    setIncident(null);

    setRecoveryProposal(
      null
    );

    setRecoveryStatus(
      "idle"
    );

    setRecoveryVerified(
      false
    );

    setTimeline([]);
  };

  const handleRecoveryProposal = (
    proposal: RecoveryProposal
  ) => {
    setRecoveryProposal(
      proposal
    );

    setRecoveryStatus(
      "pending"
    );
  };

  const handleToolExecuted = (
    name: string,
    result: IncidentToolResult
  ) => {
    if (!result.ok) {
      return;
    }

    if (
      name ===
      "investigate_incident"
    ) {
      addTimelineEvent(
        "investigation",
        "Evidence-based investigation completed",
        result.summary
      );

      return;
    }

    if (
      name ===
      "request_rollback"
    ) {
      addTimelineEvent(
        "proposal",
        "Rollback proposed",
        result.summary
      );

      return;
    }

    if (
      name ===
      "verify_recovery"
    ) {
      const data =
        result.data as
          | {
              recovery_verified?: boolean;
            }
          | undefined;

      if (
        data?.recovery_verified
      ) {
        setRecoveryVerified(
          true
        );

        addTimelineEvent(
          "verification",
          "Recovery verified",
          result.summary
        );
      }
    }
  };

  const approveRecovery = () => {
    if (
      !recoveryProposal
    ) {
      return;
    }

    setRecoveryStatus(
      "executing"
    );

    addTimelineEvent(
      "approval",
      "Rollback authorized by human operator",
      `${recoveryProposal.service} rollback from ${recoveryProposal.fromVersion} to ${recoveryProposal.toVersion} was explicitly approved through the VoxOps Safety Gate.`
    );

    setTimeout(() => {
      setServices(
        recoveredServices
      );

      setIncident(null);

      setRecoveryStatus(
        "completed"
      );

      addTimelineEvent(
        "execution",
        "Rollback completed",
        `${recoveryProposal.service} was rolled back from ${recoveryProposal.fromVersion} to ${recoveryProposal.toVersion}.`
      );
    }, 1200);
  };

  const rejectRecovery = () => {
    setRecoveryStatus(
      "rejected"
    );

    addTimelineEvent(
      "approval",
      "Rollback rejected",
      "The human operator rejected the proposed recovery action. No production state was changed."
    );
  };

  const criticalCount =
    services.filter(
      (service) =>
        service.status ===
        "critical"
    ).length;

  const degradedCount =
    services.filter(
      (service) =>
        service.status ===
        "degraded"
    ).length;

  const isSystemHealthy =
    criticalCount === 0 &&
    degradedCount === 0;

  return (
    <main className="min-h-screen bg-[#07090d] text-white">

      <div className="mx-auto max-w-7xl px-6 py-8">

        <header className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 font-bold">
              V
            </div>

            <div>

              <h1 className="text-2xl font-semibold">
                VoxOps
              </h1>

              <p className="text-sm text-gray-400">
                AI Voice Incident Commander
              </p>

            </div>

          </div>

          <div
            className={`rounded-full px-4 py-2 text-sm ${
              incident
                ? "bg-red-500/15 text-red-400"
                : isSystemHealthy
                ? "bg-emerald-500/15 text-emerald-400"
                : "bg-yellow-500/15 text-yellow-400"
            }`}
          >
            {incident
              ? "● Active Incident"
              : isSystemHealthy
              ? "● All Systems Operational"
              : "● Degraded System"}
          </div>

        </header>

        <section className="grid gap-4 py-8 sm:grid-cols-2 lg:grid-cols-4">

          <StatCard
            label="Services"
            value={
              services.length.toString()
            }
            sub="Monitored"
          />

          <StatCard
            label="Critical"
            value={
              criticalCount.toString()
            }
            sub="Services"
          />

          <StatCard
            label="Active Incident"
            value={
              incident
                ? "1"
                : "0"
            }
            sub={
              incident
                ? incident.severity
                : "None"
            }
          />

          <StatCard
            label="Safety Gate"
            value={
              recoveryStatus ===
              "pending"
                ? "Pending"
                : recoveryStatus ===
                  "executing"
                ? "Running"
                : recoveryStatus ===
                  "completed"
                ? "Complete"
                : recoveryStatus ===
                  "rejected"
                ? "Rejected"
                : "Ready"
            }
            sub="Human controlled"
          />

        </section>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">

          <section>

            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <h2 className="text-lg font-semibold">
                  Production Services
                </h2>

                <p className="text-sm text-gray-500">
                  Live simulated infrastructure
                </p>

              </div>

              <div className="flex flex-wrap gap-2">

                <button
                  onClick={
                    resetSystem
                  }
                  className="rounded-lg border border-white/10 px-4 py-2 text-sm text-gray-300 transition hover:bg-white/5"
                >
                  Reset
                </button>

                <button
                  onClick={
                    triggerIncident
                  }
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium transition hover:bg-red-500"
                >
                  Trigger Demo Incident
                </button>

              </div>

            </div>

            <div className="space-y-3">

              {services.map(
                (service) => (
                  <ServiceCard
                    key={
                      service.id
                    }
                    service={
                      service
                    }
                  />
                )
              )}

            </div>

          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

            <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-gray-500">
              Incident Command
            </p>

            {!incident ? (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center">

                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-2xl text-emerald-400">
                  ✓
                </div>

                <h3 className="text-lg font-medium">
                  No active incident
                </h3>

                <p className="mt-2 max-w-xs text-sm text-gray-500">
                  {recoveryStatus ===
                  "completed"
                    ? recoveryVerified
                      ? "Recovery completed and independently verified by VoxOps."
                      : "Recovery completed. Ask VoxOps to verify the restored service."
                    : "Trigger the demo incident to simulate a production failure."}
                </p>

                {recoveryStatus ===
                  "completed" &&
                  recoveryProposal && (
                    <div className="mt-5 w-full rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4 text-left">

                      <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-400">
                        Recovery completed
                      </p>

                      <p className="mt-2 text-sm text-gray-300">
                        {
                          recoveryProposal.service
                        }{" "}
                        rolled back from{" "}
                        {
                          recoveryProposal.fromVersion
                        }{" "}
                        to{" "}
                        {
                          recoveryProposal.toVersion
                        }.
                      </p>

                    </div>
                  )}

              </div>
            ) : (
              <div>

                <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 p-4">

                  <div className="flex items-center justify-between gap-4">

                    <span className="rounded bg-red-500/20 px-2 py-1 text-xs font-bold text-red-400">
                      {
                        incident.severity
                      }
                    </span>

                    <span className="text-xs text-gray-500">
                      {
                        incident.id
                      }
                    </span>

                  </div>

                  <h3 className="mt-3 text-xl font-semibold">
                    {
                      incident.title
                    }
                  </h3>

                  <p className="mt-2 text-sm text-gray-400">
                    {
                      incident.summary
                    }
                  </p>

                </div>

                <h4 className="mb-3 text-sm font-medium">
                  Initial evidence
                </h4>

                <div className="space-y-3">

                  {incident.evidence.map(
                    (
                      item,
                      index
                    ) => (
                      <div
                        key={
                          index
                        }
                        className="rounded-lg border border-white/10 bg-black/20 p-3"
                      >
                        <p className="text-sm text-gray-300">

                          <span className="mr-2 text-violet-400">
                            {String(
                              index +
                                1
                            ).padStart(
                              2,
                              "0"
                            )}
                          </span>

                          {item}

                        </p>
                      </div>
                    )
                  )}

                </div>

                <div className="mt-6 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">

                  <p className="text-xs uppercase tracking-wider text-violet-400">
                    VoxOps
                  </p>

                  <p className="mt-2 text-sm text-gray-300">
                    Voice investigation is available below. Recovery actions require Safety Gate authorization.
                  </p>

                </div>

              </div>
            )}

          </section>

        </div>

        <VoiceAgentPanel
          services={
            services
          }
          incident={
            incident
          }
          onRecoveryProposal={
            handleRecoveryProposal
          }
          onToolExecuted={
            handleToolExecuted
          }
        />

        <SafetyGate
          proposal={
            recoveryProposal
          }
          status={
            recoveryStatus
          }
          onApprove={
            approveRecovery
          }
          onReject={
            rejectRecovery
          }
        />

        <div className="mt-6 grid gap-6 lg:grid-cols-2">

          <IncidentTimeline
            events={
              timeline
            }
          />

          <PostmortemReport
            incidentId={
              checkoutIncident.id
            }
            severity={
              checkoutIncident.severity
            }
            proposal={
              recoveryProposal
            }
            services={
              services
            }
            timeline={
              timeline
            }
            verified={
              recoveryVerified
            }
          />

        </div>

      </div>

    </main>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

      <p className="text-sm text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-semibold">
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-500">
        {sub}
      </p>

    </div>
  );
}

function ServiceCard({
  service,
}: {
  service: Service;
}) {
  const statusClass =
    service.status ===
    "healthy"
      ? "bg-emerald-500/10 text-emerald-400"
      : service.status ===
        "critical"
      ? "bg-red-500/10 text-red-400"
      : "bg-yellow-500/10 text-yellow-400";

  const borderClass =
    service.status ===
    "critical"
      ? "border-red-500/20"
      : service.status ===
        "degraded"
      ? "border-yellow-500/20"
      : "border-white/10";

  return (
    <div
      className={`flex flex-col gap-4 rounded-xl border bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between ${borderClass}`}
    >

      <div>

        <div className="flex flex-wrap items-center gap-3">

          <h3 className="font-medium">
            {
              service.name
            }
          </h3>

          <span
            className={`rounded-full px-2 py-1 text-xs ${statusClass}`}
          >
            {
              service.status
            }
          </span>

        </div>

        <p className="mt-2 text-xs text-gray-500">
          Version{" "}
          {
            service.version
          }
        </p>

      </div>

      <div className="flex gap-8 sm:text-right">

        <div>

          <p className="text-xs text-gray-500">
            Latency
          </p>

          <p
            className={`mt-1 text-sm font-medium ${
              service.latency >
              1000
                ? "text-red-400"
                : ""
            }`}
          >
            {
              service.latency
            }{" "}
            ms
          </p>

        </div>

        <div>

          <p className="text-xs text-gray-500">
            Errors
          </p>

          <p
            className={`mt-1 text-sm font-medium ${
              service.errorRate >
              5
                ? "text-red-400"
                : ""
            }`}
          >
            {
              service.errorRate
            }
            %
          </p>

        </div>

      </div>

    </div>
  );
}