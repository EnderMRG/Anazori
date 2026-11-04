"use client";

import {
  AlertCircle,
  ArrowRight,
  Bell,
  BookOpen,
  Bot,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  Clock3,
  CheckSquare,
  FileText,
  Filter,
  ImagePlus,
  Languages,
  LayoutDashboard,
  Lightbulb,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  MessageSquareText,
  MoreHorizontal,
  Plus,
  Download,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShieldCheck,
  Sparkles,
  Tag,
  ThumbsUp,
  Trash2,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCampus, type Campus } from "@/lib/campuses";
import AdminControlRoom from "@/components/AdminControlRoom";
import { ComplaintDetailWorkflow, ComplaintFormWorkflow } from "@/components/ComplaintWorkflow";
import PwaInstallButton from "@/components/PwaInstallButton";
import { NotificationSkeleton, Skeleton, WorkspaceSkeleton } from "@/components/SkeletonLoaders";

export type Language = "en" | "as" | "mixed";
type View = "overview" | "complaints" | "services" | "analytics" | "notifications" | "settings" | "admin";
export type Status = "Submitted" | "In progress" | "Resolved";
export type Priority = "Critical" | "High" | "Medium" | "Low";
type AuthUser = { id: string; name: string; email: string; role: "student" | "admin"; campusName: string };
type NotificationItem = { id: string | number; title: string; body: string; time: string; unread: boolean; complaintId?: string };

export type Complaint = {
  id: string;
  title: string;
  description: string;
  language: Language;
  category: string;
  priority: Priority;
  department: string;
  summaryEn: string;
  summaryAs: string;
  status: Status;
  location: string;
  createdAt: string;
  image?: string;
  resolvedImage?: string;
  resolutionNotes?: string;
  tags?: string[];
  upvotes?: number;
  masterId?: string;
  duplicateOf?: string;
  reporter: string;
  duplicate?: string;
  campusName: string;
  adminResponseEn?: string;
  adminResponseAs?: string;
};

const initialComplaints: Complaint[] = [
  {
    id: "CS-2048",
    title: "Water supply interrupted in hostel block C",
    description: "There has been no water in the washrooms of hostel block C since this morning.",
    language: "en",
    category: "Water supply",
    priority: "High",
    department: "Maintenance",
    summaryEn: "Hostel block C has had no water supply since morning, affecting residents.",
    summaryAs: "পুৱাৰে পৰা ছাত্ৰাবাসৰ C ব্লকত পানীৰ যোগান বন্ধ হৈ আছে, যাৰ ফলত আৱাসীসকল অসুবিধাত পৰিছে।",
    status: "In progress",
    location: "Hostel block C",
    createdAt: "Today, 09:42 AM",
    reporter: "Arjun",
    campusName: "Dibrugarh University",
  },
  {
    id: "CS-2047",
    title: "লাইব্ৰেৰীৰ দ্বিতীয় মহলাত ৱাই-ফাই নাই",
    description: "যোৱা দুদিন ধৰি লাইব্ৰেৰীৰ দ্বিতীয় মহলাত ৱাই-ফাই সংযোগ পোৱা হোৱা নাই।",
    language: "as",
    category: "Internet / Wi-Fi",
    priority: "Medium",
    department: "IT Services",
    summaryEn: "Wi-Fi has been unavailable on the second floor of the library for two days.",
    summaryAs: "যোৱা দুদিন ধৰি লাইব্ৰেৰীৰ দ্বিতীয় মহলাত ৱাই-ফাই সংযোগ পোৱা হোৱা নাই।",
    status: "Submitted",
    location: "Central Library",
    createdAt: "Today, 08:18 AM",
    reporter: "Rituraj Gogoi",
    campusName: "Dibrugarh University",
  },
  {
    id: "CS-2046",
    title: "Broken streetlight near the north gate",
    description: "The streetlight beside the north gate has been broken for a week. It gets very dark after 6 PM.",
    language: "en",
    category: "Safety & security",
    priority: "Critical",
    department: "Estate & Security",
    summaryEn: "A broken streetlight near the north gate creates a safety risk after sunset.",
    summaryAs: "উত্তৰ প্ৰৱেশদ্বাৰৰ ওচৰৰ বেয়া ষ্ট্ৰীট লাইটটোৱে সূৰ্যাস্তৰ পিছত সুৰক্ষাৰ আশংকা সৃষ্টি কৰিছে।",
    status: "Submitted",
    location: "North gate",
    createdAt: "Yesterday, 06:31 PM",
    reporter: "Bikram Saikia",
    campusName: "Dibrugarh University",
  },
  {
    id: "CS-2045",
    title: "Overflowing waste bins near Arts building",
    description: "The waste bins near the Arts building have been cleared and the area is clean now.",
    language: "en",
    category: "Cleanliness",
    priority: "Low",
    department: "Sanitation",
    summaryEn: "Waste bins near the Arts building were overflowing; the issue has been cleared.",
    summaryAs: "কলাৰ ভৱনৰ ওচৰৰ আৱৰ্জনাৰ বাকচবোৰ উপচি পৰিছিল; সমস্যাটো সমাধান কৰা হৈছে।",
    status: "Resolved",
    location: "Arts building",
    createdAt: "Yesterday, 02:10 PM",
    reporter: "Priyanka Chetia",
    campusName: "Dibrugarh University",
  },
];

const copy = {
  en: {
    overview: "Overview",
    complaints: "My complaints",
    services: "Student services",
    analytics: "Campus insights",
    notifications: "Notifications",
    settings: "Settings",
    submit: "Report an issue",
    welcome: "Good morning, Arjun",
    intro: "Help make campus better, one report at a time.",
    activeIssues: "Active issues",
    resolved: "Resolved this month",
    avgTime: "Avg. resolution time",
    satisfaction: "Satisfaction score",
    recent: "Recent complaints",
    viewAll: "View all",
    quickActions: "Quick actions",
    report: "Report an issue",
    track: "Track my reports",
    insights: "Campus insights",
    notificationsTitle: "Notifications",
    newReport: "New complaint",
    search: "Search complaints...",
    all: "All status",
    noComplaints: "No complaints found",
    admin: "Admin view",
    student: "Student view",
    adminPanel: "Admin panel",
    administration: "Administration",
    adminRole: "Administrator",
    studentRole: "Student portal",
    workspace: "Workspace",
    account: "Account",
    manage: "Manage",
    logOut: "Log out",
  },
  as: {
    overview: "অভাৰভিউ",
    complaints: "মোৰ অভিযোগসমূহ",
    services: "শিক্ষাৰ্থী সেৱাসমূহ",
    analytics: "কেম্পাছৰ তথ্য",
    notifications: "জাননীসমূহ",
    settings: "ছেটিংছ",
    submit: "সমস্যা জনাওক",
    welcome: "সুপ্ৰভাত, অৰ্জুন",
    intro: "এটা এটাকৈ অভিযোগেৰে কেম্পাছ উন্নত কৰাত সহায় কৰক।",
    activeIssues: "সক্ৰিয় সমস্যা",
    resolved: "এই মাহত সমাধান",
    avgTime: "গড় সমাধানৰ সময়",
    satisfaction: "সন্তুষ্টিৰ স্ক’ৰ",
    recent: "শেহতীয়া অভিযোগ",
    viewAll: "সকলো চাওক",
    quickActions: "দ্ৰুত কাৰ্যসমূহ",
    report: "সমস্যা জনাওক",
    track: "মোৰ প্ৰতিবেদন চাওক",
    insights: "কেম্পাছৰ তথ্য",
    notificationsTitle: "জাননীসমূহ",
    newReport: "নতুন অভিযোগ",
    search: "অভিযোগ বিচাৰক...",
    all: "সকলো অৱস্থা",
    noComplaints: "কোনো অভিযোগ পোৱা নগ’ল",
    admin: "এডমিন ভিউ",
    student: "শিক্ষাৰ্থী ভিউ",
    adminPanel: "এডমিন পেনেল",
    administration: "প্ৰশাসন",
    adminRole: "প্ৰশাসক",
    studentRole: "শিক্ষাৰ্থী প’ৰ্টেল",
    workspace: "কাৰ্যক্ষেত্ৰ",
    account: "একাউণ্ট",
    manage: "ব্যৱস্থাপনা",
    logOut: "লগ আউট",
  },
};

