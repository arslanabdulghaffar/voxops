"use client";

import {
  useState,
} from "react";

import {
  runIncidentTool,
  type IncidentToolResult,
} from "@/lib/voxops/incident-tools";

import {
  getIncidentScenario,
  healthyServices,
  type IncidentScenario,
} from "@/lib/voxops/scenarios";

type EvaluationCategory =
  | "Diagnosis"
  | "Authorization"
  | "Safety"
  | "Recovery";

type EvaluationResult = {
  id: string;
  category: EvaluationCategory;
  name: string;
  expected: string;
  actual: string;
  passed: boolean;
  latencyMs: number;
};

type EvaluationSummary = {
  total: number;
  passed: number;
  failed: number;
  overallAccuracy: number;
  diagnosisAccuracy: number;
  authorizationEnforcement: number;
  unsafeActionBlockRate: number;
  recoveryVerificationRate: number;
  medianToolLatencyMs: number;
};

type EvaluationReport = {
  generatedAt: string;
  results: EvaluationResult[];
  summary: EvaluationSummary;
};

type ToolData = {
  state?: string;

  safety_blocked?: boolean;

  recovery_verified?: boolean;

  proposal?: {
    service?: string;
    serviceId?: string;
    fromVersion?: string;
    toVersion?: string;
  };

  diagnosis?: {
    confidence?: string;
    likely_cause?: string;
    recommended_action?: string;
  };
};

type TestDefinition = {
  id: string;
  category: EvaluationCategory;
  name: string;
  expected: string;
  execute: () => IncidentToolResult;
  validate: (
    result: IncidentToolResult
  ) => boolean;
  describe: (
    result: IncidentToolResult
  ) => string;
};

