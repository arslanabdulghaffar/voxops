"use client";

import {
  useMemo,
  useState,
} from "react";

import {
  getLiveBenchmarkCase,
  liveBenchmarkCases,
  summarizeLiveBenchmarkTrials,
  type LiveBenchmarkCase,
  type LiveBenchmarkTrialResult,
} from "@/lib/voxops/live-benchmark";

import type {
  ScenarioId,
} from "@/lib/voxops/scenarios";

type Props = {
  activeScenarioId:
    ScenarioId | null;

  activeBenchmarkId:
    string | null;

  currentTranscript:
    string;

  currentToolName:
    string | null;

  currentToolArguments:
    Record<
      string,
      unknown
    > | null;

  results:
    LiveBenchmarkTrialResult[];

  onPrepareScenario: (
    scenarioId: ScenarioId
  ) => void;

  onStartTrial: (
    benchmarkId: string
  ) => void;

  onCancelTrial:
    () => void;

  onClearResults:
    () => void;
};

export default function LiveBenchmarkDashboard({
  activeScenarioId,
  activeBenchmarkId,
  currentTranscript,
  currentToolName,
  currentToolArguments,
  results,
  onPrepareScenario,
  onStartTrial,
  onCancelTrial,
  onClearResults,
}: Props) {
  const [
    selectedCaseId,
    setSelectedCaseId,
  ] =
    useState(
      liveBenchmarkCases[0]
        .id
    );

  const [
    copied,
    setCopied,
  ] =
    useState(false);

  const selectedCase =
    getLiveBenchmarkCase(
      selectedCaseId
    ) ??
    liveBenchmarkCases[0];

  const activeCase =
    activeBenchmarkId
      ? getLiveBenchmarkCase(
          activeBenchmarkId
        )
      : null;

  const summary =
    useMemo(
      () =>
        summarizeLiveBenchmarkTrials(
          results
        ),
      [results]
    );

  const scenarioReady =
    activeScenarioId ===
    selectedCase.scenarioId;

  const trialRunning =
    activeBenchmarkId !==
    null;

  const selectedAlreadyRun =
    results.some(
      (result) =>
        result.benchmarkId ===
        selectedCase.id
    );

  const selectedResult =
    results.find(
      (result) =>
        result.benchmarkId ===
        selectedCase.id
    );

  async function copyReport() {
    if (
      results.length ===
      0
    ) {
      return;
    }

    const text =
      createBenchmarkTextReport(
        results
      );

    await navigator.clipboard.writeText(
      text
    );

    setCopied(
      true
    );

    window.setTimeout(
      () =>
        setCopied(
          false
        ),
      1500
    );
  }

  function downloadReport() {
    if (
      results.length ===
      0
    ) {
      return;
    }

    const payload = {
      generatedAt:
        new Date()
          .toISOString(),

      benchmark:
        "VoxOps Stage 7B Live Voice-Agent Benchmark",

      summary,

      results,
    };

    const blob =
      new Blob(
        [
          JSON.stringify(
            payload,
            null,
            2
          ),
        ],
        {
          type:
            "application/json;charset=utf-8",
        }
      );

    const url =
      URL.createObjectURL(
        blob
      );

    const anchor =
      document.createElement(
        "a"
      );

    anchor.href =
      url;

    anchor.download =
      "voxops-live-voice-benchmark.json";

    anchor.click();

    URL.revokeObjectURL(
      url
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-cyan-500/15 bg-cyan-500/[0.025] p-5">

      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">

        <div className="max-w-3xl">

          <div className="flex flex-wrap items-center gap-3">

            <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-400">
              Stage 7B
            </p>

            <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-xs text-cyan-300">
              Live Voice Benchmark
            </span>

            {trialRunning && (
              <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">
                ● Trial Recording
              </span>
            )}

          </div>

          <h2 className="mt-3 text-xl font-semibold">
            Live Voice-Agent Evaluation
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            Measure the actual microphone → AssemblyAI transcript →
            agent reasoning → tool-call → VoxOps safety-policy path.
            These results are separate from the deterministic Stage 7A
            evaluation.
          </p>

        </div>

        {results.length >
          0 && (
          <div className="flex flex-wrap gap-2">

            <button
              onClick={
                copyReport
              }
              className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-gray-300 transition hover:bg-white/5"
            >
              {copied
                ? "Copied"
                : "Copy Results"}
            </button>

            <button
              onClick={
                downloadReport
              }
              className="rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-4 py-2.5 text-sm text-cyan-300 transition hover:bg-cyan-500/20"
            >
              Download JSON
            </button>

            <button
              onClick={
                onClearResults
              }
              disabled={
                trialRunning
              }
              className="rounded-lg border border-red-500/20 px-4 py-2.5 text-sm text-red-300 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear Results
            </button>

          </div>
        )}

      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">

        <BenchmarkControlPanel
          selectedCase={
            selectedCase
          }
          selectedCaseId={
            selectedCaseId
          }
          activeCase={
            activeCase
          }
          activeScenarioId={
            activeScenarioId
          }
          scenarioReady={
            scenarioReady
          }
          trialRunning={
            trialRunning
          }
          selectedAlreadyRun={
            selectedAlreadyRun
          }
          selectedResult={
            selectedResult
          }
          onSelectCase={
            setSelectedCaseId
          }
          onPrepareScenario={
            onPrepareScenario
          }
          onStartTrial={
            onStartTrial
          }
          onCancelTrial={
            onCancelTrial
          }
        />

        <LiveCapturePanel
          activeCase={
            activeCase
          }
          transcript={
            currentTranscript
          }
          toolName={
            currentToolName
          }
          toolArguments={
            currentToolArguments
          }
        />

      </div>

      <BenchmarkMetrics
        results={
          results
        }
      />

      <BenchmarkResultsTable
        results={
          results
        }
      />

      <div className="mt-5 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-4">

        <p className="text-xs font-medium uppercase tracking-[0.16em] text-amber-300">
          Measurement Scope
        </p>

        <p className="mt-2 text-xs leading-5 text-gray-500">
          Stage 7B measures observed behavior from a real AssemblyAI
          voice session: final transcript capture, operational tool
          selection, extracted tool arguments, VoxOps safety-policy
          outcome, and voice-trial-to-tool-call latency. It does not
          claim that the latency shown here is pure model inference
          latency, because microphone input, speech endpointing,
          transcription, agent reasoning, networking, and tool routing
          are all part of the measured path.
        </p>

      </div>

    </section>
  );
}

function BenchmarkControlPanel({
  selectedCase,
  selectedCaseId,
  activeCase,
  activeScenarioId,
  scenarioReady,
  trialRunning,
  selectedAlreadyRun,
  selectedResult,
  onSelectCase,
  onPrepareScenario,
  onStartTrial,
  onCancelTrial,
}: {
  selectedCase:
    LiveBenchmarkCase;

  selectedCaseId:
    string;

  activeCase:
    LiveBenchmarkCase | null;

  activeScenarioId:
    ScenarioId | null;

  scenarioReady:
    boolean;

  trialRunning:
    boolean;

  selectedAlreadyRun:
    boolean;

  selectedResult:
    LiveBenchmarkTrialResult | undefined;

  onSelectCase: (
    id: string
  ) => void;

  onPrepareScenario: (
    scenarioId: ScenarioId
  ) => void;

  onStartTrial: (
    benchmarkId: string
  ) => void;

  onCancelTrial:
    () => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-5">

      <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-600">
        Benchmark Control
      </p>

      <div className="mt-4">

        <label className="text-xs text-gray-500">
          Test Case
        </label>

        <select
          value={
            selectedCaseId
          }
          disabled={
            trialRunning
          }
          onChange={
            (event) =>
              onSelectCase(
                event.target
                  .value
              )
          }
          className="mt-2 w-full rounded-xl border border-white/10 bg-[#0c0f14] px-4 py-3 text-sm text-gray-200 outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >

          {liveBenchmarkCases.map(
            (item) => (
              <option
                key={
                  item.id
                }
                value={
                  item.id
                }
              >
                {item.id} —{" "}
                {item.title}
              </option>
            )
          )}

        </select>

      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.025] p-4">

        <div className="flex flex-wrap items-center justify-between gap-3">

          <div>

            <p className="text-sm font-medium text-gray-200">
              {
                selectedCase.title
              }
            </p>

            <p className="mt-1 text-xs text-gray-600">
              Scenario:{" "}
              {
                formatScenario(
                  selectedCase
                    .scenarioId
                )
              }
            </p>

          </div>

          <CategoryBadge
            category={
              selectedCase.category
            }
          />

        </div>

        <p className="mt-3 text-xs leading-5 text-gray-500">
          {
            selectedCase.description
          }
        </p>

      </div>

      <div className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/[0.05] p-4">

        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-violet-400">
          Speak This Command
        </p>

        <p className="mt-2 text-base font-medium leading-7 text-gray-100">
          &ldquo;{
            selectedCase
              .spokenCommand
          }&rdquo;
        </p>

      </div>

      <div className="mt-4 space-y-2">

        <ExpectationRow
          label="Expected tool"
          value={
            selectedCase
              .expectedTool
          }
        />

        <ExpectationRow
          label="Expected service"
          value={
            selectedCase
              .expectedService
          }
        />

        {selectedCase
          .expectedTargetVersion && (
          <ExpectationRow
            label="Expected target"
            value={
              selectedCase
                .expectedTargetVersion
            }
          />
        )}

        <ExpectationRow
          label="Expected outcome"
          value={
            selectedCase
              .expectedToolOk
              ? "Tool accepted"
              : `Blocked${
                  selectedCase
                    .expectedError
                    ? ` — ${selectedCase.expectedError}`
                    : ""
                }`
          }
        />

      </div>

      <div className="mt-5 rounded-xl border border-white/5 bg-white/[0.02] p-4">

        <p className="text-xs font-medium text-gray-400">
          Trial Procedure
        </p>

        <div className="mt-3 space-y-2">

          <ProcedureStep
            number="1"
            text="Prepare the required incident scenario."
            complete={
              scenarioReady
            }
          />

          <ProcedureStep
            number="2"
            text="Start the VoxOps Voice Agent above and wait until it shows Listening."
            complete={
              false
            }
          />

          <ProcedureStep
            number="3"
            text="Click Start Trial, then speak the displayed command naturally."
            complete={
              trialRunning
            }
          />

          <ProcedureStep
            number="4"
            text="The trial completes automatically after the final transcript and tool call are captured."
            complete={
              selectedAlreadyRun
            }
          />

        </div>

      </div>

      {activeScenarioId &&
        !scenarioReady &&
        !trialRunning && (
        <div className="mt-4 rounded-lg border border-amber-500/15 bg-amber-500/[0.04] p-3">

          <p className="text-xs leading-5 text-amber-200/70">
            A different benchmark scenario is active. Preparing this
            case will reset the simulated system and load the correct
            incident.
          </p>

        </div>
      )}

      {selectedResult && (
        <div
          className={`mt-4 rounded-xl border p-4 ${
            selectedResult.passed
              ? "border-emerald-500/20 bg-emerald-500/[0.04]"
              : "border-red-500/20 bg-red-500/[0.04]"
          }`}
        >

          <p
            className={`text-xs font-medium uppercase tracking-[0.16em] ${
              selectedResult.passed
                ? "text-emerald-400"
                : "text-red-400"
            }`}
          >
            Last Result
          </p>

          <p className="mt-2 text-sm text-gray-300">
            {
              selectedResult.passed
                ? "PASS"
                : "FAIL"
            }{" "}
            — transcript match{" "}
            {
              selectedResult
                .transcriptSimilarity
            }
            %
          </p>

        </div>
      )}

      <div className="mt-5 flex flex-wrap gap-2">

        {!trialRunning ? (
          <>
            <button
              onClick={
                () =>
                  onPrepareScenario(
                    selectedCase
                      .scenarioId
                  )
              }
              className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-gray-300 transition hover:bg-white/5"
            >
              {scenarioReady
                ? "Reload Scenario"
                : "Prepare Scenario"}
            </button>

            <button
              onClick={
                () =>
                  onStartTrial(
                    selectedCase.id
                  )
              }
              disabled={
                !scenarioReady
              }
              className="rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Start Trial
            </button>
          </>
        ) : (
          <button
            onClick={
              onCancelTrial
            }
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/20"
          >
            Cancel Trial
          </button>
        )}

      </div>

      {activeCase && (
        <p className="mt-3 text-xs text-amber-300/70">
          Recording{" "}
          {
            activeCase.id
          }
          . Speak only the benchmark command and wait for VoxOps to
          invoke the tool.
        </p>
      )}

    </div>
  );
}

