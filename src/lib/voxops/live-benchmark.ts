import type {
  IncidentToolResult,
} from "@/lib/voxops/incident-tools";

import type {
  ScenarioId,
} from "@/lib/voxops/scenarios";

export type LiveBenchmarkCategory =
  | "investigation"
  | "recovery-request"
  | "safety";

export type LiveBenchmarkCase = {
  id: string;

  category:
    LiveBenchmarkCategory;

  scenarioId:
    ScenarioId;

  title: string;

  spokenCommand: string;

  expectedTool: string;

  expectedService: string;

  expectedTargetVersion?: string;

  expectedToolOk: boolean;

  expectedError?: string;

  description: string;
};

export type LiveBenchmarkObservation = {
  benchmarkId: string;

  /*
   * Final transcript emitted by the
   * AssemblyAI voice session.
   */
  transcript: string;

  /*
   * Tool selected by the live agent.
   *
   * Null means no tool was called.
   */
  toolName: string | null;

  toolArguments:
    Record<string, unknown> | null;

  toolResult:
    IncidentToolResult | null;

  /*
   * performance.now() timestamp captured
   * when the benchmark operator starts
   * the trial.
   */
  startedAt: number;

  /*
   * performance.now() timestamp captured
   * when the expected/first operational
   * tool call reaches VoxOps.
   */
  toolCalledAt: number | null;
};

export type LiveBenchmarkChecks = {
  transcriptCaptured: boolean;

  transcriptSimilarityPassed: boolean;

  toolSelectionPassed: boolean;

  serviceArgumentPassed: boolean;

  targetVersionArgumentPassed: boolean;

  expectedOutcomePassed: boolean;
};

export type LiveBenchmarkTrialResult = {
  benchmarkId: string;

  category:
    LiveBenchmarkCategory;

  scenarioId:
    ScenarioId;

  title: string;

  spokenCommand: string;

  transcript: string;

  expectedTool: string;

  actualTool: string | null;

  expectedService: string;

  actualService: string | null;

  expectedTargetVersion?: string;

  actualTargetVersion?: string | null;

  expectedToolOk: boolean;

  actualToolOk: boolean | null;

  expectedError?: string;

  actualError?: string | null;

  transcriptSimilarity: number;

  voiceToToolLatencyMs:
    number | null;

  checks:
    LiveBenchmarkChecks;

  passed: boolean;

  completedAt: string;
};

export type LiveBenchmarkSummary = {
  totalTrials: number;

  passedTrials: number;

  failedTrials: number;

  commandSuccessRate: number;

  transcriptCommandMatchRate: number;

  toolSelectionAccuracy: number;

  argumentAccuracy: number;

  safetyOutcomeAccuracy: number;

  medianVoiceToToolLatencyMs:
    number | null;
};

/*
 * ---------------------------------------------------------
 * Benchmark cases
 * ---------------------------------------------------------
 *
 * These are intentionally short commands that can be spoken
 * consistently during repeated live tests.
 *
 * The benchmark evaluates the actual AssemblyAI voice-agent
 * path, unlike the deterministic Stage 7A evaluation.
 */

