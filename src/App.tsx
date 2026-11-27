/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState, type MouseEvent } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { WhatIsCorpusSection } from './components/WhatIsCorpusSection';
import { FeaturesSection } from './components/FeaturesSection';
import { SecuritySection } from './components/SecuritySection';
import { UpgradeSection } from './components/UpgradeSection';
import { ContactSection } from './components/ContactSection';
import { DocsPage } from './components/DocsPage';
import { CheckoutNoticePage } from './components/CheckoutNoticePage';
import { Footer } from './components/Footer';
import { LegalModal } from './components/LegalModal';
import type { LegalDoc } from './data/corpusData';
import { preloadRecaptcha } from './lib/recaptcha';

export default function App() {
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDoc['id'] | null>(null);
  // The server SPA-fallbacks every path to index.html, so /docs is a
  // client-side route: same no-router pattern the app uses for /premium.
  const isDocsRoute = window.location.pathname === '/docs';
  // Stripe checkout landing pages (success_url / cancel_url, P4).
  const isThankYouRoute = window.location.pathname === '/thank-you';
  const isCancelRoute = window.location.pathname === '/cancel';
  const isCheckoutNoticeRoute = isThankYouRoute || isCancelRoute;

  useEffect(() => {
    void preloadRecaptcha();
  }, []);

  // Home-route hash scrolling. Home section ids (#top, #what-is-corpus, …)
  // only exist on "/": a fresh load onto "/#upgrade" (e.g. from /docs or the
  // cancel page) paints React after the browser's native hash scroll, so we
  // scroll to the hash ourselves — on mount and on every in-page hashchange.
  // Docs in-page hashes (#how-to, #ollama, #google-drive) are never touched:
  // this effect is a no-run on non-home routes, and the id list below is
  // home-only.
  useEffect(() => {
    const onHome = window.location.pathname === '/' || window.location.pathname === '';
    if (!onHome) return;
    const HOME_SECTION_IDS = ['top', 'what-is-corpus', 'features', 'security', 'upgrade', 'contact'];
    const scrollToHash = () => {
      const id = window.location.hash.replace(/^#/, '');
      if (!HOME_SECTION_IDS.includes(id)) return;
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };
    scrollToHash();
    window.addEventListener('hashchange', scrollToHash);
    return () => window.removeEventListener('hashchange', scrollToHash);
  }, []);

  useEffect(() => {
    if (isDocsRoute) {
      document.title = 'Documentation · Corpus';
    } else if (isThankYouRoute) {
      document.title = 'Payment received · Corpus Premium';
    } else if (isCancelRoute) {
      document.title = 'Checkout cancelled · Corpus Premium';
    }
  }, [isDocsRoute, isThankYouRoute, isCancelRoute]);

  // Navbar/Footer "Upgrade" anchors: on the home route prevent the default
  // hash jump and smooth-scroll instead; off-home their href is "/#upgrade",
  // so let that navigation proceed untouched (the mount effect above then
  // scrolls to the section).
  const scrollToUpgrade = (e?: MouseEvent) => {
    const onHome = window.location.pathname === '/' || window.location.pathname === '';
    if (!onHome) return;
    e?.preventDefault();
    const el = document.getElementById('upgrade');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#070C10] text-[#E6EFF2]">
      <Navbar onNavigateUpgrade={scrollToUpgrade} />

      <main>
        {isCheckoutNoticeRoute ? (
          <CheckoutNoticePage kind={isThankYouRoute ? 'thank-you' : 'cancelled'} />
        ) : isDocsRoute ? (
          <DocsPage />
        ) : (
          <>
            <HeroSection />
            <WhatIsCorpusSection />
            <FeaturesSection onSelectUpgrade={scrollToUpgrade} />
            <SecuritySection onOpenSecurityDoc={() => setActiveLegalDoc('security')} />
            <UpgradeSection onOpenLegal={(docId) => setActiveLegalDoc(docId)} />
            <ContactSection />
          </>
        )}
      </main>

      <Footer onOpenLegal={(docId) => setActiveLegalDoc(docId)} />

      <LegalModal
        activeDocId={activeLegalDoc}
        onSelectDoc={(docId) => setActiveLegalDoc(docId)}
        onClose={() => setActiveLegalDoc(null)}
      />
    </div>
  );
}
