export interface IEthereumResolverConfig {
  providerUrl: string
  contractAddress: string
}

export interface IEthereumResolverUpdateDIDArgs {
  ethereumKey: Buffer
  did: string
  newHash: string
}

export interface IEthereumConnector {
  resolveDID: (did: string) => Promise<string>
  updateDIDRecord: (args: IEthereumResolverUpdateDIDArgs) => Promise<void>
}

export enum SupportedTxTypes {
  payment = 'payment'
}

export interface IContractHandler {
  assembleTransaction: (txType: SupportedTxTypes) => void
}

export interface IContractConnector {
  broadcastTransaction: () => {}
}

