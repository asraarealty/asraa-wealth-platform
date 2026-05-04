"use client";

import PlatformSettings from "@/components/admin/settings/PlatformSettings";
import PricingSettings from "@/components/admin/settings/PricingSettings";
import InvestmentRules from "@/components/admin/settings/InvestmentRules";
import MarketDataSettings from "@/components/admin/settings/MarketDataSettings";
import FeaturedProperties from "@/components/admin/settings/FeaturedProperties";
import NotificationsSettings from "@/components/admin/settings/NotificationsSettings";
import AdminControls from "@/components/admin/settings/AdminControls";

export default function SettingsPage() {
  return (
    <div className="space-y-6 text-white">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
          Platform control panel — configure behavior, rules, and monetization.
        </p>
      </div>

      {/* Row 1: compact sections side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <PlatformSettings />
        <NotificationsSettings />
      </div>

      {/* Row 2: market data + pricing */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <MarketDataSettings />
        <PricingSettings />
      </div>

      {/* Row 3: full-width complex sections */}
      <InvestmentRules />
      <FeaturedProperties />
      <AdminControls />
    </div>
  );
}
