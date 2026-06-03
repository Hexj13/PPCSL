# Frontend API error handling

## Global axios interceptor

`lib/api/api-client.ts` shows a toast for most failed requests and may redirect on `401`. Call sites that handle errors locally must opt out.

## `X-Skip-Error-Handling`

Send this request header to skip the global toast (and related side effects) for that call:

```ts
await apiClient.get('/path', {
  headers: { 'X-Skip-Error-Handling': 'true' },
});
```

Use when:

- The page or hook maps `errorKey` / `message` to field errors or inline UI
- A background poll should fail quietly
- Auth refresh / `me` probes that must not spam the user
- Google Sign-In on `/sign` (`authApi.googleSignIn` / `useGoogleAuth`) — one localized toast from the hook

Do **not** use it to hide errors the user should always see unless the caller shows an alternative.

## `X-Skip-Auth-Redirect` / `X-Skip-Auth-Refresh`

Separate headers for auth refresh and redirect behavior. See `api-client.ts` and `api-client.test.ts`.

## Page-level toasts

For generic failures after local handling, prefer `useApiErrorToast()` from `hooks/useApiErrorToast.ts` so copy stays consistent with `common.error`.
