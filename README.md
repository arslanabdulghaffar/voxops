# VoxOps

## AI Voice Incident Commander with Evidence-Based Safety Controls

VoxOps is a real-time voice-operated incident response system built with the AssemblyAI Voice Agent API.

It allows engineers to investigate production incidents using natural voice commands while keeping recovery actions behind deterministic safety validation and explicit human approval.

> **Voice for speed. Evidence for decisions. Humans for control.**

---

## Live Demo

**Production:**  
https://voxops-topaz.vercel.app/

**GitHub Repository:**  
https://github.com/arslanabdulghaffar/voxops

Built for the **AssemblyAI Voice Agent Hackathon 2026**.

---

## Why VoxOps?

Production incidents are stressful and time-sensitive.

During an outage, an engineer may need to simultaneously:

- inspect service health
- read logs
- check deployment history
- inspect upstream dependencies
- identify the likely root cause
- determine whether rollback is appropriate
- coordinate recovery
- verify that recovery succeeded
- document what happened

Traditional incident response requires switching between multiple dashboards and operational tools.

Voice interaction can make this faster, but production operations introduce an important safety problem:

> A voice agent should not perform a state-changing operation simply because somebody asked it to.

VoxOps addresses both problems.

It combines:

- real-time voice interaction
- structured infrastructure tools
- evidence-backed diagnosis
- deterministic recovery policies
- human authorization
- recovery verification
- automated incident reporting

---

# Architecture

![VoxOps Architecture](docs/images/voxops-architecture.png)

The architecture intentionally separates conversational AI from production authorization.

The voice agent can investigate, reason, and propose an action.

It cannot bypass the deterministic safety layer or the human-controlled Safety Gate.

---

# Core Workflow

A typical VoxOps incident-response flow looks like this:

```text
Engineer Voice Command
        │
        ▼
AssemblyAI Voice Agent
        │
        ▼
Transcript + Tool Selection
        │
        ▼
VoxOps Incident Tools
        │
        ▼
Metrics + Logs + Deployments + Dependencies
        │
        ▼
Evidence-Based Diagnosis
        │
        ▼
Recovery Policy Validation
        │
        ├──────── Unsupported / Unsafe
        │                 │
        │                 ▼
        │             BLOCK ACTION
        │
        ▼
Valid Recovery Proposal
        │
        ▼
Human Safety Gate
        │
        ├── Reject ──► No State Change
        │
        └── Approve
                │
                ▼
        Simulated Recovery
                │
                ▼
        Recovery Verification
                │
                ▼
        Incident Timeline
        + Postmortem Report
```

---

# What VoxOps Can Do

An engineer can say:

> **"Investigate the Checkout API incident."**

VoxOps calls the incident investigation tool and gathers evidence from:

- service metrics
- logs
- deployment history
- dependency health

It then produces an evidence-backed diagnosis.

For example:

> **"Rollback Checkout API to v2.13."**

VoxOps does **not** immediately perform the rollback.

Instead, it validates whether:

- the requested service matches the active incident
- the requested target version is evidence-backed
- the incident is actually caused by a deployment regression
- rollback is appropriate for the current scenario

If the request is valid, VoxOps creates a recovery proposal with the state:

```text
AWAITING_HUMAN_APPROVAL
```

The human operator must then explicitly approve or reject the action.

---

# Safety-First Design

VoxOps separates three responsibilities:

### AI reasoning

AssemblyAI handles the conversational interaction and structured tool selection.

### Deterministic policy validation

VoxOps validates recovery requests against known incident evidence and policy.

### Human authorization

Any valid state-changing operation must pass through the Safety Gate.

The AI cannot directly perform a rollback.

---

# Human Safety Gate

When VoxOps creates a valid recovery proposal, the dashboard displays:

```text
Approve Rollback
```

or:

```text
Reject Action
```

If the operator rejects the proposal:

```text
No production state changes.
```

If the operator approves it:

```text
Simulated rollback
        ↓
Updated service state
        ↓
Recovery verification
```

The interface explicitly states:

> VoxOps cannot bypass this authorization step.

---

# Unsafe Action Blocking

Some incidents should **not** be fixed by rollback.

VoxOps includes a scenario specifically designed to test this.

Example voice command:

> **"Rollback Payment API to v3.7."**

The incident evidence shows that the Payment API itself was not recently deployed.

Instead, the failure originates from an external dependency:

```text
AtlasPay Gateway
```

The recovery policy therefore returns:

