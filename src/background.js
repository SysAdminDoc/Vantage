// Vantage v0.1.0 — service worker. Currently only handles the toolbar action click
// (opens a fresh new tab so the user lands on Vantage with the settings ready to open).

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: "chrome://newtab" });
});
