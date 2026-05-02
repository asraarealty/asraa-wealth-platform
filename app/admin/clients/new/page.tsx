"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetcher, toErrorMessage } from "@/lib/fetcher";

export default function NewClientPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const validate = () => {
    if (!form.name.trim()) return "Name is required";
    if (!form.email.includes("@")) return "Valid email required";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: String(form.phone).trim(),
      };

      await fetcher("/clients", {
        method: "POST",
        body: payload,
      });

      router.push("/admin/clients");
    } catch (err: unknown) {
      console.error(err);
      setError(toErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto text-white space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: "#c9a227" }}>
          Add Client
        </h1>
        <p className="text-sm text-gray-400 mt-1">
          Create a new client profile
        </p>
      </div>

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="space-y-4 p-6 rounded-2xl"
        style={{
          background: "rgba(11,61,46,0.6)",
          border: "1px solid rgba(201,162,39,0.2)",
        }}
      >
        {/* NAME */}
        <div>
          <label className="text-sm text-gray-400">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="w-full mt-1 p-2 rounded-xl bg-transparent border border-gray-600 focus:outline-none focus:ring-1"
            required
          />
        </div>

        {/* EMAIL */}
        <div>
          <label className="text-sm text-gray-400">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => handleChange("email", e.target.value)}
            className="w-full mt-1 p-2 rounded-xl bg-transparent border border-gray-600 focus:outline-none focus:ring-1"
            required
          />
        </div>

        {/* PHONE */}
        <div>
          <label className="text-sm text-gray-400">Phone</label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            className="w-full mt-1 p-2 rounded-xl bg-transparent border border-gray-600 focus:outline-none focus:ring-1"
          />
        </div>

        {/* ERROR */}
        {error && (
          <div className="text-red-400 text-sm">{error}</div>
        )}

        {/* ACTIONS */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-xl font-semibold text-black"
            style={{
              background: "linear-gradient(90deg, #C9A227, #d4af4a)",
            }}
          >
            {loading ? "Creating..." : "Create Client"}
          </button>

          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded-xl border border-gray-500 text-gray-300"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
