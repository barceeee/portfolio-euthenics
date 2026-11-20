// Work Immersion portfolio sections (EUTHENICS 2, Requirement 4), rendered from data/immersion.json.
import { h, has, safeUrl, linkAttrs, devNote } from "./common.js";

export async function loadImmersion() {
  try {
    const res = await fetch("/data/immersion.json", { cache: "no-cache" });
    return res.ok ? res.json() : null;
  } catch { return null; }
}

/** Numbered section wrapper: "01 Professional Profile". */
export function part(id, num, title, lead, ...children) {
  return h("section", { class: "part", id, "aria-labelledby": `${id}-title` },
    h("header", { class: "part__head reveal" },
      h("span", { class: "part__num", "aria-hidden": "true" }, typeof num === "number" ? String(num).padStart(2, "0") : num),
      h("div", {},
        h("h2", { class: "section__title", id: `${id}-title` }, title),
        lead ? h("p", { class: "section__lead" }, lead) : null)),
    ...children);
}

const link = (text, href) => (safeUrl(href) ? h("a", { href: safeUrl(href), ...linkAttrs(safeUrl(href)) }, text) : text);

/* ---------- 1. Professional profile: objective + immersion goals (the About card sits above) ---------- */
export function renderGoals(data) {
  if (!data) return null;
  return h("div", { class: "goals reveal" },
    has(data.careerObjective) ? h("article", { class: "panel" },
      h("h3", { class: "panel__title" }, "Career objective"),
      h("p", {}, data.careerObjective)) : null,
    has(data.immersionGoals) ? h("article", { class: "panel" },
      h("h3", { class: "panel__title" }, "Work Immersion goals"),
      h("ol", { class: "ticks" }, data.immersionGoals.map((g) => h("li", {}, g)))) : null);
}

/* ---------- 2. Résumé / CV ---------- */
export function renderResume(data, profile) {
  const r = data?.resume;
  if (!r) return devNote("Add a \"resume\" object to data/immersion.json.");
  const block = (title, ...body) => h("section", { class: "cv__block" }, h("h3", { class: "cv__label" }, title), ...body);
  return h("div", { class: "cv-wrap reveal" },
    h("div", { class: "cv-actions" },
      h("button", { class: "btn btn--primary btn--small", type: "button", onclick: () => window.print() }, "⎙ Print or save as PDF")),
    h("article", { class: "cv", "aria-label": "Résumé" },
      h("header", { class: "cv__head" },
        has(profile.photo) ? h("img", { class: "cv__photo", src: profile.photo, alt: "", width: 88, height: 88, loading: "lazy" }) : null,
        h("div", {},
          h("p", { class: "cv__name" }, profile.name),
          h("p", { class: "cv__role" }, profile.headline))),
      h("div", { class: "cv__grid" },
        h("div", {},
          block("Personal information", h("dl", { class: "facts cv__facts" }, (r.personal || []).flatMap((p) => [
            h("dt", {}, p.label), h("dd", {}, p.href ? link(p.value, p.href) : p.value)]))),
          block("Skills", ...Object.entries(r.skills || {}).map(([group, list]) => h("div", { class: "cv__skills" },
            h("p", { class: "cv__sub" }, group), h("ul", { class: "chips" }, list.map((s) => h("li", {}, s))))))),
        h("div", {},
          block("Educational background", h("ul", { class: "cv__list" }, (r.education || []).map((e) =>
            h("li", {}, h("b", {}, e.title), h("span", {}, e.place), h("span", { class: "cv__muted" }, e.period))))),
          block("Achievements", h("ul", { class: "cv__bullets" }, (r.achievements || []).map((a) => h("li", {}, a)))),
          block("Certifications", h("ul", { class: "cv__bullets" }, (r.certifications || []).map((c) => h("li", {}, c))))))));
}

