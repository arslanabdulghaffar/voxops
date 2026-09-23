# VoxOps Hackathon Demo Script

## Target Length

Approximately **2.5–3 minutes**.

The demo should focus on two things:

1. VoxOps can investigate and safely recover from a real incident scenario.
2. VoxOps can refuse an incorrect recovery request instead of blindly following the user.

---

# Opening — 0:00–0:20

### Narration

Production incidents are stressful.

Engineers often have to switch between monitoring dashboards, logs, deployments, dependencies, and recovery tools while making high-risk decisions under pressure.

VoxOps is an AI Voice Incident Commander that lets engineers investigate incidents by voice while keeping production-changing actions behind evidence-based safety controls and explicit human approval.

### Screen

Show the VoxOps dashboard in its normal healthy state.

Briefly point out:

- monitored services
- scenario engine
- Voice Agent
- Safety Gate

Do not spend too long explaining the interface.

---

# Demo 1 — Evidence-Based Investigation — 0:20–0:55

### Screen Action

Select:

```text
Checkout Release Regression
```

Click:

```text
Trigger Selected Incident
```

Show that:

```text
Checkout API
Status: critical
Version: v2.14
```

Start the VoxOps Voice Agent.

Wait until it shows:

```text
Listening
```

### Say

> Investigate the Checkout API incident.

### Expected VoxOps Behavior

VoxOps calls:

```text
investigate_incident
```

It should identify:

```text
Checkout API v2.14 pricing normalization regression
```

### Narration

VoxOps does not invent infrastructure information.

The diagnosis is grounded in service metrics, logs, deployment history, and dependency health exposed through structured incident tools.

---

# Demo 2 — Human-Controlled Recovery — 0:55–1:35

### Say

> Rollback Checkout API to v2.13.

### Expected Behavior

VoxOps calls:

```text
request_rollback
```

and creates:

```text
AWAITING_HUMAN_APPROVAL
```

The Safety Gate should open.

### Narration

Notice that VoxOps does not execute the rollback itself.

The AI can investigate and recommend an action, but a state-changing operation requires explicit human authorization.

### Screen Action

Show the evidence supporting the rollback.

Then click:

```text
Approve Rollback
```

Show:

```text
Checkout API
v2.14 → v2.13
```

Then ask:

> Verify the Checkout API recovery.

### Expected Behavior

VoxOps calls:

```text
verify_recovery
```

Show:

- healthy service state
- incident timeline
- automated postmortem report

### Narration

The recovery is independently verified, and VoxOps automatically maintains an incident audit trail and postmortem.

---

# Demo 3 — Unsafe Action Rejection — 1:35–2:15

### Screen Action

Prepare:

```text
Payment Provider Degradation
```

Show that Payment API is critical.

### Say

> Investigate the Payment API incident.

### Expected Diagnosis

```text
External AtlasPay Gateway degradation
```

### Narration

This scenario is intentionally different.

There has been no Payment API deployment associated with the incident. The evidence indicates that the external AtlasPay payment provider is failing.

### Say

> Rollback Payment API to v3.7.

### Expected Behavior

VoxOps calls:

```text
request_rollback
```

but returns:

```text
ROLLBACK_NOT_VALIDATED
```

The Safety Gate remains:

```text
Protected
```

Payment API remains on:

```text
v3.8
```

### Narration

This is one of the most important parts of VoxOps.

The system does not blindly follow an incorrect human request.

Because the evidence does not support a Payment API rollback, the deterministic safety policy blocks the action before the human approval stage even opens.

---

# Evaluation — 2:15–2:35

### Screen

Briefly show the evaluation sections.

### Narration

We evaluated VoxOps at two separate levels.

The deterministic safety evaluation passed:

```text
11 / 11 checks
```

including diagnosis, authorization, unsafe-action blocking, and recovery verification.

We also ran six real spoken AssemblyAI benchmark trials.

Results:

```text
6 / 6 live trials passed

Tool selection:     100%
Argument accuracy:  100%
Safety outcome:     100%
Median Voice → Tool latency: approximately 4.2 seconds
```

These are separate evaluations so deterministic policy performance is not confused with live voice-agent performance.

---

# Architecture — 2:35–2:50

### Screen

Show:

```text
docs/images/voxops-architecture.png
```

### Narration

The architecture deliberately separates three responsibilities:

AssemblyAI handles the live voice interaction and structured tool calling.

VoxOps tools provide evidence and operational context.

Deterministic policies and the Human Safety Gate control state-changing actions.

---

# Closing — 2:50–3:00

### Narration

VoxOps demonstrates how voice agents can make incident response faster without giving the AI unrestricted control over production systems.

The core idea is simple:

> Voice for speed. Evidence for decisions. Humans for control.

---

# Demo Checklist

Before recording:

- Production deployment is working.
- Microphone permission is enabled.
- AssemblyAI API key is configured.
- Voice Agent connects successfully.
- Browser zoom is appropriate for recording.
- No unnecessary browser tabs are visible.
- Notifications are disabled.
- Checkout scenario works.
- Payment safety scenario works.
- Safety Gate is visible.
- Architecture image is ready.
- Evaluation dashboard is visible.
- Internet connection is stable.

---

# Important Demo Rules

Do not spend time explaining source code during the main demo.

Do not show every feature.

Do not start with the architecture diagram.

First demonstrate the problem and working product.

The most important sequence is:

```text
Incident
   ↓
Voice investigation
   ↓
Evidence-backed diagnosis
   ↓
Safe recovery proposal
   ↓
Human approval
   ↓
Verified recovery
```

Then demonstrate:

```text
Incorrect human request
   ↓
Evidence does not support action
   ↓
VoxOps blocks it
```

That contrast is the core VoxOps story.