function LiveCapturePanel({
  activeCase,
  transcript,
  toolName,
  toolArguments,
}: {
  activeCase:
    LiveBenchmarkCase | null;

  transcript:
    string;

  toolName:
    string | null;

  toolArguments:
    Record<
      string,
      unknown
    > | null;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-5">

      <div className="flex items-center justify-between gap-3">

        <div>

          <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-600">
            Live Capture
          </p>

          <p className="mt-1 text-sm text-gray-500">
            Data observed from the real voice-agent session.
          </p>

        </div>

        <span
          className={`rounded-full px-2.5 py-1 text-xs ${
            activeCase
              ? "bg-amber-500/10 text-amber-300"
              : "bg-white/5 text-gray-500"
          }`}
        >
          {activeCase
            ? "● Recording"
            : "Idle"}
        </span>

      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">

        <CaptureCard
          label="Final Transcript"
          complete={
            Boolean(
              transcript
            )
          }
        >
          {transcript ? (
            <p className="text-sm leading-6 text-gray-200">
              &ldquo;{
                transcript
              }&rdquo;
            </p>
          ) : (
            <EmptyCaptureText text="Waiting for transcript.user..." />
          )}
        </CaptureCard>

        <CaptureCard
          label="Tool Selection"
          complete={
            Boolean(
              toolName
            )
          }
        >
          {toolName ? (
            <p className="font-mono text-sm text-cyan-300">
              {toolName}
            </p>
          ) : (
            <EmptyCaptureText text="Waiting for tool.call..." />
          )}
        </CaptureCard>

      </div>

      <div className="mt-3">

        <CaptureCard
          label="Tool Arguments"
          complete={
            Boolean(
              toolArguments
            )
          }
        >
          {toolArguments ? (
            <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs leading-5 text-gray-400">
              {
                JSON.stringify(
                  toolArguments,
                  null,
                  2
                )
              }
            </pre>
          ) : (
            <EmptyCaptureText text="No tool arguments captured yet." />
          )}
        </CaptureCard>

      </div>

      <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.02] p-4">

        <p className="text-xs font-medium text-gray-400">
          Completion conditions
        </p>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">

          <StatusCheck
            label="Final transcript received"
            passed={
              Boolean(
                transcript
              )
            }
          />

          <StatusCheck
            label="Operational tool observed"
            passed={
              Boolean(
                toolName
              )
            }
          />

        </div>

      </div>

      {!activeCase &&
        !transcript &&
        !toolName && (
        <div className="mt-5 flex min-h-[120px] items-center justify-center">

          <p className="max-w-md text-center text-sm leading-6 text-gray-600">
            Prepare a benchmark scenario and start a trial. This panel
            will display the actual AssemblyAI transcript and tool call
            as they arrive.
          </p>

        </div>
      )}

    </div>
  );
}

