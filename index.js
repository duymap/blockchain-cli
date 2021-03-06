#!/usr/bin/env node
var bitcore = require('bitcore-lib');
var bitcoin = require('bitcoinjs-lib');
var program = require('commander');
var bs58check = require('bs58check');
var Insight = require("bitcore-explorers").Insight;
var insight = new Insight('testnet');
var fs = require('fs');
var regtestUtils = require('./_regtest');
var regtest = regtestUtils.network;

const GENERATE_SEGWIT = 'generate-segwit';
const GENERATE_BCH = 'generate-bch';
const MOVE_BCH = 'move-bch';
const MOVE_SEGWIT_BCH = 'move-segwit-bch';

const https = require('https');

program
  .version('1.0')
  .arguments('<cmd> [param1] [param2]').action(function (cmd, param1, param2) {
     cmdValue = cmd;
     paramValue1 = param1;
     paramValue2 = param2;
  });
 
program.parse(process.argv);
 
if (typeof cmdValue === 'undefined') {
   console.error('no command found!!!');
   process.exit(1);
}


switch (cmdValue) {
    case GENERATE_SEGWIT:
        generateSegwitP2SH(paramValue1);
        break;
    case GENERATE_BCH:
        generateNonSegwit(paramValue1);
        break;
    case MOVE_BCH:        
        moveBCH(paramValue1, paramValue2);
        break;
    case MOVE_SEGWIT_BCH:
        moveSegwitBCH(paramValue1, paramValue2);
        break;
    default:
        console.log('Invalid command');
        break;
}

// bench32 format
function generateNativeSegwit(fileName) {
    //console.log(rng);
    var keyPair = bitcoin.ECPair.makeRandom({ network: bitcoin.networks.testnet });
    var publicKey = keyPair.getPublicKeyBuffer();
    var scriptPublicKey = bitcoin.script.witnessPubKeyHash.output.encode(bitcoin.crypto.hash160(publicKey));
    var address = bitcoin.address.fromOutputScript(scriptPublicKey);
    console.log(address.toString());
}

function generateSegwitP2SH(fileName) {

    if (typeof fileName === 'undefined') {
        console.error('No fileName param found');
        return;
    }

    console.log('Generate Segwit (P2SH) Address');
    var keyPair = bitcoin.ECPair.makeRandom({network: bitcoin.networks.testnet});
    // writeFile(fileName + '.priv', keyPair.toWIF());
    
    var redeemScript = bitcoin.script.witnessPubKeyHash.output.encode(bitcoin.crypto.hash160(keyPair.getPublicKeyBuffer()))
    var scriptPubKey = bitcoin.script.scriptHash.output.encode(bitcoin.crypto.hash160(redeemScript))
    var address = bitcoin.address.fromOutputScript(scriptPubKey, bitcoin.networks.testnet);
    // depositSomeBCHForTesting(address);
    console.log('=========== Segwit P2SH address: ============');
    console.log(address);
}

function generateNonSegwit(fileName) {

    if (typeof fileName === 'undefined') {
        console.error('No fileName param found');
        return;
    }

    var WIF = bitcore.PrivateKey('testnet').toWIF();
    var privateKey = bitcore.PrivateKey.fromWIF(WIF);
    console.log(privateKey.toString());
    writeFile(fileName + '.priv', privateKey.toString());
    var address = privateKey.toAddress('testnet');
    depositSomeBCHForTesting(address);
    console.log('=========== Non-Segwit address: ============');
    console.log(address);
}

// param1: private key file name of from address
// param 2: string of segwit address 
function moveBCH(param1, param2) {
    // function moveBCH() {
    // per https://bitcore.io/api/lib/transaction, min fee is 5430 satoshies, 
    // I'm generous so set fee is 6000 satoshis :)
    var fee = 6000;
    var buffer = fs.readFileSync(param1);
    var privateKey = bitcore.PrivateKey.fromString(buffer.toString());
    var fromAddress = privateKey.toAddress('testnet');
    var toAddress = bitcore.Address.fromString(param2.toString());
    insight.getUnspentUtxos(fromAddress, function(error, utxos) {
        var balance = 0;
        for (var i = 0; i < utxos.length; i++) {
        balance +=utxos[i]['satoshis'];
        }
        var sendAmount = balance - fee;
        console.log('current balance:' + balance);                
        console.log('Amount to send:' + sendAmount);
        sendBTC(privateKey, fromAddress, toAddress, sendAmount);
    });
}

