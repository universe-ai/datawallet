/**
 * Cryptographic keys are stored as integers so they can be seamlessly serialized to JSON.
 */
export type WalletKeyPair = {
    publicKey: number[],
    secretKey: number[],
    crypto: string,
};

export type WalletConfig = {
    keyPairs: WalletKeyPair[],
};

// TODO set to 8
export const PASSWORD_MIN_LENGTH = 1;

export type TabState = {
    activated: boolean,
    authRequestId?: number,
    authed: boolean,
    title: string,
    url: string,
};

export type TabsState = {
    [tabId: string]: TabState,
};

export type Vault = {
    id: string,
    title: string,
    blob: string,
};

export type Vaults = {[id: string]: Vault};
