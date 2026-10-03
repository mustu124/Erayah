"use client";

import { useAdminAction } from "@/components/admin/use-action";
import { Button } from "@/components/ui/Button";
import { deleteMessage, setMessageRead } from "@/lib/admin/actions/messages";

export function MessageActions({ id, read, canDelete }: { id: number; read: boolean; canDelete: boolean }) {
  const mark = useAdminAction(setMessageRead);
  const del = useAdminAction(deleteMessage);
  return (
    <div className="flex flex-wrap gap-1">
      <Button variant="link" className="min-h-9 px-2" disabled={mark.pending} onClick={() => mark.run({ id, read: !read }, { quiet: true })}>
        {read ? "Mark unread" : "Mark read"}
      </Button>
      {canDelete ? (
        <Button variant="link" className="min-h-9 px-2 text-plum" disabled={del.pending} onClick={() => window.confirm("Delete this message?") && del.run({ id })}>
          Delete
        </Button>
      ) : null}
    </div>
  );
}
