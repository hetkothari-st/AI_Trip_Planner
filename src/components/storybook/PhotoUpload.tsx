"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";

type Status = "idle" | "uploading" | "error";

interface SignResponse {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  signature: string;
}

export function PhotoUpload({
  kind,
  onUploaded,
  className,
}: {
  kind: "photo" | "ticket";
  onUploaded: (url: string, publicId: string) => void;
  className?: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const label = kind === "ticket" ? "Upload ticket" : "Upload photo";

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // reset so re-selecting the same file fires change again
    e.target.value = "";
    if (!file) return;

    setStatus("uploading");
    setMessage("");

    try {
      const signRes = await fetch("/api/storybooks/upload-sign", { method: "POST" });
      if (signRes.status === 503) {
        setStatus("error");
        setMessage("Image uploads aren't set up yet.");
        return;
      }
      if (signRes.status === 401) {
        setStatus("error");
        setMessage("Please sign in.");
        return;
      }
      if (!signRes.ok) {
        setStatus("error");
        setMessage("Couldn't start the upload. Try again.");
        return;
      }

      const sign = (await signRes.json()) as SignResponse;

      const form = new FormData();
      form.append("file", file);
      form.append("api_key", sign.apiKey);
      form.append("timestamp", String(sign.timestamp));
      form.append("folder", sign.folder);
      form.append("signature", sign.signature);

      const upRes = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, {
        method: "POST",
        body: form,
      });
      if (!upRes.ok) {
        setStatus("error");
        setMessage("Upload failed. Try again.");
        return;
      }

      const data = (await upRes.json()) as { secure_url?: string; public_id?: string };
      if (!data.secure_url || !data.public_id) {
        setStatus("error");
        setMessage("Upload failed. Try again.");
        return;
      }

      onUploaded(data.secure_url, data.public_id);
      setStatus("idle");
    } catch {
      setStatus("error");
      setMessage("Upload failed. Check your connection.");
    }
  }

  const uploading = status === "uploading";

  return (
    <div className={className}>
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 border-2 border-primary bg-surface px-2.5 py-1.5 text-xs font-bold uppercase tracking-wide text-primary transition-colors hover:bg-primary-container disabled:cursor-wait disabled:opacity-70"
      >
        {uploading ? (
          <span className="size-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        ) : (
          <Upload className="size-3.5" strokeWidth={2.5} />
        )}
        {uploading ? "Uploading…" : label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={uploading}
        onChange={handleFile}
      />
      {status === "error" && message && (
        <p className="mt-1 max-w-[12rem] text-[10px] font-bold uppercase leading-tight tracking-wide text-secondary">
          {message}
        </p>
      )}
    </div>
  );
}
