// Self-hosted profile cards. Runs in GitHub Actions, writes SVGs to dist/.
// No third-party services: data comes straight from the GitHub GraphQL API,
// so nothing breaks when a shared Vercel instance hits its rate limit.

import { mkdirSync, writeFileSync } from "node:fs";

const USER = process.env.GH_USER || "Ambar-Gupta22";
const FLAGSHIP = process.env.FLAGSHIP_REPO || "corvus";
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const OUT = process.env.OUT_DIR || "dist";
if (!TOKEN) throw new Error("GH_TOKEN / GITHUB_TOKEN is required");

// Tokyo Night
const C = {
  bg: "#1a1b27", panel: "#24283b", border: "#414868", fg: "#c0caf5", dim: "#565f89",
  muted: "#a9b1d6", blue: "#70a5fd", purple: "#bf91f3", teal: "#38bdae",
  orange: "#ff9e64", red: "#f7768e", green: "#9ece6a", yellow: "#e0af68",
};
const HEAT = ["#24283b", "#34487a", "#3d5fa8", "#5582e0", "#7aa2f7"];
const FONT = `'Segoe UI', Ubuntu, 'Helvetica Neue', Sans-Serif`;
const MONO = `'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace`;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const fmt = (n) => (n >= 10000 ? (n / 1000).toFixed(1).replace(/\.0$/, "") + "k" : n.toLocaleString("en-US"));

async function gql(query, variables = {}) {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `bearer ${TOKEN}`, "Content-Type": "application/json", "User-Agent": "profile-cards" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data;
}

// ───────────────────────────── data ─────────────────────────────

async function fetchData() {
  const { user } = await gql(
    `query($login:String!,$repo:String!){
      user(login:$login){
        name login createdAt
        followers{totalCount}
        pullRequests{totalCount}
        issues{totalCount}
        repositoriesContributedTo(contributionTypes:[COMMIT,PULL_REQUEST,ISSUE,REPOSITORY]){totalCount}
        repositories(first:100,ownerAffiliations:OWNER,isFork:false,privacy:PUBLIC,orderBy:{field:PUSHED_AT,direction:DESC}){
          totalCount
          nodes{ name stargazerCount forkCount
            languages(first:10,orderBy:{field:SIZE,direction:DESC}){edges{size node{name color}}} }
        }
        repository(name:$repo){
          name description stargazerCount forkCount url
          primaryLanguage{name color}
          licenseInfo{spdxId}
          repositoryTopics(first:6){nodes{topic{name}}}
          releases(last:1){nodes{tagName}}
          defaultBranchRef{target{... on Commit{ history(first:1){totalCount nodes{messageHeadline committedDate}} }}}
        }
      }
    }`,
    { login: USER, repo: FLAGSHIP },
  );

  // Contribution calendar for every year since the account was created.
  const startYear = new Date(user.createdAt).getUTCFullYear();
  const now = new Date();
  const days = [];
  let commitsThisYear = 0, totalContrib = 0;
  for (let y = startYear; y <= now.getUTCFullYear(); y++) {
    const from = new Date(Date.UTC(y, 0, 1)).toISOString();
    const to = y === now.getUTCFullYear() ? now.toISOString() : new Date(Date.UTC(y, 11, 31, 23, 59, 59)).toISOString();
    const { user: u } = await gql(
      `query($login:String!,$from:DateTime!,$to:DateTime!){
        user(login:$login){contributionsCollection(from:$from,to:$to){
          totalCommitContributions restrictedContributionsCount
          contributionCalendar{totalContributions weeks{contributionDays{date contributionCount}}}
        }}
      }`,
      { login: USER, from, to },
    );
    const cc = u.contributionsCollection;
    totalContrib += cc.contributionCalendar.totalContributions;
    if (y === now.getUTCFullYear()) commitsThisYear = cc.totalCommitContributions + cc.restrictedContributionsCount;
    for (const w of cc.contributionCalendar.weeks) for (const d of w.contributionDays) days.push(d);
  }
  const seen = new Set();
  const calendar = days
    .filter((d) => (seen.has(d.date) ? false : seen.add(d.date)))
    .sort((a, b) => a.date.localeCompare(b.date))
    .filter((d) => d.date <= now.toISOString().slice(0, 10));

  // Rolling 365-day window for the heatmap
  const { user: yr } = await gql(
    `query($login:String!){user(login:$login){contributionsCollection{
      contributionCalendar{totalContributions weeks{contributionDays{date contributionCount weekday}}}
    }}}`,
    { login: USER },
  );

  const repos = user.repositories.nodes;
  const langs = {};
  for (const r of repos)
    for (const e of r.languages.edges) {
      if (["Jupyter Notebook", "HTML", "CSS", "SCSS", "Makefile", "Batchfile"].includes(e.node.name)) continue;
      langs[e.node.name] ??= { size: 0, color: e.node.color || C.muted };
      langs[e.node.name].size += e.size;
    }

  return {
    name: user.name || user.login,
    createdAt: user.createdAt,
    followers: user.followers.totalCount,
    prs: user.pullRequests.totalCount,
    issues: user.issues.totalCount,
    contributedTo: user.repositoriesContributedTo.totalCount,
    repoCount: user.repositories.totalCount,
    stars: repos.reduce((s, r) => s + r.stargazerCount, 0),
    commitsThisYear,
    totalContrib,
    calendar,
    year: yr.contributionsCollection.contributionCalendar,
    langs: Object.entries(langs).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.size - a.size),
    flagship: user.repository,
  };
}

