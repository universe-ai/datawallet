declare const browser: any;
declare const chrome: any;

const browser2 = typeof(browser) !== "undefined" ? browser : chrome;

type Port = {
    postMessage: (message: any) => void,
    onMessage: {addListener: Function},
};

const bgPorts: {[rpcId: string]: Port} = {};

function getBgPort(rpcId: string): Port {
    const rpcBaseId = rpcId.split("_")[0];

    let bgPort = bgPorts[rpcBaseId];

    if (!bgPort) {
        bgPort = browser2.runtime.connect({name: `content-to-background_${rpcBaseId}`});

        bgPorts[rpcBaseId] = bgPort;

        // Listen on message from bg and pass it on to the page.
        bgPort.onMessage.addListener(postMessageToPage);
    }

    return bgPort;
}

function postMessageToPage(message: any) {
    window.postMessage({message, direction: "from-content-script"}, "*");
}

(function() {
    //@ts-ignore
    if (window.hasRun) {
        return;
    }

    //@ts-ignore
    window.hasRun = true;

    // Listen on message from page.
    window.addEventListener("message", (event) => {
        if (event.source === window && event?.data?.direction === "from-page-script") {
            const message = event.data.message;

            const rpcId = message.rpcId;

            const bgPort = getBgPort(rpcId);

            // Post message to bg.
            bgPort.postMessage(message);
        }
    });

    window.postMessage({message: {}, direction: "from-content-script-init"}, "*");
})();
