# UI Components Reference

## Component Location (CRITICAL)

**Component Structure**:
- **UI Components**: `app/components/ui/` - All reusable UI components (Button, Card, Modal, Input, Textarea, etc.)
- **Dashboard Forms**: `app/components/dashboard/` - Domain-specific forms (BrandForm, CarModelForm, etc.)
- **Layout Components**: `app/components/layout/` - Layout structure (DashboardLayout, Sidebar, Topbar)

**RULES**:
- **DO NOT create new component folders**
- **Work with existing components** - modify, extend, or enhance them
- All new UI components MUST go in `app/components/ui/`
- All components exported from `app/components/index.ts` for easy imports

## Page Structure Standards (CRITICAL)

### Standard Page Layout Pattern

**ALL pages MUST follow this standardized structure:**

```tsx
// ✅ CORRECT - Standardized PageHeader usage
<div className="space-y-4">
    <PageHeader
        title="Page Title"
        leftActions={<BackButton to="/previous-page" />}
        rightActions={
            <Button type="submit" variant="primary" form="form-id">
                Action Label
            </Button>
        }
    />
    
    <FormBox>
        <Form id="form-id">...</Form>
    </FormBox>
</div>

// ❌ WRONG - Manual layout (deprecated)
<div className="flex items-center justify-between">
    <div className="flex items-center gap-4">
        <BackButton to="/previous-page" />
        <PageHeader title="Page Title" />
    </div>
    <Button>Action</Button>
</div>
```

**Benefits**:
- Consistent spacing and alignment across all pages
- Responsive behavior handled automatically
- Animations and transitions built-in
- Easier to maintain and update

### PageHeader Component

**Location**: `app/components/ui/PageHeader.tsx`

Flexible header component for all dashboard pages with built-in support for actions, search, and navigation.

```tsx
import PageHeader from '@/components/ui/PageHeader'
import BackButton from '@/components/ui/BackButton'
import Button from '@/components/ui/Button'

// Basic usage
<PageHeader title="Dashboard" />

// With back button
<PageHeader
    title="Add New Company"
    leftActions={<BackButton to="/companies" />}
/>

// With action button
<PageHeader
    title="Companies"
    rightActions={
        <Link to="/companies/create">
            <Button variant="primary" icon={<PlusIcon />}>
                Add Company
            </Button>
        </Link>
    }
/>

// With form submit button
<PageHeader
    title="Add New Brand"
    leftActions={<BackButton to="/brands" />}
    rightActions={
        <Button type="submit" variant="primary" form="brand-form">
            Create Brand
        </Button>
    }
/>

// With search
<PageHeader
    title="Users"
    withSearch
    searchValue={searchQuery}
    onSearchChange={setSearchQuery}
    searchPlaceholder="Search users..."
/>

// Using shorthand props
<PageHeader
    title="Create Item"
    actionLabel="Save"
    actionIcon={<CheckIcon />}
    actionType="submit"
    onAction={handleSubmit}
/>
```

**Props**:
- `title` (ReactNode) - Page title
- `leftActions` (ReactNode) - Actions on the left (typically BackButton)
- `rightActions` (ReactNode) - Actions on the right (typically Button or Link)
- `actions` (ReactNode) - Alias for rightActions
- `children` (ReactNode) - Additional custom content
- `withSearch` (boolean) - Show search input
- `searchValue` (string) - Search input value
- `onSearchChange` (function) - Search change handler
- `searchPlaceholder` (string) - Search placeholder text
- `actionLabel` (string) - Shorthand for creating action button
- `actionIcon` (ReactNode) - Icon for action button
- `actionType` ('button' | 'link' | 'submit') - Type of action
- `href` (string) - Link href (when actionType='link')
- `onAction` (function) - Click handler (when actionType='button')
- `loading` (boolean) - Show loading state on action button
- `disabled` (boolean) - Disable action button

**Features**:
- Responsive layout with proper spacing
- Built-in animations (fade-in, slide-in)
- Automatic text truncation for long titles
- Flexible action placement
- Search integration

## Available UI Components

### Form Components

#### FormInput
**Location**: `app/components/ui/FormInput.tsx`

Universal input component that automatically switches between edit and view modes.

```tsx
import FormInput from '@/components/ui/FormInput'

// Edit mode (editable input)
<FormInput 
  label="First Name" 
  name="name" 
  defaultValue={user.name}
  placeholder="Enter name"
  required
  isEdit={true}
/>

// View mode (readonly with gray background)
<FormInput 
  label="First Name" 
  name="name" 
  value={user.name}
  isEdit={false}
/>
```

