import { useEffect, useMemo, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { useWindowDimensions } from "react-native";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  AppRole,
  localApi,
  setStoredToken,
  type AdminAttendanceClass,
  type Child,
  type HomeworkItem,
  type LocalSession,
  type NotificationItem,
  type ParentAttendanceRow,
  type ParentTeacherContact,
  type PickupToken,
  type QuizSummary,
} from "./src/lib/localApi";

type LoginRole = "parent" | "teacher" | "admin" | "gate" | "delegate" | "sysadmin";
type MobileScreen =
  | "home"
  | "parent-dashboard"
  | "parent-children"
  | "parent-homework"
  | "parent-notifications"
  | "parent-messages"
  | "parent-absences"
  | "parent-absence-report"
  | "teacher-dashboard"
  | "teacher-classes"
  | "teacher-attendance"
  | "teacher-homework"
  | "teacher-quizzes"
  | "teacher-announcements"
  | "teacher-parent-notifications"
  | "admin-dashboard"
  | "admin-school-overview"
  | "admin-learners"
  | "admin-classes"
  | "admin-teachers"
  | "admin-attendance"
  | "admin-parents-guardians"
  | "admin-link-requests"
  | "admin-reports"
  | "delegate-dashboard"
  | "delegate-child-selector"
  | "delegate-pickup-vouchers"
  | "security-dashboard"
  | "security-scanner"
  | "security-audit-logs"
  | "system-overview"
  | "system-user-management"
  | "system-schools-management"
  | "system-audit-logs"
  | "child-mode";

const ROLE_EMAILS: Record<LoginRole, string> = {
  parent: "parent@demo.school",
  teacher: "teacher@demo.school",
  admin: "admin@demo.school",
  gate: "security@demo.school",
  delegate: "delegate@demo.school",
  sysadmin: "sysadmin@demo.school",
};

const ROLE_OPTIONS: Array<{ value: LoginRole; label: string }> = [
  { value: "parent", label: "Parent / Guardian" },
  { value: "teacher", label: "Teacher" },
  { value: "admin", label: "School Administrator" },
  { value: "gate", label: "Gate Security" },
  { value: "delegate", label: "Delegate Guardian" },
  { value: "sysadmin", label: "System Administrator" },
];

const ROLE_LABELS: Record<AppRole, string> = {
  parent: "Parent / Guardian",
  teacher: "Teacher",
  school_admin: "School Administrator",
  delegate: "Delegate Guardian",
  system_admin: "System Administrator",
  gate_security: "Gate Security",
};

const SCREEN_META: Record<MobileScreen, { label: string; subtitle: string; role: AppRole | null }> = {
  home: { label: "Home", subtitle: "Overview", role: null },
  "parent-dashboard": { label: "Dashboard", subtitle: "Guardian", role: "parent" },
  "parent-children": { label: "My Children", subtitle: "Guardian", role: "parent" },
  "parent-homework": { label: "Homework", subtitle: "Guardian", role: "parent" },
  "parent-notifications": { label: "Notifications", subtitle: "Guardian", role: "parent" },
  "parent-messages": { label: "Messages", subtitle: "Guardian", role: "parent" },
  "parent-absences": { label: "Absences", subtitle: "Guardian", role: "parent" },
  "parent-absence-report": { label: "Absence Report", subtitle: "Guardian", role: "parent" },
  "teacher-dashboard": { label: "Dashboard", subtitle: "Classroom", role: "teacher" },
  "teacher-classes": { label: "My Classes", subtitle: "Classroom", role: "teacher" },
  "teacher-attendance": { label: "Attendance", subtitle: "Classroom", role: "teacher" },
  "teacher-homework": { label: "Homework", subtitle: "Classroom", role: "teacher" },
  "teacher-quizzes": { label: "Quizzes", subtitle: "Classroom", role: "teacher" },
  "teacher-announcements": { label: "Announcements", subtitle: "Classroom", role: "teacher" },
  "teacher-parent-notifications": { label: "Parent Notifications", subtitle: "Classroom", role: "teacher" },
  "admin-dashboard": { label: "Dashboard", subtitle: "School", role: "school_admin" },
  "admin-school-overview": { label: "School Overview", subtitle: "School", role: "school_admin" },
  "admin-learners": { label: "Learners", subtitle: "School", role: "school_admin" },
  "admin-classes": { label: "Classes", subtitle: "School", role: "school_admin" },
  "admin-teachers": { label: "Teachers", subtitle: "School", role: "school_admin" },
  "admin-attendance": { label: "Attendance", subtitle: "School", role: "school_admin" },
  "admin-parents-guardians": { label: "Parents & Guardians", subtitle: "School", role: "school_admin" },
  "admin-link-requests": { label: "Link Requests", subtitle: "School", role: "school_admin" },
  "admin-reports": { label: "Reports", subtitle: "School", role: "school_admin" },
  "delegate-dashboard": { label: "Dashboard", subtitle: "Pickup", role: "delegate" },
  "delegate-child-selector": { label: "Child Selector", subtitle: "Pickup", role: "delegate" },
  "delegate-pickup-vouchers": { label: "Pickup Vouchers", subtitle: "Pickup", role: "delegate" },
  "security-dashboard": { label: "Dashboard", subtitle: "Gate", role: "gate_security" },
  "security-scanner": { label: "Scanner", subtitle: "Gate", role: "gate_security" },
  "security-audit-logs": { label: "Audit Logs", subtitle: "Gate", role: "gate_security" },
  "system-overview": { label: "Overview", subtitle: "Platform", role: "system_admin" },
  "system-user-management": { label: "User Management", subtitle: "Platform", role: "system_admin" },
  "system-schools-management": { label: "Schools Management", subtitle: "Platform", role: "system_admin" },
  "system-audit-logs": { label: "Audit Logs", subtitle: "Platform", role: "system_admin" },
  "child-mode": { label: "Child Mode", subtitle: "Learner", role: "parent" },
};

const SCREEN_GROUPS: Array<{ group: string; items: MobileScreen[] }> = [
  { group: "Overview", items: ["home"] },
  {
    group: "Parent",
    items: [
      "parent-dashboard",
      "parent-children",
      "parent-homework",
      "parent-notifications",
      "parent-messages",
      "parent-absences",
      "parent-absence-report",
      "child-mode",
    ],
  },
  {
    group: "Teacher",
    items: [
      "teacher-dashboard",
      "teacher-classes",
      "teacher-attendance",
      "teacher-homework",
      "teacher-quizzes",
      "teacher-announcements",
      "teacher-parent-notifications",
    ],
  },
  {
    group: "Admin",
    items: [
      "admin-dashboard",
      "admin-school-overview",
      "admin-learners",
      "admin-classes",
      "admin-teachers",
      "admin-attendance",
      "admin-parents-guardians",
      "admin-link-requests",
      "admin-reports",
    ],
  },
  {
    group: "Delegate",
    items: ["delegate-dashboard", "delegate-child-selector", "delegate-pickup-vouchers"],
  },
  {
    group: "Security",
    items: ["security-dashboard", "security-scanner", "security-audit-logs"],
  },
  {
    group: "System",
    items: ["system-overview", "system-user-management", "system-schools-management", "system-audit-logs"],
  },
];

const DEFAULT_SCREEN_BY_ROLE: Record<AppRole, MobileScreen> = {
  parent: "parent-dashboard",
  teacher: "teacher-dashboard",
  school_admin: "admin-dashboard",
  delegate: "delegate-dashboard",
  system_admin: "system-overview",
  gate_security: "security-dashboard",
};

const HERO_FEATURES = [
  "QR-code & OTP verified child pick-up",
  "Delegate guardian management with expiry",
  "Real-time attendance & absence reporting",
  "Child mode with grade-based learning portal",
];

