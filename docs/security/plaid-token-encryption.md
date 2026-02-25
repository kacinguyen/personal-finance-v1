# Plaid Access Token Encryption

## Date: 2026-02-24

## Problem

The `plaid_access_token` column in the `plaid_items` table stores Plaid access tokens as **plaintext**. These tokens grant full read access to linked bank accounts (balances, transactions, account details). If the database is ever compromised — through a SQL injection, leaked backup, unauthorized Supabase dashboard access, or a supply chain attack — an attacker could use these tokens to access every connected user's bank data via the Plaid API.

The original migration (`021_create_accounts_tables.sql`) included a comment:
```sql
plaid_access_token TEXT, -- encrypt via Vault in prod
```
This was never implemented.

## Prior Mitigations (already applied)

Before this encryption work, the following security measures were applied in the same session:

1. **Column-level RLS** (`037_secure_plaid_access_tokens.sql`):
   - `REVOKE SELECT (plaid_access_token) FROM authenticated, anon`
   - Only `service_role` (used by Edge Functions) can read the column
   - This prevents any client-side Supabase query from accessing the token

2. **CORS restricted** to specific Vercel domains (no more `Access-Control-Allow-Origin: *`)

3. **Error responses sanitized** — internal error details logged server-side only

4. **Re-auth access token validated** — ownership check added before passing tokens to Plaid

These mitigations protect against client-side access, but the token remains **plaintext at rest** in PostgreSQL.

## Solution: pgcrypto Symmetric Encryption

### Why pgcrypto (not Supabase Vault)?

- **pgcrypto** is simpler: encrypt/decrypt happen in SQL functions, no additional tables or lifecycle management
- **Supabase Vault** stores secrets in a separate `vault.secrets` table with more complex lifecycle management — better for rotating secrets, but overkill for long-lived Plaid access tokens
- pgcrypto's `pgp_sym_encrypt`/`pgp_sym_decrypt` use AES-256, which is industry standard
- The encryption key is managed via Supabase secrets (`PLAID_ENCRYPTION_KEY` env var) — it never touches the database, migration files, or git history

### Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────┐
│  Edge Function   │────>│  RPC Function (SQL)   │────>│  plaid_items │
│  (Deno)          │     │  SECURITY DEFINER     │     │  (BYTEA col) │
│                  │     │                       │     │              │
│  Passes key from │     │  pgp_sym_encrypt()    │     │  Encrypted   │
│  Deno.env        │     │  pgp_sym_decrypt()    │     │  at rest     │
└─────────────────┘     └──────────────────────┘     └─────────────┘
```

- Edge Functions pass the encryption key as an RPC parameter
- SECURITY DEFINER SQL functions run as the function owner (postgres), not the caller
- Functions are REVOKEd from `anon`/`authenticated` — only `service_role` can call them
- The key travels from Deno env → RPC parameter over localhost (Edge Functions run on Supabase infra)

### Two-Phase Migration Strategy

**Why two phases?** The encryption key cannot be embedded in migration SQL (it would be in git history). Instead:

1. **Phase 1** — Add encrypted column alongside plaintext column. Deploy updated Edge Functions that write to encrypted column and read from either (CASE fallback). Run a backfill Edge Function to encrypt existing tokens.

2. **Phase 2** — After verifying all tokens are encrypted, drop the plaintext column and simplify the RPC functions.

This ensures zero downtime and the key never appears in migration files.

## Implementation Details

### New SQL Functions (Migration 038)

| Function | Purpose | Called By |
|----------|---------|-----------|
| `insert_plaid_item(...)` | Encrypts token on INSERT | plaid-exchange-token |
| `get_plaid_access_token(...)` | Decrypts token + returns metadata | plaid-sync-accounts, plaid-sync-transactions |
| `verify_plaid_item_ownership(...)` | Ownership check for re-auth | plaid-create-link-token |
| `backfill_encrypt_plaid_token(...)` | One-row backfill helper | plaid-backfill-encryption (temporary) |

### Edge Function Changes

| Function | Change |
|----------|--------|
| `plaid-exchange-token` | Direct INSERT → `insertPlaidItem()` RPC |
| `plaid-sync-accounts` | Direct SELECT → `getPlaidAccessToken()` RPC |
| `plaid-sync-transactions` | Direct SELECT → `getPlaidAccessToken()` RPC |
| `plaid-create-link-token` | Direct SELECT → `verifyPlaidItemOwnership()` RPC |

### Bug Fix: Re-auth Flow

During this work, a bug was discovered in `plaid-create-link-token`:
- The frontend (`AccountGroupCard.tsx:93`) passes `plaid_item_id` as the `accessToken` prop
- The edge function was querying `.eq('plaid_access_token', accessToken)` — comparing a Plaid item ID against the access token column
- This would never match, making re-auth silently broken

**Fix:** The edge function now accepts `plaid_item_id` in the request body and uses the `verify_plaid_item_ownership()` RPC to look up by item ID with user ownership verification. The frontend prop is renamed from `accessToken` to `plaidItemId` for clarity.

### Shared Helper: `_shared/crypto.ts`

New shared module providing a clean TypeScript interface over the RPC functions:
- `insertPlaidItem()` — encrypt + insert
- `getPlaidAccessToken()` — decrypt + return
- `verifyPlaidItemOwnership()` — ownership check + decrypt
- `backfillEncryptToken()` — one-row backfill

All functions validate `PLAID_ENCRYPTION_KEY` is present and throw early if missing.

## Deployment Sequence

1. Generate encryption key: `openssl rand -base64 32`
2. Set Supabase secret: `supabase secrets set PLAID_ENCRYPTION_KEY="<key>"`
3. Push migration 038: `npx supabase db push`
4. Deploy all Edge Functions: `supabase functions deploy`
5. Run backfill: invoke `plaid-backfill-encryption` Edge Function
6. Verify backfill: `SELECT count(*) FROM plaid_items WHERE plaid_access_token IS NOT NULL AND plaid_access_token_encrypted IS NULL;` → 0
7. Push migration 039: `npx supabase db push`
8. Delete `plaid-backfill-encryption` Edge Function

## Security Properties

| Property | Status |
|----------|--------|
| Token encrypted at rest | Yes (AES-256 via pgcrypto) |
| Key in git/migrations | No (Supabase secret only) |
| Key in database | No (passed as RPC parameter, never stored) |
| Client access to token | Blocked (column-level REVOKE + RPC REVOKE) |
| Client access to RPC | Blocked (REVOKEd from anon/authenticated) |
| Decryption without key | Not possible (AES-256) |
| Key rotation | Generate new key, re-encrypt all tokens, update secret |

## Files Changed

### Created
- `supabase/migrations/038_encrypt_plaid_access_tokens.sql`
- `supabase/migrations/039_drop_plaintext_plaid_token.sql`
- `supabase/functions/_shared/crypto.ts`
- `supabase/functions/plaid-backfill-encryption/index.ts`

### Modified
- `supabase/functions/plaid-exchange-token/index.ts`
- `supabase/functions/plaid-sync-accounts/index.ts`
- `supabase/functions/plaid-sync-transactions/index.ts`
- `supabase/functions/plaid-create-link-token/index.ts`
- `src/hooks/usePlaidLink.ts`
- `src/components/common/PlaidLinkButton.tsx`
- `src/components/accounts/AccountGroupCard.tsx`
