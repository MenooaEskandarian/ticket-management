import { useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/format";
import { ACCEPTED_TYPES, MAX_PHOTOS } from "./schemas";

/**
 * Photo picker for delivery problems. The schema does the validating; this only
 * collects files and shows what has been chosen.
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

  function addFiles(list: FileList | null) {
    if (!list) return;
    onChange([...value, ...Array.from(list)].slice(0, MAX_PHOTOS));
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