function streaks(calendar) {
  let longest = 0, run = 0, longestEnd = null;
  for (const d of calendar) {
    run = d.contributionCount > 0 ? run + 1 : 0;
    if (run > longest) { longest = run; longestEnd = d.date; }
  }
  // Current streak: today may still be empty, so don't break on it.
  let current = 0;
  for (let i = calendar.length - 1; i >= 0; i--) {
    if (calendar[i].contributionCount > 0) current++;
    else if (i === calendar.length - 1) continue;
    else break;
  }
  return { current, longest, longestEnd };
}

const timeAgo = (iso) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  for (const [u, n] of [["y", 31536000], ["mo", 2592000], ["d", 86400], ["h", 3600], ["m", 60]])
    if (s >= n) return `${Math.floor(s / n)}${u} ago`;
  return "just now";
};

// ───────────────────────────── svg helpers ─────────────────────────────

const frame = (w, h, body, extraCss = "") => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" role="img">
<style>
  text{font-family:${FONT};fill:${C.fg}}
  .mono{font-family:${MONO}}
  .title{font-size:17px;font-weight:600;fill:${C.blue}}
  .lbl{font-size:13px;fill:${C.muted}}
  .val{font-size:13px;font-weight:700;fill:${C.fg}}
  .dim{fill:${C.dim}}
  .fade{opacity:0;animation:fade .5s ease-out forwards}
  @keyframes fade{to{opacity:1}}
  ${extraCss}
