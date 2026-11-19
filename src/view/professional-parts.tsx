import React, { useState } from "react";
export function FixedNotes({
  p,
  report,
  targets,
  invoke,
  selection,
  write,
  run,
}: any) {
  const [target, setTarget] = useState(""),
    [comment, setComment] = useState("");
  const picked = targets.find((x: any) => x.key === target) ?? targets[0];
  return (
    <>
      <h3>具体意见</h3>
      {p.notes.map((n: any) => (
        <article key={n.id}>
          <p>{n.comment}</p>
          <p className="muted">
            {report?.stale_note_ids?.includes(n.id)
              ? "依据已变化，待复核"
              : n.status === "open"
                ? "待处理"
                : "已记录处理"}{" "}
            {n.resolution}
          </p>
        </article>
      ))}
      {picked && (
        <details>
          <summary>为具体目标留意见</summary>
          <label>
            意见目标
            <select
              aria-label="意见目标"
              value={picked.key}
              onChange={(e) => setTarget(e.target.value)}
            >
              {targets.map((x: any) => (
                <option key={x.key} value={x.key}>
                  {x.title}
                </option>
              ))}
            </select>
          </label>
          <textarea
            className="short-input"
            aria-label="专业意见"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button
            disabled={!comment.trim()}
            onClick={() =>
              void run(async () => {
                const d = await invoke("target_digest", {
                  ...selection(),
                  target_kind: picked.kind,
                  target_id: picked.id,
                });
                await write("put_note", {
                  note: {
                    id: "note-" + crypto.randomUUID(),
                    target_kind: picked.kind,
                    target_id: picked.id,
                    target_sha256: d.target_sha256,
                    origin: "author",
                    comment,
                    status: "open",
                    resolution: "",
                  },
                });
                setComment("");
              })
            }
          >
            保存固定意见
          </button>
        </details>
      )}
    </>
  );
}
export function Delivery({ run, download, show, check, goal }: any) {
  return (
    <>
      <div className="actions">
        <button onClick={() => void run(() => download("export_reading"))}>
          导出专业阅读本
        </button>
        <button onClick={() => void run(() => download("export_review"))}>
          导出完整审核本
        </button>
        <button onClick={() => void run(() => show(check))}>交付前复核</button>
      </div>
      <p className="muted">
        专业成果保留固定来源与修订。正文采纳和定稿分别决定。
      </p>
      <button onClick={() => void run(() => show("create_handoff", { goal }))}>
        准备固定创作交接
      </button>
    </>
  );
}
export const sorted = (xs: any[]) => [...xs].sort((a, b) => a.order - b.order);
export const targetsOf = (p: any, fields: Record<string, string>) =>
  Object.entries(fields).flatMap(([kind, field]) =>
    p[field].map((x: any) => ({
      key: kind + ":" + x.id,
      kind,
      id: x.id,
      title: x.title ?? x.label ?? x.meaning ?? "第" + x.number + "条",
    })),
  );
