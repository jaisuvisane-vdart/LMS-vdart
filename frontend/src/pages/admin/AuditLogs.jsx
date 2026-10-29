import React, { useEffect, useState } from 'react';
import auditService from '../../services/auditService';
import { exportToCsv } from '../../utils/downloadHelper';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Pagination from '../../components/common/Pagination';
import ActionMenu from '../../components/common/ActionMenu';
import {
  ShieldCheck,
  Search,
  Filter,
  Eye,
  Calendar,
  User,
  Database,
  Lock,
  ArrowRight,
  ArrowLeft,
  Download
} from 'lucide-react';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // View Mode: 'list' | 'detail'
  const [viewMode, setViewMode] = useState('list');
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await auditService.getLogs({
        action: actionFilter,
        entity_type: entityFilter,
        search: searchTerm,
        limit: 100,
      });
      if (res.status === 'success') {
        setLogs(res.data);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter, entityFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [actionFilter, entityFilter, searchTerm]);

  const paginatedLogs = logs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleInspect = (log) => {
    setSelectedLog(log);
    setViewMode('detail');
  };

  const handleExportCSV = () => {
    try {
      const headers = [
        'Timestamp',
        'Actor Name',
        'Actor Email',
        'Action',
        'Entity Type',
        'Entity ID',
        'Client IP'
      ];
      const rows = (logs || []).map((log) => [
        log.created_at || '',
        log.actor_name || '',
        log.actor_email || '',
        log.action || '',
        log.entity_type || '',
        log.entity_id ?? '',
        log.ip_address || ''
      ]);
      exportToCsv('audit_logs_report.csv', headers, rows);
    } catch (err) {
      console.error('Failed to export audit logs CSV:', err);
    }
  };

  const getActionBadgeVariant = (action) => {
    switch (action) {
      case 'USER_LOGIN':
        return 'success';
      case 'USER_CREATED':
      case 'USER_PROVISIONED':
      case 'COURSE_ASSIGNED':
        return 'primary';
      case 'USER_UPDATED':
        return 'warning';
      case 'USER_STATUS_CHANGED':
        return 'error';
      case 'EXAM_SUBMITTED':
        return 'navy';
      default:
        return 'neutral';
    }
  };

  const formatJSON = (val) => {
    if (!val) return 'None';
    try {
      const parsed = typeof val === 'string' ? JSON.parse(val) : val;
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return String(val);
    }
  };

  if (viewMode === 'detail' && selectedLog) {
    return (
      <div className="space-y-6">
        {/* Top Banner Header with Back Button */}
        <div data-aos="fade-down" className="clay-card p-6 sm:p-7 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full clay-pill">
                Security Compliance
              </span>
              <span className="text-xs text-[#64748B]">Audit Event State Inspection</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] uppercase tracking-wide mt-1.5">
              {selectedLog.action} on {selectedLog.entity_type} (#{selectedLog.entity_id || 'N/A'})
            </h1>
            <p className="text-xs text-[#64748B] mt-0.5 max-w-2xl leading-relaxed">
              Cryptographically timestamped event payload showing exact mutation values and actor origin.
            </p>
          </div>
          <div>
            <Button variant="secondary" size="md" icon={ArrowLeft} onClick={() => setViewMode('list')}>
              Back to Audit Logs
            </Button>
          </div>
        </div>

        {/* Audit Event Detail Card */}
        <div data-aos="fade-up" data-aos-delay="150" className="clay-card p-6 sm:p-8 rounded-2xl shadow-sm space-y-5 w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs clay-card p-5 rounded-xl">
            <div>
              <span className="text-[#64748B] font-semibold block">Actor:</span>
              <span className="text-[#2C51A2] font-bold text-sm">{selectedLog.actor_name} ({selectedLog.actor_email})</span>
            </div>
            <div>
              <span className="text-[#64748B] font-semibold block">Timestamp:</span>
              <span className="text-[#172B4D] font-mono text-sm">{selectedLog.created_at}</span>
            </div>
            <div>
              <span className="text-[#64748B] font-semibold block">Client IP:</span>
              <span className="text-[#172B4D] font-mono">{selectedLog.ip_address}</span>
            </div>
            <div>
              <span className="text-[#64748B] font-semibold block">User Agent:</span>
              <span className="text-[#64748B] text-[11px] font-mono break-all">{selectedLog.user_agent}</span>
            </div>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#172B4D] block mb-2">
              Prior State (Old Values)
            </span>
            <pre className="bg-[#1E293B] text-[#E2E8F0] p-4 text-xs font-mono overflow-x-auto max-h-56 border border-[#334155] rounded-xl touch-scroll">
              {formatJSON(selectedLog.old_values)}
            </pre>
          </div>

          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#172B4D] block mb-2">
              Committed State (New Values / Mutation Payload)
            </span>
            <pre className="bg-[#1E293B] text-[#BFDBFE] p-4 text-xs font-mono overflow-x-auto max-h-56 border border-[#334155] rounded-xl touch-scroll">
              {formatJSON(selectedLog.new_values)}
            </pre>
          </div>

          <div className="pt-4 border-t border-[#CBD5E1] flex justify-end">
            <Button variant="secondary" size="md" onClick={() => setViewMode('list')}>
              Return to Activity Trail
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner Header with Minimal Clay Surface */}
      <div data-aos="fade-down" className="clay-card p-6 sm:p-7 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#2C51A2] text-white px-2.5 py-0.5 rounded-full clay-pill">
              Security Compliance
            </span>
            <span className="text-xs text-[#64748B]">Immutable Event Trail</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#172B4D] uppercase tracking-wide mt-1.5">
            System & Security Activity Audit Logs
          </h1>
          <p className="text-xs text-[#64748B] mt-0.5 max-w-2xl leading-relaxed">
            Cryptographically timestamped audit trail of administrative modifications, user authentications, and assessment submissions.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" size="sm" icon={Download} onClick={handleExportCSV}>
            Export CSV ({logs.length})
          </Button>
        </div>
      </div>

      {/* Filter Toolbar with Minimal Clay Surface */}
      <div data-aos="fade-up" data-aos-delay="100" className="clay-card p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full md:w-auto flex-1">
          <Select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            options={[
              { value: '', label: 'All Logged Actions' },
              { value: 'USER_LOGIN', label: 'USER_LOGIN' },
              { value: 'USER_CREATED', label: 'USER_CREATED' },
              { value: 'USER_UPDATED', label: 'USER_UPDATED' },
              { value: 'USER_STATUS_CHANGED', label: 'USER_STATUS_CHANGED' },
              { value: 'COURSE_ASSIGNED', label: 'COURSE_ASSIGNED' },
              { value: 'EXAM_SUBMITTED', label: 'EXAM_SUBMITTED' },
            ]}
          />
          <Select
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            options={[
              { value: '', label: 'All Entity Types' },
              { value: 'users', label: 'Users' },
              { value: 'courses', label: 'Courses' },
              { value: 'assessment_attempts', label: 'Assessment Attempts' },
            ]}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="w-full sm:w-72">
            <Input
              placeholder="Search action, actor, IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={Search}
            />
          </div>
          <Button variant="secondary" size="md" onClick={fetchLogs}>
            Filter
          </Button>
        </div>
      </div>

      {/* Audit Log Table with Minimal Clay Surface */}
      <div data-aos="fade-up" data-aos-delay="150" className="clay-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto touch-scroll">
          <table className="w-full text-center border-collapse min-w-[760px]">
            <thead>
              <tr 
                className="text-white text-[11px] font-bold uppercase tracking-wider text-center"
                style={{
                  background: 'linear-gradient(160deg, #1E3B78 0%, #2C51A2 100%)',
                  boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.2)'
                }}
              >
                <th className="py-3.5 px-4 text-center">Timestamp (UTC)</th>
                <th className="py-3.5 px-4 text-center">Actor</th>
                <th className="py-3.5 px-4 text-center">Action Event</th>
                <th className="py-3.5 px-4 text-center">Target Entity</th>
                <th className="py-3.5 px-4 text-center">IP Address</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]/70 text-xs font-mono">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-[#64748B] font-sans">
                    Loading security event stream...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-[#64748B] font-sans">
                    No audit records found matching the criteria.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#EFF6FF]/60 transition-colors">
                    <td className="py-3 px-4 text-[#64748B] whitespace-nowrap text-center">
                      {log.created_at}
                    </td>
                    <td className="py-3 px-4 font-sans text-left">
                      <div className="font-bold text-[#172B4D]">
                        {log.actor_name || 'System / Anonymous'}
                      </div>
                      <div className="text-[11px] text-[#64748B] font-mono">
                        {log.actor_email || 'internal'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge variant={getActionBadgeVariant(log.action)}>
                        {log.action}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-[#172B4D] font-sans text-center">
                      <span className="font-bold text-[#2C51A2]">{log.entity_type}</span>
                      {log.entity_id && (
                        <span className="text-[10px] text-[#64748B] font-mono ml-1.5">
                          (#{log.entity_id})
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#64748B] text-center">
                      {log.ip_address || '127.0.0.1'}
                    </td>
                    <td className="py-3 px-4 text-center font-sans">
                      <ActionMenu
                        triggerTitle="Audit Log Actions"
                        items={[
                          {
                            label: 'Inspect Payload',
                            icon: Eye,
                            onClick: () => handleInspect(log),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalItems={logs.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 15, 25, 50]}
        />
      </div>
    </div>
  );
};

export default AuditLogs;
