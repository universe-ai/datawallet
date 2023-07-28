const {RPC} = require("../../../build/lib/RPC.js");

import * as riot from "riot";

import PopupMain from "./popup-main.riot";

import "./popup.css";

const browser2 = typeof(browser) !== "undefined" ? browser : chrome;

async function main() {
    const popupElement = document.querySelector("#popup");

    if (!popupElement) {
        console.error("popup div not existing");
        return;
    }

    // Connect to background-script
    const port = browser2.runtime.connect({ name: "from-popup" });

    const postMessage = (message) => {
        port.postMessage(message);
    };

    const listenMessage = (listener) => {
        port.onMessage.addListener( message => {
            listener(message);
        });
    };

    const rpc = new RPC(postMessage, listenMessage);

    const tabId = (await browser2.tabs.query({active: true, currentWindow: true}))[0].id;

    const mainComponent = riot.component(PopupMain)(popupElement, {rpc, tabId});

    const tabsState = await rpc.call("getState", [tabId]);

    mainComponent.update({tabsState});
}

main();
