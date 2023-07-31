import {
    Universe,
    SignatureOffloaderInterface,
    HandshakeFactoryFactoryInterface,
    RPC,
    P2PClient,
    ConnectionType,
} from "universeai";

import {
    HandshakeFactoryConfig,
} from "pocket-messaging";

import {
    SocketFactoryConfig,
} from "pocket-sockets";

export class Page {
    public rpc: RPC;
    protected universe: Universe;

    constructor(protected postMessage: Function, protected listenMessage: Function) {
        this.rpc = new RPC(postMessage, listenMessage);

        const rpcKM = new RPC(postMessage, listenMessage, "keyManager");

        this.universe = new Universe(rpcKM);
    }

    public async auth(): Promise<[SignatureOffloaderInterface, HandshakeFactoryFactoryInterface]> {
        const rpcClients = await this.universe.auth();

        if (rpcClients.error) {
            throw new Error(rpcClients.error);
        }

        const signatureOffloader = rpcClients.signatureOffloader;
        const handshakeFactoryFactory = rpcClients.handshakeFactoryFactory;

        if (!handshakeFactoryFactory || !signatureOffloader) {
            throw new Error("missing handshakeFactoryFactory | signatureOffloader");
        }

        const keys = await signatureOffloader.getPublicKeys();

        return [signatureOffloader, handshakeFactoryFactory];
    }

    public async connect(handshakeFactoryFactory: HandshakeFactoryFactoryInterface) {
        const socketFactoryConfig: SocketFactoryConfig = {
            client: {
                socketType: "WebSocket",
                clientOptions: {
                    host: "172.17.0.8",
                    port: 1117,
                }
            }
        };

        const handshakeFactoryConfig: HandshakeFactoryConfig = {
            keyPair: {
                publicKey: Buffer.alloc(0),
                secretKey: Buffer.alloc(0),
            },
            socketFactoryConfig,
            discriminator: Buffer.from("main"),
            serverPublicKey: Buffer.from("cb78a75e914ba052a12febdacb029f9201ca7eacd9a05e46f4955a059cb0ff1c", "hex"),
        };

        const localProps = {
            connectionType: ConnectionType.STORAGE_CLIENT,
            version: P2PClient.Version,
            serializeFormat: P2PClient.Formats[0],
            handshakedPublicKey: Buffer.alloc(0),
            clock: Date.now(),
        };

        //@ts-ignore
        const handshakeFactory = await handshakeFactoryFactory(handshakeFactoryConfig, localProps);

        handshakeFactory.onConnect( (e) => {
            console.log("factory connected", e);
        });

        handshakeFactory.onError( (e) => {
            console.log("factory error", e);
        });

        handshakeFactory.init();
    }
}