**Props**:
- `label` (string, required) - Field label
- `name` (string, required) - Form field name
- `type` (string, optional) - Input type (text, email, password, date, etc.)
- `value` (string | number | null, optional) - Value for view mode
- `defaultValue` (string | number | null, optional) - Default value for edit mode
- `placeholder` (string, optional) - Placeholder text
- `required` (boolean, optional) - Mark field as required
- `disabled` (boolean, optional) - Disable field
- `isEdit` (boolean, optional, default: true) - Toggle between edit/view mode

#### FormSelect
**Location**: `app/components/ui/FormSelect.tsx`

Universal select dropdown component that automatically switches between edit and view modes.

```tsx
import FormSelect from '@/components/ui/FormSelect'

// Edit mode (editable select)
<FormSelect
  label="Country"
  name="countryId"
  defaultValue={user.countryId}
  options={countries}
  isEdit={true}
/>

// View mode (readonly with gray background)
<FormSelect
  label="Country"
  name="countryId"
  value={user.countryId}
  options={countries}
  isEdit={false}
/>
```

**Props**:
- `label` (string, required) - Field label
- `name` (string, required) - Form field name
- `value` (string | number | null, optional) - Value for view mode
- `defaultValue` (string | number | null, optional) - Default value for edit mode
- `options` (Array<{id: number | string, name: string}>, required) - Select options
- `placeholder` (string, optional) - Placeholder text
- `required` (boolean, optional) - Mark field as required
- `disabled` (boolean, optional) - Disable field
- `isEdit` (boolean, optional, default: true) - Toggle between edit/view mode

#### Input
**Location**: `app/components/ui/Input.tsx`

Basic input component for simple forms without view/edit modes.

### Core Components

#### Button
**Location**: `app/components/ui/Button.tsx`

```tsx
import { Button } from '@/components/ui/Button'

<Button
  variant="primary" // primary | secondary | delete | destructive
  size="md"         // sm | md | lg
  rounded="xl"      // sm | md | lg | xl | full
  loading={false}   // Shows spinner when true
  disabled={false}
  fullWidth={false}
  icon={<Icon />}
  iconPosition="left" // left | right
  onClick={async () => {}}
>
  Click me
</Button>
```

**Features**:
- Async onClick support with loading state
- Auto-disables during processing
- Icon support (left/right positioning)
- Multiple variants and sizes
- Rounded corners (default: xl)

#### Card
**Location**: `app/components/ui/Card.tsx`

```tsx
import { Card } from '@/components/ui/Card'

<Card padding="md" className="">
  {children}
</Card>
```

**Features**:
- Rounded corners: `rounded-3xl`
- Border: `border-gray-200`
- Padding options: sm | md | lg

#### Modal
**Location**: `app/components/ui/Modal.tsx`

```tsx
import Modal from '@/components/ui/Modal'

<Modal
  title="Modal Title"
  isOpen={true}
  onClose={() => {}}
  size="md"        // sm | md | lg | xl | large
  actions={<>
    <Button variant="secondary" onClick={onClose}>Cancel</Button>
    <Button variant="primary" onClick={onSave}>Save</Button>
  </>}
>
  {children}
</Modal>
```

**Features**:
- Portal rendering (renders in document.body)
- Backdrop blur effect
- Scrollable content area
- Optional actions footer
- Click outside to close

### Form Components

Form input components are located in `app/components/ui/` and provide reusable input elements with validation support.

#### Input
**Location**: `app/components/ui/Input.tsx`

Advanced input component with label, error handling, and addon support.

```tsx
import { Input } from '@/components'

<Input
  label="Email"
  name="email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  placeholder="Enter email"
  error={errors.email}
  required={true}
  disabled={false}
  addonLeft={<Icon />}      // Optional left addon
  addonRight="USD"          // Optional right addon
/>
```

**Features**:
- Label with required indicator (*)
- Error message display
- Left/right addons for icons or text
- Smart placeholder handling for numeric fields
- Focus state management
- Disabled state styling
- Rounded corners: `rounded-xl`
- Full ref support (forwardRef)

**Special Behavior**:
- For numeric inputs with zero placeholders (0, 0.00), placeholder hides on focus and shows only when no user input
- Error styling applied automatically when error prop is provided

#### Textarea
**Location**: `app/components/ui/Textarea.tsx`

Multi-line text input component with label and error handling.

