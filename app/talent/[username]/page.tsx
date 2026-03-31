import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ username: string }>;
};

// Moved to /talent/profile/[username]
export default async function LegacyTalentProfilePage({ params }: Props) {
  const { username } = await params;
  redirect(`/talent/profile/${username}`);
}
