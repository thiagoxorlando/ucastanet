// Compatibility route — Asaas is configured to POST to /api/asaas/webhook.
// Re-exports the canonical handler from /api/webhooks/asaas so both URLs
// process the webhook directly with no redirect.
export { POST } from "../../webhooks/asaas/route";
