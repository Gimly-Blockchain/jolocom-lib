import { BaseMetadata } from '@jolocom/protocol-ts'
import { Credential } from '../credentials/credential/credential'
import { SignedCredential } from '../credentials/signedCredential/signedCredential'
import { ExclusivePartial, IIdentityWalletCreateArgs } from './types'
import { Identity } from '../identity/identity'
import { JSONWebToken } from '../interactionTokens/JSONWebToken'
import { InteractionType } from '../interactionTokens/types'
import { PaymentResponse } from '../interactionTokens/paymentResponse'
import { PaymentRequest } from '../interactionTokens/paymentRequest'
import { Authentication } from '../interactionTokens/authentication'
import { CredentialRequest } from '../interactionTokens/credentialRequest'
import { CredentialResponse } from '../interactionTokens/credentialResponse'
import { SoftwareKeyProvider } from '../vaultedKeyProvider/softwareProvider'
import {
  IVaultedKeyProvider,
  KeyTypes,
  IKeyDerivationArgs,
} from '../vaultedKeyProvider/types'
import {
  IKeyMetadata,
  ISignedCredCreationArgs,
} from '../credentials/signedCredential/types'
import {
  keyIdToDid,
  getIssuerPublicKey,
  publicKeyToAddress,
} from '../utils/helper'
import {
  IContractsAdapter,
  IContractsGateway,
  ITransactionEncodable,
} from '../contracts/types'
import { CredentialOfferRequest } from '../interactionTokens/credentialOfferRequest'
import { CredentialOfferResponse } from '../interactionTokens/credentialOfferResponse'
import { CredentialsReceive } from '../interactionTokens/credentialsReceive'
import {
  CredentialOfferRequestAttrs,
  CredentialOfferResponseAttrs,
  IAuthenticationAttrs,
  ICredentialRequestAttrs,
  ICredentialResponseAttrs,
  ICredentialsReceiveAttrs,
  IPaymentRequestAttrs,
  IPaymentResponseAttrs,
} from '../interactionTokens/interactionTokens.types'
import { ErrorCodes } from '../errors'
import { JoloDidMethod } from '../didMethods/jolo'

/**
 * @dev We use Class Transformer (CT) to instantiate all interaction Tokens i.e. in
 * identityWallet.create.interactionTokens.* calls.
 * Because of CT we can't define constructors on the interaction token classes.
 * The de facto constructor is the `fromJSON(json)` call. Therefore the arguments
 * to instantiate one are often times the same as for `fromJSON`.
 *  Some values are optional because the function instantiating the Interaction Token
 * can sometimes set sane defaults.
 * As a conclusion, A lot of the interfaces for creating a new interaction token using
 * the identity wallet match the JSON interface (with some keys potentially optional)
 */

interface PaymentRequestCreationArgs {
  callbackURL: string
  description: string
  transactionOptions: ExclusivePartial<
    IPaymentRequestAttrs['transactionOptions'],
    'value'
  >
}

// TODO Remove this perhaps, only used in one place
type PublicKeyMap = { [key in keyof typeof KeyTypes]?: string }

/*
 * TODO Easiest way to add a new argument to all function signatures.
 *  once the different creation functions have been simplified, this can be
 *  refactored away
 */

type WithExtraOptions<T> = T & {
  expires?: Date
  aud?: string
}

/**
 * @class
 * Developer facing class with initialized instance of the key provider as member.
 * Encapsulates functionality related to creating and signing credentials and
 * interaction tokens
 */

export class IdentityWallet {
  private _identity: Identity
  private _publicKeyMetadata: IKeyMetadata
  private _vaultedKeyProvider: IVaultedKeyProvider
  private _contractsAdapter: IContractsAdapter
  private _contractsGateway: IContractsGateway

  /**
   * Get the did associated with the identity wallet
   * @example `console.log(identityWallet.did) // 'did:jolo:...'`
   */

  public get did(): string {
    return this.identity.did
  }

  /**
   * Set the did associated with the identity wallet
   * @example `identityWallet.did = 'did:jolo:...'`
   */

  public set did(did: string) {
    this.identity.did = did
  }

  /**
   * Get the {@link Identity} associated with the identity wallet
   * @example `console.log(identityWallet.identity) // Identity {...}`
   */

  public get identity() {
    return this._identity
  }

  /**
   * Get the {@link Identity} associated wtith the identity wallet
   * @example `identityWallet.identity = Identity.fromDidDocument(...)`
   */

  public set identity(identity: Identity) {
    this._identity = identity
  }

