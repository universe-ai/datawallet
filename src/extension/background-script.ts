import {
    RPC,
} from "universeai";

import {
    BackgroundService,
} from "../lib/BackgroundService";

declare const browser: any;
declare const chrome: any;
declare const localStorage: Storage;

const browser2 = typeof(browser) !== "undefined" ? browser : chrome;

const service = new BackgroundService(browser2, localStorage);

function connected(port: any) {
    const [portName, rpcId]  = port.name.split("_");

    if (portName === "popup-to-background") {
        const postMessage = (message: any) => {
            port.postMessage(message);
        };

        port.onDisconnect.addListener( () => {
            // Closes all resources.
            service.unregisterPopupRPC(rpc);
        });

        const listenMessage = (listener: Function) => {
            port.onMessage.addListener( (message: any) => {
                listener(message);
            });
        };

        const rpc = new RPC(postMessage, listenMessage, rpcId);

        service.registerPopupRPC(rpc);
    }
    else if (portName === "content-to-background") {
        const postMessage = (message: any) => {
            port.postMessage(message);
        };

        port.onDisconnect.addListener( () => {
            // Closes all resources.
            service.unregisterContentScriptRPC(rpc);
        });

        const listenMessage = (listener: Function) => {
            port.onMessage.addListener( (message: any) => {
                listener(message);
            });
        };

        const rpc = new RPC(postMessage, listenMessage, rpcId);

        service.registerContentScriptRPC(rpc);
    }
}

browser2.runtime.onConnect.addListener(connected);
