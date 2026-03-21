# Architecture Decision Records

## Schema Mapper for CSV Import

**Date:** January 2026
**Status:** Deferred - Not needed yet
**Trigger:** Implement when importing from a second bank with different column names

### Context

The current CSV import (`src/lib/csvImport.ts`) works with a specific format:
- **Required columns:** date, merchant, amount
- **Optional columns:** category, tags, notes

### Problem a Schema Mapper Would Solve

- Different column names: `Description` vs `Merchant` vs `Payee`
- Split amounts: `Debit` + `Credit` columns instead of single `Amount`
- Varying date columns: `Transaction Date` vs `Post Date`
- Extra columns to ignore: Reference numbers, balances

### Recommended Implementation (When Ready)

#### 1. Bank Presets (`src/lib/bankPresets.ts`)

```typescript
export const bankPresets = {
  chase: {
    date: 'Transaction Date',
    merchant: 'Description',
    amount: 'Amount',
  },
  bofa: {
    date: 'Date',
    merchant: 'Payee',
    debit: 'Debit',
    credit: 'Credit',
  },
  // Add as needed
}
```

#### 2. Enhanced CSV Parser

- Detect headers on upload
- Match against presets or show mapping UI
- Handle debit/credit column merging

#### 3. UI Flow

1. User uploads CSV
2. System detects format or shows "Select your bank" dropdown
3. Preview mapped transactions
4. Confirm import

### Effort Estimate

- Bank presets only: ~2 hours
- Full UI mapper: ~1 day

### Decision

Current CSV import is sufficient for Phase 1. Revisit when multi-bank support is needed.