interface ViewModel {
  title: string;
  subtitle: string;
  metrics: Array<{ label: string; value: string; tone?: "success" | "warning" | "info" | "primary" }>;
  sections: Array<
    | { kind: "text"; title: string; badge: string; text: string }
    | { kind: "list" | "grid"; title: string; badge: string; items: Array<{ title: string; meta?: string; pill?: string; tone?: "success" | "warning" | "info" | "primary" }> }
  >;
  quickActions: string[];
}

export default function App() {
  const { width } = useWindowDimensions();
  const isWide = width >= 900;

  const [role, setRole] = useState<LoginRole | "">("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<LocalSession | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeScreen, setActiveScreen] = useState<MobileScreen>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loadingView, setLoadingView] = useState(false);
  const [viewModel, setViewModel] = useState<ViewModel | null>(null);

  const loginHint = useMemo(() => (role ? ROLE_EMAILS[role] : ""), [role]);
  const activeScreenMeta = SCREEN_META[activeScreen];
  const canAccessScreen = activeScreen === "home" || !activeScreenMeta.role || session?.user.role === activeScreenMeta.role;

  useEffect(() => {
    if (!session) {
      setViewModel(null);
      return;
    }

    if (!canAccessScreen) {
      setViewModel({
        title: `${activeScreenMeta.label} Console`,
        subtitle: "Role locked",
        metrics: [],
        sections: [
          {
            kind: "text",
            title: "Locked view",
            badge: "Role based",
            text: `You are signed in as ${session.user.full_name} (${ROLE_LABELS[session.user.role]}). Sign in with the matching role to load live backend data for this sidebar item.`,
          },
        ],
        quickActions: [],
      });
      return;
    }

    let cancelled = false;

    async function load() {
      if (!session) {
        return;
      }

      try {
        setLoadingView(true);
        setError(null);
        const model = await buildViewModel(session, activeScreen);
        if (!cancelled) {
          setViewModel(model);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Failed to load data");
        }
      } finally {
        if (!cancelled) {
          setLoadingView(false);
        }
      }

    }
    void load();

    return () => {
      cancelled = true;
    };
  }, [session, activeScreen, canAccessScreen]);

  const handleRoleChange = (nextRole: LoginRole) => {
    setRole(nextRole);
    if (ROLE_EMAILS[nextRole]) {
      setEmail(ROLE_EMAILS[nextRole]);
      setPassword("EduSecure@1234");
      setError(null);
    }
  };

  const submit = async () => {
    try {
      setSubmitting(true);
      setError(null);
      const nextSession = await localApi.auth.login(email.trim(), password);
      setStoredToken(nextSession.access_token);
      setSession(nextSession);
      setActiveScreen(DEFAULT_SCREEN_BY_ROLE[nextSession.user.role]);
      setSidebarOpen(false);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const signOut = async () => {
    try {
      await localApi.auth.logout().catch(() => null);
    } finally {
      setStoredToken(null);
      setSession(null);
      setRole("");
      setEmail("");
      setPassword("");
      setActiveScreen("home");
      setSidebarOpen(false);
      setViewModel(null);
    }
  };

  if (!session) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
          <View style={[styles.shell, isWide ? styles.shellWide : styles.shellStack]}>
            <View style={[styles.heroPanel, isWide ? styles.heroPanelWide : styles.heroPanelStack]}>
              <View style={styles.heroInner}>
                <View style={styles.heroLogoRow}>
                  <View style={styles.heroLogoImg}>
                    <ShieldIcon />
                  </View>
                  <View>
                    <Text style={styles.heroLogoName}>
                      EduSecure
                    </Text>
                    <Text style={styles.heroLogoTagline}>Secure School Pickup & Operations Platform</Text>
                  </View>
                </View>

                <Text style={styles.heroHeadline}>
                  Safe. Connected.
                  <Text style={styles.heroHeadlineAccent}> Every Child, Every Day.</Text>
                </Text>

                <Text style={styles.heroSub}>
                  A complete school operations platform that keeps children safe through verified pick-up protocols, delegate management, and real-time guardian communication.
                </Text>

                <View style={styles.heroFeatureList}>
                  {HERO_FEATURES.map((feature) => (
                    <View key={feature} style={styles.heroFeatureRow}>
                      <View style={styles.heroFeatureIcon}>
                        <CheckIcon />
                      </View>
                      <Text style={styles.heroFeatureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <View style={[styles.formPanel, isWide ? styles.formPanelWide : styles.formPanelStack]}>
              <View style={styles.formWrap}>
                <Text style={styles.formTitle}>Welcome back</Text>
                <Text style={styles.formSub}>Sign in to your EduSecure dashboard</Text>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Sign in as</Text>
                  <View style={styles.roleGrid}>
                    {ROLE_OPTIONS.map((item) => {
                      const selected = item.value === role;
                      return (
                        <Pressable
                          key={item.value}
                          onPress={() => handleRoleChange(item.value)}
                          style={[styles.rolePill, selected && styles.rolePillActive]}
                        >
                          <Text style={[styles.rolePillText, selected && styles.rolePillTextActive]}>
                            {item.label}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Email Address</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="user@edusecure.ac.za"
                    placeholderTextColor="#94a3b8"
                    style={styles.input}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Password</Text>
                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    placeholder="••••••••"
                    placeholderTextColor="#94a3b8"
                    style={styles.input}
                  />
                </View>

                {error ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                ) : null}

                <Pressable
                  onPress={submit}
                  disabled={submitting || !email || !password}
                  style={({ pressed }) => [
                    styles.loginButton,
                    (submitting || !email || !password) && styles.loginButtonDisabled,
                    pressed && !submitting && email && password ? styles.loginButtonPressed : null,
                  ]}
                >
                  {submitting ? (
                    <View style={styles.loginButtonContent}>
                      <ActivityIndicator color="#ffffff" />
                      <Text style={styles.loginButtonText}>Authenticating...</Text>
                    </View>
                  ) : (
                    <Text style={styles.loginButtonText}>Sign In to Dashboard →</Text>
                  )}
                </Pressable>

                <View style={styles.loginFoot}>
                  <Text style={styles.loginFootMuted}>Forgot password? </Text>
                  <Text style={styles.loginFootLink}>Reset here</Text>
                </View>

                <View style={styles.demoRow}>
                  <Text style={styles.demoLabel}>Demo hint</Text>
                  <Text style={styles.demoValue}>{loginHint || "Select a role to auto-fill the demo login."}</Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.appShell}>
        <View style={styles.topbar}>
          <View style={styles.topbarLeft}>
            <Pressable onPress={() => setSidebarOpen((value) => !value)} style={styles.menuButton}>
              <Text style={styles.menuButtonText}>{sidebarOpen && !isWide ? "×" : "☰"}</Text>
            </Pressable>
            <View>
              <Text style={styles.topbarTitle}>EduSecure</Text>
              <Text style={styles.topbarCrumb}>
                {activeScreenMeta.label} / {activeScreenMeta.subtitle}
              </Text>
            </View>
          </View>
          <View style={styles.topbarRight}>
            <View style={styles.topbarUserBox}>
              <Text style={styles.topbarUserName}>{session.user.full_name}</Text>
              <Text style={styles.topbarUserRole}>{ROLE_LABELS[session.user.role]}</Text>
            </View>
            <Pressable onPress={signOut} style={styles.signOutButton}>
              <Text style={styles.signOutButtonText}>Sign out</Text>
            </Pressable>
          </View>
        </View>

        {isWide || sidebarOpen ? (
          <View style={styles.sidebarContainer}>
            <SidebarContent
              session={session}
              activeScreen={activeScreen}
              onSelect={(nextScreen) => {
                setActiveScreen(nextScreen);
                if (!isWide) {
                  setSidebarOpen(false);
                }
              }}
            />
          </View>
        ) : null}

        <ScrollView contentContainerStyle={styles.dashboardContent} showsVerticalScrollIndicator={false}>
          {loadingView ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color="#26b8a8" />
              <Text style={styles.loadingText}>Loading live backend data...</Text>
            </View>
          ) : null}

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {viewModel ? <DashboardView model={viewModel} session={session} /> : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

async function buildViewModel(session: LocalSession, activeScreen: MobileScreen): Promise<ViewModel> {
  if (activeScreen === "home") {
    return {
      title: SCREEN_META.home.label,
      subtitle: "Same web backend",
      metrics: [
        { label: "Signed in as", value: session.user.full_name },
        { label: "Backend role", value: ROLE_LABELS[session.user.role] },
        { label: "School", value: session.profile.school_id ? String(session.profile.school_id) : "Linked account" },
      ],
      sections: [
        {
          kind: "grid",
          title: "All sidebar features",
          badge: "Same web backend",
          items: SCREEN_GROUPS.flatMap((group) =>
            group.items.map((screen) => ({
              title: SCREEN_META[screen].label,
              meta: SCREEN_META[screen].subtitle,
              pill: SCREEN_META[screen].role === session.user.role || SCREEN_META[screen].role === null ? "Available" : "Locked",
            })),
          ),
        },
        {
          kind: "grid",
          title: "Platform shortcuts",
          badge: "Quick access",
          items: [
            { title: "Parent Dashboard" },
            { title: "Teacher Console" },
            { title: "Admin Console" },
            { title: "Delegate Pickup" },
            { title: "Gate Security" },
            { title: "System Overview" },
          ],
        },
      ],
      quickActions: ["Refresh Session", "Open Backend Data", "Sign Out"],
    };
  }

  if (SCREEN_META[activeScreen].role && SCREEN_META[activeScreen].role !== session.user.role) {
    return {
      title: `${SCREEN_META[activeScreen].label} Console`,
      subtitle: "Role locked",
      metrics: [],
      sections: [
        {
          kind: "text",
          title: "Locked view",
          badge: "Role based",
          text: `Sign in with the ${SCREEN_META[activeScreen].label.toLowerCase()} role to load live backend data for this sidebar item.`,
        },
      ],
      quickActions: [],
    };
  }

  switch (activeScreen) {
    // Parent screens
    case "parent-dashboard":
      return buildParentDashboard();
    case "parent-children":
      return buildParentChildren();
    case "parent-homework":
      return buildParentHomework();
    case "parent-notifications":
      return buildParentNotifications();
    case "parent-messages":
      return buildParentMessages();
    case "parent-absences":
      return buildParentAbsences();
    case "parent-absence-report":
      return buildParentAbsenceReport();
    case "child-mode":
      return buildChildMode();
    // Teacher screens
    case "teacher-dashboard":
      return buildTeacherDashboard(session);
    case "teacher-classes":
      return buildTeacherClasses(session);
    case "teacher-attendance":
      return buildTeacherAttendance(session);
    case "teacher-homework":
      return buildTeacherHomework();
    case "teacher-quizzes":
      return buildTeacherQuizzes();
    case "teacher-announcements":
      return buildTeacherAnnouncements();
    case "teacher-parent-notifications":
      return buildTeacherParentNotifications();
    // Admin screens
    case "admin-dashboard":
      return buildAdminDashboard(session);
    case "admin-school-overview":
      return buildAdminSchoolOverview(session);
    case "admin-learners":
      return buildAdminLearners(session);
    case "admin-classes":
      return buildAdminClasses();
    case "admin-teachers":
      return buildAdminTeachers();
    case "admin-attendance":
      return buildAdminAttendance(session);
    case "admin-parents-guardians":
      return buildAdminParentsGuardians();
    case "admin-link-requests":
      return buildAdminLinkRequests();
    case "admin-reports":
      return buildAdminReports(session);
    // Delegate screens
    case "delegate-dashboard":
      return buildDelegateDashboard();
    case "delegate-child-selector":
      return buildDelegateChildSelector();
    case "delegate-pickup-vouchers":
      return buildDelegatePickupVouchers();
    // Security screens
    case "security-dashboard":
      return buildSecurityDashboard();
    case "security-scanner":
      return buildSecurityScanner();
    case "security-audit-logs":
      return buildSecurityAuditLogs();
    // System screens
    case "system-overview":
      return buildSystemOverview(session);
    case "system-user-management":
      return buildSystemUserManagement();
    case "system-schools-management":
      return buildSystemSchoolsManagement();
    case "system-audit-logs":
      return buildSystemAuditLogs();
    default:
      return buildViewModel(session, "home");
  }
}

// Parent screens - individual builders
async function buildParentDashboard(): Promise<ViewModel> {
  const [dashboard, teachers] = await Promise.all([localApi.parents.dashboard(), localApi.parents.teachers()]);

  return {
    title: "Dashboard",
    subtitle: "Guardian",
    metrics: [
      { label: "Children", value: String(dashboard.children.length) },
      { label: "Delegates", value: String(dashboard.active_delegate_count) },
      { label: "Unread notifications", value: String(dashboard.unread_notification_count), tone: "success" },
      { label: "Teachers", value: String(teachers.length) },
    ],
    sections: [
      {
        kind: "list",
        title: "My Children",
        badge: "Linked family",
        items: dashboard.children.map((child) => ({
          title: child.full_name,
          meta: `${child.grade} · ${child.class_name}`,
          pill: "View",
        })),
      },
      {
        kind: "list",
        title: "Recent Homework",
        badge: "Latest",
        items: dashboard.homework.slice(0, 3).map((item) => ({
          title: item.title,
          meta: item.class_name,
          pill: item.due_date ? item.due_date : "Open",
        })),
      },
      {
        kind: "list",
        title: "Teachers",
        badge: "Contacts",
        items: teachers.slice(0, 5).map((teacher) => ({
          title: teacher.full_name,
          meta: teacher.class_name,
        })),
      },
    ],
    quickActions: ["Report Absence", "View Messages", "Link Child"],
  };
}

async function buildParentChildren(): Promise<ViewModel> {
  const [dashboard] = await Promise.all([localApi.parents.dashboard()]);

  return {
    title: "My Children",
    subtitle: "Guardian",
    metrics: [
      { label: "Total children", value: String(dashboard.children.length) },
      { label: "Linked family", value: "All linked" },
    ],
    sections: [
      {
        kind: "list",
        title: "Children",
        badge: "Your family",
        items: dashboard.children.map((child) => ({
          title: child.full_name,
          meta: `${child.grade} · ${child.class_name}`,
          pill: "Linked",
          tone: "success",
        })),
      },
    ],
    quickActions: ["Link New Child", "View Child Mode"],
  };
}

async function buildParentHomework(): Promise<ViewModel> {
  const homework = await localApi.parents.homework();

  return {
    title: "Homework",
    subtitle: "Guardian",
    metrics: [
      { label: "Total assignments", value: String(homework.length) },
      { label: "Unread", value: String(homework.filter((h) => !h.read_at).length), tone: "warning" },
    ],
    sections: [
      {
        kind: "list",
        title: "All Assignments",
        badge: "Homework",
        items: homework.map((item) => ({
          title: item.title,
          meta: item.class_name,
          pill: item.read_at ? "Read" : "New",
          tone: item.read_at ? undefined : "success",
        })),
      },
    ],
    quickActions: ["Mark All Read"],
  };
}

async function buildParentNotifications(): Promise<ViewModel> {
  const notifications = await localApi.parents.notifications();

  return {
    title: "Notifications",
    subtitle: "Guardian",
    metrics: [
      { label: "Total", value: String(notifications.length) },
      { label: "Unread", value: String(notifications.filter((n) => !n.read_at).length), tone: "warning" },
    ],
    sections: [
      {
        kind: "list",
        title: "Notifications",
        badge: "Feed",
        items: notifications.map((item) => ({
          title: item.title,
          meta: item.category,
          pill: item.read_at ? "Read" : "New",
          tone: item.read_at ? undefined : "success",
        })),
      },
    ],
    quickActions: ["Mark All Read"],
  };
}

async function buildParentMessages(): Promise<ViewModel> {
  const teachers = await localApi.parents.teachers();

  return {
    title: "Messages",
    subtitle: "Guardian",
    metrics: [
      { label: "Teachers", value: String(teachers.length) },
    ],
    sections: [
      {
        kind: "list",
        title: "Teacher Contacts",
        badge: "Messaging",
        items: teachers.map((teacher) => ({
          title: teacher.full_name,
          meta: `${teacher.class_name} · ${teacher.email}`,
          pill: "Message",
        })),
      },
    ],
    quickActions: ["Compose Message"],
  };
}

async function buildParentAbsences(): Promise<ViewModel> {
  const attendance = await localApi.parents.attendance();

  return {
    title: "Absences",
    subtitle: "Guardian",
    metrics: [
      { label: "Total records", value: String(attendance.length) },
      { label: "Absent", value: String(attendance.filter((a) => a.status === "absent").length), tone: "warning" },
      { label: "Late", value: String(attendance.filter((a) => a.status === "late").length) },
    ],
    sections: [
      {
        kind: "list",
        title: "Attendance History",
        badge: "Records",
        items: attendance.slice(0, 10).map((item) => ({
          title: item.full_name,
          meta: `${item.attendance_date} · ${item.status || "unknown"}`,
          pill: item.status || "unknown",
          tone: item.status === "absent" ? "warning" : item.status === "present" ? "success" : undefined,
        })),
      },
    ],
    quickActions: ["Report Absence"],
  };
}

async function buildParentAbsenceReport(): Promise<ViewModel> {
  return {
    title: "Report Absence",
    subtitle: "Guardian",
    metrics: [],
    sections: [
      {
        kind: "text",
        title: "Submit Absence Report",
        badge: "Guardian",
        text: "Report an absence for your child. Provide the date, child name, and reason for absence. Your report will be submitted to the school.",
      },
    ],
    quickActions: ["Submit Report"],
  };
}

async function buildChildMode(): Promise<ViewModel> {
  return {
    title: "Child Mode",
    subtitle: "Learner",
    metrics: [],
    sections: [
      {
        kind: "text",
        title: "Child Portal",
        badge: "Learning",
        text: "Child mode provides a safe, grade-appropriate learning environment with access to quizzes, homework, and educational content tailored to the child's grade level.",
      },
    ],
    quickActions: ["Enter Child Mode"],
  };
}

// Teacher screens - individual builders
async function buildTeacherDashboard(session: LocalSession): Promise<ViewModel> {
  const schoolId = session.profile.school_id;
  const [quizzes, children, homework] = await Promise.all([
    localApi.teachers.quizzes(),
    schoolId ? localApi.teachers.children(schoolId) : Promise.resolve([] as Child[]),
    localApi.teachers.homework(),
  ]);

  return {
    title: "Dashboard",
    subtitle: "Classroom",
    metrics: [
      { label: "Students", value: String(children.length) },
      { label: "Quizzes", value: String(quizzes.length) },
      { label: "Homework", value: String(homework.length) },
    ],
    sections: [
      {
        kind: "list",
        title: "My Students",
        badge: "Class",
        items: children.slice(0, 6).map((child) => ({
          title: child.full_name,
          meta: `${child.grade} · ${child.class_name}`,
          pill: "Mark attendance",
        })),
      },
      {
        kind: "list",
        title: "Quizzes",
        badge: "Assessments",
        items: quizzes.slice(0, 3).map((quiz) => ({
          title: quiz.title,
          meta: `${quiz.question_count} questions · ${quiz.class_name}`,
          pill: quiz.review_mode,
        })),
      },
      {
        kind: "list",
        title: "Homework",
        badge: "Assignments",
        items: homework.slice(0, 3).map((item) => ({
          title: item.title,
          meta: item.class_name,
          pill: item.due_date ? item.due_date : "Open",
        })),
      },
    ],
    quickActions: ["Post Homework", "Create Quiz", "Submit Attendance"],
  };
}

async function buildTeacherClasses(session: LocalSession): Promise<ViewModel> {
  const schoolId = session.profile.school_id;
  const children = await (schoolId ? localApi.teachers.children(schoolId) : Promise.resolve([] as Child[]));
  const grouped: Record<string, Child[]> = {};
  children.forEach((child) => {
    if (!grouped[child.class_name]) grouped[child.class_name] = [];
    grouped[child.class_name].push(child);
  });

  return {
    title: "My Classes",
    subtitle: "Classroom",
    metrics: [
      { label: "Classes", value: String(Object.keys(grouped).length) },
      { label: "Total students", value: String(children.length) },
    ],
    sections: Object.entries(grouped).map(([className, classChildren]) => ({
      kind: "list" as const,
      title: className,
      badge: `${classChildren.length} students`,
      items: classChildren.map((child) => ({
        title: child.full_name,
        meta: `Grade ${child.grade}`,
      })),
    })),
    quickActions: ["Mark Attendance", "Post Homework"],
  };
}

async function buildTeacherAttendance(session: LocalSession): Promise<ViewModel> {
  const schoolId = session.profile.school_id;
  const children = await (schoolId ? localApi.teachers.children(schoolId) : Promise.resolve([] as Child[]));

  return {
    title: "Attendance",
    subtitle: "Classroom",
    metrics: [
      { label: "Students", value: String(children.length) },
    ],
    sections: [
      {
        kind: "list",
        title: "Mark Attendance",
        badge: "Today",
        items: children.map((child) => ({
          title: child.full_name,
          meta: `${child.grade} · ${child.class_name}`,
          pill: "Mark",
        })),
      },
    ],
    quickActions: ["Submit Attendance", "View History"],
  };
}

async function buildTeacherHomework(): Promise<ViewModel> {
  const homework = await localApi.teachers.homework();

  return {
    title: "Homework",
    subtitle: "Classroom",
    metrics: [
      { label: "Assignments", value: String(homework.length) },
    ],
    sections: [
      {
        kind: "list",
        title: "All Assignments",
        badge: "Teacher",
        items: homework.map((item) => ({
          title: item.title,
          meta: item.class_name,
          pill: item.due_date ? item.due_date : "Open",
        })),
      },
    ],
    quickActions: ["Create Homework", "View Submissions"],
  };
}

async function buildTeacherQuizzes(): Promise<ViewModel> {
  const quizzes = await localApi.teachers.quizzes();

  return {
    title: "Quizzes",
    subtitle: "Classroom",
    metrics: [
      { label: "Total quizzes", value: String(quizzes.length) },
    ],
    sections: [
      {
        kind: "list",
        title: "Assessments",
        badge: "Quizzes",
        items: quizzes.map((quiz) => ({
          title: quiz.title,
          meta: `${quiz.question_count} questions · ${quiz.class_name}`,
          pill: quiz.attempt_count > 0 ? `${quiz.attempt_count} taken` : "Not started",
        })),
      },
    ],
    quickActions: ["Create Quiz", "View Results"],
  };
}

async function buildTeacherAnnouncements(): Promise<ViewModel> {
  return {
    title: "Announcements",
    subtitle: "Classroom",
    metrics: [],
    sections: [
      {
        kind: "text",
        title: "Class Announcements",
        badge: "Teacher",
        text: "Post announcements to your classes. Send important updates and messages to students and their guardians.",
      },
    ],
    quickActions: ["Post Announcement"],
  };
}

async function buildTeacherParentNotifications(): Promise<ViewModel> {
  return {
    title: "Parent Notifications",
    subtitle: "Classroom",
    metrics: [],
    sections: [
      {
        kind: "text",
        title: "Contact Parents",
        badge: "Teacher",
        text: "Send notifications to parents and guardians about student progress, assignments, and class activities.",
      },
    ],
    quickActions: ["Send Notification"],
  };
}

function DashboardView({ model, session }: { model: ViewModel; session?: LocalSession | null }) {
  const firstName = session?.user?.full_name ? session.user.full_name.split(" ")[0] : undefined;
  // Special layout for Parent Dashboard to mirror web UI
  if (model.title === "Dashboard" && model.subtitle === "Guardian") {
    const childrenSection = model.sections.find((s) => s.title.toLowerCase().includes("children"));
    const homeworkSection = model.sections.find((s) => s.title.toLowerCase().includes("homework"));
    const notificationsSection = model.sections.find((s) => s.title.toLowerCase().includes("notification"));

    return (
      <>
        <View style={styles.heroBanner}>
          <Text style={styles.heroBannerTitle}>Good morning{firstName ? `, ${firstName}` : ", Guardian"}!</Text>
          <Text style={styles.heroBannerSub}>Here's what's happening with your children today.</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.metricRow}>
            {model.metrics.map((item) => (
              <View key={item.label} style={styles.metricCardLarge}>
                <Text style={styles.metricLabel}>{item.label}</Text>
                <Text style={[styles.metricValue, item.tone === "success" && styles.successText, item.tone === "warning" && styles.warningText, item.tone === "info" && styles.infoText, item.tone === "primary" && styles.primaryText]}>{item.value}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.twoColumnRow}>
          <View style={styles.colLeft}>
            {childrenSection ? (
              <View style={styles.section}>
                <SectionHeader title={childrenSection.title} badge={childrenSection.badge} />
                <View style={styles.listStack}>
                  {('items' in childrenSection && (childrenSection as any).items.length === 0) ? (
                    <View style={styles.emptyBox}><Text style={styles.paragraph}>No linked children found.</Text></View>
                  ) : (
                    ('items' in childrenSection ? (childrenSection as any).items.map((item: any) => (
                      <View key={item.title} style={styles.listRow}>
                        <View style={styles.listBody}>
                          <Text style={styles.listTitle}>{item.title}</Text>
                          {item.meta ? <Text style={styles.listMeta}>{item.meta}</Text> : null}
                        </View>
                        {item.pill ? <Text style={styles.pill}>{item.pill}</Text> : null}
                      </View>
                    )) : null)
                  )}
                </View>
              </View>
            ) : null}

            {/** Quick actions box */}
            {model.quickActions.length > 0 ? (
              <View style={[styles.section, { marginTop: 12 }]}>
                <SectionHeader title="Quick Actions" badge="Shortcuts" />
                <View style={styles.quickGrid}>
                  {model.quickActions.map((action) => (
                    <View key={action} style={styles.actionCard}>
                      <Text style={styles.actionText}>{action}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.colRight}>
            <View style={styles.section}>
              <SectionHeader title="Combined Activities" badge="Homework  ·  Notifications" />
              <View style={{ minHeight: 180 }}>
                {homeworkSection && 'items' in homeworkSection && (homeworkSection as any).items.length > 0 ? (
                  (homeworkSection as any).items.slice(0, 5).map((h: any) => (
                    <View key={h.title} style={styles.listRow}>
                      <View style={styles.listBody}>
                        <Text style={styles.listTitle}>{h.title}</Text>
                        {h.meta ? <Text style={styles.listMeta}>{h.meta}</Text> : null}
                      </View>
                      {h.pill ? <Text style={styles.pill}>{h.pill}</Text> : null}
                    </View>
                  ))
                ) : (
                  <Text style={[styles.paragraph, { padding: 12 }]}>No current homework</Text>
                )}
              </View>
            </View>

            {notificationsSection && 'items' in notificationsSection ? (
              <View style={[styles.section, { marginTop: 12 }]}>
                <SectionHeader title="Recent Notifications" badge={notificationsSection.badge} />
                <View style={styles.listStack}>
                  {(notificationsSection as any).items.slice(0, 6).map((n: any) => (
                    <View key={n.title} style={styles.listRow}>
                      <View style={styles.listBody}>
                        <Text style={styles.listTitle}>{n.title}</Text>
                        {n.meta ? <Text style={styles.listMeta}>{n.meta}</Text> : null}
                      </View>
                      {n.pill ? <Text style={styles.pill}>{n.pill}</Text> : null}
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <View style={styles.section}>
        <SectionHeader title={model.title} badge={model.subtitle} />
        <View style={styles.metricRow}>
          {model.metrics.map((item) => (
            <View key={item.label} style={styles.metricCard}>
              <Text style={styles.metricLabel}>{item.label}</Text>
              <Text style={[styles.metricValue, item.tone === "success" && styles.successText, item.tone === "warning" && styles.warningText, item.tone === "info" && styles.infoText, item.tone === "primary" && styles.primaryText]}>{item.value}</Text>
            </View>
          ))}
        </View>
      </View>

      {model.sections.map((section) => (
        <View key={section.title} style={styles.section}>
          <SectionHeader title={section.title} badge={section.badge} />
          {section.kind === "text" ? (
            <Text style={styles.paragraph}>{section.text}</Text>
          ) : (
            <View style={section.kind === "grid" ? styles.quickGrid : styles.listStack}>
              {section.items.map((item) => (
                <View key={`${section.title}-${item.title}`} style={section.kind === "grid" ? styles.quickCard : styles.listRow}>
                  {section.kind === "grid" ? (
                    <Text style={styles.quickLabel}>{item.title}</Text>
                  ) : (
                    <>
                      <View style={styles.listBody}>
                        <Text style={styles.listTitle}>{item.title}</Text>
                        {item.meta ? <Text style={styles.listMeta}>{item.meta}</Text> : null}
                      </View>
                      {item.pill ? (
                        <Text style={[item.tone === "success" ? styles.successPill : styles.pill]}>{item.pill}</Text>
                      ) : null}
                    </>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      ))}

      {model.quickActions.length > 0 ? (
        <View style={styles.section}>
          <SectionHeader title="Quick actions" badge="Same as web" />
          <View style={styles.quickGrid}>
            {model.quickActions.map((action) => (
              <View key={action} style={styles.actionCard}>
                <Text style={styles.actionText}>{action}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </>
  );
}

// Admin screens - individual builders
async function buildAdminDashboard(session: LocalSession): Promise<ViewModel> {
  const [delegates, teachers, attendanceReview] = await Promise.all([
    localApi.admin.delegates(),
    localApi.admin.teachers(),
    session.profile.school_id
      ? localApi.admin.attendanceReview(new Date().toISOString().slice(0, 10))
      : Promise.resolve({ date: new Date().toISOString().slice(0, 10), classes: [] as AdminAttendanceClass[] }),
  ]);

  return {
    title: "Dashboard",
    subtitle: "School",
    metrics: [
      { label: "Delegates", value: String(delegates.length) },
      { label: "Teachers", value: String(teachers.length) },
      { label: "Classes", value: String(attendanceReview.classes.length) },
      { label: "Status", value: "Healthy", tone: "success" },
    ],
    sections: [
      {
        kind: "list",
        title: "Pending Delegates",
        badge: "Review",
        items: delegates.slice(0, 6).map((item) => ({
          title: item.delegate_name,
          meta: `${item.parent_name} · ${item.relationship ?? ""}`,
          pill: item.status,
        })),
      },
      {
        kind: "list",
        title: "Teachers",
        badge: "Staff",
        items: teachers.slice(0, 5).map((teacher) => ({
          title: teacher.full_name,
          meta: teacher.email,
        })),
      },
      {
        kind: "list",
        title: "Today's Attendance",
        badge: attendanceReview.date,
        items: attendanceReview.classes.slice(0, 5).map((entry) => ({
          title: entry.class_name,
          meta: `Present ${entry.present} · Absent ${entry.absent}`,
        })),
      },
    ],
    quickActions: ["Review Attendance", "Approve Delegates"],
  };
}

async function buildAdminSchoolOverview(session: LocalSession): Promise<ViewModel> {
  const [children, teachers] = await Promise.all([
    session.profile.school_id ? localApi.teachers.children(session.profile.school_id) : Promise.resolve([] as Child[]),
    localApi.admin.teachers(),
  ]);

  return {
    title: "School Overview",
    subtitle: "School",
    metrics: [
      { label: "Students", value: String(children.length) },
      { label: "Teachers", value: String(teachers.length) },
    ],
    sections: [
      {
        kind: "text",
        title: "School Statistics",
        badge: "Overview",
        text: `Your school has ${children.length} students and ${teachers.length} teachers. Monitor operational health and manage all school resources from this dashboard.`,
      },
    ],
    quickActions: ["View Learners", "View Teachers"],
  };
}

async function buildAdminLearners(session: LocalSession): Promise<ViewModel> {
  const children = await (session.profile.school_id ? localApi.teachers.children(session.profile.school_id) : Promise.resolve([] as Child[]));

  return {
    title: "Learners",
    subtitle: "School",
    metrics: [
      { label: "Total learners", value: String(children.length) },
    ],
    sections: [
      {
        kind: "list",
        title: "All Learners",
        badge: "Students",
        items: children.slice(0, 15).map((child) => ({
          title: child.full_name,
          meta: `${child.grade} · ${child.class_name}`,
        })),
      },
    ],
    quickActions: ["Add Learner", "Manage Links"],
  };
}

async function buildAdminClasses(): Promise<ViewModel> {
  return {
    title: "Classes",
    subtitle: "School",
    metrics: [],
    sections: [
      {
        kind: "text",
        title: "Class Management",
        badge: "Admin",
        text: "Manage classes, grade levels, and class allocations. View class rosters and teacher assignments.",
      },
    ],
    quickActions: ["Create Class", "View Rosters"],
  };
}

async function buildAdminTeachers(): Promise<ViewModel> {
  const teachers = await localApi.admin.teachers();

  return {
    title: "Teachers",
    subtitle: "School",
    metrics: [
      { label: "Total teachers", value: String(teachers.length) },
    ],
    sections: [
      {
        kind: "list",
        title: "Staff",
        badge: "Teachers",
        items: teachers.map((teacher) => ({
          title: teacher.full_name,
          meta: teacher.email,
        })),
      },
    ],
    quickActions: ["Add Teacher", "Manage Permissions"],
  };
}

async function buildAdminAttendance(session: LocalSession): Promise<ViewModel> {
  const attendanceReview = await (session.profile.school_id
    ? localApi.admin.attendanceReview(new Date().toISOString().slice(0, 10))
    : Promise.resolve({ date: new Date().toISOString().slice(0, 10), classes: [] as AdminAttendanceClass[] }));

  return {
    title: "Attendance",
    subtitle: "School",
    metrics: [
      { label: "Classes", value: String(attendanceReview.classes.length) },
      { label: "Present", value: String(attendanceReview.classes.reduce((sum, c) => sum + c.present, 0)) },
    ],
    sections: [
      {
        kind: "list",
        title: "Attendance Review",
        badge: attendanceReview.date,
        items: attendanceReview.classes.map((entry) => ({
          title: entry.class_name,
          meta: `Present ${entry.present} · Absent ${entry.absent} · Total ${entry.total}`,
        })),
      },
    ],
    quickActions: ["View Reports"],
  };
}

async function buildAdminParentsGuardians(): Promise<ViewModel> {
  return {
    title: "Parents & Guardians",
    subtitle: "School",
    metrics: [],
    sections: [
      {
        kind: "text",
        title: "Guardian Management",
        badge: "Admin",
        text: "Manage parent and guardian accounts. View linked children and contact information.",
      },
    ],
    quickActions: ["View List", "Send Messages"],
  };
}

async function buildAdminLinkRequests(): Promise<ViewModel> {
  const delegates = await localApi.admin.delegates("pending");

  return {
    title: "Link Requests",
    subtitle: "School",
    metrics: [
      { label: "Pending", value: String(delegates.length) },
    ],
    sections: [
      {
        kind: "list",
        title: "Delegate Requests",
        badge: "Pending",
        items: delegates.map((item) => ({
          title: item.delegate_name,
          meta: `${item.parent_name} · ${item.relationship ?? ""}`,
          pill: "Review",
        })),
      },
    ],
    quickActions: ["Approve All", "Reject All"],
  };
}

async function buildAdminReports(session: LocalSession): Promise<ViewModel> {
  const audit = await localApi.admin.audit(30);

  return {
    title: "Reports",
    subtitle: "School",
    metrics: [
      { label: "Audit entries", value: String(audit.length) },
    ],
    sections: [
      {
        kind: "list",
        title: "Recent Activity",
        badge: "Audit",
        items: audit.slice(0, 10).map((entry) => ({
          title: entry.action,
          meta: entry.target ?? "n/a",
          pill: new Date(entry.created_at).toLocaleTimeString(),
        })),
      },
    ],
    quickActions: ["Generate Report", "Export Data"],
  };
}

// Delegate screens - individual builders
async function buildDelegateDashboard(): Promise<ViewModel> {
  const [children, passes] = await Promise.all([localApi.delegates.children(), localApi.delegates.passes()]);

  return {
    title: "Dashboard",
    subtitle: "Pickup",
    metrics: [
      { label: "Children", value: String(children.length) },
      { label: "Active passes", value: String(passes.filter((p) => p.status === "active").length) },
      { label: "Used passes", value: String(passes.filter((p) => p.status === "used").length), tone: "success" },
    ],
    sections: [
      {
        kind: "list",
        title: "Approved Children",
        badge: "Pickup",
        items: children.map((child) => ({
          title: child.full_name,
          meta: `${child.grade} · ${child.class_name}`,
          pill: "Eligible",
          tone: "success",
        })),
      },
      {
        kind: "list",
        title: "Recent Vouchers",
        badge: "History",
        items: passes.slice(0, 5).map((pass) => ({
          title: pass.child?.full_name ?? "Unknown",
          meta: pass.kind.toUpperCase(),
          pill: pass.status,
        })),
      },
    ],
    quickActions: ["Generate Voucher", "View History"],
  };
}

async function buildDelegateChildSelector(): Promise<ViewModel> {
  const children = await localApi.delegates.children();

  return {
    title: "Child Selector",
    subtitle: "Pickup",
    metrics: [
      { label: "Available", value: String(children.length) },
    ],
    sections: [
      {
        kind: "list",
        title: "Select Child",
        badge: "Pickup",
        items: children.map((child) => ({
          title: child.full_name,
          meta: `${child.grade} · ${child.class_name}`,
          pill: "Select",
        })),
      },
    ],
    quickActions: ["Generate Voucher"],
  };
}

async function buildDelegatePickupVouchers(): Promise<ViewModel> {
  const passes = await localApi.delegates.passes();

  return {
    title: "Pickup Vouchers",
    subtitle: "Pickup",
    metrics: [
      { label: "Total", value: String(passes.length) },
      { label: "Active", value: String(passes.filter((p) => p.status === "active").length), tone: "success" },
      { label: "Used", value: String(passes.filter((p) => p.status === "used").length), tone: "info" },
    ],
    sections: [
      {
        kind: "list",
        title: "All Vouchers",
        badge: "QR & OTP",
        items: passes.map((pass) => ({
          title: pass.child?.full_name ?? "Unknown",
          meta: `${pass.kind.toUpperCase()} · ${pass.code}`,
          pill: pass.status,
          tone: pass.status === "active" ? "success" : pass.status === "used" ? "info" : undefined,
        })),
      },
    ],
    quickActions: ["Generate New", "Refresh"],
  };
}

// Security screens - individual builders
async function buildSecurityDashboard(): Promise<ViewModel> {
  const [passes, audit] = await Promise.all([localApi.security.passes(), localApi.system.audit(20)]);

  return {
    title: "Dashboard",
    subtitle: "Gate",
    metrics: [
      { label: "Active passes", value: String(passes.filter((p) => p.status === "active").length) },
      { label: "Used today", value: String(passes.filter((p) => p.status === "used").length) },
      { label: "Rejected", value: String(audit.filter((a) => a.action.includes("rejected")).length), tone: "warning" },
    ],
    sections: [
      {
        kind: "list",
        title: "Active Passes",
        badge: "Current",
        items: passes.slice(0, 8).map((pass) => ({
          title: pass.child?.full_name ?? "Unknown",
          meta: `${pass.kind.toUpperCase()} · Expires: ${new Date(pass.expires_at).toLocaleTimeString()}`,
          pill: pass.status,
          tone: "success",
        })),
      },
    ],
    quickActions: ["Scan QR", "Enter OTP"],
  };
}

async function buildSecurityScanner(): Promise<ViewModel> {
  return {
    title: "Scanner",
    subtitle: "Gate",
    metrics: [],
    sections: [
      {
        kind: "text",
        title: "Pickup Verification",
        badge: "QR / OTP",
        text: "Scan QR codes or enter OTP codes to verify pickup tokens. Approve or reject requests from delegated pickups.",
      },
    ],
    quickActions: ["Start Scan", "Manual Entry"],
  };
}

async function buildSecurityAuditLogs(): Promise<ViewModel> {
  const audit = await localApi.system.audit(50);

  return {
    title: "Audit Logs",
    subtitle: "Gate",
    metrics: [
      { label: "Total events", value: String(audit.length) },
      { label: "Rejected", value: String(audit.filter((a) => a.action.includes("rejected")).length), tone: "warning" },
    ],
    sections: [
      {
        kind: "list",
        title: "Recent Activity",
        badge: "Gate Security",
        items: audit.slice(0, 15).map((entry) => ({
          title: entry.action,
          meta: entry.target ?? "n/a",
          pill: new Date(entry.created_at).toLocaleTimeString(),
        })),
      },
    ],
    quickActions: ["Export Log"],
  };
}

// System screens - individual builders
async function buildSystemOverview(session: LocalSession): Promise<ViewModel> {
  const [audit, teachers] = await Promise.all([localApi.system.audit(20), localApi.admin.teachers()]);

  return {
    title: "Overview",
    subtitle: "Platform",
    metrics: [
      { label: "Teachers", value: String(teachers.length) },
      { label: "Audit events", value: String(audit.length), tone: "success" },
      { label: "Status", value: "Operational", tone: "success" },
    ],
    sections: [
      {
        kind: "text",
        title: "Platform Health",
        badge: "Live",
        text: "All systems operational. Monitor system performance, user activity, and data integrity from this overview.",
      },
      {
        kind: "list",
        title: "Recent Audit Entries",
        badge: "System",
        items: audit.slice(0, 8).map((entry) => ({
          title: entry.action,
          meta: entry.target ?? "System",
          pill: new Date(entry.created_at).toLocaleTimeString(),
        })),
      },
    ],
    quickActions: ["View Full Audit", "System Settings"],
  };
}

async function buildSystemUserManagement(): Promise<ViewModel> {
  const teachers = await localApi.admin.teachers();

  return {
    title: "User Management",
    subtitle: "Platform",
    metrics: [
      { label: "Total users", value: String(teachers.length) },
    ],
    sections: [
      {
        kind: "list",
        title: "System Users",
        badge: "Accounts",
        items: teachers.slice(0, 10).map((user) => ({
          title: user.full_name,
          meta: user.email,
          pill: "Active",
          tone: "success",
        })),
      },
    ],
    quickActions: ["Create User", "Reset Password"],
  };
}

async function buildSystemSchoolsManagement(): Promise<ViewModel> {
  return {
    title: "Schools Management",
    subtitle: "Platform",
    metrics: [],
    sections: [
      {
        kind: "text",
        title: "School Administration",
        badge: "System",
        text: "Manage schools, branches, and organizational units. Configure school settings and access permissions.",
      },
    ],
    quickActions: ["View Schools", "Add School"],
  };
}

async function buildSystemAuditLogs(): Promise<ViewModel> {
  const audit = await localApi.system.audit(100);

  return {
    title: "Audit Logs",
    subtitle: "Platform",
    metrics: [
      { label: "Total entries", value: String(audit.length) },
    ],
    sections: [
      {
        kind: "list",
        title: "System Activity",
        badge: "Complete Log",
        items: audit.slice(0, 20).map((entry) => ({
          title: entry.action,
          meta: `${entry.target ?? "System"} · ${new Date(entry.created_at).toLocaleTimeString()}`,
        })),
      },
    ],
    quickActions: ["Export Logs", "Filter", "Search"],
  };
}

function screenLabel(screen: MobileScreen) {
  return SCREEN_META[screen].label;
}

function SidebarContent({
  session,
  activeScreen,
  onSelect,
}: {
  session: LocalSession;
  activeScreen: MobileScreen;
  onSelect: (screen: MobileScreen) => void;
}) {
  return (
    <View style={styles.sidebarSheet}>
      <View style={styles.sidebarBrandRow}>
        <View style={styles.sidebarBrandIcon}>
          <ShieldIcon />
        </View>
        <View style={styles.sidebarBrandTextWrap}>
          <Text style={styles.sidebarBrandTitle}>EduSecure</Text>
          <Text style={styles.sidebarBrandSub}>Mobile sidebar</Text>
        </View>
      </View>

      <View style={styles.sidebarUserCard}>
        <Text style={styles.sidebarUserName}>{session.user.full_name}</Text>
        <Text style={styles.sidebarUserRole}>{ROLE_LABELS[session.user.role]}</Text>
      </View>

      {SCREEN_GROUPS.map((group) => (
        <View key={group.group} style={styles.sidebarGroup}>
          <Text style={styles.sidebarGroupLabel}>{group.group}</Text>
          <View style={styles.sidebarGroupItems}>
            {group.items.map((screen) => {
              const meta = SCREEN_META[screen];
              const locked = meta.role !== null && meta.role !== session.user.role;
              const active = screen === activeScreen;
              return (
                <Pressable
                  key={screen}
                  onPress={() => onSelect(screen)}
                  style={[styles.sidebarItem, active && styles.sidebarItemActive, locked && styles.sidebarItemLocked]}
                >
                  <View style={styles.sidebarItemTextWrap}>
                    <Text style={[styles.sidebarItemLabel, active && styles.sidebarItemLabelActive]}>{meta.label}</Text>
                    <Text style={[styles.sidebarItemSub, active && styles.sidebarItemSubActive]}>{meta.subtitle}</Text>
                  </View>
                  {locked ? <Text style={styles.sidebarItemBadge}>Locked</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

function SectionHeader({ title, badge }: { title: string; badge: string }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBadge}>{badge}</Text>
    </View>
  );
}

function ShieldIcon() {
  return <Text style={styles.heroIcon}>🛡</Text>;
}

function CheckIcon() {
  return <Text style={styles.checkIcon}>✓</Text>;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  page: {
    minHeight: "100%",
  },
  shell: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  shellWide: {
    flexDirection: "row",
  },
  shellStack: {
    flexDirection: "column",
  },
  heroPanel: {
    backgroundColor: "#ffffff",
  },
  heroPanelWide: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 30,
    paddingVertical: 40,
  },
  heroPanelStack: {
    paddingHorizontal: 22,
    paddingTop: 36,
    paddingBottom: 8,
  },
  heroInner: {
    maxWidth: 480,
    width: "100%",
  },
  heroLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 40,
  },
  heroLogoImg: {
    width: 72,
    height: 72,
    backgroundColor: "#26b8a8",
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#26b8a8",
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  heroIcon: {
    color: "#ffffff",
    fontSize: 28,
    lineHeight: 30,
  },
  checkIcon: {
    color: "#26b8a8",
    fontSize: 13,
    fontWeight: "800",
  },
  heroLogoName: {
    fontSize: 32,
    fontWeight: "800",
    letterSpacing: -0.5,
    color: "#0e2a52",
  },
  heroLogoTagline: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "rgba(14,42,82,0.4)",
  },
  heroHeadline: {
    marginBottom: 16,
    fontSize: 38,
    lineHeight: 45,
    fontWeight: "800",
    letterSpacing: -0.8,
    color: "#0e2a52",
  },
  heroHeadlineAccent: {
    color: "#26b8a8",
  },
  heroSub: {
    marginBottom: 36,
    fontSize: 15,
    lineHeight: 26,
    color: "rgba(14,42,82,0.55)",
  },
  heroFeatureList: {
    gap: 14,
  },
  heroFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroFeatureIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(38,184,168,0.1)",
    borderWidth: 1,
    borderColor: "rgba(38,184,168,0.22)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  heroFeatureText: {
    flex: 1,
    fontSize: 14,
    color: "rgba(14,42,82,0.65)",
    lineHeight: 20,
  },
  formPanel: {
    backgroundColor: "#f4f7fa",
    borderLeftWidth: 1,
    borderLeftColor: "#e2e8f0",
    justifyContent: "center",
  },
  formPanelWide: {
    width: "50%",
    paddingHorizontal: 40,
    paddingVertical: 48,
  },
  formPanelStack: {
    width: "100%",
    paddingHorizontal: 22,
    paddingVertical: 28,
  },
  formWrap: {
    width: "100%",
    maxWidth: 340,
    alignSelf: "center",
  },
  formTitle: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: "800",
    color: "#0e2a52",
    marginBottom: 4,
  },
  formSub: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 32,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  fieldLabel: {
    marginBottom: 8,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.9,
    color: "#64748b",
  },
  roleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  rolePill: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rolePillActive: {
    backgroundColor: "#26b8a8",
    borderColor: "#26b8a8",
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0e2a52",
  },
  rolePillTextActive: {
    color: "#ffffff",
  },
  input: {
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: "#ffffff",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    fontSize: 14,
    color: "#0e2a52",
  },
  errorBox: {
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(220,38,38,0.35)",
    backgroundColor: "rgba(220,38,38,0.08)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 12,
  },
  loginButton: {
    width: "100%",
    paddingVertical: 14,
    backgroundColor: "#26b8a8",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#26b8a8",
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  loginButtonPressed: {
    transform: [{ translateY: -1 }],
  },
  loginButtonDisabled: {
    opacity: 0.65,
  },
  loginButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  loginButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  loginFoot: {
    marginTop: 20,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  loginFootMuted: {
    color: "#94a3b8",
    fontSize: 12,
  },
  loginFootLink: {
    color: "#26b8a8",
    fontSize: 12,
  },
  demoRow: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  demoLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#94a3b8",
    marginBottom: 4,
  },
  demoValue: {
    color: "#0e2a52",
    fontSize: 13,
    lineHeight: 18,
  },
  appShell: {
    flex: 1,
    backgroundColor: "#f4f7fa",
  },
  topbar: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  topbarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fbfd",
    alignItems: "center",
    justifyContent: "center",
  },
  menuButtonText: {
    color: "#0e2a52",
    fontSize: 18,
    fontWeight: "800",
  },
  topbarTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0e2a52",
  },
  topbarCrumb: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  topbarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  topbarUserBox: {
    alignItems: "flex-end",
  },
  topbarUserName: {
    color: "#0e2a52",
    fontSize: 13,
    fontWeight: "700",
  },
  topbarUserRole: {
    color: "#64748b",
    fontSize: 11,
  },
  signOutButton: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  signOutButtonText: {
    color: "#0e2a52",
    fontSize: 12,
    fontWeight: "700",
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  tabChip: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minWidth: 110,
  },
  tabChipActive: {
    backgroundColor: "#0e2a52",
    borderColor: "#0e2a52",
  },
  tabChipLocked: {
    opacity: 0.45,
  },
  tabChipText: {
    color: "#0e2a52",
    fontSize: 14,
    fontWeight: "700",
  },
  tabChipTextActive: {
    color: "#ffffff",
  },
  tabChipSub: {
    marginTop: 4,
    color: "#64748b",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  tabChipSubActive: {
    color: "rgba(255,255,255,0.72)",
  },
  sidebarContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sidebarSheet: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    gap: 14,
  },
  sidebarBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sidebarBrandIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#26b8a8",
    alignItems: "center",
    justifyContent: "center",
  },
  sidebarBrandTextWrap: {
    flex: 1,
  },
  sidebarBrandTitle: {
    color: "#0e2a52",
    fontSize: 18,
    fontWeight: "800",
  },
  sidebarBrandSub: {
    marginTop: 2,
    color: "#64748b",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sidebarUserCard: {
    borderRadius: 18,
    padding: 14,
    backgroundColor: "#f8fbfd",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sidebarUserName: {
    color: "#0e2a52",
    fontSize: 14,
    fontWeight: "800",
  },
  sidebarUserRole: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 2,
  },
  sidebarGroup: {
    gap: 10,
  },
  sidebarGroupLabel: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  sidebarGroupItems: {
    gap: 8,
  },
  sidebarItem: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fbfd",
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sidebarItemActive: {
    backgroundColor: "#0e2a52",
    borderColor: "#0e2a52",
  },
  sidebarItemLocked: {
    opacity: 0.45,
  },
  sidebarItemTextWrap: {
    flex: 1,
  },
  sidebarItemLabel: {
    color: "#0e2a52",
    fontSize: 14,
    fontWeight: "800",
  },
  sidebarItemLabelActive: {
    color: "#ffffff",
  },
  sidebarItemSub: {
    marginTop: 2,
    color: "#64748b",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sidebarItemSubActive: {
    color: "rgba(255,255,255,0.72)",
  },
  sidebarItemBadge: {
    color: "#26b8a8",
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  dashboardContent: {
    padding: 20,
    gap: 16,
  },
  loadingCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 20,
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    color: "#4f6888",
    fontSize: 13,
    fontWeight: "600",
  },
  section: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    gap: 12,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#0e2a52",
  },
  sectionBadge: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    color: "#10b981",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  metricCard: {
    width: "48%",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    color: "#6b87aa",
    marginBottom: 10,
  },
  metricValue: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: "800",
    color: "#0e2a52",
  },
  successText: {
    color: "#10b981",
  },
  warningText: {
    color: "#f59e0b",
  },
  infoText: {
    color: "#3b82f6",
  },
  primaryText: {
    color: "#26b8a8",
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
  },
  quickCard: {
    width: "48%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#eaf0f6",
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  quickLabel: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#153a70",
  },
  actionCard: {
    width: "48%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#eaf0f6",
    paddingVertical: 14,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  actionText: {
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    color: "#153a70",
  },
  listStack: {
    gap: 10,
  },
  listRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fbfd",
    padding: 12,
  },
  listBody: {
    flex: 1,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0e2a52",
  },
  listMeta: {
    marginTop: 4,
    fontSize: 12,
    color: "#6b87aa",
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 20,
    color: "#4f6888",
  },
  pill: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    color: "#153a70",
    backgroundColor: "#eaf0f6",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  successPill: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    color: "#10b981",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    overflow: "hidden",
  },
  heroBanner: {
    backgroundColor: "#26b8a8",
    borderRadius: 18,
    paddingVertical: 22,
    paddingHorizontal: 20,
  },
  heroBannerTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 8,
  },
  heroBannerSub: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 14,
  },
  metricCardLarge: {
    width: "30%",
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  twoColumnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  colLeft: {
    flex: 1,
  },
  colRight: {
    width: 380,
  },
  emptyBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fbfd",
    padding: 14,
  },
});
