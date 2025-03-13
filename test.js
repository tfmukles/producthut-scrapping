import fs from "fs";
import path from "path";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { fileURLToPath } from "url";

// Use StealthPlugin to avoid detection
puppeteer.use(StealthPlugin());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Write initial empty output file immediately
const outputPath = path.join(__dirname, "output.json");
if (!fs.existsSync(outputPath)) {
  fs.writeFileSync(outputPath, JSON.stringify([], null, 2), "utf8");
}
console.log(`Ensured output.json exists at: ${outputPath}`);

const CONFIG = {
  targetUrl: "https://app.impact.com/secure/mediapartner/home/pview.ihtml",
  timeout: 60000,
};

async function getBrowserWSEndpoint() {
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

async function processEntry(browser, entry, index, total) {
  console.log(`\nProcessing entry ${index + 1} of ${total}`);
  const page = await browser.newPage();

  try {
    await page.setViewport({ width: 1350, height: 850 });
    console.log("Navigating to page...");
    await page.goto(CONFIG.targetUrl, {
      waitUntil: "networkidle2",
      timeout: CONFIG.timeout,
    });

    console.log("Typing URL...");
    const inputField = await page.waitForSelector(
      "input[placeholder='Landing Page']"
    );
    await inputField.type(entry.origin);

    // Verify the input value before proceeding
    const inputValue = await inputField.evaluate((el) => el.value);
    if (inputValue !== entry.origin) {
      throw new Error(
        "URL input verification failed - value doesn't match expected origin"
      );
    }

    console.log("Clicking create button...");
    await page.click("button.button");

    // Wait for 1 second
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Wait for the value to change from the initial state
    console.log("Waiting for link generation...");
    let finalValue = null;

    const maxRetries = 10; // Increase the number of retries
    let retries = 0;
    let currentValue = null;

    while (retries < maxRetries) {
      try {
        currentValue = await page.$eval(
          "input.inputNotEditing[readonly]",
          (input) => input.value
        );
        if (currentValue) break;
      } catch (error) {
        console.log(`Retry ${retries + 1}/${maxRetries} - Element not found`);
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Increase delay between retries
      }
      retries++;
    }

    if (!currentValue) {
      throw new Error("Failed to find element matching selector after retries");
    }

    finalValue = `https://${currentValue}`;
    console.log(`Confirmed final value: ${finalValue}`);

    // Update output file with success - only old and generated fields
    const currentOutput = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    currentOutput.push({
      old: entry.old,
      new: finalValue,
    });
    fs.writeFileSync(outputPath, JSON.stringify(currentOutput, null, 2));

    return finalValue;
  } catch (error) {
    console.error(`Error processing entry: ${error.message}`);

    // Add failed entry to failed.json
    const failedPath = path.join(__dirname, "failed.json");
    let failedEntries = [];

    try {
      failedEntries = JSON.parse(fs.readFileSync(failedPath, "utf8"));
    } catch (e) {
      // If file doesn't exist or is invalid, start with empty array
    }

    failedEntries.push({
      old: entry.old,
      origin: entry.origin,
      error: error.message,
    });

    fs.writeFileSync(failedPath, JSON.stringify(failedEntries, null, 2));
    throw error;
  } finally {
    await page.close();
  }
}

async function automateProcess() {
  console.log("Starting automation process...");
  let browser;

  try {
    // Read input data
    console.log("Reading data.json...");
    const dataPath = path.join(__dirname, "data.json");
    const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

    // Read existing output data
    let existingOutput = [];
    try {
      existingOutput = JSON.parse(fs.readFileSync(outputPath, "utf8"));
    } catch (e) {
      // If file doesn't exist or is invalid, start with empty array
      fs.writeFileSync(outputPath, JSON.stringify([], null, 2));
    }

    // Filter out entries that already exist in output.json
    const existingOldLinks = new Set(existingOutput.map((item) => item.old));
    const newData = data.filter((item) => !existingOldLinks.has(item.old));

    console.log(`Found ${data.length} total entries`);
    console.log(`Found ${existingOutput.length} existing entries`);
    console.log(`Processing ${newData.length} new entries`);

    if (newData.length === 0) {
      console.log("No new entries to process");
      return;
    }

    // Get Chrome WebSocket URL
    console.log("Connecting to Chrome...");
    const wsEndpoint = await getBrowserWSEndpoint();
    console.log(`Got WebSocket URL: ${wsEndpoint}`);

    // Connect to browser
    browser = await puppeteer.connect({ browserWSEndpoint: wsEndpoint });
    console.log("Connected to Chrome successfully");

    // Process each entry
    for (let i = 0; i < newData.length; i++) {
      try {
        await processEntry(browser, newData[i], i, newData.length);
      } catch (error) {
        console.error(`Failed to process entry ${i + 1}:`, error.message);
        // Continue with next entry despite error
      }
    }

    console.log(
      "\nProcess completed! Check output.json for results and failed.json for failures"
    );
  } catch (error) {
    console.error("Process failed:", error);
  } finally {
    if (browser) {
      await browser.disconnect();
      console.log("Browser disconnected");
    }
  }
}

// Run the process
console.log(`Script running from directory: ${__dirname}`);
automateProcess().catch(console.error);
