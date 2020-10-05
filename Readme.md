# Contributing to this Repository

Thank you for your interest in contributing!

Send us your patches early and often and in whatever shape or form (even before you cover these next points).

## Legal

Unfortunately there are some legal hurdles. Sorry about that.

This repository is a Google open source project, and so we require contributors to sign Google's open source Contributor License Agreement.
It's easy to do, just click here to sign as an [individual](https://developers.google.com/open-source/cla/individual) or [corporation](https://developers.google.com/open-source/cla/corporate).
Individuals can sign electronically in seconds (see the bottom of the page); corporations will need to email a PDF, or mail.

We cannot accept PRs or patches larger than fixing typos and the like without a signed CLA.

If your Github account doesn't show the name you used to sign, please mention your name in your PR.

## Testing

If you would like to test your patch against our test suite (thats always nice), its as simple as `cca create ChromeSpec --link-to=spec`;   Then, run `ChromeSpec` on target devices just as any other cca app.

Make sure you use the `cca` that actually has your edits, and see if there are any (new) test failures.

Bonus points if you update our tests to cover your patch as well.
