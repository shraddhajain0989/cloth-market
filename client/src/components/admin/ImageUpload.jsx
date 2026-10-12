import { useRef, useState } from "react";
import {
  Upload,
  X,
  Star,
  ChevronLeft,
  ChevronRight,
  Plus,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon
} from "lucide-react";
import { uploadApi } from "../../api/endpoints";

const MAX_IMAGES = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

export default function ImageUpload({ value = [], onChange, disabled = false }) {
  // Normalize value to array of strings
  const images = Array.isArray(value) ? value : value ? [value] : [];

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [error, setError] = useState("");
  const [draggedIndex, setDraggedIndex] = useState(null);
  const inputRef = useRef(null);

  const isAtLimit = images.length >= MAX_IMAGES;
  const isOverLimit = images.length > MAX_IMAGES;
  const remainingSlots = Math.max(0, MAX_IMAGES - images.length);

  // Validate and upload files
  async function handleFiles(filesList) {
    if (!filesList || filesList.length === 0) return;
    if (isAtLimit) {
      setError(`Maximum limit of ${MAX_IMAGES} images already reached. Remove an image to add a new one.`);
      return;
    }

    const files = Array.from(filesList);
    setError("");

    // Slice to remaining slots
    let filesToProcess = files;
    if (files.length > remainingSlots) {
      filesToProcess = files.slice(0, remainingSlots);
      setError(`Only ${remainingSlots} image(s) could be added to respect the ${MAX_IMAGES}-image limit.`);
    }

    // Validate types and sizes
    for (const file of filesToProcess) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        setError(`"${file.name}" has an unsupported format. Only JPG, JPEG, PNG, and WebP are allowed.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError(`"${file.name}" exceeds the 5MB file size limit.`);
        return;
      }
    }

    setUploading(true);
    setUploadProgress(`Uploading ${filesToProcess.length} image(s)...`);

    try {
      const uploadedUrls = [];
      for (let i = 0; i < filesToProcess.length; i++) {
        const file = filesToProcess[i];
        setUploadProgress(`Uploading ${i + 1} of ${filesToProcess.length}: ${file.name}...`);
        const { data } = await uploadApi.image(file);
        const url = data?.data?.url || data?.url;
        if (url) {
          uploadedUrls.push(url);
        }
      }

      if (uploadedUrls.length > 0) {
        const updated = [...images, ...uploadedUrls];
        onChange(updated);
        setError(
          files.length > remainingSlots
            ? `Uploaded ${uploadedUrls.length} image(s). (Max ${MAX_IMAGES} reached)`
            : ""
        );
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Image upload failed. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress("");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  // Remove individual image
  function handleRemove(index) {
    const updated = images.filter((_, i) => i !== index);
    onChange(updated);
    setError("");
  }

  // Set image as primary (cover) -> move to index 0
  function handleSetPrimary(index) {
    if (index === 0) return;
    const item = images[index];
    const withoutItem = images.filter((_, i) => i !== index);
    onChange([item, ...withoutItem]);
  }

  // Move image left (swap with index - 1)
  function handleMoveLeft(index) {
    if (index <= 0) return;
    const updated = [...images];
    const temp = updated[index - 1];
    updated[index - 1] = updated[index];
    updated[index] = temp;
    onChange(updated);
  }

  // Move image right (swap with index + 1)
  function handleMoveRight(index) {
    if (index >= images.length - 1) return;
    const updated = [...images];
    const temp = updated[index + 1];
    updated[index + 1] = updated[index];
    updated[index] = temp;
    onChange(updated);
  }

  // Drag and Drop reordering
  function handleDragStart(index) {
    setDraggedIndex(index);
  }

  function handleDragOver(e, index) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const updated = [...images];
    const draggedItem = updated[draggedIndex];
    updated.splice(draggedIndex, 1);
    updated.splice(index, 0, draggedItem);
    setDraggedIndex(index);
    onChange(updated);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
  }

  return (
    <div className="space-y-4 rounded-2xl border border-cm-border bg-slate-50/60 p-4 sm:p-5">
      {/* Header with counter */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cm-border/60 pb-3">
        <div>
          <label className="text-2xs font-bold uppercase tracking-wider text-cm-black block">
            Product Photos <span className="text-cm-red">*</span>
          </label>
          <p className="text-xs text-cm-muted">
            Upload between 1 and {MAX_IMAGES} images. The first image is the primary cover photo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              images.length === 0
                ? "bg-amber-100 text-amber-800"
                : images.length === MAX_IMAGES
                ? "bg-emerald-100 text-emerald-800"
                : isOverLimit
                ? "bg-red-100 text-red-800"
                : "bg-slate-200 text-slate-800"
            }`}
          >
            {images.length}/{MAX_IMAGES} images
          </span>
        </div>
      </div>

      {/* Historical over-limit warning */}
      {isOverLimit && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-800 border border-red-200">
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-600" />
          <div>
            <p className="font-bold">Historical image count exceeds {MAX_IMAGES}</p>
            <p>
              This product currently has {images.length} images. Please remove images until {MAX_IMAGES} or fewer
              remain before adding new ones.
            </p>
          </div>
        </div>
      )}

      {/* Image Preview Cards Grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {images.map((url, idx) => {
            const isPrimary = idx === 0;
            return (
              <div
                key={`${url}-${idx}`}
                draggable={!disabled}
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                className={`group relative flex flex-col rounded-2xl border bg-white p-2 shadow-xs transition-all ${
                  isPrimary
                    ? "border-cm-black ring-2 ring-cm-black/10"
                    : "border-cm-border hover:border-slate-400"
                } ${draggedIndex === idx ? "opacity-40" : ""}`}
              >
                {/* Primary Cover Badge */}
                {isPrimary ? (
                  <span className="absolute left-3 top-3 z-10 flex items-center gap-1 rounded-md bg-cm-black px-2 py-0.5 text-3xs font-bold uppercase tracking-wider text-white shadow-sm">
                    <Star size={10} className="fill-white" /> Cover
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSetPrimary(idx)}
                    disabled={disabled}
                    className="absolute left-3 top-3 z-10 rounded-md bg-white/90 px-1.5 py-0.5 text-3xs font-semibold text-slate-700 opacity-0 shadow-xs transition hover:bg-cm-black hover:text-white group-hover:opacity-100"
                    title="Set as Cover Photo"
                  >
                    Set Cover
                  </button>
                )}

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  disabled={disabled}
                  className="absolute right-3 top-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-xs transition hover:bg-red-600 hover:text-white"
                  title="Remove image"
                >
                  <X size={13} />
                </button>

                {/* Image display */}
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-slate-100">
                  <img
                    src={url}
                    alt={`Product photo ${idx + 1}`}
                    className="h-full w-full object-cover object-center"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=600&auto=format&fit=crop";
                    }}
                  />
                </div>

                {/* Ordering Controls */}
                <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-1 text-2xs text-slate-500">
                  <span className="font-semibold text-slate-400">#{idx + 1}</span>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleMoveLeft(idx)}
                      disabled={disabled || idx === 0}
                      className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-20"
                      title="Move Left"
                    >
                      <ChevronLeft size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveRight(idx)}
                      disabled={disabled || idx === images.length - 1}
                      className="rounded p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-20"
                      title="Move Right"
                    >
                      <ChevronRight size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Drop Zone & Controls */}
      <div className="space-y-3">
        {!isAtLimit ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFiles(e.dataTransfer.files);
            }}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-center transition hover:border-cm-black"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600 mb-3">
              <Upload size={20} />
            </div>

            <p className="text-xs font-semibold text-cm-black mb-1">
              Select or drop images here
            </p>
            <p className="text-2xs text-cm-muted mb-3">
              Supports JPEG, PNG, and WebP (up to 5MB each). You can add {remainingSlots} more image(s).
            </p>

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading || disabled}
              className="inline-flex items-center gap-2 rounded-xl bg-cm-black px-4 py-2 text-xs font-bold text-white uppercase tracking-wider transition hover:bg-cm-red disabled:opacity-50"
            >
              <Plus size={14} />
              <span>Choose Files</span>
            </button>

            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/jpg"
              onChange={(e) => handleFiles(e.target.files)}
              className="hidden"
            />
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <p className="font-semibold">
              Maximum of {MAX_IMAGES} images selected. To add a different image, remove one above.
            </p>
          </div>
        )}

        {/* Upload progress state */}
        {uploading && (
          <div className="flex items-center gap-2 text-xs font-semibold text-cm-black bg-blue-50 p-2.5 rounded-xl border border-blue-200">
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            <span>{uploadProgress || "Uploading images..."}</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700 border border-red-200">
            <AlertCircle size={15} className="shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
