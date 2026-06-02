import { create } from 'zustand';
import { useAnimalStore } from './useAnimalStore';

const MOCK_SALES = [
  {
    _id: "sale_1",
    saleId: "SL-001",
    saleDate: "2026-05-15T00:00:00.000Z",
    animalId: "G-101-0001-3",
    animalType: "Grower",
    sex: "Male",
    weight: 95.5,
    unitPrice: 250,
    totalAmount: 23875,
    buyerName: "Ravi Shankar Farms",
    buyerContact: "9876543210",
    challanNumber: "CH-2026-005",
    paymentStatus: "Paid",
    amountPaid: 23875,
    paymentMethod: "UPI",
    remarks: "Bulk sale to local farm.",
    operator: "Admin",
    createdAt: "2026-05-15T10:00:00.000Z",
    isDeleted: false
  }
];

const loadLocalSales = () => {
  const stored = localStorage.getItem('pinaka_sales');
  if (stored) {
    try { return JSON.parse(stored).filter(s => !s.isDeleted); }
    catch (e) { console.error("Decode failure:", e); }
  }
  localStorage.setItem('pinaka_sales', JSON.stringify(MOCK_SALES));
  return MOCK_SALES;
};

const saveLocalSales = (list) => localStorage.setItem('pinaka_sales', JSON.stringify(list));

export const useSaleStore = create((set, get) => ({
  sales: [],
  loading: false,
  error: null,

  fetchSales: async () => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalSales();
      set({ sales: list, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  recordSale: async (data) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalSales();
      const totalAmount = Number(data.weight) * Number(data.unitPrice);
      const newRecord = {
        _id: `sale_${Date.now()}`,
        saleId: `SL-${Date.now().toString().slice(-4)}`,
        ...data,
        totalAmount,
        amountPaid: data.paymentStatus === 'Paid' ? totalAmount : Number(data.amountPaid || 0),
        createdAt: new Date().toISOString(),
        isDeleted: false
      };

      const updatedList = [newRecord, ...list];
      saveLocalSales(updatedList);

      // Sync: Mark animal as Sold in Animal Store
      const animalStore = useAnimalStore.getState();
      const allAnimals = animalStore.animals;
      const target = allAnimals.find(a => a.animalNo === data.animalId);
      if (target && animalStore.updateAnimal) {
        await animalStore.updateAnimal(target._id, {
          lifecycleStage: 'Sold',
          operationalStatus: 'Active'
        });
      }

      // Sync with Sow Store
      try {
        const { useSowStore } = await import('./useSowStore');
        const sowStore = useSowStore.getState();
        const targetSow = sowStore.sows.find(s => s.animalNo === data.animalId);
        if (targetSow) {
          const sowsList = JSON.parse(localStorage.getItem('pinaka_sows') || '[]');
          const updatedSows = sowsList.map(s => s._id === targetSow._id ? { ...s, status: 'Sold', pregnancyStatus: 'Not Pregnant' } : s);
          localStorage.setItem('pinaka_sows', JSON.stringify(updatedSows));
          await sowStore.fetchSows();
        }
      } catch (err) {
        console.error("Sale Sow sync failed:", err);
      }

      // Sync with Boar Store
      try {
        const { useBoarStore } = await import('./useBoarStore');
        const boarStore = useBoarStore.getState();
        const targetBoar = boarStore.boars.find(b => b.animalNo === data.animalId);
        if (targetBoar) {
          const boarsList = JSON.parse(localStorage.getItem('pinaka_boars') || '[]');
          const updatedBoars = boarsList.map(b => b._id === targetBoar._id ? { ...b, status: 'Sold', breedingStatus: 'Inactive' } : b);
          localStorage.setItem('pinaka_boars', JSON.stringify(updatedBoars));
          await boarStore.fetchBoars();
        }
      } catch (err) {
        console.error("Sale Boar sync failed:", err);
      }

      // Sync with Piglet Store
      try {
        const { usePigletStore } = await import('./usePigletStore');
        const pigletStore = usePigletStore.getState();
        const targetPiglet = pigletStore.piglets.find(g => g.animalNo === data.animalId);
        if (targetPiglet) {
          const pigletsList = JSON.parse(localStorage.getItem('pinaka_piglets') || '[]');
          const updatedPiglets = pigletsList.map(g => g._id === targetPiglet._id ? { ...g, status: 'Sold' } : g);
          localStorage.setItem('pinaka_piglets', JSON.stringify(updatedPiglets));
          await pigletStore.fetchPiglets();
        }
      } catch (err) {
        console.error("Sale Piglet sync failed:", err);
      }

      set({ sales: updatedList, loading: false });
      return newRecord;
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  },

  updatePaymentStatus: async (id, paymentStatus, amountPaid) => {
    set({ loading: true, error: null });
    try {
      const list = loadLocalSales();
      const updatedList = list.map(s =>
        s._id === id ? { ...s, paymentStatus, amountPaid: Number(amountPaid) } : s
      );
      saveLocalSales(updatedList);
      set({ sales: updatedList, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
      throw err;
    }
  }
}));
