"use client";

import { useEffect, useRef, useState } from "react";
import SectionCard from "./SectionCard";
import Toggle from "./Toggle";
import {
  getFeaturedProperties,
  createFeaturedProperty,
  updateFeaturedProperty,
  deleteFeaturedProperty,
  toggleFeaturedProperty,
  reorderFeaturedProperties,
  uploadImage,
  type FeaturedProperty,
} from "@/lib/api";
import { toErrorMessage } from "@/lib/fetcher";
import { useToast } from "@/context/ToastContext";

const MAX_ACTIVE = 6;

const CRORE = 10_000_000;
const LAKH = 100_000;

function fmtPrice(n: number) {
  if (n >= CRORE) return `₹${(n / CRORE).toFixed(1)}Cr`;
  if (n >= LAKH) return `₹${(n / LAKH).toFixed(1)}L`;
  return `₹${n.toLocaleString("en-IN")}`;
}

/** Resolve a potentially relative, absolute, or data URL to a browser path. */
function resolveImageUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("//") || url.startsWith("data:")) return url;
  return `/api/v2${url.startsWith("/") ? url : `/${url}`}`;
}

const emptyForm = (): Omit<FeaturedProperty, "id"> => ({
  title: "",
  location: "",
  price: 0,
  roi: 0,
  imageUrl: "",
  redirectUrl: "",
  isActive: true,
  displayOrder: 0,
});

