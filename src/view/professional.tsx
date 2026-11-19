import React, { useState } from "react";
import { useProfessionalReport } from "./professional-state.ts";
import {
  FixedNotes,
  Delivery,
  targetsOf,
  sorted,
} from "./professional-parts.tsx";
const categories: any = {
    costume: "服装",
    prop: "道具",
    action: "动作",
    eyeline: "视线",
    other: "其他",
  },
  results: any = {
    unknown: "缺少观察",
    matches: "记录相同",
    intentional_change: "有意变化",
    differs: "记录不同",
  };
export function ProfessionalView(props: any) {
  const { p, tab, run, show, write, download, invoke, selection } = props,
    { report, error } = useProfessionalReport(props, "check_script");
  const [matchID, setMatch] = useState("");
  const m = p.matches.find((x: any) => x.id === matchID) ?? p.matches[0],
    v = report?.comparisons.find((x: any) => x.match.id === m?.id);
  const shot = (id: string) => p.shots.find((x: any) => x.id === id);
  const takeLabel = (id: string) => {
    const t = p.takes.find((x: any) => x.id === id);
    return t ? shot(t.shot_id)?.label + " 第" + t.number + "条" : "未记录";
  };
  return (
    <>
      {error && <p role="alert">{error}</p>}
      {tab === 0 && (
        <div className="work-layout">
          <div className="reading">
            {sorted(p.scenes).map((s: any) => (
              <section key={s.id}>
                <h3>{s.title}</h3>
                <p className="annotation">
                  故事日 {s.story_day} {s.location}
                </p>
                <p>{s.body}</p>
                {sorted(p.shots.filter((x: any) => x.scene_id === s.id)).map(
                  (x: any) => (
                    <article key={x.id}>
                      <h3>{x.label}</h3>
                      <p>{x.action}</p>
                      <ul>
                        {p.takes
                          .filter((t: any) => t.shot_id === x.id)
                          .map((t: any) => (
                            <li key={t.id}>
                              第{t.number}条{" "}
                              {t.mode === "agent_simulated"
                                ? "模拟记录"
                                : "提交者记录"}
                              ：{t.declaration}
                            </li>
                          ))}
                      </ul>
                    </article>
                  ),
                )}
              </section>
            ))}
            {!p.scenes.length && <p>尚无场次。让AI读取固定剧本并准备场记。</p>}
          </div>
          <aside className="side">
            <h3>本次场记</h3>
            <p>{p.brief}</p>
            <p>
              {p.takes.length} 条记录，{p.matches.length} 组对照
            </p>
            <p className="muted">
              故事顺序与拍摄条次分别保存。未关联素材的条次只表示记录。
            </p>
          </aside>
        </div>
      )}
      {tab === 1 && (
        <>
          {p.takes.map((t: any) => (
            <article key={t.id}>
              <h3>{takeLabel(t.id)}</h3>
              <p>
                {t.roll}　帧 {t.frame_in}—{t.frame_out}　帧率 {t.fps_num}/
                {t.fps_den}
              </p>
              <p>{t.declaration}</p>
              <button
                onClick={() =>
                  void run(() => show("take_view", { take_id: t.id }))
                }
              >
                核对本条时长与观察
              </button>
              <table>
                <thead>
                  <tr>
                    <th>主体</th>
                    <th>位置</th>
                    <th>观察</th>
                  </tr>
                </thead>
                <tbody>
                  {p.observations
                    .filter((o: any) => o.take_id === t.id)
                    .map((o: any) => (
                      <tr key={o.id}>
                        <td>
                          {o.subject} {categories[o.category]}
                        </td>
                        <td>{o.phase === "in" ? "入点" : "出点"}</td>
                        <td>
                          {o.value}
                          {o.supersedes_id ? "〔更正记录〕" : ""}
                          <p className="muted">{o.note}</p>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </article>
          ))}
        </>
      )}
      {tab === 2 && (
        <>
          {m ? (
            <>
              <label>
                连续性对照
                <select
                  aria-label="连续性对照"
                  value={m.id}
                  onChange={(e) => setMatch(e.target.value)}
                >
                  {p.matches.map((x: any) => (
                    <option key={x.id} value={x.id}>
                      {x.title}
                    </option>
                  ))}
                </select>
              </label>
              <div className="parallel">
                <section>
                  <h3>{takeLabel(m.from_take_id)}</h3>
                  <p>{m.from_phase === "in" ? "入点" : "出点"}</p>
                </section>
                <section>
                  <h3>{takeLabel(m.to_take_id)}</h3>
                  <p>{m.to_phase === "in" ? "入点" : "出点"}</p>
                </section>
              </div>
              {v ? (
                <table>
                  <thead>
                    <tr>
                      <th>比较项</th>
                      <th>前条记录</th>
                      <th>后条记录</th>
                      <th>结论</th>
                    </tr>
                  </thead>
                  <tbody>
                    {v.items.map((x: any, n: number) => (
                      <tr key={n}>
                        <td>
                          {x.subject} {categories[x.category]}
                        </td>
                        <td>{x.from?.value ?? "未记录"}</td>
                        <td>{x.to?.value ?? "未记录"}</td>
                        <td>
                          {results[x.result]}
                          <p>{x.reason}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p role="status">正在读取固定对照</p>
              )}
              <p className={v?.stale ? "warning" : "muted"}>
                {v?.stale ? "比较依据变化，需复核" : "按明确登记状态对照"}
              </p>
              <button
                onClick={() =>
                  void run(async () => {
                    const d = await invoke("match_basis", {
                      ...selection(),
                      match: m,
                    });
                    await write("put_match", {
                      match: { ...m, basis_sha256: d.basis_sha256 },
                    });
                  })
                }
              >
                重新固定所选对照
              </button>
            </>
          ) : (
            <p>尚无连续性对照，让AI明确两个条次及需要匹配的状态。</p>
          )}
        </>
      )}
      {tab === 3 && (
        <>
          {p.selections.map((s: any) => (
            <article key={s.id}>
              <h3>{takeLabel(s.take_id)}</h3>
              <p>{s.reason}</p>
              <p
                className={
                  report?.stale_selection_ids.includes(s.id)
                    ? "warning"
                    : "muted"
                }
              >
                {report?.stale_selection_ids.includes(s.id)
                  ? "剪辑依据变化，待复核"
                  : "固定剪辑声明"}
              </p>
              <button
                onClick={() =>
                  void run(async () => {
                    const d = await invoke("selection_basis", {
                      ...selection(),
                      shot_id: s.shot_id,
                      take_id: s.take_id,
                    });
                    await write("put_selection", {
                      selection: { ...s, basis_sha256: d.basis_sha256 },
                    });
                  })
                }
              >
                重新固定该选择
              </button>
            </article>
          ))}
          <FixedNotes
            {...props}
            report={report}
            targets={targetsOf(p, {
              scene: "scenes",
              shot: "shots",
              take: "takes",
              match: "matches",
              selection: "selections",
            })}
          />
        </>
      )}
      {tab === 4 && (
        <Delivery
          {...props}
          check="check_script"
          goal="按固定场记、连续性意见和剪辑声明准备下一轮拍摄或剪辑参考，保留原条次。"
        />
      )}
    </>
  );
}
