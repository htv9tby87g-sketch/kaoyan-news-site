import http from "node:http";
import https from "node:https";
import { readFile, mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = Number(process.env.PORT || 8787);
const dataDir = path.resolve(process.env.NEWS_DATA_DIR || path.join(__dirname, "data", "news"));
const inFlight = new Map();
const cacheVersion = 7;
const minimumFinalCacheVersion = 7;
const duplicateLookbackDays = 3;
const siteLaunchDate = "2026-07-10";
const shanghaiOffsetMs = 8 * 60 * 60 * 1000;
const releaseHours = {
  morning: 7,
  evening: 21,
};

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".json": "application/json; charset=utf-8",
};

function dateKey(date = new Date()) {
  const shanghaiTime = new Date(date.getTime() + shanghaiOffsetMs);
  return [
    shanghaiTime.getUTCFullYear(),
    String(shanghaiTime.getUTCMonth() + 1).padStart(2, "0"),
    String(shanghaiTime.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function shiftDateKey(key, days) {
  const value = new Date(`${key}T12:00:00Z`);
  if (Number.isNaN(value.getTime())) throw new Error(`Invalid date: ${key}`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function isValidDateKey(key) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
  try {
    return shiftDateKey(key, 0) === key;
  } catch {
    return false;
  }
}

function releaseTimestamp(date, edition) {
  const hour = String(releaseHours[edition]).padStart(2, "0");
  return new Date(`${date}T${hour}:00:00+08:00`);
}

function getReportAvailability(date, edition, now = new Date()) {
  const today = dateKey(now);
  const label = edition === "evening" ? "晚报" : "早报";
  const releaseTime = edition === "evening" ? "21:00" : "07:00";

  if (!isValidDateKey(date)) {
    return {
      status: "unavailable",
      reason: "invalid_date",
      date,
      edition,
      availableAt: null,
      message: "日期格式无效。",
    };
  }

  if (date < siteLaunchDate) {
    return {
      status: "unavailable",
      reason: "before_launch",
      date,
      edition,
      availableAt: null,
      message: `本站自 ${siteLaunchDate} 起正式记录，之前暂无档案。`,
    };
  }

  if (date > today) {
    return {
      status: "unavailable",
      reason: "future_date",
      date,
      edition,
      availableAt: null,
      message: "未来日期尚未到来，暂无新闻档案。",
    };
  }

  const availableAt = releaseTimestamp(date, edition);
  if (date === today && now.getTime() < availableAt.getTime()) {
    return {
      status: "unreleased",
      reason: "before_release",
      date,
      edition,
      availableAt: availableAt.toISOString(),
      message: `未到推送时间，今日${label}将于 ${releaseTime} 发布。`,
    };
  }

  return {
    status: "available",
    reason: null,
    date,
    edition,
    availableAt: availableAt.toISOString(),
    message: `${label}已发布。`,
  };
}

function lockedReportPayload(availability) {
  return {
    cacheVersion,
    date: availability.date,
    edition: availability.edition,
    status: availability.status,
    reason: availability.reason,
    availableAt: availability.availableAt,
    message: availability.message,
    articles: [],
  };
}

function reportWindow(date, edition) {
  const startKey = edition === "morning" ? shiftDateKey(date, -1) : date;
  const endKey = edition === "morning" ? date : shiftDateKey(date, 1);
  return {
    startKey,
    endKey,
    start: new Date(`${startKey}T00:00:00+08:00`),
    end: new Date(`${endKey}T00:00:00+08:00`),
  };
}

function publishedTimestamp(value = "") {
  const compact = String(value).match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})(\d{2})(\d{2})?Z?$/);
  if (compact) {
    return Date.UTC(
      Number(compact[1]),
      Number(compact[2]) - 1,
      Number(compact[3]),
      Number(compact[4]),
      Number(compact[5]),
      Number(compact[6] || 0),
    );
  }
  return Date.parse(value);
}

function isInReportWindow(article, date, edition) {
  const timestamp = publishedTimestamp(article.seendate || article.publishedAt || "");
  if (Number.isNaN(timestamp)) return false;
  const window = reportWindow(date, edition);
  return timestamp >= window.start.getTime() && timestamp < window.end.getTime();
}

function defaultEdition(now = new Date()) {
  const shanghaiTime = new Date(now.getTime() + shanghaiOffsetMs);
  return shanghaiTime.getUTCHours() >= 21 ? "evening" : "morning";
}

function compactTitle(value = "") {
  return cleanText(value)
    .replace(/\s[-—]\s[^-—]{2,40}$/, "")
    .replace(/[_|｜].*$/, "")
    .slice(0, 46);
}

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body, null, 2));
}

function decodeHtmlEntities(value = "") {
  const named = {
    amp: "&",
    apos: "'",
    emsp: " ",
    ensp: " ",
    gt: ">",
    hellip: "…",
    ldquo: "“",
    lt: "<",
    mdash: "—",
    nbsp: " ",
    ndash: "–",
    quot: "\"",
    rdquo: "”",
    thinsp: " ",
  };
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (match, code) => {
      const valueCode = Number.parseInt(code, 16);
      return Number.isFinite(valueCode) && valueCode >= 0 && valueCode <= 0x10ffff
        ? String.fromCodePoint(valueCode)
        : match;
    })
    .replace(/&#(\d+);/g, (match, code) => {
      const valueCode = Number.parseInt(code, 10);
      return Number.isFinite(valueCode) && valueCode >= 0 && valueCode <= 0x10ffff
        ? String.fromCodePoint(valueCode)
        : match;
    })
    .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] || match);
}

