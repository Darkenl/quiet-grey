/* SPDX-License-Identifier: GPL-3.0-or-later */
import definePlugin from "@utils/types";

const STATUS = 'svg[class*="mask_"] rect[mask*="status"]';
const marked = new Set<HTMLElement>();
let observer: MutationObserver | undefined;

function mark(node: Element) {
    const svg = node.closest('svg[class*="mask_"]');
    const host = svg?.parentElement;
    if (!host) return;
    const state = node.getAttribute("mask")?.match(/status-(online|idle|dnd|offline|streaming)/)?.[1];
    if (!state) return;
    if (host.dataset.quietStatus !== state) host.dataset.quietStatus = state;
    marked.add(host);
}

function discover(node: Element) {
    if (node.matches(STATUS)) mark(node);
    for (const status of node.querySelectorAll(STATUS)) mark(status);
}

export default definePlugin({
    name: "QuietStaticStatus",
    description: "Maintains static avatar status colors without expensive relational CSS selectors.",
    authors: [{ name: "Darken", id: 0n }],
    start() {
        discover(document.documentElement);
        observer = new MutationObserver(records => {
            for (const record of records) {
                if (record.type === "attributes") {
                    if (record.target instanceof Element && record.target.matches(STATUS)) mark(record.target);
                    continue;
                }
                if (record.target instanceof Element) {
                    const svg = record.target.closest('svg[class*="mask_"]');
                    if (svg && !svg.querySelector('rect[mask*="status"]')) {
                        svg.parentElement?.removeAttribute("data-quiet-status");
                    }
                }
                for (const node of record.addedNodes) if (node instanceof Element) discover(node);
            }
            for (const host of marked) if (!host.isConnected) marked.delete(host);
        });
        observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["mask"] });
    },
    stop() {
        observer?.disconnect();
        observer = undefined;
        for (const host of marked) host.removeAttribute("data-quiet-status");
        marked.clear();
    }
});
