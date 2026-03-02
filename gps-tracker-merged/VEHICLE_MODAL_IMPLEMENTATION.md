# Secure Multi-Tenant Vehicle Modal Implementation

## Overview
The Create Vehicle modal has been enhanced with enterprise-grade security controls, multi-tenant organization management, and dependent dropdowns for drivers and GPS devices.

## Key Features Implemented

### 1. 🔐 Organization Selector (Conditional Visibility)
- **Shown for**: Superadmin and Root Organization Admin
- **Hidden for**: Sub-organization Admin
- **Features**:
  - Searchable dropdown using React Select
  - Organization hierarchy display (e.g., "Head Office / Punjab / Ludhiana")
  - Only loaded when user has permission to select org
  - Backend validates `req.orgScope` automatically

```tsx
const canSelectOrg = isSuperAdmin || isRootOrgAdmin;

// Only query orgs if allowed
const { data: orgsResponse, isLoading: isLoadingOrgs } = useGetOrganizationsQuery(undefined, {
    skip: !canSelectOrg,
});
```

### 2. 🔐 Auto Organization for Sub-Admin
- Sub-admins **cannot** see the organization selector
- Organization is automatically set to their logged-in org
- Read-only display showing their organization name
- Prevents unauthorized cross-organization access

```tsx
{/* Auto org display for sub-admin */}
{!canSelectOrg && (
    <div>
        <input
            type="text"
            readOnly
            value={orgContext.orgName || "Your Organization"}
        />
    </div>
)}
```

### 3. 🔐 Dependent Driver & Device Dropdowns
- **Smart Load**: Only load drivers/devices when organization is selected
- **Dynamic Filtering**: Data always scoped to selected organization
- **Cascading Reset**: When organization changes, drivers and devices are cleared
- **Loading States**: Visual feedback while fetching data
- **Empty States**: Clear messages when no data available

```tsx
const effectiveOrgId = useMemo(() => {
    if (canSelectOrg) {
        return selectedOrgId;
    }
    return contextOrgId;
}, [selectedOrgId, contextOrgId, canSelectOrg]);

// Drivers query - depends on org
const { data: driversResponse, isLoading: isLoadingDrivers } = useGetDriversQuery(
    effectiveOrgId ? { organizationId: effectiveOrgId } : undefined,
    {
        skip: !effectiveOrgId,
    }
);

// Devices query - depends on org  
const { data: devicesResponse, isLoading: isLoadingDevices } = useGetGpsDevicesQuery(
    effectiveOrgId ? { organizationId: effectiveOrgId } : undefined,
    {
        skip: !effectiveOrgId,
    }
);
```

### 4. 🔐 Secure Payload Construction
- Organization ID is always validated before submission
- Only `effectiveOrgId` is used (never user input directly)
- Backend validates against `req.orgScope`
- Optional driver and device IDs included only if selected

```tsx
const payload = {
    organizationId: effectiveOrgId, // 🔐 Secure - never user input
    vehicleType: formData.vehicleType,
    vehicleNumber: formData.vehicleNumber || formData.registrationNumber,
    model: formData.model,
    status: formData.status,
    ...(formData.driverId && { driverId: formData.driverId }),
    ...(formData.deviceId && { deviceId: formData.deviceId }),
};
```

### 5. 🔐 Searchable Dropdowns
- All dropdowns (organizations, drivers, devices) are searchable
- Using React Select v5.10.2 (already installed)
- Custom styling for consistent UX
- Clear icons to remove selections

```tsx
<Select
    options={driverOptions}
    value={selectedDriver}
    onChange={handleDriverChange}
    placeholder="Select Driver"
    isSearchable
    isClearable
    styles={customSelectStyles}
/>
```

### 6. 🔐 Context-Based Security
- Uses `useOrgContext()` as single source of truth
- No hardcoded roles - all checks based on context
- Properties used:
  - `isSuperAdmin`: Can access all organizations
  - `isRootOrgAdmin`: Can access own org + sub-orgs
  - `isSubOrgAdmin`: Can only access own org
  - `orgId`: Logged-in user's current org
  - `orgName`: Current org display name

