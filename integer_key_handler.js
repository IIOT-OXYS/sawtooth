/**
 * Copyright 2016 Intel Corporation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * ------------------------------------------------------------------------------
 */

'use strict'

const { TransactionHandler } = require('sawtooth-sdk/processor/handler')
const {
  InvalidTransaction,
  InternalError
} = require('sawtooth-sdk/processor/exceptions')

const crypto = require('crypto')
const cbor = require('cbor')
var base64 = require('base-64');


const _hash = (x) =>
  crypto.createHash('sha512').update(x).digest('hex').toLowerCase()

const INT_KEY_FAMILY = 'ranjithtp'
const INT_KEY_NAMESPACE = _hash(INT_KEY_FAMILY).substring(0, 6)

const _decodeCbor = (buffer) =>
  new Promise((resolve, reject) =>
    cbor.decodeFirst(buffer, (err, obj) => (err ? reject(err) : resolve(obj)))
  )

const _toInternalError = (err) => {
  let message = (err.message) ? err.message : err
  throw new InternalError(message)
}

const _setEntry = (context, address, stateValue) => {
  let entries = {
    [address]: cbor.encode(stateValue)
  }
  return context.setState(entries)
}


const _setEntryTransfer = (context, fromAddress, toAddress, toValue, fromValue) => {
  let entries = {
    [toAddress]: cbor.encode(toValue),
    [fromAddress]: cbor.encode(fromValue)
  }
  return context.setState(entries)
}



const _applySet = (context, address, name, value) => (possibleAddressValues) => {
  let stateValueRep = possibleAddressValues[address]

  return _setEntry(context, address, value)
}


const _transfer = (context, fromAddress, toAddress, counterAddress, value) => (possibleAddressValues) => {
  let fromValueRep = possibleAddressValues[fromAddress]
   let toValueRep = possibleAddressValues[toAddress]
   let counterRep = possibleAddressValues[counterAddress]
   let toValue
  let fromValue
  let counter
   toValue = cbor.decodeFirstSync(toValueRep)
  fromValue = cbor.decodeFirstSync(fromValueRep)
  counter = cbor.decodeFirstSync(counterRep)


  console.log("From" + fromValue);
  console.log("TO" + toValue);
  console.log("VAlue" + value);

  if (fromValue < value) {
    throw new InvalidTransaction(
      `value greater than amount in bank`
    )
  }


  toValue = parseInt(toValue) + parseInt(value);
   fromValue = fromValue - value;

   counter = counter + 1;
   console.log("Counter" + counter);
   // console.log('Value of From Value after subraction --> ' + fromValue);
   _setEntry(context, counterAddress, counter)
   _setEntry(context, toAddress, toValue)
  return _setEntry(context, fromAddress, fromValue);
   // return _setEntryTransfer(context, toAddress, fromAddress, toValue, fromValue)
}



class IntegerKeyHandler extends TransactionHandler {
  constructor () {
    super(INT_KEY_FAMILY, ['1.0'], [INT_KEY_NAMESPACE])
  }

  apply (transactionProcessRequest, context) {
    return _decodeCbor(transactionProcessRequest.payload)
      .catch(_toInternalError)
      .then((update) => {
        //
        // Validate the update

        let action = update.action
        // Apply the action to the promise's result:
        if(action === "createNew"){
          let name = update.accountId
          let value = update.value
          let address = INT_KEY_NAMESPACE + _hash(name).slice(-64)
          // Get the current state, for the key's address:

          let getPromise = context.getState([address])
          let actionPromise = getPromise.then(
            _applySet(context, address, name, value)
          )

          // Validate that the action promise results in the correctly set address:
          return actionPromise.then(addresses => {
            if (addresses.length === 0) {
              throw new InternalError('State Error!')
            }
            console.log(`Verb:  Name: ${name} Value: ${value}`)
          })
        }

        if(action === "transfer"){
          let fromAccount = update.fromAccountId
          let toAccount = update.toAccountId
          let value = update.value
          let counter = "counter"
          let fromAddress = INT_KEY_NAMESPACE + _hash(fromAccount).slice(-64)
          let toAddress = INT_KEY_NAMESPACE + _hash(toAccount).slice(-64)
          let counterAddress = INT_KEY_NAMESPACE + _hash(counter).slice(-64)
          // Get the current state, for the key's address:

          let getPromise = context.getState([fromAddress, toAddress, counterAddress])
          let actionPromise = getPromise.then(
            _transfer(context, fromAddress, toAddress, counterAddress, value)
          )

          // Validate that the action promise results in the correctly set address:
          return actionPromise.then(addresses => {
            if (addresses.length === 0) {
              throw new InternalError('State Error!')
            }
            console.log(`Verb:  Name: ${fromAccount} Value: ${value}`)
          })
        }






      })
  }
}

module.exports = IntegerKeyHandler
