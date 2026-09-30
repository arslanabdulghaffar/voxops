"use client";

import { useRef, useState } from "react";

import VoiceAgentPanel, {
  type VoiceToolObservation,
  type ConnectionState,
} from "@/components/VoiceAgentPanel";

import SafetyGate from "@/components/SafetyGate";
import IncidentTimeline from "@/components/IncidentTimeline";
import PostmortemReport from "@/components/PostmortemReport";
import EvaluationDashboard from "@/components/EvaluationDashboard";
import LiveBenchmarkDashboard from "@/components/LiveBenchmarkDashboard";

import {
  getIncidentScenario,
  healthyServices,
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

import type { TimelineEvent, TimelineEventType } from "@/lib/voxops/timeline";

import {
  AppHeader,
  ScenarioSelector,
  ProductionHealthPanel,
  IncidentIntelligencePanel,
  IncidentPipeline,
  investigationData,
  type ProductView,
  type RecoveryStatus,
} from "@/components/CommandCenter";

export default function Home() {
  const [view, setView] = useState<ProductView>("command");
  const [connection, setConnection] = useState<ConnectionState>("disconnected");
  const [investigation, setInvestigation] =
    useState<VoiceToolObservation | null>(null);
  const [rollbackDecision, setRollbackDecision] =
    useState<VoiceToolObservation | null>(null);
  const recoveryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearPresentation() {
    setInvestigation(null);
    setRollbackDecision(null);
    if (recoveryTimerRef.current) clearTimeout(recoveryTimerRef.current);
  }

  function observeTool(observation: VoiceToolObservation) {
    if (observation.name === "investigate_incident" && observation.result.ok) {
      setInvestigation(observation);
    }
    if (observation.name === "request_rollback")
      setRollbackDecision(observation);
    handleBenchmarkToolObserved(observation);
  }

  /*
   * -------------------------------------------------------
   * Main incident state
   * -------------------------------------------------------
   */

  const [selectedScenarioId, setSelectedScenarioId] = useState<ScenarioId>(
    "checkout-regression",
  );

  const [activeScenario, setActiveScenario] = useState<IncidentScenario | null>(
    null,
  );

  const [services, setServices] = useState<Service[]>(healthyServices);

  const [incident, setIncident] = useState<Incident | null>(null);

  const [recoveryProposal, setRecoveryProposal] =
    useState<RecoveryProposal | null>(null);

  const [recoveryStatus, setRecoveryStatus] = useState<RecoveryStatus>("idle");

  const [recoveryVerified, setRecoveryVerified] = useState(false);

  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);

  /*
   * -------------------------------------------------------
   * Stage 7B live benchmark state
   * -------------------------------------------------------
   */

  const [activeBenchmarkId, setActiveBenchmarkId] = useState<string | null>(
    null,
  );

  const [liveBenchmarkResults, setLiveBenchmarkResults] = useState<
    LiveBenchmarkTrialResult[]
  >([]);

  const [benchmarkTranscript, setBenchmarkTranscript] = useState("");

  const [benchmarkToolName, setBenchmarkToolName] = useState<string | null>(
    null,
  );

  const [benchmarkToolArguments, setBenchmarkToolArguments] = useState<Record<
    string,
    unknown
  > | null>(null);

  /*
   * Refs are used because transcript and
   * tool.call events can arrive in either
   * order and React state updates are
   * asynchronous.
   */

  const activeBenchmarkIdRef = useRef<string | null>(null);

  const benchmarkActivatedAtRef = useRef<number | null>(null);

  const benchmarkSpeechStartedAtRef = useRef<number | null>(null);

  const benchmarkTranscriptRef = useRef("");

  const benchmarkToolObservationRef = useRef<VoiceToolObservation | null>(null);

  const benchmarkFinalizedRef = useRef(false);

  const selectedScenario = getIncidentScenario(selectedScenarioId);

  /*
   * -------------------------------------------------------
   * Timeline helpers
   * -------------------------------------------------------
   */

  function createTimelineEvent(
    type: TimelineEventType,
    title: string,
    detail: string,
  ): TimelineEvent {
    return {
      id: crypto.randomUUID(),

      type,

      title,

      detail,

      timestamp: Date.now(),
    };
  }

  function addTimelineEvent(
    type: TimelineEventType,
    title: string,
    detail: string,
  ) {
    setTimeline((current) => [
      ...current,

      createTimelineEvent(type, title, detail),
    ]);
  }

  /*
   * -------------------------------------------------------
   * Scenario management
   * -------------------------------------------------------
   */

  function loadScenario(scenarioId: ScenarioId) {
    clearPresentation();
    const scenario = getIncidentScenario(scenarioId);

    setSelectedScenarioId(scenarioId);

    setActiveScenario(scenario);

    setServices(scenario.failureServices);

    setIncident({
      ...scenario.incident,

      startedAt: new Date().toISOString(),
    });

    setRecoveryProposal(null);

    setRecoveryStatus("idle");

    setRecoveryVerified(false);

    setTimeline([
      createTimelineEvent(
        "incident",

        `${scenario.incident.severity} incident detected`,

        `${scenario.incident.service}: ${scenario.incident.summary}`,
      ),
    ]);
  }

  function triggerIncident() {
    loadScenario(selectedScenarioId);
  }

  function resetBenchmarkCapture() {
    setBenchmarkTranscript("");

    setBenchmarkToolName(null);

    setBenchmarkToolArguments(null);

    benchmarkTranscriptRef.current = "";

    benchmarkToolObservationRef.current = null;

    benchmarkActivatedAtRef.current = null;

    benchmarkSpeechStartedAtRef.current = null;

    benchmarkFinalizedRef.current = false;
  }

  function cancelActiveBenchmark() {
    activeBenchmarkIdRef.current = null;

    setActiveBenchmarkId(null);

    resetBenchmarkCapture();
  }

  function resetSystem() {
    clearPresentation();
    setServices(healthyServices);

    setIncident(null);

    setActiveScenario(null);

    setRecoveryProposal(null);

    setRecoveryStatus("idle");

    setRecoveryVerified(false);

    setTimeline([]);

    cancelActiveBenchmark();
  }

  /*
   * -------------------------------------------------------
   * Recovery
   * -------------------------------------------------------
   */

  function handleRecoveryProposal(proposal: RecoveryProposal) {
    setRecoveryProposal(proposal);

    setRecoveryStatus("pending");
  }

  function handleToolExecuted(name: string, result: IncidentToolResult) {
    /*
     * A rejected rollback request is
     * intentionally part of our audit
     * trail.
     */
    if (name === "request_rollback" && !result.ok) {
      addTimelineEvent(
        "safety",

        "Unsafe rollback blocked",

        result.summary,
      );

      return;
    }

    if (!result.ok) {
      return;
    }

    if (name === "investigate_incident") {
      addTimelineEvent(
        "investigation",

        "Evidence-based investigation completed",

        result.summary,
      );

      return;
    }

    if (name === "request_rollback") {
      addTimelineEvent(
        "proposal",

        "Rollback proposed",

        result.summary,
      );

      return;
    }

    if (name === "verify_recovery") {
      const data = result.data as
        | {
            recovery_verified?: boolean;
          }
        | undefined;

      if (data?.recovery_verified) {
        setRecoveryVerified(true);

        addTimelineEvent(
          "verification",

          "Recovery verified",

          result.summary,
        );
      }
    }
  }

  function approveRecovery() {
    if (!recoveryProposal || !activeScenario) {
      return;
    }

    const recoveredServices = activeScenario.recoveredServices;

    if (!recoveredServices) {
      addTimelineEvent(
        "safety",

        "Recovery execution blocked",

        "The active scenario does not define an evidence-backed rollback recovery state.",
      );

      return;
    }

    setRecoveryStatus("executing");

    addTimelineEvent(
      "approval",

      "Rollback authorized by human operator",

      `${recoveryProposal.service} rollback from ${recoveryProposal.fromVersion} to ${recoveryProposal.toVersion} was explicitly approved through the VoxOps Safety Gate.`,
    );

    recoveryTimerRef.current = setTimeout(() => {
      setServices(recoveredServices);

      setIncident(null);

      setRecoveryStatus("completed");

      addTimelineEvent(
        "execution",

        "Rollback completed",

        `${recoveryProposal.service} was rolled back from ${recoveryProposal.fromVersion} to ${recoveryProposal.toVersion}.`,
      );
    }, 1200);
  }

  function rejectRecovery() {
    setRecoveryStatus("rejected");

    addTimelineEvent(
      "approval",

      "Rollback rejected",

      "The human operator rejected the proposed recovery action. No production state was changed.",
    );
  }

  /*
   * -------------------------------------------------------
   * Stage 7B live benchmark coordinator
   * -------------------------------------------------------
   */

  function prepareBenchmarkScenario(scenarioId: ScenarioId) {
    /*
     * Any unfinished benchmark is
     * cancelled before changing scenario.
     */
    activeBenchmarkIdRef.current = null;

    setActiveBenchmarkId(null);

    resetBenchmarkCapture();

    loadScenario(scenarioId);
  }

  function startLiveBenchmark(benchmarkId: string) {
    const benchmarkCase = getLiveBenchmarkCase(benchmarkId);

    if (!benchmarkCase) {
      return;
    }

    /*
     * Do not start a trial against the
     * wrong scenario or without an
     * active incident.
     */
    if (!incident || activeScenario?.id !== benchmarkCase.scenarioId) {
      return;
    }

    resetBenchmarkCapture();

    activeBenchmarkIdRef.current = benchmarkId;

    benchmarkActivatedAtRef.current = performance.now();

    benchmarkSpeechStartedAtRef.current = null;

    benchmarkFinalizedRef.current = false;

    setActiveBenchmarkId(benchmarkId);
  }

  function handleBenchmarkSpeechStarted() {
    if (!activeBenchmarkIdRef.current) {
      return;
    }

    /*
     * Only the first speech-start event
     * belongs to this benchmark trial.
     */
    if (benchmarkSpeechStartedAtRef.current === null) {
      benchmarkSpeechStartedAtRef.current = performance.now();
    }
  }

  function handleBenchmarkTranscript(transcript: string) {
    if (!activeBenchmarkIdRef.current) {
      return;
    }

    const cleaned = transcript.trim();

    if (!cleaned) {
      return;
    }

    benchmarkTranscriptRef.current = cleaned;

    setBenchmarkTranscript(cleaned);

    finalizeBenchmarkIfReady();
  }

  function handleBenchmarkToolObserved(observation: VoiceToolObservation) {
    if (!activeBenchmarkIdRef.current) {
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
    if (benchmarkToolObservationRef.current) {
      return;
    }

    benchmarkToolObservationRef.current = observation;

    setBenchmarkToolName(observation.name);

    setBenchmarkToolArguments(observation.arguments);

    finalizeBenchmarkIfReady();
  }

  function finalizeBenchmarkIfReady() {
    const benchmarkId = activeBenchmarkIdRef.current;

    const transcript = benchmarkTranscriptRef.current;

    const toolObservation = benchmarkToolObservationRef.current;

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
      benchmarkSpeechStartedAtRef.current ?? benchmarkActivatedAtRef.current;

    if (startedAt === null) {
      return;
    }

    benchmarkFinalizedRef.current = true;

    const result = evaluateLiveBenchmarkObservation({
      benchmarkId,

      transcript,

      toolName: toolObservation.name,

      toolArguments: toolObservation.arguments,

      toolResult: toolObservation.result,

      startedAt,

      toolCalledAt: toolObservation.calledAt,
    });

    /*
     * Keep one canonical result per
     * benchmark case.
     *
     * Re-running LB01, for example,
     * replaces its previous result rather
     * than artificially increasing N.
     */
    setLiveBenchmarkResults((current) => [
      ...current.filter(
        (existing) => existing.benchmarkId !== result.benchmarkId,
      ),

      result,
    ]);

    activeBenchmarkIdRef.current = null;

    setActiveBenchmarkId(null);
  }

  function clearLiveBenchmarkResults() {
    if (activeBenchmarkIdRef.current) {
      return;
    }

    setLiveBenchmarkResults([]);

    resetBenchmarkCapture();
  }

  /*
   * -------------------------------------------------------
   * Dashboard statistics
   * -------------------------------------------------------
   */

  const criticalCount = services.filter(
    (service) => service.status === "critical",
  ).length;

  const degradedCount = services.filter(
    (service) => service.status === "degraded",
  ).length;

  const isSystemHealthy = criticalCount === 0 && degradedCount === 0;

  const scenarioLocked =
    incident !== null ||
    recoveryStatus === "pending" ||
    recoveryStatus === "executing";

  /*
   * Only report the benchmark scenario
   * as ready while its incident is still
   * active.
   */
  const activeBenchmarkScenarioId =
    incident && activeScenario ? activeScenario.id : null;

  const blocked =
    rollbackDecision && !rollbackDecision.result.ok ? rollbackDecision : null;
  const observed = investigationData(investigation);
  const relevantInvestigation =
    !incident || observed.service === incident.service ? investigation : null;
  const serviceName =
    incident?.service ??
    activeScenario?.incident.service ??
    selectedScenario.incident.service;
  const trySaying =
    recoveryStatus === "completed"
      ? `Verify recovery for ${serviceName}.`
      : relevantInvestigation &&
          observed.action.startsWith("Rollback") &&
          observed.rollbackTarget
        ? `Rollback ${serviceName} to ${observed.rollbackTarget}.`
        : `Investigate the ${serviceName} incident.`;

  return (
    <main className="app-shell">
      <AppHeader
        connection={connection}
        incident={incident}
        healthy={isSystemHealthy}
        view={view}
        onViewChange={setView}
      />
      <div className="workspace">
        {/* Keep all views mounted: switching views must never end a voice session or discard evaluation results. */}
        <div id="view-command" hidden={view !== "command"}>
          <div className="view-heading">
            <div>
              <p className="eyebrow">Operations workspace</p>
              <h2>
                Command Center<span className="heading-dot">.</span>
              </h2>
              <p>Investigate by voice. Recover with evidence.</p>
            </div>
            <span className="workspace-label">
              SANDBOX / {services.length} SERVICES
            </span>
          </div>
          <ScenarioSelector
            scenario={selectedScenario}
            locked={scenarioLocked}
            executing={recoveryStatus === "executing"}
            active={!!incident}
            onChange={setSelectedScenarioId}
            onTrigger={triggerIncident}
            onReset={resetSystem}
          />
          <div className="command-grid">
            <ProductionHealthPanel services={services} />
            <VoiceAgentPanel
              services={services}
              incident={incident}
              onRecoveryProposal={handleRecoveryProposal}
              onToolExecuted={handleToolExecuted}
              onUserTranscript={handleBenchmarkTranscript}
              onToolObserved={observeTool}
              onSpeechStarted={handleBenchmarkSpeechStarted}
              onConnectionChange={setConnection}
              trySaying={trySaying}
            />
            <IncidentIntelligencePanel
              incident={incident}
              investigation={relevantInvestigation}
              blocked={blocked}
              completed={recoveryStatus === "completed"}
              verified={recoveryVerified}
            />
          </div>
          <IncidentPipeline
            investigation={relevantInvestigation}
            blocked={blocked}
            proposal={recoveryProposal}
            status={recoveryStatus}
            verified={recoveryVerified}
          />
          <SafetyGate
            proposal={recoveryProposal}
            status={recoveryStatus}
            blocked={blocked}
            onApprove={approveRecovery}
            onReject={rejectRecovery}
          />
        </div>
        <div
          id="view-evaluation"
          hidden={view !== "evaluation"}
          className="evaluation-view"
        >
          <div className="view-heading">
            <div>
              <p className="eyebrow">Engineering evidence</p>
              <h2>
                Evaluation<span className="heading-dot">.</span>
              </h2>
              <p>
                Two measurement layers. Results from this browser session only.
              </p>
            </div>
            <button
              className="button button-quiet"
              onClick={() => setView("command")}
            >
              Open Voice Commander &rarr;
            </button>
          </div>
          <div className="evaluation-overview">
            <div>
              <span className="eyebrow">7A / Deterministic</span>
              <h3>Is the policy reliable?</h3>
              <p>
                11 local checks of diagnosis data, authorization requirements,
                unsafe action blocking, and verification.
              </p>
              <a className="evaluation-jump" href="#deterministic-evaluation">
                Open deterministic checks &rarr;
              </a>
            </div>
            <div>
              <span className="eyebrow">7B / Live AssemblyAI</span>
              <h3>Does voice reach the right tool?</h3>
              <p>
                6 spoken trials observe transcripts, the first operational tool,
                arguments, safety outcomes, and Voice &rarr; Tool latency.
              </p>
              <a className="evaluation-jump" href="#live-evaluation">
                Open live benchmark &rarr;
              </a>
            </div>
          </div>
          <EvaluationDashboard />
          <LiveBenchmarkDashboard
            activeScenarioId={activeBenchmarkScenarioId}
            activeBenchmarkId={activeBenchmarkId}
            currentTranscript={benchmarkTranscript}
            currentToolName={benchmarkToolName}
            currentToolArguments={benchmarkToolArguments}
            results={liveBenchmarkResults}
            onPrepareScenario={prepareBenchmarkScenario}
            onStartTrial={startLiveBenchmark}
            onCancelTrial={cancelActiveBenchmark}
            onClearResults={clearLiveBenchmarkResults}
          />
        </div>
        <div id="view-audit" hidden={view !== "audit"} className="audit-view">
          <div className="view-heading">
            <div>
              <p className="eyebrow">Accountability, built in</p>
              <h2>
                Audit & Postmortem<span className="heading-dot">.</span>
              </h2>
              <p>
                Every investigation, policy decision, and human authorization in
                one record.
              </p>
            </div>
            <span className="workspace-label">
              {timeline.length} RECORDED EVENTS
            </span>
          </div>
          <div className="audit-grid">
            <IncidentTimeline events={timeline} />
            <PostmortemReport
              incidentId={activeScenario?.incident.id ?? "Pending"}
              severity={activeScenario?.incident.severity ?? "Pending"}
              proposal={recoveryProposal}
              services={services}
              timeline={timeline}
              verified={recoveryVerified}
              recoveryStatus={recoveryStatus}
            />
          </div>
        </div>
        {view !== "command" && connection === "connected" && (
          <div className="session-notice" role="status">
            <span className="status-dot" />
            Microphone active &middot; AssemblyAI session continues across
            views.
            <button onClick={() => setView("command")}>
              Voice controls &rarr;
            </button>
          </div>
        )}
        <footer className="app-footer">
          <span>
            Powered by <strong>AssemblyAI Voice Agent API</strong>
          </span>
          <span>
            Live voice & tool routing <span aria-hidden="true">/</span>{" "}
            Simulated infrastructure & recovery
          </span>
        </footer>
      </div>
    </main>
  );
}
