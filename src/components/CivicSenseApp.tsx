"use client";

import {
  Activity,
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
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  ThumbsUp,
  Trash2,
  UserRound,
  Users,
  X,
  BadgeCheck,
  CreditCard,
  GraduationCap,
  Mail,
  Phone,
  Zap,
} from "lucide-react";
import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getCampus, type Campus } from "@/lib/campuses";
import AdminControlRoom from "@/components/AdminControlRoom";
import CampusPulse from "@/components/CampusPulse";
import { ComplaintDetailWorkflow, ComplaintFormWorkflow } from "@/components/ComplaintWorkflow";
import PwaInstallButton from "@/components/PwaInstallButton";
import { NotificationSkeleton, Skeleton, WorkspaceSkeleton } from "@/components/SkeletonLoaders";

export type Language = "en" | "as" | "mixed" | "romanized_as";
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
  latitude?: number;
  longitude?: number;
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

const sampleWaterBefore = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='360' viewBox='0 0 600 360'><rect width='600' height='360' fill='%230f2b27'/><path d='M50 300 Q150 200 300 240 T550 220' stroke='%232b8f85' stroke-width='4' fill='none' opacity='0.4'/><circle cx='300' cy='140' r='50' fill='%232b8f85' opacity='0.25'/><path d='M290 120 h20 v30 h-20 z' fill='%235eead4'/><path d='M300 150 v35 M293 185 h14' stroke='%235eead4' stroke-width='4' stroke-linecap='round'/><text x='300' y='240' fill='%23e6f7f4' font-family='sans-serif' font-size='16' font-weight='bold' text-anchor='middle'>Hostel Block C · Main Washroom Valve Leak</text><text x='300' y='265' fill='%2394a3b8' font-family='sans-serif' font-size='13' text-anchor='middle'>Reported evidence photo · 09:30 AM</text></svg>";

const sampleStreetlightBefore = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='360' viewBox='0 0 600 360'><rect width='600' height='360' fill='%23111827'/><circle cx='300' cy='130' r='55' fill='%23f59e0b' opacity='0.15'/><path d='M296 90 h8 v140 h-8 z' fill='%2394a3b8'/><path d='M280 90 h40 l-8 -20 h-24 z' fill='%23f59e0b'/><text x='300' y='260' fill='%23fef08a' font-family='sans-serif' font-size='16' font-weight='bold' text-anchor='middle'>North Gate · Streetlight #04 Non-functional</text><text x='300' y='285' fill='%2394a3b8' font-family='sans-serif' font-size='13' text-anchor='middle'>High safety concern after sunset</text></svg>";

const sampleWasteBefore = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='360' viewBox='0 0 600 360'><rect width='600' height='360' fill='%232b1310'/><rect x='230' y='120' width='65' height='90' rx='8' fill='%23ef4444' opacity='0.6'/><rect x='315' y='120' width='65' height='90' rx='8' fill='%23f97316' opacity='0.6'/><text x='300' y='250' fill='%23fee2e2' font-family='sans-serif' font-size='16' font-weight='bold' text-anchor='middle'>Arts Building · Waste Overflow (Before)</text><text x='300' y='275' fill='%23cbd5e1' font-family='sans-serif' font-size='13' text-anchor='middle'>Reported at 11:20 AM</text></svg>";

const sampleWasteAfter = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='360' viewBox='0 0 600 360'><rect width='600' height='360' fill='%23064e3b'/><circle cx='300' cy='140' r='45' fill='%2310b981' opacity='0.3'/><path d='M285 140 l10 10 l20 -22' stroke='%2334d399' stroke-width='6' fill='none' stroke-linecap='round'/><text x='300' y='235' fill='%23d1fae5' font-family='sans-serif' font-size='16' font-weight='bold' text-anchor='middle'>Area Sanitized & Bins Cleared (Verified)</text><text x='300' y='260' fill='%23a7f3d0' font-family='sans-serif' font-size='13' text-anchor='middle'>Sanitation Crew Proof · 02:10 PM</text></svg>";

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
    latitude: 27.4526,
    longitude: 94.8962,
    createdAt: "Today, 09:42 AM",
    reporter: "Arjun",
    campusName: "Dibrugarh University",
    image: sampleWaterBefore,
    upvotes: 18,
    adminResponseEn: "Maintenance plumber dispatched with replacement valve. Estimated completion by 2:00 PM.",
    adminResponseAs: "নতুন ভাল্ভ সহ মেৰামতি কৰ্মী দল প্ৰেৰণ কৰা হৈছে। দুপৰীয়া ২ বজাৰ ভিতৰত সম্পূৰ্ণ হ'ব।",
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
    latitude: 27.4542,
    longitude: 94.8980,
    createdAt: "Today, 08:18 AM",
    reporter: "Rituraj Gogoi",
    campusName: "Dibrugarh University",
    upvotes: 8,
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
    latitude: 27.4568,
    longitude: 94.8955,
    createdAt: "Yesterday, 06:31 PM",
    reporter: "Bikram Saikia",
    campusName: "Dibrugarh University",
    image: sampleStreetlightBefore,
    upvotes: 24,
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
    latitude: 27.4535,
    longitude: 94.8992,
    createdAt: "Yesterday, 02:10 PM",
    reporter: "Priyanka Chetia",
    campusName: "Dibrugarh University",
    image: sampleWasteBefore,
    resolvedImage: sampleWasteAfter,
    resolutionNotes: "Sanitation crew emptied all bins, sprayed disinfectant, and replaced liners.",
    upvotes: 12,
    adminResponseEn: "Sanitation completed and inspected by supervisor. Verified clean with photo proof.",
    adminResponseAs: "পৰিষ্কাৰ-পৰিচ্ছন্নতা সম্পূৰ্ণ কৰা হৈছে আৰু পৰিদৰ্শক দ্বাৰা সত্যায়িত। ফটো প্ৰমাণ আপলোড কৰা হৈছে।",
  },
];

