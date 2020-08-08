import { fromSeed } from 'bip32'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { IDigestable } from '../linkedDataSignature/types'
import { IKeyDerivationArgs, IVaultedKeyProvider } from './types'
import { entropyToMnemonic, mnemonicToEntropy, validateMnemonic } from 'bip39'
import { sha256 } from '../utils/crypto'
import * as eccrypto from 'eccrypto'
import { ErrorCodes } from '../errors'

const ALG = 'aes-256-cbc'

/** @dev length in bytes */
const PASSWORD_LENGTH = 32
const PADDING_LENGTH = 16
const MIN_SEED_LENGTH = 16
const MAX_SEED_LENGTH = 32

const IV_LENGTH = 16
const MIN_ENCRYPTED_SEED_LENGTH = IV_LENGTH + MIN_SEED_LENGTH + PADDING_LENGTH
const MAX_ENCRYPTED_SEED_LENGTH = IV_LENGTH + MAX_SEED_LENGTH + PADDING_LENGTH

export interface EncryptedData {
  keys: EncryptedKey[]
  data: string
}

export interface EncryptedKey {
  pubKey: string
  cipher: string
}

/**
 * Ensure the encrypted seed is of the correct length (for generating BIP39 seed phrases)
 * @param encryptedSeed - aes256-cbc encrypted seed
 */

function isEncryptedSeedLengthValid(encryptedSeed: Buffer): boolean {
  const { length } = encryptedSeed

  const inBounds =
    length >= MIN_ENCRYPTED_SEED_LENGTH && length <= MAX_ENCRYPTED_SEED_LENGTH

  const multipleOfFour = length % 4 === 0

  return inBounds && multipleOfFour
}

export class SoftwareKeyProvider implements IVaultedKeyProvider {
  private readonly _encryptedSeed: Buffer
  private readonly _iv: Buffer

  /**
   * Initializes the vault with an already encrypted aes 256 cbc seed
   * @param encryptedSeed - the ciphertext; format: IV || ciphertext, where '||' denotes concatenation
   */

  public constructor(encryptedSeed: Buffer) {
    if (!isEncryptedSeedLengthValid(encryptedSeed)) {
      throw new Error(ErrorCodes.SKPEncryptedSeedInvalidLength)
    }

    this._iv = encryptedSeed.slice(0, IV_LENGTH)
    this._encryptedSeed = encryptedSeed.slice(IV_LENGTH)
  }

  /**
   * Get the encrypted seed hex encoded; format: IV || ciphertext, where '||' denotes concatenation
   */

  public get encryptedSeed(): string {
    return Buffer.concat([this._iv, this._encryptedSeed]).toString('hex')
  }

  /**
   * Initializes the vault with the aes 256 cbc encrypted seed
   * @param seed - 32 byte seed for creating bip32 wallet
   * @param encryptionPass - password used to generate encryption cipher, UTF-8, 32 bytes
   * @example `const vault = new SoftwareKeyProvider(Buffer.from('abc...', 'hex'), 'secret')`
   */
  public static fromSeed(
    seed: Buffer,
    encryptionPass: string,
  ): SoftwareKeyProvider {
    const iv = SoftwareKeyProvider.getRandom(IV_LENGTH)
    const encryptedSeed = SoftwareKeyProvider.encrypt(
      SoftwareKeyProvider.normalizePassword(encryptionPass),
      seed,
      iv,
    )

    return new SoftwareKeyProvider(Buffer.concat([iv, encryptedSeed]))
  }

  /**
   * Recover the Key Provider based on a bip39 mnemonic seed phrase
   * @param mnemonic - string that contains the seed phrase
   * @param encryptionPass - password used to generated encryption cipher
   * @returns an instance of the VaultedKeyProvider
   * @example SoftwareKeyProvider.recoverKeyPair('fluid purse degree ...', 'secret')
   */
  public static recoverKeyPair(
    mnemonic: string,
    encryptionPass: string,
  ): SoftwareKeyProvider {
    if (!validateMnemonic(mnemonic)) {
      throw new Error(ErrorCodes.SKPMnemonicInvalid)
    }

    const seed = Buffer.from(mnemonicToEntropy(mnemonic), 'hex')
    return SoftwareKeyProvider.fromSeed(seed, encryptionPass)
  }

  /**
   * Derives and returns child public key at specified path
   * @param derivationArgs - Password for seed decryption and derivation path
   * @example `vault.getPublicKey({derivationPath: ..., decryptionPass: ...}) // Buffer <...>`
   */

