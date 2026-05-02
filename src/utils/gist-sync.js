// Vantage v1.1.0 — GitHub Gist-based settings sync for multi-device setup.
// Privacy-aligned: uses public GitHub Gist API (no auth), users own the data.

const GIST_FILENAME = "vantage-settings.json";
const GIST_DESCRIPTION = "Vantage NTP settings (generated via https://vantage.dashboard)";

/**
 * Create a public GitHub Gist with the current settings.
 * Returns { gistUrl: string, gistId: string } or throws an error.
 * 
 * Note: GitHub's public Gist API allows creating gists without authentication,
 * but the request must come from a browser with CORS headers. For extension
 * contexts, we may need to use the GitHub API token if available, or fallback
 * to a proxy. For now, we'll attempt direct fetch and document the limitation.
 */
export async function createSettingsGist(settings) {
  const payload = {
    description: GIST_DESCRIPTION,
    public: true,
    files: {
      [GIST_FILENAME]: {
        content: JSON.stringify(settings, null, 2)
      }
    }
  };

  try {
    // GitHub Gist API endpoint
    const response = await fetch("https://api.github.com/gists", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(
        err.message || `GitHub API error: ${response.status}`
      );
    }

    const gist = await response.json();
    const gistUrl = gist.html_url;
    const gistId = gist.id;

    return { gistUrl, gistId };
  } catch (err) {
    // CORS or network error
    throw new Error(
      `Failed to create Gist: ${err.message}. ` +
      `Note: This may require GitHub authentication. ` +
      `Try manually creating a GitHub Gist with your Vantage settings JSON and pasting the URL.`
    );
  }
}

/**
 * Fetch settings from a public GitHub Gist URL.
 * Accepts formats:
 *   - https://gist.github.com/user/abc123
 *   - https://gist.github.com/abc123
 *   - abc123 (gist ID only)
 * 
 * Returns the parsed settings object, or throws an error.
 */
export async function loadSettingsFromGist(gistUrlOrId) {
  let gistId = null;

  // Parse the Gist ID from URL or use directly
  if (gistUrlOrId.startsWith("http")) {
    const match = gistUrlOrId.match(/gist\.github\.com\/(?:[\w\-]+\/)?([a-f0-9]+)/i);
    if (!match) {
      throw new Error("Invalid Gist URL. Use https://gist.github.com/user/id or https://gist.github.com/id");
    }
    gistId = match[1];
  } else {
    gistId = gistUrlOrId.trim();
  }

  if (!/^[a-f0-9]+$/i.test(gistId)) {
    throw new Error("Invalid Gist ID format");
  }

  try {
    // Fetch raw Gist as JSON
    const response = await fetch(`https://api.github.com/gists/${gistId}`);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Gist not found. Check the URL and try again.");
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const gist = await response.json();

    // Find the settings file in the gist
    const settingsFile = gist.files[GIST_FILENAME];
    if (!settingsFile) {
      // Fall back to first JSON file if GIST_FILENAME not found
      const jsonFiles = Object.entries(gist.files).filter(([name]) =>
        name.endsWith(".json")
      );
      if (!jsonFiles.length) {
        throw new Error(
          `No ${GIST_FILENAME} file found in this Gist. ` +
          `Create a new Gist with your Vantage settings JSON.`
        );
      }
      // Use the first JSON file
      const [, file] = jsonFiles[0];
      return JSON.parse(file.content);
    }

    return JSON.parse(settingsFile.content);
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error("Invalid JSON in Gist. Ensure your settings export is valid JSON.");
    }
    throw err;
  }
}

/**
 * Generate a share URL with base64-encoded settings (for offline import).
 * This is used for settings > Share link and also for Gist fallback.
 */
export function generateShareUrl(settings) {
  const encoded = btoa(
    unescape(encodeURIComponent(JSON.stringify(settings)))
  );
  const url = new URL(location.href);
  url.hash = `import=${encoded}`;
  return url.href;
}
