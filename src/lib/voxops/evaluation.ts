import {
  getIncidentScenario,
  healthyServices,
  type IncidentScenario,
  type ScenarioId,
  type Service,
} from "@/lib/voxops/scenarios";

import {
  runIncidentTool,
  type IncidentToolResult,
  type RecoveryProposal,
} from "@/lib/voxops/incident-tools";

export type EvaluationCategory =
  | "diagnosis"
  | "rollback-policy"
  | "safety"
  | "recovery";

export type EvaluationTestResult = {
  id: string;
  name: string;
  category: EvaluationCategory;
  scenario: string;
  passed: boolean;
  expected: string;
  actual: string;
  latencyMs: number;
};

export type EvaluationMetrics = {
  totalTests: number;
  passedTests: number;
  failedTests: number;

  overallAccuracy: number;

  diagnosisAccuracy: number;
  rollbackPolicyAccuracy: number;
  unsafeActionBlockRate: number;
  recoveryVerificationAccuracy: number;

  averageToolLatencyMs: number;
  p95ToolLatencyMs: number;
};

export type EvaluationReport = {
  generatedAt: string;
  tests: EvaluationTestResult[];
  metrics: EvaluationMetrics;
};

function now() {
  if (
    typeof performance !== "undefined" &&
    typeof performance.now === "function"
  ) {
    return performance.now();
  }

  return Date.now();
}

function round(
  value: number,
  digits = 2
) {
  const factor =
    10 ** digits;

  return (
    Math.round(
      value * factor
    ) / factor
  );
}

function percentage(
  passed: number,
  total: number
) {
  if (total === 0) {
    return 0;
  }

  return round(
    (passed / total) * 100,
    1
  );
}

function cloneServices(
  services: Service[]
) {
  return services.map(
    (service) => ({
      ...service,
    })
  );
}

function createIncidentContext(
  scenario: IncidentScenario
) {
  return {
    services:
      cloneServices(
        scenario.failureServices
      ),

    incident: {
      ...scenario.incident,

      startedAt:
        new Date().toISOString(),

      evidence: [
        ...scenario.incident
          .evidence,
      ],
    },
  };
}

function getDiagnosis(
  result: IncidentToolResult
) {
  const data =
    result.data as
      | {
          diagnosis?: {
            likely_cause?: string;
            confidence?: string;
            recommended_action?: string;
          };
        }
      | undefined;

  return data?.diagnosis;
}

function getProposal(
  result: IncidentToolResult
) {
  const data =
    result.data as
      | {
          proposal?: RecoveryProposal;
        }
      | undefined;

  return data?.proposal;
}

function getRecoveryVerified(
  result: IncidentToolResult
) {
  const data =
    result.data as
      | {
          recovery_verified?: boolean;
        }
      | undefined;

  return (
    data?.recovery_verified ===
    true
  );
}

function getSafetyBlocked(
  result: IncidentToolResult
) {
  const data =
    result.data as
      | {
          safety_blocked?: boolean;
        }
      | undefined;

  return (
    data?.safety_blocked ===
    true
  );
}

function runTimedTool(
  name: string,
  args: Record<
    string,
    unknown
  >,
  context: {
    services: Service[];
    incident:
      | IncidentScenario["incident"]
      | null;
  }
) {
  const start =
    now();

  const result =
    runIncidentTool(
      name,
      args,
      context
    );

  const end =
    now();

  return {
    result,

    latencyMs:
      round(
        Math.max(
          0,
          end - start
        ),
        3
      ),
  };
}

function findAlternativeService(
  scenario: IncidentScenario
) {
  return (
    scenario.failureServices.find(
      (service) =>
        service.id !==
        scenario.affectedServiceId
    ) ??
    scenario.failureServices[0]
  );
}

function buildTest(
  id: string,
  name: string,
  category: EvaluationCategory,
  scenario: string,
  expected: string,
  actual: string,
  passed: boolean,
  latencyMs: number
): EvaluationTestResult {
  return {
    id,
    name,
    category,
    scenario,
    expected,
    actual,
    passed,
    latencyMs,
  };
}

