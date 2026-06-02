import { headers } from "next/headers";
import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/nextjs/server";
import { prisma, withRetry, handleDatabaseError } from "@/lib/db/prisma";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error("[Clerk Webhook] Missing CLERK_WEBHOOK_SECRET env variable");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  // Get the headers for verification
  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);

  // Verify the webhook signature
  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("[Clerk Webhook] Signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  // Handle the event
  const eventType = evt.type;

  if (eventType === "user.created") {
    const { id, email_addresses } = evt.data;
    const primaryEmail = email_addresses?.[0]?.email_address;

    if (!primaryEmail) {
      console.error("[Clerk Webhook] No email address found for user:", id);
      return new Response("No email address found", { status: 400 });
    }

    try {
      await withRetry(async () => {
        await prisma.user.create({
          data: {
            clerkId: id,
            email: primaryEmail,
          },
        });
      });

      return new Response("User created", { status: 201 });
    } catch (error) {
      const { message } = handleDatabaseError(error);
      console.error("[Clerk Webhook] Failed to create user:", message);
      return new Response("Failed to create user", { status: 500 });
    }
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;

    if (!id) {
      return new Response("No user ID provided", { status: 400 });
    }

    try {
      await withRetry(async () => {
        // Cascade delete: favorites are deleted via onDelete: Cascade in schema
        await prisma.user.delete({
          where: { clerkId: id },
        });
      });

      return new Response("User deleted", { status: 200 });
    } catch (error) {
      const { message } = handleDatabaseError(error);
      console.error("[Clerk Webhook] Failed to delete user:", message);
      return new Response("Failed to delete user", { status: 500 });
    }
  }

  // Unhandled event type
  return new Response("Event type not handled", { status: 200 });
}