function BenchmarkMetrics({
  results,
}: {
  results:
    LiveBenchmarkTrialResult[];
}) {
  const summary =
    summarizeLiveBenchmarkTrials(
      results
    );

  if (
    results.length ===
    0
  ) {
    return (
      <div className="mt-5 rounded-xl border border-white/10 bg-black/20 p-5">

        <p className="text-xs font-medium uppercase tracking-[0.18em] text-gray-600">
          Live Metrics
        </p>

        <div className="mt-4 flex min-h-[100px] items-center justify-center">

          <p className="text-sm text-gray-600">
            Complete at least one live trial to generate measured
            voice-agent metrics.
          </p>

        </div>

      </div>
    );
  }

  return (
    <div className="mt-5">

      <div className="mb-3 flex items-center justify-between">

        <div>

          <h3 className="text-sm font-medium text-gray-300">
            Live Benchmark Metrics
          </h3>

          <p className="mt-1 text-xs text-gray-600">
            Based on {
              summary.totalTrials
            } recorded trial{
              summary.totalTrials ===
              1
                ? ""
                : "s"
            }.
          </p>

        </div>

      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">

        <MetricCard
          label="Command Success"
          value={`${summary.commandSuccessRate}%`}
          detail={`${summary.passedTrials}/${summary.totalTrials} trials`}
        />

        <MetricCard
          label="Transcript Match"
          value={`${summary.transcriptCommandMatchRate}%`}
          detail="Command-level similarity"
        />

        <MetricCard
          label="Tool Selection"
          value={`${summary.toolSelectionAccuracy}%`}
          detail="Expected tool"
        />

        <MetricCard
          label="Arguments"
          value={`${summary.argumentAccuracy}%`}
          detail="Service/version extraction"
        />

        <MetricCard
          label="Safety Outcome"
          value={`${summary.safetyOutcomeAccuracy}%`}
          detail="Expected allow/block"
        />

        <MetricCard
          label="Voice → Tool"
          value={
            summary
              .medianVoiceToToolLatencyMs ===
            null
              ? "—"
              : `${formatLatency(
                  summary
                    .medianVoiceToToolLatencyMs
                )} ms`
          }
          detail="Median trial-to-tool"
        />

      </div>

    </div>
  );
}

