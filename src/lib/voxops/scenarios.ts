export type ServiceStatus =
  | "healthy"
  | "degraded"
  | "critical";

export type Service = {
  id: string;
  name: string;
  status: ServiceStatus;
  latency: number;
  errorRate: number;
  version: string;
};

export type Incident = {
  id: string;
  title: string;
  severity:
    | "SEV-1"
    | "SEV-2"
    | "SEV-3";
  service: string;
  summary: string;
  startedAt: string;
  evidence: string[];
};

export type ScenarioId =
  | "checkout-regression"
  | "auth-regression"
  | "payment-provider";

export type ScenarioLogEntry = {
  level: string;
  message: string;
  occurrences?: number;
  first_seen?: string;
};

export type ScenarioDeployment = {
  version: string;
  state: string;
  deployed: string;
  change: string;
  incident_correlation?: boolean;
};

export type ScenarioDependency = {
  service: string;
  status: ServiceStatus;
  error_rate_percent?: number;
  latency_ms?: number;
  note?: string;
};

export type ScenarioDiagnosis = {
  confidence:
    | "high"
    | "medium"
    | "low";
  likely_cause: string;
  evidence: string[];
  recommended_action: string;
};

export type RollbackPolicy = {
  serviceId: string;
  targetVersion: string;
  reason: string;
  evidence: string[];
};

export type IncidentScenario = {
  id: ScenarioId;
  name: string;
  description: string;

  affectedServiceId: string;

  failureServices: Service[];
  recoveredServices?: Service[];

  incident: Incident;

  investigation: {
    logs: {
      summary: string;
      entries: ScenarioLogEntry[];
      observation: string;
    };

    deployments: {
      summary: string;
      entries: ScenarioDeployment[];
    };

    dependencies: {
      summary: string;
      entries: ScenarioDependency[];
    };

    diagnosis: ScenarioDiagnosis;
  };

  rollbackPolicy?: RollbackPolicy;
};

export const healthyServices: Service[] = [
  {
    id: "checkout",
    name: "Checkout API",
    status: "healthy",
    latency: 128,
    errorRate: 0.4,
    version: "v2.14",
  },
  {
    id: "payment",
    name: "Payment API",
    status: "healthy",
    latency: 94,
    errorRate: 0.2,
    version: "v3.8",
  },
  {
    id: "auth",
    name: "Auth Service",
    status: "healthy",
    latency: 72,
    errorRate: 0.1,
    version: "v1.21",
  },
  {
    id: "inventory",
    name: "Inventory API",
    status: "healthy",
    latency: 111,
    errorRate: 0.3,
    version: "v4.2",
  },
];

/*
 * --------------------------------------------------
 * Scenario 1
 * Checkout deployment regression
 * --------------------------------------------------
 */

const checkoutFailureServices: Service[] = [
  {
    id: "checkout",
    name: "Checkout API",
    status: "critical",
    latency: 1480,
    errorRate: 27.3,
    version: "v2.14",
  },
  {
    id: "payment",
    name: "Payment API",
    status: "healthy",
    latency: 101,
    errorRate: 0.3,
    version: "v3.8",
  },
  {
    id: "auth",
    name: "Auth Service",
    status: "healthy",
    latency: 78,
    errorRate: 0.1,
    version: "v1.21",
  },
  {
    id: "inventory",
    name: "Inventory API",
    status: "healthy",
    latency: 116,
    errorRate: 0.3,
    version: "v4.2",
  },
];

const checkoutRecoveredServices: Service[] = [
  {
    id: "checkout",
    name: "Checkout API",
    status: "healthy",
    latency: 137,
    errorRate: 0.7,
    version: "v2.13",
  },
  {
    id: "payment",
    name: "Payment API",
    status: "healthy",
    latency: 96,
    errorRate: 0.2,
    version: "v3.8",
  },
  {
    id: "auth",
    name: "Auth Service",
    status: "healthy",
    latency: 73,
    errorRate: 0.1,
    version: "v1.21",
  },
  {
    id: "inventory",
    name: "Inventory API",
    status: "healthy",
    latency: 109,
    errorRate: 0.2,
    version: "v4.2",
  },
];

