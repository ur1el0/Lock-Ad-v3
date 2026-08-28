# 1. Session-Based Authentication vs. Stateless JWTs

**Date:** 2026-08-28
**Status:** Accepted

## Context
Lock-Ad-v3 is a security and incident reporting platform, meaning user data integrity is paramount. Modern Single-Page Applications (SPAs) built with React often default to using JSON Web Tokens (JWTs) for authentication, storing these tokens inside the browser's `localStorage`. 

However, `localStorage` is directly accessible via JavaScript. If our application ever suffers from a Cross-Site Scripting (XSS) vulnerability (e.g., a malicious user injects a script into an incident report description), the attacker can easily extract the JWT and impersonate the user indefinitely until the token expires. 

## Decision
We will reject the standard JWT-in-localStorage pattern. Instead, we will use **Django's native Session Authentication**, storing the session ID inside an `HttpOnly` cookie. We will pair this with a strict CSRF (Cross-Site Request Forgery) token handshake.

## Consequences
### Positive
* **XSS Immunity:** Because the session cookie is marked as `HttpOnly`, malicious JavaScript cannot read or extract the session token.
* **Immediate Revocation:** Unlike stateless JWTs, server-side sessions can be instantly destroyed by the backend during a logout or security event.
* **Simplicity:** We leverage Django's battle-tested security middleware rather than building complex token-rotation logic.

### Negative
* **CSRF Overhead:** The frontend must manage and attach an `X-CSRFToken` header to every state-changing request (POST, PUT, DELETE).
* **Coupling:** The frontend and backend must operate on the same domain/subdomain (or use a development proxy) to ensure the browser securely attaches the cookies.