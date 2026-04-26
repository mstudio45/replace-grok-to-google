// ==UserScript==
// @name         Grok to Google Translation
// @version      v1.0.1
// @author       mstudio45
// @description  Replaces Grok's translation with Google Translate.
// @icon         https://abs.twimg.com/favicons/twitter.3.ico
// @match        *://x.com/*
// @match        *://twitter.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      translate.googleapis.com
// @downloadURL  https://raw.githubusercontent.com/mstudio45/replace-grok-to-google/refs/heads/main/main.user.js
// @updateURL    https://raw.githubusercontent.com/mstudio45/replace-grok-to-google/refs/heads/main/main.user.js
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
    `);

    // button handler //
    const observer = new MutationObserver(() => {
        document.querySelectorAll('button[aria-label="Show translation"]').forEach((btn) => {
            if (btn.dataset.translateProcessed) return;
            btn.dataset.translateProcessed = "true";
            debugLog("Translation button found, handler added.");

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