/* ---------- 4. Academic achievements (timeline under the certificate + education rows) ---------- */
export function renderAchievements(data) {
  const list = data?.achievements || [];
  return h("div", { class: "achievements reveal" },
    h("h3", { class: "row__title" }, "Awards, trainings & recognitions"),
    list.length ? h("ol", { class: "timeline" }, list.map((a) => h("li", { class: "timeline__item" },
      h("span", { class: "timeline__type" }, a.type),
      h("b", { class: "timeline__title" }, a.title),
      h("span", { class: "timeline__meta" }, [a.org, a.date].filter(has).join(" · ")),
      has(a.description) ? h("p", {}, a.description) : null))) : null,
    devNote("Add seminars, workshops, awards or Dean's List recognitions to \"achievements\" in data/immersion.json (type, title, org, date, description)."));
}

/* ---------- 6. Company & HTE evaluation ---------- */
const avg = (r, criteria) => criteria.reduce((s, c) => s + (r[c.key] || 0), 0) / criteria.length;
const stars = (n) => h("span", { class: "stars", role: "img", "aria-label": `${n} out of 5` },
  Array.from({ length: 5 }, (_, i) => h("i", { class: i < Math.round(n) ? "on" : "", "aria-hidden": "true" }, "★")));

export function renderHte(data) {
  const hte = data?.hte;
  if (!hte) return devNote("Add an \"hte\" object to data/immersion.json.");
  const { criteria, companies } = hte;
  const scored = companies.map((c) => ({ ...c, score: avg(c.ratings, criteria) }));
  const best = Math.max(...scored.map((c) => c.score));
  const top = scored.find((c) => c.id === hte.recommendation?.company) || scored.find((c) => c.score === best);

  const criteriaList = h("div", { class: "hte__criteria reveal" },
    h("h3", { class: "row__title" }, "Evaluation criteria"),
    h("ul", { class: "criteria" }, criteria.map((c) => h("li", {}, h("b", {}, c.label), h("span", {}, c.description)))));

  const cards = h("ul", { class: "companies" }, scored.map((c, i) => h("li", { class: "company reveal", style: `--hue:${c.hue};--delay:${i * 80}ms` },
    h("header", { class: "company__head" },
      h("span", { class: "company__logo", "aria-hidden": "true" }, c.monogram),
      h("div", {},
        h("p", { class: "company__rank" }, `Choice #${i + 1}${c === top ? " · Recommended" : ""}`),
        h("h3", { class: "company__name" }, c.name),
        h("p", { class: "company__industry" }, c.industry)),
      h("p", { class: "company__score" }, h("b", {}, c.score.toFixed(1)), h("span", {}, "/ 5"))),
    h("p", { class: "company__bg" }, c.background),
    h("details", { class: "company__more" },
      h("summary", {}, "Full evaluation"),
      h("h4", {}, "Learning & training opportunities"), h("ul", {}, c.learning.map((x) => h("li", {}, x))),
      h("div", { class: "proscons" },
        h("div", {}, h("h4", {}, "Advantages"), h("ul", { class: "pros" }, c.pros.map((x) => h("li", {}, x)))),
        h("div", {}, h("h4", {}, "Disadvantages"), h("ul", { class: "cons" }, c.cons.map((x) => h("li", {}, x))))),
      h("h4", {}, "Accessibility & convenience"), h("p", {}, c.accessibility),
      h("h4", {}, "Potential for career growth"), h("p", {}, c.growth)))));

  const table = h("div", { class: "hte__table reveal" },
    h("h3", { class: "row__title" }, "Comparative analysis"),
    h("div", { class: "table-scroll", tabindex: "0", role: "region", "aria-label": "Comparative analysis table" },
      h("table", { class: "compare" },
        h("thead", {}, h("tr", {}, h("th", { scope: "col" }, "Criterion"), scored.map((c) => h("th", { scope: "col", class: c === top ? "is-top" : "" }, c.name)))),
        h("tbody", {}, criteria.map((k) => h("tr", {},
          h("th", { scope: "row" }, k.label),
          scored.map((c) => h("td", { class: c === top ? "is-top" : "" }, stars(c.ratings[k.key]), h("span", { class: "num" }, String(c.ratings[k.key]))))))),
        h("tfoot", {}, h("tr", {}, h("th", { scope: "row" }, "Overall rating"),
          scored.map((c) => h("td", { class: c === top ? "is-top" : "" }, h("b", {}, c.score.toFixed(1)), " / 5")))))));

  const rec = hte.recommendation ? h("article", { class: "recommend reveal", style: `--hue:${top.hue}` },
    h("p", { class: "recommend__kicker" }, "✓ Final recommendation"),
    h("h3", { class: "recommend__name" }, top.name),
    h("p", {}, hte.recommendation.summary),
    has(hte.recommendation.backup) ? h("p", { class: "recommend__backup" }, hte.recommendation.backup) : null) : null;

  const qa = has(hte.guideQuestions) ? h("div", { class: "hte__qa reveal" },
    h("h3", { class: "row__title" }, "Guide questions"),
    h("dl", { class: "qa" }, hte.guideQuestions.flatMap((g) => [h("dt", {}, g.q), h("dd", {}, g.a)]))) : null;

  return h("div", { class: "hte" }, criteriaList, cards, table, rec, qa);
}

