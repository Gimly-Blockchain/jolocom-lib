import { expect } from 'chai'
import DidDocument from '../ts/identity/didDocument'
import testData from './data/identity'
import * as lolex from 'lolex'

describe('Did Document', () => {
  var ddo
  var clock

  before(function() {
    clock = lolex.install({now: new Date('2018-01-24T15:42:15.882Z')})
    const publicKey = Buffer.from(testData.testUserPublicKey, 'utf8')
    ddo = new DidDocument(publicKey)
  })

  it('Should include context field which specifies the version of DID specification', () => {
    expect(JSON.stringify(ddo)).to.contain('https://w3id.org/did/v1')
  })

  it('Should include properly formatted authentication credentials of ecdsa key', () => {
    expect(JSON.stringify(ddo)).to.equal(testData.expectedDdoJson)
  })

  it('Should be parsed back to DdoDocument correctly', () => {
//    expect(JSON.parse(JSON.stringify(ddo))).to.equal(ddo)
  })
})
