// Vantage — service worker. Opens a new tab when the toolbar action is clicked.
// Firefox exposes `browser` as a global; Chrome does not. We use whichever is present.
// Chrome navigates to chrome://newtab so the override fires; Firefox opens a blank tab
// which Firefox itself routes to our overridden newtab page.
const isFirefox = typeof browser !== "undefined";
const ext = isFirefox ? browser : chrome;

ext.action.onClicked.addListener(() => {
  isFirefox ? ext.tabs.create({}) : ext.tabs.create({ url: "chrome://newtab" });
});
