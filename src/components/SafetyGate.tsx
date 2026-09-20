"use client";

import type {
  RecoveryProposal,
} from "@/lib/voxops/incident-tools";

type RecoveryStatus =
  | "idle"
  | "pending"
  | "executing"
  | "completed"
  | "rejected";

type Props = {
  proposal: RecoveryProposal | null;
  status: RecoveryStatus;
  onApprove: () => void;
  onReject: () => void;
};

export default function SafetyGate({
  proposal,
  status,
  onApprove,
  onReject,
}: Props) {
  if (!proposal) {
    return (
      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-500">
              Safety Gate
            </p>

            <h2 className="mt-2 text-lg font-semibold">
              Human authorization
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              No recovery action is currently awaiting approval.
            </p>
          </div>

          <div className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-400">
            Protected
          </div>
        </div>
      </section>
    );
  }

  const completed =
    status === "completed";

  const rejected =
    status === "rejected";

  return (
    <section
      className={`mt-6 rounded-2xl border p-5 ${
        completed
          ? "border-emerald-500/30 bg-emerald-500/[0.04]"
          : rejected
          ? "border-gray-500/20 bg-white/[0.02]"
          : "border-amber-500/30 bg-amber-500/[0.04]"
      }`}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

        <div className="max-w-3xl">
          <div className="flex items-center gap-3">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-amber-400">
              Safety Gate
            </p>

            {status === "pending" && (
              <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-xs text-amber-300">
                Approval required
              </span>
            )}

            {status === "executing" && (
              <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-xs text-violet-300">
                Executing...
              </span>
            )}

            {completed && (
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400">
                Completed
              </span>
            )}

            {rejected && (
              <span className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-gray-400">
                Rejected
              </span>
            )}
          </div>

          <h2 className="mt-3 text-xl font-semibold">
            Rollback {proposal.service}
          </h2>

          <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
            <span>{proposal.fromVersion}</span>
            <span>→</span>
            <span className="font-medium text-white">
              {proposal.toVersion}
            </span>
          </div>

          <p className="mt-4 text-sm leading-6 text-gray-400">
            {proposal.reason}
          </p>

          <div className="mt-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-gray-600">
              Evidence supporting action
            </p>

            <div className="grid gap-2 md:grid-cols-2">
              {proposal.evidence.map(
                (item, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-white/10 bg-black/20 p-3"
                  >
                    <p className="text-xs leading-5 text-gray-400">
                      <span className="mr-2 text-violet-400">
                        {String(
                          index + 1
                        ).padStart(2, "0")}
                      </span>

                      {item}
                    </p>
                  </div>
                )
              )}
            </div>
          </div>
        </div>

        {status === "pending" && (
          <div className="flex min-w-[250px] flex-col gap-3">
            <button
              onClick={onApprove}
              className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Approve Rollback
            </button>

            <button
              onClick={onReject}
              className="rounded-xl border border-white/10 px-5 py-3 text-sm text-gray-400 hover:bg-white/5"
            >
              Reject Action
            </button>

            <p className="text-center text-[11px] leading-4 text-gray-600">
              VoxOps cannot bypass this authorization step.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}