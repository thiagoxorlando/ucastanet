import type { Metadata } from "next";
import PostJobForm from "@/features/agency/PostJobForm";

export const metadata: Metadata = { title: "Publicar vaga — BrisaHub" };

export default function PostJobPage() {
  return <PostJobForm />;
}
