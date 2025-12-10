import React, { useState, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { MilesEngine } from './components/MilesEngine';
import { XPEngine } from './components/XPEngine';
import { RedemptionCalc } from './components/RedemptionCalc';
import { Analytics } from './components/Analytics';
import { FlightLedger } from './components/FlightLedger';
import { FlightIntake } from './components/FlightIntake';
import { MilesIntake } from './components/MilesIntake';
import { MileageRun } from './components/MileageRun';
import { SettingsModal } from './components/SettingsModal';
import { WelcomeModal } from './components/WelcomeModal';

import {
  ViewState,
  MilesRecord,
  XPRecord,
  RedemptionRecord,
  FlightRecord,
  ManualLedger,
} from './types';

import {
  INITIAL_MILES_DATA,
  INITIAL_XP_DATA,
  INITIAL_REDEMPTIONS,
  INITIAL_FLIGHTS,
  INITIAL_MANUAL_LEDGER,
} from './constants';

import {
  rebuildLedgersFromFlights,
  FlightIntakePayload,
  createFlightRecord,
} from './utils/flight-intake';

import { calculateMultiYearStats } from './utils/xp-logic';

// Sticky state helper
const useStickyState = <T,>(
  key: string,
  defaultValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [value, setValue] = useState<T>(() => {
    try {
      const stickyValue = window.localStorage.getItem(key);
      return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore storage errors
    }
  }, [key, value]);

  return [value, setValue];
};

export default function App() {
  const [view, setView] = useState<ViewState>('dashboard');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);

  const [isDemoMode, setIsDemoMode] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem('skystatus_mode') === 'demo';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      const visited = localStorage.getItem('skystatus_visited');
      if (!visited) {
        setShowWelcome(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, '0')}`;

  const [baseMilesData, setBaseMilesData] = useStickyState<MilesRecord[]>(
    'baseMilesData',
    []
  );

  const [baseXpData, setBaseXpData] = useStickyState<XPRecord[]>(
    'baseXpData',
    []
  );

  const [manualLedger, setManualLedger] = useStickyState<ManualLedger>(
    'manualLedger',
    {}
  );

  const [redemptions, setRedemptions] = useStickyState<RedemptionRecord[]>(
    'redemptions',
    []
  );

  const [flights, setFlights] = useStickyState<FlightRecord[]>(
    'flights',
    []
  );

  const [xpRollover, setXpRollover] = useStickyState<number>(
    'xpRollover',
    0
  );

  const [currentMonth, setCurrentMonth] = useStickyState<string>(
    'currentMonth_V2',
    defaultMonth
  );

  const [targetCPM, setTargetCPM] = useStickyState<number>(
    'targetCPM',
    0.012
  );

  const { miles: milesData, xp: xpData } = useMemo(
    () => rebuildLedgersFromFlights(baseMilesData, baseXpData, flights),
    [baseMilesData, baseXpData, flights]
  );

  const handleFlightsUpdate = (nextFlights: FlightRecord[]) => {
    setFlights(nextFlights);
  };

  const handleFlightIntakeApply = (payloads: FlightIntakePayload[]) => {
    const newRecords = payloads.map(createFlightRecord);
    setFlights(prevFlights => [...prevFlights, ...newRecords]);
  };

  const handleManualLedgerUpdate = (newData: MilesRecord[]) => {
    const sanitizedData = newData.map(record => ({
      ...record,
      miles_flight: 0,
      cost_flight: 0,
    }));
    setBaseMilesData(sanitizedData);
  };

  const markAsVisited = (mode: 'demo' | 'empty') => {
    try {
      localStorage.setItem('skystatus_visited', 'true');
      localStorage.setItem('skystatus_mode', mode);
      setIsDemoMode(mode === 'demo');
    } catch {
      // ignore
    }
    setShowWelcome(false);
  };

  const handleLoadDemo = () => {
    setBaseMilesData(INITIAL_MILES_DATA);
    setBaseXpData(INITIAL_XP_DATA);
    setRedemptions(INITIAL_REDEMPTIONS);
    setFlights(INITIAL_FLIGHTS);
    setXpRollover(103);
    setManualLedger(INITIAL_MANUAL_LEDGER);
    markAsVisited('demo');
  };

  const handleStartEmpty = () => {
    setBaseMilesData([]);
    setBaseXpData([]);
    setRedemptions([]);
    setFlights([]);
    setXpRollover(0);
    setManualLedger({});
    markAsVisited('empty');
  };

  const handleStartOver = () => {
    if (
      !window.confirm(
        'Are you sure you want to start over? This wipes all data.'
      )
    ) {
      return;
    }

    try {
      localStorage.clear();
    } catch (e) {
      console.error(e);
    }

    setBaseMilesData([]);
    setBaseXpData([]);
    setRedemptions([]);
    setFlights([]);
    setXpRollover(0);
    setManualLedger({});
    setIsDemoMode(false);
    setIsSettingsOpen(false);
    setShowWelcome(true);
  };

  const calculateGlobalCPM = () => {
    const earned = milesData.reduce(
      (acc, r) =>
        acc +
        r.miles_subscription +
        r.miles_amex +
        r.miles_flight +
        r.miles_other,
      0
    );
    const cost = milesData.reduce(
      (acc, r) =>
        acc +
        r.cost_subscription +
        r.cost_amex +
        r.cost_flight +
        r.cost_other,
      0
    );
    return earned > 0 ? (cost / earned) * 100 : 0;
  };

  const currentStatus = useMemo(() => {
    const stats = calculateMultiYearStats(
      xpData,
      xpRollover,
      flights,
      manualLedger
    );

    const now = new Date();
    const currentQYear =
      now.getMonth() >= 10 ? now.getFullYear() + 1 : now.getFullYear();
    
    // Use actualStatus (current proven status) not statusEnd (end-of-cycle projection)
    // This affects revenue-based miles calculations which depend on current status
    const cycle = stats[currentQYear];
    const status = cycle?.actualStatus || cycle?.achievedStatus || cycle?.startStatus || 'Explorer';
    return status as 'Explorer' | 'Silver' | 'Gold' | 'Platinum';
  }, [xpData, xpRollover, flights, manualLedger]);

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return (
          <Dashboard
            state={{
              milesData,
              xpData,
              redemptions,
              xpRollover,
              currentMonth,
              flights,
              targetCPM,
              manualLedger,
            }}
            navigateTo={setView}
            onUpdateCurrentMonth={setCurrentMonth}
          />
        );
      case 'addFlight':
        return (
          <div className="space-y-6">
            <FlightIntake
              onApply={handleFlightIntakeApply}
              currentStatus={currentStatus}
            />
            <FlightLedger
              flights={flights}
              onChange={handleFlightsUpdate}
              xpData={xpData}
              currentRollover={xpRollover}
            />
          </div>
        );
      case 'addMiles':
        return (
          <MilesIntake
            milesData={milesData}
            onUpdate={handleManualLedgerUpdate}
            currentMonth={currentMonth}
          />
        );
      case 'miles':
        return (
          <MilesEngine
            data={milesData}
            onUpdate={handleManualLedgerUpdate}
            currentMonth={currentMonth}
            onUpdateCurrentMonth={setCurrentMonth}
            targetCPM={targetCPM}
            onUpdateTargetCPM={setTargetCPM}
            redemptions={redemptions}
          />
        );
      case 'xp':
        return (
          <XPEngine
            data={xpData}
            baseData={baseXpData}
            onUpdate={setBaseXpData}
            rollover={xpRollover}
            onUpdateRollover={setXpRollover}
            flights={flights}
            onUpdateFlights={handleFlightsUpdate}
            manualLedger={manualLedger}
            onUpdateManualLedger={setManualLedger}
          />
        );
      case 'redemption':
        return (
          <RedemptionCalc
            redemptions={redemptions}
            onUpdate={setRedemptions}
            baselineCpm={calculateGlobalCPM()}
            targetCpm={targetCPM}
          />
        );
      case 'analytics':
        return (
          <Analytics
            xpData={xpData}
            rollover={xpRollover}
            redemptions={redemptions}
            milesData={milesData}
            currentMonth={currentMonth}
            targetCPM={targetCPM}
          />
        );
      case 'mileageRun':
        return <MileageRun xpData={xpData} rollover={xpRollover} />;
      default:
        return (
          <Dashboard
            state={{
              milesData,
              xpData,
              redemptions,
              xpRollover,
              currentMonth,
              flights,
              targetCPM,
              manualLedger,
            }}
            navigateTo={setView}
            onUpdateCurrentMonth={setCurrentMonth}
          />
        );
    }
  };

  return (
    <>
      <Layout
        currentView={view}
        onNavigate={setView}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isDemoMode={isDemoMode}
      >
        {renderContent()}
      </Layout>

      <WelcomeModal
        isOpen={showWelcome}
        onLoadDemo={handleLoadDemo}
        onStartEmpty={handleStartEmpty}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        data={{
          baseMilesData,
          baseXpData,
          redemptions,
          flights,
          xpRollover,
          currentMonth,
          targetCPM,
        }}
        setters={{
          setBaseMilesData,
          setBaseXpData,
          setRedemptions,
          setFlights,
          setXpRollover,
          setCurrentMonth,
          setTargetCPM,
        }}
        onReset={handleStartEmpty}
        onLoadDemo={handleLoadDemo}
        onStartOver={handleStartOver}
      />
    </>
  );
}