export default function EvaluationDashboard() {
  const [
    report,
    setReport,
  ] =
    useState<EvaluationReport | null>(
      null
    );

  const [
    running,
    setRunning,
  ] =
    useState(false);

  const [
    copied,
    setCopied,
  ] =
    useState(false);

  function runEvaluation() {
    if (running) {
      return;
    }

    setRunning(true);

    /*
     * A short delay lets React paint
     * the "Running..." state before
     * synchronous deterministic tests
     * execute.
     */
    window.setTimeout(() => {
      try {
        const newReport =
          buildEvaluationReport();

        setReport(
          newReport
        );
      } finally {
        setRunning(
          false
        );
      }
    }, 50);
  }

  async function copySummary() {
    if (!report) {
      return;
    }

    const text =
      createTextReport(
        report
      );

    await navigator.clipboard.writeText(
      text
    );

    setCopied(
      true
    );

    window.setTimeout(() => {
      setCopied(
        false
      );
    }, 1500);
  }

  function downloadJson() {
    if (!report) {
      return;
    }

    const blob =
      new Blob(
        [
          JSON.stringify(
            report,
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
      "voxops-evaluation-report.json";

    anchor.click();

    URL.revokeObjectURL(
      url
    );
  }

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

        <div className="max-w-3xl">

          <div className="flex flex-wrap items-center gap-3">

            <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-400">
              Stage 7 Evaluation
            </p>

            {report && (
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400">
                Evaluation complete
              </span>
            )}

          </div>

          <h2 className="mt-2 text-xl font-semibold">
            Reliability & Safety Evaluation
          </h2>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
            Reproducible tests exercise the same VoxOps incident tools,
            scenario evidence and rollback safety policies used by the
            live voice agent.
          </p>

        </div>

        <div className="flex flex-wrap gap-2">

          {report && (
            <>
              <button
                onClick={
                  copySummary
                }
                className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-gray-300 transition hover:bg-white/5"
              >
                {copied
                  ? "Copied"
                  : "Copy Results"}
              </button>

              <button
                onClick={
                  downloadJson
                }
                className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-sm text-violet-300 transition hover:bg-violet-500/20"
              >
                Download JSON
              </button>
            </>
          )}

          <button
            onClick={
              runEvaluation
            }
            disabled={
              running
            }
            className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running
              ? "Running Evaluation..."
              : report
              ? "Run Again"
              : "Run Evaluation"}
          </button>

        </div>

      </div>

      {!report ? (
        <EvaluationEmptyState
          running={
            running
          }
        />
      ) : (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">

            <MetricCard
              label="Overall Checks"
              value={`${report.summary.overallAccuracy}%`}
              detail={`${report.summary.passed}/${report.summary.total} passed`}
            />

            <MetricCard
              label="Diagnosis"
              value={`${report.summary.diagnosisAccuracy}%`}
              detail="Root-cause checks"
            />

            <MetricCard
              label="Safety Gate"
              value={`${report.summary.authorizationEnforcement}%`}
              detail="Approval enforcement"
            />

            <MetricCard
              label="Unsafe Blocks"
              value={`${report.summary.unsafeActionBlockRate}%`}
              detail="Invalid actions blocked"
            />

            <MetricCard
              label="Recovery"
              value={`${report.summary.recoveryVerificationRate}%`}
              detail="Recovery checks"
            />

            <MetricCard
              label="Tool Latency"
              value={`${formatLatency(
                report.summary
                  .medianToolLatencyMs
              )} ms`}
              detail="Median local execution"
            />

          </div>

          <div className="mt-6 rounded-xl border border-white/10 bg-black/20">

            <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <h3 className="font-medium text-gray-200">
                  Automated Test Matrix
                </h3>

                <p className="mt-1 text-xs text-gray-500">
                  {report.summary.total} deterministic policy and
                  incident-response checks
                </p>

              </div>

              <div className="flex items-center gap-3 text-xs">

                <span className="text-emerald-400">
                  {
                    report.summary
                      .passed
                  }{" "}
                  passed
                </span>

                {report.summary.failed >
                  0 && (
                  <span className="text-red-400">
                    {
                      report.summary
                        .failed
                    }{" "}
                    failed
                  </span>
                )}

              </div>

            </div>

            <div className="overflow-x-auto">

              <table className="w-full min-w-[980px] text-left">

                <thead>

                  <tr className="border-b border-white/10 text-[10px] uppercase tracking-[0.16em] text-gray-600">

                    <th className="px-4 py-3 font-medium">
                      ID
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Category
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Test
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Expected
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Actual
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      Latency
                    </th>

                    <th className="px-4 py-3 text-right font-medium">
                      Result
                    </th>

                  </tr>

                </thead>

                <tbody>

                  {report.results.map(
                    (
                      result
                    ) => (
                      <tr
                        key={
                          result.id
                        }
                        className="border-b border-white/5 align-top last:border-0"
                      >

                        <td className="whitespace-nowrap px-4 py-4 text-xs font-medium text-violet-400">
                          {
                            result.id
                          }
                        </td>

                        <td className="px-4 py-4">
                          <CategoryBadge
                            category={
                              result.category
                            }
                          />
                        </td>

                        <td className="max-w-[220px] px-4 py-4">

                          <p className="text-sm font-medium text-gray-300">
                            {
                              result.name
                            }
                          </p>

                        </td>

                        <td className="max-w-[260px] px-4 py-4 text-xs leading-5 text-gray-500">
                          {
                            result.expected
                          }
                        </td>

                        <td className="max-w-[300px] px-4 py-4 text-xs leading-5 text-gray-400">
                          {
                            result.actual
                          }
                        </td>

                        <td className="whitespace-nowrap px-4 py-4 text-right text-xs text-gray-500">
                          {formatLatency(
                            result.latencyMs
                          )}{" "}
                          ms
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

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">

            <EvaluationInterpretation
              summary={
                report.summary
              }
            />

            <div className="rounded-xl border border-white/10 bg-black/20 p-4">

              <p className="text-xs font-medium uppercase tracking-[0.16em] text-gray-600">
                Evaluation Metadata
              </p>

              <div className="mt-4 space-y-3">

                <MetadataRow
                  label="Generated"
                  value={
                    new Date(
                      report.generatedAt
                    ).toLocaleString()
                  }
                />

                <MetadataRow
                  label="Scenarios"
                  value="3"
                />

                <MetadataRow
                  label="Test cases"
                  value={
                    report.summary.total.toString()
                  }
                />

                <MetadataRow
                  label="Execution"
                  value="Browser / deterministic tool layer"
                />

                <MetadataRow
                  label="Voice model"
                  value="Not included in these deterministic metrics"
                />

              </div>

            </div>

          </div>

          <div className="mt-5 rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-4">

            <p className="text-xs font-medium uppercase tracking-[0.16em] text-amber-300">
              Scope of these metrics
            </p>

            <p className="mt-2 text-xs leading-5 text-gray-500">
              These automated results measure VoxOps&apos; deterministic
              incident-tool logic, diagnosis data, rollback validation,
              Safety Gate requirements and recovery verification. They do
              not claim to measure speech-recognition accuracy, LLM
              reasoning accuracy, network latency or end-to-end voice
              response latency. Those should be measured separately during
              live-agent evaluation.
            </p>

          </div>
        </>
      )}

    </section>
  );
}

function buildEvaluationReport():
  EvaluationReport {
  const checkout =
    getIncidentScenario(
      "checkout-regression"
    );

  const auth =
    getIncidentScenario(
      "auth-regression"
    );

  const payment =
    getIncidentScenario(
      "payment-provider"
    );

  const tests:
    TestDefinition[] = [
      /*
       * --------------------------------
       * Diagnosis tests
       * --------------------------------
       */

      {
        id: "D01",

        category:
          "Diagnosis",

        name:
          "Checkout root-cause diagnosis",

        expected:
          "Checkout API v2.14 pricing normalization regression",

        execute: () =>
          runIncidentTool(
            "investigate_incident",

            {
              service:
                "Checkout API",
            },

            createContext(
              checkout
            )
          ),

        validate: (
          result
        ) =>
          result.ok &&
          getDiagnosis(
            result
          ) ===
            "Checkout API v2.14 pricing normalization regression",

        describe:
          describeDiagnosis,
      },

      {
        id: "D02",

        category:
          "Diagnosis",

        name:
          "Authentication root-cause diagnosis",

        expected:
          "Auth Service v1.21 token-validation regression",

        execute: () =>
          runIncidentTool(
            "investigate_incident",

            {
              service:
                "Auth Service",
            },

            createContext(
              auth
            )
          ),

        validate: (
          result
        ) =>
          result.ok &&
          getDiagnosis(
            result
          ) ===
            "Auth Service v1.21 token-validation regression",

        describe:
          describeDiagnosis,
      },

      {
        id: "D03",

        category:
          "Diagnosis",

        name:
          "Payment provider root-cause diagnosis",

        expected:
          "External AtlasPay Gateway degradation",

        execute: () =>
          runIncidentTool(
            "investigate_incident",

            {
              service:
                "Payment API",
            },

            createContext(
              payment
            )
          ),

        validate: (
          result
        ) =>
          result.ok &&
          getDiagnosis(
            result
          ) ===
            "External AtlasPay Gateway degradation",

        describe:
          describeDiagnosis,
      },

      /*
       * --------------------------------
       * Authorization tests
       * --------------------------------
       */

      {
        id: "A01",

        category:
          "Authorization",

        name:
          "Valid Checkout rollback requires Safety Gate",

        expected:
          "Rollback proposal accepted but execution remains AWAITING_HUMAN_APPROVAL",

        execute: () =>
          runIncidentTool(
            "request_rollback",

            {
              service:
                "Checkout API",

              target_version:
                "v2.13",
            },

            createContext(
              checkout
            )
          ),

        validate: (
          result
        ) =>
          result.ok &&
          getToolData(
            result
          ).state ===
            "AWAITING_HUMAN_APPROVAL" &&
          getToolData(
            result
          ).proposal
            ?.toVersion ===
            "v2.13",

        describe:
          describeRollbackResult,
      },

      {
        id: "A02",

        category:
          "Authorization",

        name:
          "Valid Auth rollback requires Safety Gate",

        expected:
          "Rollback proposal accepted but execution remains AWAITING_HUMAN_APPROVAL",

        execute: () =>
          runIncidentTool(
            "request_rollback",

            {
              service:
                "Auth Service",

              target_version:
                "v1.20",
            },

            createContext(
              auth
            )
          ),

        validate: (
          result
        ) =>
          result.ok &&
          getToolData(
            result
          ).state ===
            "AWAITING_HUMAN_APPROVAL" &&
          getToolData(
            result
          ).proposal
            ?.toVersion ===
            "v1.20",

        describe:
          describeRollbackResult,
      },

      /*
       * --------------------------------
       * Safety tests
       * --------------------------------
       */

      {
        id: "S01",

        category:
          "Safety",

        name:
          "Wrong Checkout target is blocked",

        expected:
          "v2.12 rejected because validated stable target is v2.13",

        execute: () =>
          runIncidentTool(
            "request_rollback",

            {
              service:
                "Checkout API",

              target_version:
                "v2.12",
            },

            createContext(
              checkout
            )
          ),

        validate: (
          result
        ) =>
          !result.ok &&
          result.error ===
            "INVALID_TARGET_VERSION" &&
          getToolData(
            result
          ).safety_blocked ===
            true,

        describe:
          describeRollbackResult,
      },

      {
        id: "S02",

        category:
          "Safety",

        name:
          "Payment rollback blocked for provider outage",

        expected:
          "Rollback rejected because evidence identifies AtlasPay Gateway, not Payment API deployment",

        execute: () =>
          runIncidentTool(
            "request_rollback",

            {
              service:
                "Payment API",

              target_version:
                "v3.7",
            },

            createContext(
              payment
            )
          ),

        validate: (
          result
        ) =>
          !result.ok &&
          result.error ===
            "ROLLBACK_NOT_VALIDATED" &&
          getToolData(
            result
          ).safety_blocked ===
            true,

        describe:
          describeRollbackResult,
      },

      {
        id: "S03",

        category:
          "Safety",

        name:
          "Wrong service rollback blocked",

        expected:
          "Payment API rollback rejected during Checkout incident",

        execute: () =>
          runIncidentTool(
            "request_rollback",

            {
              service:
                "Payment API",

              target_version:
                "v3.7",
            },

            createContext(
              checkout
            )
          ),

        validate: (
          result
        ) =>
          !result.ok &&
          result.error ===
            "ROLLBACK_NOT_VALIDATED" &&
          getToolData(
            result
          ).safety_blocked ===
            true,

        describe:
          describeRollbackResult,
      },

      {
        id: "S04",

        category:
          "Safety",

        name:
          "Rollback blocked without active incident",

        expected:
          "Rollback rejected when there is no active incident",

        execute: () =>
          runIncidentTool(
            "request_rollback",

            {
              service:
                "Checkout API",

              target_version:
                "v2.13",
            },

            {
              services:
                healthyServices,

              incident:
                null,
            }
          ),

        validate: (
          result
        ) =>
          !result.ok &&
          result.error ===
            "NO_ACTIVE_INCIDENT" &&
          getToolData(
            result
          ).safety_blocked ===
            true,

        describe:
          describeRollbackResult,
      },

      /*
       * --------------------------------
       * Recovery verification tests
       * --------------------------------
       */

      {
        id: "R01",

        category:
          "Recovery",

        name:
          "Checkout recovery verification",

        expected:
          "Checkout API verified healthy on v2.13",

        execute: () =>
          runIncidentTool(
            "verify_recovery",

            {
              service:
                "Checkout API",
            },

            {
              services:
                checkout
                  .recoveredServices ??
                checkout
                  .failureServices,

              incident:
                null,
            }
          ),

        validate: (
          result
        ) =>
          result.ok &&
          getToolData(
            result
          ).recovery_verified ===
            true,

        describe:
          describeRecoveryResult,
      },

      {
        id: "R02",

        category:
          "Recovery",

        name:
          "Auth recovery verification",

        expected:
          "Auth Service verified healthy on v1.20",

        execute: () =>
          runIncidentTool(
            "verify_recovery",

            {
              service:
                "Auth Service",
            },

            {
              services:
                auth
                  .recoveredServices ??
                auth
                  .failureServices,

              incident:
                null,
            }
          ),

        validate: (
          result
        ) =>
          result.ok &&
          getToolData(
            result
          ).recovery_verified ===
            true,

        describe:
          describeRecoveryResult,
      },
    ];

  const results =
    tests.map(
      runTest
    );

  return {
    generatedAt:
      new Date().toISOString(),

    results,

    summary:
      createSummary(
        results
      ),
  };
}

function createContext(
  scenario: IncidentScenario
) {
  return {
    services:
      scenario.failureServices,

    incident: {
      ...scenario.incident,

      startedAt:
        new Date().toISOString(),
    },
  };
}

function runTest(
  test: TestDefinition
): EvaluationResult {
  const startedAt =
    performance.now();

  let result:
    IncidentToolResult;

  try {
    result =
      test.execute();
  } catch (
    error
  ) {
    const latency =
      performance.now() -
      startedAt;

    return {
      id:
        test.id,

      category:
        test.category,

      name:
        test.name,

      expected:
        test.expected,

      actual:
        error instanceof
        Error
          ? `Exception: ${error.message}`
          : "Unknown exception",

      passed:
        false,

      latencyMs:
        latency,
    };
  }

  const latencyMs =
    performance.now() -
    startedAt;

  let passed =
    false;

  try {
    passed =
      test.validate(
        result
      );
  } catch {
    passed =
      false;
  }

  let actual:
    string;

  try {
    actual =
      test.describe(
        result
      );
  } catch {
    actual =
      result.summary;
  }

  return {
    id:
      test.id,

    category:
      test.category,

    name:
      test.name,

    expected:
      test.expected,

    actual,

    passed,

    latencyMs,
  };
}

function createSummary(
  results: EvaluationResult[]
): EvaluationSummary {
  const passed =
    results.filter(
      (result) =>
        result.passed
    ).length;

  const total =
    results.length;

  const failed =
    total - passed;

  const diagnosis =
    results.filter(
      (result) =>
        result.category ===
        "Diagnosis"
    );

  const authorization =
    results.filter(
      (result) =>
        result.category ===
        "Authorization"
    );

  const safety =
    results.filter(
      (result) =>
        result.category ===
        "Safety"
    );

  const recovery =
    results.filter(
      (result) =>
        result.category ===
        "Recovery"
    );

  return {
    total,

    passed,

    failed,

    overallAccuracy:
      percentage(
        passed,
        total
      ),

    diagnosisAccuracy:
      categoryAccuracy(
        diagnosis
      ),

    authorizationEnforcement:
      categoryAccuracy(
        authorization
      ),

    unsafeActionBlockRate:
      categoryAccuracy(
        safety
      ),

    recoveryVerificationRate:
      categoryAccuracy(
        recovery
      ),

    medianToolLatencyMs:
      median(
        results.map(
          (result) =>
            result.latencyMs
        )
      ),
  };
}

function categoryAccuracy(
  results: EvaluationResult[]
) {
  if (
    results.length === 0
  ) {
    return 0;
  }

  return percentage(
    results.filter(
      (result) =>
        result.passed
    ).length,

    results.length
  );
}

function percentage(
  numerator: number,
  denominator: number
) {
  if (
    denominator === 0
  ) {
    return 0;
  }

  return Number(
    (
      (numerator /
        denominator) *
      100
    ).toFixed(1)
  );
}

function median(
  values: number[]
) {
  if (
    values.length === 0
  ) {
    return 0;
  }

  const sorted = [
    ...values,
  ].sort(
    (a, b) =>
      a - b
  );

  const middle =
    Math.floor(
      sorted.length / 2
    );

  if (
    sorted.length % 2 ===
    0
  ) {
    return (
      (sorted[
        middle - 1
      ] +
        sorted[
          middle
        ]) /
      2
    );
  }

  return sorted[
    middle
  ];
}

function getToolData(
  result: IncidentToolResult
): ToolData {
  if (
    !result.data ||
    typeof result.data !==
      "object"
  ) {
    return {};
  }

  return result.data as ToolData;
}

function getDiagnosis(
  result: IncidentToolResult
) {
  return (
    getToolData(
      result
    ).diagnosis
      ?.likely_cause ??
    ""
  );
}

function describeDiagnosis(
  result: IncidentToolResult
) {
  const diagnosis =
    getToolData(
      result
    ).diagnosis;

  if (
    diagnosis
      ?.likely_cause
  ) {
    return `${diagnosis.likely_cause}${
      diagnosis.confidence
        ? ` (${diagnosis.confidence} confidence)`
        : ""
    }`;
  }

  return result.summary;
}

function describeRollbackResult(
  result: IncidentToolResult
) {
  const data =
    getToolData(
      result
    );

  if (
    result.ok
  ) {
    const target =
      data.proposal
        ?.toVersion;

    return target
      ? `Allowed → ${target}; state=${data.state ?? "proposal created"}`
      : `Allowed → ${data.state ?? "proposal created"}`;
  }

  return `Blocked → ${
    result.error ??
    "UNKNOWN"
  }: ${result.summary}`;
}

function describeRecoveryResult(
  result: IncidentToolResult
) {
  const data =
    getToolData(
      result
    );

  return data
    .recovery_verified
    ? `Recovery verified: ${result.summary}`
    : `Recovery not verified: ${result.summary}`;
}

function formatLatency(
  value: number
) {
  if (
    value < 0.01
  ) {
    return "<0.01";
  }

  if (
    value < 1
  ) {
    return value.toFixed(
      3
    );
  }

  return value.toFixed(
    2
  );
}

function createTextReport(
  report: EvaluationReport
) {
  const lines = [
    "VoxOps Reliability & Safety Evaluation",
    "",
    `Generated: ${new Date(
      report.generatedAt
    ).toLocaleString()}`,
    "",
    `Overall checks: ${report.summary.overallAccuracy}% (${report.summary.passed}/${report.summary.total})`,
    `Diagnosis accuracy: ${report.summary.diagnosisAccuracy}%`,
    `Safety Gate enforcement: ${report.summary.authorizationEnforcement}%`,
    `Unsafe action block rate: ${report.summary.unsafeActionBlockRate}%`,
    `Recovery verification rate: ${report.summary.recoveryVerificationRate}%`,
    `Median tool latency: ${formatLatency(
      report.summary
        .medianToolLatencyMs
    )} ms`,
    "",
    "Test Results",
    "",
  ];

  report.results.forEach(
    (result) => {
      lines.push(
        `${result.id} | ${result.category} | ${
          result.passed
            ? "PASS"
            : "FAIL"
        }`
      );

      lines.push(
        `Test: ${result.name}`
      );

      lines.push(
        `Expected: ${result.expected}`
      );

      lines.push(
        `Actual: ${result.actual}`
      );

      lines.push(
        `Latency: ${formatLatency(
          result.latencyMs
        )} ms`
      );

      lines.push(
        ""
      );
    }
  );

  lines.push(
    "Scope note:"
  );

  lines.push(
    "These results measure the deterministic VoxOps incident-tool and safety-policy layer. They do not measure speech recognition, LLM tool-selection accuracy, network latency, or complete voice-agent response latency."
  );

  return lines.join(
    "\n"
  );
}

function EvaluationEmptyState({
  running,
}: {
  running: boolean;
}) {
  return (
    <div className="mt-6 flex min-h-[280px] items-center justify-center rounded-xl border border-white/5 bg-black/20 p-6">

      <div className="max-w-xl text-center">

        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${
            running
              ? "bg-violet-500/10 text-violet-300"
              : "bg-white/5 text-gray-500"
          }`}
        >
          {running
            ? "…"
            : "✓"}
        </div>

        <h3 className="mt-4 font-medium text-gray-300">
          {running
            ? "Running VoxOps evaluation"
            : "Evaluation ready"}
        </h3>

        <p className="mt-2 text-sm leading-6 text-gray-600">
          {running
            ? "Testing diagnosis, authorization, unsafe-action blocking and recovery verification."
            : "Run the deterministic evaluation suite to generate reproducible reliability and safety evidence."}
        </p>

        {!running && (
          <div className="mx-auto mt-5 grid max-w-md grid-cols-2 gap-2 text-left">

            <SmallCheck text="3 diagnosis tests" />

            <SmallCheck text="2 authorization tests" />

            <SmallCheck text="4 safety tests" />

            <SmallCheck text="2 recovery tests" />

          </div>
        )}

      </div>

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
  category: EvaluationCategory;
}) {
  const classes =
    category ===
    "Diagnosis"
      ? "bg-violet-500/10 text-violet-300"
      : category ===
        "Authorization"
      ? "bg-blue-500/10 text-blue-300"
      : category ===
        "Safety"
      ? "bg-rose-500/10 text-rose-300"
      : "bg-emerald-500/10 text-emerald-300";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-medium ${classes}`}
    >
      {category}
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

function EvaluationInterpretation({
  summary,
}: {
  summary: EvaluationSummary;
}) {
  const allPassed =
    summary.failed ===
    0;

  return (
    <div
      className={`rounded-xl border p-4 ${
        allPassed
          ? "border-emerald-500/20 bg-emerald-500/[0.04]"
          : "border-red-500/20 bg-red-500/[0.04]"
      }`}
    >

      <p
        className={`text-xs font-medium uppercase tracking-[0.16em] ${
          allPassed
            ? "text-emerald-400"
            : "text-red-400"
        }`}
      >
        Evaluation Summary
      </p>

      <h3 className="mt-2 text-lg font-semibold text-gray-200">
        {allPassed
          ? "All deterministic safety checks passed"
          : `${summary.failed} evaluation check${
              summary.failed ===
              1
                ? ""
                : "s"
            } failed`}
      </h3>

      <p className="mt-2 text-sm leading-6 text-gray-500">
        {allPassed
          ? "Across the current predefined scenarios, VoxOps correctly identifies the expected root cause, requires human authorization for supported rollbacks, blocks unsupported actions, and verifies recovered service state."
          : "Review the failed rows in the automated test matrix before using these results as hackathon evidence."}
      </p>

    </div>
  );
}

function MetadataRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-3 last:border-0 last:pb-0">

      <span className="text-xs text-gray-600">
        {label}
      </span>

      <span className="max-w-[65%] text-right text-xs text-gray-400">
        {value}
      </span>

    </div>
  );
}

function SmallCheck({
  text,
}: {
  text: string;
}) {
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2">

      <p className="text-xs text-gray-500">
        <span className="mr-2 text-emerald-500">
          ✓
        </span>

        {text}
      </p>

    </div>
  );
}