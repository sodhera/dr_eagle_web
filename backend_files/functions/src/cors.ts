export interface CorsResponse {
  setHeader?: (name: string, value: string) => void;
  set?: (name: string, value: string) => void;
  status?: (code: number) => { send: (body?: unknown) => void };
}

export function setCors(res: CorsResponse): void {
  const setter = res.setHeader ?? res.set;
  if (!setter) return;
  setter.call(res as any, "Access-Control-Allow-Origin", "*");
  setter.call(res as any, "Access-Control-Allow-Headers", "Content-Type, Authorization");
  setter.call(res as any, "Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  setter.call(res as any, "Access-Control-Max-Age", "86400");
}

export function maybeHandleCorsOptions(req: { method?: string }, res: CorsResponse): boolean {
  if ((req.method ?? "").toUpperCase() !== "OPTIONS") {
    return false;
  }
  setCors(res);
  if (typeof res.status === "function") {
    res.status(204).send("");
  }
  return true;
}
