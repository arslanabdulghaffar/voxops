import {
  incidentScenarios,
  type Incident,
  type IncidentScenario,
  type Service,
} from "@/lib/voxops/scenarios";

export type IncidentToolContext = {
  services: Service[];
  incident: Incident | null;
};

export type IncidentToolResult = {
  ok: boolean;
  summary: string;
  data?: unknown;
  error?: string;
};

export type RecoveryProposal = {
  action: "rollback";
  service: string;
  serviceId: string;
  fromVersion: string;
  toVersion: string;
  reason: string;
  evidence: string[];
};

export const incidentToolDefinitions = [
  {
    type: "function",
    name: "investigate_incident",

    description:
      "MANDATORY first tool whenever the engineer asks to investigate, diagnose, analyze, explain, or determine what is happening in an incident. It gathers metrics, logs, deployment history, dependency health, and an evidence-based diagnosis.",

    parameters: {
      type: "object",

      properties: {
        service: {
          type: "string",
          description:
            "Affected production service explicitly mentioned by the engineer.",
        },
      },

      required: ["service"],
    },
  },

  {
    type: "function",
    name: "request_rollback",

    description:
      "MANDATORY tool whenever the engineer asks to rollback a service. The tool validates whether evidence supports rollback. It NEVER executes the rollback. A validated proposal must still pass the human Safety Gate.",

    parameters: {
      type: "object",

      properties: {
        service: {
          type: "string",
          description:
            "Production service requested for rollback.",
        },

        target_version: {
          type: "string",
          description:
            "Requested rollback target version.",
        },
      },

      required: [
        "service",
        "target_version",
      ],
    },
  },

  {
    type: "function",
    name: "get_service_metrics",

    description:
      "Get current health, latency, error rate, version, and status for one service.",

    parameters: {
      type: "object",

      properties: {
        service: {
          type: "string",
          description:
            "Production service name.",
        },
      },

      required: ["service"],
    },
  },

  {
    type: "function",
    name: "query_service_logs",

    description:
      "Inspect recent logs for one production service.",

    parameters: {
      type: "object",

      properties: {
        service: {
          type: "string",
          description:
            "Production service name.",
        },
      },

      required: ["service"],
    },
  },

  {
    type: "function",
    name: "get_recent_deployments",

    description:
      "Inspect recent deployment history for one production service.",

    parameters: {
      type: "object",

      properties: {
        service: {
          type: "string",
          description:
            "Production service name.",
        },
      },

      required: ["service"],
    },
  },

  {
    type: "function",
    name: "get_dependency_health",

    description:
      "Inspect dependency and upstream-service health surrounding one production service.",

    parameters: {
      type: "object",

      properties: {
        service: {
          type: "string",
          description:
            "Production service name.",
        },
      },

      required: ["service"],
    },
  },

  {
    type: "function",
    name: "verify_recovery",

    description:
      "MANDATORY tool whenever the engineer asks whether a recovery or rollback succeeded. It checks the current service health, error rate, latency, and version.",

    parameters: {
      type: "object",

      properties: {
        service: {
          type: "string",
          description:
            "Production service whose recovery should be verified.",
        },
      },

      required: ["service"],
    },
  },
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function findService(
  requestedService: string,
  services: Service[]
) {
  const requested =
    normalize(requestedService);

  return services.find(
    (service) => {
      const id =
        normalize(service.id);

      const name =
        normalize(service.name);

      return (
        requested === id ||
        requested === name ||
        requested.includes(id) ||
        name.includes(requested) ||
        id.includes(requested)
      );
    }
  );
}

function findScenario(
  incident: Incident | null
): IncidentScenario | null {
  if (!incident) {
    return null;
  }

  return (
    incidentScenarios.find(
      (scenario) =>
        scenario.incident.id ===
        incident.id
    ) ?? null
  );
}

function serviceNotFound(
  serviceName: string
): IncidentToolResult {
  return {
    ok: false,

    summary:
      `Service "${serviceName}" was not found.`,

    error:
      "SERVICE_NOT_FOUND",
  };
}

function getMetrics(
  service: Service
): IncidentToolResult {
  return {
    ok: true,

    summary:
      `${service.name} is ${service.status}. ` +
      `Error rate ${service.errorRate}%, ` +
      `latency ${service.latency} ms, ` +
      `version ${service.version}.`,

    data: {
      service:
        service.name,

      status:
        service.status,

      version:
        service.version,

      latency_ms:
        service.latency,

      error_rate_percent:
        service.errorRate,
    },
  };
}

function getLogs(
  service: Service,
  scenario: IncidentScenario | null
): IncidentToolResult {
  if (
    scenario &&
    service.id ===
      scenario.affectedServiceId
  ) {
    return {
      ok: true,

      summary:
        scenario.investigation.logs.summary,

      data: {
        service:
          service.name,

        logs:
          scenario.investigation.logs.entries,

        observation:
          scenario.investigation.logs
            .observation,
      },
    };
  }

  return {
    ok: true,

    summary:
      `${service.name} has no significant incident-correlated errors.`,

    data: {
      service:
        service.name,

      logs: [
        {
          level: "INFO",

          message:
            "Requests processing normally",
        },
      ],
    },
  };
}

function getDeployments(
  service: Service,
  scenario: IncidentScenario | null
): IncidentToolResult {
  if (
    scenario &&
    service.id ===
      scenario.affectedServiceId
  ) {
    return {
      ok: true,

      summary:
        scenario.investigation
          .deployments.summary,

      data: {
        service:
          service.name,

        deployments:
          scenario.investigation
            .deployments.entries,
      },
    };
  }

  return {
    ok: true,

    summary:
      `${service.name} has no deployment correlated with the current incident.`,

    data: {
      service:
        service.name,

      deployments: [
        {
          version:
            service.version,

          state:
            "current",

          incident_correlation:
            false,
        },
      ],
    },
  };
}

function getDependencies(
  service: Service,
  services: Service[],
  scenario: IncidentScenario | null
): IncidentToolResult {
  if (
    scenario &&
    service.id ===
      scenario.affectedServiceId
  ) {
    return {
      ok: true,

      summary:
        scenario.investigation
          .dependencies.summary,

      data: {
        investigated_service:
          service.name,

        dependencies:
          scenario.investigation
            .dependencies.entries,
      },
    };
  }

  const dependencies =
    services
      .filter(
        (candidate) =>
          candidate.id !==
          service.id
      )
      .map(
        (candidate) => ({
          service:
            candidate.name,

          status:
            candidate.status,

          error_rate_percent:
            candidate.errorRate,

          latency_ms:
            candidate.latency,
        })
      );

  const unhealthy =
    dependencies.filter(
      (dependency) =>
        dependency.status !==
        "healthy"
    );

  return {
    ok: true,

    summary:
      unhealthy.length === 0
        ? `Dependencies surrounding ${service.name} are healthy.`
        : `${unhealthy.length} unhealthy dependencies detected around ${service.name}.`,

    data: {
      investigated_service:
        service.name,

      dependencies,

      unhealthy_dependency_count:
        unhealthy.length,
    },
  };
}

function investigateIncident(
  service: Service,
  context: IncidentToolContext,
  scenario: IncidentScenario | null
): IncidentToolResult {
  const metrics =
    getMetrics(service);

  const logs =
    getLogs(
      service,
      scenario
    );

  const deployments =
    getDeployments(
      service,
      scenario
    );

  const dependencies =
    getDependencies(
      service,
      context.services,
      scenario
    );

  if (
    !context.incident ||
    !scenario
  ) {
    return {
      ok: true,

      summary:
        `Investigation completed for ${service.name}. No active incident is associated with this service.`,

      data: {
        investigation_type:
          "full_incident_investigation",

        service:
          service.name,

        metrics:
          metrics.data,

        logs:
          logs.data,

        deployments:
          deployments.data,

        dependencies:
          dependencies.data,

        diagnosis: {
          confidence:
            "low",

          likely_cause:
            "No active incident",
        },
      },
    };
  }

  if (
    service.id !==
    scenario.affectedServiceId
  ) {
    return {
      ok: true,

      summary:
        `Investigation completed for ${service.name}. Current incident evidence does not identify ${service.name} as the affected service.`,

      data: {
        investigation_type:
          "full_incident_investigation",

        service:
          service.name,

        metrics:
          metrics.data,

        logs:
          logs.data,

        deployments:
          deployments.data,

        dependencies:
          dependencies.data,

        diagnosis: {
          confidence:
            "low",

          likely_cause:
            "No incident-correlated failure identified for this service.",

          recommended_action:
            `Investigate ${context.incident.service}, which is the service associated with the active incident.`,
        },
      },
    };
  }

  return {
    ok: true,

    summary:
      `Investigation completed. ${scenario.investigation.diagnosis.likely_cause} is the leading diagnosis with ${scenario.investigation.diagnosis.confidence} confidence.`,

    data: {
      investigation_type:
        "full_incident_investigation",

      scenario:
        scenario.id,

      service:
        service.name,

      metrics:
        metrics.data,

      logs:
        logs.data,

      deployments:
        deployments.data,

      dependencies:
        dependencies.data,

      diagnosis:
        scenario.investigation
          .diagnosis,
    },
  };
}

function requestRollback(
  service: Service,
  args: Record<string, unknown>,
  context: IncidentToolContext,
  scenario: IncidentScenario | null
): IncidentToolResult {
  if (
    !context.incident ||
    !scenario
  ) {
    return {
      ok: false,

      summary:
        "Rollback blocked. There is no active incident with evidence supporting a recovery action.",

      error:
        "NO_ACTIVE_INCIDENT",

      data: {
        safety_blocked:
          true,
      },
    };
  }

  const targetVersion =
    typeof args.target_version ===
    "string"
      ? args.target_version
      : "";

  const policy =
    scenario.rollbackPolicy;

  /*
   * Important safety case:
   *
   * Some incidents should NOT be
   * fixed by rollback.
   */
  if (!policy) {
    return {
      ok: false,

      summary:
        `Rollback blocked by VoxOps safety policy. Evidence does not validate a rollback of ${service.name}. ${scenario.investigation.diagnosis.recommended_action}`,

      error:
        "ROLLBACK_NOT_VALIDATED",

      data: {
        safety_blocked:
          true,

        service:
          service.name,

        diagnosis:
          scenario.investigation
            .diagnosis.likely_cause,

        recommended_action:
          scenario.investigation
            .diagnosis
            .recommended_action,
      },
    };
  }

  /*
   * A rollback may be supported for
   * the incident, but only for the
   * evidence-backed affected service.
   */
  if (
    service.id !==
    policy.serviceId
  ) {
    return {
      ok: false,

      summary:
        `Rollback blocked. The current incident only validates rollback for ${context.incident.service}, not ${service.name}.`,

      error:
        "ROLLBACK_NOT_VALIDATED",

      data: {
        safety_blocked:
          true,

        requested_service:
          service.name,

        validated_service:
          context.incident.service,
      },
    };
  }

  if (
    targetVersion !==
    policy.targetVersion
  ) {
    return {
      ok: false,

      summary:
        `Rollback blocked. The evidence-backed stable target for ${service.name} is ${policy.targetVersion}, not ${targetVersion}.`,

      error:
        "INVALID_TARGET_VERSION",

      data: {
        safety_blocked:
          true,

        requested_target:
          targetVersion,

        validated_target:
          policy.targetVersion,
      },
    };
  }

  const proposal:
    RecoveryProposal = {
      action:
        "rollback",

      service:
        service.name,

      serviceId:
        service.id,

      fromVersion:
        service.version,

      toVersion:
        policy.targetVersion,

      reason:
        policy.reason,

      evidence:
        policy.evidence,
    };

  return {
    ok: true,

    summary:
      `Rollback proposal created for ${service.name}. Human approval through the VoxOps Safety Gate is required before execution.`,

    data: {
      state:
        "AWAITING_HUMAN_APPROVAL",

      proposal,
    },
  };
}

export function runIncidentTool(
  name: string,
  args: Record<string, unknown>,
  context: IncidentToolContext
): IncidentToolResult {
  const requestedService =
    typeof args.service ===
    "string"
      ? args.service
      : "";

  const service =
    findService(
      requestedService,
      context.services
    );

  if (!service) {
    return serviceNotFound(
      requestedService
    );
  }

  const scenario =
    findScenario(
      context.incident
    );

  switch (name) {
    case "investigate_incident":
      return investigateIncident(
        service,
        context,
        scenario
      );

    case "request_rollback":
      return requestRollback(
        service,
        args,
        context,
        scenario
      );

    case "get_service_metrics":
      return getMetrics(
        service
      );

    case "query_service_logs":
      return getLogs(
        service,
        scenario
      );

    case "get_recent_deployments":
      return getDeployments(
        service,
        scenario
      );

    case "get_dependency_health":
      return getDependencies(
        service,
        context.services,
        scenario
      );

    case "verify_recovery": {
      const recovered =
        service.status ===
          "healthy" &&
        service.errorRate < 5;

      return {
        ok: true,

        summary:
          recovered
            ? `${service.name} recovery is verified. The service is healthy on ${service.version} with ${service.errorRate}% errors and ${service.latency} ms latency.`
            : `${service.name} recovery is not yet verified. Current status is ${service.status}, error rate ${service.errorRate}%, latency ${service.latency} ms.`,

        data: {
          service:
            service.name,

          recovery_verified:
            recovered,

          status:
            service.status,

          version:
            service.version,

          error_rate_percent:
            service.errorRate,

          latency_ms:
            service.latency,
        },
      };
    }

    default:
      return {
        ok: false,

        summary:
          `Unknown tool: ${name}`,

        error:
          "UNKNOWN_TOOL",
      };
  }
}