  public getPublicKey(derivationArgs: IKeyDerivationArgs): Buffer {
    const { encryptionPass, derivationPath } = derivationArgs

    const seed = SoftwareKeyProvider.decrypt(
      SoftwareKeyProvider.normalizePassword(encryptionPass),
      this._encryptedSeed,
      this._iv,
    )
    return fromSeed(seed).derivePath(derivationPath).publicKey
  }

  /**
   * Returns N bytes of random data
   * @param nr - Number of bytes to verify
   * @example `vault.getRandom(32) // Buffer <...>`
   */

  // TODO - Use csprng implementation
  public static getRandom(nr: number): Buffer {
    return randomBytes(nr)
  }

  /**
   * Computes secp256k1 signature given a 256 bit digest
   * @param derivationArgs - Password for seed decryption and derivation path
   * @param digest - The data to sign, 256 bits
   * @example `vault.sign({derivationPath: ..., decryptionPass: ...}, Buffer <...>) // Buffer <...>`
   */

  public sign(derivationArgs: IKeyDerivationArgs, digest: Buffer): Buffer {
    const { encryptionPass, derivationPath } = derivationArgs
    const seed = SoftwareKeyProvider.decrypt(
      SoftwareKeyProvider.normalizePassword(encryptionPass),
      this._encryptedSeed,
      this._iv,
    )
    const signingKey = fromSeed(seed).derivePath(derivationPath)
    return signingKey.sign(digest)
  }

  /**
   * Derives and returns the child private key at specified path
   * @deprecated Will be removed in next major release, currently used for signing Ethereum transactions
   * @param derivationArgs - Password for seed decryption and derivation path
   * @example `vault.getPrivateKey({derivationPath: ..., decryptionPass: ...}) // Buffer <...>`
   */

  public getPrivateKey(derivationArgs: IKeyDerivationArgs): Buffer {
    const { encryptionPass, derivationPath } = derivationArgs
    const seed = SoftwareKeyProvider.decrypt(
      SoftwareKeyProvider.normalizePassword(encryptionPass),
      this._encryptedSeed,
      this._iv,
    )

    console.warn('METHOD WILL BE DEPRECATED SOON, ANTIPATTERN')
    return fromSeed(seed).derivePath(derivationPath).privateKey
  }

  /**
   * Returns the mnemonic of the stored seed
   * @param encryptionPass - Password for seed decryption
   * @param did - [optional] id-string of the corresponding DID, this is needed to recover after key rotations
   */
  public getMnemonic(encryptionPass: string, did?: string): string {
    const seed = SoftwareKeyProvider.decrypt(
      SoftwareKeyProvider.normalizePassword(encryptionPass),
      this._encryptedSeed,
      this._iv,
    )
    if (did) return entropyToMnemonic(seed) + ' ' + entropyToMnemonic(did)
    return entropyToMnemonic(seed)
  }

  /**
   * Digests the passed object, and computes the signature
   * @param derivationArgs - Password for seed decryption and derivation path
   * @param toSign - Instance of class that implements the {@link IDigestable} interface
   * @param derivationArgs.encryptionPass - The encryption password
   * @param derivationArgs.derivationPath - The bip32 derivation path
   * @example `await vault.signDigestable(derivationArgs, publicProfileCredential) // Buffer <...>`
   */
  public async signDigestable(
    derivationArgs: IKeyDerivationArgs,
    toSign: IDigestable,
  ): Promise<Buffer> {
    const digest = await toSign.digest()
    return this.sign(derivationArgs, digest)
  }

  /**
   * Encrypts data using the aes 256 cbc cipher
   * @param data - The data to encrypt
   * @param key - The encryption key
   * @param iv - Random initialisation vector
   */

  private static encrypt(key: Buffer, data: Buffer, iv: Buffer): Buffer {
    const cipher = createCipheriv(ALG, key, iv)
    return Buffer.concat([cipher.update(data), cipher.final()])
  }

  /**
   * Decrypts data using the aes 256 cbc cipher
   * @param data - The data to decrypt
   * @param key - The decryption password
   * @param iv - Random initialisation vector
   */

  private static decrypt(key: Buffer, data: Buffer, iv: Buffer): Buffer {
    const decipher = createDecipheriv(ALG, key, iv)
    return Buffer.concat([decipher.update(data), decipher.final()])
  }

  /**
   * Encrypts data asymmetrically
   * @param data - The data to encrypt
   * @param pubKey - The key to encrypt to
   */
  public async asymEncrypt(data: Buffer, pubKey: Buffer): Promise<string> {
    return this.stringifyEncryptedData(await eccrypto.encrypt(pubKey, data))
  }

