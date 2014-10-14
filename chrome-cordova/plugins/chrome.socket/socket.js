// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var platform = cordova.require('cordova/platform');
var exec = cordova.require('cordova/exec');
var network = require('org.chromium.system.network.system.network');

exports.create = function(socketMode, stuff, callback) {
    if (typeof stuff == 'function') {
        callback = stuff;
        stuff = {};
    }
    var win = callback && function(socketId) {
        var socketInfo = {
            socketId: socketId
        };
        callback(socketInfo);
    };
    exec(win, null, 'ChromeSocket', 'create', [socketMode]);
};

exports.destroy = function(socketId) {
    exec(null, null, 'ChromeSocket', 'destroy', [socketId]);
};


exports.connect = function(socketId, address, port, callback) {
    var win = callback && function() {
        callback(0);
    };
    var fail = callback && function() {
        callback(-1000);
    };
    exec(win, fail, 'ChromeSocket', 'connect', [socketId, address, port]);
};

exports.bind = function(socketId, address, port, callback) {
    var win = callback && function() {
        callback(0);
    };
    var fail = callback && function() {
        callback(-1000);
    };
    exec(win, fail, 'ChromeSocket', 'bind', [socketId, address, port]);
};

exports.disconnect = function(socketId) {
    exec(null, null, 'ChromeSocket', 'disconnect', [socketId]);
};


exports.read = function(socketId, bufferSize, callback) {
    if (typeof bufferSize == 'function') {
        callback = bufferSize;
        bufferSize = 0;
    }
    bufferSize = bufferSize || 0;
    var win = callback && function(data) {
        var readInfo = {
            resultCode: data.byteLength || 1,
            data: data
        };
        callback(readInfo);
    };
    var fail = callback && function() {
        var readInfo = {
            resultCode: 0
        };
        callback(readInfo);
    };
    exec(win, fail, 'ChromeSocket', 'read', [socketId, bufferSize]);
};

exports.write = function(socketId, data, callback) {
    var type = Object.prototype.toString.call(data).slice(8, -1);
    if (type != 'ArrayBuffer') {
        throw new Error('chrome.socket.write - data is not an ArrayBuffer! (Got: ' + type + ')');
    }
    var win = callback && function(bytesWritten) {
        var writeInfo = {
            bytesWritten: bytesWritten
        };
        callback(writeInfo);
    };
    var fail = callback && function() {
        var writeInfo = {
            bytesWritten: 0
        };
        callback(writeInfo);
    };
    exec(win, fail, 'ChromeSocket', 'write', [socketId, data]);
};


exports.recvFrom = function(socketId, bufferSize, callback) {
    if (typeof bufferSize == 'function') {
        callback = bufferSize;
        bufferSize = 0;
    }
    bufferSize = bufferSize || 0;
    var win;
    if (platform.id == 'android') {
        win = callback && (function() {
            var data;
            var call = 0;
            return function(arg) {
                if (call === 0) {
                    data = arg;
                    call++;
                } else {
                    var recvFromInfo = {
                        resultCode: data.byteLength || 1,
                        data: data,
                        address: arg.address,
                        port: arg.port
                    };

                    callback(recvFromInfo);
                }
            };
        })();
    } else {
        win = callback && function(data, address, port) {
            var recvFromInfo = {
                resultCode: data.byteLength || 1,
                data: data,
                address: address,
                port: port
            };
            callback(recvFromInfo);
        };
    }

    var fail = callback && function() {
        var readInfo = {
            resultCode: 0
        };
        callback(readInfo);
    };
    exec(win, fail, 'ChromeSocket', 'recvFrom', [socketId, bufferSize]);
};

exports.sendTo = function(socketId, data, address, port, callback) {
    var type = Object.prototype.toString.call(data).slice(8, -1);
    if (type != 'ArrayBuffer') {
        throw new Error('chrome.socket.write - data is not an ArrayBuffer! (Got: ' + type + ')');
    }
    var win = callback && function(bytesWritten) {
        var writeInfo = {
            bytesWritten: bytesWritten
        };
        callback(writeInfo);
    };
    var fail = callback && function() {
        var writeInfo = {
            bytesWritten: 0
        };
        callback(writeInfo);
    };
    exec(win, fail, 'ChromeSocket', 'sendTo', [{ socketId: socketId, address: address, port: port }, data]);
};


exports.listen = function(socketId, address, port, backlog, callback) {
    if (typeof backlog == 'function') {
        callback = backlog;
        backlog = 0;
    }
    var win = callback && function() {
        callback(0);
    };
    var fail = callback && function() {
        callback(-1000);
    };
    exec(win, fail, 'ChromeSocket', 'listen', [socketId, address, port, backlog]);
};

