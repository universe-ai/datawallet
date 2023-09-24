const {RPC} = require("../../../build/lib/RPC.js");

import * as riot from "riot";

import PopupMain from "./popup-main.riot";
import PopupConnection from "./popup-connection.riot";
import PopupWallets from "./popup-wallets.riot";

riot.register("popup-connection", PopupConnection);
riot.register("popup-wallets", PopupWallets);

import "./popup.css";

const browser2 = typeof(browser) !== "undefined" ? browser : chrome;

async function main() {
    const popupElement = document.querySelector("#popup");

    if (!popupElement) {
        console.error("popup div not existing");
        return;
    }

    const rpcId = "0";  // This is not required to be random from popup.

    // Connect to background-script
    const port = browser2.runtime.connect({ name: `popup-to-background_${rpcId}` });

    const postMessage = (message) => {
        port.postMessage(message);
    };

    const listenMessage = (listener) => {
        port.onMessage.addListener( message => {
            listener(message);
        });
    };

    const rpc = new RPC(postMessage, listenMessage, rpcId);

    const tabId = await getTabId();

    // Always auto-activate the tab when opened.
    await rpc.call("registerTab", [tabId]);

    const mainComponent = riot.component(PopupMain)(popupElement, {rpc, tabId});
}

async function getTabId() {
    let tabId;

    if (typeof(browser) !== "undefined") {
        tabId = (await browser.tabs.query({active: true, currentWindow: true}))[0].id;
    }
    else {
        const p = new Promise( (resolve) => {
            chrome.tabs.query({active: true, currentWindow: true}, tab => {
                resolve(tab.id);
            });
        });

        tabId = await p;
    }

    return tabId;
}

main();
