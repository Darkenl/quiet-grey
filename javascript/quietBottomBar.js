/* SPDX-License-Identifier: GPL-3.0-or-later */
import definePlugin from "@utils/types";
import { RTCConnectionStore } from "@webpack/common";
const SELECTOR = '[class*="chatContent_"] [class*="channelTextArea_"]';
let target = null;
let observer;
let resize;
let frame = 0;
let pingTimer;
let lastGeometry = "";
function updatePing() {
  const host = document.querySelector('.connection_e131a9 [class*="rtcConnectionStatusWrapper_"], .connection_e131a9 .inner_e131a9');
  if (!host) return;
  const ping = RTCConnectionStore?.getLastPing() ?? RTCConnectionStore?.getAveragePing();
  const text = typeof ping === "number" && Number.isFinite(ping) && ping >= 0 ? `${Math.round(ping)} ms` : "\u2014 ms";
  if (host.dataset.quietPing !== text) host.dataset.quietPing = text;
}
const untrapped = /* @__PURE__ */ new Set();
function untrap() {
  for (const anchor of document.querySelectorAll(".wrapper_e131a9, .audioButtonParent__5e764")) {
    for (let node = anchor.parentElement; node; node = node.parentElement) {
      const css = getComputedStyle(node);
      if (css.transform !== "none" || css.filter !== "none" || css.perspective !== "none" || css.backdropFilter !== "none" || css.translate !== "none" || css.scale !== "none" || css.rotate !== "none" || css.contentVisibility === "auto" || /layout|paint|strict|content/.test(css.contain) || /transform|filter/.test(css.willChange)) {
        node.setAttribute("data-quiet-untrap", "");
        untrapped.add(node);
      }
    }
  }
}
function refresh() {
  untrap();
  attach();
  schedule();
}
function position() {
  frame = 0;
  if (!target?.isConnected || target.getBoundingClientRect().width === 0) attach();
  if (!target?.isConnected) return;
  const rect = target.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return;
  const geometry = `${rect.left}:${rect.width}:${rect.bottom}`;
  if (geometry !== lastGeometry) {
    untrap();
    lastGeometry = geometry;
  }
  const root = document.documentElement;
  root.style.setProperty("--quiet-call-left", `${rect.left}px`);
  root.style.setProperty("--quiet-call-width", `${rect.width}px`);
  root.style.setProperty("--quiet-call-top", `${rect.bottom + 4}px`);
}
function schedule() {
  position();
}
function attach() {
  const next = Array.from(document.querySelectorAll(SELECTOR)).find((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && getComputedStyle(element).visibility !== "hidden";
  }) ?? null;
  if (next === target) return;
  resize?.disconnect();
  target = next;
  document.documentElement.toggleAttribute("data-quiet-bottom-bar", !!target);
  if (target) {
    untrap();
    resize?.observe(target);
    if (target.parentElement) resize?.observe(target.parentElement);
    schedule();
  }
}
var stdin_default = definePlugin({
  name: "QuietBottomBar",
  description: "Places the voice controls beneath the message input, retaining the sidebar user panel.",
  authors: [{ name: "Darken", id: 0n }],
  start() {
    resize = new ResizeObserver(schedule);
    observer = new MutationObserver((records) => {
      if (target?.isConnected) return;
      if (target || records.some((record) => Array.from(record.addedNodes).some((node) => node instanceof Element && (node.matches(SELECTOR) || node.querySelector(SELECTOR))))) attach();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("focus", refresh);
    window.addEventListener("blur", refresh);
    document.addEventListener("visibilitychange", refresh);
    attach();
    updatePing();
    pingTimer = setInterval(() => {
      updatePing();
      attach();
      schedule();
    }, 1e3);
  },
  stop() {
    observer?.disconnect();
    resize?.disconnect();
    clearInterval(pingTimer);
    for (const host of document.querySelectorAll("[data-quiet-ping]")) host.removeAttribute("data-quiet-ping");
    window.removeEventListener("resize", schedule);
    window.removeEventListener("focus", refresh);
    window.removeEventListener("blur", refresh);
    document.removeEventListener("visibilitychange", refresh);
    for (const node of untrapped) node.removeAttribute("data-quiet-untrap");
    untrapped.clear();
    cancelAnimationFrame(frame);
    frame = 0;
    target = null;
    lastGeometry = "";
    document.documentElement.removeAttribute("data-quiet-bottom-bar");
    for (const name of ["left", "width", "top"]) document.documentElement.style.removeProperty(`--quiet-call-${name}`);
  }
});
export {
  stdin_default as default
};
