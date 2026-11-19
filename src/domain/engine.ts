import { canonical, requireValue as need } from "../../vendor/project-store.ts";
import {
  digest,
  find,
  unique,
  fixedHistory,
  checkNotes,
  ordered,
} from "./shared.ts";
export function duration(t: any) {
  let n = BigInt(t.frame_out - t.frame_in) * BigInt(t.fps_den),
    d = BigInt(t.fps_num),
    a = n,
    b = d;
  while (b) {
    [a, b] = [b, a % b];
  }
  const g = a || 1n;
  return {
    numerator: String(n / g),
    denominator: String(d / g),
    unit: "seconds",
  };
}
const key = (o: any) => canonical([o.take_id, o.subject, o.category, o.phase]);
export function activeObservations(p: any) {
  const replaced = new Set(
    p.observations.map((o: any) => o.supersedes_id).filter(Boolean),
  );
  return p.observations.filter((o: any) => !replaced.has(o.id));
}
export function takeView(p: any, id: string) {
  const take = find(p.takes, id),
    shot = find(p.shots, take.shot_id);
  return {
    take,
    shot,
    scene: find(p.scenes, shot.scene_id),
    duration: duration(take),
    observations: activeObservations(p).filter((o: any) => o.take_id === id),
    note: "条次为明确声明；是否有真实素材另看固定素材引用。",
  };
}
export function matchBasis(p: any, m: any) {
  return digest({
    from: takeView(p, m.from_take_id),
    to: takeView(p, m.to_take_id),
    from_phase: m.from_phase,
    to_phase: m.to_phase,
    items: m.items,
  });
}
export function compareMatch(p: any, id: string) {
  const m = find(p.matches, id),
    observations = activeObservations(p);
  return {
    match: m,
    stale: m.basis_sha256 !== matchBasis(p, m),
    items: m.items.map((item: any) => {
      const get = (take: string, phase: string) =>
          observations.find(
            (o: any) =>
              o.take_id === take &&
              o.phase === phase &&
              o.subject === item.subject &&
              o.category === item.category,
          ),
        a = get(m.from_take_id, m.from_phase),
        b = get(m.to_take_id, m.to_phase);
      return {
        ...item,
        from: a ?? null,
        to: b ?? null,
        result:
          !a || !b
            ? "unknown"
            : a.value === b.value
              ? "matches"
              : item.intentional
                ? "intentional_change"
                : "differs",
      };
    }),
    note: "只比较明确登记的状态，未登记观察或语义一致性不自动判断。",
  };
}
export function selectionBasis(p: any, shotID: string, takeID: string) {
  const shot = find(p.shots, shotID),
    take = find(p.takes, takeID);
  need(take.shot_id === shot.id, "条次不属于当前镜次。");
  return digest({
    scene: find(p.scenes, shot.scene_id),
    shot,
    take,
    observations: activeObservations(p).filter(
      (o: any) => o.take_id === take.id,
    ),
  });
}
export function targetDigest(p: any, k: string, id: string): string {
  if (k === "scene") return digest(find(p.scenes, id));
  if (k === "shot") {
    const s = find(p.shots, id);
    return digest({ shot: s, scene: find(p.scenes, s.scene_id) });
  }
  if (k === "take") return digest(takeView(p, id));
  if (k === "match") {
    const m = find(p.matches, id);
    return digest({ match: m, current_basis: matchBasis(p, m) });
  }
  need(k === "selection", "未知意见目标。");
  const s = find(p.selections, id);
  return digest({
    selection: s,
    current_basis: selectionBasis(p, s.shot_id, s.take_id),
  });
}
export function validateDomain(p: any) {
  unique(
    p.scenes.map((s: any) => s.order),
    "场次顺序重复。",
  );
  for (const s of p.scenes)
    s.evidence_ids.forEach((id: string) => find(p.evidence, id));
  for (const s of p.shots) find(p.scenes, s.scene_id);
  unique(
    p.shots.map((s: any) => canonical([s.scene_id, s.order])),
    "场内镜次顺序重复。",
  );
  unique(
    p.takes.map((t: any) => canonical([t.shot_id, t.number])),
    "镜次内条号重复。",
  );
  for (const t of p.takes) {
    find(p.shots, t.shot_id);
    need(t.frame_out > t.frame_in, "条次出帧必须晚于入帧。");
    need(t.declaration.trim(), "条次必须有来源声明。");
  }
  for (const o of p.observations) {
    find(p.takes, o.take_id);
    if (o.supersedes_id) {
      const old = find(p.observations, o.supersedes_id);
      need(
        old.id !== o.id && key(old) === key(o),
        "更正观察须属于同一条次主体类别及位置。",
      );
    }
  }
  unique(
    p.observations
      .filter((o: any) => o.supersedes_id)
      .map((o: any) => o.supersedes_id),
    "观察不能有分叉更正。",
  );
  const visiting = new Set(),
    done = new Set();
  function visit(id: string) {
    if (done.has(id)) return;
    need(!visiting.has(id), "观察更正成环。");
    visiting.add(id);
    const o = find(p.observations, id);
    if (o.supersedes_id) visit(o.supersedes_id);
    visiting.delete(id);
    done.add(id);
  }
  p.observations.forEach((o: any) => visit(o.id));
  unique(
    activeObservations(p).map(key),
    "同位置存在多个未替代观察，请明确更正关系。",
  );
  for (const m of p.matches) {
    find(p.takes, m.from_take_id);
    find(p.takes, m.to_take_id);
    need(
      m.from_take_id !== m.to_take_id || m.from_phase !== m.to_phase,
      "比较须有两个不同位置。",
    );
    unique(
      m.items.map((x: any) => canonical([x.subject, x.category])),
      "比较项重复。",
    );
    for (const x of m.items)
      need(!x.intentional || x.reason.trim(), "有意变化必须留原因。");
  }
  for (const s of p.selections) selectionBasis(p, s.shot_id, s.take_id);
  unique(
    p.selections.map((s: any) => s.shot_id),
    "同镜次只能有一个当前选择，备选仍保留在条次中。",
  );
  checkNotes(p, (k, id) => targetDigest(p, k, id));
}
export function validateTransition(p: any, old?: any, _action?: string) {
  fixedHistory(p, old, ["evidence", "takes", "observations"]);
  for (const [field, basis] of [
    ["matches", (v: any) => matchBasis(p, v)],
    ["selections", (v: any) => selectionBasis(p, v.shot_id, v.take_id)],
  ] as const)
    for (const v of p[field]) {
      const prev = old?.[field].find((x: any) => x.id === v.id);
      if (!prev || canonical(prev) !== canonical(v))
        need(
          v.basis_sha256 === basis(v),
          "新比较或剪辑选择须固定当前完整依据。",
          "hetu.stale_evidence",
        );
    }
  for (const n of p.notes) {
    const prev = old?.notes.find((x: any) => x.id === n.id);
    if (
      !prev ||
      canonical([prev.target_kind, prev.target_id, prev.target_sha256]) !==
        canonical([n.target_kind, n.target_id, n.target_sha256])
    )
      need(
        n.target_sha256 === targetDigest(p, n.target_kind, n.target_id),
        "新意见摘要不符。",
      );
  }
}
export function check(p: any) {
  return {
    stale_match_ids: p.matches
      .filter((m: any) => m.basis_sha256 !== matchBasis(p, m))
      .map((m: any) => m.id),
    stale_selection_ids: p.selections
      .filter(
        (s: any) => s.basis_sha256 !== selectionBasis(p, s.shot_id, s.take_id),
      )
      .map((s: any) => s.id),
    stale_note_ids: p.notes
      .filter(
        (n: any) =>
          n.target_sha256 !== targetDigest(p, n.target_kind, n.target_id),
      )
      .map((n: any) => n.id),
    comparisons: p.matches.map((m: any) => compareMatch(p, m.id)),
    unattached_take_ids: p.takes
      .filter((t: any) => t.asset_source_index === null)
      .map((t: any) => t.id),
    note: "缺观察返回unknown；差异为明确值比较，不认证真实画面穿帮。",
  };
}
export function reading(p: any) {
  return (
    p.title +
    "\n\n" +
    ordered(p.scenes)
      .map(
        (s) =>
          "场次 " +
          s.title +
          "〔故事日 " +
          s.story_day +
          "〕\n" +
          s.location +
          "\n" +
          s.body +
          "\n\n" +
          ordered(p.shots.filter((x: any) => x.scene_id === s.id))
            .map(
              (shot) =>
                shot.label +
                "：" +
                shot.action +
                "\n" +
                p.takes
                  .filter((t: any) => t.shot_id === shot.id)
                  .map(
                    (t: any) =>
                      "第" +
                      t.number +
                      "条 [" +
                      t.mode +
                      "] " +
                      t.roll +
                      "\n帧 " +
                      t.frame_in +
                      "—" +
                      t.frame_out +
                      " @ " +
                      t.fps_num +
                      "/" +
                      t.fps_den +
                      "\n" +
                      t.declaration +
                      "\n" +
                      takeView(p, t.id)
                        .observations.map(
                          (o: any) =>
                            o.subject +
                            " " +
                            o.category +
                            " " +
                            o.phase +
                            "：" +
                            o.value,
                        )
                        .join("\n"),
                  )
                  .join("\n\n"),
            )
            .join("\n\n"),
      )
      .join("\n\n")
  );
}
