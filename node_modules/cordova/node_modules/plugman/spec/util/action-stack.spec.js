var action_stack = require('../../src/util/action-stack'),
    ios = require('../../src/platforms/ios');

describe('action-stack', function() {
    var stack;
    beforeEach(function() {
        stack = new action_stack();
    });
    describe('processing of actions', function() {
        it('should process actions one at a time until all are done', function() {
            var first_spy = jasmine.createSpy();
            var first_args = [1];
            var second_spy = jasmine.createSpy();
            var second_args = [2];
            var third_spy = jasmine.createSpy();
            var third_args = [3];
            stack.push(stack.createAction(first_spy, first_args, function(){}, []));
            stack.push(stack.createAction(second_spy, second_args, function(){}, []));
            stack.push(stack.createAction(third_spy, third_args, function(){}, []));
            stack.process('android', 'blah');
            expect(first_spy).toHaveBeenCalledWith(first_args[0]);
            expect(second_spy).toHaveBeenCalledWith(second_args[0]);
            expect(third_spy).toHaveBeenCalledWith(third_args[0]);
        });
        it('should revert processed actions if an exception occurs', function() {
            spyOn(console, 'log');
            var first_spy = jasmine.createSpy();
            var first_args = [1];
            var first_reverter = jasmine.createSpy();
            var first_reverter_args = [true];
            var process_err = 'quit peein\' on my rug, man.';
            var second_spy = jasmine.createSpy().andCallFake(function() {
                throw new Error(process_err);
            });
            var second_args = [2];
            var third_spy = jasmine.createSpy();
            var third_args = [3];
            stack.push(stack.createAction(first_spy, first_args, first_reverter, first_reverter_args));
            stack.push(stack.createAction(second_spy, second_args, function(){}, []));
            stack.push(stack.createAction(third_spy, third_args, function(){}, []));
            // process should throw
            expect(function() {
                stack.process('android', 'blah');
            }).toThrow('Uh oh!\n' + process_err);
            // first two actions should have been called, but not the third
            expect(first_spy).toHaveBeenCalledWith(first_args[0]);
            expect(second_spy).toHaveBeenCalledWith(second_args[0]);
            expect(third_spy).not.toHaveBeenCalledWith(third_args[0]);
            // first reverter should have been called after second action exploded
            expect(first_reverter).toHaveBeenCalledWith(first_reverter_args[0]);
        });
    });
});
