import {
    RPC,
} from "universeai";

declare const browser: any;
declare const chrome: any;

const browser2 = typeof(browser) !== "undefined" ? browser : chrome;

(function() {
    //@ts-ignore
    if (window.hasRun) {
        return;
    }

    //@ts-ignore
    window.hasRun = true;

    const port = browser2.runtime.connect({name: "from-content-script"});

    const postMessageToBg = (message: any) => {
        port.postMessage(message);
    };

    const listenMessageFromBg = (listener: Function) => {
        port.onMessage.addListener( (message: any) => {
            listener(message);
        });
    };

    const postMessageToPage = (message: any) => {
        window.postMessage({message, direction: "from-content-script"}, "*");
    };

    const listenMessageFromPage = (listener: Function) => {
        window.addEventListener("message", (event) => {
            if (event.source === window && event?.data?.direction === "from-page-script") {
                listener(event.data.message);
            }
        });
    };

    listenMessageFromBg( (message: any) => {
        postMessageToPage(message);
    });

    listenMessageFromPage( (message: any) => {
        postMessageToBg(message);
    });
})();