const checkoutIncident: Incident = {
  id: "INC-2401",
  title: "Checkout failure spike",
  severity: "SEV-1",
  service: "Checkout API",
  summary:
    "Checkout requests started failing shortly after deployment v2.14.",
  startedAt: new Date().toISOString(),
  evidence: [
    "Checkout error rate increased from 0.4% to 27.3%.",
    "Latency increased from 128 ms to 1,480 ms.",
    "Deployment v2.14 completed 7 minutes before the failure spike.",
    "Payment, authentication and inventory services remain healthy.",
  ],
};

/*
 * --------------------------------------------------
 * Scenario 2
 * Authentication deployment regression
 * --------------------------------------------------
 */

const authFailureServices: Service[] = [
  {
    id: "checkout",
    name: "Checkout API",
    status: "healthy",
    latency: 132,
    errorRate: 0.5,
    version: "v2.14",
  },
  {
    id: "payment",
    name: "Payment API",
    status: "healthy",
    latency: 98,
    errorRate: 0.3,
    version: "v3.8",
  },
  {
    id: "auth",
    name: "Auth Service",
    status: "critical",
    latency: 624,
    errorRate: 18.6,
    version: "v1.21",
  },
  {
    id: "inventory",
    name: "Inventory API",
    status: "healthy",
    latency: 113,
    errorRate: 0.3,
    version: "v4.2",
  },
];

const authRecoveredServices: Service[] = [
  {
    id: "checkout",
    name: "Checkout API",
    status: "healthy",
    latency: 129,
    errorRate: 0.4,
    version: "v2.14",
  },
  {
    id: "payment",
    name: "Payment API",
    status: "healthy",
    latency: 95,
    errorRate: 0.2,
    version: "v3.8",
  },
  {
    id: "auth",
    name: "Auth Service",
    status: "healthy",
    latency: 81,
    errorRate: 0.2,
    version: "v1.20",
  },
  {
    id: "inventory",
    name: "Inventory API",
    status: "healthy",
    latency: 110,
    errorRate: 0.3,
    version: "v4.2",
  },
];

const authIncident: Incident = {
  id: "INC-2402",
  title: "Authentication failure surge",
  severity: "SEV-1",
  service: "Auth Service",
  summary:
    "Authentication failures increased shortly after Auth Service v1.21 was deployed.",
  startedAt: new Date().toISOString(),
  evidence: [
    "Authentication error rate increased from 0.1% to 18.6%.",
    "Auth Service latency increased from 72 ms to 624 ms.",
    "Version v1.21 was deployed 11 minutes before the incident.",
    "Checkout, Payment and Inventory remain healthy.",
  ],
};

/*
 * --------------------------------------------------
 * Scenario 3
 * External payment provider degradation
 * No validated rollback.
 * --------------------------------------------------
 */

const paymentFailureServices: Service[] = [
  {
    id: "checkout",
    name: "Checkout API",
    status: "healthy",
    latency: 141,
    errorRate: 0.8,
    version: "v2.14",
  },
  {
    id: "payment",
    name: "Payment API",
    status: "critical",
    latency: 2180,
    errorRate: 16.4,
    version: "v3.8",
  },
  {
    id: "auth",
    name: "Auth Service",
    status: "healthy",
    latency: 76,
    errorRate: 0.1,
    version: "v1.21",
  },
  {
    id: "inventory",
    name: "Inventory API",
    status: "healthy",
    latency: 114,
    errorRate: 0.3,
    version: "v4.2",
  },
];

