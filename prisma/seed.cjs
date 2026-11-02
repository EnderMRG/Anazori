const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  await prisma.campus.upsert({ where: { name: "Dibrugarh University" }, update: {}, create: { name: "Dibrugarh University", city: "Dibrugarh, Assam", description: "A connected space for students, faculty, and staff to report and resolve campus issues.", accent: "#2b8f85" } });
  const adminPassword = process.env.CIVICSENSE_ADMIN_PASSWORD || "DibrugarhAdmin@2026";
  const admin = await prisma.user.upsert({
    where: { email: "admin@dibrugarhuniversity.ac.in" },
    update: { name: "Dibrugarh University Admin", role: "admin", campusName: "Dibrugarh University", passwordHash: await bcrypt.hash(adminPassword, 12) },
    create: { name: "Dibrugarh University Admin", email: "admin@dibrugarhuniversity.ac.in", role: "admin", campusName: "Dibrugarh University", passwordHash: await bcrypt.hash(adminPassword, 12) },
  });
  const student = await prisma.user.upsert({
    where: { email: "arjun@dibru.ac.in" },
    update: { campusName: "Dibrugarh University" },
    create: { name: "Arjun", email: "arjun@dibru.ac.in", role: "student", campusName: "Dibrugarh University", passwordHash: await bcrypt.hash("password123", 12) },
  });

  const reports = [
    { publicId: "CS-2048", title: "Water supply interrupted in hostel block C", description: "There has been no water in the washrooms of hostel block C since this morning.", language: "en", category: "Water supply", priority: "High", department: "Maintenance", status: "In progress", location: "Hostel block C", summaryEn: "Hostel block C has had no water supply since morning, affecting residents.", summaryAs: "পুৱাৰে পৰা ছাত্ৰাবাসৰ C ব্লকত পানীৰ যোগান বন্ধ হৈ আছে, যাৰ ফলত আৱাসীসকল অসুবিধাত পৰিছে।", userId: student.id },
    { publicId: "CS-2047", title: "লাইব্ৰেৰীৰ দ্বিতীয় মহলাত ৱাই-ফাই নাই", description: "যোৱা দুদিন ধৰি লাইব্ৰেৰীৰ দ্বিতীয় মহলাত ৱাই-ফাই সংযোগ পোৱা হোৱা নাই।", language: "as", category: "Internet / Wi-Fi", priority: "Medium", department: "IT Services", status: "Submitted", location: "Central Library", summaryEn: "Wi-Fi has been unavailable on the second floor of the library for two days.", summaryAs: "যোৱা দুদিন ধৰি লাইব্ৰেৰীৰ দ্বিতীয় মহলাত ৱাই-ফাই সংযোগ পোৱা হোৱা নাই।", userId: student.id },
    { publicId: "CS-2046", title: "Broken streetlight near the north gate", description: "The streetlight beside the north gate has been broken for a week.", language: "en", category: "Safety & security", priority: "Critical", department: "Estate & Security", status: "Submitted", location: "North gate", summaryEn: "A broken streetlight near the north gate creates a safety risk after sunset.", summaryAs: "উত্তৰ প্ৰৱেশদ্বাৰৰ ওচৰৰ বেয়া ষ্ট্ৰীট লাইটটোৱে সূৰ্যাস্তৰ পিছত সুৰক্ষাৰ আশংকা সৃষ্টি কৰিছে।", userId: student.id },
    { publicId: "CS-2045", title: "Overflowing waste bins near Arts building", description: "The waste bins near the Arts building have been cleared and the area is clean now.", language: "en", category: "Cleanliness", priority: "Low", department: "Sanitation", status: "Resolved", location: "Arts building", summaryEn: "Waste bins near the Arts building were overflowing; the issue has been cleared.", summaryAs: "কলাৰ ভৱনৰ ওচৰৰ আৱৰ্জনাৰ বাকচবোৰ উপচি পৰিছিল; সমস্যাটো সমাধান কৰা হৈছে।", userId: student.id },
  ];
  for (const report of reports) {
    await prisma.complaint.upsert({ where: { publicId: report.publicId }, update: { ...report, campusName: "Dibrugarh University" }, create: { ...report, campusName: "Dibrugarh University" } });
  }
  console.log(`Seeded admin ${admin.email} and ${reports.length} Dibrugarh University reports.`);
}

main().catch((error) => { console.error(error); process.exit(1); }).finally(() => prisma.$disconnect());
