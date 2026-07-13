import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import {
  backfillNews,
  cacheVersion,
  cachedNews,
  extractArticlePage,
  getReportAvailability,
  isCurrentCache,
  makeEventOverview,
} from "./server.mjs";
import { validateReportForPublication } from "./scripts/report-validation.mjs";
import { removeUncachedImage } from "./scripts/news-images.mjs";

const at = (value) => new Date(value);

const remoteImageArticle = {
  imageUrl: "http://example.com/news.jpg",
  imageRemoteUrl: "http://example.com/news.jpg",
  imageAlt: "remote image",
  imageSource: "example",
};
assert.equal(removeUncachedImage(remoteImageArticle), true);
assert.deepEqual(remoteImageArticle, {});
assert.equal(removeUncachedImage({ imageUrl: "data/images/local.jpg", imageSource: "source" }), false);
console.log("PASS 未缓存的远程图片会被清除，本地图片保持不变");

const cases = [
  ["7月9日早报", getReportAvailability("2026-07-09", "morning", at("2026-07-10T04:00:00Z")).reason, "before_launch"],
  ["06:59早报", getReportAvailability("2026-07-10", "morning", at("2026-07-09T22:59:00Z")).status, "unreleased"],
  ["06:59晚报", getReportAvailability("2026-07-10", "evening", at("2026-07-09T22:59:00Z")).status, "unreleased"],
  ["07:00早报", getReportAvailability("2026-07-10", "morning", at("2026-07-09T23:00:00Z")).status, "available"],
  ["07:00晚报", getReportAvailability("2026-07-10", "evening", at("2026-07-09T23:00:00Z")).status, "unreleased"],
  ["20:59晚报", getReportAvailability("2026-07-10", "evening", at("2026-07-10T12:59:00Z")).status, "unreleased"],
  ["21:00晚报", getReportAvailability("2026-07-10", "evening", at("2026-07-10T13:00:00Z")).status, "available"],
  ["未来日期", getReportAvailability("2026-07-11", "morning", at("2026-07-10T04:00:00Z")).reason, "future_date"],
  [
    "旧缓存失效",
    isCurrentCache(
      { cacheVersion: 2, date: "2026-07-10", edition: "evening", articles: [] },
      "2026-07-10",
      "evening",
    ),
    false,
  ],
  [
    "定稿缓存可永久读取",
    isCurrentCache(
      { cacheVersion: 7, date: "2026-07-10", edition: "morning", articles: [{}] },
      "2026-07-10",
      "morning",
    ),
    true,
  ],
  [
    "后续程序版本不改写定稿",
    isCurrentCache(
      { cacheVersion: 99, date: "2026-07-10", edition: "morning", articles: [{}] },
      "2026-07-10",
      "morning",
    ),
    true,
  ],
];

for (const [name, actual, expected] of cases) {
  assert.equal(actual, expected, name);
  console.log(`PASS ${name}: ${actual}`);
}

const locked = await cachedNews(
  "2026-07-10",
  "evening",
  false,
  true,
  at("2026-07-10T12:59:00Z"),
);
assert.equal(locked.status, "unreleased");
assert.deepEqual(locked.articles, []);
console.log("PASS 缓存读取无法绕过发布时间");

const backfill = await backfillNews(7, at("2026-07-09T22:59:00Z"));
assert.equal(backfill.results.length, 14);
assert.ok(backfill.results.every((item) => item.status === "skipped"));
console.log(`PASS 补档跳过未开放报告: ${backfill.results.length} 项`);
console.log(`cacheVersion=${cacheVersion}`);

const validArticle = {
  title: "测试新闻",
  sourceName: "新华社",
  sourceUrl: "https://example.com/news",
  overview: "这是用于验证新闻来源和事件概述完整性的测试内容。".repeat(5),
};
const validMorning = validateReportForPublication({
  status: "available",
  date: "2026-07-13",
  edition: "morning",
  articles: Array.from({ length: 8 }, (_, index) => ({ ...validArticle, id: index })),
}, "2026-07-13", "morning");
assert.equal(validMorning.valid, true);
const shortMorning = validateReportForPublication({
  status: "available",
  date: "2026-07-13",
  edition: "morning",
  articles: Array.from({ length: 7 }, (_, index) => ({ ...validArticle, id: index })),
}, "2026-07-13", "morning");
assert.equal(shortMorning.valid, false);
console.log("PASS 发布校验会拒绝篇数不足的早报");

