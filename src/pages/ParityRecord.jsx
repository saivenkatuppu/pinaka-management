import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { useFarrowingStore } from '../store/useFarrowingStore';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import { TableSkeleton } from '../components/ui/LoadingSkeleton';
import { Eye, Syringe, Baby, Scale, ArrowUpRight,
  Trash2
} from 'lucide-react';

export default function ParityRecord() {
  const navigate = useNavigate();

  const { farrowings, loading, fetchFarrowings , deleteFarrowingRecord} = useFarrowingStore();

  useEffect(() => {
    fetchFarrowings();
  }, [fetchFarrowings]);

  // KPIs
  const kpis = useMemo(() => {
    const activeLitters = farrowings.filter(f => f.lactationStatus === 'Lactating').length;

    const totalPigletsNursing = farrowings
      .filter(f => f.lactationStatus === 'Lactating')
      .reduce((acc, f) => acc + ((f.piglets || []).filter(p => p.status === 'Nursing').length), 0);

    const totalVaccines = farrowings.reduce(
      (acc, f) => acc + ((f.healthLog || []).filter(h => h.type === 'Vaccine').length), 0
    );

    const readyForGrower = farrowings.reduce((acc, f) => {
      const count = (f.piglets || []).filter(p => {
        if (p.status !== 'Nursing') return false;
        const ageMs = Date.now() - new Date(p.dob || f.actualFarrowingDate).getTime();
        const ageDays = ageMs / (1000 * 60 * 60 * 24);
        return ageDays >= 60;
      }).length;
      return acc + count;
    }, 0);

    return { activeLitters, totalPigletsNursing, totalVaccines, readyForGrower };
  }, [farrowings]);

  const columns = [
    {
      header: 'Litter ID',
      accessor: '_id',
      sortable: true,
      render: (val, row) => (
        <span
          className="font-extrabold text-primary select-all cursor-pointer hover:underline font-mono"
          onClick={() => navigate(`/parity/${row._id}`)}
        >
          {val ? val.replace('far_', 'LIT-').toUpperCase() : 'UNKNOWN'}
        </span>
      )
    },
    {
      header: 'Mother (Sow)',
      accessor: 'sowNo',
      sortable: true,
      render: (val) => <span className="font-bold font-mono text-textPrimary">{val}</span>
    },
    {
      header: 'Father (Boar)',
      accessor: 'boarNo',
      sortable: true,
      render: (val) => <span className="font-semibold text-textSecondary">{val}</span>
    },
    {
      header: 'Born Alive',
      accessor: 'pigletsBornAlive',
      sortable: true,
      render: (val) => (
        <span className="font-black text-success flex items-center gap-1">
          <Baby className="w-3.5 h-3.5" /> {val}
        </span>
      )
    },
    {
      header: 'Stillborn',
      accessor: 'stillbornPiglets',
      sortable: true,
      render: (val) => (
        <span className={`font-bold ${val > 0 ? 'text-danger' : 'text-textSecondary'}`}>
          {val}
        </span>
      )
    },
    {
      header: 'Nursing Now',
      accessor: 'piglets',
      sortable: false,
      render: (piglets) => {
        const alive = (piglets || []).filter(p => p.status === 'Nursing').length;
        return (
          <span className="font-black text-info flex items-center gap-1">
            <Baby className="w-3.5 h-3.5" /> {alive}
          </span>
        );
      }
    },
    {
      header: 'Ready for Grower',
      accessor: 'piglets',
      sortable: false,
      render: (piglets, row) => {
        const count = (piglets || []).filter(p => {
          if (p.status !== 'Nursing') return false;
          const ageMs = Date.now() - new Date(p.dob || row.actualFarrowingDate).getTime();
          return ageMs / (1000 * 60 * 60 * 24) >= 60;
        }).length;
        return count > 0 ? (
          <span className="font-black text-warning flex items-center gap-1">
            <ArrowUpRight className="w-3.5 h-3.5" /> {count} Ready
          </span>
        ) : (
          <span className="text-textSecondary text-[10px]">—</span>
        );
      }
    },
    {
      header: 'Vaccines',
      accessor: 'healthLog',
      sortable: false,
      render: (logs) => {
        const vax = (logs || []).filter(l => l.type === 'Vaccine').length;
        return (
          <span className="font-bold text-warning flex items-center gap-1">
            <Syringe className="w-3.5 h-3.5" /> {vax} Doses
          </span>
        );
      }
    },
    {
      header: 'Expected Wean',
      accessor: 'expectedWeaningDate',
      sortable: true,
      render: (val) => {
        if (!val) return <span className="text-textSecondary">—</span>;
        const d = new Date(val);
        const isOverdue = d < new Date() && val;
        return (
          <span className={`font-mono text-[11px] ${isOverdue ? 'text-danger font-bold' : 'text-info'}`}>
            {d.toLocaleDateString()}
          </span>
        );
      }
    },
    {
      header: 'Status',
      accessor: 'lactationStatus',
      sortable: true,
      render: (val) => <StatusBadge status={val} />
    },
    {
      header: 'Actions',
      accessor: '_id',
      sortable: false,
      render: (val, row) => {
        const piglets = row.piglets || [];
        const readyCount = piglets.filter(p => {
          if (p.status !== 'Nursing') return false;
          const ageMs = Date.now() - new Date(p.dob || row.actualFarrowingDate).getTime();
          return ageMs / (1000 * 60 * 60 * 24) >= 60;
        }).length;
        const isWeaned = row.lactationStatus === 'Weaned';

        return (
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(`/parity/${row._id}`)}
              className="p-1 hover:bg-cardBg hover:text-primary rounded text-textSecondary flex items-center gap-1"
              title="Manage Piglets"
            >
              <Scale className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Manage</span>
            </button>
            <button
              onClick={() => navigate(`/parity/${row._id}`)}
              disabled={readyCount === 0 && !isWeaned}
              className={`p-1 border rounded flex items-center gap-1 transition-colors ${
                readyCount > 0 || isWeaned
                  ? 'bg-warning/10 hover:bg-warning/20 border-warning/40 text-warning cursor-pointer'
                  : 'bg-sidebar border-borderDark text-textSecondary/40 opacity-40 cursor-not-allowed'
              }`}
              title={readyCount > 0 || isWeaned ? "Promote piglets to Grower" : "No piglets ready for grower (litter must be weaned or age >= 60 days)"}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Promote</span>
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <MainLayout>
      <div className="flex flex-col gap-5 w-full">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-borderDark/60 pb-3.5 no-print">
          <div>
            <h2 className="text-base font-black tracking-wide text-textPrimary uppercase">
              PARITY &amp; LITTER MANAGEMENT
            </h2>
            <p className="text-[10px] text-textSecondary uppercase tracking-widest mt-1">
              Track piglet IDs, weights, vaccinations, and lifecycle promotions during the 60-day lactation phase.
            </p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 no-print">
          <div className="bg-cardBg border border-borderDark rounded-lg p-3 flex flex-col justify-between">
            <span className="text-[9px] text-textSecondary uppercase tracking-widest font-black">Active Litters</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <h3 className="text-lg font-black text-primary">{kpis.activeLitters}</h3>
              <span className="text-[9px] text-textSecondary uppercase">Sows Nursing</span>
            </div>
          </div>
          <div className="bg-cardBg border border-borderDark rounded-lg p-3 flex flex-col justify-between">
            <span className="text-[9px] text-textSecondary uppercase tracking-widest font-black">Total Nursing</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <h3 className="text-lg font-black text-success animate-pulse">{kpis.totalPigletsNursing}</h3>
              <span className="text-[9px] text-textSecondary uppercase">Piglets</span>
            </div>
          </div>
          <div className="bg-cardBg border border-borderDark rounded-lg p-3 flex flex-col justify-between">
            <span className="text-[9px] text-textSecondary uppercase tracking-widest font-black">Ready for Grower</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <h3 className={`text-lg font-black ${kpis.readyForGrower > 0 ? 'text-warning' : 'text-textSecondary'}`}>
                {kpis.readyForGrower}
              </h3>
              <span className="text-[9px] text-textSecondary uppercase">≥60 Days Old</span>
            </div>
          </div>
          <div className="bg-cardBg border border-borderDark rounded-lg p-3 flex flex-col justify-between">
            <span className="text-[9px] text-textSecondary uppercase tracking-widest font-black">Litter Vaccines</span>
            <div className="flex items-baseline gap-1.5 mt-1.5">
              <h3 className="text-lg font-black text-warning">{kpis.totalVaccines}</h3>
              <span className="text-[9px] text-textSecondary uppercase">Total Doses</span>
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <TableSkeleton rows={7} cols={11} />
        ) : (
          <DataTable
            columns={columns}
            data={farrowings}
            searchPlaceholder="Search by Litter ID, Sow No, Boar No..."
          />
        )}

      </div>
    </MainLayout>
  );
}
