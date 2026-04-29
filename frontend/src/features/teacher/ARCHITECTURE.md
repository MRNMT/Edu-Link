# Teacher Module Architecture

## Overview

The teacher module is organized with clean separation of concerns:

```
teacher/
├── index.tsx                 # Main dashboard component
├── teacher-service.ts        # CRUD operations & API calls
├── teacher-types.ts          # TypeScript interfaces & types
├── teacher-hooks.ts          # React hooks for components
├── index.barrel.ts           # Barrel export for easy imports
├── README.md                 # Feature documentation
├── ARCHITECTURE.md           # This file
│
└── Components (Feature UI)
    ├── HomeworkForm.tsx
    ├── homework.tsx
    ├── QuizBuilder.tsx
    ├── quiz-form.tsx
    ├── quizzes.tsx
    ├── AttendanceTracker.tsx
    ├── attendance.tsx
    ├── ClassAlertsForm.tsx
    ├── announcements.tsx
    ├── PickupVerification.tsx
    ├── parent-notifications.tsx
    ├── my-classes.tsx
    └── etc.
```

## Architectural Patterns

### 1. Service Layer (teacher-service.ts)

**Purpose:** Centralized API communication layer

**Characteristics:**
- Groups related operations into service objects
- Handles all API calls using `localApi`
- Pure functions with no React dependencies
- Includes validation utilities
- Provides error handling

**Services:**
- `HomeworkService` - Homework CRUD
- `QuizService` - Quiz CRUD
- `AttendanceService` - Attendance operations
- `ClassAlertService` - Alert operations

**Usage:**
```typescript
import { HomeworkService } from "./teacher-service";

const homework = await HomeworkService.list();
```

### 2. Types Layer (teacher-types.ts)

**Purpose:** Centralized type definitions

**Characteristics:**
- All interfaces in one place
- Type safety across the module
- Props types for components
- API payload/response types
- Domain-specific types

**Type Categories:**
- Entity types (TeacherHomework, TeacherQuiz, etc.)
- Payload types (HomeworkCreatePayload, etc.)
- Component prop types (HomeworkFormProps, etc.)
- API response types (CreateResponse, etc.)

**Usage:**
```typescript
import type { HomeworkCreatePayload } from "./teacher-types";

const payload: HomeworkCreatePayload = {
  class_name: "Class A",
  title: "Homework",
};
```

### 3. Hooks Layer (teacher-hooks.ts)

**Purpose:** React integration for services

**Characteristics:**
- Wraps service methods in hooks
- Manages component state (loading, error, data)
- Handles async operations
- Auto-refresh patterns
- Error management

**Hooks:**
- `useHomework()` - Homework operations
- `useQuiz()` - Quiz operations
- `useAttendance()` - Attendance operations
- `useClassAlert()` - Alert operations
- `useTeacherDashboard()` - Combined data loading

**Usage:**
```typescript
import { useHomework } from "./teacher-hooks";

function MyComponent() {
  const { homework, loading, createHomework } = useHomework();
  
  const handleCreate = async (payload) => {
    await createHomework(payload);
  };
  
  return <div>{loading ? "Loading..." : homework.length} items</div>;
}
```

### 4. Component Layer

**Purpose:** UI presentation and user interaction

**Characteristics:**
- Use hooks from `teacher-hooks.ts`
- Import types from `teacher-types.ts`
- Focus on UI/UX, not business logic
- Pass handlers to parent for state management
- Use UI component library (shadcn/ui)

**Pattern:**
```typescript
import { useHomework } from "./teacher-hooks";
import type { HomeworkCreatePayload } from "./teacher-types";

export function HomeworkForm() {
  const { createHomework, loading } = useHomework();
  
  const handleSubmit = async (payload: HomeworkCreatePayload) => {
    await createHomework(payload);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* UI here */}
    </form>
  );
}
```

## Data Flow

```
Component (UI)
    ↓ (user interaction)
    ↓
Hook (useHomework)
    ↓ (async operation)
    ↓
Service (HomeworkService)
    ↓ (API call)
    ↓
localApi
    ↓ (HTTP request)
    ↓
Backend API
    ↓ (response)
    ↓
Component State (homework, loading, error)
    ↓
Re-render
```

## Adding New Features

### Step 1: Define Types (teacher-types.ts)

```typescript
export interface NewFeature {
  id: string;
  title: string;
  // ... fields
}

export interface NewFeaturePayload {
  title: string;
  // ... fields
}

export interface NewFeatureComponentProps {
  onSuccess: () => void;
}
```

### Step 2: Create Service (teacher-service.ts)

