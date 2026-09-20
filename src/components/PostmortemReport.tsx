"use client";

import { useState } from "react";

import type {
  RecoveryProposal,
} from "@/lib/voxops/incident-tools";

import type {
  Service,
} from "@/lib/voxops/scenarios";

import type {
  TimelineEvent,
} from "@/lib/voxops/timeline";

type Props = {
  incidentId: string;
  severity: string;
  proposal: RecoveryProposal | null;
  services: Service[];
  timeline: TimelineEvent[];
  verified: boolean;
};

export default function PostmortemReport({
  incidentId,
  severity,
  proposal,
  services,
  timeline,
  verified,
}: Props) {
  const [copied, setCopied] =
    useState(false);

  if (!proposal) {
    return (
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

        <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-500">
          Postmortem
        </p>

        <h2 className="mt-2 text-lg font-semibold">
          Incident Report
        </h2>

        <div className="mt-6 flex min-h-[220px] items-center justify-center rounded-xl border border-white/5 bg-black/20">

          <p className="max-w-sm text-center text-sm text-gray-600">
            VoxOps will automatically generate an
            incident report after recovery.
          </p>

        </div>

      </section>
    );
  }

  const recoveredService =
    services.find(
      (service) =>
        service.id === proposal.serviceId
    );

  const firstEvent =
    timeline[0];

  const lastEvent =
    timeline[timeline.length - 1];

  const durationSeconds =
    firstEvent && lastEvent
      ? Math.max(
          0,
          Math.round(
            (lastEvent.timestamp -
              firstEvent.timestamp) /
              1000
          )
        )
      : 0;

  const reportText = [
    "VoxOps Incident Postmortem",
    "",
    `Incident: ${incidentId}`,
    `Severity: ${severity}`,
    `Service: ${proposal.service}`,
    "",
    "Root Cause:",
    proposal.reason,
    "",
    "Evidence:",
    ...proposal.evidence.map(
      (item) => `- ${item}`
    ),
    "",
    "Recovery Action:",
    `Human-approved rollback from ${proposal.fromVersion} to ${proposal.toVersion}.`,
    "",
    "Recovery Verification:",
    verified && recoveredService
      ? `Verified healthy on ${recoveredService.version}. Error rate ${recoveredService.errorRate}%. Latency ${recoveredService.latency} ms.`
      : "Pending verification.",
    "",
    `Incident Timeline Duration: ${durationSeconds} seconds`,
    "",
    "Timeline:",
    ...timeline.map(
      (event) =>
        `- ${new Date(
          event.timestamp
        ).toLocaleTimeString()} | ${event.title}: ${event.detail}`
    ),
  ].join("\n");

  async function copyReport() {
    await navigator.clipboard.writeText(
      reportText
    );

    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 1500);
  }

  function downloadReport() {
    const blob = new Blob(
      [reportText],
      {
        type: "text/plain;charset=utf-8",
      }
    );

    const url =
      URL.createObjectURL(blob);

    const anchor =
      document.createElement("a");

    anchor.href = url;

    anchor.download =
      `voxops-${incidentId}-postmortem.txt`;

    anchor.click();

    URL.revokeObjectURL(url);
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

        <div>

          <div className="flex items-center gap-3">

            <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-500">
              Postmortem
            </p>

            <span
              className={`rounded-full px-2.5 py-1 text-xs ${
                verified
                  ? "bg-emerald-500/10 text-emerald-400"
                  : "bg-amber-500/10 text-amber-300"
              }`}
            >
              {verified
                ? "Final"
                : "Awaiting verification"}
            </span>

          </div>

          <h2 className="mt-2 text-lg font-semibold">
            {incidentId} Incident Report
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Automatically generated from the
            VoxOps incident audit trail.
          </p>

        </div>

        <div className="flex gap-2">

          <button
            onClick={copyReport}
            className="rounded-lg border border-white/10 px-3 py-2 text-xs text-gray-300 hover:bg-white/5"
          >
            {copied
              ? "Copied"
              : "Copy Report"}
          </button>

          <button
            onClick={downloadReport}
            className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-medium text-white hover:bg-violet-500"
          >
            Download .txt
          </button>

        </div>

      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">

        <Metric
          label="Severity"
          value={severity}
        />

        <Metric
          label="Duration"
          value={`${durationSeconds}s`}
        />

        <Metric
          label="Recovery"
          value={
            verified
              ? "Verified"
              : "Pending"
          }
        />

      </div>

      <div className="mt-5 space-y-4">

        <ReportBlock
          title="Root Cause"
          text={proposal.reason}
        />

        <div className="rounded-xl border border-white/10 bg-black/20 p-4">

          <p className="text-xs font-medium uppercase tracking-[0.16em] text-gray-600">
            Evidence
          </p>

          <div className="mt-3 space-y-2">

            {proposal.evidence.map(
              (item, index) => (
                <p
                  key={index}
                  className="text-xs leading-5 text-gray-400"
                >
                  <span className="mr-2 text-violet-400">
                    {String(
                      index + 1
                    ).padStart(2, "0")}
                  </span>

                  {item}
                </p>
              )
            )}

          </div>

        </div>

        <ReportBlock
          title="Recovery Action"
          text={`Human-approved rollback from ${proposal.fromVersion} to ${proposal.toVersion}.`}
        />

        <ReportBlock
          title="Verification"
          text={
            verified &&
            recoveredService
              ? `${recoveredService.name} is healthy on ${recoveredService.version}. Error rate ${recoveredService.errorRate}% and latency ${recoveredService.latency} ms.`
              : "Recovery verification is still pending."
          }
        />

      </div>

    </section>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-3">

      <p className="text-xs text-gray-600">
        {label}
      </p>

      <p className="mt-1 text-sm font-medium text-gray-200">
        {value}
      </p>

    </div>
  );
}

function ReportBlock({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">

      <p className="text-xs font-medium uppercase tracking-[0.16em] text-gray-600">
        {title}
      </p>

      <p className="mt-2 text-sm leading-6 text-gray-400">
        {text}
      </p>

    </div>
  );
}