exports.accept = function(socketId, callback) {
    var win = callback && function(acceptedSocketId) {
        var acceptInfo = {
            resultCode: 0,
            socketId: acceptedSocketId
        };
        callback(acceptInfo);
    };
    var fail = callback && function() {
        var acceptInfo = {
            resultCode: -1000
        };
        callback(acceptInfo);
    };
    exec(win, fail, 'ChromeSocket', 'accept', [socketId]);
};


exports.setKeepAlive = function() {
    console.warn('chrome.socket.setKeepAlive not implemented yet');
};

exports.setNoDelay = function() {
    console.warn('chrome.socket.setNoDelay not implemented yet');
};

exports.getInfo = function(socketId, callback) {
    var win = callback && function(result) {
        result.connected = !!result.connected;
        callback(result);
    };
    exec(win, null, 'ChromeSocket', 'getInfo', [socketId]);
};

exports.getNetworkList = function(callback) {
  network.getNetworkInterfaces(callback);
};

exports.joinGroup = function(socketId, address, callback) {
    var win = callback && function() {
        callback(0);
    };
    var fail = callback && function() {
        callback(-1000);
    };
    exec(win, fail, 'ChromeSocket', 'joinGroup', [socketId, address]);
}

exports.leaveGroup = function(socketId, address, callback) {
    var win = callback && function() {
        callback(0);
    };
    var fail = callback && function() {
        callback(-1000);
    };
    exec(win, fail, 'ChromeSocket', 'leaveGroup', [socketId, address]);
}

exports.setMulticastTimeToLive = function(socketId, ttl, callback) {
    if (platform.id !== 'android') {
        console.warn('chrome.socket.setMulticastTimeToLive not implemented yet');
        return;
    }

    exec(callback, null, 'ChromeSocket', 'setMulticastTimeToLive', [socketId, ttl]);
}

exports.setMulticastLoopbackMode = function(socketId, enabled, callback) {
    if (platform.id !== 'android') {
        console.warn('chrome.socket.setMulticastLoopbackMode not implemented yet');
        return;
    }

    exec(callback, null, 'ChromeSocket', 'setMulticastLoopbackMode', [socketId, enabled]);
}

exports.getJoinedGroups = function(socketId, callback) {
    var win = callback;
    var fail = callback && function() {
        callback(-1000);
    };
    exec(win, fail, 'ChromeSocket', 'getJoinedGroups', [socketId]);
}

