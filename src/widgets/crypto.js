// Vantage — Cryptocurrency price panel widget. Data: CoinGecko free API.
// CoinGecko v3 now requires `x-cg-demo-api-key` for the public demo tier;
// keyless requests still succeed but are rate-limited harshly. Users can
// register a free demo key at https://www.coingecko.com/en/api.

import { el, clear } from "../utils/dom.js";
import { iconString, iconNode } from "../icons.js";
import { relativeTime } from "../utils/dom.js";
import { i18n } from "../utils/i18n.js";

const COIN_META = {
  bitcoin:   { symbol: "BTC", name: "Bitcoin" },
  ethereum:  { symbol: "ETH", name: "Ethereum" },
  solana:    { symbol: "SOL", name: "Solana" },
  cardano:   { symbol: "ADA", name: "Cardano" },
  dogecoin:  { symbol: "DOGE", name: "Dogecoin" },
  ripple:    { symbol: "XRP", name: "XRP" },
  polkadot:  { symbol: "DOT", name: "Polkadot" },
  chainlink: { symbol: "LINK", name: "Chainlink" },
  litecoin:  { symbol: "LTC", name: "Litecoin" },
  "shiba-inu":{ symbol: "SHIB", name: "Shiba Inu" },
};

const COINGECKO_DASHBOARD = "https://www.coingecko.com/en/api";