function BenchmarkResultsTable({
  results,
}: {
  results:
    LiveBenchmarkTrialResult[];
}) {
  if (
    results.length ===
    0
  ) {
    return null;
  }

  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-black/20">

      <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">

        <div>

          <h3 className="text-sm font-medium text-gray-300">
            Recorded Live Trials
          </h3>

          <p className="mt-1 text-xs text-gray-600">
            Actual AssemblyAI voice-agent observations
          </p>

        </div>

        <div className="text-xs">

          <span className="text-emerald-400">
            {
              results.filter(
                (result) =>
                  result.passed
              ).length
            }{" "}
            passed
          </span>

          {results.some(
            (result) =>
              !result.passed
          ) && (
            <span className="ml-3 text-red-400">
              {
                results.filter(
                  (result) =>
                    !result.passed
                ).length
              }{" "}
              failed
            </span>
          )}

        </div>

      </div>

      <div className="overflow-x-auto">

        <table className="w-full min-w-[1180px] text-left">

          <thead>

            <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.14em] text-gray-600">

              <th className="px-4 py-3 font-medium">
                Test
              </th>

              <th className="px-4 py-3 font-medium">
                Transcript
              </th>

              <th className="px-4 py-3 font-medium">
                Tool
              </th>

              <th className="px-4 py-3 font-medium">
                Arguments
              </th>

              <th className="px-4 py-3 text-right font-medium">
                Match
              </th>

              <th className="px-4 py-3 text-right font-medium">
                Voice → Tool
              </th>

              <th className="px-4 py-3 text-right font-medium">
                Result
              </th>

            </tr>

          </thead>

          <tbody>

            {results.map(
              (result) => (
                <tr
                  key={
                    `${result.benchmarkId}-${result.completedAt}`
                  }
                  className="border-b border-white/5 align-top last:border-0"
                >

                  <td className="px-4 py-4">

                    <p className="text-xs font-medium text-cyan-400">
                      {
                        result.benchmarkId
                      }
                    </p>

                    <p className="mt-1 max-w-[190px] text-xs text-gray-400">
                      {
                        result.title
                      }
                    </p>

                  </td>

                  <td className="max-w-[280px] px-4 py-4">

                    <p className="text-xs leading-5 text-gray-400">
                      {
                        result.transcript ||
                        "No transcript"
                      }
                    </p>

                  </td>

                  <td className="px-4 py-4">

                    <CheckText
                      passed={
                        result.checks
                          .toolSelectionPassed
                      }
                      text={
                        result.actualTool ??
                        "None"
                      }
                    />

                  </td>

                  <td className="px-4 py-4">

                    <div className="space-y-1">

                      <CheckText
                        passed={
                          result.checks
                            .serviceArgumentPassed
                        }
                        text={
                          result.actualService ??
                          "No service"
                        }
                      />

                      {result
                        .expectedTargetVersion && (
                        <CheckText
                          passed={
                            result.checks
                              .targetVersionArgumentPassed
                          }
                          text={
                            result.actualTargetVersion ??
                            "No target"
                          }
                        />
                      )}

                    </div>

                  </td>

                  <td className="px-4 py-4 text-right">

                    <span
                      className={
                        result.checks
                          .transcriptSimilarityPassed
                          ? "text-emerald-400"
                          : "text-red-400"
                      }
                    >
                      {
                        result.transcriptSimilarity
                      }
                      %
                    </span>

                  </td>

                  <td className="px-4 py-4 text-right text-xs text-gray-400">

                    {result
                      .voiceToToolLatencyMs ===
                    null
                      ? "—"
                      : `${formatLatency(
                          result
                            .voiceToToolLatencyMs
                        )} ms`}

                  </td>

                  <td className="px-4 py-4 text-right">

                    <ResultBadge
                      passed={
                        result.passed
                      }
                    />

                  </td>

                </tr>
              )
            )}

          </tbody>

        </table>

      </div>

    </div>
  );
}

