# cordova-plugin-url-policy

This plugin implements a whitelist policy for navigating the application webview on Cordova 4.0

## Supported Cordova Platforms

* Android 4.0.0 or above

## Navigation Whitelist
Controls which URLs the WebView itself can be navigated to. Applies to
top-level navigations only.

Quirks: on Android it also applies to iframes for non-http(s) schemes.

By default, navigations only to `file://` URLs, are allowed. To allow other
other URLs, you must add `<allow-navigation>` tags to your `config.xml`:

    <!-- Allow links to example.com -->
    <allow-navigation href="http://example.com/*" />

    <!-- Wildcards are allowed for the protocol, as a prefix
         to the host, or as a suffix to the path -->
    <allow-havigation href="*://*.example.com/*" />

    <!-- A wildcard can be used to whitelist the entire network,
         over HTTP and HTTPS.
         *NOT RECOMMENDED* -->
    <allow-navigation href="*" />

    <!-- The above is equivalent to these three declarations -->
    <allow-navigation href="http://*/*" />
    <allow-navigation href="https://*/*" />
    <allow-navigation href="data:*" />

## Intent Whitelist
Controls which URLs the app is allowed to ask the system to open.
By default, no external URLs are allowed.

On Android, this equates to sending an intent of type BROWSEABLE.

This whitelist does not apply to plugins, only hyperlinks and calls to `window.open()`.

In `config.xml`, add `<allow-intent>` tags, like this:

    <!-- Allow links to example.com to open in a browser -->
    <allow-intent href="http://example.com/*" />

    <!-- Wildcards are allowed for the protocol, as a prefix
         to the host, or as a suffix to the path -->
    <allow-intent href="*://*.example.com/*" />

    <!-- Allow SMS links to open messaging app -->
    <allow-intent href="sms:*" />

    <!-- Allow tel: links to open the dialer -->
    <allow-intent href="tel:*" />

    <!-- Allow geo: links to open maps -->
    <allow-intent href="geo:*" />

    <!-- Allow all unrecognized URLs to open installed apps
         *NOT RECOMMENDED* -->
    <allow-intent href="*" />

## Network Request Whitelist
Controls which network requests (images, XHRs, etc) are allowed to be made.

Note: Please use a Content Security Policy (see below) instead (or also), since it is more secure.  This whitelist is mostly historical for webviews which do not support CSP.

By default, only requests to `file://` URLs are allowed.

In `config.xml`, add `<access>` tags, like this:

    <!-- Allow images, xhrs, etc. to google.com -->
    <access origin="http://google.com" />
    <access origin="https://google.com" />

    <!-- Access to the subdomain maps.google.com -->
    <access origin="http://maps.google.com" />

    <!-- Access to all the subdomains on google.com -->
    <access origin="http://*.google.com" />

    <!-- Enable requests to content: URLs -->
    <access origin="content:///*" />

    <!-- Don't block any requests -->
    <access origin="*" />

### Content Security Policy
On Android and iOS, the network whitelist is not able to filter all types of requests (e.g.
`<video>` & WebSockets are not blocked). So, in addition to the whitelist,
you should use a [Content Security Policy](http://content-security-policy.com/) `<meta>` tag
on all of your pages.

On Android, support for CSP within the system webview starts with KitKat.

Here are some example CSP declarations for your `.html` pages:

    <!-- Allow requests to foo.com -->
    <meta http-equiv="Content-Security-Policy" content="default-src 'self' foo.com"/>

    <!-- Enable all requests, inline styles, and eval() -->
    <meta http-equiv="Content-Security-Policy" content="default-src *; style-src 'self' 'unsafe-inline'; script-src: 'self' 'unsafe-inline' 'unsafe-eval' "/>

    <!-- Allow XHRs via https only -->
    <meta http-equiv="Content-Security-Policy" content="default-src 'self' https:"/>

    <!-- Allow data: URLs within iframes -->
    <!-- Note: You would also need an <allow-navigation href="data:*" /> in your config.xml -->
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; frame-src 'self' data:"/>
