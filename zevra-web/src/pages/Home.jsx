import Nav from '../components/Nav';
import Hero from '../components/Hero';
import TrustBar from '../components/TrustBar';
import Problem from '../components/Problem';
import HowItWorks from '../components/HowItWorks';
import Features from '../components/Features';
import UseCases from '../components/UseCases';
import Differentiators from '../components/Differentiators';
import Integrations from '../components/Integrations';
import Security from '../components/Security';
import Pricing from '../components/Pricing';
import CtaSection from '../components/CtaSection';
import Footer from '../components/Footer';

export default function Home() {
  return (
    <>
      <Nav />
      <Hero />
      <TrustBar />
      <Problem />
      <HowItWorks />
      <Features />
      <UseCases />
      <Differentiators />
      <Integrations />
      <Security />
      <Pricing />
      <CtaSection />
      <Footer />
    </>
  );
}
