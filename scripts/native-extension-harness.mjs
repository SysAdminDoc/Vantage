import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Launch Chrome with extension support enabled, install the unpacked Vantage
 * build through Puppeteer's extension protocol, and prove that its MV3 worker
 * is running before any browser result is accepted.
 */
export async function launchNativeExtension(puppeteer, {
  extensionPath,
  userDataDir,
  headless = true
}) {
  const manifest = JSON.parse(await readFile(join(extensionPath, "manifest.json"), "utf8"));
  const serviceWorker = manifest.background?.service_worker;
  if (!serviceWorker) {
    throw new Error("Native Chromium build does not declare background.service_worker");
  }
  let browser;
  try {
    browser = await puppeteer.launch({
      headless,
      userDataDir,
      enableExtensions: true
    });

    const id = await browser.installExtension(extensionPath);
    const installed = await browser.extensions();
    const extension = installed.get(id);
    if (!extension) {
      throw new Error(`Puppeteer installed extension ${id}, but it was not listed afterward`);
    }
    if (extension.name !== manifest.name || extension.version !== manifest.version) {
      throw new Error(
        `Loaded extension metadata does not match the build: ` +
        `${extension.name} v${extension.version} (expected ${manifest.name} v${manifest.version})`
      );
    }

    const workerPath = `/${serviceWorker}`;
    const workerTarget = await browser.waitForTarget(target => {
      if (target.type() !== "service_worker") return false;
      try {
        const url = new URL(target.url());
        return url.protocol === "chrome-extension:" &&
          url.hostname === id &&
          url.pathname === workerPath;
      } catch {
        return false;
      }
    }, { timeout: 10000 });

    return { browser, extension, id, manifest, workerTarget };
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    throw new Error(`Native Vantage load failed: ${err.message}`, { cause: err });
  }
}