  /**
   * Get the {@link DidDocument} associated wtith the identity wallet
   * @example `console.log(identityWallet.didDocument) // DidDocument {...}`
   */

  public get didDocument() {
    return this.identity.didDocument
  }

  /**
   * Set the {@link DidDocument} associated wtith the identity wallet
   * @example `identityWallet.didDocument = DidDocument.fromPublicKey(...)`
   */

  public set didDocument(didDocument) {
    this.identity.didDocument = didDocument
  }

  /**
   * Get the metadata about the key pair associated wtith the identity wallet
   * @example `console.log(identityWallet.publicKeyMetadata) // {derivationPath: '...', keyId: '...'}`
   */

  public get publicKeyMetadata(): IKeyMetadata {
    return this._publicKeyMetadata
  }

  /**
   * Set the metadata about the key pair associated wtith the identity wallet
   * @example `identityWallet.publicKeyMetadata = {derivationPath: '...', keyId: '...'}`
   */

  public set publicKeyMetadata(metadata: IKeyMetadata) {
    this._publicKeyMetadata = metadata
  }

  /**
   * Get the vaulted key provider instance associated wtith the identity wallet
   * @example `console.log(identityWallet.vaultedKeyProvider) // SoftwareKeyProvider {...}`
   */

  private get vaultedKeyProvider() {
    return this._vaultedKeyProvider
  }

  /**
   * Get the vaulted key provider instance associated wtith the identity wallet
   * @example `identityWallet.vaultedKeyProvider = new SoftwareKeyProvider(...)`
   */

  private set vaultedKeyProvider(keyProvider: IVaultedKeyProvider) {
    this._vaultedKeyProvider = keyProvider
  }

  /**
   * @constructor
   * @param identity - Instance of {@link Identity} class, containing a {@link DidDocument}
   *   and optionally a public profile {@link SignedCredential}
   * @param publicKeyMetadata - Public key id and derivation path
   * @param vaultedKeyProvider - Vaulted key store for generating signatures
   * @param contractsGateway - Instance of connector to the used smart contract chain
   * @param contractsAdapter - Instance of handler to assemble Transactions for the used smart contract chain
   */

  public constructor({
    identity,
    publicKeyMetadata,
    vaultedKeyProvider,
    contractsGateway,
    contractsAdapter,
  }: IIdentityWalletCreateArgs) {
    if (
      !identity ||
      !publicKeyMetadata ||
      !vaultedKeyProvider ||
      !contractsAdapter ||
      !contractsGateway
    ) {
      throw new Error(ErrorCodes.IDWInvalidCreationArgs)
    }

    this.identity = identity
    this.publicKeyMetadata = publicKeyMetadata
    this.vaultedKeyProvider = vaultedKeyProvider
    this._contractsGateway = contractsGateway
    this._contractsAdapter = contractsAdapter
  }

  /**
   * Creates and signs a {@link SignedCredential}
   * @param params - Credential creation attributes, including claim, context, subject
   * @param pass - Password to decrypt the vaulted seed
   */

  private createSignedCred = async <T extends BaseMetadata>(
    {
      expires,
      ...credentialParams
    }: WithExtraOptions<ISignedCredCreationArgs<T>>,
    pass: string,
  ) => {
    const { derivationPath } = this.publicKeyMetadata

    const vCred = await SignedCredential.create(
      {
        subject: credentialParams.subject || this.did,
        ...credentialParams,
      },
      {
        keyId: this.publicKeyMetadata.keyId,
        issuerDid: this.did,
      },
      expires,
    )

    const signature = await this.vaultedKeyProvider.signDigestable(
      { derivationPath, encryptionPass: pass },
      vCred,
    )
    vCred.signature = signature.toString('hex')
    return vCred
  }

  /**
   * Creates and signs a message
   * @param args - Message creation attributes
   * @param pass - Password to decrypt the vaulted seed
   * @param received - optional received JSONWebToken Class
   */
  private createMessage = async <T, R>(
    args: { message: T; typ: string; expires?: Date; aud?: string },
    pass: string,
    recieved?: JSONWebToken<R>,
  ) => {
    const jwt = JSONWebToken.fromJWTEncodable(args.message)
    jwt.interactionType = args.typ
    if (args.aud) jwt.audience = args.aud
    jwt.timestampAndSetExpiry(args.expires)

    return this.initializeAndSign(
      jwt,
      this.publicKeyMetadata.derivationPath,
      pass,
      recieved,
    )
  }

  private makeReq = <T>(typ: string) => (
    { expires, aud, ...message }: WithExtraOptions<T>,
    pass: string,
  ) =>
    this.createMessage(
      {
        // @ts-ignore
        message: this.messageCannonicaliser(typ).fromJSON(message),
        typ,
        expires,
        aud,
      },
      pass,
    )

