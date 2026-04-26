// ==UserScript==
// @name         Grok to Google Translation
// @version      v1.0.2
// @author       mstudio45
// @description  Replaces Grok's translation with Google Translate.
// @icon         https://abs.twimg.com/favicons/twitter.3.ico
// @match        *://x.com/*
// @match        *://twitter.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      translate.googleapis.com
// ==/UserScript==

(function() {
    const CONFIG = {
        lang_to: "en",
        debug: false
    }

    function debugLog(...args) {
        if (CONFIG.debug) console.log("[GrokToGoogle]", ...args);
    }

    // text handler //
    function extractTweetText(element) {
        if (!element) return "";

        let tweetText = "";
        element.childNodes.forEach((node) => {
            if (node.nodeType === 3) {
                tweetText = tweetText + node.textContent;

            } else if (node.nodeName === "IMG" && node.alt) {
                tweetText = tweetText + node.alt;

            } else if (node.nodeName === "BR") {
                tweetText = tweetText + "\n";

            } else if (node.nodeType === 1) {
                tweetText = tweetText + extractTweetText(node);
            }
        });

        return tweetText;
    }

    function tweetTextToHtml(text) {
        const emojiRegex = /(\p{Regional_Indicator}{2}|(?:(?:\p{Emoji_Presentation}|\p{Emoji}\uFE0F)(?:\p{Emoji_Modifier}|[\u200D\uFE0F]+\p{Emoji})*))/gu;
        const emojiRegexp = new RegExp(`^${emojiRegex.source}$`, "u");
        
        const spanClass = "tweet-translated-text-span";
        const imgClass = "tweet-translated-emoji-img";
        
        const tweetParts = text.split(emojiRegex);
        return tweetParts.map((part) => {
            if (!part) return "";

            if (emojiRegexp.test(part)) {
                const hex = Array.from(part).map((code) => code.codePointAt(0).toString(16)).join("-");
                return `<img alt="${part}" draggable="false" src="https://abs.twimg.com/emoji/v2/svg/${hex}.svg" class="${imgClass}" style="height: 1.2em; vertical-align: middle;">`;
            }

            return part.split("\n").map((line) => {
                return line ? `<span class="${spanClass}">${line}</span>` : "";
            }).join("<br>");
        }).join("");
    }

    function translateText(text, targetLang = "en") {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`,

                onload: function(response) {
                    try {
                        const data = JSON.parse(response.responseText);
                        const translation = data[0].map((item) => item[0]).join("");

                        resolve(translation);
                    } catch (err) { reject(err); }
                },
                onerror: function(err) { reject(err); }
            });
        });
    }

    // css handler //
    const googleTranslateSvg = `<svg class="tweet-translated-logo" version=1.1 viewBox="0 0 998.1 998.3"x=0 xml:space=preserve xmlns=http://www.w3.org/2000/svg y=0><path d="M931.7 998.3c36.5 0 66.4-29.4 66.4-65.4V265.8c0-36-29.9-65.4-66.4-65.4H283.6l260.1 797.9h388z"fill=#DBDBDB /><path d="M931.7 230.4c9.7 0 18.9 3.8 25.8 10.6 6.8 6.7 10.6 15.5 10.6 24.8v667.1c0 9.3-3.7 18.1-10.6 24.8-6.9 6.8-16.1 10.6-25.8 10.6H565.5L324.9 230.4h606.8m0-30H283.6l260.1 797.9h388c36.5 0 66.4-29.4 66.4-65.4V265.8c0-36-29.9-65.4-66.4-65.4z"fill=#DCDCDC /><polygon fill=#4352B8 points="482.3,809.8 543.7,998.3 714.4,809.8"/><path d="M936.1 476.1V437H747.6v-63.2h-61.2V437H566.1v39.1h239.4c-12.8 45.1-41.1 87.7-68.7 120.8-48.9-57.9-49.1-76.7-49.1-76.7h-50.8s2.1 28.2 70.7 108.6c-22.3 22.8-39.2 36.3-39.2 36.3l15.6 48.8s23.6-20.3 53.1-51.6c29.6 32.1 67.8 70.7 117.2 116.7l32.1-32.1c-52.9-48-91.7-86.1-120.2-116.7 38.2-45.2 77-102.1 85.2-154.2H936v.1z"fill=#607988 /><path d="M66.4 0C29.9 0 0 29.9 0 66.5v677c0 36.5 29.9 66.4 66.4 66.4h648.1L454.4 0h-388z"fill=#4285F4 /><linearGradient gradientUnits=userSpaceOnUse id=a x1=534.3 x2=998.1 y1=433.2 y2=433.2><stop offset=0 stop-color=#fff stop-opacity=.2 /><stop offset=1 stop-color=#fff stop-opacity=.02 /></linearGradient><path d="M534.3 200.4h397.4c36.5 0 66.4 29.4 66.4 65.4V666L534.3 200.4z"fill=url(#a) /><path d="M371.4 430.6c-2.5 30.3-28.4 75.2-91.1 75.2-54.3 0-98.3-44.9-98.3-100.2s44-100.2 98.3-100.2c30.9 0 51.5 13.4 63.3 24.3l41.2-39.6c-27.1-25-62.4-40.6-104.5-40.6-86.1 0-156 69.9-156 156s69.9 156 156 156c90.2 0 149.8-63.3 149.8-152.6 0-12.8-1.6-22.2-3.7-31.8h-146v53.4l91 .1z"fill=#EEEEEE /><radialGradient cx=65.208 cy=19.366 gradientUnits=userSpaceOnUse id=b r=1398.271><stop offset=0 stop-color=#fff stop-opacity=.1 /><stop offset=1 stop-color=#fff stop-opacity=0 /></radialGradient><path d="M931.7 200.4H518.8L454.4 0h-388C29.9 0 0 29.9 0 66.5v677c0 36.5 29.9 66.4 66.4 66.4h415.9l61.4 188.4h388c36.5 0 66.4-29.4 66.4-65.4V265.8c0-36-29.9-65.4-66.4-65.4z"fill=url(#b) /></svg>` /* https://upload.wikimedia.org/wikipedia/commons/d/d7/Google_Translate_logo.svg */;
    
    GM_addStyle(`
        .tweet-translated-text-span {
            word-wrap: break-word;
            font-family: inherit;
            min-width: 0px;
            text-align: inherit;
            background-color: rgba(0, 0, 0, 0);
            border: 0 solid black;
            box-sizing: border-box;
            color: inherit;
            display: inline;
            font: inherit;
            list-style: none;
            margin: 0px;
            padding: 0px;
            position: relative;
            text-decoration: none;
            white-space: inherit;
        }
            
        .tweet-translated-emoji-img {
            vertical-align: -20%;
            width: 1.2em;
            height: 1.2em;
            margin-right: 0.075em;
            margin-left: 0.075em;
            display: inline-block;
        }

        .tweet-translated-logo {
            vertical-align: top;

            -moz-user-select: none;
            -webkit-user-select: none;
            user-select: none;

            max-width: 100%;
            position: relative;
            height: 1.25em;
            display: inline-block;
        }
    `);

    // button handler //
    const observer = new MutationObserver(() => {
        document.querySelectorAll('button[aria-label="Show translation"]').forEach((btn) => {
            if (btn.dataset.translateProcessed) return;
            btn.dataset.translateProcessed = "true";
            debugLog("Translation button found.");

            // replace grok logo //
            const grokLogo = btn.parentElement.querySelector("svg");
            if (grokLogo) grokLogo.outerHTML = googleTranslateSvg;

            // handle click //
            btn.addEventListener("click", async (event) => {
                event.preventDefault();
                event.stopPropagation();
                debugLog("Translation button clicked, handling...");

                const tweetContainer = btn.closest("article");
                const textElement = tweetContainer ? tweetContainer.querySelector('div[data-testid="tweetText"]') : null;
                if (!textElement) return;

                const labelSpan = btn.querySelector("span");
                const updateLabel = (txt) => { if (labelSpan) labelSpan.textContent = txt; else btn.textContent = txt; };

                // translate button logic //
                if (btn.dataset.hasTranslation === "true") {
                    const isShowingTranslation = btn.dataset.showingTranslation === "true";

                    if (isShowingTranslation) {
                        debugLog("Switched to original text.");
                        
                        updateLabel("Show translation");
                        textElement.innerHTML = btn.dataset.originalHtml;
                        btn.dataset.showingTranslation = "false";
                    } else {
                        debugLog("Switched to translated text.");

                        updateLabel("Show original");
                        textElement.innerHTML = btn.dataset.translatedHtml;
                        btn.dataset.showingTranslation = "true";
                    }

                    return;
                }

                // translate logic //
                if (btn.dataset.translating === "true") return;
                btn.dataset.translating = "true";

                const originalBtnText = labelSpan ? labelSpan.textContent : btn.textContent;
                updateLabel("Translating...");

                const originalText = extractTweetText(textElement);
                const originalHtml = textElement.innerHTML;
                debugLog("Starting translation for:", originalText);

                try {
                    const translatedText = await translateText(originalText, CONFIG.lang_to);
                    const translatedHtml = tweetTextToHtml(translatedText);
                    debugLog("Translation (Text):", translatedText);
                    debugLog("Translation (HTML):", translatedHtml);

                    btn.dataset.originalHtml = originalHtml;
                    btn.dataset.translatedHtml = translatedHtml;
                    btn.dataset.hasTranslation = "true";
                    btn.dataset.showingTranslation = "true";

                    textElement.innerHTML = translatedHtml;
                    updateLabel("Show original");
                } catch (e) {
                    console.error("Translation failed:", e);

                    updateLabel("Translation failed");
                    setTimeout(() => { updateLabel(originalBtnText); }, 2000);
                } finally {
                    btn.dataset.translating = "false";
                }
            }, true);
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
