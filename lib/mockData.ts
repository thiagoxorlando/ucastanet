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

export const mockAgencyStats = {
  totalTalent: 4,
  activeTalent: 3,
  pendingTalent: 1,
  totalReach: "1.0M+",
};
