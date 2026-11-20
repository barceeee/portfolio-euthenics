import { loadImmersion, part, renderGoals, renderResume, renderAchievements, renderHte, renderReflection, renderCareerPlan, renderContact, renderSources } from "./immersion.js";
import { h, has, isDev, safeUrl, loadSite, caseStudyUrl, initials, initNav, renderBrand, renderFooter, setCanonical, devNote, reducedMotion, pauseHeroWhenOffscreen, loadLanguages, repoLanguages, languageBar, linkAttrs, opensNewTab } from "./common.js";

let GH = null; // GitHub language data

const main = document.getElementById("main");
const dialog = document.getElementById("details");

init().catch((err) => {
  console.error(err);
  main.replaceChildren(h("p", { class: "state" }, "Couldn’t load the portfolio data. If you opened the file directly, run a local server (see README)."));
});

async function init() {
  initNav();
  const { profile, categories } = await loadSite();
  renderBrand(profile);
  renderFooter(profile);
  setCanonical(profile);
  document.title = profile.name ? `${profile.name} — Work Immersion Portfolio` : "Work Immersion Portfolio";

  const all = categories.flatMap((c) => c.items);
  const featured = all.find((i) => i.featured) || all[0];
  GH = await loadLanguages();
  const skills = await fetch("/data/skills.json", { cache: "no-cache" }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const imm = await loadImmersion();
  const pick = (...ids) => categories.filter((c) => ids.includes(c.id));

  // The 8 sections EUTHENICS 2 Requirement 4 asks for, in its order (+ the bonus career plan).
  renderNavLinks();
  main.replaceChildren(
    renderHero(featured, profile, categories),
    part("profile", 1, "Professional Profile", "Who I am, what I am aiming for, and what I want to get out of Work Immersion.",
      renderAbout(profile), renderGoals(imm)),
    part("resume", 2, "Résumé", "My curriculum vitae at a glance. Print it or save it as a PDF.",
      renderResume(imm, profile)),
    part("skills", 3, "Skills Showcase", "Technical skills ranked by how much I have used them, the soft skills behind them, and the tools I build with.",
      renderTop10(skills), renderSoftSkills(skills), ...clustered(pick("languages"))),
    part("achievements", 4, "Academic Achievements", "Certificates, trainings and recognitions, with the scans to back them up. Open a card to see the full certificate.",
      ...clustered(pick("certifications", "education")), renderAchievements(imm)),
    part("work", 5, "Work Samples & Projects", "My best outputs: a capstone, client work and personal projects. Most can be opened as a live site or a playable demo.",
      ...clustered(pick("capstone", "freelancing", "projects")), renderCaseStudies(categories)),
    part("hte", 6, "Company & HTE Evaluation", imm?.hte?.lead, renderHte(imm)),
    part("reflection", 7, "Reflection", "On preparing for Work Immersion.", renderReflection(imm)),
    part("career-plan", "+", "Career Development Plan", "Where I plan to be in the next 3 to 5 years.", renderCareerPlan(imm)),
    part("contact", 8, "Contact Information", null, renderContact(imm, profile)),
    renderSources(imm)
  );
  observeEntrances();
  pauseHeroWhenOffscreen();
  initScrollSpy();
}

/* ---------- Nav scroll-spy: highlight the section you're reading, with a sliding bar ---------- */
function initScrollSpy() {
  const ul = document.querySelector(".nav__links");
  const links = [...ul.querySelectorAll('a[href^="#"]')];
  const sections = links.map((a) => document.getElementById(a.getAttribute("href").slice(1))).filter(Boolean);
  if (!sections.length) return;

  const bar = h("span", { class: "nav__indicator", "aria-hidden": "true" });
  ul.append(bar);
  let current = "";
  const activeLinks = () => links.filter((a) => a.getAttribute("aria-current"));

  // The bar spans every active link (side-by-side sections are active together).
  function moveBar(active) {
    if (!active.length) { bar.style.opacity = "0"; return; }
    const left = Math.min(...active.map((a) => a.offsetLeft));
    const right = Math.max(...active.map((a) => a.offsetLeft + a.offsetWidth));
    // transform only (no width/left animation): scaleX from a 100px-wide bar
    bar.style.transform = `translateX(${left}px) scaleX(${(right - left) / 100})`;
    bar.style.opacity = "1";
  }
  function setActive(ids) {
    const key = ids.join(",");
    if (key === current) return;
    current = key;
    for (const a of links) {
      if (ids.includes(a.getAttribute("href").slice(1))) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    }
    const active = activeLinks();
    moveBar(active);
    // keep the active link(s) visible in the side-scrolling nav on small screens
    if (active.length && ul.scrollWidth > ul.clientWidth) {
      const target = active[0].offsetLeft - 24;
      ul.scrollTo({ left: Math.max(0, target), behavior: reducedMotion() ? "auto" : "smooth" });
    }
  }

  // Current section = the last one whose top has passed a line a third of the way down the screen
  // (at the very bottom of the page, the last section). Checked at most once per frame while scrolling.
  function update() {
    const line = innerHeight * 0.35;
    const tops = sections.map((s) => s.getBoundingClientRect().top);
    let i = -1;
    tops.forEach((t, k) => { if (t <= line) i = k; });
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) i = sections.length - 1;
    if (i < 0) return setActive([]);
    // sections level with it are side by side (one row on wide screens): highlight them together
    setActive(sections.filter((s, k) => Math.abs(tops[k] - tops[i]) < 8).map((s) => s.id));
  }
  let queued = false;
  addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; update(); }); } }, { passive: true });
  update();

  addEventListener("resize", () => { moveBar(activeLinks()); update(); }, { passive: true });
  if (document.fonts) document.fonts.ready.then(() => moveBar(activeLinks()));
}

