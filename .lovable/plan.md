

# Fix: Missing Commission Triggers + paid_by_university Status

## Root Cause

The database function `create_commission_snapshot()` exists, but the **trigger `trg_commission_snapshot` was never created** on the `enrollments` table. The migration likely partially failed — tables and function were created, but the `CREATE TRIGGER` statements at the end did not execute. This means:

1. Changing `funding_status` to `approved` does **not** create a commission snapshot
2. Changing `status` to `paid_by_university` does **not** update snapshot status
3. No audit triggers exist on `commission_snapshots` or `commission_payments`
4. Consequently, nothing shows on the Commissions page, Agent dashboard, or Admin dashboard

## Fix Plan

### Step 1: New Migration — Recreate Missing Triggers

Create a migration that:
- Creates `trg_commission_snapshot` on `enrollments` (with `IF NOT EXISTS` pattern using `DROP TRIGGER IF EXISTS` first)
- Creates `audit_commission_snapshots` on `commission_snapshots`
- Creates `audit_commission_payments` on `commission_payments`

```sql
DROP TRIGGER IF EXISTS trg_commission_snapshot ON public.enrollments;
CREATE TRIGGER trg_commission_snapshot 
  AFTER UPDATE ON public.enrollments
  FOR EACH ROW EXECUTE FUNCTION public.create_commission_snapshot();

DROP TRIGGER IF EXISTS audit_commission_snapshots ON public.commission_snapshots;
CREATE TRIGGER audit_commission_snapshots 
  AFTER INSERT OR UPDATE OR DELETE ON public.commission_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

DROP TRIGGER IF EXISTS audit_commission_payments ON public.commission_payments;
CREATE TRIGGER audit_commission_payments 
  AFTER INSERT OR UPDATE OR DELETE ON public.commission_payments
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
```

### Step 2: Verify After Migration

Query the database to confirm all 3 triggers are active on the correct tables.

### Step 3: Test the Flow

After the triggers are in place, the user can:
1. Set an enrollment's `funding_status` → `approved` → snapshot auto-created
2. Set enrollment `status` → `paid_by_university` → snapshot updated to `ready_full`
3. Data appears in Commissions page, Agent and Admin dashboards

No UI code changes needed — the `paid_by_university` status is already in all STATUSES arrays and StatusBadge config.

