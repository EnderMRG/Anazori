import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { title = "", description = "", location = "" } = await request.json();
  const text = `${title} ${description}`.toLowerCase();

  let category = "Other campus issue";
  let department = "Campus Administration";
  let priority = "Medium";
  if (text.includes("water") || text.includes("পানী")) { category = "Water supply"; department = "Maintenance"; priority = "High"; }
  else if (text.includes("wifi") || text.includes("internet") || text.includes("ৱাই")) { category = "Internet / Wi-Fi"; department = "IT Services"; }
  else if (text.includes("light") || text.includes("security") || text.includes("আলো")) { category = "Safety & security"; department = "Estate & Security"; priority = "High"; }
  else if (text.includes("waste") || text.includes("clean") || text.includes("আৱৰ্জনা")) { category = "Cleanliness"; department = "Sanitation"; priority = "Low"; }

  return NextResponse.json({
    category,
    department,
    priority,
    location,
    summaryEn: `${title}. Reported at ${location}. Our ${department.toLowerCase()} team will review this issue.`,
    summaryAs: `এই সমস্যাটো ${location} স্থানত প্ৰতিবেদন কৰা হৈছে। ${department} দলে ইয়াক পৰ্যালোচনা কৰিব।`,
    model: "CivicSense triage model",
  });
}
