const morningNews = [
  {
    id: "digital-governance",
    title: "数字治理与公共服务能力提升",
    category: "科技",
    summary: "围绕数字政府、政务服务一体化、数据共享和基层治理效率提升，整理可用于政治与公共管理类答题的材料。",
    point: "可联系国家治理体系和治理能力现代化、以人民为中心、服务型政府建设。",
    keywords: ["数字政府", "公共服务", "治理能力"],
    sourceName: "示例模板",
    sourceUrl: "",
  },
  {
    id: "employment",
    title: "就业优先与民生保障",
    category: "社会",
    summary: "关注高校毕业生就业、技能培训、新就业形态劳动者权益保障等民生议题。",
    point: "可从共同富裕、社会保障、发展为了人民、稳定宏观经济大盘等角度展开。",
    keywords: ["就业优先", "民生", "共同富裕"],
    sourceName: "示例模板",
    sourceUrl: "",
  },
  {
    id: "green-development",
    title: "绿色发展与生态文明建设",
    category: "生态",
    summary: "围绕碳达峰碳中和、生态保护修复、绿色产业和美丽中国建设形成专题素材。",
    point: "可联系新发展理念、人与自然和谐共生、中国式现代化的生态维度。",
    keywords: ["绿色发展", "生态文明", "双碳"],
    sourceName: "示例模板",
    sourceUrl: "",
  },
  {
    id: "new-quality",
    title: "新质生产力与高质量发展",
    category: "经济",
    summary: "关注科技创新、产业升级、实体经济、现代化产业体系等经济热点。",
    point: "可从创新驱动发展战略、高质量发展、供给侧结构性改革角度答题。",
    keywords: ["新质生产力", "高质量发展", "科技创新"],
    sourceName: "示例模板",
    sourceUrl: "",
  },
  {
    id: "grassroots",
    title: "基层治理与社会协同",
    category: "政治",
    summary: "整理社区治理、网格化服务、矛盾纠纷化解、群众路线等基层治理材料。",
    point: "可联系全过程人民民主、基层民主、共建共治共享的社会治理格局。",
    keywords: ["基层治理", "群众路线", "全过程人民民主"],
    sourceName: "示例模板",
    sourceUrl: "",
  },
  {
    id: "domestic-rural",
    title: "乡村全面振兴与县域发展",
    category: "社会",
    summary: "关注农业现代化、县域公共服务、城乡融合和乡村治理能力提升。",
    point: "可联系中国式现代化、共同富裕、城乡融合发展和基层治理。",
    keywords: ["乡村振兴", "城乡融合", "县域治理"],
    sourceName: "示例模板",
    sourceUrl: "",
  },
  {
    id: "domestic-consumption",
    title: "扩大内需与消费提振",
    category: "经济",
    summary: "整理消费升级、服务消费、文旅消费和以旧换新等政策材料。",
    point: "可从构建新发展格局、扩大内需战略、民生改善角度分析。",
    keywords: ["扩大内需", "消费", "新发展格局"],
    sourceName: "示例模板",
    sourceUrl: "",
  },
  {
    id: "domestic-education",
    title: "教育强国与人才培养",
    category: "社会",
    summary: "关注教育公平、职业教育、拔尖创新人才培养和高校毕业生发展。",
    point: "可联系科教兴国、人才强国、教育公平和现代化建设。",
    keywords: ["教育强国", "人才", "教育公平"],
    sourceName: "示例模板",
    sourceUrl: "",
  },
  {
    id: "domestic-security",
    title: "国家安全与应急治理",
    category: "政治",
    summary: "围绕总体国家安全观、公共安全、风险治理和应急管理形成材料。",
    point: "可联系统筹发展和安全、治理能力现代化、防范化解重大风险。",
    keywords: ["国家安全", "应急治理", "风险防范"],
    sourceName: "示例模板",
    sourceUrl: "",
  },
  {
    id: "domestic-culture",
    title: "文化自信与文化强国",
    category: "政治",
    summary: "关注中华优秀传统文化传承、公共文化服务和文化产业发展。",
    point: "可联系文化自信、社会主义核心价值观、精神文明建设。",
    keywords: ["文化自信", "文化强国", "公共文化"],
    sourceName: "示例模板",
    sourceUrl: "",
  },
  {
    id: "global-climate",
    title: "全球气候治理与国际合作",
    category: "生态",
    summary: "整理气候变化、绿色转型、国际环境治理合作等国外热点。",
    point: "可联系人类命运共同体、全球治理、中国担当。",
    keywords: ["气候治理", "全球合作", "绿色转型"],
    sourceName: "示例模板",
    sourceUrl: "",
  },
  {
    id: "global-ai",
    title: "人工智能治理与科技竞争",
    category: "科技",
    summary: "关注人工智能监管、技术伦理、产业竞争和国际规则制定。",
    point: "可从科技自立自强、数字治理、全球科技治理角度分析。",
    keywords: ["人工智能", "科技治理", "技术伦理"],
    sourceName: "示例模板",
    sourceUrl: "",
  },
  {
    id: "global-economy",
    title: "世界经济复苏与供应链稳定",
    category: "经济",
    summary: "关注国际贸易、产业链供应链、通胀和全球经济不确定性。",
    point: "可联系开放型世界经济、双循环、新发展格局。",
    keywords: ["世界经济", "供应链", "开放发展"],
    sourceName: "示例模板",
    sourceUrl: "",
  },
  {
    id: "global-health",
    title: "全球公共卫生治理",
    category: "社会",
    summary: "整理公共卫生合作、疫病防控、医疗资源公平等国际议题。",
    point: "可联系全球治理、人类命运共同体、公共产品供给。",
    keywords: ["公共卫生", "全球治理", "公共产品"],
    sourceName: "示例模板",
    sourceUrl: "",
  },
  {
    id: "global-conflict",
    title: "国际冲突与和平发展",
    category: "政治",
    summary: "关注地区冲突、和平倡议、多边主义和国际秩序变化。",
    point: "可联系和平发展道路、多边主义、国际关系民主化。",
    keywords: ["和平发展", "多边主义", "国际秩序"],
    sourceName: "示例模板",
    sourceUrl: "",
  },
];