</style>
<rect x="0.5" y="0.5" rx="10" width="${w - 1}" height="${h - 1}" fill="${C.bg}" stroke="${C.border}" stroke-opacity=".6"/>
${body}
</svg>`;

// Octicon paths (MIT, GitHub)
const ICON = {
  star: "M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z",
  commit: "M11.93 8.5a4.002 4.002 0 0 1-7.86 0H.75a.75.75 0 0 1 0-1.5h3.32a4.002 4.002 0 0 1 7.86 0h3.32a.75.75 0 0 1 0 1.5Zm-1.43-.75a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0Z",
  pr: "M1.5 3.25a2.25 2.25 0 1 1 3 2.122v5.256a2.251 2.251 0 1 1-1.5 0V5.372A2.25 2.25 0 0 1 1.5 3.25Zm5.677-.177L9.573.677A.25.25 0 0 1 10 .854V2.5h1A2.5 2.5 0 0 1 13.5 5v5.628a2.251 2.251 0 1 1-1.5 0V5a1 1 0 0 0-1-1h-1v1.646a.25.25 0 0 1-.427.177L7.177 3.427a.25.25 0 0 1 0-.354Z",
  issue: "M8 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0ZM1.5 8a6.5 6.5 0 1 0 13 0 6.5 6.5 0 0 0-13 0Z",
  repo: "M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.45-1.087a.249.249 0 0 0-.3 0L5.4 15.7a.25.25 0 0 1-.4-.2Z",
  fork: "M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z",
  flame: "M9.533.753V.752c.217 2.385 1.463 3.626 2.653 4.81C13.37 6.74 14.498 7.863 14.498 10c0 3.5-3 6-6.5 6S1.5 13.512 1.5 10c0-1.298.536-2.56 1.425-3.286.376-.308.862 0 1.035.454C4.46 8.487 5.581 9.5 6.5 9.5c.28 0 .5-.22.5-.5 0-1.5-.5-2.5-.5-4.5C6.5 2.143 8.26.62 9.533.753Z",
  people: "M2 5.5a3.5 3.5 0 1 1 5.898 2.549 5.508 5.508 0 0 1 3.034 4.084.75.75 0 1 1-1.482.235 4 4 0 0 0-7.9 0 .75.75 0 0 1-1.482-.236A5.507 5.507 0 0 1 3.102 8.05 3.493 3.493 0 0 1 2 5.5ZM11 4a3.001 3.001 0 0 1 2.22 5.018 5.01 5.01 0 0 1 2.56 3.012.749.749 0 0 1-.885.954.752.752 0 0 1-.549-.514 3.507 3.507 0 0 0-2.522-2.372.75.75 0 0 1-.574-.73v-.352a.75.75 0 0 1 .416-.672A1.5 1.5 0 0 0 11 5.5.75.75 0 0 1 11 4Zm-5.5-.5a2 2 0 1 0-.001 3.999A2 2 0 0 0 5.5 3.5Z",
  grid: "M1.75 1h3.5c.414 0 .75.336.75.75v3.5a.75.75 0 0 1-.75.75h-3.5A.75.75 0 0 1 1 5.25v-3.5C1 1.336 1.336 1 1.75 1Zm0 9h3.5c.414 0 .75.336.75.75v3.5a.75.75 0 0 1-.75.75h-3.5a.75.75 0 0 1-.75-.75v-3.5c0-.414.336-.75.75-.75Zm9-9h3.5c.414 0 .75.336.75.75v3.5a.75.75 0 0 1-.75.75h-3.5a.75.75 0 0 1-.75-.75v-3.5c0-.414.336-.75.75-.75Zm0 9h3.5c.414 0 .75.336.75.75v3.5a.75.75 0 0 1-.75.75h-3.5a.75.75 0 0 1-.75-.75v-3.5c0-.414.336-.75.75-.75Z",
};
const icon = (name, x, y, color = C.blue) => `<path transform="translate(${x} ${y})" fill="${color}" d="${ICON[name]}"/>`;

// ───────────────────────────── cards ─────────────────────────────

function statsCard(d, st) {
  const rows = [
    ["star", "Total stars earned", d.stars, C.yellow],
    ["commit", `Commits (${new Date().getUTCFullYear()})`, d.commitsThisYear, C.blue],
    ["grid", "All-time contributions", d.totalContrib, C.teal],
    ["pr", "Pull requests", d.prs, C.purple],
    ["flame", "Active days (last year)", d.year.weeks.flatMap((w) => w.contributionDays).filter((x) => x.contributionCount > 0).length, C.orange],
    ["repo", "Public repositories", d.repoCount, C.green],
  ];
  const body = rows
    .map(([ic, label, v, col], i) => {
      const y = 62 + i * 22;
      return `<g class="fade" style="animation-delay:${150 + i * 110}ms">${icon(ic, 25, y - 12, col)}<text x="50" y="${y}" class="lbl">${esc(label)}</text><text x="235" y="${y}" class="val">${fmt(v)}</text></g>`;
    })
    .join("\n");
  // streak ring
  const R = 46, circ = 2 * Math.PI * R, pct = Math.min(1, st.current / Math.max(st.longest, 1));
  const ring = `
  <g transform="translate(385 100)">
    <circle r="${R}" stroke="${C.panel}" stroke-width="7"/>
    <circle r="${R}" stroke="url(#g)" stroke-width="7" stroke-linecap="round" transform="rotate(-90)"
      stroke-dasharray="${circ}" stroke-dashoffset="${circ}" style="animation:ring 1.4s ease-out .3s forwards"/>
    ${icon("flame", -8, -R - 8 - 4, C.orange).replace("<path", `<path style="paint-order:stroke" stroke="${C.bg}" stroke-width="4"`)}
    <text y="8" text-anchor="middle" style="font-size:28px;font-weight:800;fill:${C.fg}">${st.current}</text>
    <text y="26" text-anchor="middle" class="lbl" style="font-size:11px">day streak</text>
    <text y="${R + 26}" text-anchor="middle" class="lbl" style="font-size:11px">longest <tspan style="fill:${C.orange};font-weight:700">${st.longest}</tspan> days</text>
  </g>
  <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="${C.orange}"/><stop offset="1" stop-color="${C.red}"/></linearGradient></defs>`;
  return frame(
    495, 200,
    `<text x="25" y="33" class="title">${esc(d.name)}'s GitHub Stats</text>\n${body}\n${ring}`,
    `@keyframes ring{to{stroke-dashoffset:${circ * (1 - pct)}}}`,
  );
}