  private makeRes = <T, R>(typ: string) => (
    { expires, aud, ...message }: WithExtraOptions<T>,
    pass: string,
    recieved?: JSONWebToken<R>,
  ) =>
    this.createMessage(
      {
        // @ts-ignore
        message: this.messageCannonicaliser(typ).fromJSON(message),
        typ,
        expires,
        aud,
      },
      pass,
      recieved,
    )

  private messageCannonicaliser = (typ: string) => {
    switch (typ) {
      case InteractionType.CredentialsReceive:
        return CredentialsReceive
      case InteractionType.CredentialOfferRequest:
        return CredentialOfferRequest
      case InteractionType.CredentialOfferResponse:
        return CredentialOfferResponse
      case InteractionType.CredentialRequest:
        return CredentialRequest
      case InteractionType.CredentialResponse:
        return CredentialResponse
      case InteractionType.Authentication:
        return Authentication
      case InteractionType.PaymentRequest:
        return PaymentRequest
      case InteractionType.PaymentResponse:
        return PaymentResponse
    }
    throw new Error(ErrorCodes.JWTInvalidInteractionType)
  }

  /**
   * Derives all public keys listed in the {@link KeyTypes} enum
   * @param encryptionPass - password for interfacing with the vaulted key provider
   * @example `iw.getPublicKeys('secret')` // { jolocomIdentityKey: '0xabc...ff', ethereumKey: '0xabc...ff'}
   */

  public getPublicKeys = (encryptionPass: string): PublicKeyMap => {
    const supportedKeys = Object.entries(KeyTypes)

    return supportedKeys.reduce<PublicKeyMap>((acc, currentEntry) => {
      const [keyType, derivationPath] = currentEntry

      return {
        ...acc,
        [keyType]: this.vaultedKeyProvider
          .getPublicKey({
            derivationPath,
            encryptionPass,
          })
          .toString('hex'),
      }
    }, {})
  }

  /**
   * Initializes the JWT Class with required fields (exp, iat, iss, typ) and adds a signature
   * @param jwt - JSONWebToken Class
   * @param derivationPath - Derivation Path for identity keys
   * @param pass - Password to decrypt the vaulted seed
   * @param receivedJWT - optional received JSONWebToken Class
   */

  private async initializeAndSign<T, R>(
    jwt: JSONWebToken<T>,
    derivationPath: string,
    pass: string,
    receivedJWT?: JSONWebToken<R>,
  ) {
    if (receivedJWT) {
      jwt.audience = keyIdToDid(receivedJWT.issuer)
      jwt.nonce = receivedJWT.nonce
    } else {
      jwt.nonce = SoftwareKeyProvider.getRandom(8).toString('hex')
    }

    jwt.issuer = this.publicKeyMetadata.keyId

    const signature = await this.vaultedKeyProvider.signDigestable(
      { derivationPath, encryptionPass: pass },
      jwt,
    )
    jwt.signature = signature.toString('hex')

    return jwt
  }

  /**
   * Validates interaction tokens for signatures, expiry, jti, and audience
   * @param receivedJWT - received JSONWebToken Class
   * @param sendJWT - optional send JSONWebToken Class which is used to validate the token nonce and the aud field on received token
   * @param resolver - instance of a {@link Resolver} to use for retrieving the signer's keys. If none is provided, the
   * default Jolocom contract is used for resolution.
   */

  // TODO Should this just take a resolve function? Probably yes
  public async validateJWT<T, R>(
    receivedJWT: JSONWebToken<T>,
    sentJWT?: JSONWebToken<R>,
    resolver = new JoloDidMethod().resolver,
  ): Promise<void> {
    const issuer = await resolver.resolve(keyIdToDid(receivedJWT.issuer))
    const pubKey = getIssuerPublicKey(receivedJWT.issuer, issuer.didDocument)

    // First we make sure the signature on the interaction token is valid
    if (!(await SoftwareKeyProvider.verifyDigestable(pubKey, receivedJWT))) {
      throw new Error(ErrorCodes.IDWInvalidJWTSignature)
    }

    // TODO Should this somehow take into consideration the issuance date of the request
    // if one is present?
    if (receivedJWT.expires < Date.now()) {
      throw new Error(ErrorCodes.IDWTokenExpired)
    }

    // In case the request object is provided (we are validating a response)
    if (sentJWT) {
      // We make sure the aud on the received message matches the issuer of the request
      if (receivedJWT.audience !== sentJWT.signer.did) {
        throw new Error(ErrorCodes.IDWNotCorrectResponder)
      }

      // We make sure the request and response share the same random nonce, i.e. part of one interaction
      if (sentJWT.nonce !== receivedJWT.nonce) {
        throw new Error(ErrorCodes.IDWIncorrectJWTNonce)
      }
    } else {
      // No request object is provided (we are either validating a request, or a response in isolation)
      // In which case, we make sure that if the request had a target audience, it matches our identity
      if (receivedJWT.audience && receivedJWT.audience !== this.identity.did) {
        throw new Error(ErrorCodes.IDWNotIntendedAudience)
      }
    }
  }