const eveningNews = [
  {
    id: "evening-keywords",
    title: "晚间 5 分钟：只记三个关键词",
    category: "政治",
    summary: "从今天早报之外补充三个轻量关键词，不要求展开长篇材料。",
    point: "睡前只做记忆钩子：关键词、对应知识点、一个可用短句。",
    keywords: ["关键词", "轻复盘", "短句"],
    sourceName: "示例模板",
    sourceUrl: "",
  },
  {
    id: "evening-sentence",
    title: "写一句万能答题句",
    category: "社会",
    summary: "把今天看到的热点压缩成一句能放进主观题的表达。",
    point: "例：推进治理现代化，关键在于把制度优势转化为治理效能。",
    keywords: ["答题句", "治理效能", "复盘"],
    sourceName: "示例模板",
    sourceUrl: "",
  },
  {
    id: "evening-mistake",
    title: "回看一个易混概念",
    category: "经济",
    summary: "晚上不再新增大量新闻，只区分一组容易混淆的概念。",
    point: "适合区分：高质量发展、新发展理念、新发展格局。",
    keywords: ["概念辨析", "轻量", "经济"],
    sourceName: "示例模板",
    sourceUrl: "",
  },
  {
    id: "evening-case",
    title: "收藏一个案例素材",
    category: "生态",
    summary: "只保留一个案例标签，明天早上再展开细节。",
    point: "案例用途：论证政策落地、治理创新或发展理念。",
    keywords: ["案例", "生态文明", "素材"],
    sourceName: "示例模板",
    sourceUrl: "",
  },
];

const stateKey = "kaoyan-news-site-state";
const userNewsKey = "kaoyan-news-user-news";
const finalizedArchiveKey = "kaoyan-news-finalized-archive-v1";
const siteLaunchDate = "2026-07-10";
const shanghaiOffsetMs = 8 * 60 * 60 * 1000;
const state = JSON.parse(localStorage.getItem(stateKey) || "{}");
let customNews = JSON.parse(localStorage.getItem(userNewsKey) || "[]");
let finalizedArchive = JSON.parse(localStorage.getItem(finalizedArchiveKey) || "{}");
let activeFilter = "全部";
let activeEdition = getEditionForNow();
let activeDate = getDateKey(new Date());
let remoteNews = [];
let feedMessage = "正在尝试抓取最新新闻...";
let reportStatus = "loading";
let loadingNews = false;
let newsRequestVersion = 0;
let backfillStarted = false;
let releaseRefreshTimer = null;

