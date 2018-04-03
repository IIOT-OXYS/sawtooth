const {createContext, CryptoFactory} = require('sawtooth-sdk/signing')

const context = createContext('secp256k1')
const privateKey = context.newRandomPrivateKey()
const signer = new CryptoFactory(context).newSigner(privateKey)


const cbor = require('cbor')





const {createHash} = require('crypto')
const {protobuf} = require('sawtooth-sdk')

const crypto = require('crypto')
const _hash = (x) =>
  crypto.createHash('sha512').update(x).digest('hex').toLowerCase().substring(0, 64)

const XO_FAMILY = 'intkey1'

const XO_NAMESPACE = _hash(XO_FAMILY).substring(0, 6)

const _makeXoAddress = (x) => XO_NAMESPACE + _hash(x)


const transactions = []

for (let i = 1; i < 10; i++) {

    const payload = {
    Verb: 'inc',
    Name: 'name1' ,
    Value: i%5
}


const payloadBytes = cbor.encode(payload)

const transactionHeaderBytes = protobuf.TransactionHeader.encode({
    familyName: 'intkey',
    familyVersion: '1.0',
    inputs: ['1cf126'],
    outputs: ['1cf126'],
    signerPublicKey: signer.getPublicKey().asHex(),
    batcherPublicKey: signer.getPublicKey().asHex(),
    dependencies: [],
    payloadSha512: createHash('sha512').update(payloadBytes).digest('hex')
}).finish()


const signature = signer.sign(transactionHeaderBytes)

    const transaction = protobuf.Transaction.create({
        header: transactionHeaderBytes,
        headerSignature: signature,
        payload: payloadBytes
    })

   transactions.push(transaction)
} 

const batchHeaderBytes = protobuf.BatchHeader.encode({
    signerPublicKey: signer.getPublicKey().asHex(),
    transactionIds: transactions.map((txn) => txn.headerSignature),
}).finish()

const signature1 = signer.sign(batchHeaderBytes)

const batch = protobuf.Batch.create({
    header: batchHeaderBytes,
    headerSignature: signature1,
    transactions: transactions
})


const batchListBytes = protobuf.BatchList.encode({
    batches: [batch]
}).finish()


const request = require('request')
var start = new Date().getTime();
request.post({
    url: 'http://10.152.121.104:8008/batches',
    body: batchListBytes,
    headers: {'Content-Type': 'application/octet-stream'}
}, (err, response) => {
    if (err) return console.log(err)
    console.log(response.body)
    var end = new Date().getTime();
var time = end - start;
console.log('Execution time: ' + time);
})

