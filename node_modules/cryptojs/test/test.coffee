Crypto = (require '../cryptojs').Crypto
key = '12345678'
us = 'Hello, 世界!'

mode = new Crypto.mode.ECB Crypto.pad.pkcs7

console.log "ub = #{ub = Crypto.charenc.UTF8.stringToBytes us}"
console.log "eb = #{eb = Crypto.DES.encrypt ub, key, {asBytes: true, mode: mode}}"
console.log "ehs= #{ehs= Crypto.util.bytesToHex eb}"

console.log "eb2= #{eb2= Crypto.util.hexToBytes ehs}"
console.log "ub2= #{ub2= Crypto.DES.decrypt eb2, key, {asBytes: true, mode: mode}}"
console.log "us2= #{us2= Crypto.charenc.UTF8.bytesToString ub2}"