const newsList = document.querySelector("#newsList");
const resultCount = document.querySelector("#resultCount");
const searchInput = document.querySelector("#searchInput");
const savedCount = document.querySelector("#savedCount");
const progressBar = document.querySelector("#progressBar");
const editionName = document.querySelector("#editionName");
const editionHint = document.querySelector("#editionHint");
const nextPush = document.querySelector("#nextPush");
const pushHint = document.querySelector("#pushHint");
const dateInput = document.querySelector("#dateInput");
const feedStatus = document.querySelector("#feedStatus");
const refreshNews = document.querySelector("#refreshNews");
const articleDialog = document.querySelector("#articleDialog");
const articleDialogContent = document.querySelector("#articleDialogContent");
const closeArticle = document.querySelector("#closeArticle");

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeUrl(value = "", localAllowed = false) {
  const url = String(value || "").trim();
  if (localAllowed && /^(?:data\/images|assets)\/[a-z0-9._/-]+$/i.test(url)) return url;
  try {
    const parsed = new URL(url, window.location.href);
    return ["http:", "https:"].includes(parsed.protocol) ? parsed.href : "";
  } catch {
    return "";
  }
}

function teaserFor(item, limit = 116) {
  const text = String(item.overview || item.summary || item.point || "")
    .replace(/^据\S+\s+\d{4}-\d{2}-\d{2}报道[，,]?/, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > limit ? `${text.slice(0, limit).replace(/[，,。；;：:]?$/, "")}…` : text;
}

function imageMarkup(item, className = "story-image") {
  const imageUrl = safeUrl(item.imageUrl, true);
  const alt = escapeHtml(item.imageAlt || item.title || "新闻图片");
  const source = escapeHtml(item.imageSource || item.sourceName || "新闻来源");
  return `
    <figure class="${className} ${imageUrl ? "" : "failed"}">
      ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${alt}" loading="lazy" decoding="async">` : ""}
      <div class="image-fallback"><span>${escapeHtml(item.category || "时政")}</span><strong>KAOYAN NEWS</strong></div>
      ${imageUrl ? `<figcaption>图片来源：${source}</figcaption>` : ""}
    </figure>
  `;
}

function sourceMarkup(item, includeLink = false) {
  const sourceUrl = safeUrl(item.sourceUrl);
  return `
    <div class="source-line">
      <span>${escapeHtml(item.sourceName || "未标注来源")}</span>
      ${item.sourceVerified ? "<span>原文正文提炼</span>" : ""}
      ${item.translated ? "<span>已译为中文</span>" : ""}
      ${includeLink && sourceUrl ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener">查看新闻原文</a>` : ""}
    </div>
  `;
}

function saveButtonMarkup(item) {
  const saved = Boolean(state[`saved-${item.id}`]);
  return `<button class="save ${saved ? "active" : ""}" type="button" data-save="${escapeHtml(item.id)}" aria-label="${saved ? "取消收藏" : "收藏"}${escapeHtml(item.title)}">${saved ? "★" : "☆"}</button>`;
}

function openArticle(item) {
  if (!item) return;
  const sourceUrl = safeUrl(item.sourceUrl);
  articleDialogContent.innerHTML = `
    <article class="article-detail">
      <div class="detail-heading">
        <span class="tag">${escapeHtml(item.category || "时政")}</span>
        <h2 id="articleDialogTitle">${escapeHtml(item.title)}</h2>
        ${sourceMarkup(item, true)}
      </div>
      ${imageMarkup(item, "detail-image")}
      <section class="analysis-block overview"><strong>事件概述</strong><p>${escapeHtml(item.overview || item.summary)}</p></section>
      <section class="analysis-block"><strong>背景解释</strong><p>${escapeHtml(item.background || "这条新闻需要结合政策背景、现实问题和治理目标理解。")}</p></section>
      <section class="analysis-block"><strong>影响分析</strong><p>${escapeHtml(item.impact || "它体现了现实问题对政策执行、公共治理和社会发展的影响。")}</p></section>
      <section class="analysis-block keywords-block"><strong>考研政治关联点</strong><p>关键词：${escapeHtml((item.examKeywords || item.keywords || ["时政热点"]).join("、"))}。</p></section>
      <section class="analysis-block conclusion"><strong>分析结论</strong><p>${escapeHtml(item.conclusion || item.point)}</p></section>
      <footer class="detail-footer">
        <button type="button" data-save="${escapeHtml(item.id)}">${state[`saved-${item.id}`] ? "取消收藏" : "收藏这条新闻"}</button>
        ${sourceUrl ? `<a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener">前往来源网站</a>` : ""}
      </footer>
    </article>
  `;
  if (!articleDialog.open) articleDialog.showModal();
}

function getDateKey(date) {
  const shanghaiTime = new Date(date.getTime() + shanghaiOffsetMs);
  const year = shanghaiTime.getUTCFullYear();
  const month = String(shanghaiTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shanghaiTime.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getEditionForNow(now = new Date()) {
  const shanghaiTime = new Date(now.getTime() + shanghaiOffsetMs);
  return shanghaiTime.getUTCHours() >= 21 ? "evening" : "morning";
}

function usesStaticArchive() {
  const forcedStatic = new URLSearchParams(window.location.search).get("static") === "1";
  return forcedStatic || !["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
}

function reportKey(date, edition) {
  return `${date}-${edition}`;
}

function getStoredReport(date, edition) {
  const payload = finalizedArchive[reportKey(date, edition)];
  return Array.isArray(payload?.articles) ? payload : null;
}

function storeFinalizedReport(payload) {
  if (!payload?.date || !payload?.edition || !Array.isArray(payload.articles) || !payload.articles.length) return;
  finalizedArchive[reportKey(payload.date, payload.edition)] = payload;
  const entries = Object.entries(finalizedArchive)
    .sort(([, left], [, right]) => String(right.generatedAt || "").localeCompare(String(left.generatedAt || "")));
  finalizedArchive = Object.fromEntries(entries.slice(0, 30));
  try {
    localStorage.setItem(finalizedArchiveKey, JSON.stringify(finalizedArchive));
  } catch {
    // The remote archive remains usable if the browser's local storage is full.
  }
}

async function getLatestStaticReport() {
  const manifestResponse = await fetch("data/news/index.json", { cache: "no-store" });
  if (!manifestResponse.ok) return null;
  const manifest = await manifestResponse.json();
  if (!manifest?.latest?.file) return null;
  const reportResponse = await fetch(`data/news/${manifest.latest.file}`, { cache: "no-store" });
  if (!reportResponse.ok) return null;
  return reportResponse.json();
}

function getLocalReportAvailability(date, edition, now = new Date()) {
  const today = getDateKey(now);
  const label = edition === "evening" ? "晚报" : "早报";
  const releaseTime = edition === "evening" ? "21:00" : "07:00";
  const releaseAt = new Date(`${date}T${releaseTime}:00+08:00`);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(releaseAt.getTime())) {
    return { status: "unavailable", reason: "invalid_date", availableAt: null, message: "日期格式无效。" };
  }
  if (date < siteLaunchDate) {
    return {
      status: "unavailable",
      reason: "before_launch",
      availableAt: null,
      message: `本站自 ${siteLaunchDate} 起正式记录，之前暂无档案。`,
    };
  }
  if (date > today) {
    return {
      status: "unavailable",
      reason: "future_date",
      availableAt: null,
      message: "未来日期尚未到来，暂无新闻档案。",
    };
  }
  if (date === today && now.getTime() < releaseAt.getTime()) {
    return {
      status: "unreleased",
      reason: "before_release",
      availableAt: releaseAt.toISOString(),
      message: `未到推送时间，今日${label}将于 ${releaseTime} 发布。`,
    };
  }
  return { status: "available", reason: null, availableAt: releaseAt.toISOString(), message: `${label}已发布。` };
}

function getNextPush(now = new Date()) {
  const next = new Date(now);
  const hour = now.getHours();
  if (hour < 7) {
    next.setHours(7, 0, 0, 0);
    return { time: next, label: "早报" };
  }
  if (hour < 21) {
    next.setHours(21, 0, 0, 0);
    return { time: next, label: "晚报" };
  }
  next.setDate(next.getDate() + 1);
  next.setHours(7, 0, 0, 0);
  return { time: next, label: "早报" };
}

function allNews() {
  if (["loading", "unreleased", "unavailable"].includes(reportStatus)) return [];
  const base = activeEdition === "evening" ? eveningNews : morningNews;
  const archived = customNews.filter((item) => item.edition === activeEdition && item.date === activeDate);
  if (archived.length) return archived;
  if (remoteNews.length) return remoteNews;
  return base;
}

function emptyStateMarkup(query) {
  if (reportStatus === "loading") {
    return `<div class="feed-empty"><strong>正在准备新闻</strong><p>正在检查当前日期和版本的新闻档案。</p></div>`;
  }
  if (reportStatus === "unreleased") {
    return `<div class="feed-empty locked"><strong>未到推送时间</strong><p>${feedMessage}</p><small>到达发布时间后，本页会自动加载。</small></div>`;
  }
  if (reportStatus === "unavailable") {
    return `<div class="feed-empty locked"><strong>该日期暂无档案</strong><p>${feedMessage}</p></div>`;
  }
  if (query) {
    return `<div class="feed-empty"><strong>没有匹配结果</strong><p>请更换关键词或热点分类。</p></div>`;
  }
  return `<div class="feed-empty"><strong>暂时没有可用新闻</strong><p>可以稍后重新刷新。</p></div>`;
}

function saveState() {
  localStorage.setItem(stateKey, JSON.stringify(state));
}

function render() {
  const query = searchInput.value.trim();
  const filtered = allNews().filter((item) => {
    const matchFilter = activeFilter === "全部" || item.category === activeFilter;
    const haystack = [item.title, item.category, item.summary, item.point, item.sourceName, ...(item.keywords || [])].join(" ");
    return matchFilter && (!query || haystack.includes(query));
  });

  const lead = filtered.find((item) => safeUrl(item.imageUrl, true)) || filtered[0];
  const remainingStories = filtered.filter((item) => item !== lead);
  const leadMarkup = lead ? `
    <article class="lead-story">
      <div class="lead-copy">
        <div class="news-top"><span class="tag">${escapeHtml(lead.category)}</span>${saveButtonMarkup(lead)}</div>
        <button class="story-title lead-title" type="button" data-open="${escapeHtml(lead.id)}">${escapeHtml(lead.title)}</button>
        <p>${escapeHtml(teaserFor(lead, 170))}</p>
        ${sourceMarkup(lead)}
        <button class="read-more" type="button" data-open="${escapeHtml(lead.id)}">查看完整考研分析</button>
      </div>
      ${imageMarkup(lead, "lead-image")}
    </article>
  ` : "";
  const gridMarkup = remainingStories.map((item) => `
    <article class="news-card">
      ${imageMarkup(item)}
      <div class="card-copy">
        <div class="news-top"><span class="tag">${escapeHtml(item.category)}</span>${saveButtonMarkup(item)}</div>
        <button class="story-title" type="button" data-open="${escapeHtml(item.id)}">${escapeHtml(item.title)}</button>
        <p>${escapeHtml(teaserFor(item))}</p>
        ${sourceMarkup(item)}
        <button class="read-more" type="button" data-open="${escapeHtml(item.id)}">完整分析</button>
      </div>
    </article>
  `).join("");
  const newsMarkup = lead ? `${leadMarkup}<div class="story-grid">${gridMarkup}</div>` : "";
  newsList.innerHTML = newsMarkup || emptyStateMarkup(query);

  resultCount.textContent = reportStatus === "loading" ? "正在加载" : `${filtered.length} 条`;
  feedStatus.textContent = feedMessage;
  savedCount.textContent = Object.keys(state).filter((key) => key.startsWith("saved-") && state[key]).length;
  editionName.textContent = activeEdition === "evening" ? "晚报" : "早报";
  editionHint.textContent = activeEdition === "evening" ? "轻复盘，适合晚上 9 点后" : "重输入，适合早上 7 点到晚上 9 点";
  const reportLocked = ["unreleased", "unavailable"].includes(reportStatus);
  refreshNews.disabled = loadingNews || reportLocked;
  refreshNews.textContent = loadingNews ? "加载中..." : reportLocked ? "尚未发布" : "重新加载";
  updatePushClock();
}

function clearReleaseRefresh() {
  if (releaseRefreshTimer) clearTimeout(releaseRefreshTimer);
  releaseRefreshTimer = null;
}

function scheduleReleaseRefresh(availableAt, date, edition) {
  clearReleaseRefresh();
  const delay = new Date(availableAt).getTime() - Date.now();
  if (!Number.isFinite(delay) || delay <= 0) return;
  releaseRefreshTimer = setTimeout(() => {
    releaseRefreshTimer = null;
    if (activeDate === date && activeEdition === edition) loadRemoteNews(false);
  }, delay + 500);
}

async function loadRemoteNews(refresh = false) {
  const requestVersion = ++newsRequestVersion;
  const requestedDate = activeDate;
  const requestedEdition = activeEdition;
  const storedReport = getStoredReport(requestedDate, requestedEdition);
  const previousNews = remoteNews;
  const retainedNews = storedReport?.articles || previousNews;
  const keepFinalizedReport = (refresh && previousNews.length > 0) || Boolean(storedReport);
  clearReleaseRefresh();
  if (storedReport) {
    remoteNews = storedReport.articles;
    reportStatus = "available";
    feedMessage = `已显示本地定稿档案，生成时间 ${new Date(storedReport.generatedAt).toLocaleString()}`;
  } else if (!keepFinalizedReport) {
    remoteNews = [];
  }

  const localAvailability = getLocalReportAvailability(requestedDate, requestedEdition);
  if (localAvailability.status !== "available") {
    loadingNews = false;
    reportStatus = localAvailability.status;
    feedMessage = localAvailability.message;
    if (localAvailability.status === "unreleased") {
      scheduleReleaseRefresh(localAvailability.availableAt, requestedDate, requestedEdition);
    }
    render();
    return;
  }

  if (usesStaticArchive() && storedReport) {
    loadingNews = false;
    render();
    return;
  }

  loadingNews = true;
  if (!keepFinalizedReport) reportStatus = "loading";
  feedMessage = refresh ? "正在重新加载已定稿档案..." : "正在加载新闻档案...";
  render();
  try {
    const endpoint = usesStaticArchive()
      ? `data/news/${reportKey(requestedDate, requestedEdition)}.json`
      : `/api/news?${new URLSearchParams({ date: requestedDate, edition: requestedEdition }).toString()}`;
    const response = await fetch(endpoint, { cache: refresh ? "no-store" : "default" });
    if (usesStaticArchive() && response.status === 404) {
      const fallback = await getLatestStaticReport();
      if (fallback && requestVersion === newsRequestVersion) {
        activeDate = fallback.date;
        activeEdition = fallback.edition;
        dateInput.value = activeDate;
        document.querySelectorAll("[data-edition]").forEach((item) => {
          item.classList.toggle("active", item.dataset.edition === activeEdition);
        });
        remoteNews = fallback.articles || [];
        reportStatus = "available";
        storeFinalizedReport(fallback);
        feedMessage = `当前档案尚未发布，正在显示最近定稿：${fallback.date} ${fallback.edition === "evening" ? "晚报" : "早报"}`;
        return;
      }
    }
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (requestVersion !== newsRequestVersion) return;
    if (["unreleased", "unavailable"].includes(payload.status)) {
      remoteNews = [];
      reportStatus = payload.status;
      feedMessage = payload.message;
      if (payload.status === "unreleased") {
        scheduleReleaseRefresh(payload.availableAt, requestedDate, requestedEdition);
      }
      return;
    }
    remoteNews = Array.isArray(payload.articles) ? payload.articles : [];
    reportStatus = "available";
    storeFinalizedReport(payload);
    feedMessage = remoteNews.length
      ? `已加载定稿档案：${payload.source}，生成时间 ${new Date(payload.generatedAt).toLocaleString()}`
      : "没有抓到新闻，已显示模板内容。";
  } catch (error) {
    if (requestVersion !== newsRequestVersion) return;
    if (keepFinalizedReport) {
      remoteNews = retainedNews;
      reportStatus = "available";
      feedMessage = "重新加载失败，继续显示当前已定稿档案。";
    } else {
      remoteNews = [];
      reportStatus = usesStaticArchive() ? "unavailable" : "error";
      feedMessage = usesStaticArchive()
        ? "云端档案尚未生成，稍后会自动发布。"
        : "未连接本地新闻服务。请用 start-news-site.bat 打开，或查看本地模板。";
    }
  } finally {
    if (requestVersion !== newsRequestVersion) return;
    loadingNews = false;
    render();
  }
}

async function backfillRecentNews() {
  if (usesStaticArchive()) return;
  if (backfillStarted) return;
  backfillStarted = true;
  try {
    const response = await fetch("/api/backfill?days=7");
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const created = payload.results.filter((item) => item.status === "created").length;
    const failed = payload.results.filter((item) => item.status === "failed").length;
    if (created || failed) console.info(`自动补档完成：新增 ${created} 份，失败 ${failed} 份。`);
  } catch {
    console.warn("自动补档失败，请确认本地新闻服务正在运行。");
  }
}

function setEdition(edition) {
  activeEdition = edition;
  document.querySelectorAll("[data-edition]").forEach((item) => {
    item.classList.toggle("active", item.dataset.edition === activeEdition);
  });
  loadRemoteNews(false);
}

document.querySelectorAll("[data-edition]").forEach((button) => {
  button.addEventListener("click", () => setEdition(button.dataset.edition));
});

dateInput.min = siteLaunchDate;
dateInput.max = getDateKey(new Date());
dateInput.value = activeDate;
dateInput.addEventListener("change", () => {
  activeDate = dateInput.value || getDateKey(new Date());
  loadRemoteNews(false);
});

refreshNews.addEventListener("click", () => loadRemoteNews(true));

function updatePushClock() {
  const now = new Date();
  dateInput.max = getDateKey(now);
  const next = getNextPush(now);
  const diff = Math.max(0, next.time - now);
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  nextPush.textContent = `${String(next.time.getHours()).padStart(2, "0")}:${String(next.time.getMinutes()).padStart(2, "0")}`;
  pushHint.textContent = `距离${next.label}约 ${hours} 小时 ${minutes} 分钟`;
}

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-filter]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    activeFilter = button.dataset.filter;
    render();
  });
});

searchInput.addEventListener("input", render);

newsList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-save]");
  if (button) {
    const key = `saved-${button.dataset.save}`;
    state[key] = !state[key];
    saveState();
    render();
    return;
  }
  const opener = event.target.closest("[data-open]");
  if (opener) openArticle(allNews().find((item) => item.id === opener.dataset.open));
});

newsList.addEventListener("error", (event) => {
  if (event.target.tagName !== "IMG") return;
  event.target.closest("figure")?.classList.add("failed");
}, true);

articleDialogContent.addEventListener("click", (event) => {
  const button = event.target.closest("[data-save]");
  if (!button) return;
  const item = allNews().find((article) => article.id === button.dataset.save);
  if (!item) return;
  const key = `saved-${item.id}`;
  state[key] = !state[key];
  saveState();
  render();
  openArticle(item);
});

articleDialogContent.addEventListener("error", (event) => {
  if (event.target.tagName !== "IMG") return;
  event.target.closest("figure")?.classList.add("failed");
}, true);

closeArticle.addEventListener("click", () => articleDialog.close());
articleDialog.addEventListener("click", (event) => {
  if (event.target === articleDialog) articleDialog.close();
});

document.querySelectorAll("[data-check]").forEach((checkbox) => {
  checkbox.checked = Boolean(state[`check-${checkbox.dataset.check}`]);
  checkbox.addEventListener("change", () => {
    state[`check-${checkbox.dataset.check}`] = checkbox.checked;
    saveState();
    updateStudyProgress();
  });
});

function updateStudyProgress() {
  const checks = [...document.querySelectorAll("[data-check]")];
  const done = checks.filter((item) => item.checked).length;
  progressBar.style.width = `${Math.round((done / checks.length) * 100)}%`;
}

document.querySelector("#newsForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const availability = getLocalReportAvailability(activeDate, activeEdition);
  if (availability.status !== "available") {
    reportStatus = availability.status;
    feedMessage = availability.message;
    render();
    return;
  }
  const form = new FormData(event.currentTarget);
  customNews.unshift({
    id: `custom-${Date.now()}`,
    edition: activeEdition,
    date: activeDate,
    title: form.get("title"),
    category: form.get("category"),
    summary: form.get("summary"),
    point: form.get("point"),
    sourceName: form.get("sourceName"),
    sourceUrl: form.get("sourceUrl"),
    keywords: ["自定义", form.get("category"), "考研时政"],
  });
  localStorage.setItem(userNewsKey, JSON.stringify(customNews));
  event.currentTarget.reset();
  activeFilter = "全部";
  document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("active", item.dataset.filter === "全部"));
  render();
});

document.querySelector("[data-jump]").addEventListener("click", () => {
  document.querySelector("#addNews").scrollIntoView({ behavior: "smooth", block: "center" });
});

updateStudyProgress();
setEdition(activeEdition);
backfillRecentNews();
setInterval(updatePushClock, 60000);
