import { IIpfsConnector } from '../ipfs/types'
import { IEthereumConnector} from '../ethereum/types'
import { IdentityWallet } from '../identityWallet/identityWallet'
import { IVaultedKeyProvider, IKeyDerivationArgs } from '../vaultedKeyProvider/types'
import { Identity } from '../identity/identity'
import {IContracts, IContractsGateway} from '../contracts/types'

export interface IRegistryStaticCreationArgs {
  contracts: {
    implementation: IContracts,
    connection: IContractsGateway
  }
  ipfsConnector: IIpfsConnector
  ethereumConnector: IEthereumConnector
}

export interface IRegistryCommitArgs {
  vaultedKeyProvider: IVaultedKeyProvider
  keyMetadata: IKeyDerivationArgs
  identityWallet: IdentityWallet
}

export interface ISigner {
  did: string
  keyId: string
}

export interface IRegistry {
  create: (vaultedKeyProvider: IVaultedKeyProvider, decryptionPassword: string) => Promise<IdentityWallet>
  commit: (commitArgs: IRegistryCommitArgs) => Promise<void>
  resolve: (did) => Promise<Identity>
  authenticate: (vaultedKeyProvider: IVaultedKeyProvider, derivationArgs: IKeyDerivationArgs) => Promise<IdentityWallet>
}
