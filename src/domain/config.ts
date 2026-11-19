export const config = {
  fields: {
    evidence: "evidence",
    scene: "scenes",
    shot: "shots",
    take: "takes",
    observation: "observations",
    match: "matches",
    selection: "selections",
    note: "notes",
  },
  defaults: {
    brief: "",
    evidence: [],
    scenes: [],
    shots: [],
    takes: [],
    observations: [],
    matches: [],
    selections: [],
    notes: [],
  },
  tabs: ["场记阅读", "场次与条次", "连续性对照", "选择与复核", "场记交付"],
} as const;
