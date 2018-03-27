#!/usr/bin/env node
var bitcore = require('bitcore-lib');
var program = require('commander');
var Insight = require("bitcore-explorers").Insight;
var insight = new Insight('testnet');
var fs = require('fs');

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
        generateSegwit(paramValue1);
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

function generateSegwit(fileName) {

    if (typeof fileName === 'undefined') {
        console.error('No fileName param found');
        return;
    }

    console.log('Generate Segwit...(P2SH) Address');
    var privateKeys = [];
    var privateKeysStore = [];
    for (var i=0; i < 2; i++) {
        var randBuffer = bitcore.crypto.Random.getRandomBuffer(32);
        var randNumer = bitcore.crypto.BN.fromBuffer(randBuffer);
        var key = bitcore.PrivateKey(randNumer);
        privateKeys.push(key);
        privateKeysStore.push(key.toString());
    }
    writeFile(fileName + '.priv', privateKeysStore.join(','));
    var publicKeys = privateKeys.map(bitcore.PublicKey);
    var address = new bitcore.Address(publicKeys, 2, 'testnet'); // 2 of 2
    console.log('=========== Segwit address: ============');
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
    console.log('=========== Non-Segwit address: ============');
    console.log(address);
}

/// param1: private key file name of from address
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
    var fee = 6000;
    var buffer = fs.readFileSync(param1);
    var privateKeys = [];
    // restore address from private keys
    var keys = buffer.toString().split(",");
    keys.forEach(function(e) {
        privateKeys.push(bitcore.PrivateKey.fromString(e.toString()));
    })

    var publicKeys = privateKeys.map(bitcore.PublicKey);
    var fromAddress = new bitcore.Address(publicKeys, 2, 'testnet');
    var toAddress = bitcore.Address.fromString(param2.toString());
    insight.getUnspentUtxos(fromAddress, function(error, utxos) {
        var balance = 0;
        for (var i = 0; i < utxos.length; i++) {
            balance +=utxos[i]['satoshis'];
        }
        var sendAmount = balance - fee;
        console.log('current balance:' + balance);                
        console.log('Amount to send:' + sendAmount);
        
        var tx = new bitcore.Transaction();
            tx.from(utxos, publicKeys, 2);
            tx.to(toAddress, sendAmount)
            tx.sign(privateKeys);
            tx.serialize();
        insight.broadcast(tx, function(error, transactionId) {
            console.log('txID: ' + transactionId);
        });
    });
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
