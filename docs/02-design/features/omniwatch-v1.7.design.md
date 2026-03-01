# OmniWatch v1.7 Design - Tenant Management & Marketplace UX

## Group 1: Tenant Management

### 1-1. Edit tenant
In `apps/web/src/app/tenants/page.tsx`:
- Add `editTenant` state (Tenant | null)
- Add edit button (Pencil icon) to each tenant row
- On click: open modal with pre-filled name, plan, max_agents
- On save: PUT /api/tenants/:id with updated fields
- Close modal and reload data

### 1-2. API key rotation
In `apps/web/src/app/tenants/page.tsx`:
- Add "Rotate Key" button next to each user's key reveal
- On click: POST /api/users/:id/rotate-key
- Show new key in modal, warn that old key is invalidated
- Add confirmation step before rotation

### 1-3. Usage quota display
In `apps/web/src/app/tenants/page.tsx`:
- For each tenant, show "X / Y agents" (current / max)
- Fetch agent count per tenant from API or calculate client-side
- Show progress bar (green < 80%, yellow >= 80%, red >= 100%)

## Group 2: Marketplace & Recipe UX

### 2-1. Recipe detail modal
In `apps/web/src/app/marketplace/page.tsx`:
- Add `selectedRecipe` state (Recipe | null)
- On card click: set selectedRecipe
- Render modal with: name, description, author, tags, rating, full prompt
- Close button + backdrop click to dismiss

### 2-2. Install confirmation
In `apps/web/src/app/marketplace/page.tsx`:
- Before calling install API, show confirmation modal
- "Are you sure you want to install {recipe.name}?"
- Confirm → proceed with install; Cancel → dismiss

## Group 3: Global UX

### 3-1. Notification badge
In `apps/web/src/app/layout.tsx`:
- Fetch unread notification count from API on mount + periodically
- Show badge circle with count next to "Notifications" nav item
- Only show when count > 0

### 3-2. Keyboard shortcuts
In `apps/web/src/app/layout.tsx`:
- Add global keydown listener
- Ctrl+K or Cmd+K: navigate to /agents (or show search)
- Escape: close sidebar on mobile