/* ---------- 7. Reflection ---------- */
export function renderReflection(data) {
  const r = data?.reflection;
  if (!r) return null;
  const words = r.paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
  return h("article", { class: "reflection reveal" },
    h("p", { class: "reflection__q" }, `“${r.question}”`),
    ...r.paragraphs.map((p) => h("p", {}, p)),
    h("p", { class: "reflection__count" }, `${words} words`));
}

/* ---------- Bonus: career development plan ---------- */
export function renderCareerPlan(data) {
  const plan = data?.careerPlan || [];
  if (!plan.length) return null;
  return h("ol", { class: "plan" }, plan.map((s, i) => h("li", { class: "plan__step reveal", style: `--delay:${i * 80}ms` },
    h("span", { class: "plan__when" }, s.when),
    h("b", { class: "plan__title" }, s.title),
    h("p", {}, s.description))));
}

/* ---------- 8. Contact ---------- */
export function renderContact(data, profile) {
  const items = [
    has(profile.email) && ["✉", "Email", profile.email, `mailto:${profile.email}`],
    ...(profile.socials || []).filter((s) => safeUrl(s.url)).map((s) => ["↗", s.label, safeUrl(s.url).replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, ""), s.url]),
    has(profile.location) && ["📍", "Location", profile.location, null],
    ["🎓", "School", "STI College Alabang", null],
  ].filter(Boolean);
  const noLinkedIn = !(profile.socials || []).some((s) => /linkedin/i.test(s.label) && safeUrl(s.url));
  return h("div", { class: "contact reveal" },
    has(data?.contact?.note) ? h("p", { class: "contact__note" }, data.contact.note) : null,
    h("ul", { class: "contact__list" }, items.map(([icon, label, value, href]) => h("li", { class: "contact__item" },
      h("span", { class: "contact__icon", "aria-hidden": "true" }, icon),
      h("span", {}, h("span", { class: "contact__label" }, label), href ? link(value, href) : h("span", {}, value))))),
    noLinkedIn ? devNote("Add your LinkedIn URL to \"socials\" in data/profile.json (bonus points in the rubric).") : null);
}

/* ---------- Sources ---------- */
export function renderSources(data) {
  const src = data?.sources || [];
  if (!src.length) return null;
  return h("section", { class: "section sources", id: "sources", "aria-labelledby": "sources-title" },
    h("h2", { class: "row__title", id: "sources-title" }, "Sources & references"),
    h("ol", {}, src.map((s) => h("li", {}, link(s.label, s.url)))));
}
