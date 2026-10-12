import {motion} from "framer-motion";
import {ArrowRight, Check, Minus} from "lucide-react";
import {useCallback, useEffect, useState} from "react";
import {Link} from "react-router-dom";

import {MarketingShell} from "@/components/marketing-shell";
import {listPlans, openBillingPortal, startCheckout, type Plan, type PlanAllowance, type PlanCapability} from "@/lib/api/billing";
import {ApiError} from "@/lib/api/client";
import {EASE, reveal} from "@/lib/motion";
import {useWorkspaceAccount} from "@/lib/workspace/use-account";

type Catalogue = {status: "loading"} | {status: "error"} | {status: "ready"; plans: Plan[]};

const HIGHLIGHTS = ["projects.max", "builds.started", "ai.model.allowlist", "ai.effort", "platform.mobile", "git.persistence", "sandbox.concurrent.web", "sandbox.seconds", "storage.bytes"];
const EFFORT_LABELS: Record<string, string> = {low: "Low", standard: "Standard", high: "High", xhigh: "Extra high"};

function money(amountMinor: number, currency: string) {
  return new Intl.NumberFormat("en-GB", {style: "currency", currency: currency.toUpperCase(), minimumFractionDigits: amountMinor % 100 ? 2 : 0}).format(amountMinor / 100);
}

function compact(value: number) {
  return new Intl.NumberFormat("en-GB", {notation: "compact", maximumFractionDigits: 1}).format(value);
}

function amount(unit: string, value: number): string {
  if (unit === "tokens") return `${compact(value)} tokens`;
  if (unit === "seconds") { const hours = value / 3600; return `${compact(hours)} ${hours === 1 ? "hour" : "hours"}`; }
  if (unit === "bytes") return value >= 2 ** 30 ? `${compact(value / 2 ** 30)} GB` : `${compact(value / 2 ** 20)} MB`;
  return compact(value);
}

function modelName(id: string) {
  const parts = id.split("-");
  const words = parts.filter(part => !/^\d+$/.test(part)).map(part => part[0].toUpperCase() + part.slice(1));
  const version = parts.filter(part => /^\d+$/.test(part)).join(".");
  return [...words, version].filter(Boolean).join(" ");
}

function capabilityText(capability: PlanCapability): string | boolean {
  const {value, key} = capability;
  if (typeof value === "boolean") return value;
  if (Array.isArray(value)) return key === "ai.model.allowlist" ? value.map(modelName).join(", ") : value.join(", ");
  if (key === "ai.effort" && typeof value === "string") return EFFORT_LABELS[value] ?? value;
  return typeof value === "number" ? compact(value) : value;
}

function allowanceText(allowance: PlanAllowance) {
  if (allowance.limit === 0) return false;
  const included = amount(allowance.unit, allowance.included);
  return allowance.limit > allowance.included ? `${included}, up to ${amount(allowance.unit, allowance.limit)}` : included;
}

type Row = {key: string; label: string; value: string | boolean};

function rows(plan: Plan): Row[] {
  return [
    ...plan.capabilities.map(capability => ({key: capability.key, label: capability.label, value: capabilityText(capability)})),
    ...plan.allowances.map(allowance => ({key: allowance.key, label: allowance.label, value: allowanceText(allowance)})),
  ];
}

function Value({value}: {value: string | boolean}) {
  if (value === true) return <Check aria-label="Included" className="h-4 w-4 text-primary" />;
  if (value === false) return <Minus aria-label="Not included" className="h-4 w-4 text-gray-600" />;
  return <span>{value}</span>;
}

function failureMessage(failure: unknown) {
  if (failure instanceof ApiError) {
    if (failure.code === "auth/email-not-verified") return "Verify your email address before subscribing.";
    if (failure.status === 429) return "Too many attempts. Wait a moment and try again.";
    return failure.message;
  }
  return "We couldn't reach billing. Try again.";
}

