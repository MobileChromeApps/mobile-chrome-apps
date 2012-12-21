expect().not.*
expect().toBeDefined();
expect().toBeUndefined();
expect().toBeNull();
expect().toBeTruthy();
expect().toBeFalsy();
expect().toContain(); --> array 'any'
expect().toBeLessThan();
expect().toBeGreaterThan();
expect().toBeCloseTo();
expect().toThrow();
expect().toBe(); --> ===
expect().toEqual(); --> ==
expect().toMatch(/regex/);

xdescribe -> x implies disabled
xit -> x implies disabled

beforeEach(function() { --> inside describe blocks
});
afterEach(function() {
});

spyOn(foo, 'setBar') --> by default, track if spy called, but do nothing
spy.andCallThrough()
spy.andReturn(val)
spy.andCallFake(func)
jasmine.createSpy(name) --> when there is nothing to spy on, and you need a stub
jasmine.createSpyObj(...)
expect(method).toHaveBeenCalled()
expect(method).toHaveBeenCalledWith(args)
method.calls --> array
method.mostRecentCall --> method.calls[method.calls.length-1]
call.args

jasmine.any() --> Number, Object, Function, etc. Values match if constructors same, used with equality checks

can mock js clock..

async calls:
runs, waitFor, runs --> runs for async call setup, waitFor condition, last runs to test expectations