function langsCard(d) {
  const top = d.langs.slice(0, 8);
  const total = top.reduce((s, l) => s + l.size, 0) || 1;
  let x = 25;
  const W = 300;
  const bar = top
    .map((l) => {
      const w = Math.max(2, (l.size / total) * W);
      const r = `<rect x="${x.toFixed(1)}" y="48" width="${w.toFixed(1)}" height="8" fill="${l.color}"/>`;
      x += w;
      return r;
    })
    .join("");
  const legend = top
    .map((l, i) => {
      const cx = 25 + (i % 2) * 155, cy = 82 + Math.floor(i / 2) * 25;
      return `<g class="fade" style="animation-delay:${200 + i * 90}ms"><circle cx="${cx + 5}" cy="${cy - 4}" r="5" fill="${l.color}"/><text x="${cx + 16}" y="${cy}" class="lbl" style="font-size:12px">${esc(l.name)} <tspan class="dim">${((l.size / total) * 100).toFixed(1)}%</tspan></text></g>`;
    })
    .join("\n");
  return frame(
    350, 200,
    `<text x="25" y="33" class="title">Most Used Languages</text>
<mask id="m"><rect x="25" y="48" width="${W}" height="8" rx="4" fill="#fff"/></mask>
<g mask="url(#m)">${bar}</g>
${legend}`,
  );
}

function heatmapCard(d, st) {
  const weeks = d.year.weeks;
  const cell = 12, gap = 3, left = 44, top = 62;
  const W = left + weeks.length * (cell + gap) + 24, H = top + 7 * (cell + gap) + 52;
  const max = Math.max(1, ...weeks.flatMap((w) => w.contributionDays.map((x) => x.contributionCount)));
  const lvl = (n) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)));
  let best = { contributionCount: 0 };
  let cells = "", months = "", lastMonth = -1, lastMonthWi = -9;
  weeks.forEach((w, wi) => {
    const first = new Date(w.contributionDays[0].date);
    if (first.getUTCMonth() !== lastMonth && wi < weeks.length - 2 && wi - lastMonthWi >= 3) {
      lastMonthWi = wi;
      lastMonth = first.getUTCMonth();
      months += `<text x="${left + wi * (cell + gap)}" y="${top - 10}" class="lbl" style="font-size:11px">${first.toLocaleString("en-US", { month: "short", timeZone: "UTC" })}</text>`;
    }
    for (const day of w.contributionDays) {
      if (day.contributionCount > best.contributionCount) best = day;
      const x = left + wi * (cell + gap), y = top + day.weekday * (cell + gap);
      // diagonal wave reveal
      cells += `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="3" fill="${HEAT[lvl(day.contributionCount)]}" class="c" style="animation-delay:${(wi * 18 + day.weekday * 30)}ms"><title>${day.date}: ${day.contributionCount} contributions</title></rect>`;
    }
  });
  const days = ["", "Mon", "", "Wed", "", "Fri", ""]
    .map((t, i) => (t ? `<text x="${left - 10}" y="${top + i * (cell + gap) + 10}" text-anchor="end" class="lbl" style="font-size:11px">${t}</text>` : ""))
    .join("");
  const legend = HEAT.map((c, i) => `<rect x="${W - 130 + i * 16}" y="${H - 30}" width="12" height="12" rx="3" fill="${c}"/>`).join("");
  const active = weeks.flatMap((w) => w.contributionDays).filter((x) => x.contributionCount > 0).length;
  const header = `<text x="24" y="34" class="title">${fmt(d.year.totalContributions)} contributions in the last year</text>
<text x="${W - 24}" y="34" text-anchor="end" class="lbl" style="font-size:12px">
  <tspan style="fill:${C.orange};font-weight:700">${st.current}</tspan> current streak ·
  <tspan style="fill:${C.purple};font-weight:700">${st.longest}</tspan> longest ·
  <tspan style="fill:${C.teal};font-weight:700">${active}</tspan> active days</text>`;
  const footer = `<text x="24" y="${H - 20}" class="lbl" style="font-size:11px">Best day: <tspan class="val" style="font-size:11px">${best.contributionCount}</tspan> on ${best.date ?? "—"} · updated ${new Date().toISOString().slice(0, 10)}</text>
<text x="${W - 136}" y="${H - 20}" text-anchor="end" class="lbl" style="font-size:11px">Less</text>${legend}
<text x="${W - 24}" y="${H - 20}" text-anchor="end" class="lbl" style="font-size:11px">More</text>`;
  return frame(W, H, `${header}\n${months}\n${days}\n${cells}\n${footer}`,
    `.c{opacity:0;animation:pop .35s ease-out forwards}@keyframes pop{from{opacity:0;transform:scale(.4)}to{opacity:1;transform:scale(1)}}.c{transform-box:fill-box;transform-origin:center}`);
}