function cleanText(value = "") {
  return decodeHtmlEntities(String(value).replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .replace(/\s+([，。！？；：、])/g, "$1")
    .replace(/([，。！？；：、])\s+/g, "$1")
    .trim();
}

function canonicalUrl(value = "") {
  return String(value).replace(/[?#].*$/, "").trim();
}

function titleFingerprint(value = "") {
  return cleanText(value)
    .toLocaleLowerCase()
    .replace(/\s[-—]\s[^-—]{2,80}$/, "")
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

function titleBigrams(value) {
  const result = new Set();
  for (let index = 0; index < value.length - 1; index += 1) {
    result.add(value.slice(index, index + 2));
  }
  return result;
}

function titleSimilarity(left, right) {
  if (left === right) return 1;
  if (left.length < 14 || right.length < 14) return 0;
  const a = titleBigrams(left);
  const b = titleBigrams(right);
  let shared = 0;
  for (const pair of a) {
    if (b.has(pair)) shared += 1;
  }
  return (2 * shared) / (a.size + b.size);
}

function createFingerprintState() {
  return { urls: new Set(), titles: new Set() };
}

function rememberArticle(state, article) {
  const url = canonicalUrl(article.sourceUrl || article.url);
  const title = titleFingerprint(article.title);
  if (url) state.urls.add(url);
  if (title) state.titles.add(title);
}

function wasPreviouslyUsed(state, article) {
  const url = canonicalUrl(article.sourceUrl || article.url);
  const title = titleFingerprint(article.title);
  if (url && state.urls.has(url)) return true;
  if (!title) return false;
  if (state.titles.has(title)) return true;
  return [...state.titles].some((previous) => titleSimilarity(previous, title) >= 0.9);
}

function takeFreshArticles(articles, limit, state) {
  const selected = [];
  for (const article of articles) {
    if (wasPreviouslyUsed(state, article)) continue;
    selected.push(article);
    rememberArticle(state, article);
    if (selected.length >= limit) break;
  }
  return selected;
}

function hasChinese(value = "") {
  return /[\u4e00-\u9fff]/.test(value);
}

function isMostlyEnglish(value = "") {
  const text = cleanText(value);
  const letters = (text.match(/[A-Za-z]/g) || []).length;
  return letters > 12 && !hasChinese(text);
}

function formatPublished(value = "") {
  if (!value) return "";
  const compact = String(value).match(/^(\d{4})(\d{2})(\d{2})T?(\d{2})?(\d{2})?/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

async function translateToChinese(value) {
  const text = cleanText(value);
  if (!isMostlyEnglish(text)) return text;
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text.slice(0, 480));
  url.searchParams.set("langpair", "en|zh-CN");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 kaoyan-news-study-site/1.0" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await response.json();
    return cleanText(body?.responseData?.translatedText || text);
  } catch {
    return text;
  } finally {
    clearTimeout(timer);
  }
}

function clipSourceText(value, maxLength = 420) {
  const text = cleanText(value);
  if (text.length <= maxLength) return text;
  const sample = text.slice(0, maxLength + 1);
  const sentenceEnd = Math.max(
    sample.lastIndexOf("。"),
    sample.lastIndexOf("！"),
    sample.lastIndexOf("？"),
    sample.lastIndexOf("."),
    sample.lastIndexOf("!"),
    sample.lastIndexOf("?"),
  );
  if (sentenceEnd >= Math.min(180, maxLength / 2)) return sample.slice(0, sentenceEnd + 1);
  return `${text.slice(0, maxLength - 1)}…`;
}

function groundedDetail(article) {
  const titleKey = titleFingerprint(article.title || "");
  const detail = cleanText(article.seendesc || "");
  const detailKey = titleFingerprint(detail);
  if (!detail || detail.length < 80 || !detailKey || detailKey === titleKey) return "";
  return detail;
}

function makeSummary(article, edition) {
  return clipSourceText(makeEventOverview(article), edition === "evening" ? 360 : 500);
}

function makePoint(article) {
  const title = article.title || "";
  if (/科技|人工智能|AI|数据|数字/.test(title)) return "联系：科技自立自强、数字治理、新质生产力。";
  if (/经济|消费|产业|金融|就业|市场/.test(title)) return "联系：高质量发展、扩大内需、新发展格局。";
  if (/生态|绿色|气候|能源|环境/.test(title)) return "联系：新发展理念、生态文明、美丽中国。";
  if (/国际|全球|外交|合作|冲突/.test(title)) return "联系：人类命运共同体、多边主义、全球治理。";
  return "联系：治理现代化、以人民为中心、政策执行。";
}

function examKeywords(article) {
  const title = `${article.title || ""} ${article.seendesc || ""}`;
  if (/科技|人工智能|AI|数据|数字|卫星|航天/.test(title)) return ["科技自立自强", "新质生产力", "创新驱动发展", "现代化产业体系"];
  if (/生态|绿色|气候|能源|环境|碳/.test(title)) return ["生态文明建设", "绿色发展", "美丽中国", "人与自然和谐共生"];
  if (/经济|消费|产业|金融|就业|市场|贸易/.test(title)) return ["高质量发展", "扩大内需", "国内大循环", "社会主义市场经济"];
  if (/基层|社区|治理|民生|安全|灾害|应急/.test(title)) return ["基层治理", "以人民为中心", "公共安全", "国家治理现代化"];
  if (/国际|全球|外交|联合国|冲突|合作|援助|访问/.test(title)) return ["人类命运共同体", "全球治理", "中国特色大国外交", "和平发展"];
  return ["国家治理体系和治理能力现代化", "以人民为中心", "中国式现代化", "政策执行"];
}

function makeEventOverview(article) {
  const title = compactTitle(article.title || "");
  const source = cleanText(article.source || article.domain || "公开新闻源");
  const published = formatPublished(article.seendate || article.publishedAt || "");
  let detail = groundedDetail(article);
  const prefix = `据${source}${published ? ` ${published}` : ""}报道，${title}。`;
  if (!detail) return `${prefix}原文可提取信息不足，为避免失实，本站不补写事件经过。`;
  if (detail.startsWith(title)) detail = detail.slice(title.length).replace(/^[\s:：—-]+/, "");
  detail = detail.replace(/^(原标题|原题)\s*[:：]\s*/i, "");
  return `${prefix}原文披露，${clipSourceText(detail, 420)}`;
}

function makeBackground(article) {
  const category = categoryOf(article);
  if (category === "科技") return "科技创新是现代化建设的重要支撑，也是形成新质生产力的关键变量。当前我国强调科技自立自强、现代化产业体系和数字中国建设，相关事件通常不只是单项技术新闻，而是创新链、产业链、资金链和人才链协同推进的体现。";
  if (category === "经济") return "经济运行、产业发展和消费变化，直接关系高质量发展、扩大内需和人民生活改善。考研政治中，这类材料常用于说明新发展格局、社会主义市场经济体制、供给侧结构性改革以及宏观政策如何服务人民群众现实需要。";
  if (category === "生态") return "绿色发展是新发展理念的重要组成部分，也是中国式现代化的重要特征之一。生态类新闻背后通常涉及产业结构调整、能源结构转型、环境治理体系完善和公众生活方式变化，不能只理解为单纯的环境保护。";
  if (category === "国际") return "国际热点往往反映世界格局变化、全球治理难题和中国外交实践。当代世界并不太平，地区冲突、能源安全、经贸摩擦和全球发展赤字相互交织，因此这类新闻适合联系和平与发展、世界多极化和人类命运共同体。";
  if (category === "社会") return "社会民生议题连接人民群众现实需求，体现公共服务、社会保障、基层治理和共同富裕等政策方向。此类新闻的背景往往是社会结构变化、公共需求升级和治理精细化要求提高。";
  return "这类新闻通常反映国家治理、政策落实和公共事务运行情况。它的背景不只是一件具体事务，而是制度优势如何转化为治理效能、政策要求如何落实到基层和群众生活中的问题。";
}

function makeImpact(article) {
  const category = categoryOf(article);
  if (category === "科技") return "从影响看，相关进展不仅体现科技实力，也可能带动产业链升级、公共服务优化和治理方式变革。若技术成果能够转化为产业应用，就能进一步提高全要素生产率，形成新质生产力，并为经济社会发展提供新的增长点。";
  if (category === "经济") return "从影响看，相关变化有助于观察经济结构调整、市场活力恢复和国内大循环运行情况。它既可能影响企业预期和居民消费，也可能体现政策工具在稳增长、促就业、惠民生方面的实际效果。";
  if (category === "生态") return "从影响看，绿色转型不是单纯环境保护，而是推动生产方式、能源结构和社会生活方式系统调整。它有助于把生态优势转化为发展优势，也能体现中国式现代化中人与自然和谐共生的要求。";
  if (category === "国际") return "从影响看，相关事件会影响国际关系、地区安全、全球市场预期或国际合作格局。对考研政治来说，关键不是记住所有细节，而是看清冲突与合作背后的时代主题、治理赤字和中国方案。";
  if (category === "社会") return "从影响看，相关举措有助于改善民生、回应社会关切，也检验基层组织动员和公共治理能力。它能够说明发展成果是否更多更公平惠及人民群众，以及公共政策能否有效解决现实问题。";
  return "从影响看，它反映政策从制定到执行的过程，也体现国家治理体系在现实问题中的运行效果。分析时可以从问题回应、制度安排、执行能力和群众获得感几个层面展开。";
}

function makeConclusion(article) {
  const keywords = examKeywords(article);
  const first = keywords[0];
  if (first.includes("科技")) return "这条新闻可以记成：发展新质生产力，关键在于以科技创新推动产业创新和治理创新。";
  if (first.includes("生态")) return "这条新闻适合联系：推进中国式现代化，必须坚持绿色发展和人与自然和谐共生。";
  if (first.includes("高质量")) return "这条新闻可以记成：高质量发展要通过扩大内需、优化结构和改善民生形成持续动力。";
  if (first.includes("基层")) return "这条新闻可以记成：国家治理现代化必须把政策落实、公共服务和群众工作延伸到基层。";
  if (first.includes("人类命运")) return "这条新闻可以记成：中国在国际事务中坚持对话合作，推动构建人类命运共同体。";
  return "这条新闻可以记成：时政材料要从现实问题出发，落到制度优势、治理能力和人民立场。";
}

function categoryOf(article) {
  const title = `${article.title || ""} ${article.seendesc || ""}`;
  if (/经济|消费|产业|金融|就业|市场|贸易/.test(title)) return "经济";
  if (/生态|绿色|气候|能源|环境|碳/.test(title)) return "生态";
  if (/科技|人工智能|AI|数据|数字|芯片/.test(title)) return "科技";
  if (/国际|全球|外交|联合国|冲突|合作/.test(title)) return "国际";
  if (/教育|医疗|养老|民生|社区|社会/.test(title)) return "社会";
  return "政治";
}

function tagAttributes(tag) {
  const attributes = {};
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? "";
  }
  return attributes;
}

function metaContents(html, names) {
  const accepted = new Set(names.map((name) => name.toLowerCase()));
  const values = [];
  for (const match of String(html).matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = tagAttributes(match[0]);
    const key = String(attributes.name || attributes.property || attributes.itemprop || "").toLowerCase();
    if (accepted.has(key) && attributes.content) values.push(cleanText(attributes.content));
  }
  return values.filter(Boolean);
}

function jsonLdArticleText(html) {
  const values = [];
  const visit = (value, depth = 0) => {
    if (depth > 8 || value == null) return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item, depth + 1);
      return;
    }
    if (typeof value !== "object") return;
    if (typeof value.articleBody === "string") values.push(value.articleBody);
    if (typeof value.description === "string") values.push(value.description);
    for (const [key, child] of Object.entries(value)) {
      if (key !== "articleBody" && key !== "description") visit(child, depth + 1);
    }
  };

  for (const match of String(html).matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      visit(JSON.parse(decodeHtmlEntities(match[1]).replace(/^\s*<!--|-->\s*$/g, "")));
    } catch {
      // Invalid structured data is ignored; meta descriptions and paragraphs remain available.
    }
  }
  return values;
}

