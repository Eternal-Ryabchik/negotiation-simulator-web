import React from 'react';
import { SimulatorProvider, useSimulator } from '@/hooks/use-simulator';
import SiteNav from '@/components/simulator/SiteNav';
import Hero from '@/components/simulator/Hero';
import ModeGrid from '@/components/simulator/ModeGrid';
import {
  HowItWorks,
  LevelsPreview,
  ProgressSection,
  ScenariosPreview,
  SiteFooter,
  TeamsSection,
} from '@/components/simulator/HomeSections';
import SetupScreen from '@/components/simulator/SetupScreen';
import QuizScreen from '@/components/simulator/QuizScreen';
import DialogScreen from '@/components/simulator/DialogScreen';
import PhrasesScreen from '@/components/simulator/PhrasesScreen';
import OnlineScreen from '@/components/simulator/OnlineScreen';
import ResultScreen from '@/components/simulator/ResultScreen';
import AdminScreen from '@/components/simulator/AdminScreen';
import ProfileScreen from '@/components/simulator/ProfileScreen';

const HomeScreen: React.FC = () => (
  <div className="flex min-h-screen flex-col">
    <SiteNav />
    <Hero />
    <HowItWorks />
    <ModeGrid />
    <ScenariosPreview />
    <LevelsPreview />
    <ProgressSection />
    <TeamsSection />
    <SiteFooter />
  </div>
);

const Router: React.FC = () => {
  const { screen, sessionKey, scenario } = useSimulator();
  // Ключ пересоздаёт экран переговоров при каждом новом старте — состояние сессии не «протекает».
  const key = `${sessionKey}-${scenario.id}`;

  switch (screen) {
    case 'setup':
      return <SetupScreen />;
    case 'quiz':
      return <QuizScreen key={key} />;
    case 'dialog':
      return <DialogScreen key={key} />;
    case 'phrases':
      return <PhrasesScreen key={key} />;
    case 'online':
      return <OnlineScreen key={key} />;
    case 'result':
      return <ResultScreen />;
    case 'admin':
      return <AdminScreen />;
    case 'profile':
      return <ProfileScreen />;
    default:
      return <HomeScreen />;
  }
};

const Index = () => (
  <SimulatorProvider>
    <Router />
  </SimulatorProvider>
);

export default Index;