function diagnosisTest(
  id: string,
  scenarioId: ScenarioId
) {
  const scenario =
    getIncidentScenario(
      scenarioId
    );

  const context =
    createIncidentContext(
      scenario
    );

  const affected =
    context.services.find(
      (service) =>
        service.id ===
        scenario.affectedServiceId
    );

  if (!affected) {
    return buildTest(
      id,
      `${scenario.name}: diagnosis`,
      "diagnosis",
      scenario.name,
      scenario.investigation
        .diagnosis.likely_cause,
      "Affected service missing",
      false,
      0
    );
  }

  const {
    result,
    latencyMs,
  } =
    runTimedTool(
      "investigate_incident",
      {
        service:
          affected.name,
      },
      context
    );

  const diagnosis =
    getDiagnosis(
      result
    );

  const actual =
    diagnosis?.likely_cause ??
    "No diagnosis returned";

  const expected =
    scenario.investigation
      .diagnosis.likely_cause;

  return buildTest(
    id,
    `${scenario.name}: diagnosis`,
    "diagnosis",
    scenario.name,
    expected,
    actual,
    result.ok &&
      actual === expected,
    latencyMs
  );
}

function validRollbackTest(
  id: string,
  scenarioId: ScenarioId
) {
  const scenario =
    getIncidentScenario(
      scenarioId
    );

  const policy =
    scenario.rollbackPolicy;

  if (!policy) {
    return buildTest(
      id,
      `${scenario.name}: valid rollback`,
      "rollback-policy",
      scenario.name,
      "Validated rollback policy",
      "Scenario has no rollback policy",
      false,
      0
    );
  }

  const context =
    createIncidentContext(
      scenario
    );

  const service =
    context.services.find(
      (candidate) =>
        candidate.id ===
        policy.serviceId
    );

  if (!service) {
    return buildTest(
      id,
      `${scenario.name}: valid rollback`,
      "rollback-policy",
      scenario.name,
      `Rollback to ${policy.targetVersion}`,
      "Service missing",
      false,
      0
    );
  }

  const {
    result,
    latencyMs,
  } =
    runTimedTool(
      "request_rollback",
      {
        service:
          service.name,

        target_version:
          policy.targetVersion,
      },
      context
    );

  const proposal =
    getProposal(
      result
    );

  const passed =
    result.ok &&
    proposal?.serviceId ===
      policy.serviceId &&
    proposal?.toVersion ===
      policy.targetVersion;

  const actual =
    result.ok &&
    proposal
      ? `Allowed: ${proposal.fromVersion} → ${proposal.toVersion}`
      : `Blocked: ${
          result.error ??
          "unknown error"
        }`;

  return buildTest(
    id,
    `${scenario.name}: valid rollback`,
    "rollback-policy",
    scenario.name,
    `Allowed rollback to ${policy.targetVersion}`,
    actual,
    Boolean(passed),
    latencyMs
  );
}

function invalidTargetTest(
  id: string,
  scenarioId: ScenarioId,
  invalidVersion: string
) {
  const scenario =
    getIncidentScenario(
      scenarioId
    );

  const policy =
    scenario.rollbackPolicy;

  if (!policy) {
    return buildTest(
      id,
      `${scenario.name}: invalid target`,
      "safety",
      scenario.name,
      "Rollback blocked",
      "Scenario has no rollback policy",
      false,
      0
    );
  }

  const context =
    createIncidentContext(
      scenario
    );

  const service =
    context.services.find(
      (candidate) =>
        candidate.id ===
        policy.serviceId
    );

  if (!service) {
    return buildTest(
      id,
      `${scenario.name}: invalid target`,
      "safety",
      scenario.name,
      "Rollback blocked",
      "Service missing",
      false,
      0
    );
  }

  const {
    result,
    latencyMs,
  } =
    runTimedTool(
      "request_rollback",
      {
        service:
          service.name,

        target_version:
          invalidVersion,
      },
      context
    );

  const passed =
    !result.ok &&
    result.error ===
      "INVALID_TARGET_VERSION" &&
    getSafetyBlocked(
      result
    );

  return buildTest(
    id,
    `${scenario.name}: invalid target blocked`,
    "safety",
    scenario.name,
    `Block ${invalidVersion}`,
    result.ok
      ? "Rollback incorrectly allowed"
      : `Blocked: ${
          result.error ??
          "unknown error"
        }`,
    passed,
    latencyMs
  );
}

