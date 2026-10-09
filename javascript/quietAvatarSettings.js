import definePlugin from "@utils/types";
import { SettingsRouter } from "@webpack/common";
const PANEL = ".container__37e49";
const AVATAR = 'svg[class*="mask_"], [class*="avatar_"], [class*="avatarWrapper_"]';
const FACES = ["(\u2022\u203F\u2022)", "(\u2267\u25E1\u2266)", "(^\u1D17^)", "(\u1D54\u25E1\u1D54)", "(\xAC\u203F\xAC)", "(\u02F6\u1D54\u1D55\u1D54\u02F6)", "(\uFF3E\u25BD\uFF3E)", "(\u2022\u1D17\u2022)"];
function randomFace(event) {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest(".emojiButton__74017");
  if (!button) return;
  const related = event.relatedTarget;
  if (related instanceof Node && button.contains(related)) return;
  const choices = FACES.filter((face) => face !== button.dataset.quietKaomoji);
  button.dataset.quietKaomoji = choices[Math.floor(Math.random() * choices.length)];
}
function openSettings(event) {
  if (!(event.target instanceof Element)) return;
  if (event instanceof MouseEvent && (event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey)) return;
  if (event instanceof KeyboardEvent && event.key !== "Enter" && event.key !== " ") return;
  const avatar = event.target.closest(AVATAR);
  const panel = avatar?.closest(PANEL);
  if (!panel) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (event.type === "click" || event.type === "keydown") SettingsRouter.openUserSettings("account_panel");
}
var stdin_default = definePlugin({
  name: "QuietAvatarSettings",
  description: "Opens User Settings on left-click of the local user avatar, preserving status and context menus.",
  authors: [{ name: "Darken", id: 0n }],
  start() {
    document.addEventListener("pointerover", randomFace, true);
    document.addEventListener("focusin", randomFace, true);
    document.addEventListener("click", openSettings, true);
    document.addEventListener("pointerdown", openSettings, true);
    document.addEventListener("mousedown", openSettings, true);
    document.addEventListener("keydown", openSettings, true);
  },
  stop() {
    document.removeEventListener("pointerover", randomFace, true);
    document.removeEventListener("focusin", randomFace, true);
    for (const button of document.querySelectorAll(".emojiButton__74017")) delete button.dataset.quietKaomoji;
    document.removeEventListener("click", openSettings, true);
    document.removeEventListener("pointerdown", openSettings, true);
    document.removeEventListener("mousedown", openSettings, true);
    document.removeEventListener("keydown", openSettings, true);
  }
});
export {
  stdin_default as default
};