function normalizeSourceSegment(value, title = "") {
  const text = cleanText(value)
    .replace(/^(原标题|原题)\s*[:：]\s*/i, "")
    .replace(/责任编辑\s*[:：].*$/i, "")
    .trim();
  if (text.length < 30) return "";
  if (/^(来源|编辑|作者|记者)\s*[:：]/.test(text)) return "";
  if (/^(点击|扫码|打开客户端|相关阅读|更多精彩)/.test(text)) return "";
  const textKey = titleFingerprint(text);
  const titleKey = titleFingerprint(title);
  if (!textKey || textKey === titleKey) return "";
  if (titleKey && textKey.includes(titleKey) && text.length < cleanText(title).length + 35) return "";
  return text;
}

function dedupeSourceSentences(value) {
  const sentences = cleanText(value)
    .split(/(?<=[。！？!?])|(?<!\d)\.(?!\d)/)
    .map((item) => item.trim())
    .filter((item) => item && !/[？?]$/.test(item));
  const result = [];
  const keys = [];
  for (const sentence of sentences) {
    const key = titleFingerprint(sentence);
    if (!key) continue;
    if (keys.some((known) => known === key || (key.length > 24 && (known.includes(key) || key.includes(known))))) continue;
    keys.push(key);
    result.push(sentence);
  }
  return result.join(" ");
}

