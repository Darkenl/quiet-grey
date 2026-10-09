import definePlugin from "@utils/types";
const STATUS = 'svg[class*="mask_"] rect[mask*="status"], .wrapper__44b0c[role="img"][aria-label]';
const marked = /* @__PURE__ */ new Set();
let observer;
function mark(node) {
  const svg = node.closest('svg[class*="mask_"]');
  const host = node.matches(".wrapper__44b0c") ? node : svg?.parentElement;
  if (!host) return;
  const label = host.getAttribute("aria-label") ?? "";
  const state = node.getAttribute("mask")?.match(/status-(online|idle|dnd|offline|streaming)/)?.[1] ?? (/[,，]\s*(?:Do Not Disturb|DND|Не беспокоить)\s*$/i.test(label) ? "dnd" : /[,，]\s*(?:Idle|Не активен|Неактивен)\s*$/i.test(label) ? "idle" : /[,，]\s*(?:Invisible|Offline|Невидимый|Не в сети)\s*$/i.test(label) ? "offline" : /[,，]\s*(?:Online|В сети)\s*$/i.test(label) ? "online" : void 0);
  if (!state) return;
  if (host.dataset.quietStatus !== state) host.dataset.quietStatus = state;
  marked.add(host);
}
function discover(node) {
  if (node.matches(STATUS)) mark(node);
  for (const status of node.querySelectorAll(STATUS)) mark(status);
}
var index_default = definePlugin({
  name: "QuietStaticStatus",
  description: "Maintains static avatar status colors without expensive relational CSS selectors.",
  authors: [{ name: "Darken", id: 0n }],
  start() {
    discover(document.documentElement);
    observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "attributes") {
          if (record.target instanceof Element && record.target.matches(STATUS)) mark(record.target);
          continue;
        }
        if (record.target instanceof Element) {
          const svg = record.target.closest('svg[class*="mask_"]');
          if (svg && !svg.querySelector('rect[mask*="status"]') && !svg.parentElement?.matches(".wrapper__44b0c[aria-label]")) {
            svg.parentElement?.removeAttribute("data-quiet-status");
          }
        }
        for (const node of record.addedNodes) if (node instanceof Element) discover(node);
      }
      for (const host of marked) if (!host.isConnected) marked.delete(host);
    });
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["mask", "aria-label"] });
  },
  stop() {
    observer?.disconnect();
    observer = void 0;
    for (const host of marked) host.removeAttribute("data-quiet-status");
    marked.clear();
  }
});
export {
  index_default as default
};
