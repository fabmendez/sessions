"use client";
import { useRef } from "react";
import { sendMessage } from "@/app/actions/social";

export function Composer({ conversationId, attachments }: { conversationId: string; attachments: { group: string; items: { value: string; label: string }[] }[] }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form ref={ref} action={async (f) => { await sendMessage(f); ref.current?.reset(); }} className="rounded-2xl border border-line bg-surface p-3 focus-within:border-faint">
      <input type="hidden" name="conversationId" value={conversationId} />
      <label htmlFor="body" className="sr-only">Message</label>
      <textarea id="body" name="body" rows={2} maxLength={4000} placeholder="Write a message"
        className="w-full resize-none bg-transparent px-1 focus:outline-none"
        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ref.current?.requestSubmit(); } }} />
      <div className="mt-2 flex items-center gap-2">
        {attachments.some((a) => a.items.length) && (
          <select name="attach" defaultValue="" aria-label="Attach" className="h-8 max-w-[60%] truncate rounded-full border border-line bg-transparent px-3 text-[13px] text-muted">
            <option value="">Attach a project, open call or profile</option>
            {attachments.filter((a) => a.items.length).map((a) => (
              <optgroup key={a.group} label={a.group}>{a.items.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}</optgroup>
            ))}
          </select>
        )}
        <button className="btn-primary btn-sm ml-auto">Send</button>
      </div>
    </form>
  );
}
