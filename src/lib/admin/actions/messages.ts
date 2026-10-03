"use server";

import { z } from "zod";

import { adminAction, check } from "@/lib/admin/action";
import { createAdminClient } from "@/lib/supabase/admin";

export const setMessageRead = adminAction(
  { schema: z.object({ id: z.number().int().positive(), read: z.boolean() }) },
  async ({ id, read }) => {
    check(await createAdminClient().from("contact_messages").update({ is_read: read }).eq("id", id), "message");
    return { message: read ? "Marked as read." : "Marked as unread." };
  },
);

export const deleteMessage = adminAction({ role: "owner", schema: z.object({ id: z.number().int().positive() }) }, async ({ id }) => {
  check(await createAdminClient().from("contact_messages").delete().eq("id", id), "message");
  return { message: "Message deleted." };
});
