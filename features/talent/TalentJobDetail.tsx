"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export type TalentJobDetailProps = {
  id: string;
  title: string;
  description: string;
  category: string;
  budget: number;
  deadline: string;
};

function usd(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(s: string) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

const CATEGORY_STRIPES: Record<string, string> = {
  "Lifestyle & Fashion": "from-rose-400 to-pink-500",
  "Technology":          "from-sky-400 to-blue-500",
  "Food & Cooking":      "from-amber-400 to-orange-500",
  "Health & Fitness":    "from-emerald-400 to-teal-500",
  "Travel":              "from-indigo-400 to-violet-500",
  "Beauty":              "from-fuchsia-400 to-pink-500",
};

function stripe(cat: string) {
  return CATEGORY_STRIPES[cat] ?? "from-zinc-300 to-zinc-400";
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () =>
      setIsMobile(
        navigator.maxTouchPoints > 0 ||
        /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
      );
    check();
  }, []);
  return isMobile;
}

// ── Photo capture step ────────────────────────────────────────────────────────

type PhotoSet = {
  front: File | null;
  left:  File | null;
  right: File | null;
};

function PhotoStep({
  photos,
  onChange,
  onNext,
}: {
  photos: PhotoSet;
  onChange: (key: keyof PhotoSet, file: File) => void;
  onNext: () => void;
}) {
  const slots: { key: keyof PhotoSet; label: string; hint: string }[] = [
    { key: "front", label: "Front",        hint: "Face the camera directly" },
    { key: "left",  label: "Left Profile", hint: "Turn your head to the left" },
    { key: "right", label: "Right Profile", hint: "Turn your head to the right" },
  ];

  const allCaptured = slots.every(({ key }) => photos[key] !== null);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">Step 1 of 2</p>
        <h2 className="text-[1.2rem] font-semibold tracking-tight text-zinc-900">Upload 3 Photos</h2>
        <p className="text-[13px] text-zinc-400 mt-1">Front view, left profile, and right profile.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {slots.map(({ key, label, hint }) => (
          <PhotoSlot
            key={key}
            label={label}
            hint={hint}
            file={photos[key]}
            onChange={(f) => onChange(key, f)}
          />
        ))}
      </div>

      <button
        onClick={onNext}
        disabled={!allCaptured}
        className="w-full bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white text-[14px] font-semibold py-3.5 rounded-xl transition-colors cursor-pointer active:scale-[0.99]"
      >
        Next: Record Video
      </button>
    </div>
  );
}

function PhotoSlot({
  label, hint, file, onChange,
}: {
  label: string; hint: string; file: File | null;
  onChange: (f: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const preview = file ? URL.createObjectURL(file) : null;

  return (
    <div>
      <div
        onClick={() => ref.current?.click()}
        className="aspect-[3/4] rounded-xl border-2 border-dashed border-zinc-200 hover:border-zinc-400 cursor-pointer transition-colors overflow-hidden bg-zinc-50 flex flex-col items-center justify-center"
      >
        {preview ? (
          <img src={preview} alt={label} className="w-full h-full object-cover" />
        ) : (
          <>
            <svg className="w-6 h-6 text-zinc-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </>
        )}
      </div>
      <p className="text-[11px] font-semibold text-zinc-600 mt-1 text-center">{label}</p>
      <p className="text-[10px] text-zinc-400 text-center leading-tight">{hint}</p>
      <input
        ref={ref} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) onChange(e.target.files[0]); }}
      />
    </div>
  );
}

// ── Video capture step ────────────────────────────────────────────────────────

