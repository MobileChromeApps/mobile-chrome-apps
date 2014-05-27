var chai = require('chai');

//console.log(chai.should);
//console.log(chai.expect);
//console.log(chai.assert);

describe('Array', function(){
  before(function(){
  });

  describe('#indexOf()', function(){
    it('should return -1 when not present', function(){
      [1,2,3].indexOf(4).should.equal(-1);
    });
  });
});
