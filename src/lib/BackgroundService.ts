import {
    RPC,
    KeyManager,
    Node,
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
    protected popupRPC?: RPC;
    protected browser: any;
    protected authRequests: Function[] = [];
    protected vaults: Vaults = {};
    protected storageAPI: Storage;
    protected keyManagers: {[rpcId: string]: KeyManager} = {};

    constructor(browser: any, storageAPI: Storage) {
        this.browser = browser;
        this.storageAPI = storageAPI;

        this.loadVaults();
    }

    public registerContentScriptRPC(rpc: any) {
        const csRPCKM = rpc.clone("keyManager");

        const keyManager = new KeyManager(csRPCKM);

        this.keyManagers[rpc.getId()] = keyManager;

        keyManager.onAuth( async () => {
            const tabId = await this.getTabId();

            let resolve: Function | undefined;

            this.authRequests.push( (keyPairs?: WalletKeyPair[]) => { resolve && resolve(keyPairs) });
            const authRequestId = this.authRequests.length - 1;

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

        csRPCKM.call("active");
    }

    public unregisterContentScriptRPC(rpc: any) {
        const keyManager = this.keyManagers[rpc.getId()];

        keyManager?.close();

        delete this.keyManagers[rpc.getId()];
    }

    public registerPopupRPC(rpc: any) {
        this.popupRPC = rpc;

        rpc.onCall("registerTab", this.registerTab);
        rpc.onCall("getState", this.getState);
        rpc.onCall("acceptAuth", this.acceptAuth);
        rpc.onCall("denyAuth", this.denyAuth);
        rpc.onCall("getVaults", this.getVaults);
        rpc.onCall("saveVault", this.saveVault);
        rpc.onCall("newKeyPair", this.newKeyPair);
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
        resolve && resolve();
    };

    protected acceptAuth = (tabId: number, keyPairs: WalletKeyPair[]) => {
        const authRequestId = this.tabsState[tabId].authRequestId;

        if (authRequestId === undefined) {
            return;
        }

        this.tabsState[tabId].authRequestId = undefined;

        const resolve = this.authRequests[authRequestId];
        resolve && resolve(keyPairs);

        this.tabsState[tabId].authed = true;
    };

    protected getState = async (tabId: number): Promise<TabsState> => {
        return this.tabsState;
    };

    protected registerTab = async (tabId: number) => {
        if (!this.tabsState[tabId]) {
            this.tabsState[tabId] = {
                activated: false,
                authed: false,
                authRequestId: undefined,
                title: `${tabId}`,
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

    protected newKeyPair = async (): Promise<WalletKeyPair> => {
        const keyPair = Node.GenKeyPair();

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
