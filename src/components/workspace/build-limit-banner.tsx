import {Banner} from "@astryxdesign/core/Banner";
import {Button} from "@astryxdesign/core/Button";
import {useNavigate} from "react-router-dom";

import type {ApiFailureSummary} from "@/lib/api/client";

function safeNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function nextResetLabel(periodStart: unknown, resetPeriod: unknown) {
  if (resetPeriod !== "MONTHLY" || typeof periodStart !== "string") return null;
  const start = new Date(periodStart);
  if (Number.isNaN(start.getTime())) return null;
  const reset = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
  return reset.toLocaleDateString(undefined, {month: "long", day: "numeric", timeZone: "UTC"});
}

export function isBuildLimitFailure(failure: ApiFailureSummary | null) {
  return failure?.code === "usage/limit-reached" && failure.details?.meterKey === "builds.started";
}

export function BuildLimitBanner({failure}: {failure: ApiFailureSummary}) {
  const navigate = useNavigate();
  const limit = safeNumber(failure.details?.limit);
  const consumed = safeNumber(failure.details?.consumed) ?? 0;
  const reserved = safeNumber(failure.details?.reserved) ?? 0;
  const used = consumed + reserved;
  const reset = nextResetLabel(failure.details?.periodStart, failure.details?.resetPeriod);
  const allowance = limit === null ? "Your build allowance is used." : `${used} of ${limit} build turns used.`;
  const resetText = reset ? ` Your allowance resets on ${reset}.` : "";

  return (
    <div className="mx-1 mb-2 sm:mx-4">
      <Banner
        status="warning"
        title="Free build limit reached"
        description={`${allowance}${resetText} Deleting projects does not restore used build turns.`}
        collapsible={false}
        endContent={<Button label="View plans" variant="secondary" size="sm" onClick={() => navigate("/pricing")} />}
      />
    </div>
  );
}
