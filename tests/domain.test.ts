import { test } from "node:test";
import assert from "node:assert/strict";
import { scenario, temporary } from "./support/scenario.ts";
import { validate, clone } from "../src/domain/model.ts";
import * as E from "../src/domain/engine.ts";
test("空工程允许逐步创作", async () => {
  const { newProject } = await import("../src/domain/model.ts");
  assert.doesNotThrow(() => validate(newProject()));
});
test("30000/1001帧率的300帧精确为1001/100秒", () =>
  assert.deepEqual(E.duration(scenario().takes[0]), {
    numerator: "1001",
    denominator: "100",
    unit: "seconds",
  }));
test("出帧不晚于入帧拒绝", () => {
  const p = scenario();
  p.takes[0].frame_out = 0;
  assert.throws(() => validate(p));
});
test("分母为零由Schema拒绝", () => {
  const p = scenario();
  p.takes[0].fps_den = 0;
  assert.throws(() => validate(p));
});
test("同镜次重复条号拒绝", () => {
  const p = scenario();
  p.takes.push({ ...p.takes[0], id: "other" });
  assert.throws(() => validate(p));
});
test("不同镜次可同条号", () => assert.doesNotThrow(() => validate(scenario())));
test("登记不同值返回differs", () =>
  assert.equal(
    E.compareMatch(scenario(), "envelope").items[0].result,
    "differs",
  ));
test("未登记观察返回unknown", () =>
  assert.equal(
    E.compareMatch(scenario(), "envelope").items[1].result,
    "unknown",
  ));
test("有意变化须解释并独立显示", () => {
  const p = scenario();
  p.matches[0].items[0].intentional = true;
  assert.throws(() => validate(p));
  p.matches[0].items[0].reason = "镜间发生明确换手";
  assert.doesNotThrow(() => validate(p));
  assert.equal(
    E.compareMatch(p, "envelope").items[0].result,
    "intentional_change",
  );
});
test("相同观察值只说明记录相同", () => {
  const p = scenario();
  p.observations[1].value = "左手";
  assert.equal(E.compareMatch(p, "envelope").items[0].result, "matches");
});
test("更正观察保留旧记录并改变比较依据", () => {
  const p = scenario(),
    old = clone(p);
  p.observations.push({
    ...p.observations[1],
    id: "corrected",
    value: "左手",
    supersedes_id: "obs-b",
  });
  validate(p);
  E.validateTransition(p, old);
  assert.equal(E.compareMatch(p, "envelope").items[0].result, "matches");
  assert.ok(E.compareMatch(p, "envelope").stale);
  assert.equal(p.observations[1].value, "右手");
});
test("观察更正成环拒绝", () => {
  const p = scenario();
  p.observations[0].supersedes_id = "obs-a";
  assert.throws(() => validate(p));
});
test("同观察分叉更正拒绝", () => {
  const p = scenario();
  p.observations.push(
    { ...p.observations[0], id: "c1", supersedes_id: "obs-a" },
    { ...p.observations[0], id: "c2", supersedes_id: "obs-a" },
  );
  assert.throws(() => validate(p));
});
test("更正不能换主体或条次", () => {
  const p = scenario();
  p.observations.push({
    ...p.observations[0],
    id: "wrong",
    subject: "别人",
    supersedes_id: "obs-a",
  });
  assert.throws(() => validate(p));
});
test("不能用整本保存删除或覆盖条次", () => {
  const old = scenario(),
    p = clone(old);
  p.takes[0].roll = "伪改";
  assert.throws(() => E.validateTransition(p, old));
  p.takes = [];
  assert.throws(() => E.validateTransition(p, old));
});
test("不能改写旧观察", () => {
  const old = scenario(),
    p = clone(old);
  p.observations[0].value = "伪改";
  assert.throws(() => E.validateTransition(p, old));
});
test("选择不同镜次的条次拒绝", () => {
  const p = scenario();
  p.selections[0].take_id = "take-a";
  assert.throws(() => validate(p));
});
test("镜次改变后旧比较待复核", () => {
  const p = scenario(),
    old = clone(p);
  p.shots[0].action = "新的动作";
  validate(p);
  E.validateTransition(p, old);
  assert.deepEqual(E.check(p).stale_match_ids, ["envelope"]);
});
test("新比较不能用旧摘要", () => {
  const p = scenario(),
    old = clone(p);
  p.matches[0].title = "新比较";
  p.matches[0].basis_sha256 = "0".repeat(64);
  assert.throws(() => E.validateTransition(p, old));
});
test("明确更新依据后比较恢复", () => {
  const p = scenario();
  p.shots[0].action = "新动作";
  const old = clone(p);
  p.matches[0].basis_sha256 = E.matchBasis(p, p.matches[0]);
  assert.doesNotThrow(() => E.validateTransition(p, old));
  assert.equal(E.check(p).stale_match_ids.length, 0);
});
test("固定意见在目标变化后过期", () => {
  const p = scenario();
  p.shots[0].action = "改变";
  assert.deepEqual(E.check(p).stale_note_ids, ["note"]);
});
test("完整阅读保留条次声明和两端观察", () => {
  const text = E.reading(scenario());
  assert.ok(text.includes("没有真实拍摄"));
  assert.ok(text.includes("右手"));
  assert.ok(text.includes("左手"));
});
