import React, { useEffect, useState } from 'react';
import { useDialog } from '../../contexts/DialogContext';
import enrollmentService from '../../services/enrollmentService';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import Pagination from '../common/Pagination';
import Modal from '../common/Modal';
import {
  Users,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  AlertCircle,
  Hourglass,
  Check,
  X,
  FileText,
  UserCheck
} from 'lucide-react';

const EnrollmentRequestsTable = ({ onCountChange }) => {
  const { showAlert } = useDialog();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Approval Modal State
  const [approvingRequest, setApprovingRequest] = useState(null);
  const [approvalDueDate, setApprovalDueDate] = useState('');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [submittingApprove, setSubmittingApprove] = useState(false);

  // Rejection Modal State
  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await enrollmentService.getRequests({
        status: statusFilter,
        search: search.trim(),
      });
      if (res.status === 'success') {
        setRequests(res.data);
      }
    } catch (err) {
      console.error('Failed to load enrollment requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshPendingCount = async () => {
    try {
      const res = await enrollmentService.getPendingCount();
      if (res.status === 'success' && onCountChange) {
        onCountChange(res.data.pending_count);
      }
    } catch (err) {
      console.warn('Failed to refresh pending count:', err);
    }
  };

  useEffect(() => {
    fetchRequests();
    refreshPendingCount();
  }, [statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchRequests();
  };

  // Approval Flow
  const openApproveModal = (req) => {
    setApprovingRequest(req);
    // Calculate default due date based on course duration days
    const durationDays = parseInt(req.duration_days, 10) || 30;
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + durationDays);
    setApprovalDueDate(defaultDate.toISOString().split('T')[0]);
    setApprovalNotes('');
  };

  const closeApproveModal = () => {
    setApprovingRequest(null);
    setApprovalDueDate('');
    setApprovalNotes('');
  };

  const handleConfirmApproval = async () => {
    if (!approvingRequest) return;

    try {
      setSubmittingApprove(true);
      const res = await enrollmentService.approveRequest(approvingRequest.id, {
        due_date: approvalDueDate ? approvalDueDate + ' 23:59:59' : null,
        admin_notes: approvalNotes,
      });

      if (res.status === 'success') {
        showAlert({
          title: 'Enrollment Approved',
          message: 'The enrollment request for ' + approvingRequest.learner_name + ' in "' + approvingRequest.course_title + '" has been approved. The course is now active in their portal.',
          type: 'success',
        });
        closeApproveModal();
        fetchRequests();
        refreshPendingCount();
      }
    } catch (err) {
      showAlert({
        title: 'Approval Failed',
        message: err.response?.data?.message || 'Could not approve request at this time.',
        type: 'error',
      });
    } finally {
      setSubmittingApprove(false);
    }
  };

  // Rejection Flow
  const openRejectModal = (req) => {
    setRejectingRequest(req);
    setRejectionNotes('');
  };

  const closeRejectModal = () => {
    setRejectingRequest(null);
    setRejectionNotes('');
  };

  const handleConfirmRejection = async () => {
    if (!rejectingRequest) return;

    try {
      setSubmittingReject(true);
      const res = await enrollmentService.rejectRequest(rejectingRequest.id, {
        admin_notes: rejectionNotes,
      });

      if (res.status === 'success') {
        showAlert({
          title: 'Enrollment Request Declined',
          message: 'The enrollment request for ' + rejectingRequest.learner_name + ' has been declined.',
          type: 'info',
        });
        closeRejectModal();
        fetchRequests();
        refreshPendingCount();
      }
    } catch (err) {
      showAlert({
        title: 'Rejection Failed',
        message: err.response?.data?.message || 'Could not reject request at this time.',
        type: 'error',
      });
    } finally {
      setSubmittingReject(false);
    }
  };

  const paginatedRequests = requests.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span className="clay-pill text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-emerald-600" /> Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="clay-pill text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
            <XCircle className="w-3 h-3 text-rose-600" /> Declined
          </span>
        );
      default:
        return (
          <span className="clay-pill text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-300 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
            <Hourglass className="w-3 h-3 text-amber-600" /> Pending Review
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Filter Tabs & Search */}
      <div className="clay-card p-4 rounded-2xl border border-white/60 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {[
            { label: 'Pending Review', value: 'pending' },
            { label: 'All Requests', value: '' },
            { label: 'Approved', value: 'approved' },
            { label: 'Declined', value: 'rejected' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider transition-all rounded-xl ${
                statusFilter === tab.value
                  ? 'clay-btn-primary text-white shadow-sm'
                  : 'clay-btn-secondary text-[#64748B] hover:text-[#1E3B78]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-80">
          <Input
            placeholder="Search learner, Trainee ID, batch, course..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            icon={Search}
          />
          <Button type="submit" variant="primary" size="md">
            Search
          </Button>
        </form>
      </div>

      {/* Requests Table */}
      <div className="clay-card rounded-2xl border border-white/60 overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-xs font-semibold text-[#64748B]">
            Loading enrollment requests...
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <UserCheck className="w-10 h-10 text-[#64748B] mx-auto opacity-50" />
            <h3 className="text-base font-bold text-[#1E3B78]">No Enrollment Requests Found</h3>
            <p className="text-xs text-[#64748B] max-w-md mx-auto">
              {statusFilter === 'pending'
                ? 'There are currently no pending enrollment requests awaiting administrative confirmation.'
                : 'No enrollment requests match your selected status or search filter.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
                  <th className="py-3 px-4">Learner Profile</th>
                  <th className="py-3 px-4">Requested Course</th>
                  <th className="py-3 px-4">Learner Notes</th>
                  <th className="py-3 px-4">Requested On</th>
                  <th className="py-3 px-4">Status & Review</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]/80 text-xs">
                {paginatedRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-[#F3F6FB]/50 transition-colors">
                    {/* Learner Info */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="font-bold text-[#172B4D]">{req.learner_name}</div>
                      <div className="text-[11px] text-[#64748B]">{req.learner_email}</div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        {req.learner_trainee_id && (
                          <span className="font-mono text-[10px] font-bold text-[#1E3B78] bg-[#EFF6FF] border border-[#BFDBFE] px-1.5 py-0.5 rounded">
                            {req.learner_trainee_id}
                          </span>
                        )}
                        {req.learner_employee_id && !req.learner_trainee_id && (
                          <span className="font-mono text-[10px] font-bold text-[#1E3B78] bg-[#EFF6FF] border border-[#BFDBFE] px-1.5 py-0.5 rounded">
                            {req.learner_employee_id}
                          </span>
                        )}
                        {req.learner_batch && (
                          <span className="text-[10px] font-semibold text-[#64748B] bg-slate-100 px-1.5 py-0.5 rounded">
                            Batch: {req.learner_batch}
                          </span>
                        )}
                        {req.learner_type && (
                          <span className="text-[10px] font-semibold uppercase text-slate-500 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded">
                            {req.learner_type}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Course Info */}
                    <td className="py-3.5 px-4 align-top">
                      <div className="font-bold text-[#1E3B78] leading-snug">{req.course_title}</div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className="text-[10px] font-bold uppercase text-[#1E3B78] bg-[#E2E9F4] px-2 py-0.5 rounded-full">
                          {req.course_category}
                        </span>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            req.course_type === 'certified'
                              ? 'bg-blue-50 text-[#1E3B78] border border-blue-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {req.course_type === 'non_certified' ? 'Non-Certified' : 'Certified'}
                        </span>
                        <span className="text-[10px] text-[#64748B]">
                          {req.duration_days || 30}d duration
                        </span>
                      </div>
                    </td>

                    {/* Learner Notes */}
                    <td className="py-3.5 px-4 align-top max-w-xs">
                      {req.request_notes ? (
                        <p className="text-xs text-[#172B4D] italic bg-[#F8FAFC] p-2 rounded-lg border border-[#E2E8F0] line-clamp-3">
                          "{req.request_notes}"
                        </p>
                      ) : (
                        <span className="text-[11px] text-[#94A3B8] italic">No note provided</span>
                      )}
                    </td>

                    {/* Requested Date */}
                    <td className="py-3.5 px-4 align-top text-[11px] text-[#64748B] whitespace-nowrap">
                      <div>{new Date(req.created_at).toLocaleDateString()}</div>
                      <div className="text-[10px] text-[#94A3B8]">
                        {new Date(req.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>

                    {/* Status & Review info */}
                    <td className="py-3.5 px-4 align-top">
                      <div>{getStatusBadge(req.status)}</div>
                      {req.reviewed_by_name && (
                        <div className="mt-1 text-[10px] text-[#64748B]">
                          by <strong>{req.reviewed_by_name}</strong>
                          <div className="text-[9px] text-[#94A3B8]">
                            {req.reviewed_at ? new Date(req.reviewed_at).toLocaleDateString() : ''}
                          </div>
                        </div>
                      )}
                      {req.admin_notes && (
                        <div className="mt-1 text-[11px] text-slate-700 italic bg-white/70 p-1.5 rounded border border-slate-200">
                          Note: {req.admin_notes}
                        </div>
                      )}
                    </td>

                    {/* Action buttons */}
                    <td className="py-3.5 px-4 align-top text-right">
                      {req.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="primary"
                            size="sm"
                            icon={Check}
                            onClick={() => openApproveModal(req)}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            icon={X}
                            onClick={() => openRejectModal(req)}
                          >
                            Decline
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[11px] font-semibold text-[#94A3B8]">
                          Processed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {requests.length > pageSize && (
          <div className="p-4 border-t border-[#E2E8F0]">
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(requests.length / pageSize)}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Approve Modal Mounted via Body Portal */}
      <Modal
        isOpen={!!approvingRequest}
        onClose={closeApproveModal}
        title="Approve Course Enrollment"
        subtitle="Confirm course assignment and configure completion deadline."
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-1.5">
            <div className="text-xs text-[#64748B]">
              Learner: <strong className="text-[#172B4D]">{approvingRequest?.learner_name}</strong> ({approvingRequest?.learner_email})
            </div>
            <div className="text-xs text-[#64748B]">
              Course: <strong className="text-[#1E3B78]">{approvingRequest?.course_title}</strong>
            </div>
            {approvingRequest?.request_notes && (
              <div className="text-xs text-[#64748B] pt-1">
                Learner Note: <em className="text-[#172B4D]">"{approvingRequest.request_notes}"</em>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1E3B78]">
                Assignment Due Date
              </label>
              <input
                type="date"
                className="w-full px-3.5 py-2 text-xs text-[#172B4D] bg-white border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2C51A2]/30 focus:border-[#2C51A2]"
                value={approvalDueDate}
                onChange={(e) => setApprovalDueDate(e.target.value)}
              />
              <p className="text-[11px] text-[#64748B]">
                Defaults to the course duration ({approvingRequest?.duration_days || 30} days from today).
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-[#1E3B78]">
                Approval Notes / Remarks (Optional)
              </label>
              <textarea
                rows="2"
                className="w-full px-3.5 py-2 text-xs text-[#172B4D] bg-white border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#2C51A2]/30 focus:border-[#2C51A2]"
                placeholder="Optional internal remark or message to trainee..."
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
            <Button variant="outline" size="md" onClick={closeApproveModal} disabled={submittingApprove}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              icon={Check}
              onClick={handleConfirmApproval}
              disabled={submittingApprove}
            >
              {submittingApprove ? 'Approving...' : 'Confirm Approval & Enroll'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Reject Modal Mounted via Body Portal */}
      <Modal
        isOpen={!!rejectingRequest}
        onClose={closeRejectModal}
        title="Decline Enrollment Request"
        subtitle="Specify reason for declining access to this program."
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-200 text-xs text-[#172B4D] space-y-1">
            <div>
              Learner: <strong>{rejectingRequest?.learner_name}</strong>
            </div>
            <div>
              Course: <strong>{rejectingRequest?.course_title}</strong>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#1E3B78]">
              Reason for Declining (Sent to Learner)
            </label>
            <textarea
              rows="3"
              className="w-full px-3.5 py-2.5 text-xs text-[#172B4D] bg-white border border-[#CBD5E1] rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-400/30 focus:border-rose-500"
              placeholder="Specify the reason why this request is not approved at this time..."
              value={rejectionNotes}
              onChange={(e) => setRejectionNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E8F0]">
            <Button variant="outline" size="md" onClick={closeRejectModal} disabled={submittingReject}>
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              icon={X}
              onClick={handleConfirmRejection}
              disabled={submittingReject}
            >
              {submittingReject ? 'Declining...' : 'Confirm Decline'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default EnrollmentRequestsTable;
