export type Campus = {
  id: string;
  name: string;
  city: string;
  description: string;
  accent: string;
};

export const campuses: Campus[] = [
  { id: "dibrugarh-university", name: "Dibrugarh University", city: "Dibrugarh, Assam", description: "A connected space for students, faculty, and staff to report and resolve campus issues.", accent: "#2b8f85" },
  { id: "assam-university", name: "Assam University", city: "Silchar, Assam", description: "Campus services, facilities, and community support in one place.", accent: "#6686d5" },
  { id: "gauhati-university", name: "Gauhati University", city: "Guwahati, Assam", description: "Make campus operations more transparent, responsive, and inclusive.", accent: "#8d6cc9" },
  { id: "tezpur-university", name: "Tezpur University", city: "Tezpur, Assam", description: "A simple way for the university community to be heard.", accent: "#d58b55" },
];

export function getCampus(name?: string | null) {
  return campuses.find((campus) => campus.name === name) || {
    id: (name || "campus-network").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    name: name || campuses[0].name,
    city: "Campus network",
    description: "A connected space for the campus community.",
    accent: "#2b8f85",
  };
}