const copy = {
  en: {
    overview: "Overview",
    complaints: "My complaints",
    services: "Student services",
    analytics: "Campus Updates",
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
    insights: "Campus Pulse",
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
    analytics: "কেম্পাছ আপডেট",
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
    insights: "কেম্পাছ পাল্ছ",
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
  const [complaintsCursor, setComplaintsCursor] = useState<string | null>(null);
  const [hasMoreComplaints, setHasMoreComplaints] = useState(false);
  const [loadingMoreComplaints, setLoadingMoreComplaints] = useState(false);
  const loadMoreController = useRef<AbortController | null>(null);
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
  const t = copy[language === "mixed" || language === "romanized_as" ? "en" : language];
  const displayName = currentUser?.name || "Arjun";
  const activeCampus = selectedCampus || getCampus(currentUser?.campusName);
  const isAdmin = currentUser?.role === "admin";
  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }, []);

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
    loadMoreController.current?.abort();
    setLoadingMoreComplaints(false);
    setComplaintsLoading(true);
    setComplaintsCursor(null);
    setHasMoreComplaints(false);
    const controller = new AbortController();
    const params = new URLSearchParams({ limit: "25", includeEvidence: "true" });
    if (search.trim()) params.set("search", search.trim());
    if (statusFilter !== "All") params.set("status", statusFilter);
    const debounceMs = search.trim() ? 250 : 0;
    const timer = window.setTimeout(() => {
      fetch(`/api/complaints?${params.toString()}`, { signal: controller.signal })
        .then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Unable to load reports.");
          return data;
        })
        .then((data) => {
          setComplaints(Array.isArray(data.complaints) ? data.complaints : []);
          setComplaintsCursor(typeof data.nextCursor === "string" ? data.nextCursor : null);
          setHasMoreComplaints(Boolean(data.hasMore));
        })
        .catch((error) => {
          if (!controller.signal.aborted) notify(error instanceof Error ? error.message : "Unable to load reports.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setComplaintsLoading(false);
        });
    }, debounceMs);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
      loadMoreController.current?.abort();
    };
  }, [currentUser, isProtectedRoute, notify, search, statusFilter]);

  async function loadMoreComplaints() {
    if (!complaintsCursor || loadingMoreComplaints) return;
    setLoadingMoreComplaints(true);
    const controller = new AbortController();
    loadMoreController.current = controller;
    try {
      const params = new URLSearchParams({ limit: "25", cursor: complaintsCursor, includeEvidence: "true" });
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "All") params.set("status", statusFilter);
      const response = await fetch(`/api/complaints?${params.toString()}`, { signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load older reports.");
      if (Array.isArray(data.complaints)) {
        setComplaints((current) => [...current, ...data.complaints.filter((item: Complaint) => !current.some((saved) => saved.id === item.id))]);
      }
      setComplaintsCursor(typeof data.nextCursor === "string" ? data.nextCursor : null);
      setHasMoreComplaints(Boolean(data.hasMore));
    } catch (error) {
      if (!controller.signal.aborted) notify(error instanceof Error ? error.message : "Unable to load older reports.");
    } finally {
      if (!controller.signal.aborted) setLoadingMoreComplaints(false);
    }
  }

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

  async function handleUpvote(id: string) {
    const previous = complaints.find((item) => item.id === id);
    const nextUpvotes = (previous?.upvotes ?? 1) + 1;
    const nextPriority: Priority =
      nextUpvotes >= 15 ? "Critical" : nextUpvotes >= 5 && previous?.priority !== "Critical" ? "High" : previous?.priority || "Medium";

    setComplaints((current) =>
      current.map((item) => (item.id === id ? { ...item, upvotes: nextUpvotes, priority: nextPriority } : item))
    );
    setSelected((current) =>
      current && current.id === id ? { ...current, upvotes: nextUpvotes, priority: nextPriority } : current
    );

    try {
      const response = await fetch(`/api/complaints/${encodeURIComponent(id)}/upvote`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        if (typeof data.upvotes === "number") {
          setComplaints((current) =>
            current.map((item) =>
              item.id === id ? { ...item, upvotes: data.upvotes, priority: (data.priority as Priority) || item.priority } : item
            )
          );
          setSelected((current) =>
            current && current.id === id ? { ...current, upvotes: data.upvotes, priority: (data.priority as Priority) || current.priority } : current
          );
        }
      }
    } catch {
      // optimistic update maintained
    }
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
        {isAdmin ? <nav className="main-nav admin-nav"><NavButton active={view === "admin"} icon={<ShieldCheck size={18} />} label={t.adminPanel} count={complaints.filter((item) => item.campusName === activeCampus.name && item.status !== "Resolved").length} onClick={() => navTo("admin")} /><NavButton active={view === "analytics"} icon={<Activity size={18} />} label={t.analytics} onClick={() => navTo("analytics")} /></nav> : <nav className="main-nav">
           <NavButton active={view === "overview"} icon={<LayoutDashboard size={18} />} label={t.overview} onClick={() => navTo("overview")} />
           <NavButton active={view === "complaints"} icon={<MessageSquareText size={18} />} label={t.complaints} count={counts.active} onClick={() => navTo("complaints")} />
           <NavButton active={view === "services"} icon={<BookOpen size={18} />} label={t.services} onClick={() => navTo("services")} />
           <NavButton active={view === "analytics"} icon={<Activity size={18} />} label={t.analytics} onClick={() => navTo("analytics")} />
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
      {currentUser && isProtectedRoute && !selected && !showForm && (
        <MobileBottomNav isAdmin={isAdmin} view={view} counts={counts} onNavigate={navTo} labels={t} />
      )}

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
          {view === "overview" && <Overview t={t} language={language} userName={displayName} campus={activeCampus} complaints={filteredComplaints} loading={complaintsLoading} counts={{ ...counts, active: filteredComplaints.filter((item) => item.status !== "Resolved").length, resolved: filteredComplaints.filter((item) => item.status === "Resolved").length }} onSubmit={() => openForm()} onViewAll={() => navTo("complaints")} onPulse={() => navTo("analytics")} onSelect={setSelected} />}
          {view === "complaints" && <ComplaintsView t={t} complaints={filteredComplaints} loading={complaintsLoading} search={search} setSearch={setSearch} statusFilter={statusFilter} setStatusFilter={setStatusFilter} onSubmit={() => openForm()} onSelect={setSelected} onUpdateStatus={updateStatus} role={role} />}
          {view === "services" && <StudentServices language={language} onSubmit={openForm} />}
          {view === "analytics" && (
            <CampusPulse
              campusName={activeCampus.name}
              complaints={complaints.filter((item) => item.campusName === activeCampus.name)}
              language={language}
              onSelect={setSelected}
              onUpvote={handleUpvote}
              role={role}
            />
          )}
          {view === "notifications" && <Notifications notifications={notifications} loading={notificationsLoading} onRead={markNotificationsRead} />}
          {view === "settings" && (
            <SettingsView
              language={language}
              setLanguage={setLanguage}
              role={role}
              setRole={setRole}
              onSave={() => notify("Preferences saved successfully.")}
              currentUser={currentUser}
              displayName={displayName}
              onSignOut={signOut}
              logOutLabel={t.logOut}
            />
          )}
          {hasMoreComplaints && view === "complaints" && <div className="load-more-reports"><button className="secondary-button" disabled={loadingMoreComplaints} onClick={() => void loadMoreComplaints()}>{loadingMoreComplaints ? <><Loader2 size={16} className="spin" /> Loading reports...</> : "Load older reports"}</button></div>}
        </div>
      </main>

      {selected && <ComplaintDetailWorkflow complaint={selected} language={language} onClose={() => setSelected(null)} onUpdate={updateComplaint} role={role} />}
      {showForm && <ComplaintFormWorkflow language={language} campus={activeCampus} serviceCategory={formServiceCategory} onClose={() => { setShowForm(false); setFormServiceCategory(undefined); }} onSubmit={addComplaint} />}
      {toast && <div className="toast"><CheckCircle2 size={18} /><span>{toast}</span></div>}
    </div>
  );
}

function CivicMark() {
  return <span className="civic-mark"><img src="/newLogo.png" alt="CivicSense" /></span>;
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

  // Institutional Administrator Verification Details
  const [designation, setDesignation] = useState("Dean of Student Affairs / Welfare");
  const [customDesignation, setCustomDesignation] = useState("");
  const [staffId, setStaffId] = useState("");
  const [department, setDepartment] = useState("Office of Student Affairs & Welfare");
  const [campusCity, setCampusCity] = useState("Dibrugarh, Assam");
  const [institutionType, setInstitutionType] = useState("State Public University");
  const [aisheCode, setAisheCode] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("https://dibru.ac.in");
  const [phone, setPhone] = useState("");
  const [adminSignupCode, setAdminSignupCode] = useState("");
  const [authorizedAffirmation, setAuthorizedAffirmation] = useState(false);

  const isSignUp = mode === "signup";

  useEffect(() => {
    fetch("/api/campuses").then((response) => response.json()).then((data) => {
      if (Array.isArray(data.campuses)) setAvailableCampuses(data.campuses);
    }).catch(() => undefined);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (isSignUp && accountType === "admin") {
      const finalDesignation = designation === "Other" ? customDesignation.trim() : designation;
      if (!finalDesignation) {
        setError("Please specify your official administrative designation.");
        return;
      }
      if (!staffId.trim()) {
        setError("Please enter your official employee or staff ID number.");
        return;
      }
      if (!department.trim()) {
        setError("Please specify your administrative wing or department.");
        return;
      }
      if (!campusCity.trim()) {
        setError("Please enter the campus city and state location.");
        return;
      }
      if (!websiteUrl.trim() || !websiteUrl.includes(".")) {
        setError("Please provide a valid official institution web portal (e.g. https://dibru.ac.in).");
        return;
      }
      if (!adminSignupCode.trim()) {
        setError("Please enter the campus administrative authorization key (Demo code: 221232).");
        return;
      }
      if (!authorizedAffirmation) {
        setError("Please certify your official administrative authorization before proceeding.");
        return;
      }
    }

    setLoading(true);
    try {
      const finalDesignation = designation === "Other" ? customDesignation.trim() : designation;
      const payload = isSignUp
        ? accountType === "admin"
          ? {
              name: name.trim(),
              email: email.trim(),
              password,
              role: "admin",
              campusName: campusName.trim(),
              campusCity: campusCity.trim(),
              institutionType,
              aisheCode: aisheCode.trim(),
              websiteUrl: websiteUrl.trim(),
              designation: finalDesignation,
              department: department.trim(),
              staffId: staffId.trim(),
              phone: phone.trim(),
              adminSignupCode: adminSignupCode.trim(),
              authorizedAffirmation,
            }
          : {
              name: name.trim(),
              email: email.trim(),
              password,
              role: "student",
              campusName: campusName.trim(),
            }
        : { email: email.trim(), password };

      const response = await fetch(`/api/auth/${isSignUp ? "signup" : "signin"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Authentication failed.");
      onSuccess(data.user);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-visual">
        <button className="auth-brand" onClick={onBack}>
          <CivicMark />
          <span>
            <b>CivicSense</b>
            <small>SMART CAMPUS CARE</small>
          </span>
        </button>
        <div className="auth-quote">
          <span className="auth-quote-mark">“</span>
          <h1>
            Every voice can<br />
            <em>improve campus.</em>
          </h1>
          <p>Report, track, and resolve issues together — in the language you are most comfortable with.</p>
          <div className="auth-bilingual">
            <Languages size={16} />
            <span>English <b>+</b> অসমীয়া</span>
          </div>
        </div>
      </div>

      <div className="auth-form-side">
        <button className="auth-back" onClick={onBack}>
          <ArrowRight size={15} className="back-arrow" /> Back to home
        </button>

        <div className={`auth-card ${isSignUp && accountType === "admin" ? "auth-card-admin" : ""}`}>
          <div className="auth-card-mark"><CivicMark /></div>
          <h2>
            {isSignUp
              ? accountType === "admin"
                ? "Institutional Verification & Onboarding"
                : "Create your account"
              : "Welcome back"}
          </h2>
          <p>
            {isSignUp
              ? accountType === "admin"
                ? "Register your accredited institution and verify administrator credentials to establish your campus care command center."
                : "Join your campus community and make a difference."
              : "Sign in to continue to your campus dashboard."}
          </p>

          <div className="auth-tabs">
            <button className={!isSignUp ? "active-auth-tab" : ""} onClick={() => { onModeChange("signin"); setError(""); }}>
              Sign in
            </button>
            <button className={isSignUp ? "active-auth-tab" : ""} onClick={() => { onModeChange("signup"); setError(""); }}>
              Create account
            </button>
          </div>

          {isSignUp && (
            <div className="account-type-toggle">
              <button
                className={accountType === "student" ? "selected-account-type" : ""}
                onClick={() => setAccountType("student")}
                type="button"
              >
                <UserRound size={14} /> Student
              </button>
              <button
                className={accountType === "admin" ? "selected-account-type" : ""}
                onClick={() => setAccountType("admin")}
                type="button"
              >
                <ShieldCheck size={14} /> Campus admin
              </button>
            </div>
          )}

          <form onSubmit={submit}>
            {isSignUp && accountType === "admin" ? (
              <div className="auth-admin-section">
                <div className="auth-admin-banner">
                  <ShieldCheck size={20} style={{ flexShrink: 0, marginTop: 2, color: "#24786f" }} />
                  <div>
                    <b>Authorized Administrative Registry</b>
                    <span>
                      Registering a campus grants full authority to dispatch work orders and oversee student grievances. Institutional credentials and authorization keys are verified.
                    </span>
                  </div>
                </div>

                {/* Section 1: Institution Registry */}
                <div className="auth-section-title">
                  <Building2 size={14} /> 1. Institution & Campus Registry
                </div>

                <label className="auth-label">
                  Official campus or university name *
                  <input
                    required
                    value={campusName}
                    onChange={(event) => setCampusName(event.target.value)}
                    placeholder="e.g. Dibrugarh University"
                  />
                </label>

                <div className="auth-two-col">
                  <label className="auth-label">
                    Institution category *
                    <select
                      className="auth-select"
                      value={institutionType}
                      onChange={(event) => setInstitutionType(event.target.value)}
                    >
                      <option value="State Public University">State Public University</option>
                      <option value="Central University">Central University</option>
                      <option value="Institute of National Importance (IIT/NIT/AIIMS)">Institute of National Importance</option>
                      <option value="Deemed-to-be University">Deemed-to-be University</option>
                      <option value="Autonomous University College">Autonomous University College</option>
                      <option value="Government Technical / Medical Institution">Govt. Technical / Medical Institution</option>
                      <option value="Affiliated Degree College">Affiliated Degree College</option>
                    </select>
                  </label>

                  <label className="auth-label">
                    Campus location (City, State) *
                    <input
                      required
                      value={campusCity}
                      onChange={(event) => setCampusCity(event.target.value)}
                      placeholder="e.g. Dibrugarh, Assam"
                    />
                  </label>
                </div>

                <div className="auth-two-col">
                  <label className="auth-label">
                    AISHE / Accreditation code
                    <input
                      value={aisheCode}
                      onChange={(event) => setAisheCode(event.target.value)}
                      placeholder="e.g. U-0050 or NAAC A++"
                    />
                    <span className="auth-hint">Ministry of Education / UGC registry ID</span>
                  </label>

                  <label className="auth-label">
                    Official university web portal *
                    <input
                      required
                      type="url"
                      value={websiteUrl}
                      onChange={(event) => setWebsiteUrl(event.target.value)}
                      placeholder="e.g. https://dibru.ac.in"
                    />
                  </label>
                </div>

                {/* Section 2: Administrator Credentials */}
                <div className="auth-section-title">
                  <BadgeCheck size={14} /> 2. Official Administrator Credentials
                </div>

                <div className="auth-two-col">
                  <label className="auth-label">
                    Full legal name *
                    <input
                      required
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="e.g. Dr. Biren Das"
                      autoComplete="name"
                    />
                  </label>

                  <label className="auth-label">
                    Official staff / employee ID *
                    <input
                      required
                      value={staffId}
                      onChange={(event) => setStaffId(event.target.value)}
                      placeholder="e.g. DU-EST-2024-441"
                    />
                  </label>
                </div>

                <div className="auth-two-col">
                  <label className="auth-label">
                    Official designation / title *
                    <select
                      className="auth-select"
                      value={designation}
                      onChange={(event) => setDesignation(event.target.value)}
                    >
                      <option value="Dean of Student Affairs / Welfare">Dean of Student Affairs / Welfare</option>
                      <option value="Registrar / Assistant Registrar">Registrar / Assistant Registrar</option>
                      <option value="Chief Hostel Warden / Proctor">Chief Hostel Warden / Proctor</option>
                      <option value="Director of IT & Campus Systems">Director of IT & Campus Systems</option>
                      <option value="Estate & Campus Works Officer">Estate & Campus Works Officer</option>
                      <option value="Student Grievance Redressal Officer">Student Grievance Redressal Officer</option>
                      <option value="Head of Department">Head of Department</option>
                      <option value="Campus Administration Officer">Campus Administration Officer</option>
                      <option value="Other">Other designation (specify below)</option>
                    </select>
                  </label>

                  <label className="auth-label">
                    Department / administrative wing *
                    <input
                      required
                      value={department}
                      onChange={(event) => setDepartment(event.target.value)}
                      placeholder="e.g. Office of Student Affairs"
                    />
                  </label>
                </div>

                {designation === "Other" && (
                  <label className="auth-label">
                    Specify custom designation *
                    <input
                      required
                      value={customDesignation}
                      onChange={(event) => setCustomDesignation(event.target.value)}
                      placeholder="e.g. Senior Campus Officer"
                    />
                  </label>
                )}

                <div className="auth-two-col">
                  <label className="auth-label">
                    Official institutional email *
                    <input
                      required
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="e.g. biren.das@dibru.ac.in"
                      autoComplete="email"
                    />
                    <span className="auth-hint">Official domain (.ac.in / .edu.in)</span>
                  </label>

                  <label className="auth-label">
                    Contact number / intercom
                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="e.g. +91 373 2370243"
                    />
                  </label>
                </div>

                <label className="auth-label">
                  Account password *
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                  />
                </label>

                {/* Section 3: Security & Authorization Key */}
                <div className="auth-section-title">
                  <ShieldAlert size={14} /> 3. Authorization & Security Key
                </div>

                <label className="auth-label">
                  Campus administrative authorization key *
                  <input
                    required
                    type="password"
                    value={adminSignupCode}
                    onChange={(event) => setAdminSignupCode(event.target.value)}
                    placeholder="Enter 6-digit administrative security passcode"
                  />
                  <span className="auth-hint">
                    🔒 Authorization key issued by IT administration. (Demo deployment key: <b>221232</b>)
                  </span>
                </label>

                <label className="auth-checkbox-label">
                  <input
                    type="checkbox"
                    required
                    checked={authorizedAffirmation}
                    onChange={(event) => setAuthorizedAffirmation(event.target.checked)}
                  />
                  <span>
                    I solemnly certify that I am an authorized administrative staff member of this institution and duly permitted to establish campus grievance routing and dispatch work orders on CivicSense.
                  </span>
                </label>
              </div>
            ) : (
              <>
                {isSignUp && (
                  <label className="auth-label">
                    Full name
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Arjun Das"
                      autoComplete="name"
                      required
                    />
                  </label>
                )}
                <label className="auth-label">
                  Email address
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@university.ac.in"
                    autoComplete="email"
                    required
                  />
                </label>
                <label className="auth-label">
                  Password
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={isSignUp ? "At least 8 characters" : "Enter your password"}
                    autoComplete={isSignUp ? "new-password" : "current-password"}
                    required
                  />
                </label>
                {isSignUp && (
                  <CampusSearchSelect
                    label="Your campus"
                    value={campusName}
                    campuses={availableCampuses}
                    onChange={setCampusName}
                    required
                  />
                )}
                {isSignUp && accountType === "student" && availableCampuses.length === 0 && (
                  <div className="auth-error">
                    <AlertCircle size={15} />No campuses are registered yet. Ask an administrator to register a campus first.
                  </div>
                )}
              </>
            )}

            {error && (
              <div className="auth-error">
                <AlertCircle size={15} />{error}
              </div>
            )}

            <button
              className="auth-submit"
              disabled={loading || (isSignUp && accountType === "student" && availableCampuses.length === 0)}
            >
              {loading ? (
                <><Loader2 size={16} className="spin" />Please wait...</>
              ) : isSignUp ? (
                accountType === "admin" ? "Verify credentials & register campus" : "Create account"
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <small className="auth-privacy">
            <ShieldCheck size={13} /> Your information is encrypted and secure.
          </small>
        </div>

        <div className="auth-footer">© 2026 CivicSense · Dibrugarh University</div>
      </div>
    </div>
  );
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
        <div className="landing-visual"><div className="visual-glow" /><div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" /><div className="dashboard-preview"><div className="preview-top"><div className="preview-brand"><span><img src="/newLogo.png" alt="" /></span><b>CivicSense</b></div><div className="preview-dots">•••</div></div><div className="preview-content"><div className="preview-greeting"><small>MONDAY, 4 NOVEMBER 2026</small><b>Good morning, Arjun</b><span>Help make campus better, one report at a time.</span></div><div className="preview-metrics"><div><i className="mini-metric orange" /><small>Active issues</small><b>12</b></div><div><i className="mini-metric green" /><small>Resolved</small><b>38</b></div><div><i className="mini-metric blue" /><small>Avg. time</small><b>2.4d</b></div></div><div className="preview-report"><div className="preview-report-head"><b>Recent complaints</b><small>View all →</small></div><div className="preview-complaint"><span className="preview-complaint-icon"><DropletIcon /></span><div><b>Water supply interrupted</b><small><MapPin size={8} /> Hostel block C · Today</small></div><span className="preview-status">In progress</span></div><div className="preview-complaint"><span className="preview-complaint-icon purple"><Bot size={13} /></span><div><b>ৱাই-ফাই সংযোগ নাই</b><small><MapPin size={8} /> Central Library · Today</small></div><span className="preview-status new">New</span></div></div></div><div className="preview-ai"><span><Sparkles size={15} /></span><div><b>AI analysis complete</b><small>Routed to Maintenance · High priority</small></div><CheckCircle2 size={17} /></div></div><div className="floating-note note-top"><span className="floating-icon"><Languages size={15} /></span><div><b>Two languages</b><small>English + অসমীয়া</small></div></div><div className="floating-note note-bottom"><span className="floating-icon green-float"><Check size={15} /></span><div><b>Resolved today</b><small>Making an impact together</small></div></div></div>
      </section>
      <section className="landing-stats" id="impact"><div><b>2,000+</b><span>campus voices heard</span></div><div><b>94%</b><span>issues resolved</span></div><div><b>2.4 days</b><span>average resolution time</span></div><div><b>2 languages</b><span>one inclusive platform</span></div></section>
      <section className="landing-section" id="how-it-works"><div className="section-kicker">SIMPLE BY DESIGN</div><h2>From a report to a resolution,<br /><em>every step is visible.</em></h2><p className="section-intro">CivicSense takes the friction out of campus issue management so your university can focus on what matters most.</p><div className="landing-features"><FeatureCard number="01" icon={<MessageSquareText size={20} />} title="Speak your mind" text="Describe an issue naturally in English or Assamese. Add a photo and location for helpful context." /><FeatureCard number="02" icon={<Sparkles size={20} />} title="AI finds the right path" text="Our intelligent triage understands your report, sets urgency, and routes it to the right department." /><FeatureCard number="03" icon={<CheckCircle2 size={20} />} title="See real progress" text="Get clear updates from submission to resolution. Your voice stays connected to the outcome." /></div></section>
      <section className="landing-language-section" id="languages"><div className="language-section-art"><div className="language-card language-card-back">Your campus, your voice.</div><div className="language-card language-card-front"><Languages size={23} /><b>ভাল কেম্পাছ<br />আমাৰ সকলোৰে বাবে।</b><small>A better campus for everyone.</small></div></div><div><div className="section-kicker">BUILT FOR EVERY VOICE</div><h2>Technology that<br /><em>speaks your language.</em></h2><p>Real inclusion means more than translating a button. CivicSense understands Assamese reports, generates clear bilingual updates, and lets every member of the university participate with confidence.</p><button className="outline-landing-button" onClick={onEnter}>Explore CivicSense <ArrowRight size={16} /></button></div></section>
      <section className="landing-cta"><div><div className="section-kicker light-kicker">MAKE A DIFFERENCE</div><h2>Notice something?<br /><em>Let’s make it better.</em></h2></div><button className="landing-primary white-button" onClick={onEnter}>Enter CivicSense <ArrowRight size={17} /></button></section>
    </main>
    <footer className="landing-footer"><div className="landing-brand footer-brand"><span className="landing-brand-mark"><img src="/newLogo.png" alt="CivicSense" /></span><span><b>CivicSense</b><small>SMART CAMPUS CARE</small></span></div><span>Built for a more connected Dibrugarh University.</span><span>© 2026 CivicSense</span></footer>
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
    ? [{ view: "admin", label: "Admin", icon: <ShieldCheck size={18} />, count: counts.active }, { view: "analytics", label: labels.analytics, icon: <Activity size={18} /> }, { view: "settings", label: "Settings", icon: <Settings size={18} /> }]
    : [{ view: "overview", label: labels.overview, icon: <LayoutDashboard size={18} /> }, { view: "complaints", label: labels.complaints, icon: <MessageSquareText size={18} />, count: counts.active }, { view: "services", label: labels.services, icon: <BookOpen size={18} /> }, { view: "analytics", label: labels.analytics, icon: <Activity size={18} /> }, { view: "notifications", label: labels.notifications, icon: <Bell size={18} />, count: counts.unread }, { view: "settings", label: labels.settings, icon: <Settings size={18} /> }];
  return <nav className={`mobile-bottom-nav ${isAdmin ? "mobile-bottom-admin" : ""}`} aria-label="Mobile navigation">{items.map((item) => <button key={item.view} className={view === item.view ? "mobile-bottom-active" : ""} onClick={() => onNavigate(item.view)} aria-label={item.label}>{item.icon}<span>{item.label}</span>{item.count ? <b>{item.count}</b> : null}</button>)}</nav>;
}

type ServiceItem = {
  label: string;
  labelAs: string;
  department: string;
  departmentAs: string;
  description: string;
  descriptionAs: string;
  icon: React.ReactNode;
  accent: "purple" | "blue" | "green" | "orange";
  tags: string[];
  tagsAs: string[];
  sla: string;
  slaAs: string;
};

type ServiceGroup = {
  id: "academic" | "finance" | "living";
  title: string;
  titleAs: string;
  subtitle: string;
  subtitleAs: string;
  accentClass: string;
  items: ServiceItem[];
};

function StudentServices({ language = "en", onSubmit }: { language?: Language; onSubmit: (serviceCategory?: string) => void }) {
  const isAssamese = language === "as";
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<"all" | "academic" | "finance" | "living">("all");

  const serviceGroups: ServiceGroup[] = [
    {
      id: "academic",
      title: "Academic & Examination Services",
      titleAs: "শৈক্ষিক আৰু পৰীক্ষা সেৱা",
      subtitle: "Official requests routed directly to Examination Cell, Registrar & Academic Section",
      subtitleAs: "পৰীক্ষা শাখা, পঞ্জীয়ক আৰু শৈক্ষিক কাৰ্যালয়ৰ প্ৰত্যক্ষ সেৱা",
      accentClass: "service-tag-purple",
      items: [
        {
          label: "Examinations & marksheets",
          labelAs: "পৰীক্ষা আৰু নম্বৰতালিকা",
          department: "Examination Cell",
          departmentAs: "পৰীক্ষা শাখা",
          description: "Exam forms, results, marksheet corrections, re-evaluation, admit cards, and grade queries.",
          descriptionAs: "পৰীক্ষাৰ প্ৰ-পত্ৰ, ফলাফল, নম্বৰতালিকা সংশোধন, পুনৰীক্ষণ আৰু এডমিট কাৰ্ড।",
          icon: <GraduationCap size={20} />,
          accent: "purple",
          tags: ["Exam Forms", "Marksheet Correction", "Re-evaluation", "Results"],
          tagsAs: ["পৰীক্ষা ফৰ্ম", "মাৰ্কশ্বীট সংশোধন", "পুনৰীক্ষণ"],
          sla: "24–48h SLA",
          slaAs: "২৪–৪৮ ঘণ্টা",
        },
        {
          label: "Registration & enrollment",
          labelAs: "পঞ্জীয়ন আৰু নামভৰ্তি",
          department: "Academic Section",
          departmentAs: "শৈক্ষিক শাখা",
          description: "Semester registration, course enrollment, subject changes, course codes, and admission help.",
          descriptionAs: "ষাণ্মাসিক পঞ্জীয়ন, নামভৰ্তিৰ তথ্য, বিষয় সলনি আৰু ক'ৰ্ছ পঞ্জীয়ন।",
          icon: <Users size={20} />,
          accent: "blue",
          tags: ["Course Add/Drop", "Enrollment ID", "Admission", "Semester Reg"],
          tagsAs: ["বিষয় সলনি", "নামভৰ্তি", "ক'ৰ্ছ পঞ্জীয়ন"],
          sla: "1–2 Days",
          slaAs: "১–২ দিন",
        },
        {
          label: "Certificates & documents",
          labelAs: "প্ৰমাণপত্ৰ আৰু নথিপত্ৰ",
          department: "Registrar's Office",
          departmentAs: "পঞ্জীয়কৰ কাৰ্যালয়",
          description: "Bonafide certificates, migration, transcripts, duplicate degree certificates, and official verifications.",
          descriptionAs: "বোনাফাইড প্ৰমাণপত্ৰ, প্ৰব্ৰজন (Migration), ট্ৰান্সক্ৰিপ্ট আৰু নথিপত্ৰ সত্যাপন।",
          icon: <FileText size={20} />,
          accent: "purple",
          tags: ["Bonafide", "Migration", "Official Transcripts", "Verification"],
          tagsAs: ["বোনাফাইড", "প্ৰব্ৰজন", "ট্ৰান্সক্ৰিপ্ট", "সত্যাপন"],
          sla: "2–3 Days",
          slaAs: "২–৩ দিন",
        },
      ],
    },
    {
      id: "finance",
      title: "Fees & Financial Support",
      titleAs: "মাচুল আৰু বিত্তীয় সাহায্য",
      subtitle: "Official requests routed to Accounts, Finance Section & Scholarship Cell",
      subtitleAs: "হিচাপ, বিত্ত আৰু বৃত্তি শাখাৰ প্ৰত্যক্ষ সেৱা",
      accentClass: "service-tag-green",
      items: [
        {
          label: "Semester fees",
          labelAs: "ষাণ্মাসিক মাচুল",
          department: "Accounts & Finance",
          departmentAs: "হিচাপ আৰু বিত্ত শাখা",
          description: "Tuition fee payments, dues clearance, fee receipts, payment reconciliation, and ledger updates.",
          descriptionAs: "ষাণ্মাসিক টিউচন মাচুল, ৰচিদ ডাউনলোড, বকেয়া পৰিশোধ আৰু একাউণ্ট আপডেট।",
          icon: <CreditCard size={20} />,
          accent: "green",
          tags: ["Tuition Fee", "Fee Receipts", "Dues Clearance", "Payment Portal"],
          tagsAs: ["টিউচন মাচুল", "মাচুল ৰচিদ", "বকেয়া", "পেমেন্ট"],
          sla: "24h Response",
          slaAs: "২৪ ঘণ্টা",
        },
        {
          label: "Exam fees",
          labelAs: "পৰীক্ষা মাচুল",
          department: "Accounts & Finance",
          departmentAs: "হিচাপ আৰু বিত্ত শাখা",
          description: "Exam fee payment issues, failed UPI/bank deductions, challan receipts, and exam portal unlocking.",
          descriptionAs: "পৰীক্ষা মাচুল পৰিশোধৰ সমস্যা, বিফল লেনদেন (Failed UPI) আৰু চালান সত্যাপন।",
          icon: <span className="service-symbol">₹</span>,
          accent: "orange",
          tags: ["Payment Failure", "Challan", "Receipt Missing", "Form Lock"],
          tagsAs: ["বিফল লেনদেন", "চালান", "ৰচিদ সমস্যা"],
          sla: "Same-Day Priority",
          slaAs: "সেইদিনাই অগ্ৰাধিকাৰ",
        },
        {
          label: "Scholarships & financial aid",
          labelAs: "বৃত্তি আৰু আৰ্থিক সাহায্য",
          department: "Student Welfare & Scholarship Cell",
          departmentAs: "বৃত্তি আৰু ছাত্ৰ কল্যাণ শাখা",
          description: "National Scholarship Portal (NSP), state merit stipends, fee waivers, minority grants, and disbursement.",
          descriptionAs: "ৰাষ্ট্ৰীয় আৰু ৰাজ্যিক বৃত্তি (NSP), মেধা বৃত্তি, মাচুল ৰেহাই আৰু আৰ্থিক অনুদান।",
          icon: <Sparkles size={20} />,
          accent: "orange",
          tags: ["NSP Portal", "State Stipend", "Merit Aid", "Disbursement"],
          tagsAs: ["ৰাষ্ট্ৰীয় বৃত্তি", "ষ্টাইপেণ্ড", "মেধা বৃত্তি"],
          sla: "2–4 Days",
          slaAs: "২–৪ দিন",
        },
      ],
    },
    {
      id: "living",
      title: "Campus Living & Student Welfare",
      titleAs: "কেম্পাছ জীৱন আৰু কল্যাণ",
      subtitle: "Official requests routed to Hostel Administration, Central Library & Dean of Students",
      subtitleAs: "হোষ্টেল প্ৰশাসন, কেন্দ্ৰীয় গ্ৰন্থাগাৰ আৰু ছাত্ৰ কল্যাণ সেৱা",
      accentClass: "service-tag-blue",
      items: [
        {
          label: "Hostel & student support",
          labelAs: "হোষ্টেল আৰু ছাত্ৰাবাস সেৱা",
          department: "Hostel Administration & Estate",
          departmentAs: "হোষ্টেল প্ৰশাসন আৰু এষ্টেট",
          description: "Hostel seat allotment, room maintenance, mess queries, warden permissions, and living amenities.",
          descriptionAs: "ছাত্ৰাবাসৰ আসন আৱণ্টন, কোঠাৰ মেৰামতি, মেছ আৰু ৱাৰ্ডেনৰ অনুমতি।",
          icon: <Building2 size={20} />,
          accent: "blue",
          tags: ["Room Allotment", "Maintenance", "Mess Query", "Warden Desk"],
          tagsAs: ["আসন আৱণ্টন", "মেৰামতি", "মেছ", "ৱাৰ্ডেন"],
          sla: "24h Action",
          slaAs: "২৪ ঘণ্টা কাৰ্যব্যৱস্থা",
        },
        {
          label: "Library services",
          labelAs: "গ্ৰন্থাগাৰ সেৱা",
          department: "Lakshminath Bezbaroa Central Library",
          departmentAs: "লক্ষ্মীনাথ বেজবৰুৱা কেন্দ্ৰীয় গ্ৰন্থাগাৰ",
          description: "Library access cards, book issues & renewals, fine appeals, OPAC accounts, and digital repository access.",
          descriptionAs: "গ্ৰন্থাগাৰ একাউণ্ট, কিতাপ নৱীকৰণ, জৰিমনা ৰেহাই আৰু ই-সম্পদ।",
          icon: <BookOpen size={20} />,
          accent: "blue",
          tags: ["Library Card", "Book Renewal", "Fine Waiver", "E-Resources"],
          tagsAs: ["লাইব্ৰেৰী কাৰ্ড", "কিতাপ নৱীকৰণ", "জৰিমনা ৰেহাই"],
          sla: "Instant / 24h",
          slaAs: "তৎকালীন / ২৪ ঘণ্টা",
        },
        {
          label: "Student welfare & counselling",
          labelAs: "শিক্ষাৰ্থী কল্যাণ আৰু পৰামৰ্শ",
          department: "Dean of Student Affairs & Health Centre",
          departmentAs: "শিক্ষাৰ্থী কল্যাণ বিষয়া আৰু স্বাস্থ্য কেন্দ্ৰ",
          description: "Confidential mental health counselling, disability accessibility, anti-ragging support, and student wellbeing.",
          descriptionAs: "গোপনীয় মানসিক স্বাস্থ্য পৰামৰ্শ, বিশেষ সুবিধা, ৰেগিং বিৰোধী সুৰক্ষা আৰু কল্যাণ।",
          icon: <Users size={20} />,
          accent: "green",
          tags: ["Counselling", "Accessibility", "Anti-Ragging", "Confidential"],
          tagsAs: ["পৰামৰ্শ", "সুবিধা", "ৰেগিং বিৰোধী", "গোপনীয়"],
          sla: "Confidential / Priority",
          slaAs: "গোপনীয় / তৎকালীন",
        },
      ],
    },
  ];

  const filterTabLabels = [
    { key: "all", label: "All Services", labelAs: "সকলো সেৱা", count: 9 },
    { key: "academic", label: "Academic & Exams", labelAs: "শৈক্ষিক আৰু পৰীক্ষা", count: 3 },
    { key: "finance", label: "Fees & Financial Aid", labelAs: "মাচুল আৰু সাহায্য", count: 3 },
    { key: "living", label: "Campus Living & Welfare", labelAs: "কেম্পাছ জীৱন", count: 3 },
  ];

  const query = searchTerm.trim().toLowerCase();

  const filteredGroups = serviceGroups
    .filter((g) => selectedGroup === "all" || g.id === selectedGroup)
    .map((group) => {
      if (!query) return group;
      const matchedItems = group.items.filter((item) => {
        return (
          item.label.toLowerCase().includes(query) ||
          item.labelAs.toLowerCase().includes(query) ||
          item.department.toLowerCase().includes(query) ||
          item.departmentAs.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.descriptionAs.toLowerCase().includes(query) ||
          item.tags.some((t) => t.toLowerCase().includes(query)) ||
          item.tagsAs.some((t) => t.toLowerCase().includes(query))
        );
      });
      return { ...group, items: matchedItems };
    })
    .filter((g) => g.items.length > 0);

  const totalFilteredCount = filteredGroups.reduce((acc, g) => acc + g.items.length, 0);

  return (
    <div className="page-enter student-services-page">
      {/* 1. Page Header & Hero */}
      <section className="student-services-hero">
        <div className="page-heading-row" style={{ marginBottom: 0 }}>
          <div>
            <div className="eyebrow">
              <BookOpen size={14} /> {isAssamese ? "ডিব্ৰুগড় বিশ্ববিদ্যালয় // কেন্দ্ৰীয় শিক্ষাৰ্থী সেৱা কেন্দ্ৰ" : "DIBRUGARH UNIVERSITY // CENTRAL STUDENT SERVICES"}
            </div>
            <h1>{isAssamese ? "শিক্ষাৰ্থী সেৱা আৰু শৈক্ষিক কেন্দ্ৰ" : "Student Services & Academic Helpdesk"}</h1>
            <p>
              {isAssamese
                ? "পোনপটীয়া আবেদন, AI নিৰ্দেশনা আৰু ক্ষিপ্ৰ নিৰীক্ষণৰ সৈতে বিশ্ববিদ্যালয়ৰ বিভাগসমূহৰ ডিজিটেল সেৱা।"
                : "Direct digital requests to university departments with automated AI validation and real-time status tracking."}
            </p>
          </div>
        </div>

        {/* Live Search Bar */}
        <div className="student-services-search-bar">
          <Search size={18} color="var(--teal)" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              isAssamese
                ? "সেৱা, বিভাগ বা সমস্যা বিচাৰক (যেনে 'মাৰ্কশ্বীট', 'মাচুল ৰচিদ', 'বোনাফাইড', 'হোষ্টেল')..."
                : 'Search 9 university services by name, department, or keyword (e.g. "marksheet", "fee receipt", "bonafide", "hostel")...'
            }
          />
          {searchTerm && (
            <button className="search-clear-btn" onClick={() => setSearchTerm("")} title={isAssamese ? "সন্ধান মচক" : "Clear search"}>
              <X size={13} />
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="services-filter-tabs">
          {filterTabLabels.map((tab) => (
            <button
              key={tab.key}
              className={`service-filter-tab ${selectedGroup === tab.key ? "active" : ""}`}
              onClick={() => setSelectedGroup(tab.key as any)}
            >
              <span>{isAssamese ? tab.labelAs : tab.label}</span>
              <em>{tab.count}</em>
            </button>
          ))}
        </div>
      </section>

      {/* 2. Key Guarantees & SLA Strip */}
      <section className="services-guarantees-strip">
        <div className="guarantee-card">
          <div className="guarantee-icon guarantee-icon-purple">
            <Zap size={18} />
          </div>
          <div className="guarantee-copy">
            <b>{isAssamese ? "পোনপটীয়া শাখা সংযোগ" : "Direct Cell Routing"}</b>
            <span>{isAssamese ? "পৰীক্ষা, বিত্ত আৰু পঞ্জীয়ক শাখা" : "Pre-mapped to Exam, Accounts & Registrar"}</span>
          </div>
        </div>
        <div className="guarantee-card">
          <div className="guarantee-icon guarantee-icon-teal">
            <Clock3 size={18} />
          </div>
          <div className="guarantee-copy">
            <b>{isAssamese ? "২৪–৪৮ ঘণ্টা কাৰ্যকাল" : "24–48h Response SLA"}</b>
            <span>{isAssamese ? "স্থিতিৰ আপডেটৰ সৈতে ক্ষিপ্ৰ সমাধান" : "Tracked response window with updates"}</span>
          </div>
        </div>
        <div className="guarantee-card">
          <div className="guarantee-icon guarantee-icon-blue">
            <Sparkles size={18} />
          </div>
          <div className="guarantee-copy">
            <b>{isAssamese ? "দ্বি-ভাষিক AI সহায়ক" : "Bilingual AI Guidance"}</b>
            <span>{isAssamese ? "অসমীয়া আৰু ইংৰাজী ভাষাত পৰীক্ষা" : "Assamese & English field prompts"}</span>
          </div>
        </div>
        <div className="guarantee-card">
          <div className="guarantee-icon guarantee-icon-green">
            <BadgeCheck size={18} />
          </div>
          <div className="guarantee-copy">
            <b>{isAssamese ? "লাইভ নিৰীক্ষণ ক্ৰিয়া" : "Live Docket Tracking"}</b>
            <span>{isAssamese ? "প্ৰতিটো আবেদনৰ বাবে সুকীয়া আইডি" : "Unique ID generated with dashboard logs"}</span>
          </div>
        </div>
      </section>

      {/* 3. Main 2-Column Responsive Layout */}
      <div className="student-services-layout">
        {/* Left / Main Column: Categorized Services */}
        <div className="services-main-col">
          {filteredGroups.length === 0 ? (
            <div className="no-services-found">
              <CircleHelp size={32} color="var(--muted)" />
              <b>{isAssamese ? "কোনো সেৱা বিচাৰি পোৱা নগল" : "No services found matching your search"}</b>
              <p>
                {isAssamese
                  ? `"${searchTerm}" ৰ বাবে কোনো ফলাফল নাই। অনুগ্ৰহ কৰি অন্য শব্দ ব্যৱহাৰ কৰক।`
                  : `No results for "${searchTerm}". Try checking your spelling or clearing filters.`}
              </p>
              <button
                className="secondary-button"
                style={{ marginTop: 8 }}
                onClick={() => {
                  setSearchTerm("");
                  setSelectedGroup("all");
                }}
              >
                {isAssamese ? "সকলো সেৱা দেখুৱাওক" : "Show All Services"}
              </button>
            </div>
          ) : (
            filteredGroups.map((group) => (
              <section key={group.id} className="service-group-section">
                <div className="service-group-head">
                  <div className="service-group-head-left">
                    <span className={`service-group-tag ${group.accentClass}`} />
                    <div>
                      <h2>{isAssamese ? group.titleAs : group.title}</h2>
                      <p>{isAssamese ? group.subtitleAs : group.subtitle}</p>
                    </div>
                  </div>
                  <span className="service-group-badge">
                    {group.items.length} {isAssamese ? "সেৱা" : "services"}
                  </span>
                </div>

                <div className="service-cards-grid">
                  {group.items.map((service) => (
                    <button
                      key={service.label}
                      className="modern-service-card"
                      onClick={() => onSubmit(service.label)}
                    >
                      <div>
                        <div className="modern-service-card-head">
                          <span className={`service-card-icon-wrap ${service.accent}`}>
                            {service.icon}
                          </span>
                          <span className="card-sla-badge">{isAssamese ? service.slaAs : service.sla}</span>
                        </div>

                        <div className="modern-service-card-content">
                          <span className="card-dept-badge">{isAssamese ? service.departmentAs : service.department}</span>
                          <h3>{isAssamese ? service.labelAs : service.label}</h3>
                          <p>{isAssamese ? service.descriptionAs : service.description}</p>
                          <div className="modern-service-card-tags">
                            {(isAssamese ? service.tagsAs : service.tags).map((tag) => (
                              <span key={tag} className="service-pill-tag">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="modern-service-card-footer">
                        <span className="card-action-hint">
                          {isAssamese ? "আবেদন ফৰ্ম খোলক" : "Open Service Form"}
                          <ArrowRight size={13} />
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        {/* Right Column: Fast Track Shortcuts & University Directory */}
        <aside className="services-side-col">
          {/* Fast-Track Card */}
          <div className="services-sidebar-card">
            <h3 className="sidebar-card-title">
              <Zap size={16} color="var(--orange)" />
              <div>
                {isAssamese ? "দ্ৰুত সেৱা লিংক" : "Fast-Track Services"}
                <span>{isAssamese ? "সঘনাই বিচৰা আৱেদনসমূহ" : "Top requested student forms"}</span>
              </div>
            </h3>
            <div className="fast-track-list">
              <button
                className="fast-track-btn"
                onClick={() => onSubmit("Certificates & documents")}
              >
                <div className="fast-track-btn-copy">
                  <span>📄 {isAssamese ? "বোনাফাইড প্ৰমাণপত্ৰ" : "Bonafide Certificate"}</span>
                  <small>{isAssamese ? "পঞ্জীয়কৰ কাৰ্যালয়" : "Registrar's Office"}</small>
                </div>
                <ArrowRight size={14} color="var(--muted)" />
              </button>
              <button
                className="fast-track-btn"
                onClick={() => onSubmit("Examinations & marksheets")}
              >
                <div className="fast-track-btn-copy">
                  <span>🎓 {isAssamese ? "নম্বৰতালিকা সংশোধন / পুনৰীক্ষণ" : "Marksheet Correction / Re-eval"}</span>
                  <small>{isAssamese ? "পৰীক্ষা শাখা" : "Examination Cell"}</small>
                </div>
                <ArrowRight size={14} color="var(--muted)" />
              </button>
              <button
                className="fast-track-btn"
                onClick={() => onSubmit("Semester fees")}
              >
                <div className="fast-track-btn-copy">
                  <span>💳 {isAssamese ? "মাচুল ৰচিদ / বিফল পেমেন্ট" : "Semester Fee Receipt Issue"}</span>
                  <small>{isAssamese ? "হিচাপ আৰু বিত্ত" : "Accounts & Finance"}</small>
                </div>
                <ArrowRight size={14} color="var(--muted)" />
              </button>
              <button
                className="fast-track-btn"
                onClick={() => onSubmit("Hostel & student support")}
              >
                <div className="fast-track-btn-copy">
                  <span>🏠 {isAssamese ? "হোষ্টেল কোঠাৰ মেৰামতি" : "Hostel Room Maintenance"}</span>
                  <small>{isAssamese ? "ছাত্ৰাবাস এষ্টেট" : "Hostel Estate Cell"}</small>
                </div>
                <ArrowRight size={14} color="var(--muted)" />
              </button>
            </div>
          </div>

          {/* 3-Step Lifecycle Card */}
          <div className="services-sidebar-card">
            <h3 className="sidebar-card-title">
              <Sparkles size={16} color="var(--teal)" />
              <div>
                {isAssamese ? "কেনেদৰে আবেদন কৰিব" : "How It Works"}
                <span>{isAssamese ? "৩টা সহজ পদক্ষেপ" : "3-step verified workflow"}</span>
              </div>
            </h3>
            <div className="lifecycle-steps">
              <div className="lifecycle-step">
                <span className="step-num">1</span>
                <div className="step-copy">
                  <b>{isAssamese ? "সেৱা নিৰ্বাচন কৰক" : "Select Service"}</b>
                  <span>{isAssamese ? "আপোনাৰ আৱশ্যকীয় বিভাগ ফৰ্ম বাছনি কৰক।" : "Choose the right department form above."}</span>
                </div>
              </div>
              <div className="lifecycle-step">
                <span className="step-num">2</span>
                <div className="step-copy">
                  <b>{isAssamese ? "AI নিৰ্দেশনাৰে পূৰণ কৰক" : "Fill with AI Validation"}</b>
                  <span>{isAssamese ? "বিৱৰণ আৰু নথিপত্ৰ যোগ দিয়ক।" : "Add details; AI verifies fields and docs."}</span>
                </div>
              </div>
              <div className="lifecycle-step">
                <span className="step-num">3</span>
                <div className="step-copy">
                  <b>{isAssamese ? "লাইভ স্থিতি নিৰীক্ষণ কৰক" : "Track to Resolution"}</b>
                  <span>{isAssamese ? "ট্ৰেকিং আইডিৰে প্ৰত্যক্ষ সমাধান পাওক।" : "Receive docket ID and real-time alerts."}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Helpdesk Directory Card */}
          <div className="services-sidebar-card">
            <h3 className="sidebar-card-title">
              <Building2 size={16} color="var(--blue)" />
              <div>
                {isAssamese ? "বিশ্ববিদ্যালয়ৰ সাহায্য কেন্দ্ৰ" : "University Helpdesk"}
                <span>{isAssamese ? "প্ৰশাসনিক যোগাযোগ" : "Administrative directory"}</span>
              </div>
            </h3>
            <div className="helpdesk-info-list">
              <div className="helpdesk-info-item">
                <MapPin size={15} color="var(--teal)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <strong>{isAssamese ? "অৱস্থান" : "Location"}</strong>
                  {isAssamese ? "প্ৰশাসনিক ভৱন, ডিব্ৰুগড় বিশ্ববিদ্যালয়" : "Administrative Block, Dibrugarh University"}
                </div>
              </div>
              <div className="helpdesk-info-item">
                <Clock3 size={15} color="var(--teal)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <strong>{isAssamese ? "কাৰ্যালয়ৰ সময়" : "Working Hours"}</strong>
                  {isAssamese ? "সোম – শুক্ৰ: পুৱা ৯:৩০ – বিয়লি ৫:০০" : "Monday – Friday: 9:30 AM – 5:00 PM"}
                </div>
              </div>
              <div className="helpdesk-info-item">
                <Phone size={15} color="var(--teal)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <strong>{isAssamese ? "দূৰভাষ" : "Central Enquiry"}</strong>
                  +91 373 2370243 (Ext. 204)
                </div>
              </div>
              <div className="helpdesk-info-item">
                <Mail size={15} color="var(--teal)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  <strong>{isAssamese ? "ই-মেইল" : "Helpdesk Email"}</strong>
                  studenthelp@dibru.ac.in
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Overview({ t, language, userName, campus, complaints, loading, counts, onSubmit, onViewAll, onPulse, onSelect }: { t: typeof copy.en; language: Language; userName: string; campus: Campus; complaints: Complaint[]; loading: boolean; counts: { active: number; resolved: number; unread: number }; onSubmit: () => void; onViewAll: () => void; onPulse: () => void; onSelect: (complaint: Complaint) => void }) {
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
        <button className="action-card" onClick={onPulse}><div className="action-icon action-icon-purple"><Activity size={20} /></div><div><b>{language === "as" ? "কেম্পাছ আপডেট আৰু ফীড" : "Campus Updates & Feed"}</b><span>{language === "as" ? "চলি থকা কাম, ফটো প্ৰমাণ আৰু সমৰ্থন" : "Live repairs, photo proof & student votes"}</span></div><ArrowRight size={18} /></button>
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

function SettingsView({
  language,
  setLanguage,
  role,
  setRole,
  onSave,
  currentUser,
  displayName,
  onSignOut,
  logOutLabel,
}: {
  language: Language;
  setLanguage: (language: Language) => void;
  role: "student" | "admin";
  setRole: (role: "student" | "admin") => void;
  onSave: () => void;
  currentUser?: AuthUser | null;
  displayName: string;
  onSignOut: () => void | Promise<void>;
  logOutLabel?: string;
}) {
  const isAssamese = language === "as";
  const userInitials = displayName ? displayName.slice(0, 2).toUpperCase() : "CS";

  return (
    <div className="page-enter">
      <section className="page-heading-row">
        <div>
          <div className="eyebrow"><Settings size={14} /> {isAssamese ? "প্ৰাধান্যসমূহ" : "PREFERENCES"}</div>
          <h1>{isAssamese ? "ছেটিংছ" : "Settings"}</h1>
          <p>{isAssamese ? "আপোনাৰ CivicSense অভিজ্ঞতা পছন্দ অনুসৰি সাজক।" : "Personalise your CivicSense experience."}</p>
        </div>
        <button className="primary-button" onClick={onSave}>
          <Check size={17} />{isAssamese ? "পৰিৱৰ্তন সংৰক্ষণ কৰক" : "Save changes"}
        </button>
      </section>

      <div className="settings-grid">
        <div className="panel settings-panel">
          <h2>{isAssamese ? "প্ৰফাইল" : "Profile"}</h2>
          <p className="panel-subtitle">{isAssamese ? "আপোনাৰ একাউণ্টৰ বিৱৰণ" : "Your account details"}</p>
          <div className="profile-editor">
            <div className="large-avatar avatar-purple">{userInitials}</div>
            <button className="text-button" type="button">{isAssamese ? "ফটো সলনি কৰক" : "Change photo"}</button>
          </div>
          <label className="field-label">
            {isAssamese ? "সম্পূৰ্ণ নাম" : "Full name"}
            <input defaultValue={displayName} />
          </label>
          <label className="field-label">
            {isAssamese ? "ইমেইল ঠিকনা" : "Email address"}
            <input defaultValue={currentUser?.email || "student@campus.edu"} readOnly />
          </label>
          <label className="field-label">
            {isAssamese ? "ভূমিকা" : "Role"}
            <select value={role} onChange={(event) => setRole(event.target.value as "student" | "admin")}>
              <option value="student">{isAssamese ? "শিক্ষাৰ্থী (Student)" : "Student"}</option>
              <option value="admin">{isAssamese ? "কেম্পাছ প্ৰশাসক (Administrator)" : "Administrator (demo)"}</option>
            </select>
          </label>
        </div>

        <div className="panel settings-panel">
          <div className="settings-panel-heading">
            <div>
              <h2>{isAssamese ? "ভাষা আৰু জাননী" : "Language & notifications"}</h2>
              <p className="panel-subtitle">{isAssamese ? "CivicSense এ আপোনাৰ সৈতে কেনেদৰে যোগাযোগ কৰিব বাছক" : "Choose how CivicSense communicates with you"}</p>
            </div>
            <PwaInstallButton className="secondary-button" label={isAssamese ? "এপ্প ইনষ্টল কৰক" : "Install app"} />
          </div>
          <label className="field-label">
            {isAssamese ? "পছন্দৰ ভাষা" : "Preferred language"}
            <div className="language-select">
              <button type="button" className={language === "en" ? "selected-lang" : ""} onClick={() => setLanguage("en")}>English</button>
              <button type="button" className={language === "as" ? "selected-lang" : ""} onClick={() => setLanguage("as")}>অসমীয়া</button>
            </div>
          </label>
          <ToggleRow label={isAssamese ? "স্থিতিৰ আপডেট" : "Status updates"} description={isAssamese ? "অভিযোগৰ স্থিতি সলনি হ'লে জাননী পাওক" : "Get notified when your complaint changes status"} />
          <ToggleRow label={isAssamese ? "সদৃশ সমস্যাৰ সতৰ্কবাৰ্তা" : "Similar issue alerts"} description={isAssamese ? "একেধৰণৰ সমস্যা ইতিমধ্যে প্ৰতিবেদন কৰা হ'লে জানক" : "Know when a related issue has already been reported"} />
          <ToggleRow label={isAssamese ? "কেম্পাছ ডাইজেষ্ট" : "Campus digest"} description={isAssamese ? "কেম্পাছৰ উন্নতিৰ সাপ্তাহিক সাৰাংশ" : "A weekly summary of improvements around campus"} />
        </div>

        {/* Account Session & Logout Card - highly visible and easy to tap on mobile screens */}
        <div className="panel settings-panel settings-account-panel">
          <div className="settings-account-header">
            <div>
              <h2>{isAssamese ? "একাউণ্ট আৰু প্ৰস্থান" : "Account & Session"}</h2>
              <p className="panel-subtitle">
                {currentUser?.email
                  ? `${isAssamese ? "ছাইন ইন কৰা আছে: " : "Signed in as "} ${currentUser.email}`
                  : (isAssamese ? "বৰ্তমান সেশনৰ পৰা ওলাই যাওক" : "Sign out of your active session on this device")}
              </p>
            </div>
          </div>
          <div className="settings-logout-box">
            <div className="settings-logout-info">
              <LogOut size={18} className="settings-logout-icon" />
              <span>{isAssamese ? "আপোনাৰ একাউণ্টৰ পৰা সুৰক্ষিতভাৱে ওলাই যাওক" : "Safely end your session and log out of CivicSense"}</span>
            </div>
            <button type="button" className="settings-logout-btn" onClick={onSignOut}>
              <LogOut size={16} />
              <span>{logOutLabel || (isAssamese ? "লগআউট কৰক" : "Log out")}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
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
