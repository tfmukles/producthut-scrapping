import fs from "fs";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

// Use StealthPlugin to avoid detection
puppeteer.use(StealthPlugin());

class ProductHuntScraper {
  constructor(environment = "TEST") {
    this.ENVIRONMENT = environment;
    this.maxScrolls = this.ENVIRONMENT === "TEST" ? 3 : Infinity;
    this.data = [];
  }

  #saveToFile(data) {
    fs.writeFileSync("data.json", JSON.stringify(data, null, 2));
  }

  #sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // create headless browser
  async #createBrowser() {
    const browser = await puppeteer.launch({
      headless: this.ENVIRONMENT === "PRODUCTION",
    });
    const page = await browser.newPage();
    return { browser, page };
  }

  // get Chrome WebSocket URL
  async #getBrowserWSEndpoint() {
    try {
      const response = await fetch("http://localhost:9222/json/version");
      const data = await response.json();
      return data.webSocketDebuggerUrl;
    } catch (error) {
      console.error("Error getting Chrome WebSocket URL:", error);
      console.log(
        "\nPlease make sure Chrome is running with remote debugging enabled:"
      );
      console.log(
        'Windows: "C:\\Program Files\\Google Chrome\\Chrome.exe" --remote-debugging-port=9222'
      );
      console.log(
        "Mac: /Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome --remote-debugging-port=9222"
      );
      throw error;
    }
  }
  // scroll page with retry logic
  async #scrollPage(page) {
    let previousHeight = 0;
    let scrollCount = 0;
    const maxAttempts = 10;
    const scrollTimeout = 3000; // 3 seconds timeout

    console.log("Starting scroll process...");

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Scroll to the bottom of the page
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      // Wait for potential content loading
      await this.#sleep(scrollTimeout);

      // Check if new content was loaded
      let newHeight = await page.evaluate(() => document.body.scrollHeight);

      if (newHeight > previousHeight) {
        // Progress was made, update height and continue scrolling
        console.log(
          `Scroll attempt ${attempt}: Height changed from ${previousHeight}px to ${newHeight}px`
        );
        previousHeight = newHeight;
        scrollCount++;

        // Reset attempts since we made progress
        attempt = 0;

        // Check if we've reached max scrolls
        if (scrollCount >= this.maxScrolls) {
          console.log(`Reached maximum number of scrolls (${this.maxScrolls})`);
          break;
        }
      } else {
        console.log(
          `Scroll attempt ${attempt}/${maxAttempts}: No height change detected`
        );
      }
    }

    console.log(`Scrolling finished after ${scrollCount} successful scrolls`);
  }
  // extract website link
  async #extractWebsiteLink(page) {
    try {
      // Create a promise that will resolve with the new page that gets created
      const newPagePromise = new Promise((resolve) => {
        page.browser().once("targetcreated", (target) => {
          resolve(target.page());
        });
      });

      // Click the button that opens the new tab
      await page.evaluate(() => {
        const button = document.querySelector(
          ".flex.h-11.flex-row.items-center.gap-2.rounded-full.border-2.border-gray-200.bg-white.px-4.text-16.font-semibold.text-gray-700"
        );
        if (button) button.click();
      });

      // Wait for the new page to open with a timeout
      const newPage = await Promise.race([
        newPagePromise,
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Timeout waiting for new tab")),
            5000
          )
        ),
      ]);

      // Wait for the new page to finish loading
      await newPage
        .waitForNavigation({ waitUntil: "networkidle2", timeout: 10000 })
        .catch(() => {});

      // Get the URL from the new page
      const websiteUrl = await newPage.url();

      // Close the new page
      await newPage.close();

      return websiteUrl;
    } catch (error) {
      console.error("Error capturing website URL from new tab:", error.message);

      // Fallback method - try to get href directly if available
      const directHref = await page.evaluate(() => {
        const button = document.querySelector(
          '[data-test="visit-website-button"]'
        );
        if (button) return button.getAttribute("href");

        const alternativeButton = document.querySelector(
          ".flex.h-11.flex-row.items-center.gap-2.rounded-full.border-2.border-gray-200.bg-white.px-4.text-16.font-semibold.text-gray-700"
        );
        if (alternativeButton) return alternativeButton.getAttribute("href");

        return null;
      });

      return directHref;
    }
  }

  // extract products
  async #extractProducts(page) {
    return await page.evaluate(() => {
      return [...document.querySelectorAll('[data-test^="post-item-"]')].map(
        (postItem) => {
          const element = postItem.querySelector('[data-test^="post-name-"]');
          element.querySelector("svg").onclick();
          const title = element.innerText.trim();
          const link = element.getAttribute("href");
          const description = postItem
            .querySelector(
              "a.text-16.font-normal.text-dark-gray.text-secondary"
            )
            .innerText.trim();
          const image = postItem.querySelector("a img")?.getAttribute("src");
          const tags = Array.from(
            postItem.querySelectorAll('[data-sentry-component="TagList"] a')
          ).map((tag) => tag.innerText.trim());
          const comment = postItem
            .querySelector("button .text-14.font-semibold.text-dark-gray")
            .innerText.trim();

          return { title, description, image, tags, comment, link };
        }
      );
    });
  }

  // scrape products
  async scrapeProducts(url) {
    let browser;
    try {
      const { browser: newBrowser, page } = await this.#createBrowser();
      browser = newBrowser;

      await page.goto(url, { waitUntil: "networkidle2" });
      await this.#scrollPage(page);
      const products = await this.#extractProducts(page);
      this.#saveToFile(products);

      return products;
    } catch (error) {
      console.error("Error during scraping:", error);
      return [];
    } finally {
      if (browser) await browser.close();
    }
  }

  // scrape website links
  async scrapeWebsiteLinks() {
    try {
      const data = fs.readFileSync("data.json", "utf8");
      const products = JSON.parse(data);
      console.log(
        `Starting to collect website links for ${products.length} products...`
      );

      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        if (product.websiteLink) continue;

        console.log(
          `\nProcessing product ${i + 1}/${products.length}: ${product.title}`
        );

        let browser;
        try {
          const { browser: newBrowser, page } = await this.#createBrowser();
          browser = newBrowser;

          const url = `https://www.producthunt.com${product.link}`;
          console.log(`Visiting: ${url}`);

          await page.goto(url, { waitUntil: "networkidle2" });
          const websiteLink = await this.#extractWebsiteLink(page);

          product.websiteLink = websiteLink;
          // save to file
          this.#saveToFile(products);
          console.log(
            `Website link found: ${product.websiteLink || "No link found"}`
          );
        } catch (error) {
          console.error(
            `❌ Error processing ${product.title}: ${error.message}`
          );
          product.websiteLink = null;
        } finally {
          if (browser) await browser.close();
        }
      }

      console.log("\nFinished collecting all website links");
      return products;
    } catch (error) {
      console.error("Error processing products:", error);
      return [];
    }
  }

  // collect technology data
  async collectTechnologyData() {
    try {
      const data = fs.readFileSync("data.json", "utf8");
      const products = JSON.parse(data);
      console.log("Starting technology analysis...");

      for (let i = 0; i < products.length; i++) {
        const product = products[i];

        if (!product.websiteLink || product.technologies) {
          console.log(
            `
            ❌ ${i + 1}/${products.length}
            Skipping ${
              product.title
            } due to missing website link or technologies`
          );
        }

        const websiteLink = product.websiteLink?.replace(
          "/?ref=producthunt",
          ""
        );

        let browser;
        try {
          const wsEndpoint = await this.#getBrowserWSEndpoint();
          browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint });
          const page = await browser.newPage();

          await page.setViewport({ width: 1350, height: 850 });
          await page.goto("https://pro.builtwith.com/", {
            waitUntil: "networkidle2",
          });

          // Find and fill the search input
          await page.waitForSelector(".form-control.mr-sm-1.topSB");
          await page.type(".form-control.mr-sm-1.topSB", websiteLink);

          // Submit the form
          await page.keyboard.press("Enter");

          // Wait for results to load
          await this.#sleep(5000);

          // Extract technologies
          const technologies = await page.evaluate(() => {
            const data = {
              frameworks: [],
              javascriptLibraries: [],
              cms: [],
            };
            document
              .querySelectorAll(".row.mb-1.mt-1 .col-12")
              .forEach((el) => {
                const name = el.querySelector("h2 a")?.textContent.trim();
                const link = el.querySelector("h2 a")?.href;
                const description = el
                  .querySelector("p.pb-0.mb-0.small")
                  ?.textContent.trim();

                if (link?.includes("/framework/")) {
                  data.frameworks.push(name);
                } else if (link?.includes("/javascript/")) {
                  data.javascriptLibraries.push(name);
                } else if (link?.includes("/cms/")) {
                  data.cms.push(name);
                }
              });

            return data;
          });

          product.technologies = technologies;
          this.#saveToFile(products);
          await page.close();
        } catch (error) {
          console.error(
            `Failed to analyze technologies for ${websiteLink}:`,
            error
          );
          product.technologies = [];
        } finally {
          await browser.disconnect();
        }
        console.log(`Analyzing ${product.title}: ${websiteLink}`);
      }

      console.log("Technology analysis completed.");
      return products;
    } catch (error) {
      console.error("Error during technology analysis:", error);
      return [];
    }
  }
}

// Usage
const scraper = new ProductHuntScraper("PRODUCTION");
(async () => {
  // await scraper.scrapeProducts(
  //   "https://www.producthunt.com/leaderboard/yearly/2025/all"
  // );
  // await scraper.scrapeWebsiteLinks();
  await scraper.collectTechnologyData();
})();
