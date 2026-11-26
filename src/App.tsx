/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (isDocsRoute) {
      document.title = 'Documentation · Corpus';
    } else if (isThankYouRoute) {
      document.title = 'Payment received · Corpus Premium';
    } else if (isCancelRoute) {
      document.title = 'Checkout cancelled · Corpus Premium';
    }
  }, [isDocsRoute, isThankYouRoute, isCancelRoute]);

  const scrollToUpgrade = () => {
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
