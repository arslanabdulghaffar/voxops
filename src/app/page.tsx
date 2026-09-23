"use client";

import {
  useRef,
  useState,
} from "react";

import VoiceAgentPanel, {
  type VoiceToolObservation,
} from "@/components/VoiceAgentPanel";

import SafetyGate from "@/components/SafetyGate";
import IncidentTimeline from "@/components/IncidentTimeline";
import PostmortemReport from "@/components/PostmortemReport";
import EvaluationDashboard from "@/components/EvaluationDashboard";
import LiveBenchmarkDashboard from "@/components/LiveBenchmarkDashboard";

import {
  getIncidentScenario,
  healthyServices,
  incidentScenarios,
  type Incident,
  type IncidentScenario,
  type ScenarioId,
  type Service,
} from "@/lib/voxops/scenarios";

import type {
  IncidentToolResult,
  RecoveryProposal,
} from "@/lib/voxops/incident-tools";

import {
  evaluateLiveBenchmarkObservation,
  getLiveBenchmarkCase,
  type LiveBenchmarkTrialResult,
} from "@/lib/voxops/live-benchmark";

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
  /*
   * -------------------------------------------------------
   * Main incident state
   * -------------------------------------------------------
   */

  const [
    selectedScenarioId,
    setSelectedScenarioId,
  ] =
    useState<ScenarioId>(
      "checkout-regression"
    );

  const [
    activeScenario,
    setActiveScenario,
  ] =
    useState<IncidentScenario | null>(
      null
    );

  const [
    services,
    setServices,
  ] =
    useState<Service[]>(
      healthyServices
    );

  const [
    incident,
    setIncident,
  ] =
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
  ] =
    useState(false);

  const [
    timeline,
    setTimeline,
  ] =
    useState<TimelineEvent[]>(
      []
    );

  /*
   * -------------------------------------------------------
   * Stage 7B live benchmark state
   * -------------------------------------------------------
   */

  const [
    activeBenchmarkId,
    setActiveBenchmarkId,
  ] =
    useState<string | null>(
      null
    );

  const [
    liveBenchmarkResults,
    setLiveBenchmarkResults,
  ] =
    useState<
      LiveBenchmarkTrialResult[]
    >([]);

  const [
    benchmarkTranscript,
    setBenchmarkTranscript,
  ] =
    useState("");

  const [
    benchmarkToolName,
    setBenchmarkToolName,
  ] =
    useState<string | null>(
      null
    );

  const [
    benchmarkToolArguments,
    setBenchmarkToolArguments,
  ] =
    useState<
      Record<
        string,
        unknown
      > | null
    >(null);

  /*
   * Refs are used because transcript and
   * tool.call events can arrive in either
   * order and React state updates are
   * asynchronous.
   */

  const activeBenchmarkIdRef =
    useRef<string | null>(
      null
    );

  const benchmarkActivatedAtRef =
    useRef<number | null>(
      null
    );

  const benchmarkSpeechStartedAtRef =
    useRef<number | null>(
      null
    );

  const benchmarkTranscriptRef =
    useRef("");

  const benchmarkToolObservationRef =
    useRef<VoiceToolObservation | null>(
      null
    );

  const benchmarkFinalizedRef =
    useRef(false);

  const selectedScenario =
    getIncidentScenario(
      selectedScenarioId
    );

  /*
   * -------------------------------------------------------
   * Timeline helpers
   * -------------------------------------------------------
   */

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
    setTimeline(
      (current) => [
        ...current,

        createTimelineEvent(
          type,
          title,
          detail
        ),
      ]
    );
  }

  /*
   * -------------------------------------------------------
   * Scenario management
   * -------------------------------------------------------
   */

  function loadScenario(
    scenarioId: ScenarioId
  ) {
    const scenario =
      getIncidentScenario(
        scenarioId
      );

    setSelectedScenarioId(
      scenarioId
    );

    setActiveScenario(
      scenario
    );

    setServices(
      scenario.failureServices
    );

    setIncident({
      ...scenario.incident,

      startedAt:
        new Date()
          .toISOString(),
    });

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

        `${scenario.incident.severity} incident detected`,

        `${scenario.incident.service}: ${scenario.incident.summary}`
      ),
    ]);
  }

  function triggerIncident() {
    loadScenario(
      selectedScenarioId
    );
  }

  function resetBenchmarkCapture() {
    setBenchmarkTranscript(
      ""
    );

    setBenchmarkToolName(
      null
    );

    setBenchmarkToolArguments(
      null
    );

    benchmarkTranscriptRef.current =
      "";

    benchmarkToolObservationRef.current =
      null;

    benchmarkActivatedAtRef.current =
      null;

    benchmarkSpeechStartedAtRef.current =
      null;

    benchmarkFinalizedRef.current =
      false;
  }

  function cancelActiveBenchmark() {
    activeBenchmarkIdRef.current =
      null;

    setActiveBenchmarkId(
      null
    );

    resetBenchmarkCapture();
  }

  function resetSystem() {
    setServices(
      healthyServices
    );

    setIncident(
      null
    );

    setActiveScenario(
      null
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

    setTimeline([]);

    cancelActiveBenchmark();
  }

  /*
   * -------------------------------------------------------
   * Recovery
   * -------------------------------------------------------
   */

  function handleRecoveryProposal(
    proposal: RecoveryProposal
  ) {
    setRecoveryProposal(
      proposal
    );

    setRecoveryStatus(
      "pending"
    );
  }

  function handleToolExecuted(
    name: string,
    result: IncidentToolResult
  ) {
    /*
     * A rejected rollback request is
     * intentionally part of our audit
     * trail.
     */
    if (
      name ===
        "request_rollback" &&
      !result.ok
    ) {
      addTimelineEvent(
        "safety",

        "Unsafe rollback blocked",

        result.summary
      );

      return;
    }

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
  }

  function approveRecovery() {
    if (
      !recoveryProposal ||
      !activeScenario
    ) {
      return;
    }

    const recoveredServices =
      activeScenario
        .recoveredServices;

    if (!recoveredServices) {
      addTimelineEvent(
        "safety",

        "Recovery execution blocked",

        "The active scenario does not define an evidence-backed rollback recovery state."
      );

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

      setIncident(
        null
      );

      setRecoveryStatus(
        "completed"
      );

      addTimelineEvent(
        "execution",

        "Rollback completed",

        `${recoveryProposal.service} was rolled back from ${recoveryProposal.fromVersion} to ${recoveryProposal.toVersion}.`
      );
    }, 1200);
  }

  function rejectRecovery() {
    setRecoveryStatus(
      "rejected"
    );

    addTimelineEvent(
      "approval",

      "Rollback rejected",

      "The human operator rejected the proposed recovery action. No production state was changed."
    );
  }

  /*
   * -------------------------------------------------------
   * Stage 7B live benchmark coordinator
   * -------------------------------------------------------
   */

  function prepareBenchmarkScenario(
    scenarioId: ScenarioId
  ) {
    /*
     * Any unfinished benchmark is
     * cancelled before changing scenario.
     */
    activeBenchmarkIdRef.current =
      null;

    setActiveBenchmarkId(
      null
    );

    resetBenchmarkCapture();

    loadScenario(
      scenarioId
    );
  }

  function startLiveBenchmark(
    benchmarkId: string
  ) {
    const benchmarkCase =
      getLiveBenchmarkCase(
        benchmarkId
      );

    if (!benchmarkCase) {
      return;
    }

    /*
     * Do not start a trial against the
     * wrong scenario or without an
     * active incident.
     */
    if (
      !incident ||
      activeScenario?.id !==
        benchmarkCase.scenarioId
    ) {
      return;
    }

    resetBenchmarkCapture();

    activeBenchmarkIdRef.current =
      benchmarkId;

    benchmarkActivatedAtRef.current =
      performance.now();

    benchmarkSpeechStartedAtRef.current =
      null;

    benchmarkFinalizedRef.current =
      false;

    setActiveBenchmarkId(
      benchmarkId
    );
  }

  function handleBenchmarkSpeechStarted() {
    if (
      !activeBenchmarkIdRef.current
    ) {
      return;
    }

    /*
     * Only the first speech-start event
     * belongs to this benchmark trial.
     */
    if (
      benchmarkSpeechStartedAtRef.current ===
      null
    ) {
      benchmarkSpeechStartedAtRef.current =
        performance.now();
    }
  }

  function handleBenchmarkTranscript(
    transcript: string
  ) {
    if (
      !activeBenchmarkIdRef.current
    ) {
      return;
    }

    const cleaned =
      transcript.trim();

    if (!cleaned) {
      return;
    }

    benchmarkTranscriptRef.current =
      cleaned;

    setBenchmarkTranscript(
      cleaned
    );

    finalizeBenchmarkIfReady();
  }

  function handleBenchmarkToolObserved(
    observation:
      VoiceToolObservation
  ) {
    if (
      !activeBenchmarkIdRef.current
    ) {
      return;
    }

    /*
     * The benchmark scores the FIRST
     * operational tool selected by the
     * voice agent.
     *
     * This matters because calling an
     * incorrect tool first should not be
     * hidden by a later correct call.
     */
    if (
      benchmarkToolObservationRef.current
    ) {
      return;
    }

    benchmarkToolObservationRef.current =
      observation;

    setBenchmarkToolName(
      observation.name
    );

    setBenchmarkToolArguments(
      observation.arguments
    );

    finalizeBenchmarkIfReady();
  }

  function finalizeBenchmarkIfReady() {
    const benchmarkId =
      activeBenchmarkIdRef.current;

    const transcript =
      benchmarkTranscriptRef.current;

    const toolObservation =
      benchmarkToolObservationRef.current;

    if (
      !benchmarkId ||
      !transcript ||
      !toolObservation ||
      benchmarkFinalizedRef.current
    ) {
      return;
    }

    /*
     * Prefer real detected speech start.
     *
     * benchmarkActivatedAt is retained
     * only as a defensive fallback in
     * case the speech-start event is not
     * emitted by the session.
     */
    const startedAt =
      benchmarkSpeechStartedAtRef.current ??
      benchmarkActivatedAtRef.current;

    if (
      startedAt ===
      null
    ) {
      return;
    }

    benchmarkFinalizedRef.current =
      true;

    const result =
      evaluateLiveBenchmarkObservation(
        {
          benchmarkId,

          transcript,

          toolName:
            toolObservation.name,

          toolArguments:
            toolObservation.arguments,

          toolResult:
            toolObservation.result,

          startedAt,

          toolCalledAt:
            toolObservation.calledAt,
        }
      );

    /*
     * Keep one canonical result per
     * benchmark case.
     *
     * Re-running LB01, for example,
     * replaces its previous result rather
     * than artificially increasing N.
     */
    setLiveBenchmarkResults(
      (current) => [
        ...current.filter(
          (existing) =>
            existing.benchmarkId !==
            result.benchmarkId
        ),

        result,
      ]
    );

    activeBenchmarkIdRef.current =
      null;

    setActiveBenchmarkId(
      null
    );
  }

  function clearLiveBenchmarkResults() {
    if (
      activeBenchmarkIdRef.current
    ) {
      return;
    }

    setLiveBenchmarkResults(
      []
    );

    resetBenchmarkCapture();
  }

  /*
   * -------------------------------------------------------
   * Dashboard statistics
   * -------------------------------------------------------
   */

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
    criticalCount ===
      0 &&
    degradedCount ===
      0;

  const scenarioLocked =
    incident !==
      null ||
    recoveryStatus ===
      "pending" ||
    recoveryStatus ===
      "executing";

  /*
   * Only report the benchmark scenario
   * as ready while its incident is still
   * active.
   */
  const activeBenchmarkScenarioId =
    incident &&
    activeScenario
      ? activeScenario.id
      : null;

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

        <ScenarioSelector
          selectedScenarioId={
            selectedScenarioId
          }
          scenario={
            selectedScenario
          }
          locked={
            scenarioLocked
          }
          onChange={
            setSelectedScenarioId
          }
          onTrigger={
            triggerIncident
          }
          onReset={
            resetSystem
          }
        />

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">

          <section>

            <div className="mb-4">

              <h2 className="text-lg font-semibold">
                Production Services
              </h2>

              <p className="text-sm text-gray-500">
                Live simulated infrastructure
              </p>

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
                    : "Choose a scenario above and trigger a production incident."}

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
                              index + 1
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
                    Voice investigation is available below. Recovery actions are validated against incident evidence before the human Safety Gate can open.
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
          onUserTranscript={
            handleBenchmarkTranscript
          }
          onToolObserved={
            handleBenchmarkToolObserved
          }
          onSpeechStarted={
            handleBenchmarkSpeechStarted
          }
        />

        <LiveBenchmarkDashboard
          activeScenarioId={
            activeBenchmarkScenarioId
          }
          activeBenchmarkId={
            activeBenchmarkId
          }
          currentTranscript={
            benchmarkTranscript
          }
          currentToolName={
            benchmarkToolName
          }
          currentToolArguments={
            benchmarkToolArguments
          }
          results={
            liveBenchmarkResults
          }
          onPrepareScenario={
            prepareBenchmarkScenario
          }
          onStartTrial={
            startLiveBenchmark
          }
          onCancelTrial={
            cancelActiveBenchmark
          }
          onClearResults={
            clearLiveBenchmarkResults
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
              activeScenario
                ?.incident.id ??
              "Pending"
            }
            severity={
              activeScenario
                ?.incident.severity ??
              "—"
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

        <EvaluationDashboard />

      </div>

    </main>
  );
}

