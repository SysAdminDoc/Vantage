// Vantage — Cryptocurrency price panel widget. Data: CoinGecko free API (no key).

import { el, clear } from "../utils/dom.js";
import { iconString, iconNode } from "../icons.js";
import { relativeTime } from "../utils/dom.js";

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

  let lastFetch = null;
  let refreshInterval = null;

  const header = el("div", { class: "panel-header" }, [
    el("div", { class: "panel-header__left" }, [
      el("span", { class: "panel-header__drag", "aria-hidden": "true", innerHTML: iconString("grip", 14) }),
      el("h2", { class: "panel-header__title" }, [iconNode("trending-up", { size: 14 }), " Crypto"])
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
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`CoinGecko ${resp.status}`);
      const data = await resp.json();
      lastFetch  = new Date();
      renderRows(data);
    } catch (err) {
      body.innerHTML = "";
      body.appendChild(el("div", { class: "panel-empty" }, [
        `Could not load prices: ${err.message}`
      ]));
    }
  }

  function renderRows(data) {
    body.innerHTML = "";
    const table = el("div", { class: "crypto-table" });

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
    }

    const footer = el("div", { class: "crypto-footer" }, [
      el("span", { class: "crypto-updated" }, [`Updated ${relativeTime(lastFetch)}`]),
      el("button", {
        type: "button",
        class: "icon-button icon-button--ghost icon-button--tiny",
        "aria-label": "Refresh",
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
