(function(){

var C = (typeof window === 'undefined') ? require('./Crypto').Crypto : window.Crypto;

// Shortcut
var util = C.util;

// Convert n to unsigned 32-bit integer
util.u32 = function (n) {
	return n >>> 0;
};

// Unsigned 32-bit addition
util.add = function () {
	var result = this.u32(arguments[0]);
	for (var i = 1; i < arguments.length; i++)
		result = this.u32(result + this.u32(arguments[i]));
	return result;
};

// Unsigned 32-bit multiplication
util.mult = function (m, n) {
	return this.add((n & 0xFFFF0000) * m,
			(n & 0x0000FFFF) * m);
};

// Unsigned 32-bit greater than (>) comparison
util.gt = function (m, n) {
	return this.u32(m) > this.u32(n);
};

// Unsigned 32-bit less than (<) comparison
util.lt = function (m, n) {
	return this.u32(m) < this.u32(n);
};

})();