```tsx
import { Textarea } from '@/components'

<Textarea
  label="Description"
  name="description"
  value={description}
  onChange={(value) => setDescription(value)}
  placeholder="Enter description"
  error={errors.description}
  required={true}
  disabled={false}
  rows={4}
  className=""
/>
```

**Features**:
- Label with required indicator (*)
- Error message display
- Configurable rows (default: 4)
- Vertical resize enabled
- Disabled state styling
- Rounded corners: `rounded-xl`

**Note**: onChange receives the value directly, not the event object

#### FormField
**Location**: `app/components/ui/FormField.tsx`

```tsx
<FormField
  label="Email"
  name="email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={errors.email}
  required={true}
/>
```

#### FormSection
**Location**: `app/components/ui/FormSection.tsx`

```tsx
<FormSection title="Personal Information" description="Optional description">
  <FormField ... />
  <FormField ... />
</FormSection>
```

### Layout Components

#### PageHeader
**Location**: `app/components/ui/PageHeader.tsx`

```tsx
<PageHeader
  title="Page Title"
  subtitle="Optional subtitle"
  actions={<Button>Action</Button>}
/>
```

**Updated Styles**: Title uses `text-xl md:text-xl font-black text-gray-900 tracking-tight` with fade-in animation. No subtitles should be used - removed from all pages.
```

#### PageContent
**Location**: `app/components/ui/PageContent.tsx`

```tsx
<PageContent>
  {children}
</PageContent>
```

#### PageActions
**Location**: `app/components/ui/PageActions.tsx`

```tsx
<PageActions>
  <Button>Action 1</Button>
  <Button>Action 2</Button>
</PageActions>
```

#### Section
**Location**: `app/components/ui/Section.tsx`

Universal section container with optional header and actions.

```tsx
import { Section } from '@/components'

// Simple section
<Section>
  {children}
</Section>

// With title and description
<Section
  title="Section Title"
  description="Optional description"
  size="lg"
>
  {children}
</Section>

// With header action
<Section
  title="Recent Activity"
  headerAction={<Button>View All</Button>}
  size="md"
>
  {children}
</Section>
```

**Props**:
- `title`: Optional section title
- `description`: Optional description text
- `headerAction`: Optional action button/element
- `size`: 'sm' | 'md' | 'lg' (affects title size and spacing)
- `className`: Additional CSS classes

**Features**:
- Flexible header with title, description, and actions
- Three size variants
- Automatic spacing management



### Data Display Components

#### Table
**Location**: `app/components/ui/Table.tsx`

```tsx
<Table
  columns={[
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
  ]}
  data={items}
  onRowClick={(item) => {}}
  loading={false}
  emptyMessage="No items found"
/>
```

#### DetailView
**Location**: `app/components/ui/DetailView.tsx`

```tsx
<DetailView>
  <DetailField label="Name" value={name} />
  <DetailField label="Email" value={email} />
</DetailView>
```

#### DetailGrid
**Location**: `app/components/ui/DetailGrid.tsx`

```tsx
<DetailGrid>
  <DetailField label="Field 1" value={value1} />
  <DetailField label="Field 2" value={value2} />
</DetailGrid>
```

#### DetailField
**Location**: `app/components/ui/DetailField.tsx`

```tsx
<DetailField
  label="Label"
  value="Value"
  icon={<Icon />}
/>
```

### Status & Badges

#### StatusBadge
**Location**: `app/components/ui/StatusBadge.tsx`

```tsx
<StatusBadge status="active" /> // active | inactive | pending | completed
```

#### IconBadge
**Location**: `app/components/ui/IconBadge.tsx`

```tsx
<IconBadge icon={<Icon />} color="blue" />
```

#### IdBadge
**Location**: `app/components/ui/IdBadge.tsx`

```tsx
<IdBadge id={123} />
```

### Dictionary Forms

#### GenericDictionaryForm
**Location**: `app/components/dashboard/GenericDictionaryForm.tsx`

Universal form component for all dictionary entities (brands, colors, currencies, districts, payment types, etc.).

```tsx
import { GenericDictionaryForm, type FieldConfig } from '@/components/dashboard/GenericDictionaryForm'

