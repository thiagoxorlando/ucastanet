export type SocialLinks = {
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  twitter?: string;
  website?: string;
};

export type TalentProfile = {
  id: string;
  name: string;
  username: string;
  bio: string;
  imageUrl: string;
  category: string;
  location: string;
  followers: string;
  socialLinks: SocialLinks;
  tags: string[];
  status: "active" | "pending" | "inactive";
  joinedAt: string;
};

export const mockTalent: TalentProfile[] = [
  {
    id: "1",
    name: "Sofia Mendes",
    username: "sofiam",
    bio: "Lifestyle & fashion creator based in São Paulo. Partnering with brands that value authenticity and creativity.",
    imageUrl: "",
    category: "Lifestyle & Fashion",
    location: "São Paulo, BR",
    followers: "248K",
    socialLinks: {
      instagram: "sofiam",
      tiktok: "sofiam",
      website: "sofiam.co",
    },
    tags: ["Fashion", "Lifestyle", "Beauty"],
    status: "active",
    joinedAt: "2026-01-12",
  },
  {
    id: "2",
    name: "Lucas Ferreira",
    username: "lucasf",
    bio: "Tech reviewer and gadget enthusiast. Making complex tech simple for everyday people.",
    imageUrl: "",
    category: "Technology",
    location: "Rio de Janeiro, BR",
    followers: "512K",
    socialLinks: {
      youtube: "lucasferreira",
      twitter: "lucasf_tech",
    },
    tags: ["Tech", "Reviews", "Gaming"],
    status: "active",
    joinedAt: "2026-02-03",
  },
  {
    id: "3",
    name: "Ana Costa",
    username: "anacosta",
    bio: "Food photographer and recipe developer. Bringing Brazilian flavors to global audiences.",
    imageUrl: "",
    category: "Food & Cooking",
    location: "Belo Horizonte, BR",
    followers: "89K",
    socialLinks: {
      instagram: "anacosta.food",
      tiktok: "anacostacooks",
    },
    tags: ["Food", "Photography", "Recipes"],
    status: "pending",
    joinedAt: "2026-03-15",
  },
  {
    id: "4",
    name: "Rafael Lima",
    username: "raflima",
    bio: "Fitness coach and wellness advocate. Helping people build sustainable healthy habits.",
    imageUrl: "",
    category: "Health & Fitness",
    location: "Curitiba, BR",
    followers: "175K",
    socialLinks: {
      instagram: "raflima_fit",
      youtube: "raflimafit",
      website: "raflima.fit",
    },
    tags: ["Fitness", "Wellness", "Nutrition"],
    status: "active",
    joinedAt: "2025-11-20",
  },
];

export type Job = {
  id: string;
  title: string;
  category: string;
  budget: number;
  deadline: string;
  description: string;
  status: "open" | "closed" | "draft";
  applicants: number;
  postedAt: string;
};

