import { createHash } from "node:crypto";
import { newProject, canonical } from "../../src/domain/model.ts";
import { digest } from "../../src/domain/shared.ts";
import * as E from "../../src/domain/engine.ts";
export const original =
  "旧站的灯亮了。她带着来信走进站台。小车在10秒内行驶20米。她只有一张车票。\n";
export const sha = (s: string | Uint8Array) =>
  createHash("sha256").update(s).digest("hex");
export const base = (r: any, key: string) => ({
  object_id: r.object.object_id,
  expected_revision: r.object.revision,
  expected_sha256: r.sha256,
  operation_key: key,
});
export const selection = (r: any) => ({
  object_id: r.object.object_id,
  revision: r.object.revision,
});
export const sourceRef = {
  kind: "resource",
  work_ref: {
    workspace_id: "workspace_test",
    kind: "novel",
    object_id: "novel_test",
  },
  resource_id: "resource_test",
  revision: 1,
  sha256: sha(original),
};
export const quote = (text = original.trim()) => {
  const at = original.indexOf(text);
  if (at < 0) throw Error("引文不存在");
  return {
    id: "evidence",
    source_index: 0,
    byte_start: Buffer.byteLength(original.slice(0, at)),
    byte_end: Buffer.byteLength(original.slice(0, at + text.length)),
    quote: text,
    attribution: "原创虚构演示材料",
  };
};
export function seedSources(c: any) {
  c.sources.set(canonical(sourceRef), {
    source_ref: sourceRef,
    resource: { body: original },
  });
}
export function scenario(): any {
  const p = newProject("旧站场记与连续性");
  p.brief = "核对来信在正反打里的位置，条次为原创模拟记录。";
  p.evidence = [quote()];
  p.scenes = [
    {
      id: "scene",
      title: "灯亮之后",
      order: 1,
      story_day: "第一天夜",
      location: "旧站台",
      body: "她带着来信走进站台。",
      role_names: ["林溪"],
      evidence_ids: ["evidence"],
    },
  ];
  p.shots = [
    {
      id: "wide",
      scene_id: "scene",
      label: "全景",
      order: 1,
      action: "她把信封从左手交给守站人。",
    },
    {
      id: "close",
      scene_id: "scene",
      label: "信封近景",
      order: 2,
      action: "接全景出点，展示信封。",
    },
  ];
  p.takes = [
    {
      id: "take-a",
      shot_id: "wide",
      number: 1,
      mode: "agent_simulated",
      roll: "A001",
      frame_in: 0,
      frame_out: 300,
      fps_num: 30000,
      fps_den: 1001,
      declaration: "原创模拟条次，没有真实拍摄。",
      asset_source_index: null,
    },
    {
      id: "take-b",
      shot_id: "close",
      number: 1,
      mode: "agent_simulated",
      roll: "A002",
      frame_in: 400,
      frame_out: 700,
      fps_num: 30000,
      fps_den: 1001,
      declaration: "原创模拟反打，没有真实拍摄。",
      asset_source_index: null,
    },
  ];
  p.observations = [
    {
      id: "obs-a",
      take_id: "take-a",
      subject: "来信",
      category: "prop",
      phase: "out",
      value: "左手",
      note: "全景出点记录",
      supersedes_id: null,
    },
    {
      id: "obs-b",
      take_id: "take-b",
      subject: "来信",
      category: "prop",
      phase: "in",
      value: "右手",
      note: "近景入点记录",
      supersedes_id: null,
    },
  ];
  const m = {
    id: "envelope",
    title: "信封接点",
    from_take_id: "take-a",
    from_phase: "out",
    to_take_id: "take-b",
    to_phase: "in",
    items: [
      { subject: "来信", category: "prop", intentional: false, reason: "" },
      { subject: "林溪", category: "costume", intentional: false, reason: "" },
    ],
    basis_sha256: "",
  };
  m.basis_sha256 = E.matchBasis(p, m);
  p.matches = [m];
  p.selections = [
    {
      id: "selected",
      shot_id: "close",
      take_id: "take-b",
      reason: "保留近景作候选，连续性差异仍待处理。",
      basis_sha256: E.selectionBasis(p, "close", "take-b"),
    },
  ];
  p.notes = [
    {
      id: "note",
      target_kind: "shot",
      target_id: "wide",
      target_sha256: E.targetDigest(p, "shot", "wide"),
      origin: "agent",
      comment: "确认交信动作与近景是否连续。",
      status: "open",
      resolution: "",
    },
  ];
  return p;
}
export const reviewTarget = { kind: "shot", id: "wide" };
export function temporary(p: any): any {
  return {
    evidence: { ...p.evidence[0], id: "temp-evidence" },
    scene: { ...p.scenes[0], id: "temp-scene", order: 9 },
    shot: { ...p.shots[0], id: "temp-shot", order: 9 },
    take: { ...p.takes[0], id: "temp-take", number: 9 },
    observation: {
      ...p.observations[0],
      id: "temp-observation",
      subject: "站牌",
    },
    match: {
      ...p.matches[0],
      id: "temp-match",
      basis_sha256: E.matchBasis(p, p.matches[0]),
    },
    selection: {
      id: "temp-selection",
      shot_id: "wide",
      take_id: "take-a",
      reason: "临时剪辑候选",
      basis_sha256: E.selectionBasis(p, "wide", "take-a"),
    },
    note: { ...p.notes[0], id: "temp-note" },
  };
}
export function changed(p: any) {
  return {
    action: "put_shot",
    field: "shot",
    value: { ...p.shots[0], action: "她先停一拍，再把左手的信封交出去。" },
  };
}
export async function refix(c: any, r: any, key: string) {
  const match = r.object.content.matches[0],
    d = await c.invoke("match_basis", { ...selection(r), match });
  return c.invoke("put_match", {
    ...base(r, key),
    match: { ...match, basis_sha256: d.basis_sha256 },
  });
}