const fields: FieldConfig[] = [
    {
        name: 'name',
        label: 'Brand Name',
        type: 'text',
        required: true,
        placeholder: 'Enter brand name',
        className: 'col-span-4'
    },
    {
        name: 'code',
        label: 'Code',
        type: 'text',
        required: true,
        maxLength: 3,
        transform: (value) => value.toUpperCase(),
        validation: (value) => {
            if (!/^[A-Z]{3}$/.test(value)) {
                return 'Code must be 3 uppercase letters'
            }
            return null
        },
        className: 'col-span-2'
    },
    {
        name: 'is_active',
        label: 'Active',
        type: 'toggle',
        className: 'col-span-4'
    }
]

<GenericDictionaryForm
    title="Create Brand"
    fields={fields}
    data={existingData}
    onSubmit={handleSubmit}
    onCancel={handleCancel}
    onDelete={handleDelete}
    gridCols={4}
/>
```

**Field Types**:
- `text` - Text input with Latin validation
- `number` - Numeric input
- `select` - Dropdown with options
- `textarea` - Multi-line text
- `checkbox` - Checkbox input
- `toggle` - Toggle switch
- `color` - Color picker with hex preview

**Field Config Props**:
- `name` (string, required) - Field name
- `label` (string, required) - Field label
- `type` (FieldType, required) - Field type
- `required` (boolean) - Mark as required
- `placeholder` (string) - Placeholder text
- `maxLength` (number) - Max character length
- `options` (Array) - Options for select (format: `{id, name}`)
- `validation` (function) - Custom validation: `(value, formData) => string | null`
- `disabled` (boolean) - Disable field
- `className` (string) - CSS classes (use `col-span-X` for grid)
- `rows` (number) - Rows for textarea
- `helpText` (string) - Help text below field
- `transform` (function) - Transform value: `(value) => any`

**Component Props**:
- `title` (string, required) - Modal title
- `fields` (FieldConfig[], required) - Field configurations
- `data` (object) - Existing data for edit mode
- `onSubmit` (function, required) - Submit handler
- `onCancel` (function, required) - Cancel handler
- `onDelete` (function) - Delete handler (shows delete button)
- `submitLabel` (string) - Custom submit button label
- `gridCols` (number, default: 4) - Grid columns

**Features**:
- Automatic validation (required, Latin-only for text)
- Custom validation per field
- Value transformation (e.g., uppercase)
- Edit/Create mode detection
- Delete button support
- Grid layout (4 columns by default)
- Error handling and display
- Modal wrapper included

**Migration Examples**:
See `BrandFormExample.tsx`, `CurrencyFormExample.tsx`, `PaymentTypeFormExample.tsx` for migration patterns.

**Replaces**:
- BrandForm
- ColorForm
- CurrencyForm
- DistrictForm
- PaymentStatusForm
- PaymentTypeForm

### Dashboard Components

#### StatsCards
**Location**: `app/components/ui/StatsCards.tsx`

Container component for displaying multiple stat cards in a grid.

```tsx
import { StatsCards } from '@/components'

<StatsCards stats={[
  { label: 'Total', value: '100', icon: <Icon /> },
  { label: 'Active', value: '50', icon: <Icon /> },
]} />
```

#### StatCard (Universal)
**Location**: `app/components/ui/StatCard.tsx`

Universal stat card component with three variants and full customization.

```tsx
import { StatCard } from '@/components'

// Compact variant (120px height)
<StatCard
  name="Total Cars"
  value="150"
  subtext="Active"
  icon={<Icon />}
  variant="compact"
  href="/dashboard/cars"
/>

// Default variant (with trend support)
<StatCard
  name="Revenue"
  value="$10,000"
  subtext="this month"
  icon={<Icon />}
  variant="default"
  trend={{ value: 12, isPositive: true }}
  color="success"
/>

// Detailed variant (160px height, enhanced styling)
<StatCard
  name="Total Bookings"
  value="245"
  subtext="this week"
  icon={<Icon />}
  variant="detailed"
  trend={{ value: 8, isPositive: true }}
