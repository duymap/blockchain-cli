# blockchain-cli
- Blockchain command line test
- This work well with nodejs verion 4.2.2

# Install
```
sudo npm install
```

If above installation does not work , please try the following:
```
sudo npm install bitcore-lib --save
sudo npm install bitcore-explorers --save
```

Then install the command to use:
```
sudo npm install -g
```

# Usage
```
blockchain generate-segwit <filename>
```
E.g: blockchain generate-segwit A, it will generate segwit bitcoin address (P2SH) store private key into A.priv file.

```
blockchain generate-bch <filename>
```
E.g: blockchain generate-bch B, it will generate non-segwit bitcoin address store private key into B.priv file.

```
blockchain move-bch <filename>.priv <toAddress>
```
> *toAddress*: segwit address string
> *filename*.priv: file store private key of non-sewgit address
This used to transfer all btc from non-segwit address to segwit address, the amount sent is (balance - fee)

```
blockchain move-segwit-bch <filename>.priv <toAddress>
```
*toAddress*: non-segwit address string
*filename*.priv: file store private key of sewgit address
This used to transfer all btc from segwit address to non-segwit address, the amount sent is (balance - fee)
