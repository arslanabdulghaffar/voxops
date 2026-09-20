export type ServiceStatus = "healthy" | "degraded" | "critical";

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
  severity: "SEV-1" | "SEV-2" | "SEV-3";
  service: string;
  summary: string;
  startedAt: string;
  evidence: string[];
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

export const checkoutFailureServices: Service[] = [
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

export const recoveredServices: Service[] = [
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

export const checkoutIncident: Incident = {
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