function VideoStep({
  video,
  onVideoChange,
  onBack,
  onSubmit,
  submitting,
}: {
  video: File | null;
  onVideoChange: (f: File) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const videoUrl = video ? URL.createObjectURL(video) : null;

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">Step 2 of 2</p>
        <h2 className="text-[1.2rem] font-semibold tracking-tight text-zinc-900">Record Intro Video</h2>
        <p className="text-[13px] text-zinc-400 mt-1">30–60 second intro. Introduce yourself and why you're a great fit.</p>
      </div>

      <div
        onClick={() => ref.current?.click()}
        className="w-full aspect-video rounded-2xl border-2 border-dashed border-zinc-200 hover:border-zinc-400 cursor-pointer transition-colors bg-zinc-50 overflow-hidden flex items-center justify-center"
      >
        {videoUrl ? (
          <video src={videoUrl} controls className="w-full h-full object-cover rounded-2xl" />
        ) : (
          <div className="text-center">
            <svg className="w-10 h-10 text-zinc-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
            </svg>
            <p className="text-[13px] text-zinc-400">Tap to record video</p>
          </div>
        )}
      </div>
      <input
        ref={ref} type="file" accept="video/*" capture="user" className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) onVideoChange(e.target.files[0]); }}
      />

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 bg-white border border-zinc-200 hover:border-zinc-300 text-zinc-700 text-[14px] font-semibold py-3.5 rounded-xl transition-colors cursor-pointer"
        >
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={!video || submitting}
          className="flex-1 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-300 disabled:cursor-not-allowed text-white text-[14px] font-semibold py-3.5 rounded-xl transition-colors cursor-pointer active:scale-[0.99]"
        >
          {submitting ? (
            <span className="inline-flex items-center justify-center gap-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Uploading…
            </span>
          ) : "Submit Application"}
        </button>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function TalentJobDetail({ job }: { job: TalentJobDetailProps | null }) {
  const router    = useRouter();
  const isMobile  = useIsMobile();
  const [step, setStep]       = useState<"info" | "photos" | "video" | "done">("info");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]     = useState("");

  const [photos, setPhotos] = useState<PhotoSet>({ front: null, left: null, right: null });
  const [video, setVideo]   = useState<File | null>(null);

  if (!job) {
    return (
      <div className="max-w-sm mx-auto pt-20 text-center">
        <p className="text-[15px] font-medium text-zinc-700">Job not found</p>
        <Link href="/talent/jobs" className="text-[13px] text-zinc-400 hover:text-zinc-700 transition-colors mt-3 inline-block">
          ← Back to Jobs
        </Link>
      </div>
    );
  }

  async function uploadFile(file: File, path: string): Promise<string> {
    const { error: upErr } = await supabase.storage
      .from("talent-media")
      .upload(path, file, { upsert: true });
    if (upErr) throw new Error(upErr.message);
    const { data } = supabase.storage.from("talent-media").getPublicUrl(path);
    return data.publicUrl;
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    try {
      const uid = user.id;
      const ts  = Date.now();

      const [photoFrontUrl, photoLeftUrl, photoRightUrl, videoUrl] = await Promise.all([
        uploadFile(photos.front!, `submissions/${uid}/${ts}_front.jpg`),
        uploadFile(photos.left!,  `submissions/${uid}/${ts}_left.jpg`),
        uploadFile(photos.right!, `submissions/${uid}/${ts}_right.jpg`),
        uploadFile(video!,        `submissions/${uid}/${ts}_intro.mp4`),
      ]);

      // Fetch talent name from profile
      const { data: profile } = await supabase
        .from("talent_profiles")
        .select("full_name")
        .eq("id", uid)
        .single();

      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id:          job.id,
          talent_name:     profile?.full_name ?? user.email ?? "Talent",
          email:           user.email ?? "",
          bio:             "",
          mode:            "self",
          talent_user_id:  uid,
          photo_front_url: photoFrontUrl,
          photo_left_url:  photoLeftUrl,
          photo_right_url: photoRightUrl,
          video_url:       videoUrl,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Submission failed");
      }

      setStep("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (step === "done") {
    return (
      <div className="max-w-sm mx-auto pt-20 text-center">
        <div className="w-14 h-14 rounded-full bg-emerald-500 flex items-center justify-center mx-auto mb-5">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-[1.25rem] font-semibold tracking-tight text-zinc-900 mb-2">Application sent!</h2>
        <p className="text-[14px] text-zinc-400 mb-7">
          Your application for <span className="font-medium text-zinc-700">"{job.title}"</span> is under review.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/talent/jobs"
            className="inline-flex items-center justify-center gap-2 bg-zinc-900 text-white text-[13px] font-medium px-5 py-2.5 rounded-xl hover:bg-zinc-800 transition-colors"
          >
            Browse more jobs
          </Link>
          <Link
            href="/talent/dashboard"
            className="inline-flex items-center justify-center gap-2 bg-white border border-zinc-200 text-zinc-700 text-[13px] font-medium px-5 py-2.5 rounded-xl hover:border-zinc-300 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Back */}
      <Link
        href="/talent/jobs"
        className="inline-flex items-center gap-1.5 text-[13px] text-zinc-400 hover:text-zinc-700 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        All Jobs
      </Link>

      {/* Job card */}
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-[0_1px_4px_rgba(0,0,0,0.04),0_4px_16px_rgba(0,0,0,0.03)] overflow-hidden">
        <div className={`h-[3px] bg-gradient-to-r ${stripe(job.category)}`} />
        <div className="p-7 space-y-5">
          <div>
            <div className="flex items-start justify-between gap-4 mb-3">
              <h1 className="text-[1.35rem] font-semibold tracking-tight text-zinc-900 leading-snug">
                {job.title}
              </h1>
              <span className="text-[12px] font-medium bg-zinc-100 text-zinc-500 px-2.5 py-1 rounded-full flex-shrink-0">
                {job.category}
              </span>
            </div>
            <p className="text-[14px] text-zinc-500 leading-relaxed">{job.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-zinc-50">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">Budget</p>
              <p className="text-[16px] font-semibold text-zinc-900">{usd(job.budget)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">Deadline</p>
              <p className="text-[16px] font-semibold text-zinc-900">{formatDate(job.deadline)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Apply section */}
      {step === "info" && (
        <>
          {!isMobile ? (
            /* Desktop: must use mobile */
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
              <svg className="w-8 h-8 text-amber-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
                  d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <p className="text-[14px] font-semibold text-amber-800 mb-1">Mobile required to apply</p>
              <p className="text-[13px] text-amber-600">
                Applications require photos and a video intro. Please open this page on your phone to apply.
              </p>
            </div>
          ) : (
            /* Mobile: show apply button */
            <>
              {error && (
                <p className="text-[13px] text-rose-500 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
                  {error}
                </p>
              )}
              <button
                onClick={() => setStep("photos")}
                className="w-full bg-zinc-900 hover:bg-zinc-800 text-white text-[15px] font-semibold py-4 rounded-xl transition-all duration-150 active:scale-[0.99] cursor-pointer"
              >
                Apply to Job
              </button>
              <p className="text-center text-[12px] text-zinc-400">
                You'll need 3 photos and a short video intro.
              </p>
            </>
          )}
        </>
      )}

      {step === "photos" && (
        <PhotoStep
          photos={photos}
          onChange={(key, file) => setPhotos((p) => ({ ...p, [key]: file }))}
          onNext={() => setStep("video")}
        />
      )}

      {step === "video" && (
        <>
          {error && (
            <p className="text-[13px] text-rose-500 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
              {error}
            </p>
          )}
          <VideoStep
            video={video}
            onVideoChange={setVideo}
            onBack={() => setStep("photos")}
            onSubmit={handleSubmit}
            submitting={submitting}
          />
        </>
      )}
    </div>
  );
}