export const mockJobs: Job[] = [
  {
    id: "1",
    title: "Fashion Creator for Spring Campaign",
    category: "Lifestyle & Fashion",
    budget: 8500,
    deadline: "2026-04-30",
    description:
      "We're looking for an authentic lifestyle and fashion creator to lead our Spring 2026 campaign. You'll produce 3 Instagram Reels, 5 feed posts, and 2 TikToks showcasing our new collection. The ideal creator has a strong aesthetic sense, experience with flat-lay photography, and an engaged audience in the 18–34 demographic.",
    status: "open",
    applicants: 7,
    postedAt: "2026-03-10",
  },
  {
    id: "2",
    title: "Tech Reviewer — Flagship Smartphone Launch",
    category: "Technology",
    budget: 12000,
    deadline: "2026-04-15",
    description:
      "We need an experienced tech creator to review our new flagship smartphone on YouTube and Instagram. Deliverables include a 10–15 min YouTube review, a 90-second Reel, and 3 Stories with swipe-up links. You'll receive a device pre-launch under NDA with a full briefing from our product team.",
    status: "open",
    applicants: 12,
    postedAt: "2026-03-08",
  },
  {
    id: "3",
    title: "Meal Prep Series — Health Food Brand",
    category: "Food & Cooking",
    budget: 4200,
    deadline: "2026-04-20",
    description:
      "Partner with us on a 4-part meal prep series for our new line of organic sauces. Each episode highlights a different cuisine. Looking for a food creator who can film, style, and edit short-form content independently. Brazilian or Latin American culinary focus is a plus.",
    status: "open",
    applicants: 3,
    postedAt: "2026-03-18",
  },
  {
    id: "4",
    title: "30-Day Fitness Challenge Ambassador",
    category: "Health & Fitness",
    budget: 6000,
    deadline: "2026-05-01",
    description:
      "Join our 30-day fitness challenge as the face of the campaign. You'll post daily Stories documenting your progress using our app, plus 4 sponsored feed posts throughout the month. Ideal candidate is a certified trainer or serious fitness enthusiast with an authentic, motivating presence.",
    status: "open",
    applicants: 9,
    postedAt: "2026-03-20",
  },
  {
    id: "5",
    title: "Travel Vlog Series — Boutique Hotel Brand",
    category: "Travel",
    budget: 15000,
    deadline: "2026-05-15",
    description:
      "We're inviting a travel creator to stay at 3 of our boutique properties across South America and document the experience. Deliverables: 3 YouTube vlogs (8+ min), 6 Instagram posts, and 15 Stories. All travel and accommodation covered. Looking for someone with strong storytelling and cinematic editing skills.",
    status: "open",
    applicants: 21,
    postedAt: "2026-03-05",
  },
  {
    id: "6",
    title: "Beauty Tutorial — Skincare Launch",
    category: "Beauty",
    budget: 3500,
    deadline: "2026-04-10",
    description:
      "Seeking a beauty creator to produce a 3-step skincare routine tutorial for our new serum line. Content should be approachable, educational, and shot in natural light. Deliverables: 1 TikTok (60–90 sec), 1 Instagram Reel, and an honest review in Stories. Products will be shipped in advance.",
    status: "draft",
    applicants: 0,
    postedAt: "2026-03-28",
  },
];

export type Submission = {
  id: string;
  jobId: string;
  talentName: string;
  talentHandle: string;
  referrerName: string;
  bio: string;
  category: string;
  followers: string;
  submittedAt: string;
};

