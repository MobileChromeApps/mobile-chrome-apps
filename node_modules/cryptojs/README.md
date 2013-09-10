cryptojs
--------

* with little modification, converted from googlecode project [crypto-js](http://code.google.com/p/crypto-js/), and keep the source code structure of the origin project on googlecode
* source code worked in both browser engines and node scripts. see also: [https://github.com/gwjjeff/crypto-js-npm-conv](https://github.com/gwjjeff/crypto-js-npm-conv)
* inspiration comes from [ezcrypto](https://github.com/ElmerZhang/ezcrypto), but my tests cannot pass with his version ( ECB/pkcs7 mode ), so I made it myself

### install

<pre>
npm install cryptojs
</pre>

### usage (example with [coffee-script](http://coffeescript.org/))

<pre>
Crypto = (require 'cryptojs').Crypto
key = '12345678'
us = 'Hello, 世界!'

mode = new Crypto.mode.ECB Crypto.pad.pkcs7

ub = Crypto.charenc.UTF8.stringToBytes us
eb = Crypto.DES.encrypt ub, key, {asBytes: true, mode: mode}
ehs= Crypto.util.bytesToHex eb

eb2= Crypto.util.hexToBytes ehs
ub2= Crypto.DES.decrypt eb2, key, {asBytes: true, mode: mode}
us2= Crypto.charenc.UTF8.bytesToString ub2
# should be same as the var 'us'
console .log us2
</pre>
