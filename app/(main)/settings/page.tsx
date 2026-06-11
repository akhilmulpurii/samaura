import { AuroraBackground } from "@/src/components/aurora-background";
import { SearchBar } from "@/src/components/search-component";
import { Settings2 } from "lucide-react";
import SeerrSection from "@/src/components/settings/seerr-section";
import OpenSubtitlesSection from "@/src/components/settings/opensubtitles-section";
import ProfileSection from "@/src/components/settings/profile-section";
import ThemeSection from "@/src/components/settings/theme-section";
import UserPreferenceSection from "@/src/components/settings/user-preference-section";

export default function SettingsPage() {
  return (
    <div className="relative px-4 py-3 max-w-full overflow-hidden">
      <AuroraBackground />
      <div className="relative z-10">
        <div className="mb-6">
          <SearchBar />
        </div>

        <div className="mb-8">
          <h2 className="text-3xl font-semibold text-foreground mb-2 font-poppins flex items-center gap-2">
            <Settings2 className="h-8 w-8" />
            Settings
          </h2>
          <p className="text-muted-foreground">
            Customize the interface and preview upcoming dashboard themes.
          </p>
        </div>

        <div className="grid gap-6">
          <ProfileSection />
          <SeerrSection />
          <OpenSubtitlesSection />
          <UserPreferenceSection />
          <ThemeSection />
        </div>
      </div>
    </div>
  );
}
