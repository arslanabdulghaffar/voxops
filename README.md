# VoxOps

## AI Voice Incident Commander for Safe Production Recovery

VoxOps is a real-time voice-operated incident response system built with the AssemblyAI Voice Agent API.

Instead of forcing an engineer to switch between dashboards, logs, deployment histories, and runbooks during an outage, VoxOps lets the engineer investigate the incident by voice.

The important difference is that VoxOps does not blindly execute commands.

It gathers evidence, diagnoses the incident, validates recovery actions against that evidence, and requires explicit human approval before any state-changing operation.

> **Voice for speed. Evidence for decisions. Humans for control.**

---

## Live Demo

**Production:**  
https://voxops-topaz.vercel.app/

**GitHub:**  
https://github.com/arslanabdulghaffar/voxops

Built for the **AssemblyAI Voice Agent Hackathon 2026**.

---

# The Problem

Production incidents are stressful and time-sensitive.

During an outage, an engineer may need to simultaneously:

- inspect service health
- read logs
- check deployments
- inspect dependencies
- identify the root cause
- decide whether rollback is appropriate
- coordinate recovery
- verify that the system recovered
- document what happened

Voice agents can make this workflow much faster, but production infrastructure introduces an important safety problem:

> A voice agent should not execute a destructive or incorrect recovery action simply because someone asked for it.

VoxOps addresses both problems.

It provides conversational incident investigation while placing deterministic safety controls between AI reasoning and production-changing actions.

---

# What VoxOps Does

An engineer can speak naturally to VoxOps:

> "Investigate the Checkout API incident."

VoxOps then uses incident tools to inspect:

- current service metrics
- recent logs
- deployment history
- dependency health

It produces an evidence-backed diagnosis and recommends an appropriate next action.

For example:

> "Rollback Checkout API to v2.13."

VoxOps validates whether that rollback is supported by the current incident evidence.

If valid, VoxOps creates a recovery proposal.

It **does not execute the rollback**.

The proposal must pass through the human-controlled **Safety Gate**.

---

# Safety-First Recovery

VoxOps separates AI reasoning from production authorization.

```text
Engineer Voice Command
        │
        ▼
AssemblyAI Voice Agent
        │
        ▼
Intent + Tool Selection
        │
        ▼
Incident Investigation Tools
        │
        ▼
Evidence-Based Diagnosis
        │
        ▼
Recovery Policy Validation
        │
        ├──────── Unsafe / Unsupported
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