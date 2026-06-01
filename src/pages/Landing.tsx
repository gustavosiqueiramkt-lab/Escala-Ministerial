import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LandingNav } from '@/components/landing/LandingNav';
import { HeroSection } from '@/components/landing/HeroSection';
import { WaveDivider } from '@/components/landing/WaveDivider';
import { ProblemSection } from '@/components/landing/ProblemSection';
import { FeaturesSection } from '@/components/landing/FeaturesSection';
import { FeatureExplorerSection } from '@/components/landing/FeatureExplorerSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { CtaSection } from '@/components/landing/CtaSection';
import { LandingFooter } from '@/components/landing/LandingFooter';

export default function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#1e1458]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/40" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <LandingNav />
      <HeroSection />
      {/* Hero (dark) → Problem (white): wave already inside HeroSection */}
      <ProblemSection />
      {/* Problem (white) → Features (violet-50) */}
      <WaveDivider fromColor="white" toColor="#f5f3ff" />
      <FeaturesSection />
      {/* Features (violet-50) → Feature Explorer (white) */}
      <WaveDivider fromColor="#f5f3ff" toColor="white" />
      <FeatureExplorerSection />
      {/* Feature Explorer (white) → Testimonials (violet-50) */}
      <WaveDivider fromColor="white" toColor="#f5f3ff" />
      <TestimonialsSection />
      {/* Testimonials (violet-50) → Pricing (white) */}
      <WaveDivider fromColor="#f5f3ff" toColor="white" />
      <PricingSection />
      {/* Pricing (white) → CTA (dark violet) */}
      <WaveDivider fromColor="white" toColor="#1e1458" />
      <CtaSection />
      <LandingFooter />
    </div>
  );
}
