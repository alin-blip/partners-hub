

# Plan: Sistem de Facturare (Invoicing System)

## Rezumat
Sistem complet de facturare: agenții/adminii își introduc datele bancare pe profil, trimit cereri de invoice pentru comisioanele lor, iar owner-ul aprobă/plătește/respinge. Izolare strictă prin RLS — fiecare agent vede doar propriile invoice-uri, fiecare admin doar pe ale sale (nu ale altor admini).

---

## Faza 1 — Migrație DB

### Tabelă `billing_details`
- `id` uuid PK
- `user_id` uuid UNIQUE, NOT NULL (referință la profiles.id)
- `account_holder_name` text
- `sort_code` text nullable
- `account_number` text nullable
- `iban` text nullable
- `swift_bic` text nullable
- `bank_name` text nullable
- `is_company` boolean default false
- `company_name`, `company_number`, `company_address`, `vat_number` — toate text nullable
- `created_at`, `updated_at` timestamptz

**RLS (billing_details)**:
- SELECT/UPDATE: `user_id = auth.uid()` — fiecare user vede/editează doar propriile date
- INSERT: `user_id = auth.uid()`
- Owner ALL: `has_role(auth.uid(), 'owner')` — owner-ul vede toate pentru a verifica la aprobare
- Nu există acces cross-agent sau cross-admin

### Tabelă `invoice_requests`
- `id` uuid PK
- `requester_id` uuid NOT NULL (referință la profiles.id)
- `snapshot_id` uuid NOT NULL (referință la commission_snapshots.id)
- `amount` numeric NOT NULL
- `status` text default 'submitted' (submitted, in_review, approved, paid, rejected)
- `invoice_number` text auto-generated (trigger: `INV-YYYYMMDD-XXXX`)
- `notes` text nullable (agentul scrie)
- `owner_notes` text nullable (owner-ul scrie)
- `paid_at` timestamptz nullable
- `created_at`, `updated_at` timestamptz

**RLS (invoice_requests) — REGULA CRITICĂ**:
- Agent SELECT: `requester_id = auth.uid()` — agentul vede DOAR propriile invoice-uri
- Admin SELECT: `requester_id = auth.uid()` — adminul vede DOAR propriile invoice-uri (NU ale echipei)
- INSERT: `requester_id = auth.uid()` — nimeni nu poate crea invoice în numele altcuiva
- Owner ALL: `has_role(auth.uid(), 'owner')` — doar owner-ul gestionează toate
- UPDATE pentru owner: status changes, owner_notes, paid_at

**Trigger**: auto-generate `invoice_number` la INSERT + auto-update `updated_at`

---

## Faza 2 — BillingDetailsCard

### Fișier nou: `src/components/BillingDetailsCard.tsx`
- Card cu formular pentru date bancare personale
- Toggle "I have a company" care arată/ascunde câmpurile de firmă
- Câmpuri personale: Account Holder Name, Sort Code, Account Number, Bank Name, IBAN, SWIFT/BIC
- Câmpuri firmă: Company Name, Company Number, Company Address, VAT Number
- Upsert la save (insert sau update)

### Modificare: `src/pages/shared/ProfilePage.tsx`
- Import și render `BillingDetailsCard` sub cardul Personal Information

---

## Faza 3 — Pagina Invoices (Agent/Admin)

### Fișier nou: `src/pages/shared/InvoicesPage.tsx`
- Tabel cu invoice-urile proprii: invoice_number, amount, status, created_at
- Status badges colorate (submitted=yellow, in_review=blue, approved=green, paid=emerald, rejected=red)
- Buton "Request Invoice" → dialog:
  - Dropdown cu commission_snapshots eligibile (status pending_25/ready_full, fără invoice deja)
  - Suma pre-populată din snapshot
  - Câmp notes opțional
  - Verificare că billing_details există — dacă nu, toast cu link la Profile
- MetricCards: Total Pending, Total Approved, Total Paid

---

## Faza 4 — Pagina Owner Invoices

### Fișier nou: `src/pages/owner/OwnerInvoicesPage.tsx`
- Tabs: All / Submitted / Approved / Paid / Rejected
- MetricCards: Pending Amount, Approved Amount, Paid This Month
- Tabel cu toate invoice-urile: agent name, amount, status, date, invoice_number
- Acțiuni inline pe fiecare rând:
  - "Review" → setează in_review
  - "Approve" → setează approved
  - "Mark Paid" → setează paid + paid_at
  - "Reject" → dialog cu owner_notes + setează rejected
- Click pe rând → drawer/dialog cu detalii complete inclusiv billing info al agentului (read-only)

---

## Faza 5 — Routing, Sidebar, Notificări

### `src/App.tsx`
- Rute noi: `/{prefix}/invoices` pentru toate rolurile
- Owner: `/owner/invoices` → OwnerInvoicesPage
- Agent/Admin: `/{prefix}/invoices` → InvoicesPage

### `src/components/AppSidebar.tsx`
- Adăugat "Invoices" (icon: Receipt) în mainItems, sub Enrollments

### `src/components/NotificationBell.tsx`
- Tip nou `"invoice"` cu icon 🧾
- Agent/Admin: notificare când invoice-ul primește status nou (approved/paid/rejected)
- Query: invoice_requests unde requester_id = user.id și updated_at recent și status != submitted

---

## Securitate — Regulile critice

```text
billing_details:
  Agent A → vede DOAR billing_details.user_id = A
  Admin B → vede DOAR billing_details.user_id = B
  Owner   → vede TOATE (necesar la aprobare)

invoice_requests:
  Agent A → vede DOAR invoice_requests.requester_id = A
  Admin B → vede DOAR invoice_requests.requester_id = B
  Admin B NU vede invoice-urile agenților din echipa lui
  Owner   → vede și gestionează TOATE
```

Niciun agent nu poate vedea invoice-urile altui agent.
Niciun admin nu poate vedea invoice-urile altui admin.
Doar owner-ul are vizibilitate globală.

---

## Fișiere create
1. `src/components/BillingDetailsCard.tsx`
2. `src/pages/shared/InvoicesPage.tsx`
3. `src/pages/owner/OwnerInvoicesPage.tsx`
4. 1 migrație SQL (2 tabele + RLS + triggers)

## Fișiere modificate
1. `src/pages/shared/ProfilePage.tsx` — adăugat BillingDetailsCard
2. `src/components/AppSidebar.tsx` — link Invoices
3. `src/components/NotificationBell.tsx` — notificări invoice
4. `src/App.tsx` — rute noi

## Impact
- Zero modificări pe tabele existente
- Zero risc pentru funcționalitatea curentă
- Billing details sunt PII — protejate strict prin RLS (user vede doar propriile)

