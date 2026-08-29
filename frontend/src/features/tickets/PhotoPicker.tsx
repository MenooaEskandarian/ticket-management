import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/format";
import { ACCEPTED_TYPES, MAX_PHOTOS, rejectionReason } from "./schemas";

/**
 * Photo picker for delivery problems.
 *
 * Files are checked as they are chosen so an oversized photo is reported at the
 * moment it is picked, rather than silently sitting in the form until submit.
 * The schema still validates on submit; this is the faster half of the message.
 */
export function PhotoPicker({
  value,
  onChange,
  disabled,
}: {
  value: File[];
  onChange: (files: File[]) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [rejected, setRejected] = useState<string[]>([]);

  function addFiles(list: FileList | null) {
    if (!list) return;

    const accepted: File[] = [];
    const reasons: string[] = [];
    for (const file of Array.from(list)) {
      const reason = rejectionReason(file);
      if (reason) reasons.push(reason);
      else accepted.push(file);
    }

    const room = MAX_PHOTOS - value.length;
    if (accepted.length > room) {
      reasons.push(`Only ${MAX_PHOTOS} photos can be attached, so some were left out.`);
    }

    setRejected(reasons);
    if (accepted.length) onChange([...value, ...accepted].slice(0, MAX_PHOTOS));
    if (input.current) input.current.value = "";
  }

  return (
    <div className="space-y-3">
      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(",")}
        className="sr-only"
        aria-label="Add photos"
        data-testid="photo-input"
        onChange={(event) => addFiles(event.target.files)}
      />

      <Button
        type="button"
        variant="outline"
        disabled={disabled || value.length >= MAX_PHOTOS}
        onClick={() => input.current?.click()}
      >
        <ImagePlus className="size-4" />
        Add photos
      </Button>

      {rejected.length > 0 && (
        <ul className="space-y-1" role="alert">
          {rejected.map((reason) => (
            <li key={reason} className="text-sm text-destructive">
              {reason}
            </li>
          ))}
        </ul>
      )}

      {value.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {value.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center gap-3 rounded-lg border p-2"
            >
              <img
                src={URL.createObjectURL(file)}
                alt=""
                className="size-12 rounded object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${file.name}`}
                onClick={() => onChange(value.filter((_, i) => i !== index))}
              >
                <X className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