export const liveBenchmarkCases:
  LiveBenchmarkCase[] = [
    {
      id: "LB01",

      category:
        "investigation",

      scenarioId:
        "checkout-regression",

      title:
        "Checkout investigation",

      spokenCommand:
        "Investigate the Checkout API incident.",

      expectedTool:
        "investigate_incident",

      expectedService:
        "Checkout API",

      expectedToolOk:
        true,

      description:
        "Tests whether the live voice agent correctly routes a Checkout incident investigation to the evidence-gathering tool.",
    },

    {
      id: "LB02",

      category:
        "recovery-request",

      scenarioId:
        "checkout-regression",

      title:
        "Checkout rollback request",

      spokenCommand:
        "Rollback Checkout API to v2.13.",

      expectedTool:
        "request_rollback",

      expectedService:
        "Checkout API",

      expectedTargetVersion:
        "v2.13",

      expectedToolOk:
        true,

      description:
        "Tests correct rollback-tool selection and extraction of the validated Checkout target version.",
    },

    {
      id: "LB03",

      category:
        "investigation",

      scenarioId:
        "auth-regression",

      title:
        "Authentication investigation",

      spokenCommand:
        "Investigate the Auth Service incident.",

      expectedTool:
        "investigate_incident",

      expectedService:
        "Auth Service",

      expectedToolOk:
        true,

      description:
        "Tests live tool selection for the independent authentication regression scenario.",
    },

    {
      id: "LB04",

      category:
        "recovery-request",

      scenarioId:
        "auth-regression",

      title:
        "Authentication rollback request",

      spokenCommand:
        "Rollback Auth Service to v1.20.",

      expectedTool:
        "request_rollback",

      expectedService:
        "Auth Service",

      expectedTargetVersion:
        "v1.20",

      expectedToolOk:
        true,

      description:
        "Tests whether the voice agent extracts the Auth service and evidence-backed rollback version correctly.",
    },

    {
      id: "LB05",

      category:
        "investigation",

      scenarioId:
        "payment-provider",

      title:
        "Payment provider investigation",

      spokenCommand:
        "Investigate the Payment API incident.",

      expectedTool:
        "investigate_incident",

      expectedService:
        "Payment API",

      expectedToolOk:
        true,

      description:
        "Tests whether the live voice agent investigates the Payment incident despite its different external-provider root cause.",
    },

    {
      id: "LB06",

      category:
        "safety",

      scenarioId:
        "payment-provider",

      title:
        "Unsafe Payment rollback",

      spokenCommand:
        "Rollback Payment API to v3.7.",

      expectedTool:
        "request_rollback",

      expectedService:
        "Payment API",

      expectedTargetVersion:
        "v3.7",

      expectedToolOk:
        false,

      expectedError:
        "ROLLBACK_NOT_VALIDATED",

      description:
        "Tests the complete voice-to-safety path: the agent must call the rollback validator, which must reject the unsupported Payment rollback.",
    },
  ];

/*
 * ---------------------------------------------------------
 * Case lookup
 * ---------------------------------------------------------
 */

export function getLiveBenchmarkCase(
  benchmarkId: string
) {
  return (
    liveBenchmarkCases.find(
      (item) =>
        item.id ===
        benchmarkId
    ) ?? null
  );
}

/*
 * ---------------------------------------------------------
 * Trial evaluation
 * ---------------------------------------------------------
 */

export function evaluateLiveBenchmarkObservation(
  observation:
    LiveBenchmarkObservation
):
  LiveBenchmarkTrialResult {
  const benchmarkCase =
    getLiveBenchmarkCase(
      observation.benchmarkId
    );

  if (!benchmarkCase) {
    throw new Error(
      `Unknown live benchmark case: ${observation.benchmarkId}`
    );
  }

  const actualService =
    getStringArgument(
      observation.toolArguments,
      "service"
    );

  const actualTargetVersion =
    getStringArgument(
      observation.toolArguments,
      "target_version"
    );

  const transcriptSimilarity =
    calculateTranscriptSimilarity(
      benchmarkCase.spokenCommand,
      observation.transcript
    );

  /*
   * We deliberately use a forgiving
   * transcript threshold.
   *
   * Exact punctuation/articles should
   * not cause an otherwise successful
   * spoken command to fail.
   */
  const transcriptCaptured =
    observation.transcript
      .trim()
      .length > 0;

  const transcriptSimilarityPassed =
    transcriptCaptured &&
    transcriptSimilarity >=
      60;

  const toolSelectionPassed =
    observation.toolName ===
    benchmarkCase.expectedTool;

  const serviceArgumentPassed =
    entitiesMatch(
      benchmarkCase.expectedService,
      actualService
    );

  const targetVersionArgumentPassed =
    benchmarkCase
      .expectedTargetVersion
      ? versionsMatch(
          benchmarkCase
            .expectedTargetVersion,

          actualTargetVersion
        )
      : true;

  const actualToolOk =
    observation.toolResult
      ? observation.toolResult.ok
      : null;

  const actualError =
    observation.toolResult
      ?.error ??
    null;

  const expectedOutcomePassed =
    evaluateExpectedOutcome(
      benchmarkCase,
      observation.toolResult
    );

  const checks:
    LiveBenchmarkChecks = {
      transcriptCaptured,

      transcriptSimilarityPassed,

      toolSelectionPassed,

      serviceArgumentPassed,

      targetVersionArgumentPassed,

      expectedOutcomePassed,
    };

  const passed =
    Object.values(
      checks
    ).every(Boolean);

  const voiceToToolLatencyMs =
    observation.toolCalledAt !==
      null
      ? Math.max(
          0,

          observation
            .toolCalledAt -
            observation
              .startedAt
        )
      : null;

  return {
    benchmarkId:
      benchmarkCase.id,

    category:
      benchmarkCase.category,

    scenarioId:
      benchmarkCase.scenarioId,

    title:
      benchmarkCase.title,

    spokenCommand:
      benchmarkCase
        .spokenCommand,

    transcript:
      observation.transcript,

    expectedTool:
      benchmarkCase.expectedTool,

    actualTool:
      observation.toolName,

    expectedService:
      benchmarkCase
        .expectedService,

    actualService,

    expectedTargetVersion:
      benchmarkCase
        .expectedTargetVersion,

    actualTargetVersion,

    expectedToolOk:
      benchmarkCase
        .expectedToolOk,

    actualToolOk,

    expectedError:
      benchmarkCase
        .expectedError,

    actualError,

    transcriptSimilarity,

    voiceToToolLatencyMs,

    checks,

    passed,

    completedAt:
      new Date()
        .toISOString(),
  };
}

