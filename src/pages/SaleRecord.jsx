import React, { useEffect, useMemo, useState } from 'react';
import MainLayout from '../components/layout/MainLayout';
import { useSaleStore } from '../store/useSaleStore';
import DataTable from '../components/ui/DataTable';
import StatusBadge from '../components/ui/StatusBadge';
import { TableSkeleton, CardSkeleton } from '../components/ui/LoadingSkeleton';
import Modal from '../components/ui/Modal';
import { FormField, FormGrid, FormSection } from '../components/ui/FormLayout';
import AnimalSelect from '../components/ui/AnimalSelect';
import { DollarSign, Plus, TrendingUp, Clock, CheckCircle, AlertTriangle,
  Trash2
} from 'lucide-react';

export default function SaleRecord() {
  const { sales, loading, fetchSales, recordSale , deleteSaleRecord} = useSaleStore();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    saleDate: new Date().toISOString().split('T')[0],
    animalId: '', animalType: 'Grower', sex: 'Male', weight: '',
    unitPrice: '', buyerName: '', buyerContact: '', challanNumber: '',
    paymentStatus: 'Paid', amountPaid: '', paymentMethod: 'Cash', remarks: ''
  });

  useEffect(() => { fetchSales(); }, [fetchSales]);

  const kpis = useMemo(() => {
    const totalRevenue = sales.reduce((acc, s) => acc + s.totalAmount, 0);
    const paidAmount = sales.reduce((acc, s) => acc + (s.amountPaid || 0), 0);
    const pendingAmount = totalRevenue - paidAmount;
    return {
      totalSales: sales.length,
      totalRevenue,
      paidAmount,
      pendingAmount
    };
  }, [sales]);

  const columns = useMemo(() => [
    {
      header: "Sale ID", accessor: "saleId", sortable: true,
      render: (val) => <span className="font-extrabold text-primary font-mono text-[11px]">{val}</span>
    },
    {
      header: "Date", accessor: "saleDate", sortable: true,
      render: (val) => <span className="text-[11px] text-textSecondary">{val ? new Date(val).toLocaleDateString() : 'N/A'}</span>
    },
    {
      header: "Animal", accessor: "animalId", sortable: true,
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-bold text-textPrimary text-[11px]">{val}</span>
          <span className="text-[10px] text-textSecondary">{row.animalType} · {row.sex}</span>
        </div>
      )
    },
    {
      header: "Weight", accessor: "weight",
      render: (val) => <span className="font-bold text-[11px] text-textPrimary">{val} kg</span>
    },
    {
      header: "Total (₹)", accessor: "totalAmount", sortable: true,
      render: (val) => <span className="font-black text-success text-[12px]">₹{val?.toLocaleString('en-IN')}</span>
    },
    {
      header: "Buyer", accessor: "buyerName",
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-bold text-textPrimary text-[11px]">{val}</span>
          <span className="text-[10px] text-textSecondary">{row.challanNumber ? `CH: ${row.challanNumber}` : 'No Challan'}</span>
        </div>
      )
    },
    { header: "Payment", accessor: "paymentStatus", render: (val) => <StatusBadge status={val} /> },
      {
      header: "Actions",
      accessor: "_id",
      sortable: false,
      render: (val, row) => (
        <div className="flex items-center gap-2">
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              if(window.confirm('Are you sure you want to delete this record?')) {
                deleteSaleRecord(row._id);
              }
            }}
            className="p-1 hover:bg-danger/10 text-danger rounded flex items-center gap-1 transition-colors"
            title="Delete Record"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    },
  ], []);

  const totalAmount = formData.weight && formData.unitPrice
    ? Number(formData.weight) * Number(formData.unitPrice)
    : 0;

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await recordSale({ ...formData, operator: 'System' });
      setIsAddModalOpen(false);
      setFormData({ saleDate: new Date().toISOString().split('T')[0], animalId: '', animalType: 'Grower', sex: 'Male', weight: '', unitPrice: '', buyerName: '', buyerContact: '', challanNumber: '', paymentStatus: 'Paid', amountPaid: '', paymentMethod: 'Cash', remarks: '' });
    } catch (err) { alert(err.message); }
  };

  return (
    <MainLayout>
      <div className="flex flex-col gap-6 max-w-[1600px] mx-auto pb-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-textPrimary uppercase tracking-widest flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-success" /> Sale Register
            </h2>
            <p className="text-xs text-textSecondary mt-1">Animal sales, buyer records, payment tracking, and revenue management.</p>
          </div>
          <button onClick={() => setIsAddModalOpen(true)} className="btn-primary flex items-center gap-2 text-xs py-2 px-4 whitespace-nowrap">
            <Plus className="w-4 h-4" /> Record Sale
          </button>
        </div>

        {loading && sales.length === 0 ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4"><CardSkeleton /><CardSkeleton /><CardSkeleton /><CardSkeleton /></div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Sales', val: kpis.totalSales, display: kpis.totalSales, color: 'primary', Icon: DollarSign },
              { label: 'Total Revenue', val: `₹${(kpis.totalRevenue || 0).toLocaleString('en-IN')}`, display: `₹${(kpis.totalRevenue || 0).toLocaleString('en-IN')}`, color: 'success', Icon: TrendingUp },
              { label: 'Amount Collected', val: `₹${(kpis.paidAmount || 0).toLocaleString('en-IN')}`, display: `₹${(kpis.paidAmount || 0).toLocaleString('en-IN')}`, color: 'blueAccent', Icon: CheckCircle },
              { label: 'Pending Payment', val: `₹${(kpis.pendingAmount || 0).toLocaleString('en-IN')}`, display: `₹${(kpis.pendingAmount || 0).toLocaleString('en-IN')}`, color: 'warning', Icon: Clock },
            ].map(({ label, display, color, Icon }) => (
              <div key={label} className="op-card p-4 flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-textSecondary uppercase tracking-widest font-bold mb-1">{label}</p>
                  <p className={`text-xl font-black text-${color}`}>{display}</p>
                </div>
                <div className={`w-10 h-10 rounded bg-${color}/10 flex items-center justify-center border border-${color}/20`}>
                  <Icon className={`w-5 h-5 text-${color}`} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="op-card border border-borderDark rounded-xl overflow-hidden">
          {loading && sales.length === 0 ? <TableSkeleton rows={5} cols={7} /> : (
            <DataTable columns={columns} data={sales} searchPlaceholder="Search by Animal ID, buyer name..." />
          )}
        </div>
      </div>

      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Record Animal Sale" icon={<DollarSign className="w-5 h-5 text-success" />}>
        <form onSubmit={handleAdd} className="flex flex-col gap-5 p-1">
          <FormSection title="Animal Details">
            <FormGrid cols={2}>
              <FormField label="Animal ID" required id="saleAnimalId">
                <AnimalSelect
                  value={formData.animalId}
                  onChange={val => setFormData({ ...formData, animalId: val })}
                  onSelectFull={(animal) => {
                    setFormData(prev => ({
                      ...prev,
                      animalId: animal.animalNo,
                      animalType: animal.lifecycleStage || prev.animalType,
                      sex: animal.sex || prev.sex,
                      weight: animal.currentWeight || prev.weight
                    }));
                  }}
                  filterActive={true}
                  required
                />
              </FormField>
              <FormField label="Animal Type" required id="saleAnimalType">
                <select id="saleAnimalType" className="input-field" value={formData.animalType} onChange={e => setFormData({ ...formData, animalType: e.target.value })}>
                  {['Grower', 'Sow', 'Boar', 'Piglet'].map(t => <option key={t}>{t}</option>)}
                </select>
              </FormField>
            </FormGrid>
            <FormGrid cols={3}>
              <FormField label="Sex" required id="saleSex">
                <select id="saleSex" className="input-field" value={formData.sex} onChange={e => setFormData({ ...formData, sex: e.target.value })}>
                  {['Male', 'Female', 'Unknown'].map(s => <option key={s}>{s}</option>)}
                </select>
              </FormField>
              <FormField label="Weight (kg)" required id="saleWeight">
                <input id="saleWeight" type="number" step="0.1" min="0" required className="input-field" placeholder="0.0" value={formData.weight} onChange={e => setFormData({ ...formData, weight: e.target.value })} />
              </FormField>
              <FormField label="Unit Price (₹/kg)" required id="saleUnitPrice">
                <input id="saleUnitPrice" type="number" min="0" required className="input-field" placeholder="0" value={formData.unitPrice} onChange={e => setFormData({ ...formData, unitPrice: e.target.value })} />
              </FormField>
            </FormGrid>
            {totalAmount > 0 && (
              <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                <p className="text-xs font-bold text-textSecondary uppercase tracking-widest">Calculated Total</p>
                <p className="text-xl font-black text-success mt-1">₹{totalAmount.toLocaleString('en-IN')}</p>
              </div>
            )}
          </FormSection>

          <FormSection title="Buyer Details">
            <FormGrid cols={2}>
              <FormField label="Buyer Name" required id="buyerName">
                <input id="buyerName" type="text" required className="input-field" placeholder="Buyer name" value={formData.buyerName} onChange={e => setFormData({ ...formData, buyerName: e.target.value })} />
              </FormField>
              <FormField label="Challan Number" id="challanNumber">
                <input id="challanNumber" type="text" className="input-field font-mono" placeholder="CH-2026-XXX" value={formData.challanNumber} onChange={e => setFormData({ ...formData, challanNumber: e.target.value.toUpperCase() })} />
              </FormField>
            </FormGrid>
          </FormSection>

          <FormSection title="Payment">
            <FormGrid cols={3}>
              <FormField label="Sale Date" required id="saleDate">
                <input id="saleDate" type="date" required className="input-field" value={formData.saleDate} onChange={e => setFormData({ ...formData, saleDate: e.target.value })} />
              </FormField>
              <FormField label="Payment Status" required id="paymentStatus">
                <select id="paymentStatus" className="input-field" value={formData.paymentStatus} onChange={e => setFormData({ ...formData, paymentStatus: e.target.value })}>
                  {['Paid', 'Pending', 'Partial'].map(s => <option key={s}>{s}</option>)}
                </select>
              </FormField>
              <FormField label="Payment Method" id="paymentMethod">
                <select id="paymentMethod" className="input-field" value={formData.paymentMethod} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}>
                  {['Cash', 'UPI', 'Bank Transfer', 'Credit'].map(m => <option key={m}>{m}</option>)}
                </select>
              </FormField>
            </FormGrid>
          </FormSection>

          <div className="flex justify-end gap-3 pt-4 border-t border-borderDark">
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-xs font-bold text-textSecondary hover:text-textPrimary transition-colors">Cancel</button>
            <button type="submit" className="btn-primary py-2 px-6">Record Sale</button>
          </div>
        </form>
      </Modal>
    </MainLayout>
  );
}
