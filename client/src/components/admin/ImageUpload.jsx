import { useRef, useState } from "react";
import { uploadApi } from "../../api/endpoints";

export default function ImageUpload({ value, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  async function handleFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    setError("");
    try {
      const { data } = await uploadApi.image(file);
      onChange(data.data.url);
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed. Check Cloudinary credentials.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="col-span-2">
      <p className="mb-2 text-sm font-medium text-slate-600">Product Image</p>

      {/* Preview */}
      {value && (
        <div className="mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
          <img
            src={value}
            alt="Product preview"
            className="h-40 w-full object-contain p-4"
          />
        </div>
      )}

      {/* Upload button */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          {uploading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
              Uploading…
            </>
          ) : (
            <>
              <span>📁</span>
              {value ? "Change image" : "Upload image"}
            </>
          )}
        </button>

        {/* Manual URL fallback */}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Or paste an image URL"
          className="flex-1 rounded-2xl border-slate-200 text-sm"
        />
      </div>

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
}