const sourceHtml = `
  <meta name="source" content="新华社">
  <meta name="publishdate" content="2026-07-09">
  <meta name="description" content="&emsp;四部门联合印发实施意见，提出用五年时间分三步推进人工智能在人社领域的应用。">
  <meta property="og:image" content="/images/policy-meeting.jpg">
  <meta property="og:image:alt" content="政策发布会现场">
  <div id="detailContent">
    <p>记者获悉，人力资源社会保障部等四部门近日联合印发实施意见，要求推动人工智能产业和人社工作协同优化，开拓就业、社会保障、人才服务和劳动关系等领域的应用场景。</p>
    <p>文件规划六个一级场景、十九个二级场景和六十七个细分场景，并提出建设应用平台、高质量数据集、语料库和行业算法模型。</p>
    <p>有关部门将按照夯实基础、规模推广和深度融合三个阶段推进，同时建立就业影响评估与劳动者权益保障机制。</p>
    <p>有关部门将按照夯实基础、规模推广和深度融合三个阶段推进，同时建立就业影响评估与劳动者权益保障机制。</p>
    <p>统计数据显示，相关项目总额达到45.61亿元，同比增长4.12%，主要指标保持稳定增长。</p>
    <img src="/images/article-scene.jpg" alt="政策实施现场">
  </div>
`;
const extracted = extractArticlePage(sourceHtml, "四部门部署人工智能加人社应用", "https://example.com/news/123");
assert.equal(extracted.sourceName, "新华社");
assert.ok(extracted.text.length >= 200);
assert.ok(extracted.text.includes("六个一级场景"));
assert.ok(!extracted.text.includes("&emsp;"));
assert.equal(extracted.text.match(/三个阶段推进/g)?.length, 1);
assert.ok(extracted.text.includes("45.61亿元"));
assert.ok(extracted.text.includes("4.12%"));
assert.equal(extracted.imageUrl, "https://example.com/images/policy-meeting.jpg");
assert.equal(extracted.imageAlt, "政策发布会现场");

const groundedOverview = makeEventOverview({
  title: "四部门部署人工智能加人社应用",
  source: extracted.sourceName,
  seendate: "20260709T010000Z",
  seendesc: extracted.text,
});
assert.ok(groundedOverview.length >= 200);
assert.ok(groundedOverview.includes("四部门近日联合印发实施意见"));
assert.ok(!groundedOverview.includes("从新闻标题和来源信息看"));
assert.ok(!groundedOverview.includes("复习时要先抓住"));
console.log(`PASS 概述仅使用来源事实: ${groundedOverview.length} 字`);

const finalizedCacheUrl = new URL("./data/news/2026-07-10-morning.json", import.meta.url);
const finalizedBefore = await readFile(finalizedCacheUrl, "utf8");
const finalizedStatBefore = await stat(finalizedCacheUrl);
const finalizedPayload = await cachedNews(
  "2026-07-10",
  "morning",
  true,
  false,
  at("2026-07-10T00:30:00Z"),
);
const finalizedAfter = await readFile(finalizedCacheUrl, "utf8");
const finalizedStatAfter = await stat(finalizedCacheUrl);
assert.equal(finalizedAfter, finalizedBefore);
assert.equal(finalizedStatAfter.mtimeMs, finalizedStatBefore.mtimeMs);
assert.equal(finalizedPayload.finalized, true);
console.log("PASS refresh=true 不会改写已定稿缓存");

const preparedEarly = await cachedNews(
  "2026-07-12",
  "morning",
  false,
  false,
  at("2026-07-11T22:45:00Z"),
  true,
);
assert.equal(preparedEarly.status, "available");
console.log("PASS 发布时间前可由云端任务准备定稿");