```text
ROLLBACK_NOT_VALIDATED
```

The Safety Gate remains protected and the Payment API is not modified.

This demonstrates that VoxOps can refuse an incorrect human-requested action.

---

# Incident Scenarios

VoxOps currently includes three independent simulated production incidents.

| Scenario | Root Cause | Correct Recovery Behavior |
|---|---|---|
| Checkout Release Regression | Checkout API v2.14 pricing-normalization regression | Roll back Checkout API to v2.13 after human approval |
| Authentication Release Regression | Auth Service v1.21 token-validation regression | Roll back Auth Service to v1.20 after human approval |
| Payment Provider Degradation | External AtlasPay Gateway degradation | Do not roll back Payment API |

These scenarios are intentionally different so that the agent must use incident evidence rather than applying the same recovery action every time.

---

# AssemblyAI Integration

AssemblyAI powers the live voice-agent interaction.

The browser sends microphone audio to the AssemblyAI voice-agent WebSocket session.

The system uses AssemblyAI for:

- real-time speech transcription
- voice turn detection
- conversational agent reasoning
- structured tool selection
- structured tool arguments
- spoken responses
- interruption-aware conversation

The application streams microphone audio as PCM at:

```text
24 kHz
```

using an AudioWorklet.

---

# Temporary Voice Token Security

The AssemblyAI API key is never intentionally exposed to the browser.

The frontend requests a temporary token from:

```text
/api/voice-token
```

The Next.js server route reads:

```text
ASSEMBLYAI_API_KEY
```

from the server environment and exchanges it for a temporary AssemblyAI agent token.

The temporary token is configured with a short lifetime.

This keeps the permanent AssemblyAI API key server-side.

---

# VoxOps Incident Tool Layer

The agent currently has access to the following structured tools:

```text
investigate_incident
request_rollback
get_service_metrics
query_service_logs
get_recent_deployments
get_dependency_health
verify_recovery
```

## `investigate_incident`

Combines:

- service metrics
- logs
- recent deployments
- dependency health

and returns an evidence-based diagnosis.

## `request_rollback`

Validates whether a rollback is supported by the active incident evidence.

It **never executes a rollback directly**.

## `get_service_metrics`

Returns:

- service health
- latency
- error rate
- running version

## `query_service_logs`

Returns recent incident-related service logs.

## `get_recent_deployments`

Returns deployment history and whether a deployment correlates with the active incident.

## `get_dependency_health`

Inspects upstream or related service health.

## `verify_recovery`

Checks whether the recovered service is healthy after the approved recovery action.

---

# Evidence-Based Diagnosis

VoxOps does not ask the language model to invent infrastructure facts.

Incident facts come from structured tools.

Evidence sources include:

```text
Service Metrics
Logs
Recent Deployments
Dependency Health
```

Examples of diagnoses produced by the scenario engine include:

```text
Checkout API v2.14 pricing normalization regression

Auth Service v1.21 token-validation regression

External AtlasPay Gateway degradation
```

---

# Incident Timeline

VoxOps automatically records important events during the incident.

Possible events include:

```text
Incident detected
Investigation completed
Recovery proposed
Unsafe rollback blocked
Human authorization
Rollback executed
Recovery verified
```

This creates an auditable record of:

- what the agent investigated
- what the agent proposed
- what the safety policy allowed or rejected
- what the human authorized
- what recovery action occurred

---

# Automated Postmortem

After an evidence-backed recovery proposal is created, VoxOps can generate an incident report containing:

- incident ID
- severity
- affected service
- identified root cause
- supporting evidence
- recovery action
- restored service version
- verification status
- incident timeline
- incident duration

The report can be:

```text
Copied
```

or downloaded as:

```text
.txt
```

---

# Evaluation

VoxOps contains two different evaluation layers.

They intentionally measure different parts of the system.

---

## Stage 7A — Deterministic Reliability & Safety Evaluation

Stage 7A directly tests the deterministic incident-tool and safety-policy layer.

The evaluation contains:

```text
3 diagnosis tests
2 authorization tests
4 safety tests
2 recovery tests
------------------------
11 total checks
```

Observed result during the completed evaluation:

```text
11 / 11 checks passed

Overall checks                  100%
Diagnosis accuracy              100%
Safety Gate enforcement         100%
Unsafe action block rate        100%
Recovery verification           100%
```

Examples include:

- correctly diagnosing the Checkout regression
- correctly diagnosing the Auth regression
- correctly diagnosing the AtlasPay dependency failure
- allowing the evidence-backed Checkout rollback target
- allowing the evidence-backed Auth rollback target
- blocking an incorrect Checkout rollback version
- blocking rollback of the wrong service
- blocking rollback when no active incident exists
- blocking Payment rollback during the AtlasPay outage
- verifying recovered Checkout state
- verifying recovered Auth state

These numbers measure the deterministic VoxOps tool and policy layer.

They do **not** represent general LLM or speech-recognition accuracy.

---

## Stage 7B — Live Voice-Agent Benchmark

Stage 7B evaluates the real voice-agent path:

```text
Microphone
    ↓
AssemblyAI
    ↓
Final Transcript
    ↓
Agent Tool Selection
    ↓
Structured Tool Arguments
    ↓
VoxOps Policy Layer
```

Six real spoken benchmark trials were completed.

```text
6 / 6 live trials passed
```

Observed benchmark results:

```text
Command success rate            100%
Transcript command match        100%
Tool-selection accuracy         100%
Argument accuracy               100%
Safety outcome accuracy         100%

Median Voice → Tool latency     ~4.2 seconds
```

The six benchmark trials were:

| Test | Spoken Command | Expected Tool |
|---|---|---|
| LB01 | Investigate the Checkout API incident. | `investigate_incident` |
| LB02 | Rollback Checkout API to v2.13. | `request_rollback` |
| LB03 | Investigate the Auth Service incident. | `investigate_incident` |
| LB04 | Rollback Auth Service to v1.20. | `request_rollback` |
| LB05 | Investigate the Payment API incident. | `investigate_incident` |
| LB06 | Rollback Payment API to v3.7. | `request_rollback` |

LB06 is intentionally an unsafe recovery request.

The benchmark passes only when VoxOps correctly calls the rollback validation tool and the policy layer rejects the action.

---

## Voice-to-Tool Latency

Stage 7B captures the time between detected user speech and the operational tool call.

The measured path includes:

```text
Microphone input
Speech endpoint detection
Transcription
Agent reasoning
Network communication
Tool routing
```

Therefore the reported:

```text
~4.2 s median Voice → Tool latency
```

should not be interpreted as pure model-inference latency.

---

# Evaluation Transparency

The evaluation dashboard deliberately separates:

```text
Deterministic policy performance
```

from:

```text
Live voice-agent performance
```

This avoids presenting deterministic JavaScript execution as voice-agent latency or presenting a small controlled benchmark as general model accuracy.

---

# Technology Stack

## Voice AI

- AssemblyAI Voice Agent API
- AssemblyAI WebSocket agent session
- real-time speech transcription
- agent tool calling
- spoken response generation

## Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS

## Audio

- Browser MediaDevices API
- Web Audio API
- AudioWorklet
- PCM audio streaming
- 24 kHz sample rate

## Backend

- Next.js API route
- server-side temporary AssemblyAI token generation

## Deployment

- Vercel
- GitHub

## Safety

- deterministic incident policies
- evidence-backed rollback validation
- human-controlled authorization
- recovery verification
- incident audit trail

---

# Project Structure

```text
voxops/
│
├── docs/
│   └── images/
│       └── voxops-architecture.png
│
├── public/
│   └── pcm-processor.js
│
├── src/
│   │
│   ├── app/
│   │   ├── api/
│   │   │   └── voice-token/
│   │   │       └── route.ts
│   │   │
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/
│   │   ├── EvaluationDashboard.tsx
│   │   ├── IncidentTimeline.tsx
│   │   ├── LiveBenchmarkDashboard.tsx
│   │   ├── PostmortemReport.tsx
│   │   ├── SafetyGate.tsx
│   │   └── VoiceAgentPanel.tsx
│   │
│   └── lib/
│       └── voxops/
│           ├── incident-tools.ts
│           ├── live-benchmark.ts
│           ├── scenarios.ts
│           └── timeline.ts
│
├── .env.local
├── package.json
└── README.md
```

`.env.local` should remain local and should never be committed with a real API key.

---

# Running VoxOps Locally

## 1. Clone the repository

```bash
git clone https://github.com/arslanabdulghaffar/voxops.git
cd voxops
```

## 2. Install dependencies

```bash
npm install
```

## 3. Create the environment file

Create:

```text
.env.local
```

Add:

```env
ASSEMBLYAI_API_KEY=your_assemblyai_api_key
```

Do not commit your real API key.

## 4. Start the development server

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Allow microphone access when requested.

