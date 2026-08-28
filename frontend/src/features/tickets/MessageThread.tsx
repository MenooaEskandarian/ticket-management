import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import type { TicketMessage } from "@/types";

function Attachments({ message }: { message: TicketMessage }) {
  const [open, setOpen] = useState<string | null>(null);

  if (!message.attachments.length) return null;

  return (
    <>
      <div className="mt-3 flex flex-wrap gap-2">
        {message.attachments.map((attachment) => (
          <button
            key={attachment.id}
            type="button"
            onClick={() => setOpen(attachment.file)}
            className="overflow-hidden rounded-lg border transition-opacity hover:opacity-80"
          >
            <img
              src={attachment.file}
              alt={attachment.original_name}
              className="size-24 object-cover"
            />
          </button>
        ))}
      </div>

      <Dialog open={open !== null} onOpenChange={() => setOpen(null)}>
        <DialogContent className="max-w-3xl">
          <DialogTitle className="sr-only">Attachment</DialogTitle>
          {open && <img src={open} alt="" className="max-h-[75vh] w-full object-contain" />}
        </DialogContent>
      </Dialog>
    </>
  );
}

export function MessageThread({ messages }: { messages: TicketMessage[] }) {
  return (
    <ol className="space-y-6">
      {messages.map((message) => {
        const fromStaff = message.author_role === "SUPPORT";
        return (
          <li key={message.id} className="flex gap-3">
            <Avatar className="mt-1 size-8">
              <AvatarFallback
                className={cn(
                  "text-xs",
                  fromStaff ? "bg-primary text-primary-foreground" : "bg-secondary",
                )}
              >
                {fromStaff ? "GG" : (message.author_name?.[0] ?? "?")}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="mb-1 flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-medium">
                  {fromStaff ? `${message.author_name} · GolGift support` : message.author_name}
                </span>
                <time className="text-xs text-muted-foreground" dateTime={message.created_at}>
                  {formatDateTime(message.created_at)}
                </time>
              </div>
              <div
                className={cn(
                  "rounded-xl border px-4 py-3 text-sm whitespace-pre-wrap",
                  fromStaff ? "bg-secondary/50" : "bg-card",
                )}
              >
                {message.body}
                <Attachments message={message} />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