export default function PricingPage() {
  const account = useWorkspaceAccount();
  const [catalogue, setCatalogue] = useState<Catalogue>({status: "loading"});
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<{message: string; portal?: boolean} | null>(null);

  const load = useCallback(() => {
    setCatalogue({status: "loading"});
    listPlans().then(plans => setCatalogue({status: "ready", plans}), () => setCatalogue({status: "error"}));
  }, []);
  useEffect(load, [load]);

  const ready = account.status === "ready" ? account : null;
  const currentKey = ready?.me.plan.key;

  async function checkout(plan: Plan) {
    if (!ready) return;
    setPending(plan.key);
    setError(null);
    try {
      window.location.assign(await startCheckout(await ready.user.getIdToken(), plan.key));
    } catch (failure) {
      const subscribed = failure instanceof ApiError && failure.code === "billing/already-subscribed";
      setError({message: subscribed ? "You already have a subscription. Change plans in the billing portal." : failureMessage(failure), portal: subscribed});
      setPending(null);
    }
  }

  async function portal() {
    if (!ready) return;
    setPending("portal");
    setError(null);
    try {
      window.location.assign(await openBillingPortal(await ready.user.getIdToken()));
    } catch (failure) {
      setError({message: failureMessage(failure)});
      setPending(null);
    }
  }

  const plans = catalogue.status === "ready" ? catalogue.plans : [];
  const featured = plans.find(plan => plan.price)?.key;
  const tableKeys = plans[0] ? rows(plans[plans.length - 1]).map(row => row.key) : [];

  return (
    <MarketingShell>
      <section className="relative overflow-hidden px-6 pb-12 pt-40 text-center sm:pt-48">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(55%_60%_at_50%_0%,rgba(225,224,204,0.12),transparent)]" />
        <motion.div className="relative mx-auto max-w-3xl" initial={{opacity: 0, y: 16}} animate={{opacity: 1, y: 0}} transition={{duration: 0.8, ease: EASE}}>
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Pricing</p>
          <h1 className="mt-5 text-balance text-4xl leading-[1.05] tracking-[-0.02em] sm:text-5xl md:text-6xl">Start free. Scale when you ship.</h1>
          <p className="mx-auto mt-5 max-w-xl text-[15px] leading-7 text-gray-400">Every plan builds real apps in an isolated sandbox with a live preview. Upgrade for stronger models, more builds and mobile apps.</p>
        </motion.div>
      </section>

      <section aria-label="Plans" className="mx-auto max-w-6xl px-6">
        {catalogue.status === "loading" && (
          <div role="status" aria-label="Loading plans" className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map(n => <div key={n} className="h-[34rem] animate-pulse rounded-[1.75rem] border border-white/5 bg-white/[0.03]" />)}
          </div>
        )}
        {catalogue.status === "error" && (
          <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <p className="text-sm leading-6 text-gray-400">We couldn't load plans right now. Prices are only shown when they come straight from our billing system.</p>
            <button type="button" onClick={load} className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-black transition-opacity hover:opacity-90">Try again</button>
          </div>
        )}
        {catalogue.status === "ready" && (
          <div className={`grid gap-4 ${plans.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
            {plans.map((plan, index) => {
              const isFeatured = plan.key === featured;
              const isCurrent = plan.key === currentKey;
              const highlights = rows(plan).filter(row => HIGHLIGHTS.includes(row.key)).sort((a, b) => HIGHLIGHTS.indexOf(a.key) - HIGHLIGHTS.indexOf(b.key));
              return (
                <motion.article key={plan.key} {...reveal(index * 0.08)}
                  className={`relative flex flex-col rounded-[1.75rem] border p-7 transition-colors duration-500 ${isFeatured ? "border-primary/30 bg-gradient-to-b from-primary/[0.09] to-white/[0.02] shadow-[0_40px_100px_-40px_rgba(225,224,204,0.25)]" : "border-white/10 bg-white/[0.02] hover:border-white/20"}`}>
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg">{plan.name}</h2>
                    {isCurrent ? <span className="rounded-full bg-white/10 px-3 py-1 text-[11px] text-[#E1E0CC]">Current plan</span>
                      : isFeatured && <span className="rounded-full bg-primary px-3 py-1 text-[11px] font-medium text-black">Recommended</span>}
                  </div>
                  <p className="mt-6 flex items-baseline gap-1.5">
                    <span className="text-5xl tracking-[-0.03em]">{plan.price ? money(plan.price.amountMinor, plan.price.currency) : money(0, plans.find(p => p.price)?.price?.currency ?? "gbp")}</span>
                    <span className="text-sm text-gray-500">/{plan.price?.interval ?? "month"}</span>
                  </p>
                  <div className="mt-7">
                    {isCurrent ? (
                      plan.price
                        ? <button type="button" disabled={pending !== null} onClick={portal} className="w-full rounded-full border border-white/15 py-3 text-sm transition-colors hover:bg-white/5 disabled:opacity-50">{pending === "portal" ? "Opening billing…" : "Manage billing"}</button>
                        : <Link to="/projects" className="block w-full rounded-full border border-white/15 py-3 text-center text-sm transition-colors hover:bg-white/5">Open app</Link>
                    ) : !plan.price ? (
                      <Link to={ready ? "/projects" : "/sign-up"} className="block w-full rounded-full border border-white/15 py-3 text-center text-sm transition-colors hover:bg-white/5">{ready ? "Open app" : "Start free"}</Link>
                    ) : ready ? (
                      <button type="button" disabled={pending !== null} onClick={() => void checkout(plan)}
                        className={`group flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-medium transition-all disabled:opacity-50 ${isFeatured ? "bg-primary text-black hover:gap-3" : "bg-white/10 text-[#E1E0CC] hover:bg-white/15"}`}>
                        {pending === plan.key ? "Opening checkout…" : <>Upgrade to {plan.name} <ArrowRight aria-hidden className="h-4 w-4" /></>}
                      </button>
                    ) : (
                      <Link to="/sign-up?next=/pricing" className={`group flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-medium transition-all hover:gap-3 ${isFeatured ? "bg-primary text-black" : "bg-white/10 text-[#E1E0CC]"}`}>
                        Choose {plan.name} <ArrowRight aria-hidden className="h-4 w-4" />
                      </Link>
                    )}
                  </div>
                  <ul className="mt-8 flex flex-col gap-3 border-t border-white/5 pt-7 text-[13px]">
                    {highlights.map(row => (
                      <li key={row.key} className={`flex items-start gap-3 ${row.value === false ? "text-gray-600" : "text-gray-300"}`}>
                        {row.value === false ? <Minus aria-hidden className="mt-0.5 h-4 w-4 shrink-0" /> : <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
                        <span><span className="text-gray-500">{row.label}</span>{typeof row.value === "string" && <> · {row.value}</>}</span>
                      </li>
                    ))}
                  </ul>
                </motion.article>
              );
            })}
          </div>
        )}
        {error && (
          <div role="alert" className="mx-auto mt-6 flex max-w-xl flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-center text-sm text-gray-300 sm:flex-row sm:justify-between sm:text-left">
            <span>{error.message}</span>
            {error.portal && <button type="button" onClick={portal} className="shrink-0 rounded-full bg-primary px-4 py-2 text-xs font-medium text-black">Open billing portal</button>}
          </div>
        )}
      </section>

      {catalogue.status === "ready" && plans.length > 0 && (
        <motion.section {...reveal(0)} aria-labelledby="compare" className="mx-auto max-w-6xl px-6 pb-28 pt-24">
          <h2 id="compare" className="text-center text-3xl tracking-[-0.02em] sm:text-4xl">Compare every detail</h2>
          <p className="mt-3 text-center text-sm text-gray-500">Limits come straight from each plan's live configuration.</p>
          <div className="scrollbar-none mt-10 overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03]">
                  <th scope="col" className="px-5 py-4 font-normal text-gray-500">Feature</th>
                  {plans.map(plan => <th key={plan.key} scope="col" className="px-5 py-4 font-normal">{plan.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {tableKeys.map(key => {
                  const label = plans.flatMap(rows).find(row => row.key === key)?.label ?? key;
                  return (
                    <tr key={key} className="border-b border-white/5 transition-colors last:border-0 hover:bg-white/[0.02]">
                      <th scope="row" className="px-5 py-3.5 font-normal text-gray-400">{label}</th>
                      {plans.map(plan => {
                        const row = rows(plan).find(item => item.key === key);
                        return <td key={plan.key} className="px-5 py-3.5 text-gray-200"><Value value={row ? row.value : false} /></td>;
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-16 grid gap-4 md:grid-cols-3">
            {[
              {q: "How is payment handled?", a: "Checkout and billing run on Stripe. Your card details never touch LotusBuild's servers."},
              {q: "Can I change or cancel?", a: "Yes. Upgrade, switch or cancel any time from the billing portal."},
              {q: "What happens at a limit?", a: "Related actions pause until your allowance resets or you move to a bigger plan. Nothing is billed by surprise."},
            ].map((item, index) => (
              <motion.div key={item.q} {...reveal(index * 0.08)} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
                <h3 className="text-[15px]">{item.q}</h3>
                <p className="mt-2 text-[13px] leading-6 text-gray-400">{item.a}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>
      )}
    </MarketingShell>
  );
}