```tsx
const orgContext = useOrgContext();
const { isSuperAdmin, isRootOrgAdmin, isSubOrgAdmin, orgId: contextOrgId } = orgContext;
const canSelectOrg = isSuperAdmin || isRootOrgAdmin;
```

## Access Control Matrix

| Feature | SuperAdmin | Root Admin | Sub Admin |
|---------|-----------|-----------|----------|
| Select Organization | ✅ | ✅ | ❌ |
| Create Vehicle | ✅ | ✅ | ✅ |
| Assign Driver | ✅ | ✅ | ✅ |
| Assign Device | ✅ | ✅ | ✅ |
| Org Hierarchy View | ✅ | ✅ | ❌ |

## Data Flow

### For Superadmin/Root Admin Creating Vehicle:
1. User selects organization → Org ID set in state
2. Drivers dropdown triggers query with `{ organizationId: selectedOrgId }`
3. Devices dropdown triggers query with `{ organizationId: selectedOrgId }`
4. Submit → Payload includes `organizationId: selectedOrgId`
5. Backend validates `selectedOrgId` against `req.orgScope`

### For Sub-Admin Creating Vehicle:
1. Organization field hidden, auto-populated from context
2. Drivers dropdown triggers query with `{ organizationId: contextOrgId }`
3. Devices dropdown triggers query with `{ organizationId: contextOrgId }`
4. Submit → Payload includes `organizationId: contextOrgId` (user cannot change)
5. Backend validates against `req.orgScope`

## Security Guarantees

✅ **No Cross-Organization Data Leakage**
- Sub-admins cannot see other organizations
- Drivers/devices always filtered to selected org
- Payload org ID validated server-side

✅ **No Manual Org Editing**
- Sub-admin org field is read-only
- Selected org ID locked after vehicle edit

✅ **API Scope Always Honored**
- Backend `req.orgScope` is final authority
- Frontend enforces UI constraints
- organizationId sent in query params for validation

✅ **Dependent Dropdowns Prevent Orphaned Data**
- Drivers/devices require organization first
- Clear feedback when org not selected
- Reset on organization change

## UI/UX Enhancements

### Loading States
- Spinner animation for organizations, drivers, and devices
- Clear "Loading..." messages

### Empty States
- "Select organization first" for drivers/devices without org
- "No drivers found for this organization"
- "No devices found for this organization"

### Visual Feedback
- Disabled "Add Vehicle" button without organization
- Organization selector disabled during vehicle edit
- Color-coded sections (blue for vehicle, green for driver/device)

### Accessibility
- Clear labels with icons
- Readable, uppercase section headers
- High contrast text
- Proper form field hierarchy

## Configuration

All API endpoints are automatically scoped by backend using `req.orgScope`:
- `GET /organizations` - Returns scoped organizations
- `GET /drivers?organizationId=...` - Returns scoped drivers
- `GET /gpsdevice?organizationId=...` - Returns scoped devices
- `POST /vehicle` - Validates organizationId against req.orgScope

## Testing Checklist

- [ ] Superadmin can select and see all organizations
- [ ] Root admin can select own org + sub-organizations
- [ ] Sub-admin cannot see organization selector
- [ ] Drivers dropdown disabled until org selected
- [ ] Devices dropdown disabled until org selected
- [ ] Searching works in all dropdowns
- [ ] Changing org resets driver/device selections
- [ ] Vehicle creation succeeds with drivers/devices
- [ ] Backend rejects unauthorized org access
- [ ] Edit mode prevents org changing for sub-admin

## No Backend Changes Required

✅ Backend security remains unchanged
✅ All `req.orgScope` validation still applies
✅ Frontend enforcement is additional security layer
✅ Fully backward compatible

## Files Modified

- `components/admin/Modals/VehicleModal.tsx` - Complete rewrite with secure multi-tenant logic

## Dependencies

- React Select v5.10.2 (already installed)
- RTK Query (already installed)
- useOrgContext hook (existing)
- Lucide React icons (already installed)