/* ---------- Stats strip (computed from the data, nothing hard-coded) ---------- */
function computeStats(categories) {
  const byId = Object.fromEntries(categories.map((c) => [c.id, c.items]));
  const work = ["capstone", "freelancing", "projects"].flatMap((id) => byId[id] || []);
  const live = work.filter((i) => /vercel\.app|https?:\/\//.test(i.caseStudy?.liveUrl || "") || /live/i.test(i.link?.label || "")).length;
  return [
    [work.length, work.length === 1 ? "project" : "projects"],
    [live, live === 1 ? "live site" : "live sites"],
    [(byId.freelancing || []).length, "freelance builds"],
    [(byId.certifications || []).length, (byId.certifications || []).length === 1 ? "certification" : "certifications"],
    [(byId.languages || []).length, "languages & tools"],
  ].filter(([n]) => n > 0);
}

/* ---------- Top 10 row (Netflix-style ranked posters) — hard skills from data/skills.json ---------- */
const HARD_CAT = { id: "hard-skills", title: "Hard Skills", hue: 350, details: [{ key: "shownIn", label: "Shown in" }] };

function renderTop10(skills) {
  const items = (skills?.hard || []).slice(0, 10).map((s) => ({ ...s, _cat: HARD_CAT }));
  if (!items.length) return null;
  const top = { title: skills.hardTitle || "Top 10 Hard Skills" };
  const track = h("ol", { class: "row__track top10__track", "aria-labelledby": "top10-title" },
    items.map((item, i) => h("li", { class: "top10__item", style: `--i:${i}` },
      h("span", { class: "top10__num", "aria-hidden": "true" }, String(i + 1)),
      h("button", { class: "top10__poster", type: "button", style: `--hue:${(200 + i * 37) % 360}`, "aria-haspopup": "dialog",
        "aria-label": `Number ${i + 1}: ${item.title}`, onclick: (e) => openDetails(item, e.currentTarget) },
        h("span", { class: "top10__art", "aria-hidden": "true" }, cardArt(item)),
        h("span", { class: "top10__label" },
          h("span", { class: "top10__name" }, item.title),
          h("span", { class: "top10__meta" }, skillMeta(item)))))));
  return h("section", { class: "row row--top10", id: "row-top10", style: "--hue:350" },
    h("div", { class: "row__head" },
      h("h2", { class: "row__title top10__title", id: "top10-title" }, h("span", { class: "top10__badge" }, "TOP", h("b", {}, "10")), top.title)),
    withArrows(track, top.title));
}

function skillMeta(item) {
  const shown = item.shownIn || item.usedIn || [];
  return shown.length ? `Shown in ${shown.slice(0, 2).join(", ")}${shown.length > 2 ? ` +${shown.length - 2}` : ""}` : [item.level, item.group].filter(has).join(" · ");
}

/* ---------- About me ---------- */
function renderAbout(profile) {
  if (!has(profile.bio)) return null;
  const facts = [
    has(profile.location) && ["📍", profile.location, null],
    has(profile.email) && ["✉", profile.email, `mailto:${profile.email}`],
    ...(profile.socials || []).filter((s) => safeUrl(s.url)).map((s) => ["↗", s.label, safeUrl(s.url)]),
  ].filter(Boolean);
  return h("section", { class: "about reveal", id: "about", "aria-labelledby": "about-title" },
    has(profile.photo) ? h("img", { class: "about__photo", src: profile.photo, alt: profile.name || "", width: 112, height: 112, loading: "lazy" }) : null,
    h("div", { class: "about__body" },
      h("h2", { class: "row__title", id: "about-title" }, "About me"),
      h("p", { class: "about__bio" }, profile.bio),
      facts.length ? h("ul", { class: "about__facts" }, facts.map(([icon, text, href]) =>
        h("li", {}, h("span", { "aria-hidden": "true" }, icon), " ",
          href ? h("a", { href, ...linkAttrs(href) }, text) : text))) : null));
}

/* ---------- Soft skills strip ---------- */
function renderSoftSkills(skills) {
  const soft = skills?.soft || [];
  if (!soft.length) return null;
  return h("section", { class: "soft reveal", id: "soft-skills", "aria-labelledby": "soft-title" },
    h("h2", { class: "row__title", id: "soft-title" }, skills.softTitle || "Soft Skills"),
    h("ul", { class: "soft__list" }, soft.map((s, i) =>
      h("li", { class: "soft__item", style: `--hue:${(350 + i * 47) % 360}` },
        h("span", { class: "soft__icon", "aria-hidden": "true" }, s.icon || "★"),
        h("span", { class: "soft__text" }, h("b", {}, s.title), has(s.evidence) ? h("span", {}, s.evidence) : null)))));
}

/* Scroll arrows for any horizontal track (mouse users can't side-scroll with a wheel). */
function withArrows(track, title) {
  const prev = h("button", { class: "row__arrow row__arrow--prev", type: "button", "aria-label": `Scroll ${title} left`, hidden: true, onclick: () => page(-1) }, "‹");
  const next = h("button", { class: "row__arrow row__arrow--next", type: "button", "aria-label": `Scroll ${title} right`, onclick: () => page(1) }, "›");
  function page(dir) { track.scrollBy({ left: dir * track.clientWidth * 0.85, behavior: reducedMotion() ? "auto" : "smooth" }); }
  function sync() {
    prev.hidden = track.scrollLeft <= 4;
    next.hidden = track.scrollLeft >= track.scrollWidth - track.clientWidth - 4;
  }
  track.addEventListener("scroll", sync, { passive: true });
  new ResizeObserver(sync).observe(track);
  return h("div", { class: "row__viewport" }, prev, track, next);
}

/* ---------- Hero ---------- */
function renderHero(item, profile, categories) {
  const hue = item?._cat.hue ?? 350;
  const cover = safeUrl(item?.image);
  const section = h("section", { class: `hero${cover ? " hero--cover" : ""}`, style: `--hue:${hue}`, "aria-labelledby": "hero-title" },
    h("div", { class: "hero__art", "aria-hidden": "true" },
      cover ? h("img", { class: "hero__cover", src: cover, alt: "" }) : null,
      h("span", { class: "hero__blob hero__blob--a" }), h("span", { class: "hero__blob hero__blob--b" })));

  if (!item) {
    section.append(h("div", { class: "hero__content" }, h("h1", { id: "hero-title", class: "hero__title reveal" }, profile.name || "Portfolio")));
    return section;
  }
  const url = caseStudyUrl(item);
  const stats = computeStats(categories);
  section.append(h("div", { class: "hero__content" },
    renderIntro(profile),
    h("p", { class: "hero__eyebrow reveal" }, h("b", {}, item.badge || "Featured"), ` · ${item._cat.title}`),
    h("h1", { id: "hero-title", class: "hero__title reveal", style: "--delay:80ms" }, item.shortTitle || item.title),
    item.shortTitle ? h("p", { class: "hero__subtitle reveal", style: "--delay:160ms" }, item.title) : null,
    has(item.description) ? h("p", { class: "hero__desc reveal", style: "--delay:220ms" }, item.description) : null,
    h("div", { class: "hero__actions reveal", style: "--delay:300ms" },
      url ? h("a", { class: "btn btn--primary", href: url }, "▶ View case study") : null,
      h("button", { class: "btn btn--ghost", type: "button", onclick: (e) => openDetails(item, e.currentTarget) }, "ⓘ More info")),
    stats.length ? h("ul", { class: "stats reveal", style: "--delay:380ms", "aria-label": "At a glance" },
      stats.map(([n, label]) => h("li", {}, h("b", {}, String(n)), h("span", {}, label)))) : null
  ));
  return section;
}

function renderIntro(profile) {
  if (!has(profile.bio) && !has(profile.name)) return null;
  return h("div", { class: "intro reveal", "aria-label": "About" },
    has(profile.photo) ? h("img", { class: "intro__photo", src: profile.photo, alt: "", width: 44, height: 44, onerror: (e) => e.currentTarget.remove() }) : null,
    h("p", { class: "intro__text" }, h("strong", {}, profile.name), profile.headline ? h("span", {}, profile.headline) : null),
    has(profile.email) ? h("a", { class: "intro__email", href: `mailto:${profile.email}`, title: profile.email }, "✉ Email me") : null);
}

function renderNavLinks() {
  const ul = document.querySelector(".nav__links");
  const links = [["profile", "Profile"], ["resume", "Résumé"], ["skills", "Skills"], ["achievements", "Achievements"],
    ["work", "Projects"], ["hte", "HTE Evaluation"], ["reflection", "Reflection"], ["career-plan", "Career Plan"], ["contact", "Contact"]];
  ul.replaceChildren(...links.map(([id, label]) => h("li", {}, h("a", { href: `#${id}` }, label))));
}

/* Consecutive categories sharing a "cluster" (categories.json) sit side by side on wide screens. */
function clustered(categories) {
  const out = [];
  let group = null;
  for (const cat of categories) {
    const row = renderRow(cat);
    if (!row) continue;
    // Each row's card count sizes its column, so every card in the cluster ends up the same width.
    row.style.setProperty("--n", Math.max(1, cat.items.length));
    if (cat.cluster && group?.key === cat.cluster) { group.el.append(row); group.counts.push(Math.max(1, cat.items.length)); continue; }
    group = cat.cluster ? { key: cat.cluster, el: h("div", { class: "row-cluster" }, row), counts: [Math.max(1, cat.items.length)] } : null;
    if (group) group.el._counts = group.counts;
    out.push(group ? group.el : row);
  }
  out.forEach((el) => {
    if (!el.classList?.contains("row-cluster")) return;
    el.style.setProperty("--cols", el.children.length);
    el.style.setProperty("--cluster-cols", el._counts.map((n) => `minmax(0, ${n}fr)`).join(" "));
  });
  return out;
}

/* Overall language mix across every GitHub repository (+ private ones listed by hand). */
function githubSummary() {
  if (!GH) return null;
  const n = Object.keys(GH.repos || {}).length + Object.keys(GH.manual || {}).length;
  const caption = h("span", {}, `Code across my ${n} GitHub repositories`, GH.updated ? ` · updated ${GH.updated} · ` : " · ",
    h("a", { href: `https://github.com/${GH.user || ""}`, ...linkAttrs(`https://github.com/${GH.user || ""}`) }, "github.com/" + (GH.user || "") + " ↗"));
  const bar = languageBar(repoLanguages(GH), { caption });
  if (!bar) return null;
  // Bytes favour big repos, so also show how many repositories use each language.
  const count = {};
  for (const langs of [...Object.values(GH.repos || {}), ...Object.values(GH.manual || {})])
    for (const l of Object.keys(langs)) count[l] = (count[l] || 0) + 1;
  const names = { PLpgSQL: "PL/pgSQL", TSQL: "T-SQL" };
  bar.append(h("p", { class: "langbar__counts" }, h("span", {}, "Repositories using each: "),
    Object.entries(count).sort((a, b) => b[1] - a[1]).flatMap(([l, n], i) => [i ? " · " : "", h("b", {}, names[l] || l), ` ${n}`])));
  return bar;
}

/* ---------- Rows ---------- */
function renderRow(cat) {
  if (!cat.items.length && !isDev) return null;
  if (!cat.groups) return renderTrackRow(cat, cat.items, { id: `row-${cat.id}`, title: cat.title, level: "h2" });

  // A category split into sub-rows (e.g. Frontend / Backend / Database).
  const rows = cat.groups
    .map((g) => [g, cat.items.filter((i) => i.group === g)])
    .filter(([, items]) => items.length)
    .map(([g, items]) => renderTrackRow(cat, items, { id: `row-${cat.id}-${g.toLowerCase()}`, title: g, level: "h3" }));
  return h("section", { class: "row-group", id: `row-${cat.id}`, "aria-labelledby": `row-${cat.id}-heading` },
    h("h2", { class: "row-group__title", id: `row-${cat.id}-heading` }, cat.title),
    cat.id === "languages" ? githubSummary() : null,
    h("div", { class: "row-group__rows" }, rows));
}

function renderTrackRow(cat, items, { id, title, level }) {
  const titleId = `${id}-title`;
  const track = h("ul", { class: "row__track", "aria-labelledby": titleId });

  if (!items.length) {
    track.append(h("li", { style: "--i:0" }, h("div", { class: "card card--empty" },
      h("span", {}, "No entries yet — add them to ", h("code", {}, `data/${cat.file}`)))));
  }
  items.forEach((item, i) => track.append(h("li", { style: `--i:${Math.min(i, 8)}` }, renderCard(item))));

  return h("section", { class: `row${level === "h3" ? " row--sub" : ""}`, id, style: `--hue:${cat.hue}` },
    h("div", { class: "row__head" },
      h(level, { class: "row__title", id: titleId }, title),
      h("span", { class: "row__count" }, items.length ? `${items.length} ${items.length === 1 ? "item" : "items"}` : "")),
    withArrows(track, title));
}

const cardMeta = (item) => [item.issuer || item.client, item.date].filter(has).join(" · ") || [item.level, item.years].filter(has).join(" · ");

// Optional per-item crop, e.g. "imagePosition": "center" (default: top of the screenshot).
const imagePos = (item) => (/^[a-z0-9% .-]+$/i.test(item.imagePosition || "") ? `object-position:${item.imagePosition}` : null);

function cardArt(item) {
  if (safeUrl(item.image)) return h("img", { src: safeUrl(item.image), alt: "", loading: "lazy", style: imagePos(item) });
  if (safeUrl(item.icon)) return h("img", { class: "card__icon", src: safeUrl(item.icon), alt: "", loading: "lazy" });
  return h("span", { class: "card__monogram" }, (item.monogram || initials(item.shortTitle || item.title)));
}

/* Netflix-style tags in the hover panel: the first few tech-stack entries, dot-separated. */
function cardTags(item) {
  const tags = (Array.isArray(item.techStack) ? item.techStack : []).filter(has).slice(0, 3);
  if (!tags.length) return null;
  return h("span", { class: "card__tags" }, tags.map((t) => h("span", {}, t)));
}

function renderCard(item) {
  const meta = cardMeta(item);
  const art = h("div", { class: `card__art${item.icon && !item.image ? " card__art--icon" : ""}`, "aria-hidden": "true" }, cardArt(item));
  return h("button", { class: "card", type: "button", style: `--hue:${item._cat.hue}`, "aria-haspopup": "dialog", onclick: (e) => openDetails(item, e.currentTarget) },
    art,
    has(item.badge) ? h("span", { class: "card__badge" }, item.badge) : null,
    h("span", { class: "card__body" },
      h("span", { class: "card__title" }, item.shortTitle || item.title),
      meta ? h("span", { class: "card__meta" }, meta) : null,
      h("span", { class: "card__preview" }, h("div", {},
        has(item.description) ? h("span", { class: "card__desc" }, item.description) : null,
        cardTags(item),
        h("span", { class: "card__hint" }, caseStudyUrl(item) ? "Details · case study →" : "Details →")))));
}

/* ---------- Case studies (Freelancing + Capstone) ---------- */
function renderCaseStudies(categories) {
  const items = categories.filter((c) => ["freelancing", "capstone"].includes(c.id)).flatMap((c) => c.items).filter((i) => i.slug);
  const list = h("ul", { class: "cases" }, items.map((item, i) =>
    h("li", { class: "reveal", style: `--delay:${i * 80}ms` },
      h("a", { class: "case", href: caseStudyUrl(item), style: `--hue:${item._cat.hue}` },
        h("span", { class: "case__kicker" }, [item._cat.title, item.date].filter(has).join(" · ")),
        h("h3", { class: "case__title" }, item.shortTitle || item.title),
        has(item.description) ? h("p", { class: "case__desc" }, item.description) : null,
        h("span", { class: "case__cta" }, "Read case study →")))));

  if (!items.length && !isDev) return null;
  return h("section", { class: "cases-wrap", id: "case-studies", "aria-labelledby": "cs-title" },
    h("h3", { class: "row__title reveal", id: "cs-title" }, "Case studies"),
    h("p", { class: "section__lead reveal" }, "In-depth write-ups: the problem, the stack, what I built and how it turned out."),
    items.length ? list : devNote("Add entries with a \"slug\" to data/freelancing.json and data/capstone.json and they appear here, each with its own page at /projects/<slug>."));
}

/* ---------- Details dialog ---------- */
function openDetails(item, opener) {
  const cat = item._cat;
  const facts = (cat.details || []).filter((d) => has(item[d.key]));
  const url = caseStudyUrl(item);
  const link = item.link && safeUrl(item.link.url);

  const meta = [item.issuer || item.client, item.date].filter(has).join(" · ");
  const cert = safeUrl(item.certificateImage);
  dialog.replaceChildren(
    h("div", { class: `dialog__art card__art${item.icon ? " card__art--icon" : ""}`, style: `--hue:${cat.hue}` },
      item.icon ? cardArt(item) : h("span", { class: "card__monogram", "aria-hidden": "true" }, (item.monogram || initials(item.shortTitle || item.title))),
      h("button", { class: "dialog__close", type: "button", "aria-label": "Close", onclick: () => dialog.close() }, "×")),
    h("div", { class: "dialog__body" },
      h("p", { class: "dialog__kicker" }, [cat.title, item.group].filter(has).join(" · ")),
      h("h2", { class: "dialog__title", id: "details-title" }, item.title),
      meta ? h("p", { class: "dialog__meta" }, meta) : null,
      has(item.description) ? h("p", { class: "dialog__desc" }, item.description) : null,
      cert ? h("a", { class: "dialog__cert", href: cert, ...linkAttrs(cert) },
        h("img", { src: cert, alt: `Scan of the ${item.title} certificate`, loading: "lazy" }),
        h("span", {}, "Open full size ↗")) : null,
      facts.length ? h("dl", { class: "facts" }, facts.flatMap((d) => [
        h("dt", {}, d.label),
        h("dd", {}, Array.isArray(item[d.key]) ? h("ul", { class: "chips" }, item[d.key].map((v) => h("li", {}, v))) : item[d.key]),
      ])) : null,
      item.repo ? languageBar(repoLanguages(GH, item.repo), { caption: "Languages in the repository (as GitHub counts them)" }) : null,
      h("div", { class: "dialog__actions" },
        url ? h("a", { class: "btn btn--primary btn--small", href: url }, "View case study") : null,
        link ? h("a", { class: "btn btn--ghost btn--small", href: link, ...linkAttrs(link) }, `${item.link.label || "Open link"}${opensNewTab(link) ? " ↗" : ""}`) : null)));

  dialog.setAttribute("aria-labelledby", "details-title");
  dialog.showModal();
  dialog.addEventListener("close", () => opener?.focus(), { once: true });
}
dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });

/* ---------- Scroll entrances ---------- */
function observeEntrances() {
  const targets = document.querySelectorAll(".reveal, .row, .row-group");
  if (reducedMotion() || !("IntersectionObserver" in window)) {
    targets.forEach((t) => t.classList.add("is-in"));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
  targets.forEach((t) => io.observe(t));
}