function activityCard(d) {
  const last = d.calendar.slice(-31);
  const W = 850, H = 300, L = 50, R = 25, T = 60, B = 50;
  const max = Math.max(4, ...last.map((x) => x.contributionCount));
  const niceMax = Math.ceil(max / 4) * 4;
  const px = (i) => L + (i * (W - L - R)) / (last.length - 1);
  const py = (v) => T + (1 - v / niceMax) * (H - T - B);
  const pts = last.map((x, i) => [px(i), py(x.contributionCount)]);
  // smooth path (Catmull-Rom → Bézier)
  let path = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, Math.min(py(0), p1[1] + (p2[1] - p0[1]) / 6)];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, Math.min(py(0), p2[1] - (p3[1] - p1[1]) / 6)];
    path += ` C${c1.map((n) => n.toFixed(1))} ${c2.map((n) => n.toFixed(1))} ${p2.map((n) => n.toFixed(1))}`;
  }
  const area = `${path} L${px(last.length - 1)},${py(0)} L${px(0)},${py(0)} Z`;
  const grid = [0, 1, 2, 3, 4]
    .map((k) => {
      const v = (niceMax / 4) * k, y = py(v);
      return `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="${C.panel}" stroke-dasharray="${k ? "3 4" : "0"}"/><text x="${L - 10}" y="${y + 4}" text-anchor="end" class="lbl" style="font-size:11px">${v}</text>`;
    })
    .join("");
  const xl = last
    .map((x, i) => (i % 3 === 0 ? `<text x="${px(i)}" y="${H - B + 20}" text-anchor="middle" class="lbl" style="font-size:11px">${x.date.slice(8)}</text>` : ""))
    .join("");
  const dots = pts.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="3.5" fill="${C.bg}" stroke="${C.fg}" stroke-width="2" class="fade" style="animation-delay:${900 + i * 30}ms"><title>${last[i].date}: ${last[i].contributionCount}</title></circle>`).join("");
  const sum = last.reduce((s, x) => s + x.contributionCount, 0);
  const len = 3000;
  return frame(W, H,
    `<text x="25" y="34" class="title">Contribution activity · last 31 days</text>
<text x="${W - 25}" y="34" text-anchor="end" class="lbl" style="font-size:12px"><tspan style="fill:${C.purple};font-weight:700">${sum}</tspan> contributions</text>
<defs><linearGradient id="a" x1="0" x2="0" y1="0" y2="1"><stop stop-color="${C.purple}" stop-opacity=".45"/><stop offset="1" stop-color="${C.purple}" stop-opacity="0"/></linearGradient>
<linearGradient id="l" x1="0" x2="1"><stop stop-color="${C.blue}"/><stop offset="1" stop-color="${C.purple}"/></linearGradient></defs>
${grid}${xl}
<path d="${area}" fill="url(#a)" class="fade" style="animation-delay:700ms"/>
<path d="${path}" stroke="url(#l)" stroke-width="2.5" fill="none" stroke-dasharray="${len}" stroke-dashoffset="${len}" style="animation:draw 1.6s ease-out forwards"/>
${dots}`,
    `@keyframes draw{to{stroke-dashoffset:0}}`);
}

function wrap(text, max) {
  const words = String(text || "").split(/\s+/);
  const lines = [""];
  for (const w of words) {
    if ((lines.at(-1) + " " + w).trim().length > max) lines.push(w);
    else lines[lines.length - 1] = (lines.at(-1) + " " + w).trim();
  }
  return lines;
}

function flagshipCard(d) {
  const r = d.flagship;
  const desc = wrap(r.description, 62).slice(0, 3);
  const head = r.defaultBranchRef?.target?.history;
  const last = head?.nodes?.[0];
  const topics = r.repositoryTopics.nodes.map((n) => n.topic.name).slice(0, 5);
  let tx = 25;
  const chips = topics
    .map((t) => {
      const w = t.length * 6.6 + 16;
      const s = `<rect x="${tx}" y="${56 + desc.length * 18}" width="${w}" height="20" rx="10" fill="${C.panel}"/><text x="${tx + w / 2}" y="${70 + desc.length * 18}" text-anchor="middle" style="font-size:11px;fill:${C.blue}">${esc(t)}</text>`;
      tx += w + 6;
      return s;
    })
    .join("");
  const H = 130 + desc.length * 18;
  const fy = H - 24;
  const release = r.releases.nodes[0]?.tagName;
  return frame(495, H,
    `${icon("repo", 25, 20, C.blue)}
