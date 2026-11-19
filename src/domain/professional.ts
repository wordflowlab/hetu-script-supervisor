import { artifact } from "./artifact.ts";
import { find } from "./shared.ts";
import { requireValue as need } from "../../vendor/project-store.ts";
import * as E from "./engine.ts";
export { validateDomain, validateTransition } from "./engine.ts";
export async function checkSources(p: any, sources: any[], _request: any) {
  for (const t of p.takes)
    if (t.asset_source_index !== null)
      need(
        sources[t.asset_source_index]?.source_ref?.kind === "asset",
        "条次素材须为固定宿主素材。",
      );
}
export async function pureAction(_a: string, _i: any) {
  return undefined;
}
export async function writeProfessional(
  a: string,
  p: any,
  _s: any[],
  i: any,
  ..._rest: any[]
) {
  throw Error("未知专业写动作。");
}
export function summaries(p: any) {
  return [
    { title: "完整专业阅读本", lines: [E.reading(p)] },
    { title: "检查与复核", lines: [JSON.stringify(E.check(p), null, 2)] },
    ...Object.entries(p)
      .filter(([k, v]) => Array.isArray(v))
      .map(([k, v]) => ({ title: k, lines: [JSON.stringify(v, null, 2)] })),
  ];
}
export async function readProfessional(
  a: string,
  p: any,
  _s: any[],
  i: any,
  _r: any,
) {
  if (a === "target_digest")
    return { target_sha256: E.targetDigest(p, i.target_kind, i.target_id) };
  if (a === "check_script") return E.check(p);

  if (a === "match_basis") return { basis_sha256: E.matchBasis(p, i.match) };
  if (a === "compare_match") return E.compareMatch(p, i.match_id);
  if (a === "selection_basis")
    return { basis_sha256: E.selectionBasis(p, i.shot_id, i.take_id) };
  if (a === "take_view") return E.takeView(p, i.take_id);

  if (a === "export_reading")
    return artifact(E.reading(p), "场记工作台阅读本.txt", "text/plain", i);
  if (a === "export_review") {
    const { reportHTML } = await import("./report.ts");
    return artifact(
      reportHTML({ project: p }),
      "场记工作台审核本.html",
      "text/html",
      i,
    );
  }
}
