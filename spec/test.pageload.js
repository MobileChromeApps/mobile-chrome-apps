
chromeSpec(function(runningInBackground) {
  if (!runningInBackground) {
    describe('page loading', function() {
      // Attributes are stripped off of the head tag in desktop Chrome, so don't test that.
      it('should maintain attributes on html tag', function() {
        expect(document.documentElement.getAttribute('testattr')).toBe('foo');
      });
      it('should maintain attributes on body tag', function() {
        expect(document.body.getAttribute('testattr')).toBe('foo');
      });
      it('should include dont-forget1 in the head.', function() {
        var n = document.getElementById('dont-forget1');
        expect(n.parentNode).toBe(document.querySelector('head'));
      });
      it('should include dont-forget2 in the head.', function() {
        var n = document.getElementById('dont-forget2');
        expect(n.parentNode).toBe(document.querySelector('head'));
      });
      it('should include dont-forget3 in the body.', function() {
        var n = document.getElementById('dont-forget3');
        expect(n.parentNode).toBe(document.body);
      });
    });
  }
});
