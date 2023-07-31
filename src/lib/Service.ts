import {
    RPC,
    KeyManager,
} from "universeai";

export type TabState = {
    activated: boolean,
    title: string,
    url: string,
};

export type TabsState = {
    [tabId: string]: TabState,
};

const keyPair = {
    publicKey: Buffer.from("60a0206c38c686dd6792e1f0279dd4084a37f85eec4bb6eab8c2721a636da170", "hex"),
    secretKey: Buffer.from("8be83aa067ebe07ea95e7b8ec4c0e70c3d19a7f696d81877b8370e4ec83deffb60a0206c38c686dd6792e1f0279dd4084a37f85eec4bb6eab8c2721a636da170", "hex"),
};

export class Service {
    protected tabsState: TabsState = {};
    protected csRPC?: RPC;
    protected popupRPC?: RPC;
    protected browser: any;

    constructor(browser: any) {
        this.browser = browser;
    }

    public registerContentScriptRPC(rpc: any) {
        this.csRPC = rpc;

        const csRPCKM = rpc.clone("keyManager");

        const keyManager = new KeyManager(csRPCKM);

        keyManager.onAuth( async () => {
            // TODO: pass it on to popup
            return {
                keyPairs: [keyPair],
            };
        });

        rpc.call("init");
    }

    public registerPopupRPC(rpc: any) {
        this.popupRPC = rpc;

        rpc.onCall("activateTab", this.activateTab);

        rpc.onCall("getState", this.getState);
    }

    /**
     * Init current tab state if not already inited, and return state for all tabs.
     *
     */
    protected getState = async (tabId: number): Promise<TabsState> => {
        if (!this.tabsState[tabId]) {
            this.tabsState[tabId] = {
                activated: false,
                title: "",
                url: "",
            };
        }
        else {
            if (this.tabsState[tabId].activated) {
                // Always reinsert the content-script in case the tab has been reloaded.
                this.browser.tabs.executeScript({file: "/content-script.js"});
            }
        }

        return this.tabsState;
    };

    protected activateTab = async (tabId: number): Promise<TabsState | undefined> => {
        try {
            this.tabsState[tabId].activated = true;
            this.browser.tabs.executeScript({file: "/content-script.js"});
            return this.tabsState;
        }
        catch(e) {
            console.error(e);
            return undefined;
        }
    };
}