const statusStyles: Record<Status, string> = {
  Submitted: "status-submitted",
  "In progress": "status-progress",
  Resolved: "status-resolved",
};

function formatCategory(category: string) {
  return category.replace(" / ", " · ");
}

export default function CivicSenseApp() {
  const pathname = usePathname();
  const router = useRouter();
  const isLandingRoute = pathname === "/";
  const isAuthRoute = pathname === "/auth/signin" || pathname === "/auth/signup";
  const isDashboardRoute = pathname === "/dashboard";
  const isAdminRoute = pathname === "/admin";
  const isProtectedRoute = isDashboardRoute || isAdminRoute;
  const [authMode, setAuthMode] = useState<"signin" | "signup">(pathname === "/auth/signup" ? "signup" : "signin");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [isStandalonePwa, setIsStandalonePwa] = useState<boolean | null>(null);
  const [availableCampuses, setAvailableCampuses] = useState<Campus[]>([]);
  const [selectedCampus, setSelectedCampus] = useState<Campus | null>(null);
  const [showCampusPicker, setShowCampusPicker] = useState(false);
  const [language, setLanguage] = useState<Language>("en");
  const [view, setView] = useState<View>(() => pathname === "/admin" ? "admin" : "overview");
  const [role, setRole] = useState<"student" | "admin">("student");
  const [complaints, setComplaints] = useState(initialComplaints);
  const [complaintsLoading, setComplaintsLoading] = useState(true);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [selected, setSelected] = useState<Complaint | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formServiceCategory, setFormServiceCategory] = useState<string | undefined>();
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    { id: 1, title: "Your issue is in progress", body: "CS-2048 was assigned to Maintenance.", time: "18 min ago", unread: true },
    { id: 2, title: "Welcome to CivicSense", body: "You can report campus issues in Assamese or English.", time: "2 hours ago", unread: true },
    { id: 3, title: "Issue resolved", body: "CS-2045 was marked as resolved by Sanitation.", time: "Yesterday", unread: false },
  ]);
  const t = copy[language === "mixed" ? "en" : language];
  const displayName = currentUser?.name || "Arjun";
  const activeCampus = selectedCampus || getCampus(currentUser?.campusName);
  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    fetch("/api/campuses").then((response) => response.json()).then((data) => {
      if (Array.isArray(data.campuses)) setAvailableCampuses(data.campuses);
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    fetch("/api/auth/me").then((response) => response.json()).then((data) => {
      if (data.user) {
        setCurrentUser(data.user);
        setRole(data.user.role);
        setSelectedCampus(getCampus(data.user.campusName));
      }
    }).catch(() => undefined).finally(() => setAuthResolved(true));
  }, []);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setIsStandalonePwa(standalone);
  }, []);

  useEffect(() => {
    if (isAuthRoute) setAuthMode(pathname === "/auth/signup" ? "signup" : "signin");
    if (isAdminRoute) setView("admin");
    if (isDashboardRoute && currentUser?.role !== "admin") setView("overview");
  }, [currentUser?.role, isAdminRoute, isAuthRoute, isDashboardRoute, pathname]);

  useEffect(() => {
    if (!authResolved) return;
    if (isLandingRoute && isStandalonePwa) {
      router.replace(currentUser ? (currentUser.role === "admin" ? "/admin" : "/dashboard") : "/auth/signin");
      return;
    }
    if (isProtectedRoute && !currentUser) {
      router.replace("/auth/signin");
      return;
    }
    if (isAuthRoute && currentUser) {
      router.replace(currentUser.role === "admin" ? "/admin" : "/dashboard");
      return;
    }
    if (isAdminRoute && currentUser?.role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    if (isDashboardRoute && currentUser?.role === "admin") {
      router.replace("/admin");
      return;
    }
  }, [authResolved, currentUser, isAdminRoute, isAuthRoute, isDashboardRoute, isLandingRoute, isProtectedRoute, isStandalonePwa, router]);

  useEffect(() => {
    if (!isProtectedRoute || !currentUser) return;
    setComplaintsLoading(true);
    fetch(`/api/complaints?campusName=${encodeURIComponent(activeCampus.name)}`)
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data.complaints) && data.complaints.length) {
          setComplaints((current) => [...data.complaints, ...current.filter((item) => !data.complaints.some((saved: Complaint) => saved.id === item.id))] as Complaint[]);
        }
      })
      .catch(() => undefined)
      .finally(() => setComplaintsLoading(false));
  }, [activeCampus.name, currentUser, isProtectedRoute]);

  useEffect(() => {
    if (!currentUser || currentUser.role === "admin") return;
    setNotificationsLoading(true);
    fetch("/api/notifications")
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data.notifications)) setNotifications(data.notifications);
      })
      .catch(() => undefined)
      .finally(() => setNotificationsLoading(false));
  }, [currentUser]);

  const filteredComplaints = useMemo(() => {
    const q = search.trim().toLowerCase();
    return complaints.filter((complaint) => {
      const matchesSearch = !q || [complaint.id, complaint.title, complaint.category, complaint.department, complaint.location].some((value) => value.toLowerCase().includes(q));
      const matchesStatus = statusFilter === "All" || complaint.status === statusFilter;
      const matchesCampus = complaint.campusName === activeCampus.name;
      return matchesSearch && matchesStatus && matchesCampus;
    });
  }, [complaints, search, statusFilter, activeCampus.name]);

  const counts = useMemo(() => ({
    active: complaints.filter((item) => item.status !== "Resolved").length,
    resolved: complaints.filter((item) => item.status === "Resolved").length,
    unread: notifications.filter((item) => item.unread).length,
  }), [complaints, notifications]);

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }

  function updateStatus(id: string, status: Status) {
    updateComplaint(id, { status });
    notify(`Complaint ${id} moved to ${status.toLowerCase()}.`);
  }

  async function updateComplaint(id: string, updates: Partial<Complaint>) {
    const previous = complaints.find((item) => item.id === id);
    setComplaints((current) => current.map((item) => item.id === id ? { ...item, ...updates } : item));
    setSelected((current) => current && current.id === id ? { ...current, ...updates } : current);
    const response = await fetch(`/api/complaints/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(updates) });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      if (previous) {
        setComplaints((current) => current.map((item) => item.id === id ? previous : item));
        setSelected((current) => current && current.id === id ? previous : current);
      }
      notify(data.error || "Unable to update the complaint.");
      return false;
    }
    const data = await response.json();
    if (data.complaint) {
      const saved = data.complaint as Complaint;
      setComplaints((current) => current.map((item) => item.id === id ? { ...item, ...saved, id } : item));
      setSelected((current) => current && current.id === id ? { ...current, ...saved, id } : current);
    }
    if (updates.status || updates.adminResponseEn !== undefined || updates.adminResponseAs !== undefined) {
      fetch("/api/notifications").then((result) => result.json()).then((data) => { if (Array.isArray(data.notifications)) setNotifications(data.notifications); }).catch(() => undefined);
    }
    return true;
  }

  async function addComplaint(complaint: Complaint) {
    try {
      const response = await fetch("/api/complaints", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(complaint) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save the report.");
      const savedComplaint = (data.complaint || complaint) as Complaint;
      setComplaints((current) => [savedComplaint, ...current.filter((item) => item.id !== savedComplaint.id)]);
      setNotifications((current) => [{ id: Date.now(), title: "New complaint submitted", body: `${savedComplaint.id} is being reviewed by ${savedComplaint.department}.`, time: "Just now", unread: true }, ...current]);
      setShowForm(false);
      navTo("complaints");
      notify("Complaint submitted and saved successfully.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Unable to save the report. Please try again.");
    }
  }

  function markNotificationsRead() {
    setNotifications((current) => current.map((item) => ({ ...item, unread: false })));
    fetch("/api/notifications", { method: "PATCH" }).catch(() => undefined);
  }

  function navTo(nextView: View) {
    setView(nextView);
    setShowMobileNav(false);
  }

  function openForm(serviceCategory?: string) {
    setFormServiceCategory(serviceCategory);
    setShowForm(true);
  }

  function openAuth(mode: "signin" | "signup") {
    setAuthMode(mode);
    router.push(`/auth/${mode}`);
  }

  function handleAuthSuccess(user: AuthUser) {
    setCurrentUser(user);
    setRole(user.role);
    setSelectedCampus(getCampus(user.campusName));
    setShowCampusPicker(false);
    setView(user.role === "admin" ? "admin" : "overview");
    router.replace(user.role === "admin" ? "/admin" : "/dashboard");
    notify(`Welcome to CivicSense, ${user.name}.`);
  }

  async function signOut() {
    await fetch("/api/auth/signout", { method: "POST" });
    setCurrentUser(null);
    setSelectedCampus(null);
    setShowCampusPicker(false);
    setView("overview");
    router.replace("/");
  }

  function chooseCampus(campus: Campus) {
    setSelectedCampus(campus);
    setShowCampusPicker(false);
    setView("overview");
    notify(`Now viewing ${campus.name}.`);
  }

  if (isLandingRoute) {
    if (isStandalonePwa === null || (isStandalonePwa && (!authResolved || !currentUser))) return <div className="route-loading"><Loader2 size={22} className="spin" /><span>Opening your CivicSense workspace...</span></div>;
    return <LandingPage language={language} onLanguageChange={() => setLanguage(language === "en" ? "as" : "en")} onHome={() => router.replace("/")} onEnter={() => currentUser ? router.push(currentUser.role === "admin" ? "/admin" : "/dashboard") : openAuth("signin")} onSignUp={() => openAuth("signup")} />;
  }

  if (isAuthRoute) {
    return <AuthPage mode={authMode} onModeChange={(mode) => { setAuthMode(mode); router.replace(`/auth/${mode}`); }} onBack={() => router.replace("/")} onSuccess={handleAuthSuccess} />;
  }

  if (isProtectedRoute && (!authResolved || !currentUser)) {
    return <WorkspaceSkeleton />;
  }

  if (showCampusPicker && currentUser?.role === "student") {
    return <CampusPicker userName={displayName} campuses={availableCampuses} selectedCampus={selectedCampus} onSelect={chooseCampus} onSignOut={signOut} />;
  }

  return (
    <div className="app-frame">
      <aside className={`sidebar ${showMobileNav ? "sidebar-open" : ""}`}>
        <div className="brand-row brand-home-button" role="button" tabIndex={0} onClick={() => router.push("/")} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") router.push("/"); }} aria-label="Return to CivicSense landing page">
          <CivicMark />
          <div><div className="brand-name">CivicSense</div><div className="brand-caption">SMART CAMPUS CARE</div></div>
          <button className="icon-button close-nav" onClick={() => setShowMobileNav(false)} aria-label="Close menu"><X size={19} /></button>
        </div>
        <div className="workspace-switcher">
          <div className="workspace-icon"><Building2 size={17} /></div>
          <div className="workspace-copy"><b>{activeCampus.name}</b><span>{isAdmin ? t.adminRole : t.studentRole}</span></div>
          <ChevronDown size={16} className="muted-icon" />
        </div>
          <div className="sidebar-label">{isAdmin ? t.administration : t.workspace}</div>
        {isAdmin ? <nav className="main-nav admin-nav"><NavButton active={view === "admin"} icon={<ShieldCheck size={18} />} label={t.adminPanel} count={complaints.filter((item) => item.campusName === activeCampus.name && item.status !== "Resolved").length} onClick={() => navTo("admin")} /></nav> : <nav className="main-nav">
           <NavButton active={view === "overview"} icon={<LayoutDashboard size={18} />} label={t.overview} onClick={() => navTo("overview")} />
           <NavButton active={view === "complaints"} icon={<MessageSquareText size={18} />} label={t.complaints} count={counts.active} onClick={() => navTo("complaints")} />
           <NavButton active={view === "services"} icon={<BookOpen size={18} />} label={t.services} onClick={() => navTo("services")} />
           <NavButton active={view === "analytics"} icon={<Lightbulb size={18} />} label={t.analytics} onClick={() => navTo("analytics")} />
          <NavButton active={view === "notifications"} icon={<Bell size={18} />} label={t.notifications} count={counts.unread} onClick={() => { navTo("notifications"); markNotificationsRead(); }} />
        </nav>}
        <div className="sidebar-spacer" />
        <div className="sidebar-label">{isAdmin ? t.account : t.manage}</div>
        <nav className="main-nav">
          <NavButton active={view === "settings"} icon={<Settings size={18} />} label={t.settings} onClick={() => navTo("settings")} />
          {!isAdmin && <NavButton active={false} icon={<CircleHelp size={18} />} label="Help centre" onClick={() => notify("Help centre is coming soon.")} />}
        </nav>
        <button className="sidebar-user" onClick={() => navTo("settings")}>
          <div className="avatar avatar-purple">{displayName.slice(0, 2).toUpperCase()}</div>
          <div className="user-copy"><b>{displayName}</b><span>{currentUser?.email || "Sign in to save your reports"}</span></div>
          <MoreHorizontal size={18} className="muted-icon" />
        </button>
        <button className="sidebar-logout" onClick={signOut}><LogOut size={16} /><span>{t.logOut}</span></button>
      </aside>
      {currentUser && isProtectedRoute && <MobileBottomNav isAdmin={isAdmin} view={view} counts={counts} onNavigate={navTo} labels={t} />}

      <main className="main-content">
        <header className="topbar">
          <button className="icon-button mobile-menu" onClick={() => setShowMobileNav(true)} aria-label="Open menu"><Menu size={21} /></button>
          <div className="breadcrumb"><span>{activeCampus.name}</span><span className="breadcrumb-separator">/</span><b>{view === "overview" ? t.overview : view === "complaints" ? t.complaints : view === "services" ? t.services : view === "analytics" ? t.analytics : view === "notifications" ? t.notifications : view === "admin" ? t.adminPanel : t.settings}</b></div>
          <div className="top-actions">
            <button className="language-toggle" onClick={() => setLanguage(language === "en" ? "as" : "en")}><Languages size={16} /><span>{language === "en" ? "অসমীয়া" : "English"}</span></button>
            {!isAdmin && <button className="icon-button notification-button" onClick={() => { navTo("notifications"); markNotificationsRead(); }} aria-label="Notifications"><Bell size={19} />{counts.unread > 0 && <span className="notification-dot" />}</button>}
            <div className="top-avatar avatar avatar-purple">{displayName.slice(0, 2).toUpperCase()}</div>
          </div>
        </header>

        <div className="content-wrap">
          {view === "admin" && isAdmin && <AdminControlRoom language={language} campus={activeCampus} complaints={complaints.filter((item) => item.campusName === activeCampus.name)} loading={complaintsLoading} onSelect={setSelected} onUpdateComplaint={updateComplaint} />}
          {view === "overview" && <Overview t={t} language={language} userName={displayName} campus={activeCampus} complaints={filteredComplaints} loading={complaintsLoading} counts={{ ...counts, active: filteredComplaints.filter((item) => item.status !== "Resolved").length, resolved: filteredComplaints.filter((item) => item.status === "Resolved").length }} onSubmit={() => openForm()} onViewAll={() => navTo("complaints")} onSelect={setSelected} />}
          {view === "complaints" && <ComplaintsView t={t} complaints={filteredComplaints} loading={complaintsLoading} search={search} setSearch={setSearch} statusFilter={statusFilter} setStatusFilter={setStatusFilter} onSubmit={() => openForm()} onSelect={setSelected} onUpdateStatus={updateStatus} role={role} />}
          {view === "services" && <StudentServices onSubmit={openForm} />}
          {view === "analytics" && <Analytics complaints={complaints} />}
          {view === "notifications" && <Notifications notifications={notifications} loading={notificationsLoading} onRead={markNotificationsRead} />}
          {view === "settings" && <SettingsView language={language} setLanguage={setLanguage} role={role} setRole={setRole} onSave={() => notify("Preferences saved successfully.")} />}
        </div>
      </main>

      {selected && <ComplaintDetailWorkflow complaint={selected} language={language} onClose={() => setSelected(null)} onUpdate={updateComplaint} role={role} />}
      {showForm && <ComplaintFormWorkflow language={language} campus={activeCampus} serviceCategory={formServiceCategory} onClose={() => { setShowForm(false); setFormServiceCategory(undefined); }} onSubmit={addComplaint} />}
      {toast && <div className="toast"><CheckCircle2 size={18} /><span>{toast}</span></div>}
    </div>
  );
}

function CivicMark() {
  return <span className="civic-mark"><img src="/Logo.png" alt="CivicSense" /></span>;
}

function CampusSearchSelect({ label, value, campuses, onChange, required = false }: { label: string; value: string; campuses: Campus[]; onChange: (value: string) => void; required?: boolean }) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const filtered = campuses.filter((campus) => campus.name.toLowerCase().includes(query.toLowerCase()) || campus.city.toLowerCase().includes(query.toLowerCase()));
  return <label className="auth-label campus-select-label">{label}<div className="campus-select"><Search size={14} /><input required={required} value={query} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setOpen(true); }} onBlur={() => window.setTimeout(() => setOpen(false), 150)} placeholder="Search campuses..." /><ChevronDown size={14} /></div>{open && <div className="campus-options">{filtered.map((campus) => <button type="button" key={campus.id} onMouseDown={() => { onChange(campus.name); setQuery(campus.name); setOpen(false); }}><span className="campus-option-dot" style={{ background: campus.accent }} /><span><b>{campus.name}</b><small>{campus.city}</small></span><Check size={14} /></button>)}</div>}</label>;
}

function CampusPicker({ userName, campuses, selectedCampus, onSelect, onSignOut }: { userName: string; campuses: Campus[]; selectedCampus: Campus | null; onSelect: (campus: Campus) => void; onSignOut: () => void }) {
  const [query, setQuery] = useState("");
  const filtered = campuses.filter((campus) => `${campus.name} ${campus.city}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="campus-picker-page"><header className="picker-header"><div className="picker-brand"><CivicMark /><span><b>CivicSense</b><small>SMART CAMPUS CARE</small></span></div><button className="picker-signout" onClick={onSignOut}>Sign out</button></header><main className="campus-picker-content"><div className="picker-kicker"><Building2 size={15} /> YOUR CAMPUS</div><h1>Where should we send your<br /><em>campus updates?</em></h1><p>Hi {userName}. Select a campus to view its information and report issues to the right administration team.</p><div className="picker-search"><Search size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by campus name or city..." /></div><div className="campus-grid">{filtered.map((campus) => <button className={`campus-card ${selectedCampus?.id === campus.id ? "selected-campus-card" : ""}`} key={campus.id} onClick={() => onSelect(campus)}><div className="campus-card-top"><span className="campus-card-icon" style={{ background: `${campus.accent}18`, color: campus.accent }}><Building2 size={21} /></span>{selectedCampus?.id === campus.id && <span className="selected-check"><Check size={13} /></span>}</div><b>{campus.name}</b><small>{campus.city}</small><p>{campus.description}</p><span className="campus-card-action">View campus <ArrowRight size={14} /></span></button>)}</div>{!filtered.length && <div className="empty-state"><Search size={24} /><b>No campus found</b><span>Try another campus or city.</span></div>}</main></div>;
}

function AdminPanel({ campus, complaints, onSelect, onUpdateStatus }: { campus: Campus; complaints: Complaint[]; onSelect: (complaint: Complaint) => void; onUpdateStatus: (id: string, status: Status) => void }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const filtered = complaints.filter((complaint) => {
    const matches = !query || `${complaint.id} ${complaint.title} ${complaint.category} ${complaint.location} ${complaint.reporter}`.toLowerCase().includes(query.toLowerCase());
    return matches && (filter === "All" || complaint.status === filter);
  });
  const open = complaints.filter((item) => item.status !== "Resolved").length;
  const critical = complaints.filter((item) => item.priority === "Critical" || item.priority === "High").length;
  return <div className="page-enter admin-page"><section className="admin-heading"><div><div className="eyebrow"><ShieldCheck size={14} /> ADMINISTRATION</div><h1>{campus.name} control room</h1><p>Review, route, and resolve every grievance reported to your campus.</p></div><div className="admin-fixed-campus"><Building2 size={15} /> {campus.name}<span>Assigned campus</span></div></section><section className="admin-metric-grid"><AdminMetric icon={<MessageSquareText size={18} />} label="Total reports" value={complaints.length} accent="blue" /><AdminMetric icon={<Clock3 size={18} />} label="Needs action" value={open} accent="orange" /><AdminMetric icon={<AlertCircle size={18} />} label="High priority" value={critical} accent="red" /><AdminMetric icon={<CheckCircle2 size={18} />} label="Resolved" value={complaints.filter((item) => item.status === "Resolved").length} accent="green" /></section><div className="admin-toolbar"><div className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search reports, reporters, locations..." /></div><div className="filter-wrap"><Filter size={16} /><select value={filter} onChange={(event) => setFilter(event.target.value)}><option>All</option><option>Submitted</option><option>In progress</option><option>Resolved</option></select></div></div><div className="list-panel admin-list"><div className="list-header"><span>{filtered.length} reports in {campus.name}</span><span className="admin-live"><i /> Live campus queue</span></div>{filtered.length ? filtered.map((complaint) => <div className="admin-report-row" key={complaint.id}><button onClick={() => onSelect(complaint)}><div className={`admin-report-icon priority-${complaint.priority.toLowerCase()}`}><MessageSquareText size={17} /></div><div><b>{complaint.title}</b><span>{complaint.id} · {complaint.reporter} · {complaint.location}</span></div></button><div className="admin-report-meta"><span className={`status-pill ${statusStyles[complaint.status]}`}><i />{complaint.status}</span><span className={`priority priority-${complaint.priority.toLowerCase()}`}><span className="priority-dot" />{complaint.priority}</span>{complaint.status !== "Resolved" && <button className="small-button" onClick={() => onUpdateStatus(complaint.id, complaint.status === "Submitted" ? "In progress" : "Resolved")}>{complaint.status === "Submitted" ? "Assign" : "Resolve"}</button>}<MoreHorizontal size={17} className="muted-icon" /></div></div>) : <div className="empty-state"><Search size={24} /><b>No reports in this queue</b><span>New campus grievances will appear here.</span></div>}</div></div>;
}

function AdminMetric({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number; accent: string }) {
  return <div className="admin-metric"><span className={`admin-metric-icon ${accent}`}>{icon}</span><span>{label}</span><b>{value}</b></div>;
}

function AuthPage({ mode, onModeChange, onBack, onSuccess }: { mode: "signin" | "signup"; onModeChange: (mode: "signin" | "signup") => void; onBack: () => void; onSuccess: (user: AuthUser) => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountType, setAccountType] = useState<"student" | "admin">("student");
  const [campusName, setCampusName] = useState("");
  const [availableCampuses, setAvailableCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isSignUp = mode === "signup";

  useEffect(() => {
    fetch("/api/campuses").then((response) => response.json()).then((data) => {
      if (Array.isArray(data.campuses)) setAvailableCampuses(data.campuses);
    }).catch(() => undefined);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`/api/auth/${isSignUp ? "signup" : "signin"}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password, role: accountType, campusName }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Authentication failed.");
      onSuccess(data.user);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="auth-page"><div className="auth-visual"><button className="auth-brand" onClick={onBack}><CivicMark /><span><b>CivicSense</b><small>SMART CAMPUS CARE</small></span></button><div className="auth-quote"><span className="auth-quote-mark">“</span><h1>Every voice can<br /><em>improve campus.</em></h1><p>Report, track, and resolve issues together — in the language you are most comfortable with.</p><div className="auth-bilingual"><Languages size={16} /><span>English <b>+</b> অসমীয়া</span></div></div></div><div className="auth-form-side"><button className="auth-back" onClick={onBack}><ArrowRight size={15} className="back-arrow" /> Back to home</button><div className="auth-card"><div className="auth-card-mark"><CivicMark /></div><h2>{isSignUp ? "Create your account" : "Welcome back"}</h2><p>{isSignUp ? "Join your campus community and make a difference." : "Sign in to continue to your campus dashboard."}</p><div className="auth-tabs"><button className={!isSignUp ? "active-auth-tab" : ""} onClick={() => { onModeChange("signin"); setError(""); }}>Sign in</button><button className={isSignUp ? "active-auth-tab" : ""} onClick={() => { onModeChange("signup"); setError(""); }}>Create account</button></div>{isSignUp && <div className="account-type-toggle"><button className={accountType === "student" ? "selected-account-type" : ""} onClick={() => setAccountType("student")} type="button"><UserRound size={14} /> Student</button><button className={accountType === "admin" ? "selected-account-type" : ""} onClick={() => setAccountType("admin")} type="button"><ShieldCheck size={14} /> Campus admin</button></div>}<form onSubmit={submit}>{isSignUp && <label className="auth-label">Full name<input value={name} onChange={(event) => setName(event.target.value)} placeholder="Arjun Das" autoComplete="name" /></label>}<label className="auth-label">Email address<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@university.ac.in" autoComplete="email" /></label><label className="auth-label">Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isSignUp ? "At least 8 characters" : "Enter your password"} autoComplete={isSignUp ? "new-password" : "current-password"} /></label>{isSignUp && (accountType === "admin" ? <label className="auth-label">Campus name<input required value={campusName} onChange={(event) => setCampusName(event.target.value)} placeholder="e.g. Dibrugarh University" /></label> : <CampusSearchSelect label="Your campus" value={campusName} campuses={availableCampuses} onChange={setCampusName} required />)}{isSignUp && accountType === "student" && availableCampuses.length === 0 && <div className="auth-error"><AlertCircle size={15} />No campuses are registered yet. Ask an administrator to register a campus first.</div>}{error && <div className="auth-error"><AlertCircle size={15} />{error}</div>}<button className="auth-submit" disabled={loading || (isSignUp && accountType === "student" && availableCampuses.length === 0)}>{loading ? <><Loader2 size={16} className="spin" />Please wait...</> : isSignUp ? "Create account" : "Sign in"}</button></form><small className="auth-privacy"><ShieldCheck size={13} /> Your information is encrypted and secure.</small></div><div className="auth-footer">© 2026 CivicSense · Dibrugarh University</div></div></div>;
}

function LandingPage({ language, onLanguageChange, onHome, onEnter, onSignUp }: { language: Language; onLanguageChange: () => void; onHome: () => void; onEnter: () => void; onSignUp: () => void }) {
  const isAssamese = language === "as";
  return <div className="landing-page">
    <header className="landing-nav">
      <button className="landing-brand" onClick={onHome} aria-label="Go to CivicSense home"><CivicMark /><span><b>CivicSense</b><small>SMART CAMPUS CARE</small></span></button>
      <nav className="landing-links"><a href="#how-it-works">How it works</a><a href="#impact">Campus impact</a><a href="#languages">Bilingual by design</a></nav>
      <div className="landing-nav-actions"><button className="landing-language" onClick={onLanguageChange}><Languages size={16} />{isAssamese ? "English" : "অসমীয়া"}</button><button className="landing-login" onClick={onEnter}>Sign in <ArrowRight size={15} /></button><button className="landing-login landing-signup" onClick={onSignUp}>Create account</button></div>
    </header>
    <main>
       <section className="landing-hero">
         <div className="landing-hero-copy"><div className="landing-eyebrow"><span /> DIBRUGARH UNIVERSITY <span /></div><h1>{isAssamese ? <>এটা উন্নত কেম্পাছৰ বাবে<br /><em>আপোনাৰ কণ্ঠস্বৰ।</em></> : <>A better campus<br /><em>starts with you.</em></>}</h1><p>{isAssamese ? "সমস্যাসমূহ সহজে জনাওক, অগ্ৰগতি চাওক আৰু একেলগে আমাৰ কেম্পাছ উন্নত কৰোঁ আহক।" : "Report campus issues in your own words, track every update, and help build a safer, smarter university community."}</p><div className="landing-hero-actions"><button className="landing-primary" onClick={onSignUp}>{isAssamese ? "এতিয়াই আৰম্ভ কৰক" : "Get started"}<ArrowRight size={17} /></button><PwaInstallButton label={isAssamese ? "এপ ইনষ্টল কৰক" : "Install app"} className="landing-install-button" /><a className="landing-play-link" href="#how-it-works"><span className="play-icon">▶</span>{isAssamese ? "ই কেনেকৈ কাম কৰে?" : "See how it works"}</a></div><div className="landing-trust"><div className="trust-avatars"><span>AR</span><span>RG</span><span>BS</span><span>+2k</span></div><div><div className="stars">★★★★★ <b>4.8/5</b></div><small>Loved by the campus community</small></div></div></div>
        <div className="landing-visual"><div className="visual-glow" /><div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" /><div className="dashboard-preview"><div className="preview-top"><div className="preview-brand"><span><img src="/Logo.png" alt="" /></span><b>CivicSense</b></div><div className="preview-dots">•••</div></div><div className="preview-content"><div className="preview-greeting"><small>MONDAY, 4 NOVEMBER 2026</small><b>Good morning, Arjun</b><span>Help make campus better, one report at a time.</span></div><div className="preview-metrics"><div><i className="mini-metric orange" /><small>Active issues</small><b>12</b></div><div><i className="mini-metric green" /><small>Resolved</small><b>38</b></div><div><i className="mini-metric blue" /><small>Avg. time</small><b>2.4d</b></div></div><div className="preview-report"><div className="preview-report-head"><b>Recent complaints</b><small>View all →</small></div><div className="preview-complaint"><span className="preview-complaint-icon"><DropletIcon /></span><div><b>Water supply interrupted</b><small><MapPin size={8} /> Hostel block C · Today</small></div><span className="preview-status">In progress</span></div><div className="preview-complaint"><span className="preview-complaint-icon purple"><Bot size={13} /></span><div><b>ৱাই-ফাই সংযোগ নাই</b><small><MapPin size={8} /> Central Library · Today</small></div><span className="preview-status new">New</span></div></div></div><div className="preview-ai"><span><Sparkles size={15} /></span><div><b>AI analysis complete</b><small>Routed to Maintenance · High priority</small></div><CheckCircle2 size={17} /></div></div><div className="floating-note note-top"><span className="floating-icon"><Languages size={15} /></span><div><b>Two languages</b><small>English + অসমীয়া</small></div></div><div className="floating-note note-bottom"><span className="floating-icon green-float"><Check size={15} /></span><div><b>Resolved today</b><small>Making an impact together</small></div></div></div>
      </section>
      <section className="landing-stats" id="impact"><div><b>2,000+</b><span>campus voices heard</span></div><div><b>94%</b><span>issues resolved</span></div><div><b>2.4 days</b><span>average resolution time</span></div><div><b>2 languages</b><span>one inclusive platform</span></div></section>
      <section className="landing-section" id="how-it-works"><div className="section-kicker">SIMPLE BY DESIGN</div><h2>From a report to a resolution,<br /><em>every step is visible.</em></h2><p className="section-intro">CivicSense takes the friction out of campus issue management so your university can focus on what matters most.</p><div className="landing-features"><FeatureCard number="01" icon={<MessageSquareText size={20} />} title="Speak your mind" text="Describe an issue naturally in English or Assamese. Add a photo and location for helpful context." /><FeatureCard number="02" icon={<Sparkles size={20} />} title="AI finds the right path" text="Our intelligent triage understands your report, sets urgency, and routes it to the right department." /><FeatureCard number="03" icon={<CheckCircle2 size={20} />} title="See real progress" text="Get clear updates from submission to resolution. Your voice stays connected to the outcome." /></div></section>
      <section className="landing-language-section" id="languages"><div className="language-section-art"><div className="language-card language-card-back">Your campus, your voice.</div><div className="language-card language-card-front"><Languages size={23} /><b>ভাল কেম্পাছ<br />আমাৰ সকলোৰে বাবে।</b><small>A better campus for everyone.</small></div></div><div><div className="section-kicker">BUILT FOR EVERY VOICE</div><h2>Technology that<br /><em>speaks your language.</em></h2><p>Real inclusion means more than translating a button. CivicSense understands Assamese reports, generates clear bilingual updates, and lets every member of the university participate with confidence.</p><button className="outline-landing-button" onClick={onEnter}>Explore CivicSense <ArrowRight size={16} /></button></div></section>
      <section className="landing-cta"><div><div className="section-kicker light-kicker">MAKE A DIFFERENCE</div><h2>Notice something?<br /><em>Let’s make it better.</em></h2></div><button className="landing-primary white-button" onClick={onEnter}>Enter CivicSense <ArrowRight size={17} /></button></section>
    </main>
    <footer className="landing-footer"><div className="landing-brand footer-brand"><span className="landing-brand-mark"><img src="/Logo.png" alt="CivicSense" /></span><span><b>CivicSense</b><small>SMART CAMPUS CARE</small></span></div><span>Built for a more connected Dibrugarh University.</span><span>© 2026 CivicSense</span></footer>
  </div>;
}

function DropletIcon() { return <span className="droplet-icon">◆</span>; }

function FeatureCard({ number, icon, title, text }: { number: string; icon: React.ReactNode; title: string; text: string }) {
  return <div className="landing-feature"><div className="feature-top"><span className="feature-number">{number}</span><span className="feature-icon">{icon}</span></div><h3>{title}</h3><p>{text}</p><ArrowRight size={16} className="feature-arrow" /></div>;
}

function NavButton({ active, icon, label, count, onClick }: { active: boolean; icon: React.ReactNode; label: string; count?: number; onClick: () => void }) {
  return <button className={`nav-button ${active ? "nav-active" : ""}`} onClick={onClick}>{icon}<span>{label}</span>{count ? <em>{count}</em> : null}</button>;
}

function MobileBottomNav({ isAdmin, view, counts, onNavigate, labels }: { isAdmin: boolean; view: View; counts: { active: number; unread: number }; onNavigate: (view: View) => void; labels: typeof copy.en }) {
  const items: Array<{ view: View; label: string; icon: React.ReactNode; count?: number }> = isAdmin
    ? [{ view: "admin", label: "Admin", icon: <ShieldCheck size={18} />, count: counts.active }, { view: "settings", label: "Settings", icon: <Settings size={18} /> }]
    : [{ view: "overview", label: labels.overview, icon: <LayoutDashboard size={18} /> }, { view: "complaints", label: labels.complaints, icon: <MessageSquareText size={18} />, count: counts.active }, { view: "services", label: labels.services, icon: <BookOpen size={18} /> }, { view: "analytics", label: labels.analytics, icon: <Lightbulb size={18} /> }, { view: "notifications", label: labels.notifications, icon: <Bell size={18} />, count: counts.unread }, { view: "settings", label: labels.settings, icon: <Settings size={18} /> }];
  return <nav className={`mobile-bottom-nav ${isAdmin ? "mobile-bottom-admin" : ""}`} aria-label="Mobile navigation">{items.map((item) => <button key={item.view} className={view === item.view ? "mobile-bottom-active" : ""} onClick={() => onNavigate(item.view)} aria-label={item.label}>{item.icon}<span>{item.label}</span>{item.count ? <b>{item.count}</b> : null}</button>)}</nav>;
}

function StudentServices({ onSubmit }: { onSubmit: (serviceCategory?: string) => void }) {
  const services = [
    { label: "Library services", description: "Books, fines, access, and library accounts.", icon: <BookOpen size={19} />, accent: "blue" },
    { label: "Examinations & marksheets", description: "Exam forms, results, marksheets, and corrections.", icon: <FileText size={19} />, accent: "purple" },
    { label: "Exam fees", description: "Payment issues, receipts, and exam fee questions.", icon: <span className="service-symbol">₹</span>, accent: "orange" },
    { label: "Semester fees", description: "Tuition payments, dues, and fee receipts.", icon: <span className="service-symbol">₹</span>, accent: "green" },
    { label: "Registration & enrollment", description: "Course registration, admission, and enrollment help.", icon: <Users size={19} />, accent: "blue" },
    { label: "Certificates & documents", description: "Bonafide, migration, transcripts, and certificates.", icon: <FileText size={19} />, accent: "purple" },
    { label: "Scholarships & financial aid", description: "Scholarship applications, stipends, and grants.", icon: <Sparkles size={19} />, accent: "orange" },
    { label: "Student welfare & counselling", description: "Wellbeing, counselling, accessibility, and support.", icon: <Users size={19} />, accent: "green" },
    { label: "Hostel & student support", description: "Student support services and hostel administration.", icon: <Building2 size={19} />, accent: "blue" },
  ];
  return <div className="page-enter student-services-page"><section className="page-heading-row"><div><div className="eyebrow"><BookOpen size={14} /> STUDENT SUPPORT</div><h1>Student Services</h1><p>Choose a service below to open the right form for your request.</p></div></section><div className="services-intro"><div className="service-intro-icon"><Sparkles size={22} /></div><div><b>One place for every student query</b><p>Each service has its own prompts and fields so the right university office gets the details it needs.</p></div></div><section className="student-service-grid">{services.map((service) => <button className="student-service-card" key={service.label} onClick={() => onSubmit(service.label)}><span className={`service-card-icon service-card-${service.accent}`}>{service.icon}</span><span className="student-service-copy"><b>{service.label}</b><span>{service.description}</span></span><ArrowRight size={16} className="row-arrow" /></button>)}</section></div>;
}

function Overview({ t, language, userName, campus, complaints, loading, counts, onSubmit, onViewAll, onSelect }: { t: typeof copy.en; language: Language; userName: string; campus: Campus; complaints: Complaint[]; loading: boolean; counts: { active: number; resolved: number; unread: number }; onSubmit: () => void; onViewAll: () => void; onSelect: (complaint: Complaint) => void }) {
  if (loading) return <WorkspaceSkeleton />;
  return <div className="page-enter">
    <section className="hero-row">
      <div><div className="eyebrow"><span className="eyebrow-dot" /> {campus.name}</div><h1>{language === "as" ? `সুপ্ৰভাত, ${userName}` : `Good morning, ${userName}`}</h1><p>{t.intro}</p></div>
      <button className="primary-button" onClick={onSubmit}><Plus size={18} />{t.submit}</button>
    </section>
    <section className="metric-grid">
      <MetricCard label={t.activeIssues} value={String(counts.active)} note="2 need your attention" icon={<AlertCircle size={19} />} accent="orange" trend="+12%" />
      <MetricCard label={t.resolved} value={String(counts.resolved)} note="Across your reports" icon={<CheckCircle2 size={19} />} accent="green" trend="+8%" />
      <MetricCard label={t.avgTime} value="2.4d" note="12% faster than last month" icon={<Clock3 size={19} />} accent="blue" trend="-12%" />
      <MetricCard label={t.satisfaction} value="4.8/5" note="Based on 24 responses" icon={<ThumbsUp size={19} />} accent="purple" trend="+0.3" />
    </section>
    <section className="main-grid">
      <div className="panel recent-panel">
        <div className="panel-heading"><div><h2>{t.recent}</h2><p>Stay on top of your campus reports</p></div><button className="text-button" onClick={onViewAll}>{t.viewAll}<ArrowRight size={15} /></button></div>
        <div className="complaint-list">{complaints.slice(0, 4).map((complaint) => <ComplaintRow key={complaint.id} complaint={complaint} language={language} onClick={() => onSelect(complaint)} />)}</div>
      </div>
      <div className="panel action-panel">
        <div className="panel-heading"><div><h2>{t.quickActions}</h2><p>What would you like to do?</p></div><Sparkles size={20} className="sparkle-icon" /></div>
        <button className="action-card action-primary" onClick={onSubmit}><div className="action-icon"><Plus size={21} /></div><div><b>{t.report}</b><span>Tell us what needs attention</span></div><ArrowRight size={18} /></button>
        <button className="action-card" onClick={onViewAll}><div className="action-icon action-icon-blue"><FileText size={20} /></div><div><b>{t.track}</b><span>View updates and history</span></div><ArrowRight size={18} /></button>
        <button className="action-card" onClick={onViewAll}><div className="action-icon action-icon-purple"><Bot size={20} /></div><div><b>{t.insights}</b><span>See what is improving</span></div><ArrowRight size={18} /></button>
        <div className="tip-box"><Lightbulb size={17} /><div><b>Tip for a faster resolution</b><span>Add a clear location and a photo when reporting an issue.</span></div></div>
      </div>
    </section>
    <section className="info-banner"><div className="banner-icon"><Languages size={21} /></div><div><b>Report in the language you are most comfortable with</b><p>CivicSense understands Assamese and English, and keeps your updates bilingual.</p></div><div className="language-pills"><span className={language === "en" ? "pill-active" : ""}>English</span><span className={language === "as" ? "pill-active" : ""}>অসমীয়া</span></div></section>
  </div>;
}

function MetricCard({ label, value, note, icon, accent, trend }: { label: string; value: string; note: string; icon: React.ReactNode; accent: string; trend: string }) {
  return <div className="metric-card"><div className={`metric-icon metric-${accent}`}>{icon}</div><div className="metric-top"><span>{label}</span><small className={`trend trend-${accent}`}>{trend}</small></div><div className="metric-value">{value}</div><div className="metric-note">{note}</div></div>;
}

function ComplaintRow({ complaint, language, onClick }: { complaint: Complaint; language: Language; onClick: () => void }) {
  return <button className="complaint-row" onClick={onClick}><div className={`category-icon category-${complaint.category.split(" ")[0].toLowerCase().replace("/", "")}`}><MessageSquareText size={17} /></div><div className="complaint-row-main"><div className="complaint-title-line"><b>{complaint.title}</b><span className={`status-pill ${statusStyles[complaint.status]}`}><i />{complaint.status}</span></div><div className="complaint-meta"><span>{complaint.id}</span><span>·</span><span><MapPin size={12} />{complaint.location}</span><span>·</span><span>{complaint.createdAt}</span></div></div><ArrowRight size={16} className="row-arrow" /></button>;
}

function SkeletonListPlaceholder() {
  return <div className="skeleton-complaint-list">{Array.from({ length: 5 }, (_, index) => <div className="skeleton-complaint-row" key={index}><Skeleton className="skeleton-icon" /><div className="skeleton-complaint-copy"><Skeleton className="skeleton-title" /><Skeleton className="skeleton-meta" /></div><Skeleton className="skeleton-status" /></div>)}</div>;
}

function ComplaintsView({ t, complaints, loading, search, setSearch, statusFilter, setStatusFilter, onSubmit, onSelect, onUpdateStatus, role }: { t: typeof copy.en; complaints: Complaint[]; loading: boolean; search: string; setSearch: (value: string) => void; statusFilter: string; setStatusFilter: (value: string) => void; onSubmit: () => void; onSelect: (complaint: Complaint) => void; onUpdateStatus: (id: string, status: Status) => void; role: "student" | "admin" }) {
  if (loading) return <div className="page-enter"><section className="page-heading-row"><div><div className="eyebrow"><MessageSquareText size={14} /> ISSUE MANAGEMENT</div><h1>{t.complaints}</h1><p>Track, manage and resolve reported campus issues.</p></div></section><div className="panel skeleton-panel"><SkeletonListPlaceholder /></div></div>;
  return <div className="page-enter"><section className="page-heading-row"><div><div className="eyebrow"><MessageSquareText size={14} /> ISSUE MANAGEMENT</div><h1>{t.complaints}</h1><p>Track, manage and resolve reported campus issues.</p></div><button className="primary-button" onClick={onSubmit}><Plus size={18} />{t.newReport}</button></section>
    <div className="toolbar"><div className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t.search} /></div><div className="filter-wrap"><Filter size={16} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="All">{t.all}</option><option value="Submitted">Submitted</option><option value="In progress">In progress</option><option value="Resolved">Resolved</option></select></div><button className="filter-button"><Tag size={16} />Category <ChevronDown size={14} /></button></div>
    <div className="list-panel"><div className="list-header"><span>{complaints.length} reports</span><span className="list-header-right"><span className="legend-dot legend-orange" /> Needs attention <span className="legend-dot legend-green" /> Resolved</span></div>{complaints.length ? complaints.map((complaint) => <div className="manage-row" key={complaint.id}><ComplaintRow complaint={complaint} language="en" onClick={() => onSelect(complaint)} /><div className="manage-actions"><span className="priority"><span className={`priority-dot priority-${complaint.priority.toLowerCase()}`} />{complaint.priority}</span>{role === "admin" && complaint.status !== "Resolved" && <button className="small-button" onClick={() => onUpdateStatus(complaint.id, complaint.status === "Submitted" ? "In progress" : "Resolved")}>{complaint.status === "Submitted" ? "Assign" : "Resolve"}</button>}</div></div>) : <div className="empty-state"><Search size={24} /><b>{t.noComplaints}</b><span>Try changing your search or filter.</span></div>}</div>
  </div>;
}

function Analytics({ complaints }: { complaints: Complaint[] }) {
  const categoryCounts = complaints.reduce<Record<string, number>>((acc, item) => { acc[item.category] = (acc[item.category] || 0) + 1; return acc; }, {});
  const max = Math.max(...Object.values(categoryCounts), 1);
  return <div className="page-enter"><section className="page-heading-row"><div><div className="eyebrow"><Lightbulb size={14} /> INSIGHTS</div><h1>Campus insights</h1><p>A clear view of the issues shaping your campus.</p></div><div className="date-chip"><Clock3 size={15} /> Last 30 days <ChevronDown size={14} /></div></section><section className="analytics-grid"><div className="panel chart-panel"><div className="panel-heading"><div><h2>Issue volume</h2><p>Reports received over the past week</p></div><span className="chart-total">{complaints.length}<small>Total reports</small></span></div><div className="bars">{[34, 52, 42, 67, 48, 80, 60].map((height, index) => <div className="bar-column" key={index}><div className="bar-value" style={{ height: `${height}%` }}><span>{Math.round(height / 10)}</span></div><label>{["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][index]}</label></div>)}</div></div><div className="panel category-panel"><div className="panel-heading"><div><h2>Top categories</h2><p>Where attention is needed</p></div><MoreHorizontal size={19} className="muted-icon" /></div><div className="category-bars">{Object.entries(categoryCounts).slice(0, 5).map(([category, value]) => <div className="category-bar-row" key={category}><div><span>{category}</span><b>{value}</b></div><div className="progress-track"><div style={{ width: `${(value / max) * 100}%` }} /></div></div>)}</div></div></section><section className="insight-cards"><div className="insight-card"><div className="insight-circle insight-green"><CheckCircle2 size={19} /></div><b>Resolution is improving</b><p>Average resolution time is 12% faster than last month.</p></div><div className="insight-card"><div className="insight-circle insight-orange"><AlertCircle size={19} /></div><b>Safety needs attention</b><p>Safety & security reports have increased this week.</p></div><div className="insight-card"><div className="insight-circle insight-blue"><Bot size={19} /></div><b>AI triage is active</b><p>100% of recent reports received an instant AI analysis.</p></div></section></div>;
}

function Notifications({ notifications, loading, onRead }: { notifications: NotificationItem[]; loading: boolean; onRead: () => void }) {
  return <div className="page-enter"><section className="page-heading-row"><div><div className="eyebrow"><Bell size={14} /> UPDATES</div><h1>Notifications</h1><p>Stay updated on your reports and campus activity.</p></div><button className="secondary-button" onClick={onRead}><Check size={16} /> Mark all as read</button></section>{loading ? <NotificationSkeleton /> : <div className="notification-list">{notifications.map((notification) => <div className={`notification-card ${notification.unread ? "notification-unread" : ""}`} key={notification.id}><div className="notification-icon"><Bell size={18} /></div><div><b>{notification.title}</b><p>{notification.body}</p><span>{notification.time}</span></div>{notification.unread && <span className="unread-dot" />}</div>)}</div>}</div>;
}

 function SettingsView({ language, setLanguage, role, setRole, onSave }: { language: Language; setLanguage: (language: Language) => void; role: "student" | "admin"; setRole: (role: "student" | "admin") => void; onSave: () => void }) {
  return <div className="page-enter"><section className="page-heading-row"><div><div className="eyebrow"><Settings size={14} /> PREFERENCES</div><h1>Settings</h1><p>Personalise your CivicSense experience.</p></div><button className="primary-button" onClick={onSave}><Check size={17} />Save changes</button></section><div className="settings-grid"><div className="panel settings-panel"><h2>Profile</h2><p className="panel-subtitle">Your account details</p><div className="profile-editor"><div className="large-avatar avatar-purple">AR</div><button className="text-button">Change photo</button></div><label className="field-label">Full name<input defaultValue="Arjun" /></label><label className="field-label">Email address<input defaultValue="arjun@dibru.ac.in" /></label><label className="field-label">Role<select value={role} onChange={(event) => setRole(event.target.value as "student" | "admin")}><option value="student">Student</option><option value="admin">Administrator (demo)</option></select></label></div><div className="panel settings-panel"><div className="settings-panel-heading"><div><h2>Language & notifications</h2><p className="panel-subtitle">Choose how CivicSense communicates with you</p></div><PwaInstallButton className="secondary-button" label="Install app" /></div><label className="field-label">Preferred language<div className="language-select"><button className={language === "en" ? "selected-lang" : ""} onClick={() => setLanguage("en")}>English</button><button className={language === "as" ? "selected-lang" : ""} onClick={() => setLanguage("as")}>অসমীয়া</button></div></label><ToggleRow label="Status updates" description="Get notified when your complaint changes status" /><ToggleRow label="Similar issue alerts" description="Know when a related issue has already been reported" /><ToggleRow label="Campus digest" description="A weekly summary of improvements around campus" /></div></div></div>;
}

function ToggleRow({ label, description }: { label: string; description: string }) { const [on, setOn] = useState(true); return <div className="toggle-row"><div><b>{label}</b><span>{description}</span></div><button className={`toggle ${on ? "toggle-on" : ""}`} onClick={() => setOn(!on)}><i /></button></div>; }

function ComplaintDetail({ complaint, language, onClose, onUpdateStatus, role }: { complaint: Complaint; language: Language; onClose: () => void; onUpdateStatus: (id: string, status: Status) => void; role: "student" | "admin" }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="detail-modal"><div className="modal-top"><div><span className="modal-kicker">{complaint.id} · REPORTED {complaint.createdAt.toUpperCase()}</span><h2>{complaint.title}</h2></div><button className="icon-button" onClick={onClose}><X size={20} /></button></div><div className="detail-status-row"><span className={`status-pill ${statusStyles[complaint.status]}`}><i />{complaint.status}</span><span className={`priority priority-${complaint.priority.toLowerCase()}`}><span className="priority-dot" />{complaint.priority} priority</span><span className="detail-location"><MapPin size={14} />{complaint.location}</span></div><div className="ai-result"><div className="ai-result-head"><div className="ai-badge"><Sparkles size={15} /> AI analysis</div><span>Processed in 1.2s</span></div><div className="ai-summary"><div><b>English summary</b><p>{complaint.summaryEn}</p></div><div><b>অসমীয়া সাৰাংশ</b><p>{complaint.summaryAs}</p></div></div><div className="ai-tags"><span><Tag size={13} />{formatCategory(complaint.category)}</span><span><Building2 size={13} />{complaint.department}</span><span><Languages size={13} />Bilingual</span></div></div><div className="detail-section"><h3>Original report</h3><p className="original-report">{language === "as" && complaint.language === "as" ? complaint.description : complaint.description}</p>{complaint.image && <img className="report-image" src={complaint.image} alt="Attached evidence" />}<div className="reporter-line"><div className="mini-avatar">{complaint.reporter.split(" ").map((word) => word[0]).join("")}</div><span>Reported by <b>{complaint.reporter}</b></span></div></div><div className="timeline"><h3>Activity</h3><TimelineItem active title="Report submitted" time={complaint.createdAt} text="Your report was received by CivicSense." /><TimelineItem active={complaint.status !== "Submitted"} title="Assigned to department" time={complaint.status === "Submitted" ? "Waiting for assignment" : "Today, 10:04 AM"} text={complaint.status === "Submitted" ? "The administration will review this shortly." : `${complaint.department} has been notified.`} /><TimelineItem active={complaint.status === "Resolved"} title="Resolved" time={complaint.status === "Resolved" ? "Today, 12:25 PM" : "Pending"} text={complaint.status === "Resolved" ? "The issue was marked as resolved." : "We will notify you when this is complete."} last /></div>{role === "admin" && <div className="modal-footer"><span>Admin actions</span><div>{complaint.status !== "In progress" && complaint.status !== "Resolved" && <button className="secondary-button" onClick={() => onUpdateStatus(complaint.id, "In progress")}><Clock3 size={15} />Assign to {complaint.department}</button>}{complaint.status !== "Resolved" && <button className="primary-button" onClick={() => onUpdateStatus(complaint.id, "Resolved")}><Check size={16} />Mark resolved</button>}</div></div>}</div></div>;
}

function TimelineItem({ active, title, time, text, last }: { active: boolean; title: string; time: string; text: string; last?: boolean }) { return <div className={`timeline-item ${active ? "timeline-active" : ""}`}><div className="timeline-marker">{active ? <Check size={12} /> : <span />}</div>{!last && <div className="timeline-line" />}<div className="timeline-copy"><div><b>{title}</b><span>{time}</span></div><p>{text}</p></div></div>; }

function ComplaintForm({ language, campus, complaints, onClose, onSubmit }: { language: Language; campus: Campus; complaints: Complaint[]; onClose: () => void; onSubmit: (complaint: Complaint) => void | Promise<void> }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [image, setImage] = useState("");
  const [analysing, setAnalysing] = useState(false);
  const [duplicate, setDuplicate] = useState<Complaint | null>(null);
  const [error, setError] = useState("");

  function handleImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Please choose an image smaller than 10 MB.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImage(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => setError("We could not read that image. Please try again.");
    reader.readAsDataURL(file);
  }
  function analyze(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !description.trim() || !location.trim()) { setError("Please complete the title, description and location."); return; }
    setError(""); setAnalysing(true);
    window.setTimeout(() => {
      const combined = `${title} ${description}`.toLowerCase();
      const existing = complaints.find((item) => combined.includes(item.category.toLowerCase().split(" ")[0]) || item.location.toLowerCase() === location.toLowerCase());
      setDuplicate(existing || null); setAnalysing(false); submit();
    }, 950);
  }
  function submit() {
    const combined = `${title} ${description}`.toLowerCase();
    let category = "Other campus issue"; let department = "Campus Administration"; let priority: Priority = "Medium";
    if (combined.includes("water") || combined.includes("পানী")) { category = "Water supply"; department = "Maintenance"; priority = "High"; }
    else if (combined.includes("wifi") || combined.includes("internet") || combined.includes("ৱাই")) { category = "Internet / Wi-Fi"; department = "IT Services"; }
    else if (combined.includes("light") || combined.includes("security") || combined.includes("আলো")) { category = "Safety & security"; department = "Estate & Security"; priority = "High"; }
    else if (combined.includes("waste") || combined.includes("clean") || combined.includes("আৱৰ্জনা")) { category = "Cleanliness"; department = "Sanitation"; priority = "Low"; }
    const id = `CS-${Math.floor(2050 + Math.random() * 900)}`;
    onSubmit({ id, title, description, language, category, priority, department, summaryEn: `${title}. Reported at ${location}. Our ${department.toLowerCase()} team will review this issue.`, summaryAs: `এই সমস্যাটো ${location} স্থানত প্ৰতিবেদন কৰা হৈছে। ${department} দলে ইয়াক পৰ্যালোচনা কৰিব।`, status: "Submitted", location, createdAt: "Just now", image, reporter: "Arjun", duplicate: duplicate?.id, campusName: campus.name });
  }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="form-modal"><div className="modal-top"><div><span className="modal-kicker"><Sparkles size={13} /> BILINGUAL AI REPORTING</span><h2>Report a campus issue</h2><p>Tell us what happened. Our AI will route it to the right team.</p></div><button className="icon-button" onClick={onClose}><X size={20} /></button></div><form onSubmit={analyze}><div className="form-language"><Languages size={16} /><span>Writing in <b>{language === "en" ? "English" : "অসমীয়া"}</b></span><span className="form-language-hint">You can switch languages anytime</span></div><label className="field-label">What is the issue?<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={language === "en" ? "e.g. No water in hostel block C" : "উদাহৰণ: ছাত্ৰাবাসত পানী নাই"} /></label><label className="field-label">Describe the problem<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder={language === "en" ? "Add details that could help us resolve this faster..." : "সমস্যাটোৰ বিষয়ে অধিক বিৱৰণ দিয়ক..."} rows={4} /></label><div className="form-two-col"><label className="field-label">Where is it?<div className="input-with-icon"><MapPin size={16} /><input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="e.g. Hostel block C" /></div></label><div className="field-label">Add a photo <label className="upload-box">{image ? <img src={image} alt="Issue preview" /> : <><ImagePlus size={20} /><span>Upload image</span><small>PNG, JPG up to 10MB</small></>}<input type="file" accept="image/*" onChange={handleImage} /></label></div></div>{duplicate && <div className="duplicate-alert"><AlertCircle size={18} /><div><b>We found a similar report: {duplicate.id}</b><span>It looks like this may be related to “{duplicate.title}”. You can still submit your report.</span></div><button type="button" onClick={() => setDuplicate(null)}><X size={15} /></button></div>}{error && <div className="form-error"><AlertCircle size={15} />{error}</div>}<div className="form-footer"><span><ShieldCheck size={15} /> Your report is safe and private</span><div><button type="button" className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={analysing}>{analysing ? <><Loader2 size={16} className="spin" />Analysing...</> : <><Sparkles size={16} />Analyse & submit</>}</button></div></div></form></div></div>;
}
