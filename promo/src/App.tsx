import Navbar from './components/Navbar';
import Hero from './components/Hero';
import TerminalDemo from './components/TerminalDemo';
import FeatureGrid from './components/FeatureGrid';
import UseCases from './components/UseCases';
import Architecture from './components/Architecture';
import GettingStarted from './components/GettingStarted';
import Timeline from './components/Timeline';
import TechStack from './components/TechStack';
import Stats from './components/Stats';
import DashboardPreview from './components/DashboardPreview';
import Footer from './components/Footer';

export default function App() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-gray-200">
      <Navbar />
      <main>
        <Hero />
        <TerminalDemo />
        <FeatureGrid />
        <UseCases />
        <Architecture />
        <Stats />
        <DashboardPreview />
        <GettingStarted />
        <Timeline />
        <TechStack />
      </main>
      <Footer />
    </div>
  );
}
