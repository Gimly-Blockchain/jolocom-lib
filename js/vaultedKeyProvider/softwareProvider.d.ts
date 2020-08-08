/// <reference types="node" />
import { IDigestable } from '../linkedDataSignature/types';
import { IKeyDerivationArgs, IVaultedKeyProvider } from './types';
export interface EncryptedData {
    keys: EncryptedKey[];
    data: string;
}
export interface EncryptedKey {
    pubKey: string;
    cipher: string;
}
export declare class SoftwareKeyProvider implements IVaultedKeyProvider {
    private readonly _encryptedSeed;
    private readonly _iv;
    constructor(encryptedSeed: Buffer);
    readonly encryptedSeed: string;
    static fromSeed(seed: Buffer, encryptionPass: string): SoftwareKeyProvider;
    static recoverKeyPair(mnemonic: string, encryptionPass: string): SoftwareKeyProvider;
    getPublicKey(derivationArgs: IKeyDerivationArgs): Buffer;
    static getRandom(nr: number): Buffer;
    sign(derivationArgs: IKeyDerivationArgs, digest: Buffer): Buffer;
    getPrivateKey(derivationArgs: IKeyDerivationArgs): Buffer;
    getMnemonic(encryptionPass: string, did?: string): string;
    signDigestable(derivationArgs: IKeyDerivationArgs, toSign: IDigestable): Promise<Buffer>;
    private static encrypt;
    private static decrypt;
    asymEncrypt(data: Buffer, pubKey: Buffer): Promise<string>;
    asymDecrypt(data: string, derivationArgs: IKeyDerivationArgs): Promise<Buffer>;
    encryptHybrid(data: object, derivationArgs: IKeyDerivationArgs): Promise<EncryptedData>;
    decryptHybrid(encryptedData: EncryptedData, derivationArg: IKeyDerivationArgs): Promise<object>;
    private stringifyEncryptedData;
    private parseEncryptedData;
    private static normalizePassword;
}