function wrongServiceRollbackTest(
  id: string,
  scenarioId: ScenarioId
) {
  const scenario =
    getIncidentScenario(
      scenarioId
    );

  if (
    !scenario.rollbackPolicy
  ) {
    return buildTest(
      id,
      `${scenario.name}: wrong service`,
      "safety",
      scenario.name,
      "Rollback blocked",
      "Scenario has no rollback policy",
      false,
      0
    );
  }

  const context =
    createIncidentContext(
      scenario
    );

  const wrongService =
    findAlternativeService(
      scenario
    );

  const {
    result,
    latencyMs,
  } =
    runTimedTool(
      "request_rollback",
      {
        service:
          wrongService.name,

        target_version:
          scenario.rollbackPolicy
            .targetVersion,
      },
      context
    );

  const passed =
    !result.ok &&
    result.error ===
      "ROLLBACK_NOT_VALIDATED" &&
    getSafetyBlocked(
      result
    );

  return buildTest(
    id,
    `${scenario.name}: unrelated service rollback blocked`,
    "safety",
    scenario.name,
    `Block rollback of ${wrongService.name}`,
    result.ok
      ? "Rollback incorrectly allowed"
      : `Blocked: ${
          result.error ??
          "unknown error"
        }`,
    passed,
    latencyMs
  );
}

function unsupportedRollbackTest(
  id: string,
  scenarioId: ScenarioId,
  targetVersion: string
) {
  const scenario =
    getIncidentScenario(
      scenarioId
    );

  const context =
    createIncidentContext(
      scenario
    );

  const affected =
    context.services.find(
      (service) =>
        service.id ===
        scenario.affectedServiceId
    );

  if (!affected) {
    return buildTest(
      id,
      `${scenario.name}: unsupported rollback`,
      "safety",
      scenario.name,
      "Rollback blocked",
      "Affected service missing",
      false,
      0
    );
  }

  const {
    result,
    latencyMs,
  } =
    runTimedTool(
      "request_rollback",
      {
        service:
          affected.name,

        target_version:
          targetVersion,
      },
      context
    );

  const passed =
    !result.ok &&
    result.error ===
      "ROLLBACK_NOT_VALIDATED" &&
    getSafetyBlocked(
      result
    );

  return buildTest(
    id,
    `${scenario.name}: unsupported rollback blocked`,
    "safety",
    scenario.name,
    "Rollback blocked by evidence policy",
    result.ok
      ? "Rollback incorrectly allowed"
      : `Blocked: ${
          result.error ??
          "unknown error"
        }`,
    passed,
    latencyMs
  );
}

function noIncidentRollbackTest(
  id: string
) {
  const service =
    healthyServices[0];

  const {
    result,
    latencyMs,
  } =
    runTimedTool(
      "request_rollback",
      {
        service:
          service.name,

        target_version:
          "v0.0",
      },
      {
        services:
          cloneServices(
            healthyServices
          ),

        incident:
          null,
      }
    );

  const passed =
    !result.ok &&
    result.error ===
      "NO_ACTIVE_INCIDENT" &&
    getSafetyBlocked(
      result
    );

  return buildTest(
    id,
    "No active incident: rollback blocked",
    "safety",
    "No incident",
    "Rollback blocked",
    result.ok
      ? "Rollback incorrectly allowed"
      : `Blocked: ${
          result.error ??
          "unknown error"
        }`,
    passed,
    latencyMs
  );
}

function preRecoveryVerificationTest(
  id: string,
  scenarioId: ScenarioId
) {
  const scenario =
    getIncidentScenario(
      scenarioId
    );

  const context =
    createIncidentContext(
      scenario
    );

  const affected =
    context.services.find(
      (service) =>
        service.id ===
        scenario.affectedServiceId
    );

  if (!affected) {
    return buildTest(
      id,
      `${scenario.name}: pre-recovery verification`,
      "recovery",
      scenario.name,
      "Recovery not verified",
      "Affected service missing",
      false,
      0
    );
  }

  const {
    result,
    latencyMs,
  } =
    runTimedTool(
      "verify_recovery",
      {
        service:
          affected.name,
      },
      context
    );

  const data =
    result.data as
      | {
          recovery_verified?: boolean;
        }
      | undefined;

  const verified =
    data?.recovery_verified;

  return buildTest(
    id,
    `${scenario.name}: unhealthy service not falsely verified`,
    "recovery",
    scenario.name,
    "recovery_verified = false",
    `recovery_verified = ${
      String(
        verified
      )
    }`,
    result.ok &&
      verified === false,
    latencyMs
  );
}