function ScenarioSelector({
  selectedScenarioId,
  scenario,
  locked,
  onChange,
  onTrigger,
  onReset,
}: {
  selectedScenarioId:
    ScenarioId;

  scenario:
    IncidentScenario;

  locked:
    boolean;

  onChange: (
    id: ScenarioId
  ) => void;

  onTrigger:
    () => void;

  onReset:
    () => void;
}) {
  return (
    <section className="rounded-2xl border border-violet-500/15 bg-violet-500/[0.03] p-5">

      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">

        <div className="max-w-3xl">

          <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-400">
            Demo Scenario
          </p>

          <h2 className="mt-2 text-lg font-semibold">
            Incident Scenario Engine
          </h2>

          <p className="mt-1 text-sm leading-6 text-gray-500">
            Choose a different incident to demonstrate evidence-based diagnosis and safety-aware recovery.
          </p>

          <div className="mt-4">

            <select
              value={
                selectedScenarioId
              }
              disabled={
                locked
              }
              onChange={
                (event) =>
                  onChange(
                    event.target
                      .value as ScenarioId
                  )
              }
              className="w-full rounded-xl border border-white/10 bg-[#0c0f14] px-4 py-3 text-sm text-gray-200 outline-none disabled:cursor-not-allowed disabled:opacity-50 lg:min-w-[420px]"
            >

              {incidentScenarios.map(
                (item) => (
                  <option
                    key={
                      item.id
                    }
                    value={
                      item.id
                    }
                  >
                    {
                      item.name
                    }
                  </option>
                )
              )}

            </select>

          </div>

          <p className="mt-3 text-xs leading-5 text-gray-500">
            {
              scenario.description
            }
          </p>

          <p className="mt-2 text-xs text-gray-600">
            Expected response:{" "}
            <span className="text-gray-400">
              {
                scenario
                  .investigation
                  .diagnosis
                  .recommended_action
              }
            </span>
          </p>

        </div>

        <div className="flex flex-wrap gap-2">

          <button
            onClick={
              onReset
            }
            className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-gray-300 hover:bg-white/5"
          >
            Reset
          </button>

          <button
            onClick={
              onTrigger
            }
            disabled={
              locked
            }
            className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Trigger Selected Incident
          </button>

        </div>

      </div>

    </section>
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
  service:
    Service;
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