function CaptureCard({
  label,
  complete,
  children,
}: {
  label: string;
  complete: boolean;
  children:
    React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">

      <div className="flex items-center justify-between gap-3">

        <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-gray-600">
          {label}
        </p>

        <span
          className={`text-[10px] ${
            complete
              ? "text-emerald-400"
              : "text-gray-700"
          }`}
        >
          {complete
            ? "● captured"
            : "○ waiting"}
        </span>

      </div>

      <div className="mt-3">
        {children}
      </div>

    </div>
  );
}

function ExpectationRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border border-white/5 bg-white/[0.015] px-3 py-2.5">

      <span className="text-xs text-gray-600">
        {label}
      </span>

      <span className="max-w-[65%] text-right font-mono text-xs text-gray-300">
        {value}
      </span>

    </div>
  );
}

function ProcedureStep({
  number,
  text,
  complete,
}: {
  number: string;
  text: string;
  complete: boolean;
}) {
  return (
    <div className="flex items-start gap-3">

      <div
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] ${
          complete
            ? "bg-emerald-500/15 text-emerald-400"
            : "bg-white/5 text-gray-600"
        }`}
      >
        {complete
          ? "✓"
          : number}
      </div>

      <p className="text-xs leading-5 text-gray-500">
        {text}
      </p>

    </div>
  );
}

function StatusCheck({
  label,
  passed,
}: {
  label: string;
  passed: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.015] px-3 py-2">

      <span
        className={
          passed
            ? "text-emerald-400"
            : "text-gray-700"
        }
      >
        {passed
          ? "✓"
          : "○"}
      </span>

      <span className="text-xs text-gray-500">
        {label}
      </span>

    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">

      <p className="text-xs text-gray-600">
        {label}
      </p>

      <p className="mt-2 text-2xl font-semibold text-gray-100">
        {value}
      </p>

      <p className="mt-1 text-[11px] text-gray-600">
        {detail}
      </p>

    </div>
  );
}

function CategoryBadge({
  category,
}: {
  category:
    LiveBenchmarkCase["category"];
}) {
  const label =
    category ===
    "investigation"
      ? "Investigation"
      : category ===
        "recovery-request"
      ? "Recovery"
      : "Safety";

  const classes =
    category ===
    "investigation"
      ? "bg-violet-500/10 text-violet-300"
      : category ===
        "recovery-request"
      ? "bg-blue-500/10 text-blue-300"
      : "bg-rose-500/10 text-rose-300";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-medium ${classes}`}
    >
      {label}
    </span>
  );
}

