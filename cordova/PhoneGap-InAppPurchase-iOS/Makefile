lint: check-jshint
	@jshint *.js

run-test:
	@./test/run.sh cc.fovea.babygoo babygooinapp1

all: lint run-test
	@echo 'ok'

check-jshint:
	@which jshint > /dev/null || ( echo 'Please Install JSHint, npm install -g jshint'; exit 1 )

clean:
	@find . -name '*~' -exec rm '{}' ';'