export default function FeaturedProperties() {
  const { showToast } = useToast();
  const [properties, setProperties] = useState<FeaturedProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<FeaturedProperty["id"] | "new" | null>(null);
  const [editForm, setEditForm] = useState<Omit<FeaturedProperty, "id">>(emptyForm());
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [deletingId, setDeletingId] = useState<FeaturedProperty["id"] | null>(null);
  const [togglingId, setTogglingId] = useState<FeaturedProperty["id"] | null>(null);

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isDragOver, setIsDragOver] = useState(false);
  const imagePreviewRef = useRef<string>("");

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const dragOverIndex = useRef<number | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    getFeaturedProperties(ac.signal)
      .then((data) => setProperties(Array.isArray(data) ? sortByOrder(data) : []))
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(toErrorMessage(err));
      })
      .finally(() => setLoading(false));
    return () => ac.abort();
  }, []);

  function sortByOrder(list: FeaturedProperty[]) {
    return [...list].sort((a, b) => a.displayOrder - b.displayOrder);
  }

  const activeCount = properties.filter((p) => p.isActive).length;
  const activeWarning = activeCount > MAX_ACTIVE;

  function openEdit(prop: FeaturedProperty) {
    setEditForm({
      title: prop.title,
      location: prop.location,
      price: prop.price,
      roi: prop.roi,
      imageUrl: prop.imageUrl,
      redirectUrl: prop.redirectUrl,
      isActive: prop.isActive,
      displayOrder: prop.displayOrder,
    });
    setEditingId(prop.id);
    setActionError(null);
    setImageFile(null);
    const resolved = resolveImageUrl(prop.imageUrl);
    imagePreviewRef.current = resolved;
    setImagePreview(resolved);
  }

  function openNew() {
    setEditForm({ ...emptyForm(), displayOrder: properties.length });
    setEditingId("new");
    setActionError(null);
    setImageFile(null);
    imagePreviewRef.current = "";
    setImagePreview("");
  }

  function closeEdit() {
    setEditingId(null);
    setActionError(null);
    // Revoke object URL if we created one
    if (imageFile && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    imagePreviewRef.current = "";
    setImagePreview("");
    setUploadProgress(0);
  }

  function patchForm(partial: Partial<Omit<FeaturedProperty, "id">>) {
    setEditForm((prev) => ({ ...prev, ...partial }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validate redirectUrl
    const redirectVal = editForm.redirectUrl.trim();
    if (!redirectVal) {
      setActionError("Redirect URL is required.");
      return;
    }
    if (!redirectVal.startsWith("http://") && !redirectVal.startsWith("https://") && !redirectVal.startsWith("/")) {
      setActionError("Redirect URL must start with http://, https://, or /.");
      return;
    }

    setSubmitting(true);
    setActionError(null);

    let finalForm = { ...editForm };

    // Upload image file first (if a new file was selected)
    if (imageFile) {
      setUploading(true);
      setUploadProgress(0);
      try {
        const { url } = await uploadImage(imageFile, setUploadProgress);
        finalForm = { ...finalForm, imageUrl: url };
      } catch (err) {
        setActionError("Image upload failed: " + toErrorMessage(err));
        showToast("Image upload failed.", "error");
        setSubmitting(false);
        return;
      } finally {
        setUploading(false);
      }
    }

    try {
      if (editingId === "new") {
        const created = await createFeaturedProperty(finalForm);
        setProperties((prev) => sortByOrder([...prev, created]));
        showToast("Featured property created.", "success");
      } else if (editingId !== null) {
        const updated = await updateFeaturedProperty(editingId, finalForm);
        setProperties((prev) =>
          sortByOrder(prev.map((p) => (p.id === editingId ? updated : p)))
        );
        showToast("Featured property updated.", "success");
      }
      closeEdit();
    } catch (err) {
      const message = toErrorMessage(err);
      setActionError(message);
      showToast(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: FeaturedProperty["id"]) {
    setDeletingId(id);
    setActionError(null);
    try {
      await deleteFeaturedProperty(id);
      setProperties((prev) => prev.filter((p) => p.id !== id));
      showToast("Featured property deleted.", "success");
    } catch (err) {
      const message = toErrorMessage(err);
      setActionError(message);
      showToast(message, "error");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggle(id: FeaturedProperty["id"]) {
    setTogglingId(id);
    setActionError(null);
    try {
      const updated = await toggleFeaturedProperty(id);
      setProperties((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isActive: updated.isActive } : p))
      );
      showToast("Property visibility updated.", "success");
    } catch (err) {
      const message = toErrorMessage(err);
      setActionError(message);
      showToast(message, "error");
    } finally {
      setTogglingId(null);
    }
  }

  // Image file select helper
  function handleFileSelect(file: File) {
    if (imageFile && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(file);
    const objectUrl = URL.createObjectURL(file);
    imagePreviewRef.current = objectUrl;
    setImagePreview(objectUrl);
  }

  function clearImagePreview() {
    if (imageFile && imagePreview.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    patchForm({ imageUrl: "" });
    imagePreviewRef.current = "";
    setImagePreview("");
  }

  // Drag-and-drop handlers
  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    dragOverIndex.current = index;
  }

  async function handleDrop() {
    if (dragIndex === null || dragOverIndex.current === null) return;
    if (dragIndex === dragOverIndex.current) {
      setDragIndex(null);
      return;
    }
    const next = [...properties];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(dragOverIndex.current, 0, moved);
    // Assign new displayOrder values
    const reordered = next.map((p, i) => ({ ...p, displayOrder: i }));
    setProperties(reordered);
    setDragIndex(null);
    dragOverIndex.current = null;

    try {
      await reorderFeaturedProperties(reordered.map((p) => p.id));
    } catch (err) {
      const message = toErrorMessage(err);
      setActionError(message);
      showToast(message, "error");
    }
  }

  // onSave is a no-op since mutations happen inline
  async function handleSave() {}

  const inputCls = "w-full rounded-xl px-3 py-2 text-sm neon-input";

  return (
    <SectionCard
      title="Featured Properties — Slider Control"
      icon={
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      }
      onSave={handleSave}
      loading={loading}
    >
      {error && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(255,77,109,0.08)", border: "1px solid rgba(255,77,109,0.2)", color: "#ff4d6d" }}
        >
          {error}
        </div>
      )}

      {actionError && (
        <div
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: "rgba(255,77,109,0.08)", border: "1px solid rgba(255,77,109,0.2)", color: "#ff4d6d" }}
        >
          {actionError}
        </div>
      )}

      {/* Active count warning */}
      {activeWarning && (
        <div
          className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
          style={{ background: "rgba(201,162,39,0.08)", border: "1px solid rgba(201,162,39,0.2)", color: "#C9A227" }}
        >
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          {activeCount} active properties — max {MAX_ACTIVE} recommended for the slider.
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          {properties.length} {properties.length === 1 ? "property" : "properties"} · {activeCount} active
        </span>
        <button
          type="button"
          onClick={openNew}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
          style={{ background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.2)", color: "#00E5FF" }}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Property
        </button>
      </div>

      {/* Inline create / edit form */}
      {editingId !== null && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl p-4 space-y-3 animate-fade-in"
          style={{ background: "rgba(0,229,255,0.03)", border: "1px solid rgba(0,229,255,0.12)" }}
        >
          <p className="text-xs font-semibold" style={{ color: "#00E5FF" }}>
            {editingId === "new" ? "New Property" : "Edit Property"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="fp-title" className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>Title</label>
              <input
                id="fp-title"
                type="text"
                required
                className={inputCls}
                placeholder="Property name"
                value={editForm.title}
                onChange={(e) => patchForm({ title: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="fp-location" className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>Location</label>
              <input
                id="fp-location"
                type="text"
                required
                className={inputCls}
                placeholder="City, Area"
                value={editForm.location}
                onChange={(e) => patchForm({ location: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="fp-price" className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>Price (₹)</label>
              <input
                id="fp-price"
                type="number"
                required
                min={0}
                className={inputCls}
                value={editForm.price}
                onChange={(e) => patchForm({ price: Number(e.target.value) })}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="fp-roi" className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>ROI (%)</label>
              <input
                id="fp-roi"
                type="number"
                required
                step={0.1}
                min={0}
                className={inputCls}
                value={editForm.roi}
                onChange={(e) => patchForm({ roi: Number(e.target.value) })}
              />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
                Property Image
                {imageFile && <span style={{ color: "rgba(0,229,255,0.7)" }}> — new file selected</span>}
              </label>
              {/* Drop zone */}
              <div
                className="relative rounded-xl overflow-hidden transition-all duration-150"
                style={{
                  border: isDragOver ? "1.5px dashed #00E5FF" : "1px dashed rgba(0,229,255,0.3)",
                  background: isDragOver ? "rgba(0,229,255,0.06)" : "rgba(0,229,255,0.02)",
                  minHeight: "100px",
                }}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type.startsWith("image/")) handleFileSelect(file);
                }}
              >
                {imagePreview ? (
                  <div className="relative h-28">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={clearImagePreview}
                      className="absolute top-1.5 right-1.5 rounded-full p-1 transition-opacity"
                      style={{ background: "rgba(0,0,0,0.65)" }}
                      title="Remove image"
                    >
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <label
                      htmlFor="fp-image-file"
                      className="absolute bottom-1.5 right-1.5 text-xs px-2 py-1 rounded-lg cursor-pointer"
                      style={{ background: "rgba(0,0,0,0.65)", color: "rgba(0,229,255,0.9)" }}
                    >
                      Change
                    </label>
                  </div>
                ) : (
                  <label
                    htmlFor="fp-image-file"
                    className="flex flex-col items-center justify-center h-28 cursor-pointer gap-2"
                  >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: "rgba(0,229,255,0.45)" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <span className="text-xs text-center" style={{ color: "rgba(255,255,255,0.35)" }}>
                      Click or drag &amp; drop image here
                    </span>
                  </label>
                )}
                <input
                  id="fp-image-file"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                    e.target.value = "";
                  }}
                />
              </div>
              {uploading && (
                <div className="mt-2 space-y-1">
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-200"
                      style={{
                        width: `${uploadProgress}%`,
                        background: "linear-gradient(90deg, #00E5FF, #4F8CFF)",
                      }}
                    />
                  </div>
                  <p className="text-[11px]" style={{ color: "rgba(0,229,255,0.75)" }}>
                    Uploading image… {uploadProgress}%
                  </p>
                </div>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="fp-redirect-url" className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>Redirect URL</label>
              <input
                id="fp-redirect-url"
                type="text"
                className={inputCls}
                placeholder="https://... or /path"
                value={editForm.redirectUrl}
                onChange={(e) => patchForm({ redirectUrl: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Active</label>
            <Toggle
              checked={editForm.isActive}
              onChange={(v) => patchForm({ isActive: v })}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={closeEdit}
              className="text-xs font-medium px-3 py-1.5 rounded-lg"
              style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || uploading}
              className="neon-btn text-xs font-semibold px-4 py-1.5 rounded-lg disabled:opacity-50"
            >
              {uploading ? "Uploading…" : submitting ? "Saving…" : "Save Property"}
            </button>
          </div>
        </form>
      )}

      {/* Properties list with drag-and-drop */}
      {properties.length === 0 && !loading ? (
        <div
          className="rounded-xl p-8 text-center"
          style={{ border: "1px dashed rgba(255,255,255,0.1)" }}
        >
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.35)" }}>
            No featured properties yet
          </p>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.2)" }}>
            Click "Add Property" to create the first entry
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>Drag rows to reorder display order</p>
          {properties.map((prop, i) => (
            <div
              key={prop.id}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={handleDrop}
              className="flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-150 select-none"
              style={{
                background: dragIndex === i ? "rgba(0,229,255,0.08)" : prop.isActive ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.01)",
                border: prop.isActive ? "1px solid rgba(255,255,255,0.07)" : "1px solid rgba(255,255,255,0.04)",
                opacity: dragIndex === i ? 0.6 : prop.isActive ? 1 : 0.55,
                cursor: "grab",
              }}
            >
              {/* Drag handle */}
              <svg
                className="w-4 h-4 shrink-0"
                style={{ color: "rgba(255,255,255,0.2)" }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
              </svg>

              {/* Order badge */}
              <span
                className="w-5 h-5 rounded-md text-xs font-bold flex items-center justify-center shrink-0"
                style={{ background: "rgba(0,229,255,0.12)", color: "#00E5FF" }}
              >
                {i + 1}
              </span>

              {/* Thumbnail */}
              <div
                className="shrink-0 rounded-lg overflow-hidden"
                style={{ width: "44px", height: "32px", background: "rgba(0,229,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
              >
                {prop.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveImageUrl(prop.imageUrl)}
                    alt={prop.title}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: "rgba(0,229,255,0.3)" }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{prop.title}</p>
                <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {prop.location} · {fmtPrice(prop.price)} · +{prop.roi}% ROI
                </p>
              </div>

              {/* Active toggle */}
              <Toggle
                checked={prop.isActive}
                disabled={togglingId === prop.id}
                onChange={() => handleToggle(prop.id)}
              />

              {/* Edit */}
              <button
                type="button"
                onClick={() => openEdit(prop)}
                className="shrink-0 text-xs font-medium transition-colors"
                style={{ color: "rgba(0,229,255,0.7)" }}
                title="Edit"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                </svg>
              </button>

              {/* Delete */}
              <button
                type="button"
                disabled={deletingId === prop.id}
                onClick={() => handleDelete(prop.id)}
                className="shrink-0 transition-colors disabled:opacity-50"
                style={{ color: "rgba(255,77,109,0.7)" }}
                title="Delete"
              >
                {deletingId === prop.id ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