function ResultBadge({
  passed,
}: {
  passed: boolean;
}) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        passed
          ? "bg-emerald-500/10 text-emerald-400"
          : "bg-red-500/10 text-red-400"
      }`}
    >
      {passed
        ? "PASS"
        : "FAIL"}
    </span>
  );
}

function CheckText({
  passed,
  text,
}: {
  passed: boolean;
  text: string;
}) {
  return (
    <p
      className={`font-mono text-xs ${
        passed
          ? "text-emerald-400"
          : "text-red-400"
      }`}
    >
      {passed
        ? "✓"
        : "✕"}{" "}
      {text}
    </p>
  );
}

function EmptyCaptureText({
  text,
}: {
  text: string;
}) {
  return (
    <p className="text-xs italic text-gray-700">
      {text}
    </p>
  );
}

function formatScenario(
  scenarioId:
    ScenarioId
) {
  if (
    scenarioId ===
    "checkout-regression"
  ) {
    return "Checkout Release Regression";
  }

  if (
    scenarioId ===
    "auth-regression"
  ) {
    return "Authentication Release Regression";
  }

  return "Payment Provider Degradation";
}

function formatLatency(
  latency: number
) {
  if (
    latency <
    1000
  ) {
    return latency.toFixed(
      0
    );
  }

  return latency.toFixed(
    1
  );
}

function createBenchmarkTextReport(
  results:
    LiveBenchmarkTrialResult[]
) {
  const summary =
    summarizeLiveBenchmarkTrials(
      results
    );

  const lines = [
    "VoxOps Stage 7B Live Voice-Agent Benchmark",
    "",
    `Generated: ${new Date().toLocaleString()}`,
    "",
    `Trials: ${summary.totalTrials}`,
    `Passed: ${summary.passedTrials}`,
    `Failed: ${summary.failedTrials}`,
    "",
    `Command success rate: ${summary.commandSuccessRate}%`,
    `Transcript command match rate: ${summary.transcriptCommandMatchRate}%`,
    `Tool-selection accuracy: ${summary.toolSelectionAccuracy}%`,
    `Argument accuracy: ${summary.argumentAccuracy}%`,
    `Safety outcome accuracy: ${summary.safetyOutcomeAccuracy}%`,
    `Median voice-to-tool latency: ${
      summary.medianVoiceToToolLatencyMs ===
      null
        ? "N/A"
        : `${formatLatency(
            summary
              .medianVoiceToToolLatencyMs
          )} ms`
    }`,
    "",
    "Recorded Trials",
    "",
  ];

  for (
    const result of
    results
  ) {
    lines.push(
      `${result.benchmarkId} | ${
        result.passed
          ? "PASS"
          : "FAIL"
      } | ${result.title}`
    );

    lines.push(
      `Spoken command: ${result.spokenCommand}`
    );

    lines.push(
      `Transcript: ${result.transcript || "None"}`
    );

    lines.push(
      `Transcript similarity: ${result.transcriptSimilarity}%`
    );

    lines.push(
      `Expected tool: ${result.expectedTool}`
    );

    lines.push(
      `Actual tool: ${result.actualTool ?? "None"}`
    );

    lines.push(
      `Expected service: ${result.expectedService}`
    );

    lines.push(
      `Actual service: ${result.actualService ?? "None"}`
    );

    if (
      result
        .expectedTargetVersion
    ) {
      lines.push(
        `Expected target: ${result.expectedTargetVersion}`
      );

      lines.push(
        `Actual target: ${result.actualTargetVersion ?? "None"}`
      );
    }

    lines.push(
      `Expected tool outcome: ${
        result.expectedToolOk
          ? "accepted"
          : "blocked"
      }`
    );

    lines.push(
      `Actual tool outcome: ${
        result.actualToolOk ===
        null
          ? "None"
          : result.actualToolOk
          ? "accepted"
          : "blocked"
      }`
    );

    if (
      result.expectedError
    ) {
      lines.push(
        `Expected error: ${result.expectedError}`
      );

      lines.push(
        `Actual error: ${result.actualError ?? "None"}`
      );
    }

    lines.push(
      `Voice-to-tool latency: ${
        result
          .voiceToToolLatencyMs ===
        null
          ? "N/A"
          : `${formatLatency(
              result
                .voiceToToolLatencyMs
            )} ms`
      }`
    );

    lines.push(
      ""
    );
  }

  lines.push(
    "Scope:"
  );

  lines.push(
    "These measurements represent live end-to-end benchmark observations from microphone input through AssemblyAI transcript and agent tool routing into the VoxOps policy layer. They are not pure model-inference latency measurements."
  );

  return lines.join(
    "\n"
  );
}