function moveSegwitBCH(param1, param2) {
    var buffer = fs.readFileSync(param1);
    var keyPair = bitcoin.ECPair.fromWIF(buffer.toString(), bitcoin.networks.testnet);
    var redeemScript = bitcoin.script.witnessPubKeyHash.output.encode(bitcoin.crypto.hash160(keyPair.getPublicKeyBuffer()))
    var scriptPubKey = bitcoin.script.scriptHash.output.encode(bitcoin.crypto.hash160(redeemScript));
    var address = bitcoin.address.fromOutputScript(scriptPubKey, bitcoin.networks.testnet);
    var fromAddress = bitcore.Address.fromString(address);
    var toAddress = bitcore.Address.fromString(param2.toString());
    var txb = new bitcoin.TransactionBuilder(bitcoin.networks.testnet);
    
    txb.addInput('ac97df66199c5c292943d365a7e8da8020edd0a9648e36789b441f9e6b934088', 1);
    txb.addOutput(toAddress.toString(), 5000);
    txb.sign(0, keyPair, redeemScript, null, 20000);
    txb = txb.build();
    console.log(txb.getId());
    console.log(txb.toHex());

    // test with regtest
    // var keyPair = bitcoin.ECPair.fromWIF('cMahea7zqjxrtgAbB7LSGbcQUr1uX1ojuat9jZodMN87JcbXMTcA', regtest)
    // var pubKey = keyPair.getPublicKeyBuffer()
    // var pubKeyHash = bitcoin.crypto.hash160(pubKey)

    // var redeemScript = bitcoin.script.witnessPubKeyHash.output.encode(pubKeyHash)
    // var redeemScriptHash = bitcoin.crypto.hash160(redeemScript)
    // var scriptPubKey = bitcoin.script.scriptHash.output.encode(redeemScriptHash)
    // var address = bitcoin.address.fromOutputScript(scriptPubKey, regtest)

    // regtestUtils.getUnspent(address, function (err, unspent) {
    //   if (err) console.log(err);
    //   console.log('result: ' + unspent);

    //   var txb = new bitcoin.TransactionBuilder(regtest)
    //   txb.addInput(unspent.txId, unspent.vout)
    //   txb.addOutput(toAddress, 2e4)
    //   txb.sign(0, keyPair, redeemScript, null, unspent.value)
    //   console.log(unspent.txId);
    //   console.log(unspent.vout);
    //   console.log(unspent.value);
    //   var tx = txb.build()
    //   console.log(tx.toHex());
    //   // build and broadcast to the Bitcoin RegTest network
    //   regtestUtils.broadcast(tx.toHex(), function (err) {
    //     if (err) console.log(err);

    //     regtestUtils.verify({
    //       txId: tx.getId(),
    //       address: regtestUtils.RANDOM_ADDRESS,
    //       vout: 0,
    //       value: 2e4
    //     }, function(out) {
    //         console.log(out);
    //     });
    //   })
    // })
}

function sendBTC(signPrivateKey, fromAddress, toAddress, amount) {
    insight.getUnspentUtxos(fromAddress, function(error, utxos) {
        if (error) {
          console.log(error);
        } else {
          var tx = new bitcore.Transaction();
          tx.from(utxos);
          tx.to(toAddress, amount);
          tx.change(fromAddress);
          tx.sign(signPrivateKey);
          tx.serialize();
      
          insight.broadcast(tx, function(error, transactionId) {
            console.log('txid:' + transactionId);
          });
      }
    });
}

function writeFile(fileName, data) {    
    fs.writeFile(fileName, data, function(err) {
        if(err) {
            return console.log(err);
        }
        console.log(fileName + " was saved!");
    }); 
}

// used for testing
function depositSomeBCHForTesting(toAddress) {
    // deposit 0.05BTC for testing
    var privateKeyWIF = 'cQN511BWtc2dSUMWySmZpr6ShY1un4WK42JegGwkSFX5a8n9GWr3';
    var privateKey = bitcore.PrivateKey.fromWIF(privateKeyWIF);
    var sourceAddress = bitcore.Address.fromString('mibK5jk9eP7EkLH175RSPGTLR27zphvvxa');
    insight.getUnspentUtxos(sourceAddress, function(error, utxos) {
        if (error) {
          console.log(error);
        } else {
          var tx = new bitcore.Transaction();
          tx.from(utxos);
          tx.to(toAddress, 10000000);
          tx.change(sourceAddress);
          tx.sign(privateKey);
          tx.serialize();
      
          insight.broadcast(tx, function(error, transactionId) {
           console.log('tx:' + transactionId);
          });
      }
    });
}

