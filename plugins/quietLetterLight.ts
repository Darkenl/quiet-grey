/* SPDX-License-Identifier: GPL-3.0-or-later */
import definePlugin from "@utils/types";

const ROW = '[class*="voiceUser_"]';
const NAME = '[class*="username_"], [class*="usernameSpeaking_"], [class*="name_"]';
const CSS = `
#app-mount .qll-host.qll-host {
    position: relative !important;
    background: none !important;
    -webkit-text-fill-color: transparent !important;
    color: transparent !important;
    animation: none !important;
    transition: none !important;
}
#app-mount .qll-host.qll-host .qll-overlay {
    position: absolute; inset: 0; pointer-events: none;
    white-space: pre; overflow: hidden; text-overflow: ellipsis;
    font: inherit; letter-spacing: inherit;
}
#app-mount .qll-host.qll-host .qll-letter {
    color: #969696 !important;
    -webkit-text-fill-color: currentColor !important;
    background: none !important;
    text-shadow: none !important;
    transition: color 180ms ease, -webkit-text-fill-color 180ms ease,
                text-shadow 180ms ease;
    transition-delay: 0ms;
}
#app-mount .qll-host.qll-host[data-qll-speaking="true"] .qll-letter {
    color: #ffffff !important;
    -webkit-text-fill-color: currentColor !important;
    text-shadow: 0 0 4px #ffffff30 !important;
    transition-delay: var(--qll-delay);
}
@media (prefers-reduced-motion: reduce) {
    #app-mount .qll-host.qll-host .qll-letter { transition: none; }
}
`;

type Entry = { overlay: HTMLSpanElement; text: string; off?: ReturnType<typeof setTimeout>; };
const entries = new Map<HTMLElement, Entry>();
const dirtyRows = new Set<HTMLElement>();
const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
let observer: MutationObserver | undefined;
let style: HTMLStyleElement | undefined;
let frame = 0;

function nameText(host: HTMLElement): string {
    const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT, {
        acceptNode: node => node.parentElement?.closest(".qll-overlay")
            ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    let text = "";
    while (walker.nextNode()) text += walker.currentNode.textContent ?? "";
    return text;
}

function letters(text: string): string[] {
    // Segment graphemes so emoji, combining accents and Cyrillic stay intact.
    return Array.from(segmenter.segment(text), s => s.segment);
}

function scan() {
    frame = 0;
    for (const [host, entry] of entries) {
        if (!host.isConnected || !host.closest(ROW)) {
            clearTimeout(entry.off);
            host.classList.remove("qll-host");
            host.removeAttribute("data-qll-speaking");
            entry.overlay.remove();
            entries.delete(host);
        }
    }
    const rows = Array.from(dirtyRows);
    dirtyRows.clear();
    for (const row of rows) {
        if (!row.isConnected) continue;
        const host = row.querySelector<HTMLElement>(NAME);
        if (!host) continue;
        const text = nameText(host);
        let entry = entries.get(host);
        if (!entry) {
            const overlay = document.createElement("span");
            overlay.className = "qll-overlay";
            overlay.setAttribute("aria-hidden", "true");
            entry = { overlay, text: "" };
            entries.set(host, entry);
            host.classList.add("qll-host");
            host.dataset.qllSpeaking = "false";
        }
        if (text !== entry.text || !entry.overlay.childNodes.length) {
            entry.text = text;
            const graphemes = letters(text);
            const fragment = document.createDocumentFragment();
            const interval = Math.min(48, 850 / Math.max(1, graphemes.length - 1));
            graphemes.forEach((letter, index) => {
                const span = document.createElement("span");
                span.className = "qll-letter";
                span.textContent = letter;
                span.style.setProperty("--qll-delay", `${Math.round(index * interval)}ms`);
                fragment.append(span);
            });
            entry.overlay.replaceChildren(fragment);
        }
        if (entry.overlay.parentElement !== host) host.append(entry.overlay);
        if (!host.classList.contains("qll-host")) host.classList.add("qll-host");
        const speaking = row.querySelector('[class*="Speaking_"], [class*="speaking_"]') !== null;
        if (speaking) {
            clearTimeout(entry.off);
            entry.off = undefined;
            if (host.dataset.qllSpeaking !== "true") {
                host.dataset.qllSpeaking = "true";
            }
        } else if (host.dataset.qllSpeaking === "true" && !entry.off) {
            // Ignore tiny gaps in Discord's voice detection instead of flashing.
            const current = entry;
            entry.off = setTimeout(() => {
                host.dataset.qllSpeaking = "false";
                current.off = undefined;
            }, 160);
        }
    }
}

function schedule() {
    if (!frame) frame = requestAnimationFrame(scan);
}

export default definePlugin({
    name: "QuietLetterLight",
    description: "Lights voice nicknames one letter at a time; fades smoothly after speech stops.",
    authors: [{ name: "Darken", id: 0n }],
    start() {
        style = document.createElement("style");
        style.id = "quiet-letter-light-style";
        style.textContent = CSS;
        document.head.append(style);
        observer = new MutationObserver(records => {
            let relevant = false;
            for (const record of records) {
                const element = record.target instanceof Element ? record.target : record.target.parentElement;
                if (element?.closest(".qll-overlay")) continue;
                const row = element?.closest<HTMLElement>(ROW);
                if (row) { dirtyRows.add(row); relevant = true; }
                if (record.type !== "childList") continue;
                for (const node of record.addedNodes) {
                    if (!(node instanceof HTMLElement) || node.classList.contains("qll-overlay")) continue;
                    if (node.matches(ROW)) { dirtyRows.add(node); relevant = true; }
                    for (const addedRow of node.querySelectorAll<HTMLElement>(ROW)) {
                        dirtyRows.add(addedRow); relevant = true;
                    }
                }
                if (!relevant && record.removedNodes.length && entries.size) {
                    relevant = Array.from(entries.keys()).some(host => !host.isConnected);
                }
            }
            if (relevant) schedule();
        });
        observer.observe(document.body, {
            subtree: true, childList: true, characterData: true,
            attributes: true, attributeFilter: ["class"]
        });
        for (const row of document.querySelectorAll<HTMLElement>(ROW)) dirtyRows.add(row);
        schedule();
    },
    stop() {
        observer?.disconnect();
        observer = undefined;
        cancelAnimationFrame(frame);
        frame = 0;
        for (const [host, entry] of entries) {
            clearTimeout(entry.off);
            entry.overlay.remove();
            host.classList.remove("qll-host");
            host.removeAttribute("data-qll-speaking");
        }
        entries.clear();
        dirtyRows.clear();
        style?.remove();
        style = undefined;
    }
});