```typescript
export const NewFeatureService = {
  async list(): Promise<NewFeature[]> {
    return localApi.ops.teacher.listNewFeature();
  },
  
  async create(payload: NewFeaturePayload): Promise<{ id: string }> {
    return localApi.ops.teacher.createNewFeature(payload);
  },
  
  async update(id: string, payload: Partial<NewFeaturePayload>): Promise<NewFeature> {
    return localApi.ops.teacher.updateNewFeature(id, payload);
  },
  
  async delete(id: string): Promise<void> {
    return localApi.ops.teacher.deleteNewFeature(id);
  },
};
```

### Step 3: Create Hook (teacher-hooks.ts)

```typescript
export function useNewFeature() {
  const [items, setItems] = useState<NewFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await NewFeatureService.list();
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);
  
  const create = useCallback(
    async (payload: NewFeaturePayload) => {
      await NewFeatureService.create(payload);
      await load();
    },
    [load],
  );
  
  return { items, loading, error, load, create };
}
```

### Step 4: Create Component

```typescript
import { useNewFeature } from "./teacher-hooks";
import type { NewFeatureComponentProps } from "./teacher-types";

export function NewFeatureComponent({ onSuccess }: NewFeatureComponentProps) {
  const { items, create, loading } = useNewFeature();
  
  return (
    <div>
      {/* UI here */}
    </div>
  );
}
```

### Step 5: Export from Barrel File

Update `index.barrel.ts`:
```typescript
export { useNewFeature } from "./teacher-hooks";
export type { NewFeature, NewFeaturePayload } from "./teacher-types";
```

## Error Handling Pattern

All layers include proper error handling:

```typescript
// Service layer
try {
  return await localApi.ops.teacher.operation();
} catch (error) {
  // Transform error message
  throw new Error("User-friendly message");
}

// Hook layer
try {
  const result = await service.operation();
} catch (error) {
  setError(err instanceof Error ? err.message : "Unknown error");
  throw error; // Re-throw if needed
}

// Component layer
try {
  await hook.operation();
  toast.success("Success message");
} catch (error) {
  toast.error(error instanceof Error ? error.message : "Failed");
}
```

## Performance Considerations

1. **Memoization:** Hooks use `useCallback` to prevent unnecessary re-renders
2. **Lazy Loading:** Dashboard loads data only when needed
3. **Caching:** Service doesn't cache; relies on component state
4. **Validation:** Validate on client before API calls
5. **Batch Operations:** Use batch endpoints (e.g., attendance batch)

## Testing Strategy

### Unit Tests (Services)
```typescript
describe("HomeworkService", () => {
  it("should validate homework payload", () => {
    const validation = validateHomeworkPayload({
      class_name: "Class A",
      title: "Homework",
    });
    expect(validation.valid).toBe(true);
  });
});
```

### Integration Tests (Hooks)
```typescript
describe("useHomework", () => {
  it("should load homework on mount", async () => {
    const { result } = renderHook(() => useHomework());
    await result.current.loadHomework();
    expect(result.current.homework).toHaveLength(2);
  });
});
```

### Component Tests
```typescript
describe("HomeworkForm", () => {
  it("should create homework on submit", async () => {
    render(<HomeworkForm onHomeworkPosted={vi.fn()} />);
    // ... interactions
  });
});
```

## Best Practices

1. ✅ Keep services pure and testable
2. ✅ Use types everywhere for type safety
3. ✅ Handle errors gracefully
4. ✅ Provide loading states
5. ✅ Validate inputs on client
6. ✅ Document complex operations
7. ✅ Use consistent naming conventions
8. ✅ Lazy load data when possible
9. ✅ Never duplicate API calls
10. ✅ Test service layer thoroughly

## File Size Guidelines

- **Service file:** < 300 lines
- **Types file:** < 200 lines
- **Hooks file:** < 300 lines
- **Component file:** < 400 lines
- **Split large files:** Use feature folders

## Dependencies

- `react` - For hooks
- `sonner` - For toast notifications
- `@tanstack/react-router` - For routing
- `@reduxjs/toolkit` - For state (auth)
- UI components from `@/components/ui`

## Exports

**Barrel File:** `index.barrel.ts`

Re-exports all public APIs for clean imports:

```typescript
// Instead of multiple imports
import { HomeworkService } from "./teacher-service";
import type { HomeworkCreatePayload } from "./teacher-types";
import { useHomework } from "./teacher-hooks";

// Use barrel export
import {
  HomeworkService,
  useHomework,
  type HomeworkCreatePayload,
} from "@/features/teacher";
```

## Related Documentation

- [README.md](./README.md) - Feature documentation
- [teacher-service.ts](./teacher-service.ts) - Service implementation
- [teacher-types.ts](./teacher-types.ts) - Type definitions
- [teacher-hooks.ts](./teacher-hooks.ts) - React hooks