function recoveredVerificationTest(
  id: string,
  scenarioId: ScenarioId
) {
  const scenario =
    getIncidentScenario(
      scenarioId
    );

  const recovered =
    scenario.recoveredServices;

  if (!recovered) {
    return buildTest(
      id,
      `${scenario.name}: recovered verification`,
      "recovery",
      scenario.name,
      "Recovery verified",
      "No recovered state defined",
      false,
      0
    );
  }

  const service =
    recovered.find(
      (candidate) =>
        candidate.id ===
        scenario.affectedServiceId
    );

  if (!service) {
    return buildTest(
      id,
      `${scenario.name}: recovered verification`,
      "recovery",
      scenario.name,
      "Recovery verified",
      "Recovered service missing",
      false,
      0
    );
  }

  const {
    result,
    latencyMs,
  } =
    runTimedTool(
      "verify_recovery",
      {
        service:
          service.name,
      },
      {
        services:
          cloneServices(
            recovered
          ),

        incident:
          null,
      }
    );

  const passed =
    result.ok &&
    getRecoveryVerified(
      result
    );

  return buildTest(
    id,
    `${scenario.name}: recovered service verified`,
    "recovery",
    scenario.name,
    "recovery_verified = true",
    `recovery_verified = ${
      String(
        getRecoveryVerified(
          result
        )
      )
    }`,
    passed,
    latencyMs
  );
}

function categoryAccuracy(
  tests: EvaluationTestResult[],
  category: EvaluationCategory
) {
  const subset =
    tests.filter(
      (test) =>
        test.category ===
        category
    );

  const passed =
    subset.filter(
      (test) =>
        test.passed
    ).length;

  return percentage(
    passed,
    subset.length
  );
}

function computeP95(
  values: number[]
) {
  if (
    values.length === 0
  ) {
    return 0;
  }

  const sorted =
    [...values].sort(
      (a, b) =>
        a - b
    );

  const index =
    Math.min(
      sorted.length - 1,
      Math.ceil(
        sorted.length * 0.95
      ) - 1
    );

  return round(
    sorted[index],
    3
  );
}

export function runEvaluationSuite(): EvaluationReport {
  const tests: EvaluationTestResult[] =
    [
      diagnosisTest(
        "E01",
        "checkout-regression"
      ),

      validRollbackTest(
        "E02",
        "checkout-regression"
      ),

      invalidTargetTest(
        "E03",
        "checkout-regression",
        "v2.12"
      ),

      wrongServiceRollbackTest(
        "E04",
        "checkout-regression"
      ),

      diagnosisTest(
        "E05",
        "auth-regression"
      ),

      validRollbackTest(
        "E06",
        "auth-regression"
      ),

      invalidTargetTest(
        "E07",
        "auth-regression",
        "v1.19"
      ),

      diagnosisTest(
        "E08",
        "payment-provider"
      ),

      unsupportedRollbackTest(
        "E09",
        "payment-provider",
        "v3.7"
      ),

      noIncidentRollbackTest(
        "E10"
      ),

      preRecoveryVerificationTest(
        "E11",
        "checkout-regression"
      ),

      recoveredVerificationTest(
        "E12",
        "checkout-regression"
      ),

      preRecoveryVerificationTest(
        "E13",
        "auth-regression"
      ),

      recoveredVerificationTest(
        "E14",
        "auth-regression"
      ),
    ];

  const passedTests =
    tests.filter(
      (test) =>
        test.passed
    ).length;

  const failedTests =
    tests.length -
    passedTests;

  const latencies =
    tests.map(
      (test) =>
        test.latencyMs
    );

  const averageLatency =
    latencies.length > 0
      ? latencies.reduce(
          (
            total,
            current
          ) =>
            total +
            current,
          0
        ) /
        latencies.length
      : 0;

  return {
    generatedAt:
      new Date().toISOString(),

    tests,

    metrics: {
      totalTests:
        tests.length,

      passedTests,

      failedTests,

      overallAccuracy:
        percentage(
          passedTests,
          tests.length
        ),

      diagnosisAccuracy:
        categoryAccuracy(
          tests,
          "diagnosis"
        ),

      rollbackPolicyAccuracy:
        categoryAccuracy(
          tests,
          "rollback-policy"
        ),

      unsafeActionBlockRate:
        categoryAccuracy(
          tests,
          "safety"
        ),

      recoveryVerificationAccuracy:
        categoryAccuracy(
          tests,
          "recovery"
        ),

      averageToolLatencyMs:
        round(
          averageLatency,
          3
        ),

      p95ToolLatencyMs:
        computeP95(
          latencies
        ),
    },
  };
}