export function renderCrypto(mount, settings, { onAttachDragHandle } = {}) {
  clear(mount);
  const cfg = settings.crypto;
  if (!cfg?.enabled) {
    mount.style.display = "none";
    return;
  }
  mount.style.display = "";

  const coins    = cfg.coins?.length ? cfg.coins : ["bitcoin", "ethereum", "solana"];
  const currency = cfg.currency || "usd";
  const symbol   = currency === "usd" ? "$" : currency.toUpperCase() + " ";
  const apiKey   = (cfg.apiKey || "").trim();

  let lastFetch = null;
  let refreshInterval = null;

  const header = el("div", { class: "panel-header" }, [
    el("div", { class: "panel-header__left" }, [
      el("span", { class: "panel-header__drag", "aria-hidden": "true", innerHTML: iconString("grip", 14) }),
      el("h2", { class: "panel-header__title" }, [iconNode("trending-up", { size: 14 }), ` ${i18n("cryptoPrices")}`])
    ]),
    el("div", { class: "panel-header__right" })
  ]);

  const body = el("div", { class: "panel-body crypto-body" });
  mount.appendChild(header);
  mount.appendChild(body);

  if (onAttachDragHandle) onAttachDragHandle(header.querySelector(".panel-header__drag"));

  async function load() {
    body.innerHTML = "";
    body.appendChild(el("div", { class: "panel-spinner" }, [iconNode("refresh", { size: 20, className: "spin" })]));

    try {
      const ids  = coins.join(",");
      const url  = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${currency}&include_24hr_change=true&include_market_cap=false`;
      const headers = { "Accept": "application/json" };
      if (apiKey) headers["x-cg-demo-api-key"] = apiKey;
      const resp = await fetch(url, { headers });
      if (resp.status === 401 || resp.status === 429) {
        showApiKeyPrompt(resp.status);
        return;
      }
      if (!resp.ok) throw new Error(`CoinGecko ${resp.status}`);
      const data = await resp.json();
      lastFetch  = new Date();
      renderRows(data);
    } catch (err) {
      body.innerHTML = "";
      body.appendChild(el("div", { class: "panel-error" }, [
        i18n("cryptoLoadError", [err.message.toLowerCase()], "Couldn't load prices - $1.")
      ]));
    }
  }

  function showApiKeyPrompt(status) {
    body.innerHTML = "";
    const isAuthError = status === 401;
    const reason = isAuthError
      ? i18n("coingeckoRejected", null, "CoinGecko rejected the request - your API key may be invalid or missing.")
      : i18n("coingeckoRateLimited", null, "CoinGecko rate-limited this request - try again later.");
    const hint = isAuthError
      ? [
          i18n("coingeckoSetupKeyPrefix", null, "Set up a free CoinGecko demo API key (no credit card) at "),
          el("a", {
            href: COINGECKO_DASHBOARD,
            target: "_blank",
            rel: "noopener noreferrer",
            class: "crypto-empty__link"
          }, ["coingecko.com/en/api"]),
          i18n("coingeckoSetupKeySuffix", null, ", then paste it into Settings -> Crypto.")
        ]
      : apiKey
        ? [i18n("coingeckoConfiguredKeyRateLimit", null, "Your configured API key hit a rate limit. Wait a few minutes, then refresh the panel.")]
        : [
            i18n("coingeckoKeylessRateLimit", null, "Keyless requests are rate-limited aggressively. Wait a few minutes, or add a free demo API key in Settings -> Crypto for more quota.")
          ];
    body.appendChild(el("div", { class: "panel-empty crypto-empty--keyprompt" }, [
      el("div", { class: "crypto-empty__inner" }, [
        el("p", { class: "crypto-empty__lead" }, [reason]),
        el("p", { class: "crypto-empty__hint" }, hint)
      ])
    ]));
  }

  function renderRows(data) {
    body.innerHTML = "";
    const table = el("div", { class: "crypto-table" });

    let rendered = 0;
    for (const id of coins) {
      const entry = data[id];
      if (!entry) continue;
      const meta    = COIN_META[id] || { symbol: id.toUpperCase(), name: id };
      const price   = entry[currency];
      const change  = entry[`${currency}_24h_change`];
      const up      = change >= 0;
      const priceStr = price >= 1
        ? symbol + price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        : symbol + price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 6 });
      const changeStr = (up ? "+" : "") + (change ?? 0).toFixed(2) + "%";

      table.appendChild(el("div", { class: "crypto-row" }, [
        el("div", { class: "crypto-name" }, [
          el("span", { class: "crypto-symbol" }, [meta.symbol]),
          el("span", { class: "crypto-fullname" }, [meta.name])
        ]),
        el("div", { class: "crypto-price" }, [priceStr]),
        el("div", { class: `crypto-change crypto-change--${up ? "up" : "down"}` }, [changeStr])
      ]));
      rendered++;
    }

    // CoinGecko sometimes returns 200 with an empty body for delisted /
    // typo'd coin IDs. Don't render an empty table + healthy "Updated"
    // footer — that looks like the panel is working when it isn't.
    if (rendered === 0) {
      body.appendChild(el("div", { class: "panel-empty" }, [
        el("div", { class: "crypto-empty__inner" }, [
          el("p", { class: "crypto-empty__lead" }, [i18n("cryptoNoPrices", null, "No prices returned for the configured coins.")]),
          el("p", { class: "crypto-empty__hint" }, [
            i18n("cryptoNoPricesHintPrefix", null, "Check the coin IDs in Settings -> Crypto. CoinGecko expects lowercase IDs (e.g. "),
            el("code", {}, ["bitcoin"]), ", ", el("code", {}, ["ethereum"]),
            i18n("cryptoNoPricesHintSuffix", null, "), and some IDs change when projects rebrand.")
          ])
        ])
      ]));
      return;
    }

    const footer = el("div", { class: "crypto-footer" }, [
      el("span", { class: "crypto-updated" }, [i18n("updatedRelative", [relativeTime(lastFetch)], "Updated $1")]),
      el("button", {
        type: "button",
        class: "icon-button icon-button--ghost icon-button--tiny",
        "aria-label": i18n("refresh", null, "Refresh"),
        onClick: load
      }, [iconNode("refresh", { size: 12 })])
    ]);

    body.appendChild(table);
    body.appendChild(footer);
  }

  load();
  const mins = Math.max(1, cfg.refreshMinutes || 5);
  refreshInterval = setInterval(load, mins * 60 * 1000);

  // Return teardown via a cleanup property on the mount (checked in mountAll)
  mount._cryptoCleanup = () => clearInterval(refreshInterval);
}