/>
```

**Props**:
- `variant`: 'compact' | 'default' | 'detailed' (default: 'default')
- `color`: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'neutral'
- `trend`: { value: number, isPositive: boolean }
- `href`: Optional link destination
- `icon`: Optional icon element
- `subtext`: Additional text below value

**Features**:
- Three size variants for different use cases
- Color theming support
- Trend indicators with arrows
- Hover effects and transitions
- Optional linking

#### ChartsWidget
**Location**: `app/components/ui/ChartsWidget.tsx`

Role-agnostic chart widget for dashboard.

#### TasksWidget
**Location**: `app/components/ui/TasksWidget.tsx`

Role-agnostic tasks widget for dashboard.

#### QuickActions
**Location**: `app/components/ui/QuickActions.tsx`

Role-agnostic quick actions widget for dashboard.

#### RecentActivity
**Location**: `app/components/ui/RecentActivity.tsx`

Role-agnostic recent activity widget for dashboard.

#### UpcomingEventsWidget
**Location**: `app/components/ui/UpcomingEventsWidget.tsx`

Role-agnostic upcoming events widget for dashboard.

#### LocationsHealth
**Location**: `app/components/ui/LocationsHealth.tsx`

Role-agnostic locations health widget for dashboard.

### Utility Components

#### Loader
**Location**: `app/components/ui/Loader.tsx`

```tsx
<Loader size="md" /> // sm | md | lg
```

#### EmptyState
**Location**: `app/components/ui/EmptyState.tsx`

```tsx
<EmptyState
  icon={<Icon />}
  title="No items found"
  description="Try adjusting your filters"
  action={<Button>Create New</Button>}
/>
```

#### ConfirmModal
**Location**: `app/components/ui/ConfirmModal.tsx`

```tsx
<ConfirmModal
  isOpen={true}
  onClose={() => {}}
  onConfirm={async () => {}}
  title="Confirm Action"
  message="Are you sure?"
  confirmText="Confirm"
  cancelText="Cancel"
/>
```

#### DeleteButton
**Location**: `app/components/ui/DeleteButton.tsx`

```tsx
<DeleteButton
  onDelete={async () => {}}
  confirmMessage="Are you sure?"
/>
```

#### BackButton
**Location**: `app/components/ui/BackButton.tsx`

```tsx
<BackButton to="/dashboard" />
```

#### Breadcrumb
**Location**: `app/components/ui/Breadcrumb.tsx`

```tsx
<Breadcrumb items={[
  { label: 'Home', to: '/' },
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Current Page' },
]} />
```

#### Pagination
**Location**: `app/components/ui/Pagination.tsx`

```tsx
<Pagination
  currentPage={1}
  totalPages={10}
  onPageChange={(page) => {}}
/>
```

#### Tabs
**Location**: `app/components/ui/Tabs.tsx`

**CRITICAL - React Router v7 + Cloudflare Workers Compatibility**:
- **ALWAYS use `baseUrl` prop** for URL-based tab navigation
- **DO NOT use `onTabChange` with `navigate()` or `setSearchParams()`** - causes issues in local development
- Component uses native `<a>` links which work reliably in all environments

```tsx
import { Tabs } from '@/components'
import { useSearchParams } from 'react-router'

// ✅ CORRECT - Using baseUrl for URL-based navigation
const [searchParams] = useSearchParams()
const activeTab = searchParams.get('tab') || 'default'

<Tabs
  tabs={[
    { id: 'tab1', label: 'Tab 1' },
    { id: 'tab2', label: 'Tab 2' },
  ]}
  activeTab={activeTab}
  baseUrl="/page-path"  // Component generates: /page-path?tab=tab1
/>

// ❌ WRONG - Using onTabChange with navigate (unreliable locally)
const navigate = useNavigate()
<Tabs
  tabs={tabs}
  activeTab={activeTab}
  onTabChange={(id) => navigate(`/page?tab=${id}`)}  // DON'T DO THIS
/>

// ❌ WRONG - Using setSearchParams (unreliable locally)
const [searchParams, setSearchParams] = useSearchParams()
<Tabs
  tabs={tabs}
  activeTab={activeTab}
  onTabChange={(id) => setSearchParams({ tab: id })}  // DON'T DO THIS
/>
```

**Props**:
- `tabs`: Array of `{ id: string | number, label: string, count?: number }`
- `activeTab`: Current active tab ID
- `baseUrl`: (Recommended) Base URL for tab navigation - generates `?tab=` query params
- `onTabChange`: (Optional) Callback for custom tab handling - only use for non-URL state
- `className`: Additional CSS classes
- `variant`: 'pill' | 'underline' (default: 'pill')

**Why baseUrl is Required**:
- React Router v7 on Cloudflare Workers handles navigation differently in local vs production
- `navigate()` and `setSearchParams()` can fail silently in local development
- Native `<a>` links work consistently in all environments
- React Router automatically intercepts link clicks for SPA behavior

#### Toggle
**Location**: `app/components/ui/Toggle.tsx`

```tsx
<Toggle
  enabled={true}
  onChange={(enabled) => {}}
  label="Enable feature"
