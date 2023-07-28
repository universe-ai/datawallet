import {
    RPC,
} from "universeai";

import {
    Service,
} from "../lib/Service";

declare const browser: any;
declare const chrome: any;

const browser2 = typeof(browser) !== "undefined" ? browser : chrome;

const service = new Service(browser2);

function connected(port: any) {
    if (port.name === "from-popup") {
        const postMessage = (message: any) => {
            port.postMessage(message);
        };

        const listenMessage = (listener: Function) => {
            port.onMessage.addListener( (message: any) => {
                listener(message);
            });
        };

        const rpc = new RPC(postMessage, listenMessage);

        service.registerPopupRPC(rpc);
    }
    else if (port.name === "from-content-script") {
        const postMessage = (message: any) => {
            port.postMessage(message);
        };

        const listenMessage = (listener: Function) => {
            port.onMessage.addListener( (message: any) => {
                listener(message);
            });
        };

        const rpc = new RPC(postMessage, listenMessage);

        service.registerContentScriptRPC(rpc);

    }
}

browser2.runtime.onConnect.addListener(connected);
