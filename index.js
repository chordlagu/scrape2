const express = require("express");
const { chromium } = require("playwright");

const app = express();
const port = process.env.PORT || 3000;

app.get("/scrape", async (req, res) => {
  const videoUrl = req.query.url;
  if (!videoUrl) return res.status(400).json({ error: "URL TikTok diperlukan." });

  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148"
    });

    const page = await context.newPage();

    let videoSrc = "";

    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes(".tiktokcdn.com") && url.includes(".mp4") && !videoSrc) {
        videoSrc = url;
      }
    });

    console.log("Opening:", videoUrl);
    await page.goto(videoUrl, { waitUntil: "networkidle", timeout: 0 });
    await page.waitForTimeout(4000);

    const description = await page.title();

    const username = await page.evaluate(() => {
      const el = document.querySelector("meta[property='og:title']");
      return el ? el.content.split("on TikTok")[0].trim() : "";
    });

    await browser.close();

    return res.json({
      author: username,
      description: description,
      video_url: videoSrc || "not found"
    });
  } catch (err) {
    console.error("Scrape failed:", err);
    if (browser) await browser.close();
    return res.status(500).json({ error: "Gagal mengambil data." });
  }
});

app.get("/", (req, res) => {
  res.send("TikTok Playwright Scraper aktif. Gunakan endpoint /scrape?url=...");
});

app.listen(port, () => {
  console.log("Server running on port " + port);
});
