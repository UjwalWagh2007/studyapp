import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  CheckCircle2,
  Edit2,
  Trash2,
  BarChart2,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { useAppStore } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import type { MistakeCategory, MistakeEntry } from '../../types';

const MISTAKE_CATEGORIES: MistakeCategory[] = [
  "Didn't understand problem",
  "Didn't recognize pattern",
  "Concept gap",
  "Logic error",
  "Coding error",
  "Edge case",
  "Complexity mistake",
  "Time pressure",
  "Forgot technique",
  "Other",
];

export const MistakeBankPage: React.FC = () => {
  const {
    mistakes,
    questions,
    addMistake,
    updateMistake,
    toggleMistakeResolved,
    deleteMistake,
    mistakeCategoryStats,
  } = useAppStore();

  const { showToast } = useToast();

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unresolved' | 'resolved'>('all');

  // Modals state
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [editingMistake, setEditingMistake] = useState<MistakeEntry | null>(null);
  const [deletingMistake, setDeletingMistake] = useState<MistakeEntry | null>(null);

  // Form state
  const [formQuestionId, setFormQuestionId] = useState('');
  const [formCategory, setFormCategory] = useState<MistakeCategory>("Didn't recognize pattern");
  const [formNotes, setFormNotes] = useState('');

  const unresolvedCount = useMemo(() => mistakes.filter((m) => !m.isResolved).length, [mistakes]);
  const resolvedCount = useMemo(() => mistakes.filter((m) => m.isResolved).length, [mistakes]);
  const resolutionRate = mistakes.length > 0 ? Math.round((resolvedCount / mistakes.length) * 100) : 0;

  // Filtered mistakes
  const filteredMistakes = useMemo(() => {
    return mistakes.filter((m) => {
      // Status filter
      if (statusFilter === 'unresolved' && m.isResolved) return false;
      if (statusFilter === 'resolved' && !m.isResolved) return false;

      // Category filter
      if (selectedCategory !== 'All' && m.category !== selectedCategory) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = m.questionTitle.toLowerCase().includes(q);
        const matchesNotes = m.notes.toLowerCase().includes(q);
        const matchesCategory = m.category.toLowerCase().includes(q);
        if (!matchesTitle && !matchesNotes && !matchesCategory) return false;
      }

      return true;
    });
  }, [mistakes, statusFilter, selectedCategory, searchQuery]);

  // Open Log Modal
  const handleOpenLog = () => {
    setFormQuestionId(questions[0]?.id || '');
    setFormCategory("Didn't recognize pattern");
    setFormNotes('');
    setEditingMistake(null);
    setIsLogModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (m: MistakeEntry) => {
    setFormQuestionId(m.questionId);
    setFormCategory(m.category);
    setFormNotes(m.notes);
    setEditingMistake(m);
    setIsLogModalOpen(true);
  };

  // Save Modal Form
  const handleSaveMistake = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNotes.trim()) {
      showToast('Validation Error', 'Please enter notes explaining the error or difficulty.', 'warning');
      return;
    }

    const selectedQ = questions.find((q) => q.id === formQuestionId);
    const questionTitle = selectedQ ? selectedQ.title : 'General Question';
    const topicId = selectedQ?.topicId;
    const topicName = selectedQ?.topicName;

    if (editingMistake) {
      updateMistake(editingMistake.id, {
        questionId: formQuestionId,
        questionTitle,
        topicId,
        topicName,
        category: formCategory,
        notes: formNotes.trim(),
      });
      showToast('Mistake Updated', 'Changes saved successfully.', 'success');
    } else {
      addMistake({
        questionId: formQuestionId,
        questionTitle,
        topicId,
        topicName,
        category: formCategory,
        notes: formNotes.trim(),
        isResolved: false,
      });
      showToast('Mistake Logged', 'Diagnosed error logged to Mistake Bank.', 'success');
    }

    setIsLogModalOpen(false);
  };

  // Toggle Resolution
  const handleToggle = (m: MistakeEntry) => {
    toggleMistakeResolved(m.id);
    showToast(
      m.isResolved ? 'Reopened Mistake' : 'Resolved Mistake! 🎉',
      `"${m.questionTitle}" marked as ${m.isResolved ? 'unresolved' : 'resolved'}.`,
      'info'
    );
  };

  // Delete
  const handleConfirmDelete = () => {
    if (!deletingMistake) return;
    deleteMistake(deletingMistake.id);
    showToast('Mistake Removed', 'Entry deleted from Mistake Bank.', 'info');
    setDeletingMistake(null);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PageHeader
        title="Mistake Bank & Error Analysis"
        description="Diagnose why questions were difficult, track recurring logic bugs, concept gaps, and edge case blind spots."
        actions={
          <Button
            variant="danger"
            size="md"
            iconLeft={<Plus size={16} />}
            onClick={handleOpenLog}
          >
            Log Mistake
          </Button>
        }
      />

      {/* Analytics & Common Mistake Categories Dashboard */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 16,
        }}
      >
        {/* Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Total Mistakes Logged</span>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>
              {mistakes.length}
            </div>
          </div>

          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Unresolved Blind Spots</span>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 700,
                color: unresolvedCount > 0 ? 'var(--color-danger)' : 'var(--color-success)',
                marginTop: 2,
              }}
            >
              {unresolvedCount}
            </div>
          </div>

          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Resolved Bugs</span>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-success)', marginTop: 2 }}>
              {resolvedCount}
            </div>
          </div>

          <div
            style={{
              padding: '14px 16px',
              backgroundColor: 'var(--bg-subtle)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Resolution Rate</span>
            <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-primary)', marginTop: 2 }}>
              {resolutionRate}%
            </div>
          </div>
        </div>

        {/* Most Common Mistake Categories Breakdown */}
        <div
          style={{
            padding: '16px 20px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <BarChart2 size={15} color="var(--color-primary)" />
              Most Common Mistake Categories
            </span>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Based strictly on {mistakes.length} logged error(s)
            </span>
          </div>

          {mistakeCategoryStats.length === 0 ? (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '12px 0' }}>
              No mistake data available yet. Log errors when a question is difficult to uncover patterns.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              {mistakeCategoryStats.slice(0, 4).map((stat) => (
                <div key={stat.category} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {stat.category}
                    </span>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                      {stat.count} ({stat.percentage}%)
                    </span>
                  </div>
                  <ProgressBar value={stat.percentage} max={100} size="sm" variant="danger" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        {/* Status Tabs */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            className={`btn btn-sm ${statusFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter('all')}
          >
            All Mistakes ({mistakes.length})
          </button>
          <button
            className={`btn btn-sm ${statusFilter === 'unresolved' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter('unresolved')}
          >
            Unresolved ({unresolvedCount})
          </button>
          <button
            className={`btn btn-sm ${statusFilter === 'resolved' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setStatusFilter('resolved')}
          >
            Resolved ({resolvedCount})
          </button>
        </div>

        {/* Search & Category Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ width: '220px' }}>
            <Input
              placeholder="Search mistakes or questions..."
              iconLeft={<Search size={14} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ width: '190px' }}>
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              options={[
                { value: 'All', label: 'All Categories' },
                ...MISTAKE_CATEGORIES.map((c) => ({ value: c, label: c })),
              ]}
            />
          </div>
        </div>
      </div>

      {/* Mistake List */}
      {filteredMistakes.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 size={28} color="var(--color-success)" />}
          title={statusFilter === 'unresolved' ? 'No unresolved mistakes!' : 'No mistake logs found'}
          description={
            statusFilter === 'unresolved'
              ? 'All diagnosed bugs and gaps have been resolved. Excellent mastery reinforcement!'
              : 'Log why questions were difficult during study or revisions to diagnose root causes.'
          }
          actionText={statusFilter === 'all' ? 'Log First Mistake' : undefined}
          onAction={statusFilter === 'all' ? handleOpenLog : undefined}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredMistakes.map((m) => (
            <div
              key={m.id}
              className="hover-card"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                padding: '16px 20px',
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: m.isResolved ? '1px solid var(--border-subtle)' : '1px solid rgba(239, 68, 68, 0.3)',
                borderLeft: m.isResolved ? '4px solid var(--color-success)' : '4px solid var(--color-danger)',
                gap: 16,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                {/* Header line: Question Title + Category + Resolved Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '14.5px', color: 'var(--text-primary)' }}>
                    {m.questionTitle}
                  </span>

                  <Badge
                    variant={
                      m.category === 'Logic error' || m.category === 'Coding error'
                        ? 'danger'
                        : m.category === 'Edge case' || m.category === 'Complexity mistake'
                        ? 'warning'
                        : 'primary'
                    }
                    size="sm"
                  >
                    {m.category}
                  </Badge>

                  {m.topicName && (
                    <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      {m.topicName}
                    </span>
                  )}

                  {m.isResolved ? (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--color-success)',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                      }}
                    >
                      ✓ Resolved
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--color-danger)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-full)',
                      }}
                    >
                      ● Unresolved
                    </span>
                  )}
                </div>

                {/* Notes & Root cause */}
                <div
                  style={{
                    fontSize: '13.5px',
                    color: 'var(--text-primary)',
                    lineHeight: 1.55,
                    backgroundColor: 'var(--bg-canvas)',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-subtle)',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {m.notes}
                </div>

                {/* Date footer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  <span>Logged on {new Date(m.createdAt).toLocaleDateString()}</span>
                  {m.resolvedAt && <span>• Resolved on {new Date(m.resolvedAt).toLocaleDateString()}</span>}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Button
                  variant={m.isResolved ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={() => handleToggle(m)}
                >
                  {m.isResolved ? 'Reopen' : 'Mark Resolved'}
                </Button>

                <button
                  onClick={() => handleOpenEdit(m)}
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '6px' }}
                  title="Edit Mistake"
                >
                  <Edit2 size={14} />
                </button>

                <button
                  onClick={() => setDeletingMistake(m)}
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '6px', color: 'var(--color-danger)' }}
                  title="Delete Mistake"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* LOG / EDIT MISTAKE MODAL */}
      <Modal
        isOpen={isLogModalOpen}
        onClose={() => setIsLogModalOpen(false)}
        title={editingMistake ? 'Edit Mistake Entry' : 'Log Mistake & Error Diagnosis'}
        subtitle="Record why a problem was difficult or where your logic failed."
        maxWidth="560px"
      >
        <form onSubmit={handleSaveMistake} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Question Selector */}
          <div>
            <label className="form-label">Associated Question *</label>
            <select
              className="form-select"
              value={formQuestionId}
              onChange={(e) => setFormQuestionId(e.target.value)}
              required
            >
              {questions.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title} ({q.topicName || q.subject})
                </option>
              ))}
            </select>
          </div>

          {/* Mistake Category Selector */}
          <div>
            <label className="form-label">Mistake Category *</label>
            <select
              className="form-select"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as MistakeCategory)}
              required
            >
              {MISTAKE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Root Cause Notes */}
          <div>
            <label className="form-label">Diagnosis & Root-Cause Notes *</label>
            <textarea
              className="form-input"
              style={{ minHeight: '110px', resize: 'vertical', fontSize: '13.5px' }}
              placeholder="e.g. Forgot to handle duplicate characters in sliding window dictionary. Off-by-one error on pointer termination..."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <Button variant="secondary" size="md" onClick={() => setIsLogModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="md" type="submit">
              {editingMistake ? 'Save Changes' : 'Log to Mistake Bank'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* DELETE CONFIRMATION DIALOG */}
      <ConfirmationDialog
        isOpen={Boolean(deletingMistake)}
        title="Delete Mistake Log?"
        description={`Are you sure you want to delete this mistake record for "${deletingMistake?.questionTitle}"?`}
        confirmText="Delete Entry"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingMistake(null)}
      />
    </div>
  );
};
