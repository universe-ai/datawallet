import {
    RPC,
    KeyManager,
    Crypto,
} from "universeai";

import {
    WalletKeyPair,
    TabsState,
    Vault,
    Vaults,
} from "./types";

declare const browser: any;
declare const chrome: any;

export class BackgroundService {
    protected tabsState: TabsState = {};
    protected browser: any;
    protected authRequests: Function[] = [];
    protected authRequestIdCounter = 0;
    protected vaults: Vaults = {};
    protected storageAPI: Storage;
    protected keyManagers: {[rpcId: string]: KeyManager} = {};

    constructor(browser: any, storageAPI: Storage) {
        this.browser = browser;
        this.storageAPI = storageAPI;

        this.loadVaults();
    }

    public registerContentScriptRPC(rpc: any) {
        const keyManager = new KeyManager(rpc);

        this.keyManagers[rpc.getId()] = keyManager;

        keyManager.onAuth( async () => {
            const tabId = await this.getTabId();

            let resolve: Function | undefined;

            // Resolve any prior auth request as denied.
            this.denyAuth(tabId);

            this.authRequests[this.authRequestIdCounter] = (keyPairs?: WalletKeyPair[]) => { resolve && resolve(keyPairs) };

            const authRequestId = this.authRequestIdCounter++;

            const p = new Promise( (resolveInner, reject) => {
                resolve = resolveInner;

                this.tabsState[tabId].authRequestId = authRequestId;
            });

            const keyPairs = (await p) as WalletKeyPair[] | undefined;
            const error = keyPairs === undefined ? "Auth denied" : undefined;

            return {
                keyPairs,
                error,
            };
        });
    }

    public unregisterContentScriptRPC(rpc: any) {
        const keyManager = this.keyManagers[rpc.getId()];

        keyManager?.close();

        delete this.keyManagers[rpc.getId()];

        rpc.close();
    }

    public registerPopupRPC(rpc: any) {
        rpc.onCall("registerTab", this.registerTab);
        rpc.onCall("getState", this.getState);
        rpc.onCall("acceptAuth", this.acceptAuth);
        rpc.onCall("denyAuth", this.denyAuth);
        rpc.onCall("getVaults", this.getVaults);
        rpc.onCall("saveVault", this.saveVault);
        rpc.onCall("newKeyPair", this.newKeyPair);
    }

    public unregisterPopupRPC(rpc: any) {
        rpc.close();
    }

    protected async loadVaults() {
        this.vaults = JSON.parse((await this.storageAPI.getItem("vaults")) ?? "{}");
    }

    protected getVaults = async (): Promise<Vaults> => {
        return this.vaults;
    };

    protected saveVault = async (vault: Vault): Promise<boolean> => {
        try {
            this.vaults[vault.id] = vault;
            await this.storageAPI.setItem("vaults", JSON.stringify(this.vaults));
        }
        catch(e) {
            console.error("Could not store vault", e);
            return false;
        }

        return true;
    };

    protected denyAuth = (tabId: number) => {
        const authRequestId = this.tabsState[tabId].authRequestId;

        if (authRequestId === undefined) {
            return;
        }

        this.tabsState[tabId].authRequestId = undefined;

        const resolve = this.authRequests[authRequestId];

        delete this.authRequests[authRequestId];

        resolve && resolve();
    };

    protected acceptAuth = (tabId: number, keyPairs: WalletKeyPair[]) => {
        const authRequestId = this.tabsState[tabId].authRequestId;

        if (authRequestId === undefined) {
            return;
        }

        this.tabsState[tabId].authRequestId = undefined;

        const resolve = this.authRequests[authRequestId];

        delete this.authRequests[authRequestId];

        resolve && resolve(keyPairs);

        this.tabsState[tabId].authed = true;
    };

    protected getState = async (tabId: number): Promise<TabsState> => {
        return this.tabsState;
    };

    protected registerTab = async (tabId: number) => {
        const tabTitle = await this.getTabTitle();

        if (!this.tabsState[tabId]) {
            this.tabsState[tabId] = {
                activated: false,
                authed: false,
                authRequestId: undefined,
                title: `${tabTitle}`,
                url: window.location.href,
            };
        }

        try {
            await this.browser.tabs.executeScript({file: "/content-script.js"});
        }
        catch(e) {
            console.debug("Can't interact with tab", e);
            return;
        }

        this.tabsState[tabId].activated = true;
    };

    protected async getTabId(): Promise<number> {
        let tabId;

        if (typeof(browser) !== "undefined") {
            tabId = (await browser.tabs.query({active: true, currentWindow: true}))[0].id;
        }
        else {
            const p = new Promise( (resolve) => {
                chrome.tabs.query({active: true, currentWindow: true}, (tab: any) => {
                    resolve(tab.id);
                });
            });

            tabId = await p;
        }

        return tabId;
    }

    protected async getTabTitle(): Promise<number> {
        let tabTitle;

        if (typeof(browser) !== "undefined") {
            tabTitle = (await browser.tabs.query({active: true, currentWindow: true}))[0].title;
        }
        else {
            const p = new Promise( (resolve) => {
                chrome.tabs.query({active: true, currentWindow: true}, (tab: any) => {
                    resolve(tab.title);
                });
            });

            tabTitle = await p;
        }

        return tabTitle;
    }

    protected newKeyPair = async (): Promise<WalletKeyPair> => {
        const keyPair = Crypto.GenKeyPair();

        const publicKey: number[] = [];
        const secretKey: number[] = [];

        keyPair.publicKey.forEach(i => publicKey.push(i) );
        keyPair.secretKey.forEach(i => secretKey.push(i) );

        return {
            publicKey,
            secretKey,
            crypto: "ed25519",
        };
    };
}