/* Converted From chromium/src/net/base/net_error_list.h

var error_map = {};
error_map[-1]   = 'IO_PENDING';
error_map[-2]   = 'FAILED';
error_map[-3]   = 'ABORTED';
error_map[-4]   = 'INVALID_ARGUMENT';
error_map[-5]   = 'INVALID_HANDLE';
error_map[-6]   = 'FILE_NOT_FOUND';
error_map[-7]   = 'TIMED_OUT';
error_map[-8]   = 'FILE_TOO_BIG';
error_map[-9]   = 'UNEXPECTED';
error_map[-10]  = 'ACCESS_DENIED';
error_map[-11]  = 'NOT_IMPLEMENTED';
error_map[-12]  = 'INSUFFICIENT_RESOURCES';
error_map[-13]  = 'OUT_OF_MEMORY';
error_map[-14]  = 'UPLOAD_FILE_CHANGED';
error_map[-15]  = 'SOCKET_NOT_CONNECTED';
error_map[-16]  = 'FILE_EXISTS';
error_map[-17]  = 'FILE_PATH_TOO_LONG';
error_map[-18]  = 'FILE_NO_SPACE';
error_map[-19]  = 'FILE_VIRUS_INFECTED';
error_map[-20]  = 'BLOCKED_BY_CLIENT';
error_map[-21]  = 'NETWORK_CHANGED';
error_map[-22]  = 'BLOCKED_BY_ADMINISTRATOR';
error_map[-100] = 'CONNECTION_CLOSED';
error_map[-101] = 'CONNECTION_RESET';
error_map[-102] = 'CONNECTION_REFUSED';
error_map[-103] = 'CONNECTION_ABORTED';
error_map[-104] = 'CONNECTION_FAILED';
error_map[-105] = 'NAME_NOT_RESOLVED';
error_map[-106] = 'INTERNET_DISCONNECTED';
error_map[-107] = 'SSL_PROTOCOL_ERROR';
error_map[-108] = 'ADDRESS_INVALID';
error_map[-109] = 'ADDRESS_UNREACHABLE';
error_map[-110] = 'SSL_CLIENT_AUTH_CERT_NEEDED';
error_map[-111] = 'TUNNEL_CONNECTION_FAILED';
error_map[-112] = 'NO_SSL_VERSIONS_ENABLED';
error_map[-113] = 'SSL_VERSION_OR_CIPHER_MISMATCH';
error_map[-114] = 'SSL_RENEGOTIATION_REQUESTED';
error_map[-115] = 'PROXY_AUTH_UNSUPPORTED';
error_map[-116] = 'CERT_ERROR_IN_SSL_RENEGOTIATION';
error_map[-117] = 'BAD_SSL_CLIENT_AUTH_CERT';
error_map[-118] = 'CONNECTION_TIMED_OUT';
error_map[-119] = 'HOST_RESOLVER_QUEUE_TOO_LARGE';
error_map[-120] = 'SOCKS_CONNECTION_FAILED';
error_map[-121] = 'SOCKS_CONNECTION_HOST_UNREACHABLE';
error_map[-122] = 'NPN_NEGOTIATION_FAILED';
error_map[-123] = 'SSL_NO_RENEGOTIATION';
error_map[-124] = 'WINSOCK_UNEXPECTED_WRITTEN_BYTES';
error_map[-125] = 'SSL_DECOMPRESSION_FAILURE_ALERT';
error_map[-126] = 'SSL_BAD_RECORD_MAC_ALERT';
error_map[-127] = 'PROXY_AUTH_REQUESTED';
error_map[-128] = 'SSL_UNSAFE_NEGOTIATION';
error_map[-129] = 'SSL_WEAK_SERVER_EPHEMERAL_DH_KEY';
error_map[-130] = 'PROXY_CONNECTION_FAILED';
error_map[-131] = 'MANDATORY_PROXY_CONFIGURATION_FAILED';
error_map[-133] = 'PRECONNECT_MAX_SOCKET_LIMIT';
error_map[-134] = 'SSL_CLIENT_AUTH_PRIVATE_KEY_ACCESS_DENIED';
error_map[-135] = 'SSL_CLIENT_AUTH_CERT_NO_PRIVATE_KEY';
error_map[-136] = 'PROXY_CERTIFICATE_INVALID';
error_map[-137] = 'NAME_RESOLUTION_FAILED';
error_map[-138] = 'NETWORK_ACCESS_DENIED';
error_map[-139] = 'TEMPORARILY_THROTTLED';
error_map[-140] = 'HTTPS_PROXY_TUNNEL_RESPONSE';
error_map[-141] = 'SSL_CLIENT_AUTH_SIGNATURE_FAILED';
error_map[-142] = 'MSG_TOO_BIG';
error_map[-143] = 'SPDY_SESSION_ALREADY_EXISTS';
error_map[-145] = 'WS_PROTOCOL_ERROR';
error_map[-146] = 'PROTOCOL_SWITCHED';
error_map[-147] = 'ADDRESS_IN_USE';
error_map[-148] = 'SSL_HANDSHAKE_NOT_COMPLETED';
error_map[-149] = 'SSL_BAD_PEER_PUBLIC_KEY';
error_map[-150] = 'SSL_PINNED_KEY_NOT_IN_CERT_CHAIN';
error_map[-151] = 'CLIENT_AUTH_CERT_TYPE_UNSUPPORTED';
error_map[-152] = 'ORIGIN_BOUND_CERT_GENERATION_TYPE_MISMATCH';
error_map[-200] = 'CERT_COMMON_NAME_INVALID';
error_map[-201] = 'CERT_DATE_INVALID';
error_map[-202] = 'CERT_AUTHORITY_INVALID';
error_map[-203] = 'CERT_CONTAINS_ERRORS';
error_map[-204] = 'CERT_NO_REVOCATION_MECHANISM';
error_map[-205] = 'CERT_UNABLE_TO_CHECK_REVOCATION';
error_map[-206] = 'CERT_REVOKED';
error_map[-207] = 'CERT_INVALID';
error_map[-208] = 'CERT_WEAK_SIGNATURE_ALGORITHM';
error_map[-210] = 'CERT_NON_UNIQUE_NAME';
error_map[-211] = 'CERT_WEAK_KEY';
error_map[-212] = 'CERT_END';
error_map[-300] = 'INVALID_URL';
error_map[-301] = 'DISALLOWED_URL_SCHEME';
error_map[-302] = 'UNKNOWN_URL_SCHEME';
error_map[-310] = 'TOO_MANY_REDIRECTS';
error_map[-311] = 'UNSAFE_REDIRECT';
error_map[-312] = 'UNSAFE_PORT';
error_map[-320] = 'INVALID_RESPONSE';
error_map[-321] = 'INVALID_CHUNKED_ENCODING';
error_map[-322] = 'METHOD_NOT_SUPPORTED';
error_map[-323] = 'UNEXPECTED_PROXY_AUTH';
error_map[-324] = 'EMPTY_RESPONSE';
error_map[-325] = 'RESPONSE_HEADERS_TOO_BIG';
error_map[-326] = 'PAC_STATUS_NOT_OK';
error_map[-327] = 'PAC_SCRIPT_FAILED';
error_map[-328] = 'REQUEST_RANGE_NOT_SATISFIABLE';
error_map[-329] = 'MALFORMED_IDENTITY';
error_map[-330] = 'CONTENT_DECODING_FAILED';
error_map[-331] = 'NETWORK_IO_SUSPENDED';
error_map[-332] = 'SYN_REPLY_NOT_RECEIVED';
error_map[-333] = 'ENCODING_CONVERSION_FAILED';
error_map[-334] = 'UNRECOGNIZED_FTP_DIRECTORY_LISTING_FORMAT';
error_map[-335] = 'INVALID_SPDY_STREAM';
error_map[-336] = 'NO_SUPPORTED_PROXIES';
error_map[-337] = 'SPDY_PROTOCOL_ERROR';
error_map[-338] = 'INVALID_AUTH_CREDENTIALS';
error_map[-339] = 'UNSUPPORTED_AUTH_SCHEME';
error_map[-340] = 'ENCODING_DETECTION_FAILED';
error_map[-341] = 'MISSING_AUTH_CREDENTIALS';
error_map[-342] = 'UNEXPECTED_SECURITY_LIBRARY_STATUS';
error_map[-343] = 'MISCONFIGURED_AUTH_ENVIRONMENT';
error_map[-344] = 'UNDOCUMENTED_SECURITY_LIBRARY_STATUS';
error_map[-345] = 'RESPONSE_BODY_TOO_BIG_TO_DRAIN';
error_map[-346] = 'RESPONSE_HEADERS_MULTIPLE_CONTENT_LENGTH';
error_map[-347] = 'INCOMPLETE_SPDY_HEADERS';
error_map[-348] = 'PAC_NOT_IN_DHCP';
error_map[-349] = 'RESPONSE_HEADERS_MULTIPLE_CONTENT_DISPOSITION';
error_map[-350] = 'RESPONSE_HEADERS_MULTIPLE_LOCATION';
error_map[-351] = 'SPDY_SERVER_REFUSED_STREAM';
error_map[-352] = 'SPDY_PING_FAILED';
error_map[-353] = 'PIPELINE_EVICTION';
error_map[-354] = 'CONTENT_LENGTH_MISMATCH';
error_map[-355] = 'INCOMPLETE_CHUNKED_ENCODING';
error_map[-356] = 'QUIC_PROTOCOL_ERROR';
error_map[-400] = 'CACHE_MISS';
error_map[-401] = 'CACHE_READ_FAILURE';
error_map[-402] = 'CACHE_WRITE_FAILURE';
error_map[-403] = 'CACHE_OPERATION_NOT_SUPPORTED';
error_map[-404] = 'CACHE_OPEN_FAILURE';
error_map[-405] = 'CACHE_CREATE_FAILURE';
error_map[-406] = 'CACHE_RACE';
error_map[-501] = 'INSECURE_RESPONSE';
error_map[-502] = 'NO_PRIVATE_KEY_FOR_CERT';
error_map[-503] = 'ADD_USER_CERT_FAILED';
error_map[-601] = 'FTP_FAILED';
error_map[-602] = 'FTP_SERVICE_UNAVAILABLE';
error_map[-603] = 'FTP_TRANSFER_ABORTED';
error_map[-604] = 'FTP_FILE_BUSY';
error_map[-605] = 'FTP_SYNTAX_ERROR';
error_map[-606] = 'FTP_COMMAND_NOT_SUPPORTED';
error_map[-607] = 'FTP_BAD_COMMAND_SEQUENCE';
error_map[-701] = 'PKCS12_IMPORT_BAD_PASSWORD';
error_map[-702] = 'PKCS12_IMPORT_FAILED';
error_map[-703] = 'IMPORT_CA_CERT_NOT_CA';
error_map[-704] = 'IMPORT_CERT_ALREADY_EXISTS';
error_map[-705] = 'IMPORT_CA_CERT_FAILED';
error_map[-706] = 'IMPORT_SERVER_CERT_FAILED';
error_map[-707] = 'PKCS12_IMPORT_INVALID_MAC';
error_map[-708] = 'PKCS12_IMPORT_INVALID_FILE';
error_map[-709] = 'PKCS12_IMPORT_UNSUPPORTED';
error_map[-710] = 'KEY_GENERATION_FAILED';
error_map[-711] = 'ORIGIN_BOUND_CERT_GENERATION_FAILED';
error_map[-712] = 'PRIVATE_KEY_EXPORT_FAILED';
error_map[-800] = 'DNS_MALFORMED_RESPONSE';
error_map[-801] = 'DNS_SERVER_REQUIRES_TCP';
error_map[-802] = 'DNS_SERVER_FAILED';
error_map[-803] = 'DNS_TIMED_OUT';
error_map[-804] = 'DNS_CACHE_MISS';
error_map[-805] = 'DNS_SEARCH_EMPTY';
error_map[-806] = 'DNS_SORT_ERROR';

*/
