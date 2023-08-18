import {
    WalletKeyPair,
    WalletConfig,
    Vault,
    PASSWORD_MIN_LENGTH,
} from "./types";

export class Wallet {
    protected password: string;
    protected id: string;
    protected title: string;

    /** Unencrypted wallet config. */
    protected config: WalletConfig;

    constructor(password: string, title: string = "", id: string = "") {
        if (password.length < PASSWORD_MIN_LENGTH) {
            throw new Error("Too short password");
        }

        this.password = password;
        this.title = title;
        this.id = id;

        this.config = {
            keyPairs: [],
        };
    }

    /**
     * Encrypt and export vault as Vault.
     */
    public export(): Vault {
        return {
            id: this.id,
            title: this.title,
            blob: this.encrypt(this.config),
        }
    }

    public load(vault: Vault) {
        this.config = this.decrypt(vault.blob);
        this.title = vault.title;
        this.id = vault.id;
    }

    protected decrypt(blob: string): WalletConfig {
        // TODO symmetric decryption
        const config = JSON.parse(blob);
        return config;
    }

    protected encrypt(config: WalletConfig): string {
        // TODO symmetric encryption of config
        const blob = JSON.stringify(config);
        return blob;
    }

    public getTitle(): string {
        return this.title;
    }

    public setTitle(title: string) {
        this.title = title;
    }

    public getId(): string {
        return this.id;
    }

    public setId(id: string) {
        this.id = id;
    }

    public addKeyPair(keyPair: WalletKeyPair) {
        this.config.keyPairs.push(keyPair);
    }

    public getKeyPairs(): WalletKeyPair[] {
        return this.config.keyPairs.map( (keyPair: WalletKeyPair) => {
            return {
                publicKey: keyPair.publicKey.slice(),
                secretKey: keyPair.secretKey.slice(),
                crypto: keyPair.crypto,
            }
        });
    }

    public setKeyPairs(walletKeyPairs: WalletKeyPair[]) {
        this.config.keyPairs = walletKeyPairs.map( (keyPair: WalletKeyPair) => {
            return {
                publicKey: keyPair.publicKey.slice(),
                secretKey: keyPair.secretKey.slice(),
                crypto: keyPair.crypto,
            }
        });
    }

    public setPassword(password: string) {
        if (password.length < PASSWORD_MIN_LENGTH) {
            throw new Error("Too short password");
        }

        this.password = password;
    }

    /**
     * @return array of public keys.
     */
    public getPublicKeys(): number[][] {
        return this.config.keyPairs.map( (keyPair: WalletKeyPair) => keyPair.publicKey.slice() );
    }
}
