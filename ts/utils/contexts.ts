import { ContextEntry } from 'cred-types-jolocom-core'

/* Expanded default context for verifiable credentials, more verbose, but works in offline use cases */

export const defaultContext: ContextEntry[] = [
  {
    id: '@id',
    type: '@type',
    cred: 'https://w3id.org/credentials#',
    schema: 'http://schema.org/',
    dc: 'http://purl.org/dc/terms/',
    xsd: 'http://www.w3.org/2001/XMLSchema#',
    sec: 'https://w3id.org/security#',
    Credential: 'cred:Credential',
    issuer: { '@id': 'cred:issuer', '@type': '@id' },
    issued: { '@id': 'cred:issued', '@type': 'xsd:dateTime' },
    claim: { '@id': 'cred:claim', '@type': '@id' },
    credential: { '@id': 'cred:credential', '@type': '@id' },
    expires: { '@id': 'sec:expiration', '@type': 'xsd:dateTime' },
    proof: { '@id': 'sec:proof', '@type': '@id' },
    EcdsaKoblitzSignature2016: 'sec:EcdsaKoblitzSignature2016',
    created: { '@id': 'dc:created', '@type': 'xsd:dateTime' },
    creator: { '@id': 'dc:creator', '@type': '@id' },
    domain: 'sec:domain',
    nonce: 'sec:nonce',
    signatureValue: 'sec:signatureValue',
  },
]

/* Expanded default context for did documents, more verbose, but works in offline use cases */

export const defaultContextIdentity: ContextEntry[] = [
  // @ts-ignore number is not allowed as value of ContextEntry
  {
    '@version': 1.1,
    id: '@id',
    type: '@type',
    dc: 'http://purl.org/dc/terms/',
    rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
    schema: 'http://schema.org/',
    sec: 'https://w3id.org/security#',
    didv: 'https://w3id.org/did#',
    xsd: 'http://www.w3.org/2001/XMLSchema#',

    AuthenticationSuite: 'sec:AuthenticationSuite',
    CryptographicKey: 'sec:Key',
    EquihashProof2017: 'sec:EquihashProof2017',
    GraphSignature2012: 'sec:GraphSignature2012',
    IssueCredential: 'didv:IssueCredential',
    LinkedDataSignature2015: 'sec:LinkedDataSignature2015',
    LinkedDataSignature2016: 'sec:LinkedDataSignature2016',
    RsaCryptographicKey: 'sec:RsaCryptographicKey',
    RsaSignatureAuthentication2018: 'sec:RsaSignatureAuthentication2018',
    RsaSigningKey2018: 'sec:RsaSigningKey',
    RsaSignature2015: 'sec:RsaSignature2015',
    RsaSignature2017: 'sec:RsaSignature2017',
    UpdateDidDescription: 'didv:UpdateDidDescription',

    authentication: 'sec:authenticationMethod',
    authenticationCredential: 'sec:authenticationCredential',
    authorizationCapability: 'sec:authorizationCapability',
    canonicalizationAlgorithm: 'sec:canonicalizationAlgorithm',
    capability: 'sec:capability',
    comment: 'rdfs:comment',
    controller: { '@id': 'sec:controller', '@type': '@id' },
    created: { '@id': 'dc:created', '@type': 'xsd:dateTime' },
    creator: { '@id': 'dc:creator', '@type': '@id' },
    description: 'schema:description',
    digestAlgorithm: 'sec:digestAlgorithm',
    digestValue: 'sec:digestValue',
    domain: 'sec:domain',
    entity: 'sec:entity',
    equihashParameterAlgorithm: 'sec:equihashParameterAlgorithm',
    equihashParameterK: {
      '@id': 'sec:equihashParameterK',
      '@type': 'xsd:integer',
    },
    equihashParameterN: {
      '@id': 'sec:equihashParameterN',
      '@type': 'xsd:integer',
    },
    expires: { '@id': 'sec:expiration', '@type': 'xsd:dateTime' },
    field: { '@id': 'didv:field', '@type': '@id' },
    label: 'rdfs:label',
    minimumProofsRequired: 'sec:minimumProofsRequired',
    minimumSignaturesRequired: 'sec:minimumSignaturesRequired',
    name: 'schema:name',
    nonce: 'sec:nonce',
    normalizationAlgorithm: 'sec:normalizationAlgorithm',
    owner: { '@id': 'sec:owner', '@type': '@id' },
    permission: 'sec:permission',
    permittedProofType: 'sec:permittedProofType',
    privateKey: { '@id': 'sec:privateKey', '@type': '@id' },
    privateKeyPem: 'sec:privateKeyPem',
    proof: 'sec:proof',
    proofAlgorithm: 'sec:proofAlgorithm',
    proofType: 'sec:proofType',
    proofValue: 'sec:proofValue',
    publicKey: { '@id': 'sec:publicKey', '@type': '@id', '@container': '@set' },
    publicKeyHex: 'sec:publicKeyHex',
    publicKeyPem: 'sec:publicKeyPem',
    requiredProof: 'sec:requiredProof',
    revoked: { '@id': 'sec:revoked', '@type': 'xsd:dateTime' },
    seeAlso: { '@id': 'rdfs:seeAlso', '@type': '@id' },
    signature: 'sec:signature',
    signatureAlgorithm: 'sec:signatureAlgorithm',
    signatureValue: 'sec:signatureValue',
    updated: { '@id': 'didv:updated', '@type': 'xsd:dateTime' },
  },
]
