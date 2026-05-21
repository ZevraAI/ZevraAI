import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle, Check, ChevronDown, Clock, Download, Eye, EyeOff,
  Filter, Hash, Layers, Lock, Pencil, Plus, RefreshCw, Search, Shield,
  ShieldCheck, Trash2, X, Zap,
} from 'lucide-react';
import { api } from '../api.js';

// ── constants ─────────────────────────────────────────────────────────────────

const MASK_TYPES = [
  { value: 'EXCLUDE',  label: 'Exclude',  desc: 'Remove column from results entirely', icon: EyeOff },
  { value: 'HASH',     label: 'Hash',     desc: 'Replace with MD5 hash (anonymised but deterministic)', icon: Hash },
  { value: 'PARTIAL',  label: 'Partial',  desc: 'Show first N characters followed by ****', icon: Eye },
  { value: 'CONSTANT', label: 'Constant', desc: 'Replace with a fixed string (e.g. REDACTED)', icon: Lock },
];

const RULE_TYPES = [
  { value: 'REQUIRE_DATE_FILTER',   label: 'Require date filter',    desc: 'Query must filter on a date column' },
  { value: 'REQUIRE_COLUMN_FILTER', label: 'Require column filter',  desc: 'Query must filter on a specific column' },
  { value: 'REQUIRE_LIMIT',         label: 'Require LIMIT',          desc: 'Query must have a LIMIT clause' },
  { value: 'BLOCK_FULL_SCAN',       label: 'Block full scan',        desc: 'Reject any query without a WHERE clause' },
];

const ENFORCEMENT = [
  { value: 'BLOCK',          label: 'Block',         desc: 'Reject the query' },
  { value: 'WARN',           label: 'Warn',          desc: 'Allow but log the violation' },
  { value: 'AUTO_REMEDIATE', label: 'Auto-remediate', desc: 'Rewrite the SQL to fix the violation' },
];

const EVENT_TYPES = ['QUERY_EXECUTED', 'COLUMN_MASKED', 'RLS_APPLIED', 'CONTRACT_VIOLATED', 'ACCESS_DENIED'];

const EVENT_COLORS = {
  QUERY_EXECUTED:    'bg-blue-50 text-blue-700',
  COLUMN_MASKED:     'bg-amber-50 text-amber-700',
  RLS_APPLIED:       'bg-violet-50 text-violet-700',
  CONTRACT_VIOLATED: 'bg-orange-50 text-orange-700',
  ACCESS_DENIED:     'bg-red-50 text-red-700',
};

// ── small helpers ─────────────────────────────────────────────────────────────

