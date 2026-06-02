import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAnimalStore } from '../../../store/useAnimalStore';
import { usePigletStore } from '../../../store/usePigletStore';
import { useSowStore } from '../../../store/useSowStore';
import { useBoarStore } from '../../../store/useBoarStore';
import { useBreedingStore } from '../../../store/useBreedingStore';
import { useFarrowingStore } from '../../../store/useFarrowingStore';
import { useTreatmentStore } from '../../../store/useTreatmentStore';
import { useMedicineStore } from '../../../store/useMedicineStore';
import { useMortalityStore } from '../../../store/useMortalityStore';
import { useSaleStore } from '../../../store/useSaleStore';
import { useSettingsStore } from '../../../store/useSettingsStore';

export function useDashboardData() {
  const { animals, fetchAnimals } = useAnimalStore();
  const { piglets, fetchPiglets } = usePigletStore();
  const { sows, fetchSows } = useSowStore();
  const { boars, fetchBoars } = useBoarStore();
  const { breedings, fetchBreedings } = useBreedingStore();
  const { farrowings, fetchFarrowings } = useFarrowingStore();
  const { treatments, fetchTreatments } = useTreatmentStore();
  const { medicines, fetchMedicines } = useMedicineStore();
  const { mortalities, fetchMortalities } = useMortalityStore();
  const { sales, fetchSales } = useSaleStore();
  const { calculateDate, lifecycle } = useSettingsStore();

  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchAnimals(),
      fetchPiglets(),
      fetchSows(),
      fetchBoars(),
      fetchBreedings(),
      fetchFarrowings(),
      fetchTreatments(),
      fetchMedicines(),
      fetchMortalities(),
      fetchSales()
    ]);
    setLoading(false);
  }, [
    fetchAnimals, fetchPiglets, fetchSows, fetchBoars, 
    fetchBreedings, fetchFarrowings, fetchTreatments, 
    fetchMedicines, fetchMortalities, fetchSales
  ]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // 1. KPI Calculation
  const kpis = useMemo(() => {
    const activeAnimals = animals.filter(a => !['Dead', 'Sold', 'Culled'].includes(a.lifecycleStage));
    const pregnantSows = sows.filter(s => s.status === 'Pregnant' || s.pregnancyStatus === 'Pregnant').length;
    const sowsInHeat = sows.filter(s => ['In Heat', 'Heat'].includes(s.status)).length;
    const breedingReadyBoars = boars.filter(b => b.breedingStatus === 'Breeding Ready').length;
    
    // Litters
    const activeLitters = farrowings.filter(f => f.lactationStatus === 'Nursing' || f.lactationStatus === 'Active').length;
    
    // Piglets
    const nursingPiglets = farrowings.reduce((sum, f) => {
      if (f.lactationStatus === 'Nursing' || f.lactationStatus === 'Active') {
        return sum + (f.pigletsBornAlive || 0) - (f.mortalityDuringLactation || 0);
      }
      return sum;
    }, 0);

    // Weaning Due (Next 7 days)
    const today = new Date();
    const weaningDue = farrowings.filter(f => {
      if (f.lactationStatus === 'Weaned') return false;
      if (f.actualFarrowingDate) {
        const fDate = new Date(f.actualFarrowingDate);
        const wDate = new Date(calculateDate(fDate.toISOString(), 'weaningAge'));
        const diffDays = (wDate - today) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 7;
      }
      return false;
    }).length;

    const underTreatment = activeAnimals.filter(a => a.operationalStatus === 'Under Treatment').length;
    const vaccinationsDue = 0; // Derived from alerts later

    // Mortality this month
    const thisMonth = new Date().getMonth();
    const thisYear = new Date().getFullYear();
    const mortalityThisMonth = mortalities.filter(m => {
      const d = new Date(m.deathDate);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    }).length;

    const soldAnimals = sales.length;

    return {
      totalActive: activeAnimals.length,
      breakdown: {
        growers: activeAnimals.filter(a => a.lifecycleStage === 'Piglet').length,
        sows: activeAnimals.filter(a => a.lifecycleStage === 'Sow').length,
        boars: activeAnimals.filter(a => a.lifecycleStage === 'Boar').length,
        piglets: nursingPiglets
      },
      pregnantSows,
      sowsInHeat,
      breedingReadyBoars,
      activeLitters,
      nursingPiglets,
      weaningDue,
      underTreatment,
      vaccinationsDue,
      mortalityThisMonth,
      soldAnimals,
      growthRate: '+4.2%' // Mocked trend
    };
  }, [animals, sows, boars, farrowings, mortalities, sales, lifecycle]);

  // 2. Alerts Generation
  const alerts = useMemo(() => {
    const list = [];
    const today = new Date();

    // Heat
    sows.forEach(s => {
      if (s.status === 'In Heat') {
        list.push({ type: 'warning', title: 'Sow in Heat', message: `Sow ${s.animalNo} is in heat. Schedule mating soon.`, date: today.toISOString() });
      }
    });

    // Pregnancy Check (21 days)
    breedings.forEach(b => {
      if (b.pregnancyResult === 'Pending' && b.pregnancyCheckDate) {
        const diff = (new Date(b.pregnancyCheckDate) - today) / (1000 * 60 * 60 * 24);
        if (diff <= 3 && diff >= -10) {
          list.push({ type: 'info', title: 'Pregnancy Check', message: `Sow ${b.sowNo} is due for 21-day pregnancy check.`, date: b.pregnancyCheckDate });
        }
      }
      // Farrowing (114 days)
      if (b.pregnancyResult === 'Pregnant Confirmed' && b.expectedFarrowingDate) {
        const diff = (new Date(b.expectedFarrowingDate) - today) / (1000 * 60 * 60 * 24);
        if (diff <= 7 && diff >= -3) {
          list.push({ type: 'primary', title: 'Farrowing Expected', message: `Sow ${b.sowNo} is expected to farrow within ${Math.max(1, Math.round(diff))} days.`, date: b.expectedFarrowingDate });
        }
      }
    });

    // Weaning & Promotion
    farrowings.forEach(f => {
      if (f.lactationStatus !== 'Weaned' && f.actualFarrowingDate) {
        const wDate = new Date(calculateDate(new Date(f.actualFarrowingDate).toISOString(), 'weaningAge'));
        const diff = (wDate - today) / (1000 * 60 * 60 * 24);
        if (diff <= 7 && diff >= -14) {
          list.push({ type: 'success', title: 'Weaning Due', message: `Litter from Sow ${f.sowNo} is ready for weaning.`, date: wDate.toISOString() });
        }
      }
    });

    // Medicine Followups
    treatments.forEach(t => {
      if (t.recoveryStatus !== 'Recovered' && t.followUpDate) {
        const diff = (new Date(t.followUpDate) - today) / (1000 * 60 * 60 * 24);
        if (diff <= 2 && diff >= -7) {
          list.push({ type: 'danger', title: 'Treatment Follow-up', message: `Follow-up required for ${t.animalId} (${t.diagnosis}).`, date: t.followUpDate });
        }
      }
    });

    return list.sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [sows, breedings, farrowings, treatments, lifecycle]);

  // 3. Activity Feed Generation (Synthesized from dates)
  const activityFeed = useMemo(() => {
    const feed = [];
    
    breedings.forEach(b => {
      feed.push({ id: `br_${b._id}`, type: 'Breeding', title: `Breeding recorded for Sow ${b.sowNo} x Boar ${b.boarNo}`, date: b.serviceDate });
    });
    
    farrowings.forEach(f => {
      feed.push({ id: `fw_${f._id}`, type: 'Farrowing', title: `Sow ${f.sowNo} farrowed ${f.pigletsBornAlive} live piglets`, date: f.actualFarrowingDate });
    });
    
    mortalities.forEach(m => {
      feed.push({ id: `mt_${m._id}`, type: 'Mortality', title: `Mortality recorded for ${m.animalId} (${m.causeOfDeath})`, date: m.deathDate });
    });
    
    treatments.forEach(t => {
      feed.push({ id: `tr_${t._id}`, type: 'Treatment', title: `Treatment logged for ${t.animalId} (${t.diagnosis})`, date: t.startDate });
    });
    
    sales.forEach(s => {
      feed.push({ id: `sl_${s._id}`, type: 'Sale', title: `Sale recorded for ${s.animalId} (₹${s.totalAmount})`, date: s.saleDate });
    });

    // Filter valid dates, sort descending, grab top 20
    return feed
      .filter(item => !isNaN(new Date(item.date).getTime()))
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 20);
  }, [breedings, farrowings, mortalities, treatments, sales]);

  return {
    loading,
    kpis,
    alerts,
    activityFeed,
    
    // Raw stores for charts
    breedings,
    growers: piglets,
    mortalities,
    treatments
  };
}
