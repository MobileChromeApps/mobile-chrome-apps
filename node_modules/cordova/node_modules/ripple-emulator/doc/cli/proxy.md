# Synopsis

    ripple proxy [--port xxxx] [--route xxxx]

# Description

    A proxy server that can be used to support cross origin XMLHttpRequest calls (via CORS or JSONP).

# Arguments

* --port   the port to host the application on
* --route  specify an optional path to prefix proxy routes with (ex: http://localhost:port/prefix/xhr_proxy)

# Example usage

    ripple proxy --port 1234
