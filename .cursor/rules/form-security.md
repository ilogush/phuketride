---
description: Rule for form actions, security, and rate limiting.
---

# Form Actions & Rate Limiting

- **Intent Pattern**: Every `action` function should use an `intent` field from `formData` to determine the specific operation (e.g., `create`, `update`, `delete`).
- Use `intent` hidden field and `parseWithSchema` for all form actions.
- Call `checkRateLimit` and `getClientIdentifier` for login, register, and all "create" operations.
- Use `trackServerOperation` with appropriate event names for all critical actions.
- Use `quickAudit` to log important system changes (status updates, deletions, etc.).
- **Guard Standard**: Use standard entrypoints (`requireScopedDashboardAccess`, `requireBookingAccess`, etc.) instead of manual role checks.
- **Feedback Standard**: Use `redirectWithRequestSuccess/Error` from `~/lib/route-feedback` for all redirect-based feedback.
- **Toast Coverage**: All user notifications must be shown via `toast` or `urlToast`. Inline error blocks are discouraged for general feedback.
- **Security**: Never expose raw database IDs or internal errors directly to the user; use appropriate error handling and redirection.