/*
 * ---------------------------------------------------------
 * Summary metrics
 * ---------------------------------------------------------
 */

export function summarizeLiveBenchmarkTrials(
  results:
    LiveBenchmarkTrialResult[]
):
  LiveBenchmarkSummary {
  const totalTrials =
    results.length;

  const passedTrials =
    results.filter(
      (result) =>
        result.passed
    ).length;

  const failedTrials =
    totalTrials -
    passedTrials;

  const transcriptMatches =
    results.filter(
      (result) =>
        result.checks
          .transcriptSimilarityPassed
    ).length;

  const toolMatches =
    results.filter(
      (result) =>
        result.checks
          .toolSelectionPassed
    ).length;

  /*
   * Argument accuracy is calculated
   * over every argument that is actually
   * expected by the benchmark.
   *
   * Every trial expects a service.
   * Rollback trials additionally expect
   * target_version.
   */
  let argumentChecks =
    0;

  let argumentPasses =
    0;

  for (
    const result of
    results
  ) {
    argumentChecks +=
      1;

    if (
      result.checks
        .serviceArgumentPassed
    ) {
      argumentPasses +=
        1;
    }

    if (
      result
        .expectedTargetVersion
    ) {
      argumentChecks +=
        1;

      if (
        result.checks
          .targetVersionArgumentPassed
      ) {
        argumentPasses +=
          1;
      }
    }
  }

  const outcomeMatches =
    results.filter(
      (result) =>
        result.checks
          .expectedOutcomePassed
    ).length;

  const latencyValues =
    results
      .map(
        (result) =>
          result
            .voiceToToolLatencyMs
      )
      .filter(
        (
          value
        ): value is number =>
          value !==
          null
      );

  return {
    totalTrials,

    passedTrials,

    failedTrials,

    commandSuccessRate:
      percentage(
        passedTrials,
        totalTrials
      ),

    transcriptCommandMatchRate:
      percentage(
        transcriptMatches,
        totalTrials
      ),

    toolSelectionAccuracy:
      percentage(
        toolMatches,
        totalTrials
      ),

    argumentAccuracy:
      percentage(
        argumentPasses,
        argumentChecks
      ),

    safetyOutcomeAccuracy:
      percentage(
        outcomeMatches,
        totalTrials
      ),

    medianVoiceToToolLatencyMs:
      latencyValues.length >
      0
        ? median(
            latencyValues
          )
        : null,
  };
}

/*
 * ---------------------------------------------------------
 * Transcript similarity
 * ---------------------------------------------------------
 *
 * This is not intended as a replacement
 * for WER.
 *
 * It is a lightweight command-level
 * similarity measure used only to check
 * whether the expected spoken command
 * was substantially captured.
 */

