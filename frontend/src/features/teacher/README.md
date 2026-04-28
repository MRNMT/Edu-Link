# Teacher Feature Module

## Overview
Complete teacher console with CRUD operations for homework, quizzes, attendance tracking, and class alerts.

## Folder Structure

```
teacher/
├── teacher-service.ts          # CRUD operations & utilities
├── index.tsx                   # Main dashboard component
├── README.md                   # This file
│
├── Homework Management
│   ├── homework.tsx            # Homework list & details page
│   ├── HomeworkForm.tsx        # Form for creating homework
│
├── Quiz Management  
│   ├── quizzes.tsx             # Quiz list & details page
│   ├── quiz-form.tsx           # Form for creating/editing quizzes
│   ├── QuizBuilder.tsx         # Quiz question builder component
│
├── Attendance Tracking
│   ├── attendance.tsx          # Attendance management page
│   ├── AttendanceTracker.tsx   # Attendance tracking component
│
├── Class Communication
│   ├── announcements.tsx       # Announcements page
│   ├── ClassAlertsForm.tsx     # Form for sending class alerts
│   ├── parent-notifications.tsx # Notifications to parents
│
├── Other Features
│   ├── my-classes.tsx          # Classes list
│   ├── PickupVerification.tsx  # Pickup token verification
```

## Services & APIs

### HomeworkService
CRUD operations for homework assignments.

**Methods:**
- `list()` - Get all homework assignments
- `create(payload)` - Post new homework
- `update(id, payload)` - Update homework (future)
- `delete(id)` - Delete homework (future)

**Example:**
```typescript
import { HomeworkService } from "./teacher-service";

const homework = await HomeworkService.list();
await HomeworkService.create({
  class_name: "Class A",
  title: "Chapter 3 Exercises",
  description: "Complete all exercises",
  due_date: "2025-05-10",
});
```

### QuizService
CRUD operations for quiz management.

**Methods:**
- `list()` - Get all quizzes
- `getDetail(id)` - Get quiz details
- `create(payload)` - Create new quiz
- `update(id, payload)` - Update quiz
- `delete(id)` - Delete quiz

**Example:**
```typescript
import { QuizService } from "./teacher-service";

const quizzes = await QuizService.list();
await QuizService.create({
  class_name: "Class A",
  title: "Math Quiz",
  questions: [
    {
      prompt: "What is 2+2?",
      sort_order: 1,
      options: [
        { option_text: "4", is_correct: true, sort_order: 1 },
        { option_text: "5", is_correct: false, sort_order: 2 },
      ],
    },
  ],
});
```

### AttendanceService
Track student attendance.

**Methods:**
- `submitBatch(payload)` - Submit attendance for multiple students

**Example:**
```typescript
import { AttendanceService } from "./teacher-service";

await AttendanceService.submitBatch({
  attendance_date: "2025-05-10",
  entries: [
    { child_id: "child-1", status: "present" },
    { child_id: "child-2", status: "absent", reason: "Sick" },
  ],
});
```

### ClassAlertService
Send notifications and alerts to class.

**Methods:**
- `send(payload)` - Send class alert
- `update(id, payload)` - Update alert (future)
- `delete(id)` - Delete alert (future)

**Example:**
```typescript
import { ClassAlertService } from "./teacher-service";

await ClassAlertService.send({
  class_name: "Class A",
  title: "Important Announcement",
  message: "School will close at 2 PM tomorrow",
  priority: "high",
});
```

## Utility Functions

### Date Helpers
- `formatDateForApi(date)` - Format date as YYYY-MM-DD for API
- `parseDateFromApi(dateStr)` - Format API date for display

### Validators
- `validateHomeworkPayload(payload)` - Validate homework data
- `validateAttendancePayload(payload)` - Validate attendance data

**Example:**
```typescript
import { validateHomeworkPayload, formatDateForApi } from "./teacher-service";

const payload = {
  class_name: "Class A",
  title: "Homework",
  due_date: formatDateForApi(new Date()),
};

const validation = validateHomeworkPayload(payload);
if (!validation.valid) {
  console.error("Validation errors:", validation.errors);
}
```

## Component Usage

### HomeworkForm
Create and post homework assignments.

```tsx
import { HomeworkForm } from "@/features/teacher/HomeworkForm";

<HomeworkForm 
  classOptions={["Class A", "Class B"]}
  onHomeworkPosted={() => loadHomework()}
/>
```

### AttendanceTracker
Track and submit attendance.

```tsx
import { AttendanceTracker } from "@/features/teacher/AttendanceTracker";

<AttendanceTracker 
  children={children}
  onSubmit={() => console.log("submitted")}
  submitted={isSubmitted}
/>
```

### QuizBuilder
Create and manage quizzes with interactive builder.

```tsx
import { QuizBuilder } from "@/features/teacher/QuizBuilder";

<QuizBuilder 
  classOptions={["Class A", "Class B"]}
  quizzes={quizzes}
  onQuizzesChange={setQuizzes}
/>
```

### ClassAlertsForm
Send alerts and announcements to class.

```tsx
import { ClassAlertsForm } from "@/features/teacher/ClassAlertsForm";

<ClassAlertsForm 
  classOptions={["Class A", "Class B"]}
  onAlertSent={() => loadAlerts()}
/>
```

## Routes

- `/teacher` - Redirect to dashboard
- `/teacher/dashboard` - Main teacher console
- `/teacher/homework` - Homework management
- `/teacher/quizzes` - Quiz management
- `/teacher/attendance` - Attendance tracking
- `/teacher/announcements` - Announcements & alerts

## State Management

Uses Redux for global state:
- `auth.user` - Current user profile
- `auth.profile` - User profile details
- `auth.roles` - Available roles

## Error Handling

All service methods include error handling:

```typescript
try {
  await HomeworkService.create(payload);
  toast.success("Homework posted successfully");
} catch (error) {
  toast.error(error instanceof Error ? error.message : "Failed to post homework");
}
```

## Future Enhancements

- [ ] Update/Edit homework assignments
- [ ] Delete homework assignments
- [ ] Update/Edit class alerts
- [ ] Delete class alerts
- [ ] Bulk attendance upload (CSV)
- [ ] Quiz analytics & student performance
- [ ] Message history with parents
- [ ] Grade management system