export const mockSubmissions: Submission[] = [
  // Job 1 — Fashion Campaign (7 applicants)
  { id: "s1",  jobId: "1", talentName: "Sofia Mendes",      talentHandle: "sofiam",           referrerName: "Carlos Rodrigues",  bio: "Lifestyle & fashion creator based in São Paulo. Known for authentic storytelling and aesthetic-forward content.",                          category: "Lifestyle & Fashion", followers: "248K", submittedAt: "2026-03-12" },
  { id: "s2",  jobId: "1", talentName: "Marina Bastos",     talentHandle: "marinabastos",     referrerName: "Renata Oliveira",   bio: "Sustainable style advocate and minimalist content creator. Strong aesthetic sense and highly engaged audience.",                          category: "Lifestyle & Fashion", followers: "112K", submittedAt: "2026-03-13" },
  { id: "s3",  jobId: "1", talentName: "Julia Winters",     talentHandle: "juliawinters",     referrerName: "Mark Thompson",    bio: "Fashion and travel creator. Specializes in high-production editorial shoots and long-term brand partnerships.",                           category: "Lifestyle & Fashion", followers: "320K", submittedAt: "2026-03-14" },
  { id: "s4",  jobId: "1", talentName: "Camila Rocha",      talentHandle: "camilar",          referrerName: "Diego Matos",      bio: "Street style photographer turned content creator. Bold looks, high engagement, and a community that shows up.",                           category: "Lifestyle & Fashion", followers: "87K",  submittedAt: "2026-03-15" },

  // Job 2 — Tech Reviewer (12 applicants)
  { id: "s5",  jobId: "2", talentName: "Lucas Ferreira",    talentHandle: "lucasf",           referrerName: "André Santos",     bio: "Tech reviewer with 5+ years covering smartphones, laptops, and consumer electronics. YouTube-first creator with deep audience trust.",  category: "Technology",          followers: "512K", submittedAt: "2026-03-09" },
  { id: "s6",  jobId: "2", talentName: "Pedro Nascimento",  talentHandle: "pedrotech",        referrerName: "Thaís Lima",       bio: "Mobile tech specialist known for in-depth benchmarks and real-world testing. Strong YouTube and newsletter following.",                  category: "Technology",          followers: "224K", submittedAt: "2026-03-10" },
  { id: "s7",  jobId: "2", talentName: "Alex Rivera",       talentHandle: "alexreviews",      referrerName: "Sarah Mitchell",   bio: "Consumer tech creator focused on accessibility and everyday usability. Known for candid, unsponsored-style review format.",               category: "Technology",          followers: "445K", submittedAt: "2026-03-11" },
  { id: "s8",  jobId: "2", talentName: "Fernanda Cruz",     talentHandle: "fernandatech",     referrerName: "Bruno Costa",      bio: "Tech and lifestyle creator bridging gadgets and everyday living. Strong cross-platform presence with high story engagement.",             category: "Technology",          followers: "178K", submittedAt: "2026-03-12" },

  // Job 3 — Food Brand (3 applicants)
  { id: "s9",  jobId: "3", talentName: "Ana Costa",         talentHandle: "anacosta",         referrerName: "Priya Sharma",     bio: "Food photographer and recipe developer. Brings Brazilian flavors to global audiences through visually rich short-form content.",          category: "Food & Cooking",      followers: "89K",  submittedAt: "2026-03-19" },
  { id: "s10", jobId: "3", talentName: "Rodrigo Pimentel",  talentHandle: "rodcooks",         referrerName: "Claudia Ferreira", bio: "Home chef turned content creator. Specializes in traditional Latin American cuisine with a contemporary twist.",                        category: "Food & Cooking",      followers: "53K",  submittedAt: "2026-03-20" },
  { id: "s11", jobId: "3", talentName: "Isabella Greco",    talentHandle: "isabellagrecocooks",referrerName: "Marco Leal",      bio: "Food stylist and recipe developer. Known for beautiful plating and approachable recipes that drive high save rates.",                    category: "Food & Cooking",      followers: "71K",  submittedAt: "2026-03-21" },

  // Job 4 — Fitness Challenge (9 applicants)
  { id: "s12", jobId: "4", talentName: "Rafael Lima",       talentHandle: "raflima",          referrerName: "Tatiana Borges",   bio: "Certified fitness coach and wellness advocate. Helps people build sustainable healthy habits through daily authentic content.",           category: "Health & Fitness",    followers: "175K", submittedAt: "2026-03-21" },
  { id: "s13", jobId: "4", talentName: "Carla Andrade",     talentHandle: "carlafit",         referrerName: "Eduardo Nunes",    bio: "Personal trainer and nutritionist. Creates daily workout and meal prep content with a focus on long-term transformation.",                category: "Health & Fitness",    followers: "203K", submittedAt: "2026-03-22" },
  { id: "s14", jobId: "4", talentName: "Tomás Vidal",       talentHandle: "tomasvidal",       referrerName: "Luisa Teixeira",   bio: "Functional fitness coach known for minimalist routines and motivational daily vlogs. Strong men's fitness niche.",                       category: "Health & Fitness",    followers: "98K",  submittedAt: "2026-03-22" },
  { id: "s15", jobId: "4", talentName: "Natasha Gomes",     talentHandle: "natashafit",       referrerName: "Paulo Mendes",     bio: "HIIT specialist and yoga instructor with a community that tracks progress together. High daily active engagement.",                      category: "Health & Fitness",    followers: "145K", submittedAt: "2026-03-23" },

  // Job 5 — Travel Series (21 applicants)
  { id: "s16", jobId: "5", talentName: "Gabriel Torres",    talentHandle: "gabtravels",       referrerName: "Manuela Castro",   bio: "Cinematic travel vlogger covering South America. Known for breathtaking visuals and compelling destination narratives.",                  category: "Travel",              followers: "387K", submittedAt: "2026-03-06" },
  { id: "s17", jobId: "5", talentName: "Emma Walsh",        talentHandle: "emmaexplores",     referrerName: "Jack Harrington",  bio: "Travel and lifestyle creator specializing in boutique hotel reviews and immersive cultural storytelling. Strong luxury travel niche.",   category: "Travel",              followers: "521K", submittedAt: "2026-03-07" },
  { id: "s18", jobId: "5", talentName: "Diego Almeida",     talentHandle: "diegoalmeida",     referrerName: "Fernanda Luz",     bio: "Adventure travel creator focused on off-the-beaten-path destinations across Latin America. Cinematic drone-heavy style.",                 category: "Travel",              followers: "234K", submittedAt: "2026-03-07" },
  { id: "s19", jobId: "5", talentName: "Clara Jensen",      talentHandle: "clarajensen",      referrerName: "Oscar Lindqvist",  bio: "Luxury travel and wellness creator. Specializes in resort and boutique experiences with editorial-quality video and photography.",        category: "Travel",              followers: "612K", submittedAt: "2026-03-08" },
];

