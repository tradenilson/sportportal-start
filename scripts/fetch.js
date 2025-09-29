import Parser from "rss-parser";
import fs from "fs";
import path from "path";

const allowed = ["gp.se","dn.se","svd.se","expressen.se","aftonbladet.se"];
const queries = [
  { key: "frolunda", q: '("Frölunda HC" OR "Västra Frölunda" OR "Frölunda")' },
  { key: "brynas", q: '("Brynäs IF" OR "Brynäs")' },
  { key: "v75", q: '("V75" OR "trav")' },
  { key: "stryktipset", q: '("Stryktipset")' }
];

const parser = new Parser({ timeout: 15000 });
const out = { generatedAt: new Date().toISOString(), items: { frolunda: [], brynas: [], v75: [], stryktipset: [] } };
const dedup = new Set();

const normalize = (u) => {
  try {
    const x = new URL(u);
    const d = x.searchParams.get("url");
    return new URL(d ? decodeURIComponent(d) : u) + "";
  } catch { return null; }
};
const isAllowed = (u) => {
  try {
    const host = new URL(u).hostname.replace(/^www\./, "");
    return allowed.some((a) => host === a || host.endsWith("." + a));
  } catch { return false; }
};

for (const q of queries) {
  const feed = `https://news.google.com/rss/search?q=${encodeURIComponent(q.q)}&hl=sv&gl=SE&ceid=SE:sv`;
  const f = await parser.parseURL(feed);
  for (const it of f.items || []) {
    const url = normalize(it.link || "");
    if (!url || !isAllowed(url) || dedup.has(url)) continue;
    dedup.add(url);
    out.items[q.key].push({
      title: it.title || "",
      source: (new URL(url).hostname || "").replace(/^www\./, ""),
      sourceUrl: url,
      publishedAt: it.pubDate ? new Date(it.pubDate).toISOString() : null
    });
  }
}
for (const k of Object.keys(out.items)) {
  out.items[k].sort((a,b) =>
    (new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)) ||
    a.title.localeCompare(b.title)
  );
}
fs.mkdirSync("data", { recursive: true });
fs.writeFileSync(path.join("data","news.json"), JSON.stringify(out, null, 2));
console.log("Wrote data/news.json at "
