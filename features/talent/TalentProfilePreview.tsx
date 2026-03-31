import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { TalentProfile } from "@/lib/mockData";

type SocialItem = {
  platform: string;
  handle: string;
  icon: React.ReactNode;
};

function SocialIcon({ platform }: { platform: string }) {
  const icons: Record<string, React.ReactNode> = {
    instagram: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
    tiktok: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.3 6.3 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.76a4.85 4.85 0 01-1.01-.07z" />
      </svg>
    ),
    youtube: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
    twitter: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    website: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    ),
  };
  return <>{icons[platform] ?? null}</>;
}

export default function TalentProfilePreview({ talent }: { talent: TalentProfile }) {
  const socials: SocialItem[] = [
    talent.socialLinks.instagram
      ? { platform: "instagram", handle: `@${talent.socialLinks.instagram}`, icon: null }
      : null,
    talent.socialLinks.tiktok
      ? { platform: "tiktok", handle: `@${talent.socialLinks.tiktok}`, icon: null }
      : null,
    talent.socialLinks.youtube
      ? { platform: "youtube", handle: talent.socialLinks.youtube, icon: null }
      : null,
    talent.socialLinks.twitter
      ? { platform: "twitter", handle: `@${talent.socialLinks.twitter}`, icon: null }
      : null,
    talent.socialLinks.website
      ? { platform: "website", handle: talent.socialLinks.website, icon: null }
      : null,
  ].filter(Boolean) as SocialItem[];

  return (
    <div className="min-h-screen bg-zinc-50">
      <div className="max-w-2xl mx-auto px-4 py-10 sm:px-6">
        <div className="mb-6">
          <Link
            href="/agency/talent"
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to talent
          </Link>
        </div>

        <Card padding="lg">
          <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-center">
            <Avatar name={talent.name} size="xl" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-semibold text-zinc-900">{talent.name}</h1>
                <Badge
                  variant={
                    talent.status === "active"
                      ? "success"
                      : talent.status === "pending"
                      ? "warning"
                      : "default"
                  }
                >
                  {talent.status}
                </Badge>
              </div>
              <p className="text-sm text-zinc-500 mt-0.5">
                @{talent.username} · {talent.location}
              </p>
              <p className="text-sm font-medium text-zinc-700 mt-2">{talent.category}</p>
            </div>
            <div className="sm:text-right">
              <p className="text-2xl font-bold text-zinc-900">{talent.followers}</p>
              <p className="text-xs text-zinc-500">combined followers</p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-zinc-100">
            <p className="text-sm text-zinc-700 leading-relaxed">{talent.bio}</p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {talent.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs px-3 py-1 bg-zinc-100 text-zinc-700 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </Card>

        {socials.length > 0 && (
          <Card className="mt-4">
            <h2 className="text-sm font-semibold text-zinc-900 mb-4">Social Profiles</h2>
            <div className="space-y-3">
              {socials.map((s) => (
                <div key={s.platform} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600 flex-shrink-0">
                    <SocialIcon platform={s.platform} />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-500 capitalize">{s.platform}</p>
                    <p className="text-sm font-medium text-zinc-900">{s.handle}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="mt-6 flex gap-3">
          <Button size="lg" fullWidth>
            Contact Talent
          </Button>
          <Button variant="secondary" size="lg" fullWidth>
            Save to List
          </Button>
        </div>
      </div>
    </div>
  );
}
