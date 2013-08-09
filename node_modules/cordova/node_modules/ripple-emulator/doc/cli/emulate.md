# Synopsis

    ripple emulate [--port xxxx] [--path xxxx] [--remote xxxx] [--route xxxx]

# Description

    Boot a ripple server instance to test your application on. This will
    do various things, such as statically host your app, and bind any
    ripple services (xhr proxy, etc) to a specific route (see --route).

# Arguments

* --port    the port to host the application on (defaults to 4400)
* --path    app path to statically serve for testing (if omitted, the current working directory will be used)
* --remote  instead of a (local) --path, you can specify a remote website to load (via proxy) and emulate
* --route   specify the URL path on which ripple services will run (defaults to '/ripple') example: http://localhost:1234/ripple/xhr_proxy

# Example usage

    ripple emulate --port 1234 --path path/to/my/application/root

    ripple emulate --remote http://google.com
