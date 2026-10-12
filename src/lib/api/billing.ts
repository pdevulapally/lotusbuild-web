import {apiRequest} from "./client";
import {isPlanKey, trustedRedirect} from "@/lib/security/validation";

export type PlanPrice = {amountMinor: number; currency: string; interval: string};
export type PlanCapability = {key: string; label: string; kind: string; value: boolean | number | string | string[]};
export type PlanAllowance = {key: string; label: string; unit: string; included: number; limit: number};
export type Plan = {key: string; name: string; rank: number; price?: PlanPrice; capabilities: PlanCapability[]; allowances: PlanAllowance[]};

const isString = (value: unknown): value is string => typeof value === "string";
const isNumber = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

class CatalogueError extends Error {
  constructor() {
    super("The plan catalogue could not be read.");
    this.name = "CatalogueError";
  }
}

function parseCapability(value: unknown): PlanCapability {
  if (!isRecord(value) || !isString(value.key) || !isString(value.label) || !isString(value.kind)) throw new CatalogueError();
  const v = value.value;
  const valid = typeof v === "boolean" || isNumber(v) || isString(v) || (Array.isArray(v) && v.every(isString));
  if (!valid) throw new CatalogueError();
  return {key: value.key, label: value.label, kind: value.kind, value: v as PlanCapability["value"]};
}

function parseAllowance(value: unknown): PlanAllowance {
  if (!isRecord(value) || !isString(value.key) || !isString(value.label) || !isString(value.unit) || !isNumber(value.included) || !isNumber(value.limit)) {
    throw new CatalogueError();
  }
  return {key: value.key, label: value.label, unit: value.unit, included: value.included, limit: value.limit};
}

function parsePlan(value: unknown): Plan {
  if (!isRecord(value) || !isString(value.key) || !isPlanKey(value.key) || !isString(value.name) || !isNumber(value.rank)) throw new CatalogueError();
  if (!Array.isArray(value.capabilities) || !Array.isArray(value.allowances)) throw new CatalogueError();
  let price: PlanPrice | undefined;
  if (value.price !== undefined) {
    const p = value.price;
    if (!isRecord(p) || !isNumber(p.amountMinor) || p.amountMinor < 0 || !isString(p.currency) || !/^[a-z]{3}$/.test(p.currency) || !isString(p.interval)) {
      throw new CatalogueError();
    }
    price = {amountMinor: p.amountMinor, currency: p.currency, interval: p.interval};
  }
  return {
    key: value.key,
    name: value.name,
    rank: value.rank,
    price,
    capabilities: value.capabilities.map(parseCapability),
    allowances: value.allowances.map(parseAllowance),
  };
}

// GET /plans is public: the pricing page renders before sign-in. Every field is
// checked, and a malformed catalogue is an error rather than a partial page.
export async function listPlans(): Promise<Plan[]> {
  const data = await apiRequest<unknown>("/plans");
  if (!isRecord(data) || !Array.isArray(data.plans)) throw new CatalogueError();
  return data.plans.map(parsePlan).sort((left, right) => left.rank - right.rank);
}

export async function startCheckout(token: string, planKey: string): Promise<string> {
  if (!isPlanKey(planKey)) throw new Error("Unknown plan.");
  const {url} = await apiRequest<{url?: unknown}>("/billing/checkout", {method: "POST", token, body: {planKey}});
  return trustedRedirect(url, ["checkout.stripe.com"]);
}

export async function openBillingPortal(token: string): Promise<string> {
  const {url} = await apiRequest<{url?: unknown}>("/billing/portal", {method: "POST", token});
  return trustedRedirect(url, ["billing.stripe.com"]);
}