function normalizeImageUrl(value, baseUrl = "") {
  const decoded = decodeHtmlEntities(String(value || "")).trim();
  if (!decoded) return "";
  try {
    const url = new URL(decoded, baseUrl || undefined);
    if (!["http:", "https:"].includes(url.protocol)) return "";
    return url.href;
  } catch {
    return "";
  }
}

function articleImageFromTags(html, sourceUrl = "") {
  for (const match of String(html).matchAll(/<img\b[^>]*>/gi)) {
    const attributes = tagAttributes(match[0]);
    const candidate = attributes["data-src"] || attributes["data-original"] || attributes.src || "";
    const imageUrl = normalizeImageUrl(candidate, sourceUrl);
    if (!imageUrl) continue;
    if (/(?:qrcode|qr-code|ewm|zxcode|sharelogo|\/logo|\/icon|avatar)/i.test(imageUrl)) continue;
    if (!/\.(?:jpe?g|png|webp)(?:$|[?#])/i.test(imageUrl)) continue;
    return { imageUrl, imageAlt: cleanText(attributes.alt || "") };
  }
  return { imageUrl: "", imageAlt: "" };
}

function extractArticlePage(html, title = "", sourceUrl = "") {
  const sourceName = metaContents(html, ["source", "article:author", "og:site_name"])[0] || "";
  const publishedAt = metaContents(html, ["publishdate", "article:published_time", "datePublished"])[0] || "";
  const metadataImageUrl = normalizeImageUrl(
    metaContents(html, ["og:image:secure_url", "og:image", "twitter:image", "twitter:image:src"])[0],
    sourceUrl,
  );
  const inlineImage = articleImageFromTags(html, sourceUrl);
  const imageUrl = metadataImageUrl || inlineImage.imageUrl;
  const imageAlt = metaContents(html, ["og:image:alt", "twitter:image:alt"])[0] || inlineImage.imageAlt || title;
  const metaDescriptions = metaContents(html, ["description", "og:description", "twitter:description"]);
  const structured = jsonLdArticleText(html);
  const withoutNoise = String(html)
    .replace(/<!--([\s\S]*?)-->/g, "")
    .replace(/<(script|style|noscript|svg)\b[^>]*>[\s\S]*?<\/\1>/gi, "");
  const paragraphs = [...withoutNoise.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((match) => match[1]);
  const segments = [];
  const keys = [];
  for (const value of [...metaDescriptions, ...structured, ...paragraphs]) {
    const text = normalizeSourceSegment(value, title);
    if (!text) continue;
    const key = titleFingerprint(text);
    if (keys.some((known) => known === key || known.includes(key) || key.includes(known))) continue;
    keys.push(key);
    segments.push(text);
  }

  let text = "";
  for (const segment of segments) {
    const remaining = 1200 - text.length;
    if (remaining <= 0) break;
    text += `${text ? " " : ""}${segment.slice(0, remaining)}`;
  }
  return { text: dedupeSourceSentences(text), sourceName, publishedAt, imageUrl, imageAlt };
}

function requestSourcePage(url, redirects = 0) {
  if (redirects > 4) return Promise.reject(new Error("Too many redirects"));
  const target = new URL(url);
  const client = target.protocol === "https:" ? https : http;
  const legacyXinhua = /(^|\.)xinhuanet\.com$/i.test(target.hostname);
  return new Promise((resolve, reject) => {
    const request = client.get(target, {
      headers: {
        "Accept-Encoding": "identity",
        "User-Agent": "Mozilla/5.0 kaoyan-news-study-site/1.0",
      },
      rejectUnauthorized: !legacyXinhua,
    }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        response.resume();
        resolve(requestSourcePage(new URL(response.headers.location, target), redirects + 1));
        return;
      }
      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        reject(new Error(`HTTP ${response.statusCode}`));
        return;
      }
      const chunks = [];
      let size = 0;
      response.on("data", (chunk) => {
        size += chunk.length;
        if (size > 4 * 1024 * 1024) {
          request.destroy(new Error("Source page is too large"));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      response.on("error", reject);
    });
    request.setTimeout(8000, () => request.destroy(new Error("Source page timeout")));
    request.on("error", reject);
  });
}

async function fetchSourcePage(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 kaoyan-news-study-site/1.0" },
      redirect: "follow",
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } catch (error) {
    const hostname = new URL(url).hostname;
    if (/(^|\.)xinhuanet\.com$/i.test(hostname)) return requestSourcePage(url);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function enrichSourceArticle(article) {
  const indexedDetail = normalizeSourceSegment(article.seendesc || "", article.title || "");
  let page = { text: "", sourceName: "", publishedAt: "", imageUrl: "", imageAlt: "" };
  try {
    page = extractArticlePage(await fetchSourcePage(article.url), article.title || "", article.url);
  } catch {
    // A sufficiently detailed index excerpt can still be used without inventing facts.
  }
  const pageDetail = normalizeSourceSegment(page.text, article.title || "");
  const detail = pageDetail.length >= 80 ? pageDetail : indexedDetail;
  return {
    ...article,
    source: page.sourceName || article.source,
    seendate: article.seendate || page.publishedAt,
    seendesc: detail,
    imageUrl: page.imageUrl || article.imageUrl || article.socialimage || "",
    imageAlt: page.imageAlt || article.imageAlt || article.title || "",
    sourceVerified: pageDetail.length >= 80 || (article.officialFeed && indexedDetail.length >= 80),
  };
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 kaoyan-news-study-site/1.0" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function localizeArticle(item) {
  const [translatedTitle, translatedDesc] = await Promise.all([
    translateToChinese(item.title || ""),
    translateToChinese(item.seendesc || ""),
  ]);
  return {
    ...item,
    title: translatedTitle,
    seendesc: translatedDesc,
    translated: translatedTitle !== cleanText(item.title || "") || translatedDesc !== cleanText(item.seendesc || ""),
  };
}

async function normalizeArticles(items, edition) {
  const seen = new Set();
  const filtered = items
    .filter((item) => item && item.url && item.title)
    .filter((item) => {
      const key = canonicalUrl(item.url);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  return filtered.map((item, index) => ({
      id: `${edition}-${index}-${Buffer.from(item.url).toString("base64url").slice(0, 10)}`,
      title: cleanText(item.title),
      category: categoryOf(item),
      summary: "",
      overview: "",
      background: makeBackground(item),
      impact: makeImpact(item),
      examKeywords: examKeywords(item),
      conclusion: makeConclusion(item),
      point: makePoint(item),
      keywords: [categoryOf(item), "时政", edition === "morning" ? "早报" : "晚报"],
      sourceName: cleanText(item.source || item.domain || "新闻源"),
      sourceUrl: item.url,
      publishedAt: item.seendate || item.publishedAt || "",
      sourceDescription: cleanText(item.seendesc || ""),
      translated: false,
      imageUrl: item.imageUrl || item.socialimage || "",
      imageAlt: cleanText(item.imageAlt || item.title),
      officialFeed: Boolean(item.officialFeed),
    }));
}

async function enrichNormalizedArticle(article, edition) {
  const sourceArticle = await enrichSourceArticle({
    title: article.title,
    source: article.sourceName,
    url: article.sourceUrl,
    seendate: article.publishedAt,
    seendesc: article.sourceDescription,
    officialFeed: article.officialFeed,
  });
  if (!groundedDetail(sourceArticle)) return null;

  const sourceWasEnglish = isMostlyEnglish(sourceArticle.seendesc || "");
  const localized = await localizeArticle(sourceArticle);
  if (sourceWasEnglish && isMostlyEnglish(localized.seendesc || "")) return null;

  const { sourceDescription, ...base } = article;
  const category = categoryOf(localized);
  return {
    ...base,
    title: cleanText(localized.title),
    category,
    summary: makeSummary(localized, edition),
    overview: makeEventOverview(localized),
    background: makeBackground(localized),
    impact: makeImpact(localized),
    examKeywords: examKeywords(localized),
    conclusion: makeConclusion(localized),
    point: makePoint(localized),
    keywords: [category, "时政", edition === "morning" ? "早报" : "晚报"],
    sourceName: cleanText(localized.source || article.sourceName),
    publishedAt: localized.seendate || article.publishedAt,
    translated: Boolean(article.translated || localized.translated),
    sourceVerified: Boolean(localized.sourceVerified),
    imageUrl: localized.imageUrl || article.imageUrl || "",
    imageAlt: localized.imageAlt || localized.title || article.title,
    imageSource: cleanText(localized.source || article.sourceName),
  };
}

async function selectGroundedArticles(candidates, edition, limit, state) {
  const selected = [];
  const fresh = candidates.filter((article) => !wasPreviouslyUsed(state, article));
  const batchSize = 5;
  for (let index = 0; index < fresh.length && selected.length < limit; index += batchSize) {
    const batch = fresh.slice(index, index + batchSize);
    const enriched = await Promise.all(batch.map((article) => enrichNormalizedArticle(article, edition)));
    for (const article of enriched) {
      if (!article || wasPreviouslyUsed(state, article)) continue;
      selected.push(article);
      rememberArticle(state, article);
      if (selected.length >= limit) break;
    }
  }
  return selected;
}

async function rebuildCachedArticles(payload, date, edition) {
  if (!Array.isArray(payload?.articles)) return [];
  const rawArticles = payload.articles
    .filter((article) => article?.title && article?.sourceUrl)
    .map((article) => ({
      title: article.title,
      url: article.sourceUrl,
      source: article.sourceName,
      seendate: article.publishedAt,
      seendesc: "",
    }));
  const prior = await loadPriorFingerprints(date, edition);
  const limit = edition === "evening" ? 6 : 15;
  return selectGroundedArticles(await normalizeArticles(rawArticles, edition), edition, limit, prior);
}

function priorReportKeys(date, edition) {
  const keys = [];
  if (edition === "evening") keys.push(`${date}-morning`);
  for (let offset = 1; offset <= duplicateLookbackDays; offset += 1) {
    const previousDate = shiftDateKey(date, -offset);
    keys.push(`${previousDate}-morning`, `${previousDate}-evening`);
  }
  return keys;
}

async function loadPriorFingerprints(date, edition) {
  const state = createFingerprintState();
  for (const key of priorReportKeys(date, edition)) {
    try {
      const cached = JSON.parse(await readFile(path.join(dataDir, `${key}.json`), "utf8"));
      if (cached.cacheVersion !== cacheVersion || !Array.isArray(cached.articles)) continue;
      for (const article of cached.articles) rememberArticle(state, article);
    } catch {
      // Missing or obsolete reports do not block the current report.
    }
  }
  return state;
}

function decodeXml(value = "") {
  return value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function tagValue(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? cleanText(decodeXml(match[1])) : "";
}

async function fetchGoogleNews(query, maxrecords, date, edition, language = "zh-CN", region = "CN") {
  const window = reportWindow(date, edition);
  const url = new URL("https://news.google.com/rss/search");
  const ceidLanguage = region === "CN" ? "zh-Hans" : language.split("-")[0];
  url.searchParams.set("q", `(${query}) after:${window.startKey} before:${window.endKey}`);
  url.searchParams.set("hl", language);
  url.searchParams.set("gl", region);
  url.searchParams.set("ceid", `${region}:${ceidLanguage}`);

  const xml = await fetchText(url);
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)]
    .map((match) => {
      const item = match[1];
      return {
        title: tagValue(item, "title"),
        url: tagValue(item, "link"),
        seendesc: tagValue(item, "description"),
        source: tagValue(item, "source") || "Google News",
        seendate: tagValue(item, "pubDate"),
      };
    });
  return items
    .filter((item) => isInReportWindow(item, date, edition))
    .slice(0, maxrecords);
}

async function fetchDirectRss(feeds, maxrecords, date, edition) {
  const results = await Promise.allSettled(feeds.map(async ({ url, source }) => {
    const xml = await fetchText(url);
    return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)]
      .map((match) => {
        const item = match[1];
        return {
          title: tagValue(item, "title"),
          url: tagValue(item, "link") || tagValue(item, "guid"),
          seendesc: tagValue(item, "description"),
          source,
          seendate: tagValue(item, "pubDate") || tagValue(item, "date"),
          officialFeed: true,
        };
      })
      .filter((item) => isInReportWindow(item, date, edition));
  }));

  const articles = results
    .filter((result) => result.status === "fulfilled")
    .flatMap((result) => result.value);
  if (!articles.length) {
    const reasons = results
      .filter((result) => result.status === "rejected")
      .map((result) => result.reason?.message || String(result.reason));
    throw new Error(reasons.join(" | ") || "no current articles");
  }
  return articles.slice(0, maxrecords);
}

function gdeltWindow(date, edition) {
  const window = reportWindow(date, edition);
  const start = window.start;
  const end = new Date(window.end.getTime() - 1000);
  const format = (value) => [
    value.getUTCFullYear(),
    String(value.getUTCMonth() + 1).padStart(2, "0"),
    String(value.getUTCDate()).padStart(2, "0"),
    String(value.getUTCHours()).padStart(2, "0"),
    String(value.getUTCMinutes()).padStart(2, "0"),
    String(value.getUTCSeconds()).padStart(2, "0"),
  ].join("");
  return { start: format(start), end: format(end) };
}

async function fetchGdelt(query, maxrecords, date, edition) {
  const url = new URL("https://api.gdeltproject.org/api/v2/doc/doc");
  const window = gdeltWindow(date, edition);
  url.searchParams.set("query", query);
  url.searchParams.set("mode", "artlist");
  url.searchParams.set("format", "json");
  url.searchParams.set("sort", "hybridrel");
  url.searchParams.set("maxrecords", String(maxrecords));
  url.searchParams.set("startdatetime", window.start);
  url.searchParams.set("enddatetime", window.end);

  const body = JSON.parse(await fetchText(url));
  return (body.articles || [])
    .filter((item) => isInReportWindow(item, date, edition))
    .slice(0, maxrecords);
}

async function fetchCandidates({
  gdeltQuery,
  googleQuery,
  directFeeds = [],
  maxrecords,
  minimum,
  date,
  edition,
  language = "zh-CN",
  region = "CN",
}) {
  const candidates = [];
  const errors = [];
  const cloudMode = process.env.NEWS_CLOUD_MODE === "1";

  if (cloudMode && directFeeds.length) {
    try {
      candidates.push(...await fetchDirectRss(directFeeds, maxrecords, date, edition));
      if (candidates.length >= minimum) return candidates;
    } catch (error) {
      errors.push(`direct RSS: ${error.message}`);
    }
  }

  try {
    candidates.push(...await fetchGdelt(gdeltQuery, maxrecords, date, edition));
    if (candidates.length >= minimum) return candidates;
  } catch (error) {
    errors.push(`GDELT: ${error.message}`);
  }

  try {
    candidates.push(...await fetchGoogleNews(googleQuery, maxrecords, date, edition, language, region));
    if (candidates.length >= minimum) return candidates;
  } catch (error) {
    errors.push(`Google News: ${error.message}`);
  }

  if (!cloudMode && directFeeds.length) {
    try {
      candidates.push(...await fetchDirectRss(directFeeds, maxrecords, date, edition));
    } catch (error) {
      errors.push(`direct RSS: ${error.message}`);
    }
  }

  if (candidates.length) return candidates;
  throw new Error(`News indexes unavailable. ${errors.join("; ")}`);
}

async function buildNews(date, edition) {
  const domesticFeeds = [
    { source: "人民网", url: "https://www.people.com.cn/rss/politics.xml" },
    { source: "人民网", url: "https://www.people.com.cn/rss/ywkx.xml" },
    { source: "中国新闻网", url: "https://www.chinanews.com.cn/rss/china.xml" },
    { source: "中国新闻网", url: "https://www.chinanews.com.cn/rss/finance.xml" },
    { source: "中国新闻网", url: "https://www.chinanews.com.cn/rss/scroll-news.xml" },
  ];
  const foreignFeeds = [
    { source: "人民网", url: "https://www.people.com.cn/rss/world.xml" },
    { source: "中国新闻网", url: "https://www.chinanews.com.cn/rss/world.xml" },
  ];
  const domesticQuery = "(domain:xinhuanet.com OR domain:people.com.cn OR domain:cctv.com OR domain:chinanews.com.cn OR domain:gov.cn OR domain:gmw.cn OR domain:ce.cn) sourcelang:Chinese";
  const foreignQuery = "(domain:un.org OR domain:reuters.com OR domain:apnews.com OR domain:bbc.com OR domain:worldbank.org OR domain:weforum.org) sourcelang:English";
  const eveningQuery = "(domain:xinhuanet.com OR domain:people.com.cn OR domain:cctv.com OR domain:chinanews.com.cn OR domain:gov.cn OR domain:reuters.com OR domain:apnews.com OR domain:bbc.com)";
  const domesticGoogleQuery = "site:xinhuanet.com OR site:people.com.cn OR site:cctv.com OR site:chinanews.com.cn 中国 时政 民生 经济 科技";
  const foreignGoogleQuery = "site:un.org OR site:reuters.com OR site:apnews.com international politics economy technology climate";
  const prior = await loadPriorFingerprints(date, edition);

  if (edition === "evening") {
    const items = await fetchCandidates({
      gdeltQuery: eveningQuery,
      googleQuery: "site:xinhuanet.com OR site:people.com.cn OR site:cctv.com 中国 时政 国际 新闻",
      directFeeds: [...domesticFeeds, ...foreignFeeds],
      maxrecords: 18,
      minimum: 6,
      date,
      edition,
    });
    return selectGroundedArticles(await normalizeArticles(items, edition), edition, 6, prior);
  }

  const [domestic, foreign] = await Promise.all([
    fetchCandidates({
      gdeltQuery: domesticQuery,
      googleQuery: domesticGoogleQuery,
      directFeeds: domesticFeeds,
      maxrecords: 30,
      minimum: 10,
      date,
      edition,
    }),
    fetchCandidates({
      gdeltQuery: foreignQuery,
      googleQuery: foreignGoogleQuery,
      directFeeds: foreignFeeds,
      maxrecords: 12,
      minimum: 5,
      date,
      edition,
      language: "en-US",
      region: "US",
    }),
  ]);
  const normalizedDomestic = await normalizeArticles(domestic, edition);
  const selectedDomestic = await selectGroundedArticles(normalizedDomestic, edition, 10, prior);
  const normalizedForeign = await normalizeArticles(foreign, edition);
  const selectedForeign = await selectGroundedArticles(normalizedForeign, edition, 5, prior);
  return [
    ...selectedDomestic,
    ...selectedForeign,
  ];
}

function isCurrentCache(payload, date, edition) {
  return Number(payload?.cacheVersion) >= minimumFinalCacheVersion
    && payload.date === date
    && payload.edition === edition
    && Array.isArray(payload.articles);
}

async function prepareComparisonCache(date, edition, now = new Date()) {
  const comparisonDate = edition === "morning" ? shiftDateKey(date, -1) : date;
  const comparisonEdition = "morning";
  if (await hasCache(comparisonDate, comparisonEdition, now)) return;
  try {
    await cachedNews(comparisonDate, comparisonEdition, false, false, now);
  } catch {
    // The current report can still be built with strict date filtering.
  }
}

async function cachedNews(date, edition, _refresh, prepareComparison = true, now = new Date(), allowEarly = false) {
  const availability = getReportAvailability(date, edition, now);
  const canPrepareEarly = allowEarly && availability.reason === "before_release";
  if (availability.status !== "available" && !canPrepareEarly) return lockedReportPayload(availability);

  await mkdir(dataDir, { recursive: true });
  const file = path.join(dataDir, `${date}-${edition}.json`);
  const readCache = async () => JSON.parse(await readFile(file, "utf8"));
  let obsoleteCache = null;
  try {
    await access(file);
    const cached = await readCache();
    if (isCurrentCache(cached, date, edition)) {
      return { ...cached, status: "available", finalized: true };
    }
    if (cached?.date === date && cached?.edition === edition) {
      obsoleteCache = cached;
    }
  } catch {
    // Build below.
  }
  const key = `${date}-${edition}`;
  if (inFlight.has(key)) return inFlight.get(key);
  const promise = (async () => {
    try {
      if (prepareComparison) await prepareComparisonCache(date, edition, now);
      let articles = obsoleteCache ? await rebuildCachedArticles(obsoleteCache, date, edition) : [];
      if (!articles.length) articles = await buildNews(date, edition);
      if (!articles.length) throw new Error("目标日期没有抓取到可用新闻");
      const window = reportWindow(date, edition);
      const generatedAt = new Date().toISOString();
      const payload = {
        cacheVersion,
        date,
        edition,
        status: "available",
        finalized: true,
        generatedAt,
        finalizedAt: generatedAt,
        reportWindow: {
          start: window.start.toISOString(),
          endExclusive: window.end.toISOString(),
        },
        source: articles.every((item) => item.sourceVerified)
          ? "新闻来源原文"
          : "新闻来源原文及公开索引摘要",
        articles,
      };
      await writeFile(file, JSON.stringify(payload, null, 2), "utf8");
      return payload;
    } catch (error) {
      try {
        const cached = await readCache();
        if (isCurrentCache(cached, date, edition)) {
          return { ...cached, status: "available", stale: true, error: error.message };
        }
        throw error;
      } catch {
        throw error;
      }
    } finally {
      inFlight.delete(key);
    }
  })();
  inFlight.set(key, promise);
  return promise;
}

async function hasCache(date, edition, now = new Date()) {
  if (getReportAvailability(date, edition, now).status !== "available") return false;
  try {
    const file = path.join(dataDir, `${date}-${edition}.json`);
    await access(file);
    return isCurrentCache(JSON.parse(await readFile(file, "utf8")), date, edition);
  } catch {
    return false;
  }
}

async function backfillNews(days = 7, now = new Date()) {
  await mkdir(dataDir, { recursive: true });
  const safeDays = Math.max(1, Math.min(Number(days) || 7, 14));
  const today = dateKey(now);
  const start = shiftDateKey(today, -(safeDays - 1));
  const results = [];

  for (let offset = 0; offset < safeDays; offset += 1) {
    const date = shiftDateKey(start, offset);
    for (const edition of ["morning", "evening"]) {
      const availability = getReportAvailability(date, edition, now);
      if (availability.status !== "available") {
        results.push({
          date,
          edition,
          status: "skipped",
          reason: availability.reason,
          availableAt: availability.availableAt,
        });
        continue;
      }
      if (await hasCache(date, edition, now)) {
        results.push({ date, edition, status: "cached" });
        continue;
      }
      try {
        const payload = await cachedNews(date, edition, false, false, now);
        results.push({ date, edition, status: "created", count: payload.articles.length });
      } catch (error) {
        results.push({ date, edition, status: "failed", error: error.message });
      }
    }
  }

  return {
    days: safeDays,
    generatedAt: new Date().toISOString(),
    results,
  };
}

async function handleApi(req, res, url) {
  const date = url.searchParams.get("date") || dateKey();
  const edition = url.searchParams.get("edition") || defaultEdition();
  if (!["morning", "evening"].includes(edition)) {
    json(res, 400, { error: "edition must be morning or evening" });
    return;
  }
  if (!isValidDateKey(date)) {
    json(res, 400, { error: "date must use the YYYY-MM-DD format" });
    return;
  }
  try {
    json(res, 200, await cachedNews(date, edition, false));
  } catch (error) {
    json(res, 502, {
      error: "新闻抓取失败",
      detail: error.message,
      hint: "请检查网络，或稍后点击刷新新闻。",
    });
  }
}

async function handleBackfill(req, res, url) {
  try {
    json(res, 200, await backfillNews(url.searchParams.get("days") || 7));
  } catch (error) {
    json(res, 502, {
      error: "补档失败",
      detail: error.message,
    });
  }
}

async function serveStatic(req, res, url) {
  const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
  const publishedPath = pathname.startsWith("/data/");
  const staticRoot = publishedPath ? path.join(__dirname, "published-data") : __dirname;
  const relativePath = publishedPath ? pathname.slice("/data".length) : pathname;
  const filePath = path.resolve(staticRoot, `.${relativePath}`);
  if (filePath !== staticRoot && !filePath.startsWith(`${staticRoot}${path.sep}`)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  try {
    const body = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { "Content-Type": mime[ext] || "application/octet-stream" });
    res.end(req.method === "HEAD" ? undefined : body);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  if (url.pathname === "/api/news") {
    handleApi(req, res, url);
    return;
  }
  if (url.pathname === "/api/backfill") {
    handleBackfill(req, res, url);
    return;
  }
  void serveStatic(req, res, url);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. The site may already be running at http://localhost:${port}`);
    return;
  }
  console.error("Server error:", error);
});

if (path.resolve(process.argv[1] || "") === __filename) {
  process.on("unhandledRejection", (error) => {
    console.error("Unhandled rejection:", error);
    process.exit(1);
  });

  process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
    process.exit(1);
  });

  server.listen(port, () => {
    console.log(`考研时政新闻站已启动：http://localhost:${port}`);
  });
}

export {
  backfillNews,
  cacheVersion,
  cachedNews,
  createFingerprintState,
  dataDir,
  dateKey,
  extractArticlePage,
  enrichSourceArticle,
  getReportAvailability,
  groundedDetail,
  isCurrentCache,
  isInReportWindow,
  isValidDateKey,
  makeEventOverview,
  rememberArticle,
  reportWindow,
  siteLaunchDate,
  takeFreshArticles,
  titleFingerprint,
  titleSimilarity,
};
