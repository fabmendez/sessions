import { requireProfile } from "@/lib/auth";
import { Inbox } from "@/components/Inbox";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const { profile } = await requireProfile();
  return (
    <div className="grid gap-6 md:grid-cols-[320px_1fr]">
      <div>
        <h1 className="display mb-4 text-[44px]">Messages</h1>
        <Inbox profileId={profile.id} />
      </div>
      <div className="hidden place-items-center rounded-2xl border border-dashed border-line md:grid md:min-h-[60vh]">
        <p className="max-w-xs text-center text-sm text-muted">Pick a conversation. Invites, open calls and projects you share show up as cards people can act on.</p>
      </div>
    </div>
  );
}
