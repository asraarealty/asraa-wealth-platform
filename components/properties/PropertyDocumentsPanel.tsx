import Image from "next/image";
import type { PropertyDetail } from "@/lib/types/realEstate";

const documentCategories = [
  { key: "agreements", label: "Agreements" },
  { key: "invoices", label: "Invoices" },
  { key: "tax_docs", label: "Tax Docs" },
  { key: "maintenance_bills", label: "Maintenance Bills" },
  { key: "property_photos", label: "Property Photos" },
] as const;

export default function PropertyDocumentsPanel({ property }: { property: PropertyDetail }) {
  return (
    <div className="glass-card rounded-2xl p-5 border border-white/10 space-y-5">
      <p className="text-[11px] uppercase tracking-widest text-white/45 font-semibold">Property Documents</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {documentCategories.map((category) => {
          const docs = property.documents.filter((item) => item.category === category.key);
          return (
            <div key={category.key} className="rounded-xl border border-white/10 p-4 bg-white/[0.02]">
              <p className="text-sm font-semibold text-white">{category.label}</p>
              <ul className="mt-3 space-y-2 text-sm text-white/70">
                {docs.length > 0 ? docs.map((doc) => <li key={doc.id} className="truncate">• {doc.title}</li>) : <li className="text-white/40">No documents uploaded</li>}
              </ul>
            </div>
          );
        })}
      </div>

      <div>
        <p className="text-sm font-semibold text-white mb-3">Property Photos</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {property.photos.map((photo) => (
            <div key={photo.id} className="relative overflow-hidden rounded-xl border border-white/10 aspect-[16/10]">
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover"
                unoptimized
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
