"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input, Textarea } from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

type FormData = {
  name: string;
  username: string;
  bio: string;
  category: string;
  location: string;
  instagram: string;
  tiktok: string;
  youtube: string;
  twitter: string;
  website: string;
};

const initialForm: FormData = {
  name: "",
  username: "",
  bio: "",
  category: "",
  location: "",
  instagram: "",
  tiktok: "",
  youtube: "",
  twitter: "",
  website: "",
};

const categories = [
  "Lifestyle & Fashion",
  "Technology",
  "Food & Cooking",
  "Health & Fitness",
  "Travel",
  "Beauty",
  "Gaming",
  "Music",
  "Comedy",
  "Education",
  "Other",
];

export default function CreateTalentForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(initialForm);
  const [submitted, setSubmitted] = useState(false);

  function set(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      router.push("/agency/talent");
    }, 1500);
  }

  if (submitted) {
    return (
      <Card className="max-w-xl mx-auto text-center py-16">
        <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-lg font-semibold text-zinc-900">Profile created!</p>
        <p className="text-sm text-zinc-500 mt-1">Redirecting to talent list…</p>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <Card>
        <h2 className="text-sm font-semibold text-zinc-900 mb-5">Basic Info</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              placeholder="Sofia Mendes"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
            <Input
              label="Username"
              placeholder="sofiam"
              value={form.username}
              onChange={(e) => set("username", e.target.value)}
              hint="Used for the public profile URL"
              required
            />
          </div>
          <Textarea
            label="Bio"
            placeholder="Tell us about this talent…"
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-zinc-700">Category</label>
              <select
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:border-transparent"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
              >
                <option value="">Select a category</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Location"
              placeholder="São Paulo, BR"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-zinc-900 mb-1">Profile Image</h2>
        <p className="text-xs text-zinc-500 mb-5">Upload a photo or use the default avatar</p>
        <div className="border-2 border-dashed border-zinc-200 rounded-xl p-8 text-center hover:border-zinc-400 transition-colors cursor-pointer">
          <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-zinc-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-sm text-zinc-600 font-medium">Click to upload</p>
          <p className="text-xs text-zinc-400 mt-1">PNG, JPG up to 5MB</p>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-zinc-900 mb-5">Social Links</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Instagram"
              placeholder="username"
              value={form.instagram}
              onChange={(e) => set("instagram", e.target.value)}
            />
            <Input
              label="TikTok"
              placeholder="username"
              value={form.tiktok}
              onChange={(e) => set("tiktok", e.target.value)}
            />
            <Input
              label="YouTube"
              placeholder="channel handle"
              value={form.youtube}
              onChange={(e) => set("youtube", e.target.value)}
            />
            <Input
              label="Twitter / X"
              placeholder="username"
              value={form.twitter}
              onChange={(e) => set("twitter", e.target.value)}
            />
          </div>
          <Input
            label="Website"
            placeholder="yoursite.com"
            value={form.website}
            onChange={(e) => set("website", e.target.value)}
          />
        </div>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" size="lg">
          Create Profile
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => router.push("/agency/talent")}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
