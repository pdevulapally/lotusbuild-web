import {Gauge} from "lucide-react";
import {useEffect, useState} from "react";

import {getSessionUsage, type RunUsage as Usage} from "@/lib/api/sessions";

const compact = new Intl.NumberFormat("en-GB", {notation: "compact", maximumFractionDigits: 1});

function amount(meter: Usage) {
  const value = meter.settled + meter.open;
  if (/^(s|sec|secs|seconds?)$/i.test(meter.unit)) return value >= 60 ? `${Math.round(value / 60)}m` : `${value}s`;
  if (/^(ms|milliseconds?)$/i.test(meter.unit)) return value >= 60_000 ? `${Math.round(value / 60_000)}m` : `${Math.round(value / 1000)}s`;
  return compact.format(value);
}

export function RunUsage({sessionId, token, refreshKey}: {sessionId: string; token: () => Promise<string>; refreshKey: string}) {
  const [meters, setMeters] = useState<Usage[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    token().then(auth => getSessionUsage(auth, sessionId)).then(list => !cancelled && setMeters(list), () => !cancelled && setMeters(null));
    return () => { cancelled = true; };
  }, [sessionId, token, refreshKey]);

  const shown = meters?.filter(meter => meter.settled + meter.open > 0) ?? [];
  if (shown.length === 0) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-gray-500" aria-label="Usage for this run">
      <Gauge aria-hidden strokeWidth={1.75} className="h-3.5 w-3.5" />
      {shown.map(meter => (
        <span key={meter.meterKey}><span className="tabular-nums text-gray-400">{amount(meter)}</span> {meter.label.toLowerCase()}</span>
      ))}
    </p>
  );
}
