import { PageViewTracker } from "@/components/analytics/page-view-tracker";
import { BackToTop } from "@/components/back-to-top";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { SpotlightTracker } from "@/components/ui/spotlight";
import { getNavigation, getProfile } from "@/lib/content";

/** Public site chrome: header, main content, footer. The admin area has its own layout. */
export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const profile = await getProfile();
  const navigation = await getNavigation(profile);
  return (
    <>
      <SiteHeader name={profile.display_name} items={navigation} />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <SiteFooter profile={profile} items={navigation} />
      <BackToTop />
      <PageViewTracker />
      <SpotlightTracker />
    </>
  );
}
