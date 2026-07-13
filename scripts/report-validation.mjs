const minimumArticleCount = Object.freeze({
  morning: 8,
  evening: 2,
});

export function validateReportForPublication(payload, expectedDate, expectedEdition) {
  const errors = [];
  const articles = Array.isArray(payload?.articles) ? payload.articles : [];
  const minimum = minimumArticleCount[expectedEdition] || 1;

  if (payload?.status !== "available") errors.push("report status is not available");
  if (payload?.date !== expectedDate) errors.push(`expected date ${expectedDate}`);
  if (payload?.edition !== expectedEdition) errors.push(`expected edition ${expectedEdition}`);
  if (articles.length < minimum) errors.push(`only ${articles.length} articles; minimum is ${minimum}`);

  const completeArticles = articles.filter((article) => (
    String(article?.title || "").trim()
    && String(article?.sourceName || "").trim()
    && /^https?:\/\//i.test(String(article?.sourceUrl || ""))
    && String(article?.overview || "").trim().length >= 80
  ));
  const minimumComplete = Math.ceil(articles.length * 0.8);
  if (completeArticles.length < minimumComplete) {
    errors.push(`only ${completeArticles.length}/${articles.length} articles have complete source facts`);
  }

  return {
    valid: errors.length === 0,
    errors,
    articleCount: articles.length,
    completeArticleCount: completeArticles.length,
    minimumArticleCount: minimum,
  };
}

export function assertReportReady(payload, expectedDate, expectedEdition) {
  const validation = validateReportForPublication(payload, expectedDate, expectedEdition);
  if (!validation.valid) {
    throw new Error(`Report validation failed: ${validation.errors.join("; ")}`);
  }
  return validation;
}