  /**
   * Decrypts data asymmetrically
   * @param data - The data to decrypt
   * @param derivationArgs - The decryption private key derivation arguments
   */
  public async asymDecrypt(
    data: string,
    derivationArgs: IKeyDerivationArgs,
  ): Promise<Buffer> {
    const decKey = this.getPrivateKey(derivationArgs)
    const dataObj = this.parseEncryptedData(data)
    return eccrypto.decrypt(decKey, dataObj)
  }

  /**
   * Encrypts data based on the hybrid encryption scheme of PGP. This means that
   * the data will first be encrypted with a freshly generated symmetric key and
   * afterwards this key is encrypted with the public key in an asymmetric manner
   * @param data - The data that should be encrypted
   * @param derivationArgs - The derivation args to derive the public key for encryption
   */
  public async encryptHybrid(
    data: object,
    derivationArgs: IKeyDerivationArgs,
  ): Promise<EncryptedData> {
    const publicKey = this.getPublicKey(derivationArgs)

    const symKey = SoftwareKeyProvider.getRandom(PASSWORD_LENGTH)
    const iv = SoftwareKeyProvider.getRandom(IV_LENGTH)

    // Encrypt symmetrically
    const encryptedData = SoftwareKeyProvider.encrypt(
      symKey,
      Buffer.from(JSON.stringify(data)),
      iv,
    )

    // Encrypt asymmetrically
    const encryptedKey = await this.asymEncrypt(symKey, publicKey)
    return {
      keys: [
        {
          cipher: encryptedKey,
          pubKey: publicKey.toString('hex'),
        },
      ],
      data: Buffer.concat([iv, encryptedData]).toString('hex'),
    }
  }

  /**
   * decrypt data that was hybrid encrypted before
   * @param encryptedData - Data to decrypt
   * @param derivationArg - derivation args to derive public and private key
   */
  public async decryptHybrid(
    encryptedData: EncryptedData,
    derivationArg: IKeyDerivationArgs,
  ): Promise<object> {
    const publicKey = this.getPublicKey(derivationArg)
    // find encrypted key
    const encryptedKey = encryptedData.keys.find(
      key => key.pubKey === publicKey.toString('hex'),
    )
    if (!encryptedKey) throw new Error(ErrorCodes.SKPDecryptionInvalidKey)

    // decrypt asymmetrically
    // FIXME We are using a fork of eccrypto to fix a bug in eccrypto.decrypt() see https://github.com/jolocom/jolocom-lib/issues/384
    //  change this back once this https://github.com/bitchan/eccrypto/pull/47 is released
    const symKey = await this.asymDecrypt(encryptedKey.cipher, derivationArg)

    // decrypt symmetrically
    const encryptedDataBuffer = Buffer.from(encryptedData.data, 'hex')
    const data = SoftwareKeyProvider.decrypt(
      symKey,
      encryptedDataBuffer.slice(IV_LENGTH), // extract cipher text
      encryptedDataBuffer.slice(0, IV_LENGTH), // extract IV
    ).toString()
    return JSON.parse(data)
  }

  /**
   * stringify encrypted data
   * @param data - result of asymmetric encryption by eccrypto
   */
  private stringifyEncryptedData(data: object): string {
    let hexData = {}
    Object.keys(data).forEach(key => (hexData[key] = data[key].toString('hex')))
    return JSON.stringify(hexData)
  }

  /**
   * parse encrypted data that was stringified before
   * @param data - stringified encrypted data
   */
  private parseEncryptedData(data: string): object {
    const hexData = JSON.parse(data)
    let bufferData = {}
    Object.keys(hexData).forEach(key => {
      bufferData[key] = Buffer.from(hexData[key], 'hex')
    })
    return bufferData
  }

  /**
   * aes 256 cbc with IV requires 32 byte encryption keys, in case the user provided
   *  password is not long enough, we digest it using sha256 and print a warning instead
   *  of throwing an error
   * @param password - The user provided password, treated as UTF-8 string
   * @returns normalizePassword - 32 byte long buffer used as encryption key, either original password, or it's sha256 digest
   */

  private static normalizePassword(password: string): Buffer {
    const passwordBuffer = Buffer.from(password)

    if (!passwordBuffer.length) return
    if (passwordBuffer.length !== PASSWORD_LENGTH) {
      console.warn(
        `Provided password must have a length of ${PASSWORD_LENGTH} bytes, received ${passwordBuffer.length}. We will compute the sha256 hash of the provided password and use it instead`,
      )

      return sha256(passwordBuffer)
    }

    return passwordBuffer
  }
}