  /**
   * Encrypts data asymmetrically
   * @param data - The data to encrypt
   * @param pubKey - The key to encrypt to
   */
  public asymEncrypt = async (data: Buffer, publicKey: Buffer) =>
    this.vaultedKeyProvider.asymEncrypt(data, publicKey)

  /**
   * Encrypts data asymmetrically
   * @param data - The data to encrypt
   * @param keyRef - The public key reference to encrypt to (e.g. 'did:jolo:12345#key-1')
   * @param resolver - instance of a {@link Resolver} to use for retrieving the target's public keys. If none is provided, the
   * default Jolocom contract is used for resolution.
   */
  public asymEncryptToDidKey = async (
    data: Buffer,
    keyRef: string,
    resolver = new JoloDidMethod().resolver,
  ) => this.asymEncrypt(
      data,
      getIssuerPublicKey(
        keyRef,
        (await resolver.resolve(
          keyIdToDid(keyRef)
        )).didDocument
      )
    )

  /**
   * Decrypts data asymmetrically
   * @param data - The data to decrypt
   * @param derivationArgs - The decryption private key derivation arguments
   */
  public asymDecrypt = async (
    data: string,
    decryptionKeyArgs: IKeyDerivationArgs,
  ) => this.vaultedKeyProvider.asymDecrypt(data, decryptionKeyArgs)

  private sendTransaction = async (
    request: ITransactionEncodable,
    pass: string,
  ) => {
    const publicKey = this._vaultedKeyProvider.getPublicKey({
      derivationPath: KeyTypes.ethereumKey,
      encryptionPass: pass,
    })

    const address = publicKeyToAddress(publicKey)
    const { nonce } = await this._contractsGateway.getAddressInfo(address)

    const tx = this._contractsAdapter.assembleTxFromInteractionToken(
      request,
      address,
      nonce,
      this.vaultedKeyProvider,
      pass,
    )
    return this._contractsGateway.broadcastTransaction(tx)
  }

  public transactions = {
    sendTransaction: this.sendTransaction,
  }

  /* Gathering creation methods in an easier to use public interface */

  public create = {
    credential: Credential.create,
    signedCredential: this.createSignedCred,
    message: this.createMessage,
    interactionTokens: {
      request: {
        auth: this.makeReq<
          ExclusivePartial<IAuthenticationAttrs, 'callbackURL'>
        >(InteractionType.Authentication),
        offer: this.makeReq<CredentialOfferRequestAttrs>(
          InteractionType.CredentialOfferRequest,
        ),
        share: this.makeReq<ICredentialRequestAttrs>(
          InteractionType.CredentialRequest,
        ),
        payment: (args: WithExtraOptions<PaymentRequestCreationArgs>, pass: string) => {
          const { transactionOptions } = args

          const withDefaults = {
            gasLimit: 21000,
            gasPrice: 10e9,
            to: transactionOptions.to ||
              publicKeyToAddress(
                Buffer.from(this.getPublicKeys(pass).ethereumKey, 'hex')
            ),
            ...transactionOptions
          }

          return this.makeReq<PaymentRequestCreationArgs>(InteractionType.PaymentRequest)({...args, transactionOptions: withDefaults} , pass)},
      },
      response: {
        auth: this.makeRes<
          ExclusivePartial<IAuthenticationAttrs, 'callbackURL'>,
          Authentication
        >(InteractionType.Authentication),
        offer: this.makeRes<
          CredentialOfferResponseAttrs,
          CredentialOfferRequest
        >(InteractionType.CredentialOfferResponse),
        share: this.makeRes<ICredentialResponseAttrs, CredentialRequest>(
          InteractionType.CredentialResponse,
        ),
        issue: this.makeRes<ICredentialsReceiveAttrs, CredentialOfferResponse>(
          InteractionType.CredentialsReceive,
        ),
        payment: this.makeRes<IPaymentResponseAttrs, PaymentRequest>(
          InteractionType.PaymentResponse,
        ),
      },
    },
  }
}