/>
```

### Toast Notifications

#### ToastContainer
**Location**: `app/components/ui/ToastContainer.tsx`

Add to root layout:
```tsx
import { ToastContainer } from '@/components/ui/ToastContainer'

<ToastContainer />
```

#### Usage
```tsx
import { useToast } from '@/lib/toast'

const { addToast } = useToast()

// Success
await addToast('Operation completed successfully', 'success')

// Error
await addToast('An error occurred', 'error')

// Info
await addToast('Information message', 'info')

// Warning
await addToast('Warning message', 'warning')
```

**RULES**:
- ALWAYS use Toast for user feedback
- NEVER use alert() or confirm()
- ALWAYS await before calling addToast
- NO emojis in toast messages
- Messages in English: "Email is required", "Operation completed"

## Component Patterns

### Role-Agnostic Components
Dashboard components (StatsCards, ChartsWidget, TasksWidget, etc.) are role-agnostic:
- Receive data through props
- DO NOT check roles internally
- Role filtering happens at API/page level

### Async Actions
```tsx
<Button
  loading={isLoading}
  onClick={async () => {
    try {
      await performAction()
      await addToast('Success', 'success')
    } catch (error) {
      await addToast('Error occurred', 'error')
    }
  }}
>
  Submit
</Button>
```

### Form Validation
```tsx
const handleSubmit = async (e: FormEvent) => {
  e.preventDefault()
  
  const result = schema.safeParse(formData)
  if (!result.success) {
    await addToast('Validation failed', 'error')
    return
  }
  
  // Process valid data
}
```

## Styling Standards

### Icons
- **ONLY Heroicons outline**: `@heroicons/react/24/outline`
- Never use solid icons

### Rounded Corners
- Input fields: `rounded-xl`
- Cards: `rounded-3xl`
- Buttons: `rounded-xl` (default)

### Colors
- Primary: `gray-800`
- Secondary: `gray-200`
- Destructive: `red-600`
- Border: `gray-200`

## Component Index

All components are exported from `app/components/index.ts` for convenient imports:

```tsx
// UI Components
import { Button, Card, Modal, Table, Input, Textarea } from '@/components'

// Dashboard Forms
import { BrandForm, CarModelForm } from '@/components'

// Layout Components
import { DashboardLayout, Sidebar } from '@/components'
```

## Component Organization

### app/components/ui/
Core reusable UI components:
- Button, Card, Modal, ConfirmModal
- Table, Pagination, Tabs
- Loader, EmptyState
- StatusBadge, IconBadge, IdBadge
- BackButton, Breadcrumb
- ToastContainer, ToastItem
- FormField, FormSection
- Input, Textarea (form inputs)
- Toggle, DeleteButton
- PageHeader, PageContent, PageActions
- Section (merged with SectionHeader)
- DetailView, DetailGrid, DetailField
- StatCard (universal - merged DashboardStatCard, InfoCard), StatsCards
- ChartsWidget, TasksWidget, QuickActions
- RecentActivity, UpcomingEventsWidget, LocationsHealth

### app/components/dashboard/
Domain-specific forms and tables:
- **GenericDictionaryForm** - Universal form for all dictionary entities (323 lines, replaces 7 forms)
- CarTemplateForm
- MaintenanceForm, MaintenanceModal, MaintenanceHistory
- PaymentsTable, SeasonalPricingTable
- TaskForm, RoleSwitcher

**Deprecated (replaced by GenericDictionaryForm)**:
- ~~BrandForm~~ ✅ Replaced
- ~~CarModelForm~~ ✅ Replaced
- ~~ColorForm~~ ✅ Replaced
- ~~CurrencyForm~~ ✅ Replaced
- ~~DistrictForm~~ ✅ Replaced
- ~~PaymentStatusForm~~ ✅ Replaced
- ~~PaymentTypeForm~~ ✅ Replaced

### app/components/layout/
Layout structure components:
- DashboardLayout
- Sidebar, Topbar, TopNavigation

## Adding New Components

When adding new UI components:
1. Create in `app/components/ui/` for reusable UI components
2. Create in `app/components/dashboard/` for domain-specific forms
3. Follow existing naming conventions
4. Export from `app/components/index.ts`
5. Document in this file
6. Use TypeScript for props
7. Follow styling standards
8. Support loading states for async actions

## Import Patterns

```tsx
// Recommended: Import from central index
import { Button, Card, Input, Textarea, BrandForm } from '@/components'

// Also works: Direct imports
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { BrandForm } from '@/components/dashboard/BrandForm'
```
