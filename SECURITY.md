# Security Policy

## Supported versions

Only the latest commit on `main` (and the live site built from it) receives fixes.

## Reporting a vulnerability

Please do not open a public issue for security problems.

Report privately through GitHub:
[Security → Report a vulnerability](https://github.com/batuhanmeral/cinema-archive/security/advisories/new).

Include the affected URL or commit, the steps to reproduce, and what you expected to
happen. Remove real credentials and personal data from the report.

You can expect an acknowledgement within 7 days. Confirmed issues are fixed on `main`
and credited in the advisory unless you prefer otherwise.

## Scope

In scope: XSS, authentication or authorization bypass, secrets or personal data in
responses, logs or build artefacts, and injection in any user-controlled input.

Out of scope: denial of service by traffic volume, findings that require a modified
deployment, and missing headers on third-party domains.
