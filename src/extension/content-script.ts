import {
    RPC,
} from "universeai";

declare const browser: any;
declare const chrome: any;

const browser2 = typeof(browser) !== "undefined" ? browser : chrome;

(function() {
    //@ts-ignore
    if (window.hasRun) {
        console.log("content script already loaded");
        return;
    }

    //@ts-ignore
    window.hasRun = true;

    console.log("content-script loaded.");

    const port = browser2.runtime.connect({name: "from-content-script"});

    const postMessage = (message: any) => {
        port.postMessage(message);
    };

    const listenMessage = (listener: Function) => {
        port.onMessage.addListener( (message: any) => {
            listener(message);
        });
    };

    const backgroundScriptRPC = new RPC(postMessage, listenMessage);


    const postMessage2 = (message: any) => {
        window.postMessage({message, direction: "from-content-script"}, "*");
    };

    const listenMessage2 = (listener: Function) => {
        window.addEventListener("message", (event) => {
            if (event.source === window && event?.data?.direction === "from-page-script") {
                listener(event.data.message);
            }
        });
    };

    const pageScriptRPC = new RPC(postMessage2, listenMessage2);

    pageScriptRPC.onCall("*", async (name: string, ...args: any[]) => {
        console.log("content-script received call from page-script", name, args);
        const response = await backgroundScriptRPC.call(name, args);
        return response;
    });

    backgroundScriptRPC.onCall("*", async (name: string, ...args: any[]) => {
        console.log("content-script received call from background-script", name, args);
        const response = await pageScriptRPC.call(name, args);
        return response;
    });

    pageScriptRPC.call("init");
})();
