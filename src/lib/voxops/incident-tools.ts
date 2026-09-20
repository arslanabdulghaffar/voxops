import type {
  Incident,
  Service,
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
      "MANDATORY first tool whenever the engineer asks to investigate, diagnose, analyze, explain, or determine what is happening in an incident. It gathers metrics, logs, deployment history, and dependency health in one investigation.",
    parameters: {
      type: "object",
      properties: {
        service: {
          type: "string",
          description:
            "Affected production service explicitly mentioned by the engineer, for example Checkout API.",
        },
      },
      required: ["service"],
    },
  },

  {
    type: "function",
    name: "request_rollback",
    description:
      "MANDATORY tool when the engineer asks to rollback a service. This DOES NOT execute the rollback. It creates a recovery proposal that must pass the human Safety Gate.",
    parameters: {
      type: "object",
      properties: {
        service: {
          type: "string",
          description:
            "Production service to rollback.",
        },
        target_version: {
          type: "string",
          description:
            "Requested stable target version.",
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
      "Get current health, latency, error rate, version, and status for one service. Use for a specific follow-up metrics question.",
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
      "Inspect recent logs for one service. Use for a specific follow-up question about logs.",
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
      "Inspect surrounding dependency health for one production service.",
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
      "MANDATORY tool when the engineer asks to verify whether recovery or rollback succeeded. It checks the service's current status, latency, error rate, and version.",
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
  const requested = normalize(
    requestedService
  );

  return services.find((service) => {
    const id = normalize(service.id);
    const name = normalize(service.name);

    return (
      requested === id ||
      requested === name ||
      requested.includes(id) ||
      name.includes(requested) ||
      id.includes(requested)
    );
  });
}

function serviceNotFound(
  serviceName: string
): IncidentToolResult {
  return {
    ok: false,
    summary: `Service "${serviceName}" was not found.`,
    error: "SERVICE_NOT_FOUND",
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
      service: service.name,
      status: service.status,
      version: service.version,
      latency_ms: service.latency,
      error_rate_percent:
        service.errorRate,
    },
  };
}

function getLogs(
  service: Service,
  incident: Incident | null
): IncidentToolResult {
  if (
    service.id === "checkout" &&
    incident
  ) {
    return {
      ok: true,

      summary:
        "Checkout API logs show repeated PriceNormalizer failures beginning shortly after deployment v2.14.",

      data: {
        service: service.name,

        logs: [
          {
            level: "ERROR",
            occurrences: 214,
            message:
              "PriceNormalizer failed: currency is undefined",
            first_seen:
              "2 minutes after deployment v2.14",
          },

          {
            level: "ERROR",
            occurrences: 198,
            message:
              "POST /checkout returned HTTP 500",
          },

          {
            level: "WARN",
            occurrences: 43,
            message:
              "Checkout request failed before payment processing",
          },
        ],

        observation:
          "Failures occur inside Checkout API before requests reach Payment API.",
      },
    };
  }

  return {
    ok: true,

    summary:
      `${service.name} has no significant recent errors.`,

    data: {
      service: service.name,

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
  incident: Incident | null
): IncidentToolResult {
  if (
    service.id === "checkout" &&
    incident
  ) {
    return {
      ok: true,

      summary:
        "Checkout API v2.14 was deployed 7 minutes before the incident. v2.13 was the previous stable version.",

      data: {
        service: service.name,

        deployments: [
          {
            version: "v2.14",
            state: "current",
            deployed:
              "7 minutes before incident",
            change:
              "Pricing normalization refactor",
          },

          {
            version: "v2.13",
            state: "previous_stable",
            deployed:
              "2 days before incident",
            change:
              "Stable production release",
          },
        ],
      },
    };
  }

  return {
    ok: true,

    summary:
      `${service.name} has no deployment correlated with the current incident.`,

    data: {
      service: service.name,

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
  services: Service[]
): IncidentToolResult {
  const dependencies =
    services
      .filter(
        (candidate) =>
          candidate.id !== service.id
      )
      .map((candidate) => ({
        service:
          candidate.name,

        status:
          candidate.status,

        error_rate_percent:
          candidate.errorRate,

        latency_ms:
          candidate.latency,
      }));

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
        ? `Dependencies surrounding ${service.name} are healthy, indicating the failure is localized to ${service.name}.`
        : `${unhealthy.length} unhealthy dependencies detected.`,

    data: {
      investigated_service:
        service.name,

      dependencies,

      unhealthy_dependency_count:
        unhealthy.length,
    },
  };
}

export function runIncidentTool(
  name: string,
  args: Record<string, unknown>,
  context: IncidentToolContext
): IncidentToolResult {
  const requestedService =
    typeof args.service === "string"
      ? args.service
      : "";

  const service = findService(
    requestedService,
    context.services
  );

  if (!service) {
    return serviceNotFound(
      requestedService
    );
  }

  switch (name) {
    case "investigate_incident": {
      const metrics =
        getMetrics(service);

      const logs =
        getLogs(
          service,
          context.incident
        );

      const deployments =
        getDeployments(
          service,
          context.incident
        );

      const dependencies =
        getDependencies(
          service,
          context.services
        );

      const checkoutRegression =
        service.id === "checkout" &&
        context.incident !== null;

      return {
        ok: true,

        summary:
          checkoutRegression
            ? "Investigation completed. Evidence strongly indicates a regression introduced by Checkout API deployment v2.14, specifically around PriceNormalizer. Dependencies are healthy."
            : `Investigation completed for ${service.name}. No deployment-correlated failure was identified.`,

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

          diagnosis:
            checkoutRegression
              ? {
                  confidence:
                    "high",

                  likely_cause:
                    "Checkout API v2.14 pricing normalization regression",

                  evidence: [
                    "Error rate increased to 27.3%.",
                    "Latency increased to 1480 ms.",
                    "v2.14 deployed 7 minutes before incident.",
                    "PriceNormalizer errors began after v2.14.",
                    "Payment, Auth, and Inventory remain healthy.",
                    "Failures occur before payment processing.",
                  ],

                  recommended_action:
                    "Rollback Checkout API from v2.14 to previous stable version v2.13, subject to Safety Gate authorization.",
                }
              : {
                  confidence:
                    "low",

                  likely_cause:
                    "Not established",
                },
        },
      };
    }

    case "request_rollback": {
      if (!context.incident) {
        return {
          ok: false,

          summary:
            "No active incident exists, so rollback authorization cannot be created.",

          error:
            "NO_ACTIVE_INCIDENT",
        };
      }

      const targetVersion =
        typeof args.target_version ===
        "string"
          ? args.target_version
          : "";

      if (
        service.id !== "checkout"
      ) {
        return {
          ok: false,

          summary:
            `No validated rollback recommendation currently exists for ${service.name}.`,

          error:
            "ROLLBACK_NOT_VALIDATED",
        };
      }

      if (
        targetVersion !== "v2.13"
      ) {
        return {
          ok: false,

          summary:
            `The validated stable target for Checkout API is v2.13, not ${targetVersion}.`,

          error:
            "INVALID_TARGET_VERSION",
        };
      }

      const proposal: RecoveryProposal = {
        action:
          "rollback",

        service:
          service.name,

        serviceId:
          service.id,

        fromVersion:
          service.version,

        toVersion:
          "v2.13",

        reason:
          "Evidence indicates that the current Checkout API v2.14 deployment introduced a pricing normalization regression.",

        evidence: [
          "Checkout API error rate reached 27.3%.",
          "Checkout API latency reached 1480 ms.",
          "v2.14 was deployed 7 minutes before the incident.",
          "PriceNormalizer failures began after v2.14.",
          "Payment, Auth, and Inventory services remain healthy.",
        ],
      };

      return {
        ok: true,

        summary:
          "Rollback proposal created. Human approval through the VoxOps Safety Gate is required before execution.",

        data: {
          state:
            "AWAITING_HUMAN_APPROVAL",

          proposal,
        },
      };
    }

    case "get_service_metrics":
      return getMetrics(
        service
      );

    case "query_service_logs":
      return getLogs(
        service,
        context.incident
      );

    case "get_recent_deployments":
      return getDeployments(
        service,
        context.incident
      );

    case "get_dependency_health":
      return getDependencies(
        service,
        context.services
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