<text x="48" y="33" class="title">${esc(r.name)}</text>
${release ? `<rect x="${58 + r.name.length * 9.5}" y="19" width="${release.length * 7 + 14}" height="18" rx="9" stroke="${C.teal}"/><text x="${65 + r.name.length * 9.5}" y="32" style="font-size:11px;fill:${C.teal}">${esc(release)}</text>` : ""}
<text x="470" y="33" text-anchor="end" class="lbl" style="font-size:11px">${esc(r.licenseInfo?.spdxId || "")}</text>
${desc.map((l, i) => `<text x="25" y="${64 + i * 18}" class="lbl">${esc(l)}</text>`).join("")}
${chips}
<line x1="25" x2="470" y1="${fy - 20}" y2="${fy - 20}" stroke="${C.panel}"/>
<circle cx="31" cy="${fy - 4}" r="6" fill="${r.primaryLanguage?.color || C.blue}"/>
<text x="43" y="${fy}" class="lbl" style="font-size:12px">${esc(r.primaryLanguage?.name || "")}</text>
${icon("star", 95, fy - 12, C.yellow)}<text x="116" y="${fy}" class="lbl" style="font-size:12px">${r.stargazerCount}</text>
${icon("fork", 145, fy - 12, C.muted)}<text x="166" y="${fy}" class="lbl" style="font-size:12px">${r.forkCount}</text>
${icon("commit", 195, fy - 12, C.purple)}<text x="216" y="${fy}" class="lbl" style="font-size:12px">${head?.totalCount ?? 0} commits · last ${last ? timeAgo(last.committedDate) : "—"}</text>`);
}

// Animated neofetch-style terminal. The raven is corvus's namesake.
function terminalCard(d, st, top) {
  const years = ((Date.now() - new Date(d.createdAt)) / 31557600000).toFixed(1);
  const lastCommit = d.flagship.defaultBranchRef?.target?.history?.nodes?.[0];
  const raven = [
    "        .--.        ",
    "       /  o \\__     ",
    "      |    ___/>    ",
    "      |   (         ",
    "     /    \\\\        ",
    "    /  /\\  \\\\       ",
    "   /  /  \\  \\\\      ",
    "  (__/    \\__)\\     ",
    "     ||    ||       ",
    "    _||_  _||_      ",
  ];
  const info = [
    ["", `<tspan fill="${C.purple}" font-weight="700">ambar</tspan><tspan fill="${C.fg}">@</tspan><tspan fill="${C.blue}" font-weight="700">icici</tspan>`],
    ["", `<tspan fill="${C.dim}">──────────────────────────────</tspan>`],
    ["Role", "Software Development Engineer @ ICICI"],
    ["Building", "corvus — C++17 AI agent runtime"],
    ["Stack", "C++ · TypeScript · Node · Postgres · Redis"],
    ["Infra", "Docker · RabbitMQ · Nginx · Prometheus"],
    ["Education", "B.Tech ECE, NIT Surat (SVNIT) '26"],
    ["LeetCode", "1000+ solved · 1800 rating · top 8%"],
    ["Langs", top.slice(0, 3).map((l) => l.name).join(" · ")],
    ["Contribs", `${fmt(d.year.totalContributions)} last year · ${st.current}d streak 🔥`],
    ["Uptime", `${years} years on GitHub`],
    ["Last push", lastCommit ? `${wrap(lastCommit.messageHeadline, 34)[0]}${lastCommit.messageHeadline.length > 34 ? "…" : ""} (${timeAgo(lastCommit.committedDate)})` : "—"],
  ];
  const W = 850, lh = 20, top0 = 92;
  const H = top0 + info.length * lh + 70;
  const prompt = `<text x="24" y="66" class="mono" style="font-size:14px"><tspan fill="${C.green}">➜</tspan> <tspan fill="${C.teal}">~</tspan> <tspan fill="${C.fg}" class="type">neofetch --user ambar</tspan></text>`;
  const art = raven
    .map((l, i) => `<text x="34" y="${top0 + 14 + i * lh}" class="mono ln" style="font-size:14px;fill:${i < 3 ? C.blue : C.purple};white-space:pre;animation-delay:${1200 + i * 60}ms" xml:space="preserve">${esc(l)}</text>`)
    .join("\n");
  const lines = info
    .map(([k, v], i) => {
      const y = top0 + i * lh;
      const content = k ? `<tspan fill="${C.blue}" font-weight="700">${k}</tspan><tspan fill="${C.fg}">: ${esc(v)}</tspan>` : v;
      return `<text x="290" y="${y}" class="mono ln" style="font-size:14px;animation-delay:${1300 + i * 110}ms">${content}</text>`;
    })
    .join("\n");
  const palette = [C.red, C.orange, C.yellow, C.green, C.teal, C.blue, C.purple, C.fg]
    .map((c, i) => `<rect x="${290 + i * 26}" y="${top0 + info.length * lh - 4}" width="24" height="14" fill="${c}" class="ln" style="animation-delay:${1300 + info.length * 110}ms"/>`)
    .join("");
  const cursorY = top0 + info.length * lh + 36;
  const bar = `<rect x="0.5" y="0.5" width="${W - 1}" height="34" rx="10" fill="${C.panel}"/><rect x="0.5" y="24" width="${W - 1}" height="11" fill="${C.panel}"/>