export const incidentScenarios: IncidentScenario[] = [
  {
    id: "checkout-regression",

    name: "Checkout Release Regression",

    description:
      "A newly deployed Checkout API release introduces a pricing normalization bug.",

    affectedServiceId: "checkout",

    failureServices:
      checkoutFailureServices,

    recoveredServices:
      checkoutRecoveredServices,

    incident:
      checkoutIncident,

    investigation: {
      logs: {
        summary:
          "Checkout API logs show repeated PriceNormalizer failures beginning shortly after deployment v2.14.",

        entries: [
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

      deployments: {
        summary:
          "Checkout API v2.14 was deployed 7 minutes before the incident. v2.13 was the previous stable version.",

        entries: [
          {
            version: "v2.14",
            state: "current",
            deployed:
              "7 minutes before incident",
            change:
              "Pricing normalization refactor",
            incident_correlation: true,
          },
          {
            version: "v2.13",
            state: "previous_stable",
            deployed:
              "2 days before incident",
            change:
              "Stable production release",
            incident_correlation: false,
          },
        ],
      },

      dependencies: {
        summary:
          "Payment, Auth, and Inventory are healthy. Evidence indicates the failure is localized to Checkout API.",

        entries: [
          {
            service: "Payment API",
            status: "healthy",
            error_rate_percent: 0.3,
            latency_ms: 101,
          },
          {
            service: "Auth Service",
            status: "healthy",
            error_rate_percent: 0.1,
            latency_ms: 78,
          },
          {
            service: "Inventory API",
            status: "healthy",
            error_rate_percent: 0.3,
            latency_ms: 116,
          },
        ],
      },

      diagnosis: {
        confidence: "high",

        likely_cause:
          "Checkout API v2.14 pricing normalization regression",

        evidence: [
          "Checkout error rate reached 27.3%.",
          "Checkout latency reached 1480 ms.",
          "v2.14 was deployed 7 minutes before the incident.",
          "PriceNormalizer failures began after v2.14.",
          "Payment, Auth, and Inventory remain healthy.",
          "Failures occur before payment processing.",
        ],

        recommended_action:
          "Rollback Checkout API from v2.14 to previous stable version v2.13, subject to Safety Gate authorization.",
      },
    },

    rollbackPolicy: {
      serviceId: "checkout",

      targetVersion: "v2.13",

      reason:
        "Evidence indicates that the current Checkout API v2.14 deployment introduced a pricing normalization regression.",

      evidence: [
        "Checkout API error rate reached 27.3%.",
        "Checkout API latency reached 1480 ms.",
        "v2.14 was deployed 7 minutes before the incident.",
        "PriceNormalizer failures began after v2.14.",
        "Payment, Auth, and Inventory services remain healthy.",
      ],
    },
  },

  {
    id: "auth-regression",

    name: "Authentication Release Regression",

    description:
      "A new Auth Service release introduces token-validation failures.",

    affectedServiceId: "auth",

    failureServices:
      authFailureServices,

    recoveredServices:
      authRecoveredServices,

    incident:
      authIncident,

    investigation: {
      logs: {
        summary:
          "Auth Service logs show token validation failures beginning shortly after deployment v1.21.",

        entries: [
          {
            level: "ERROR",
            occurrences: 331,
            message:
              "TokenVerifier rejected token: signing key mapping unavailable",
            first_seen:
              "3 minutes after deployment v1.21",
          },
          {
            level: "ERROR",
            occurrences: 284,
            message:
              "POST /auth/validate returned HTTP 401 unexpectedly",
          },
          {
            level: "WARN",
            occurrences: 67,
            message:
              "JWKS cache refresh produced incomplete key mapping",
          },
        ],

        observation:
          "Failures occur inside Auth Service token validation while other production services remain healthy.",
      },

      deployments: {
        summary:
          "Auth Service v1.21 was deployed 11 minutes before the incident. v1.20 was the previous stable version.",

        entries: [
          {
            version: "v1.21",
            state: "current",
            deployed:
              "11 minutes before incident",
            change:
              "Token validation and JWKS cache refactor",
            incident_correlation: true,
          },
          {
            version: "v1.20",
            state: "previous_stable",
            deployed:
              "4 days before incident",
            change:
              "Stable authentication release",
            incident_correlation: false,
          },
        ],
      },

      dependencies: {
        summary:
          "Checkout, Payment, and Inventory are healthy. The failure is localized to Auth Service.",

        entries: [
          {
            service: "Checkout API",
            status: "healthy",
            error_rate_percent: 0.5,
            latency_ms: 132,
          },
          {
            service: "Payment API",
            status: "healthy",
            error_rate_percent: 0.3,
            latency_ms: 98,
          },
          {
            service: "Inventory API",
            status: "healthy",
            error_rate_percent: 0.3,
            latency_ms: 113,
          },
        ],
      },

      diagnosis: {
        confidence: "high",

        likely_cause:
          "Auth Service v1.21 token-validation regression",

        evidence: [
          "Auth error rate increased to 18.6%.",
          "Auth latency increased to 624 ms.",
          "v1.21 was deployed 11 minutes before the incident.",
          "TokenVerifier and JWKS cache errors began after v1.21.",
          "Checkout, Payment, and Inventory remain healthy.",
        ],

        recommended_action:
          "Rollback Auth Service from v1.21 to previous stable version v1.20, subject to Safety Gate authorization.",
      },
    },

    rollbackPolicy: {
      serviceId: "auth",

      targetVersion: "v1.20",

      reason:
        "Evidence indicates that Auth Service v1.21 introduced a token-validation and signing-key regression.",

      evidence: [
        "Auth Service error rate reached 18.6%.",
        "Auth Service latency reached 624 ms.",
        "v1.21 was deployed 11 minutes before the incident.",
        "TokenVerifier failures began after v1.21.",
        "Checkout, Payment, and Inventory remain healthy.",
      ],
    },
  },

  {
    id: "payment-provider",

    name: "Payment Provider Degradation",

    description:
      "Payment failures originate from an external gateway rather than a new internal deployment.",

    affectedServiceId: "payment",

    failureServices:
      paymentFailureServices,

    incident: {
      id: "INC-2403",

      title:
        "Payment processing latency spike",

      severity: "SEV-1",

      service: "Payment API",

      summary:
        "Payment requests are timing out while the internal Payment API has no recent correlated deployment.",

      startedAt:
        new Date().toISOString(),

      evidence: [
        "Payment API error rate increased from 0.2% to 16.4%.",
        "Payment latency increased from 94 ms to 2,180 ms.",
        "Payment API remains on v3.8 with no recent deployment.",
        "Upstream AtlasPay Gateway is reporting elevated timeout rates.",
      ],
    },

    investigation: {
      logs: {
        summary:
          "Payment API logs show repeated upstream gateway timeouts rather than an internal application exception.",

        entries: [
          {
            level: "ERROR",
            occurrences: 243,
            message:
              "AtlasPay request timed out after 2000 ms",
          },
          {
            level: "WARN",
            occurrences: 219,
            message:
              "Upstream payment gateway returned 504",
          },
          {
            level: "INFO",
            message:
              "Payment API application workers remain healthy",
          },
        ],

        observation:
          "Failures occur while waiting for AtlasPay Gateway responses. No internal Payment API crash signature is present.",
      },

      deployments: {
        summary:
          "Payment API v3.8 has been running unchanged for 6 days. No deployment correlates with the incident.",

        entries: [
          {
            version: "v3.8",
            state: "current",
            deployed:
              "6 days before incident",
            change:
              "Stable production release",
            incident_correlation: false,
          },
        ],
      },

      dependencies: {
        summary:
          "AtlasPay Gateway is degraded while internal dependencies remain healthy.",

        entries: [
          {
            service:
              "AtlasPay Gateway",
            status: "critical",
            error_rate_percent: 38.2,
            latency_ms: 2520,
            note:
              "External payment provider experiencing elevated timeouts.",
          },
          {
            service:
              "Auth Service",
            status: "healthy",
            error_rate_percent: 0.1,
            latency_ms: 76,
          },
          {
            service:
              "Inventory API",
            status: "healthy",
            error_rate_percent: 0.3,
            latency_ms: 114,
          },
        ],
      },

      diagnosis: {
        confidence: "high",

        likely_cause:
          "External AtlasPay Gateway degradation",

        evidence: [
          "Payment API has no recent correlated deployment.",
          "Payment workers remain healthy.",
          "AtlasPay requests are repeatedly timing out.",
          "AtlasPay Gateway latency reached approximately 2520 ms.",
          "Internal Auth and Inventory dependencies remain healthy.",
        ],

        recommended_action:
          "Do not roll back Payment API. Shift traffic to the secondary payment provider or escalate the AtlasPay incident.",
      },
    },

    /*
     * Intentionally no rollbackPolicy.
     *
     * This is the important safety case:
     * a Payment API rollback request must
     * be rejected because evidence does
     * not support rollback.
     */
  },
];

export function getIncidentScenario(
  id: ScenarioId
) {
  return (
    incidentScenarios.find(
      (scenario) =>
        scenario.id === id
    ) ??
    incidentScenarios[0]
  );
}