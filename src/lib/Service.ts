import {
    RPC,
} from "universeai";

export type TabState = {
    activated: boolean,
    title: string,
    url: string,
};

export type TabsState = {
    [tabId: string]: TabState,
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

        rpc.onCall("auth", () => {
            console.log("AUTH requested");
            return {rpcId: "abc"};
        });
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