const Badge = ({ text, color = 'bg-gray-100 text-gray-600' }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${color}`}>
    {text}
  </span>
);

const EmptyState = ({ icon: Icon, title, body }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
      <Icon size={22} className="text-gray-400" />
    </div>
    <p className="text-[14px] font-semibold text-gray-700 mb-1">{title}</p>
    <p className="text-[13px] text-gray-400 max-w-xs">{body}</p>
  </div>
);

const SectionCard = ({ children }) => (
  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
    {children}
  </div>
);

const TableHead = ({ cols }) => (
  <thead>
    <tr className="bg-gray-50 border-b border-gray-100">
      {cols.map(c => (
        <th key={c} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          {c}
        </th>
      ))}
    </tr>
  </thead>
);

function formatSql(sql) {
  if (!sql) return '—';
  const s = sql.length > 120 ? sql.slice(0, 120) + '…' : sql;
  return <code className="text-[11px] font-mono text-gray-600 break-all">{s}</code>;
}

function timeAgo(iso) {
  if (!iso) return '';
  const d = typeof iso === 'string' ? new Date(iso) : new Date(iso * 1000);
  const diff = Date.now() - d.getTime();
  if (diff < 60000)   return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ── modal ─────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children, wide = false }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4"
         onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden w-full ${wide ? 'max-w-2xl' : 'max-w-lg'}`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-[15px] font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

const inputCls = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-all';
const labelCls = 'block text-[11.5px] font-semibold text-gray-500 uppercase tracking-wide mb-1.5';
const btnPrimary = 'inline-flex items-center gap-2 px-4 py-2.5 bg-[#0C5847] hover:bg-[#084B3D] text-white text-[13px] font-semibold rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed';
const btnGhost = 'inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 text-gray-700 text-[13px] font-semibold rounded-xl hover:bg-gray-50 transition-all';

// ── shared mask form fields (used by both add and edit modals) ────────────────
function MaskFormFields({ form, setForm }) {
  return (
    <>
      <div>
        <label className={labelCls}>Mask type *</label>
        <div className="grid grid-cols-2 gap-2">
          {MASK_TYPES.map(m => (
            <button key={m.value} type="button" onClick={() => setForm(f => ({ ...f, maskType: m.value }))}
              className={`p-3 rounded-xl border text-left transition-all ${form.maskType === m.value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <p className={`text-[13px] font-semibold ${form.maskType === m.value ? 'text-emerald-800' : 'text-gray-700'}`}>{m.label}</p>
              <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">{m.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {form.maskType === 'EXCLUDE' && (
        <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle size={15} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-[13px] font-semibold text-red-800">Column will be completely removed</p>
            <p className="text-[12px] text-red-600 mt-0.5 leading-relaxed">
              This column will not appear in any query results — not even as a null value.
              Use <strong>Hash</strong> or <strong>Constant</strong> if you need it present but anonymised.
            </p>
          </div>
        </div>
      )}

      {form.maskType === 'PARTIAL' && (
        <div>
          <label className={labelCls}>Characters to show</label>
          <input type="number" className={inputCls} min={1} max={20} value={form.partialChars}
            onChange={e => setForm(f => ({ ...f, partialChars: e.target.value }))} />
        </div>
      )}

      {form.maskType === 'CONSTANT' && (
        <div>
          <label className={labelCls}>Replacement value</label>
          <input className={inputCls} placeholder="REDACTED" value={form.constantValue}
            onChange={e => setForm(f => ({ ...f, constantValue: e.target.value }))} />
        </div>
      )}

      <div>
        <label className={labelCls}>Exempt roles <span className="normal-case font-normal text-gray-400">(comma-separated, blank = no exemptions)</span></label>
        <input className={inputCls} placeholder="ADMIN, DATA_ANALYST" value={form.exemptRoles}
          onChange={e => setForm(f => ({ ...f, exemptRoles: e.target.value }))} />
      </div>
    </>
  );
}

// ── Tab: Column Policies ──────────────────────────────────────────────────────

const BLANK_FORM = { objectKey: '', columnName: '', maskType: 'EXCLUDE', constantValue: '', partialChars: 3, exemptRoles: '' };

function ColumnPoliciesTab() {
  const [policies,  setPolicies]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showAdd,   setShowAdd]   = useState(false);
  const [editPolicy,setEditPolicy]= useState(null);   // policy object being edited
  const [form,      setForm]      = useState(BLANK_FORM);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setPolicies(await api.governance.columnPolicies.list()); }
    catch { setPolicies([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const formToBody = () => ({
    maskType:      form.maskType,
    constantValue: form.constantValue || null,
    partialChars:  parseInt(form.partialChars) || 3,
    exemptRoles:   form.exemptRoles ? form.exemptRoles.split(',').map(r => r.trim()).filter(Boolean) : [],
  });

  const saveNew = async () => {
    setSaving(true); setError('');
    try {
      await api.governance.columnPolicies.create({ objectKey: form.objectKey, columnName: form.columnName, ...formToBody() });
      setShowAdd(false); setForm(BLANK_FORM); load();
    } catch (e) { setError(e.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const saveEdit = async () => {
    setSaving(true); setError('');
    try {
      await api.governance.columnPolicies.update(editPolicy.policy_key, formToBody());
      setEditPolicy(null); setForm(BLANK_FORM); load();
    } catch (e) { setError(e.message || 'Update failed'); }
    finally { setSaving(false); }
  };

  const openEdit = p => {
    setEditPolicy(p);
    setForm({
      objectKey:     p.object_key    || '',
      columnName:    p.column_name   || '',
      maskType:      p.mask_type     || 'EXCLUDE',
      constantValue: p.constant_value || '',
      partialChars:  p.partial_chars  ?? 3,
      exemptRoles:   (p.exempt_roles || []).join(', '),
    });
    setError('');
  };

  const remove = async key => {
    if (!window.confirm('Delete this column policy?')) return;
    await api.governance.columnPolicies.delete(key);
    load();
  };

  const maskColor = t =>
    t === 'EXCLUDE'  ? 'bg-red-50 text-red-700'
  : t === 'HASH'     ? 'bg-blue-50 text-blue-700'
  : t === 'PARTIAL'  ? 'bg-amber-50 text-amber-700'
  : 'bg-gray-100 text-gray-600';

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[14px] font-semibold text-gray-800">Column Masking Policies</p>
          <p className="text-[12.5px] text-gray-400 mt-0.5">Control which columns are hidden, hashed, or redacted per data object.</p>
        </div>
        <button onClick={() => { setForm(BLANK_FORM); setError(''); setShowAdd(true); }} className={btnPrimary}>
          <Plus size={14} /> Add Policy
        </button>
      </div>

      <SectionCard>
        {loading ? (
          <div className="py-12 text-center text-[13px] text-gray-400">Loading…</div>
        ) : policies.length === 0 ? (
          <EmptyState icon={EyeOff} title="No column policies yet"
            body="Add a policy to hide, hash, or redact sensitive columns from query results." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <TableHead cols={['Object', 'Column', 'Mask type', 'Exempt roles', 'Added by', '']} />
              <tbody>
                {policies.map(p => (
                  <tr key={p.policy_key} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-[13px] font-mono text-gray-700">{p.object_key}</td>
                    <td className="px-4 py-3 text-[13px] font-mono font-semibold text-gray-900">{p.column_name}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Badge text={p.mask_type} color={maskColor(p.mask_type)} />
                        {p.mask_type === 'EXCLUDE' && (
                          <span title="Column completely removed from results">
                            <AlertTriangle size={12} className="text-red-400" />
                          </span>
                        )}
                        {p.mask_type === 'PARTIAL'  && <span className="text-[11px] text-gray-400">{p.partial_chars} chars</span>}
                        {p.mask_type === 'CONSTANT' && p.constant_value && <span className="text-[11px] text-gray-400">→ "{p.constant_value}"</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-500">
                      {p.exempt_roles?.length > 0 ? p.exempt_roles.join(', ') : <span className="text-gray-300">None</span>}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-400">{p.created_by}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => openEdit(p)}
                          title="Edit mask settings"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
                          <Pencil size={12} />
                        </button>
                        <button onClick={() => remove(p.policy_key)}
                          title="Delete policy"
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* ── Add modal ── */}
      {showAdd && (
        <Modal title="Add Column Policy" onClose={() => setShowAdd(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Data object key *</label>
                <input className={inputCls} placeholder="obj-orders" value={form.objectKey}
                  onChange={e => setForm(f => ({ ...f, objectKey: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Column name *</label>
                <input className={inputCls} placeholder="email" value={form.columnName}
                  onChange={e => setForm(f => ({ ...f, columnName: e.target.value }))} />
              </div>
            </div>
            <MaskFormFields form={form} setForm={setForm} />
            {error && <p className="text-[12px] text-red-500">{error}</p>}
            <div className="flex gap-2.5 pt-1">
              <button className={btnGhost} onClick={() => setShowAdd(false)}>Cancel</button>
              <button className={btnPrimary} disabled={saving || !form.objectKey || !form.columnName} onClick={saveNew}>
                {saving ? 'Saving…' : 'Save Policy'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Edit modal ── */}
      {editPolicy && (
        <Modal title="Edit Column Policy" onClose={() => setEditPolicy(null)}>
          <div className="space-y-4">
            {/* Object + column are read-only — they identify the policy */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Data object key</label>
                <div className="h-9 rounded-xl border border-gray-100 bg-gray-50 px-3 flex items-center text-[13px] text-gray-500 font-mono">
                  {editPolicy.object_key}
                </div>
              </div>
              <div>
                <label className={labelCls}>Column name</label>
                <div className="h-9 rounded-xl border border-gray-100 bg-gray-50 px-3 flex items-center text-[13px] text-gray-800 font-mono font-semibold">
                  {editPolicy.column_name}
                </div>
              </div>
            </div>
            <MaskFormFields form={form} setForm={setForm} />
            {error && <p className="text-[12px] text-red-500">{error}</p>}
            <div className="flex gap-2.5 pt-1">
              <button className={btnGhost} onClick={() => setEditPolicy(null)}>Cancel</button>
              <button className={btnPrimary} disabled={saving} onClick={saveEdit}>
                {saving ? 'Saving…' : 'Update Policy'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Tab: Row Filters ──────────────────────────────────────────────────────────

function RowFiltersTab() {
  const [policies, setPolicies] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showAdd,  setShowAdd]  = useState(false);
  const [form,     setForm]     = useState({ policyName: '', objectKey: '', filterTemplate: '', appliesToRoles: '' });
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setPolicies(await api.governance.rlsPolicies.list()); }
    catch { setPolicies([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true); setError('');
    try {
      await api.governance.rlsPolicies.create({
        ...form,
        appliesToRoles: form.appliesToRoles ? form.appliesToRoles.split(',').map(r => r.trim()).filter(Boolean) : [],
      });
      setShowAdd(false);
      setForm({ policyName: '', objectKey: '', filterTemplate: '', appliesToRoles: '' });
      load();
    } catch (e) { setError(e.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const toggle = async (key, active) => {
    await api.governance.rlsPolicies.setActive(key, !active);
    load();
  };

  const remove = async key => {
    if (!window.confirm('Delete this row filter?')) return;
    await api.governance.rlsPolicies.delete(key);
    load();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[14px] font-semibold text-gray-800">Row-Level Security Policies</p>
          <p className="text-[12.5px] text-gray-400 mt-0.5">Automatically append WHERE conditions so users only see their data.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className={btnPrimary}>
          <Plus size={14} /> Add Filter
        </button>
      </div>

      <SectionCard>
        {loading ? (
          <div className="py-12 text-center text-[13px] text-gray-400">Loading…</div>
        ) : policies.length === 0 ? (
          <EmptyState icon={Filter} title="No row filters yet"
            body="Add a policy to restrict which rows users can query based on their attributes (region, department, etc.)." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <TableHead cols={['Policy name', 'Object', 'Filter template', 'Applies to', 'Status', '']} />
              <tbody>
                {policies.map(p => (
                  <tr key={p.policy_key} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-[13px] font-semibold text-gray-800">{p.policy_name}</td>
                    <td className="px-4 py-3 text-[13px] font-mono text-gray-600">{p.object_key}</td>
                    <td className="px-4 py-3 max-w-xs">
                      <code className="text-[11.5px] font-mono text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded">{p.filter_template}</code>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-500">
                      {p.applies_to_roles?.length > 0 ? p.applies_to_roles.join(', ') : <span className="text-gray-400 font-medium">All roles</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggle(p.policy_key, p.is_active)}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${p.is_active ? 'bg-emerald-500' : 'bg-gray-200'}`}>
                        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${p.is_active ? 'translate-x-4' : 'translate-x-0.5'}`} />
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => remove(p.policy_key)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {showAdd && (
        <Modal title="Add Row Filter" onClose={() => setShowAdd(false)}>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Policy name *</label>
              <input className={inputCls} placeholder="North Region Filter" value={form.policyName}
                onChange={e => setForm(f => ({ ...f, policyName: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Data object key *</label>
              <input className={inputCls} placeholder="obj-orders" value={form.objectKey}
                onChange={e => setForm(f => ({ ...f, objectKey: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Filter template *</label>
              <input className={inputCls} placeholder="region_code = {user.region}" value={form.filterTemplate}
                onChange={e => setForm(f => ({ ...f, filterTemplate: e.target.value }))} />
              <p className="mt-1.5 text-[11.5px] text-gray-400 leading-relaxed">
                Use <code className="bg-gray-100 px-1 rounded">{'{user.email}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{user.role}'}</code>, or any attribute key like <code className="bg-gray-100 px-1 rounded">{'{user.region}'}</code>
              </p>
            </div>
            <div>
              <label className={labelCls}>Applies to roles <span className="normal-case font-normal text-gray-400">(blank = all roles)</span></label>
              <input className={inputCls} placeholder="REGIONAL_MANAGER, ANALYST" value={form.appliesToRoles}
                onChange={e => setForm(f => ({ ...f, appliesToRoles: e.target.value }))} />
            </div>
            {error && <p className="text-[12px] text-red-500">{error}</p>}
            <div className="flex gap-2.5 pt-1">
              <button className={btnGhost} onClick={() => setShowAdd(false)}>Cancel</button>
              <button className={btnPrimary} disabled={saving || !form.policyName || !form.objectKey || !form.filterTemplate} onClick={save}>
                {saving ? 'Saving…' : 'Save Filter'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Tab: Data Contracts ───────────────────────────────────────────────────────

function ContractsTab() {
  const [contracts, setContracts] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [showAdd,   setShowAdd]   = useState(false);
  const [form,      setForm]      = useState({ contractName: '', objectKey: '', ruleType: 'BLOCK_FULL_SCAN', enforcement: 'BLOCK', ruleConfig: {} });
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState('');
  // Extra config fields per rule type
  const [cfgColumns,     setCfgColumns]     = useState('');
  const [cfgColumn,      setCfgColumn]      = useState('');
  const [cfgMaxRows,     setCfgMaxRows]     = useState('10000');
  const [cfgMaxDays,     setCfgMaxDays]     = useState('90');

  const load = useCallback(async () => {
    setLoading(true);
    try { setContracts(await api.governance.contracts.list()); }
    catch { setContracts([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const buildRuleConfig = () => {
    switch (form.ruleType) {
      case 'REQUIRE_DATE_FILTER':   return { columns: cfgColumns.split(',').map(c => c.trim()).filter(Boolean), max_range_days: parseInt(cfgMaxDays) || 90 };
      case 'REQUIRE_COLUMN_FILTER': return { column: cfgColumn.trim() };
      case 'REQUIRE_LIMIT':         return { max_rows: parseInt(cfgMaxRows) || 10000 };
      default:                      return {};
    }
  };

  const save = async () => {
    setSaving(true); setError('');
    try {
      await api.governance.contracts.create({ ...form, ruleConfig: buildRuleConfig() });
      setShowAdd(false);
      setForm({ contractName: '', objectKey: '', ruleType: 'BLOCK_FULL_SCAN', enforcement: 'BLOCK', ruleConfig: {} });
      load();
    } catch (e) { setError(e.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const remove = async key => {
    if (!window.confirm('Delete this data contract?')) return;
    await api.governance.contracts.delete(key);
    load();
  };

  const enfColor = e => e === 'BLOCK' ? 'bg-red-50 text-red-700' : e === 'WARN' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700';

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[14px] font-semibold text-gray-800">Data Contracts</p>
          <p className="text-[12.5px] text-gray-400 mt-0.5">Structural rules every query must satisfy — prevent full scans, missing filters, and unbound results.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className={btnPrimary}>
          <Plus size={14} /> Add Contract
        </button>
      </div>

      <SectionCard>
        {loading ? (
          <div className="py-12 text-center text-[13px] text-gray-400">Loading…</div>
        ) : contracts.length === 0 ? (
          <EmptyState icon={ShieldCheck} title="No data contracts yet"
            body="Add contracts to enforce query safety rules like date filters, column filters, and result size limits." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <TableHead cols={['Contract', 'Object', 'Rule', 'Enforcement', 'Added', '']} />
              <tbody>
                {contracts.map(c => (
                  <tr key={c.contract_key} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-[13px] font-semibold text-gray-800">{c.contract_name}</td>
                    <td className="px-4 py-3 text-[13px] font-mono text-gray-600">{c.object_key}</td>
                    <td className="px-4 py-3">
                      <Badge text={(c.rule_type || '').replace(/_/g, ' ').toLowerCase()} color="bg-gray-100 text-gray-600" />
                    </td>
                    <td className="px-4 py-3">
                      <Badge text={c.enforcement} color={enfColor(c.enforcement)} />
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-400">{c.created_by}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => remove(c.contract_key)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {showAdd && (
        <Modal title="Add Data Contract" onClose={() => setShowAdd(false)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Contract name *</label>
                <input className={inputCls} placeholder="Orders date filter" value={form.contractName}
                  onChange={e => setForm(f => ({ ...f, contractName: e.target.value }))} />
              </div>
              <div>
                <label className={labelCls}>Object key *</label>
                <input className={inputCls} placeholder="obj-orders" value={form.objectKey}
                  onChange={e => setForm(f => ({ ...f, objectKey: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className={labelCls}>Rule type *</label>
              <div className="space-y-2">
                {RULE_TYPES.map(r => (
                  <label key={r.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${form.ruleType === r.value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="radio" className="accent-emerald-600" checked={form.ruleType === r.value}
                      onChange={() => setForm(f => ({ ...f, ruleType: r.value }))} />
                    <div>
                      <p className="text-[13px] font-semibold text-gray-800">{r.label}</p>
                      <p className="text-[11.5px] text-gray-400">{r.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            {/* Rule-specific config */}
            {form.ruleType === 'REQUIRE_DATE_FILTER' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Date columns (comma-sep)</label>
                  <input className={inputCls} placeholder="created_at, updated_at" value={cfgColumns}
                    onChange={e => setCfgColumns(e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Max range (days)</label>
                  <input type="number" className={inputCls} value={cfgMaxDays} onChange={e => setCfgMaxDays(e.target.value)} />
                </div>
              </div>
            )}
            {form.ruleType === 'REQUIRE_COLUMN_FILTER' && (
              <div>
                <label className={labelCls}>Required column</label>
                <input className={inputCls} placeholder="tenant_id" value={cfgColumn} onChange={e => setCfgColumn(e.target.value)} />
              </div>
            )}
            {form.ruleType === 'REQUIRE_LIMIT' && (
              <div>
                <label className={labelCls}>Max rows</label>
                <input type="number" className={inputCls} value={cfgMaxRows} onChange={e => setCfgMaxRows(e.target.value)} />
              </div>
            )}
            <div>
              <label className={labelCls}>Enforcement *</label>
              <div className="flex gap-2">
                {ENFORCEMENT.map(e => (
                  <button key={e.value} type="button" onClick={() => setForm(f => ({ ...f, enforcement: e.value }))}
                    className={`flex-1 p-2.5 rounded-xl border text-center transition-all ${form.enforcement === e.value ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <p className="text-[12.5px] font-semibold text-gray-800">{e.label}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{e.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            {error && <p className="text-[12px] text-red-500">{error}</p>}
            <div className="flex gap-2.5 pt-1">
              <button className={btnGhost} onClick={() => setShowAdd(false)}>Cancel</button>
              <button className={btnPrimary} disabled={saving || !form.contractName || !form.objectKey} onClick={save}>
                {saving ? 'Saving…' : 'Save Contract'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Tab: Audit Log ────────────────────────────────────────────────────────────

function AuditLogTab() {
  const [events,      setEvents]      = useState([]);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [page,        setPage]        = useState(0);
  const [expanded,    setExpanded]    = useState(null);
  const [filters,     setFilters]     = useState({ userEmail: '', eventType: '', connectionKey: '' });
  const PAGE_SIZE = 25;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.governance.audit.list({
        ...filters, page, size: PAGE_SIZE,
      });
      setEvents(res.events || []);
      setTotal(res.total || 0);
    } catch { setEvents([]); }
    finally { setLoading(false); }
  }, [filters, page]);

  useEffect(() => { load(); }, [load]);

  const exportCsv = async () => {
    const csv = await api.governance.audit.export(filters);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'zevra-audit-log.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[14px] font-semibold text-gray-800">Compliance Audit Log</p>
          <p className="text-[12.5px] text-gray-400 mt-0.5">Immutable record of every query — who asked what, when, and exactly what they saw.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className={btnGhost}><RefreshCw size={13} /> Refresh</button>
          <button onClick={exportCsv} className={btnGhost}><Download size={13} /> Export CSV</button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="w-full h-9 pl-8 pr-3 rounded-xl border border-gray-200 text-[13px] focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all"
            placeholder="Filter by user email…" value={filters.userEmail}
            onChange={e => { setFilters(f => ({ ...f, userEmail: e.target.value })); setPage(0); }} />
        </div>
        <select className="h-9 px-3 rounded-xl border border-gray-200 text-[13px] text-gray-700 focus:outline-none focus:border-emerald-400 transition-all bg-white"
          value={filters.eventType} onChange={e => { setFilters(f => ({ ...f, eventType: e.target.value })); setPage(0); }}>
          <option value="">All event types</option>
          {EVENT_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      <SectionCard>
        {loading ? (
          <div className="py-12 text-center text-[13px] text-gray-400">Loading…</div>
        ) : events.length === 0 ? (
          <EmptyState icon={Clock} title="No audit events yet"
            body="Audit events are recorded automatically when queries run through Zevra." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <TableHead cols={['Time', 'User', 'Event', 'Tables', 'Rows', 'Modified', '']} />
                <tbody>
                  {events.map(e => (
                    <React.Fragment key={e.eventKey}>
                      <tr className="border-t border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                          onClick={() => setExpanded(expanded === e.eventKey ? null : e.eventKey)}>
                        <td className="px-4 py-3 text-[12px] text-gray-500 whitespace-nowrap">{timeAgo(e.createdAt)}</td>
                        <td className="px-4 py-3 text-[13px] text-gray-700">{e.userEmail || '—'}</td>
                        <td className="px-4 py-3">
                          <Badge text={e.eventType} color={EVENT_COLORS[e.eventType] || 'bg-gray-100 text-gray-600'} />
                        </td>
                        <td className="px-4 py-3 text-[12px] text-gray-500 max-w-[160px] truncate">
                          {e.objectKeys?.join(', ') || '—'}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-gray-500">{e.rowCountReturned ?? '—'}</td>
                        <td className="px-4 py-3 text-[12px]">
                          {(e.columnsMasked?.length > 0 || e.rlsPoliciesApplied?.length > 0) ? (
                            <span className="text-amber-600 font-medium flex items-center gap-1"><Shield size={11} /> Yes</span>
                          ) : <span className="text-gray-300">No</span>}
                        </td>
                        <td className="px-4 py-3">
                          <ChevronDown size={13} className={`text-gray-400 transition-transform ${expanded === e.eventKey ? 'rotate-180' : ''}`} />
                        </td>
                      </tr>
                      {expanded === e.eventKey && (
                        <tr className="bg-gray-50 border-t border-gray-100">
                          <td colSpan={7} className="px-4 py-4">
                            <div className="grid grid-cols-2 gap-4 text-[12px]">
                              <div>
                                <p className="font-semibold text-gray-500 mb-1 uppercase tracking-wide text-[10px]">Original SQL</p>
                                {formatSql(e.originalSql)}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-500 mb-1 uppercase tracking-wide text-[10px]">Executed SQL</p>
                                {formatSql(e.executedSql)}
                              </div>
                              {e.columnsMasked?.length > 0 && (
                                <div>
                                  <p className="font-semibold text-gray-500 mb-1 uppercase tracking-wide text-[10px]">Columns masked</p>
                                  <p className="text-amber-700">{e.columnsMasked.join(', ')}</p>
                                </div>
                              )}
                              {e.rlsPoliciesApplied?.length > 0 && (
                                <div>
                                  <p className="font-semibold text-gray-500 mb-1 uppercase tracking-wide text-[10px]">RLS policies applied</p>
                                  <p className="text-violet-700">{e.rlsPoliciesApplied.join(', ')}</p>
                                </div>
                              )}
                              {e.contractsViolated?.length > 0 && (
                                <div>
                                  <p className="font-semibold text-gray-500 mb-1 uppercase tracking-wide text-[10px]">Contracts violated</p>
                                  <p className="text-orange-700">{e.contractsViolated.join(', ')}</p>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[12px] text-gray-400">{total.toLocaleString()} total events</span>
              <div className="flex gap-2">
                <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                  className="px-3 py-1.5 text-[12px] rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">
                  Previous
                </button>
                <span className="px-3 py-1.5 text-[12px] text-gray-500">Page {page + 1}</span>
                <button disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1.5 text-[12px] rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors">
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </SectionCard>
    </div>
  );
}

// ── Main Governance page ──────────────────────────────────────────────────────

const TABS = [
  { id: 'columns',   label: 'Column Policies', icon: EyeOff },
  { id: 'rls',       label: 'Row Filters',     icon: Filter },
  { id: 'contracts', label: 'Data Contracts',  icon: ShieldCheck },
  { id: 'audit',     label: 'Audit Log',       icon: Clock },
];

export default function Governance() {
  const [activeTab, setActiveTab] = useState('columns');

  return (
    <div className="h-full overflow-y-auto bg-[#F7F8FA]">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* Page header */}
        <div className="flex items-start gap-4 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
            <Shield size={20} className="text-[#0C5847]" />
          </div>
          <div>
            <h1 className="text-[22px] font-bold text-gray-900 tracking-tight">Governance Hub</h1>
            <p className="text-[13.5px] text-gray-500 mt-0.5">
              Column masking, row-level security, data contracts, and full query audit trail.
            </p>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 p-1.5 mb-6 shadow-sm w-fit">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold transition-all ${
                activeTab === t.id
                  ? 'bg-[#0C5847] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'
              }`}>
              <t.icon size={13} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'columns'   && <ColumnPoliciesTab />}
        {activeTab === 'rls'       && <RowFiltersTab />}
        {activeTab === 'contracts' && <ContractsTab />}
        {activeTab === 'audit'     && <AuditLogTab />}
      </div>
    </div>
  );
}