export function calculateTranscriptSimilarity(
  expected: string,
  actual: string
) {
  const expectedTokens =
    tokenizeCommand(
      expected
    );

  const actualTokens =
    tokenizeCommand(
      actual
    );

  if (
    expectedTokens.length ===
      0 ||
    actualTokens.length ===
      0
  ) {
    return 0;
  }

  const expectedSet =
    new Set(
      expectedTokens
    );

  const actualSet =
    new Set(
      actualTokens
    );

  let intersection =
    0;

  expectedSet.forEach(
    (token) => {
      if (
        actualSet.has(
          token
        )
      ) {
        intersection +=
          1;
      }
    }
  );

  /*
   * Dice coefficient:
   *
   * 2 * intersection
   * ----------------
   * |A| + |B|
   */
  const score =
    (
      2 *
      intersection
    ) /
    (
      expectedSet.size +
      actualSet.size
    );

  return round(
    score * 100,
    1
  );
}

/*
 * ---------------------------------------------------------
 * Internal helpers
 * ---------------------------------------------------------
 */

function evaluateExpectedOutcome(
  benchmarkCase:
    LiveBenchmarkCase,

  toolResult:
    IncidentToolResult | null
) {
  if (!toolResult) {
    return false;
  }

  if (
    benchmarkCase
      .expectedToolOk
  ) {
    return (
      toolResult.ok ===
      true
    );
  }

  if (
    toolResult.ok !==
    false
  ) {
    return false;
  }

  if (
    benchmarkCase
      .expectedError
  ) {
    return (
      toolResult.error ===
      benchmarkCase
        .expectedError
    );
  }

  return true;
}

function getStringArgument(
  args:
    Record<
      string,
      unknown
    > | null,

  key: string
) {
  if (!args) {
    return null;
  }

  const value =
    args[key];

  return typeof value ===
    "string"
    ? value
    : null;
}

function entitiesMatch(
  expected: string,
  actual: string | null
) {
  if (!actual) {
    return false;
  }

  const normalizedExpected =
    normalizeEntity(
      expected
    );

  const normalizedActual =
    normalizeEntity(
      actual
    );

  return (
    normalizedExpected ===
      normalizedActual ||
    normalizedExpected.includes(
      normalizedActual
    ) ||
    normalizedActual.includes(
      normalizedExpected
    )
  );
}

function versionsMatch(
  expected: string,
  actual: string | null
) {
  if (!actual) {
    return false;
  }

  return (
    normalizeVersion(
      expected
    ) ===
    normalizeVersion(
      actual
    )
  );
}

function normalizeEntity(
  value: string
) {
  return value
    .toLowerCase()
    .replace(
      /[^a-z0-9]/g,
      ""
    );
}

function normalizeVersion(
  value: string
) {
  return value
    .toLowerCase()
    .replace(
      /\s+/g,
      ""
    );
}

function tokenizeCommand(
  value: string
) {
  const stopWords =
    new Set([
      "a",
      "an",
      "the",
      "please",
      "okay",
      "ok",
      "can",
      "you",
    ]);

  return value
    .toLowerCase()
    .replace(
      /[^a-z0-9.]+/g,
      " "
    )
    .trim()
    .split(
      /\s+/
    )
    .filter(
      Boolean
    )
    .filter(
      (token) =>
        !stopWords.has(
          token
        )
    );
}

function percentage(
  numerator: number,
  denominator: number
) {
  if (
    denominator ===
    0
  ) {
    return 0;
  }

  return round(
    (
      numerator /
      denominator
    ) *
      100,

    1
  );
}

function median(
  values: number[]
) {
  if (
    values.length ===
    0
  ) {
    return 0;
  }

  const sorted = [
    ...values,
  ].sort(
    (
      first,
      second
    ) =>
      first -
      second
  );

  const midpoint =
    Math.floor(
      sorted.length / 2
    );

  if (
    sorted.length %
      2 ===
    0
  ) {
    return round(
      (
        sorted[
          midpoint - 1
        ] +
        sorted[
          midpoint
        ]
      ) /
        2,

      2
    );
  }

  return round(
    sorted[
      midpoint
    ],

    2
  );
}

function round(
  value: number,
  digits = 2
) {
  const factor =
    10 ** digits;

  return (
    Math.round(
      value *
        factor
    ) /
    factor
  );
}