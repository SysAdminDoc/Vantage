// Vantage — GitHub Gist-based settings transfer.
// Public Gist import stays unauthenticated. Creating a Gist requires a
// one-shot GitHub token with Gists: write and the token is never persisted.

const GIST_FILENAME = "vantage-settings.json";
const GIST_DESCRIPTION = "Vantage NTP settings (generated via https://vantage.dashboard)";
const GITHUB_API_HEADERS = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2026-03-10"
};

/**
 * Create a public GitHub Gist with the current settings.
 * Returns { gistUrl: string, gistId: string } or throws an error.
 */
export async function createSettingsGist(settings, token) {
  const bearer = String(token || "").trim();
  if (!bearer) {
    throw new Error("Creating a Gist requires a GitHub token with Gists write access.");
  }

  const payload = {
    description: GIST_DESCRIPTION,
    public: true,
    files: {
      [GIST_FILENAME]: {
        content: JSON.stringify(settings, null, 2)
      }
    }
  };

  const response = await fetch("https://api.github.com/gists", {
    method: "POST",
    headers: {
      ...GITHUB_API_HEADERS,
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearer}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await githubErrorMessage(response);
    if (response.status === 401 || response.status === 403) {
      throw new Error(`${message || "GitHub rejected the token."} Use a fine-grained token with Gists: write, or copy the JSON manually.`);
    }
    throw new Error(message || `GitHub API error: ${response.status}`);
  }

  const gist = await response.json();
  const gistUrl = gist.html_url;
  const gistId = gist.id;

  if (!gistUrl || !gistId) {
    throw new Error("GitHub created a Gist but did not return a usable URL.");
  }

  return { gistUrl, gistId };
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
    // Fetch Gist metadata. Public gists do not need authentication.
    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: GITHUB_API_HEADERS
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Gist not found. Check the URL and try again.");
      }
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const gist = await response.json();
    const files = gist.files && typeof gist.files === "object" ? gist.files : {};

    // Find the settings file in the gist
    const settingsFile = files[GIST_FILENAME];
    if (!settingsFile) {
      // Fall back to first JSON file if GIST_FILENAME not found
      const jsonFiles = Object.entries(files).filter(([name]) =>
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
      return JSON.parse(await readGistFile(file));
    }

    return JSON.parse(await readGistFile(settingsFile));
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

async function readGistFile(file) {
  if (!file || typeof file !== "object") {
    throw new Error("Gist file metadata is missing.");
  }
  if (typeof file.content === "string" && !file.truncated) {
    return file.content;
  }
  if (file.raw_url) {
    const rawResponse = await fetch(file.raw_url, { headers: { Accept: "application/json" } });
    if (!rawResponse.ok) {
      throw new Error(`Couldn't load the raw Gist file (${rawResponse.status}).`);
    }
    return rawResponse.text();
  }
  throw new Error("The Gist file is too large to import through the API response.");
}

async function githubErrorMessage(response) {
  try {
    const data = await response.json();
    if (data?.message) return data.message;
  } catch {}
  try {
    const text = await response.text();
    if (text) return text;
  } catch {}
  return "";
}