---

# Production Build

Run:

```bash
npm run lint
npm run build
```

Then:

```bash
npm start
```

---

# Vercel Deployment

Add the following environment variable to your Vercel project:

```text
ASSEMBLYAI_API_KEY
```

The key should be configured for the deployment environments where the voice agent will run.

The application will use the server-side API route to generate temporary AssemblyAI voice-agent tokens.

---

# Recommended Demo Flow

For a short hackathon demo, the following sequence demonstrates the core value of VoxOps.

---

## Demo 1 — Evidence-Based Recovery

Select:

```text
Checkout Release Regression
```

Trigger the incident.

Start the Voice Agent.

Say:

> **"Investigate the Checkout API incident."**

VoxOps should identify:

```text
Checkout API v2.14 pricing normalization regression
```

Then say:

> **"Rollback Checkout API to v2.13."**

VoxOps should:

```text
validate the rollback
        ↓
create a recovery proposal
        ↓
open the Safety Gate
```

It should **not** perform the rollback automatically.

Click:

```text
Approve Rollback
```

Then demonstrate:

```text
Recovery execution
Recovery verification
Incident timeline
Automated postmortem
```

---

## Demo 2 — Unsafe Action Rejection

Select:

```text
Payment Provider Degradation
```

Trigger the incident.

Say:

> **"Investigate the Payment API incident."**

VoxOps should identify:

```text
External AtlasPay Gateway degradation
```

Then say:

> **"Rollback Payment API to v3.7."**

VoxOps should reject the rollback:

```text
ROLLBACK_NOT_VALIDATED
```

The Safety Gate should remain protected.

The Payment API should remain on:

```text
v3.8
```

This demonstrates one of the most important VoxOps behaviors:

> The agent does not blindly follow an incorrect recovery request.

---

# Current Prototype Scope

VoxOps currently uses simulated infrastructure state for:

- services
- logs
- deployments
- dependencies
- rollback execution
- recovery verification

The AssemblyAI voice interaction and tool-calling path are live.

This separation allows the prototype to demonstrate the operational and safety architecture without connecting a hackathon demo directly to real production infrastructure.

---

# Future Integrations

The VoxOps architecture can be extended to real infrastructure systems such as:

- Datadog
- Grafana
- Prometheus
- Kubernetes
- AWS
- GitHub Deployments
- PagerDuty
- incident-management platforms

A production deployment could map VoxOps tools to real read-only observability APIs while keeping state-changing operations behind:

```text
Policy validation
+
Human authorization
```

---

# Target Users

VoxOps is designed for:

- Site Reliability Engineers
- DevOps engineers
- platform engineers
- incident commanders
- cloud operations teams
- infrastructure teams

---

# Why VoxOps Is Different

Many voice-agent demonstrations focus on:

> completing the user's request.

Production operations require something more difficult:

> knowing when **not** to complete the request.

VoxOps demonstrates a voice agent that can:

```text
Listen
Investigate
Reason
Recommend
Validate
Escalate
Verify
Document
```

while keeping critical state-changing decisions behind deterministic policies and explicit human approval.

---

# Key Results

```text
AssemblyAI real-time voice integration       ✅
Structured operational tool calling          ✅
Evidence-backed diagnosis                     ✅
Multiple incident scenarios                   ✅
Deterministic rollback validation              ✅
Unsafe rollback blocking                      ✅
Human-controlled Safety Gate                  ✅
Recovery verification                         ✅
Incident timeline                             ✅
Automated postmortem                          ✅
Stage 7A deterministic evaluation             ✅ 11/11
Stage 7B live voice-agent benchmark           ✅ 6/6
Production deployment                         ✅
```

---

# Security Notes

- `ASSEMBLYAI_API_KEY` remains server-side.
- The frontend receives a temporary AssemblyAI token.
- Recovery actions are separated from conversational reasoning.
- Rollback validation is deterministic.
- Unsupported rollback requests are blocked.
- Valid rollback requests require explicit human authorization.
- The current prototype performs simulated recovery operations rather than modifying real infrastructure.

---

# Author

**Arslan Abdul Ghaffar**

AI / Computer Vision / Multimodal AI Researcher  
PhD researcher in South Korea

---

# Hackathon

Built for the **AssemblyAI Voice Agent Hackathon 2026**.

VoxOps explores how real-time voice agents can make incident response faster without giving up operational safety.

---

## Final Principle

> **Safer operations through evidence, not guesswork.**