export const mockAgencyStats = {
  totalTalent: 4,
  activeTalent: 3,
  pendingTalent: 1,
  totalReach: "1.0M+",
};

export type Booking = {
  id: string;
  agency: string;
  talentName: string;
  talentHandle: string;
  jobTitle: string;
  category: string;
  totalValue: number;
  platformCommission: number;
  referralPayout: number;
  status: "completed" | "pending" | "disputed";
  bookedAt: string;
};

export const mockBookings: Booking[] = [
  { id: "BK-001", agency: "Spark Agency",    talentName: "Sofia Mendes",   talentHandle: "sofiam",       jobTitle: "Fashion Creator for Spring Campaign",      category: "Lifestyle & Fashion", totalValue: 8500,  platformCommission: 1275, referralPayout: 680,  status: "completed", bookedAt: "2026-03-18" },
  { id: "BK-002", agency: "Nova Media",      talentName: "Lucas Ferreira", talentHandle: "lucasf",       jobTitle: "Tech Reviewer — Flagship Smartphone Launch",category: "Technology",          totalValue: 12000, platformCommission: 1800, referralPayout: 960,  status: "completed", bookedAt: "2026-03-16" },
  { id: "BK-003", agency: "Growth House",    talentName: "Ana Costa",      talentHandle: "anacosta",     jobTitle: "Meal Prep Series — Health Food Brand",      category: "Food & Cooking",      totalValue: 4200,  platformCommission: 630,  referralPayout: 336,  status: "pending",   bookedAt: "2026-03-22" },
  { id: "BK-004", agency: "Bold Collective", talentName: "Rafael Lima",    talentHandle: "raflima",      jobTitle: "30-Day Fitness Challenge Ambassador",        category: "Health & Fitness",    totalValue: 6000,  platformCommission: 900,  referralPayout: 480,  status: "completed", bookedAt: "2026-03-24" },
  { id: "BK-005", agency: "Spark Agency",    talentName: "Gabriel Torres", talentHandle: "gabtravels",   jobTitle: "Travel Vlog Series — Boutique Hotel Brand", category: "Travel",              totalValue: 15000, platformCommission: 2250, referralPayout: 1200, status: "completed", bookedAt: "2026-03-12" },
  { id: "BK-006", agency: "Nova Media",      talentName: "Julia Winters",  talentHandle: "juliawinters", jobTitle: "Fashion Creator for Spring Campaign",      category: "Lifestyle & Fashion", totalValue: 8500,  platformCommission: 1275, referralPayout: 680,  status: "disputed",  bookedAt: "2026-03-20" },
  { id: "BK-007", agency: "Creators Co.",    talentName: "Alex Rivera",    talentHandle: "alexreviews",  jobTitle: "Tech Reviewer — Flagship Smartphone Launch",category: "Technology",          totalValue: 12000, platformCommission: 1800, referralPayout: 960,  status: "pending",   bookedAt: "2026-03-26" },
  { id: "BK-008", agency: "Bold Collective", talentName: "Emma Walsh",     talentHandle: "emmaexplores", jobTitle: "Travel Vlog Series — Boutique Hotel Brand", category: "Travel",              totalValue: 15000, platformCommission: 2250, referralPayout: 1200, status: "completed", bookedAt: "2026-03-14" },
];

export const mockAdminStats = {
  totalJobs: 6,
  totalUsers: 24,
  totalBookings: 8,
  totalRevenue: 12180, // sum of all platformCommission values
};
