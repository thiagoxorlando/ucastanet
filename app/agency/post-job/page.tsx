import type { Metadata } from "next";
import PostJobForm from "@/features/agency/PostJobForm";

export const metadata: Metadata = { title: "Post a Job — ucastanet" };

export default function PostJobPage() {
  return <PostJobForm />;
}
