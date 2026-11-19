import assert from "node:assert/strict";
import { selection, base, changed, refix, reviewTarget } from "./scenario.ts";
export const readingAction = "export_reading";
export async function exercise(c: any, r: any, key: () => string) {
  let s = selection(r);
  await c.invoke("check_script", s);
  await c.invoke("target_digest", {
    ...s,
    target_kind: reviewTarget.kind,
    target_id: reviewTarget.id,
  });

  const viewed = await c.invoke("take_view", { ...s, take_id: "take-a" });
  assert.deepEqual(viewed.duration, {
    numerator: "1001",
    denominator: "100",
    unit: "seconds",
  });
  const oldTake = r.object.content.takes[0];
  assert.equal(
    (
      await c.raw("put_take", {
        ...base(r, key()),
        take: { ...oldTake, roll: "伪改旧条次" },
      })
    ).data?.result?.status,
    "failed",
  );
  assert.equal(
    (await c.invoke("get_project", { object_id: r.object.object_id })).sha256,
    r.sha256,
  );
  const comparison = await c.invoke("compare_match", {
    ...s,
    match_id: "envelope",
  });
  assert.equal(comparison.items[0].result, "differs");
  assert.equal(comparison.items[1].result, "unknown");
  const m = r.object.content.matches[0];
  await c.invoke("match_basis", { ...s, match: m });
  await c.invoke("selection_basis", {
    ...s,
    shot_id: "close",
    take_id: "take-b",
  });
  r = await c.invoke("put_observation", {
    ...base(r, key()),
    observation: {
      ...r.object.content.observations.find((o: any) => o.id === "obs-b"),
      id: "correction",
      value: "左手",
      supersedes_id: "obs-b",
      note: "复核原记录后的更正声明",
    },
  });
  assert.equal(
    (await c.invoke("compare_match", { ...selection(r), match_id: "envelope" }))
      .items[0].result,
    "matches",
  );
  const change = changed(r.object.content);
  r = await c.invoke(change.action, {
    ...base(r, key()),
    [change.field]: change.value,
  });
  assert.ok(
    (await c.invoke("check_script", selection(r))).stale_match_ids.includes(
      "envelope",
    ),
  );
  r = await refix(c, r, key());
  assert.ok(
    !(await c.invoke("check_script", selection(r))).stale_match_ids.includes(
      "envelope",
    ),
  );
  return r;
}