<circle cx="22" cy="17" r="6" fill="${C.red}"/><circle cx="42" cy="17" r="6" fill="${C.yellow}"/><circle cx="62" cy="17" r="6" fill="${C.green}"/>
<text x="${W / 2}" y="22" text-anchor="middle" class="mono" style="font-size:12px;fill:${C.dim}">ambar@icici: ~ — zsh — ${W / 10}×${Math.round(H / 20)}</text>`;
  return frame(W, H,
    `${bar}
${prompt}
${art}
${lines}
${palette}
<text x="24" y="${cursorY}" class="mono ln" style="font-size:14px;animation-delay:${1500 + info.length * 110}ms"><tspan fill="${C.green}">➜</tspan> <tspan fill="${C.teal}">~</tspan> <tspan fill="${C.dim}">./corvus run --agent "hire-ambar"</tspan></text>
<rect x="${24 + 37 * 8.43}" y="${cursorY - 13}" width="9" height="17" fill="${C.fg}" class="blink"/>`,
    `.type{clip-path:inset(0 100% 0 0);animation:type 1s steps(21) .2s forwards}
@keyframes type{to{clip-path:inset(0 0 0 0)}}
.ln{opacity:0;animation:fade .25s ease-out forwards}
.blink{opacity:0;animation:blink 1s steps(1) ${(1.8 + info.length * 0.11).toFixed(2)}s infinite}
@keyframes blink{0%{opacity:1}50%{opacity:0}}`);
}

// ───────────────────────────── main ─────────────────────────────

const d = await fetchData();
const st = streaks(d.calendar);
mkdirSync(OUT, { recursive: true });
const out = {
  "stats.svg": statsCard(d, st),
  "languages.svg": langsCard(d),
  "heatmap.svg": heatmapCard(d, st),
  "activity.svg": activityCard(d),
  "flagship.svg": flagshipCard(d),
  "terminal.svg": terminalCard(d, st, d.langs),
};
for (const [f, svg] of Object.entries(out)) writeFileSync(`${OUT}/${f}`, svg);
console.log(`wrote ${Object.keys(out).length} cards · ${d.totalContrib} all-time contributions · streak ${st.current}/${st.longest}`);
