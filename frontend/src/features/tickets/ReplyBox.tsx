import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/api";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PhotoPicker } from "./PhotoPicker";
import { usePostMessage } from "./api";
import { MAX_FILE_BYTES, ACCEPTED_TYPES } from "./schemas";

const MIN_LENGTH = 2;

export function ReplyBox({
  ticketId,
  allowPhotos,
  onSent,
}: {
  ticketId: number;
  allowPhotos: boolean;
  onSent?: () => void;
}) {
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [problem, setProblem] = useState("");
  const postMessage = usePostMessage(ticketId);

  async function send() {
    setProblem("");

    if (body.trim().length < MIN_LENGTH) {
      setProblem("Write a message before sending.");
      return;
    }
    const tooBig = photos.find((file) => file.size > MAX_FILE_BYTES);
    if (tooBig) {
      setProblem(`${tooBig.name} is larger than 5 MB.`);
      return;
    }
    const wrongType = photos.find((file) => !ACCEPTED_TYPES.includes(file.type as never));
    if (wrongType) {
      setProblem(`${wrongType.name} is not a JPEG, PNG or WebP image.`);
      return;
    }

    const form = new FormData();
    form.append("body", body.trim());
    photos.forEach((file) => form.append("attachments", file));

    try {
      await postMessage.mutateAsync(form);
      setBody("");
      setPhotos([]);
      onSent?.();
    } catch (error) {
      setProblem(errorMessage(error, "Your message could not be sent."));
    }
  }

  return (
    <div className="space-y-3">
      {problem && (
        <Alert variant="destructive">
          <AlertDescription>{problem}</AlertDescription>
        </Alert>
      )}

      <Textarea
        rows={4}
        value={body}
        aria-label="Your reply"
        placeholder="Write a reply…"
        onChange={(event) => setBody(event.target.value)}
      />

      {allowPhotos && <PhotoPicker value={photos} onChange={setPhotos} />}

      <Button onClick={send} disabled={postMessage.isPending}>
        {postMessage.isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Send className="size-4" />
        )}
        Send message
      </Button>
    </div>
  );
}
