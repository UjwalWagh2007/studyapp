import React, { useState, useMemo } from 'react';
import {
  Lightbulb,
  Plus,
  Search,
  BookOpen,
  Edit2,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { useAppStore } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import type { KnowledgeInsight, InsightCategory } from '../../types';

const INSIGHT_CATEGORIES: InsightCategory[] = [
  'Algorithm Invariant',
  'Pattern Rule',
  'Common Edge Cases',
  'Interview Tip',
  'Personal Rule',
];

export const ResourcesPage: React.FC = () => {
  const {
    insights,
    questions,
    topics,
    addInsight,
    updateInsight,
    deleteInsight,
    allTags,
  } = useAppStore();

  const { showToast } = useToast();

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [selectedTopicId, setSelectedTopicId] = useState<string>('All');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingInsight, setEditingInsight] = useState<KnowledgeInsight | null>(null);
  const [deletingInsight, setDeletingInsight] = useState<KnowledgeInsight | null>(null);
  const [viewingInsight, setViewingInsight] = useState<KnowledgeInsight | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<InsightCategory>('Algorithm Invariant');
  const [formContent, setFormContent] = useState('');
  const [formTopicId, setFormTopicId] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formSelectedQIds, setFormSelectedQIds] = useState<string[]>([]);

  // Filtered insights
  const filteredInsights = useMemo(() => {
    return insights.filter((ins) => {
      // Category filter
      if (selectedCategory !== 'All' && ins.category !== selectedCategory) return false;

      // Topic filter
      if (selectedTopicId !== 'All' && ins.topicId !== selectedTopicId) return false;

      // Tag filter
      if (selectedTag !== 'All' && !ins.tags.includes(selectedTag)) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = ins.title.toLowerCase().includes(q);
        const matchContent = ins.content.toLowerCase().includes(q);
        const matchTags = ins.tags.some((t) => t.toLowerCase().includes(q));
        if (!matchTitle && !matchContent && !matchTags) return false;
      }

      return true;
    });
  }, [insights, selectedCategory, selectedTopicId, selectedTag, searchQuery]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setFormTitle('');
    setFormCategory('Algorithm Invariant');
    setFormContent('');
    setFormTopicId(topics[0]?.id || '');
    setFormTags('');
    setFormSelectedQIds([]);
    setEditingInsight(null);
    setIsAddModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (ins: KnowledgeInsight) => {
    setFormTitle(ins.title);
    setFormCategory(ins.category || 'Algorithm Invariant');
    setFormContent(ins.content);
    setFormTopicId(ins.topicId || '');
    setFormTags(ins.tags.join(', '));
    setFormSelectedQIds(ins.associatedQuestionIds || []);
    setEditingInsight(ins);
    setIsAddModalOpen(true);
  };

  // Save Form
  const handleSaveInsight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) {
      showToast('Validation Error', 'Title and content are required.', 'warning');
      return;
    }

    const selectedTopic = topics.find((t) => t.id === formTopicId);
    const topicName = selectedTopic ? selectedTopic.name : undefined;

    const parsedTags = formTags
      .split(/[,#]/)
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingInsight) {
      updateInsight(editingInsight.id, {
        title: formTitle.trim(),
        category: formCategory,
        content: formContent.trim(),
        topicId: formTopicId || undefined,
        topicName,
        tags: parsedTags,
        associatedQuestionIds: formSelectedQIds,
      });
      showToast('Insight Updated', `"${formTitle.trim()}" updated successfully.`, 'success');
    } else {
      addInsight({
        title: formTitle.trim(),
        category: formCategory,
        content: formContent.trim(),
        topicId: formTopicId || undefined,
        topicName,
        tags: parsedTags,
        associatedQuestionIds: formSelectedQIds,
      });
      showToast('Knowledge Saved', `"${formTitle.trim()}" added to Knowledge Vault.`, 'success');
    }

    setIsAddModalOpen(false);
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!deletingInsight) return;
    deleteInsight(deletingInsight.id);
    showToast('Insight Removed', `"${deletingInsight.title}" deleted.`, 'info');
    setDeletingInsight(null);
  };

  // Toggle question selection in form
  const toggleQuestionLink = (qId: string) => {
    setFormSelectedQIds((prev) =>
      prev.includes(qId) ? prev.filter((id) => id !== qId) : [...prev, qId]
    );
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <PageHeader
        title="Knowledge Vault & Invariants"
        description="Searchable repository for high-leverage mental models, invariant rules, edge case checklists, and interview insights."
        actions={
          <Button
            variant="primary"
            size="md"
            iconLeft={<Plus size={16} />}
            onClick={handleOpenAdd}
          >
            Add Insight
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        {/* Search */}
        <div style={{ flex: 1, minWidth: '260px', maxWidth: '400px' }}>
          <Input
            placeholder="Search mental models, invariants, rules..."
            iconLeft={<Search size={14} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Dropdown Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ width: '180px' }}>
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              options={[
                { value: 'All', label: 'All Categories' },
                ...INSIGHT_CATEGORIES.map((c) => ({ value: c, label: c })),
              ]}
            />
          </div>

          <div style={{ width: '180px' }}>
            <Select
              value={selectedTopicId}
              onChange={(e) => setSelectedTopicId(e.target.value)}
              options={[
                { value: 'All', label: 'All Topics' },
                ...topics.map((t) => ({ value: t.id, label: t.name })),
              ]}
            />
          </div>

          {allTags.length > 0 && (
            <div style={{ width: '160px' }}>
              <Select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                options={[
                  { value: 'All', label: 'All Tags' },
                  ...allTags.map((t) => ({ value: t, label: `#${t}` })),
                ]}
              />
            </div>
          )}
        </div>
      </div>

      {/* Insights Cards Grid */}
      {filteredInsights.length === 0 ? (
        <EmptyState
          icon={<Lightbulb size={28} color="var(--color-primary)" />}
          title="No insights found in Vault"
          description="Capture rules like 'When I see X, consider Y' or common edge cases to build your personal coding wisdom."
          actionText="Add First Insight"
          onAction={handleOpenAdd}
        />
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 16,
          }}
        >
          {filteredInsights.map((ins) => {
            const linkedQuestions = questions.filter((q) =>
              (ins.associatedQuestionIds || []).includes(q.id)
            );

            return (
              <div
                key={ins.id}
                className="hover-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '20px',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--border-subtle)',
                  gap: 14,
                }}
              >
                {/* Top Strip: Category Badge + Topic + Actions */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Badge
                      variant={
                        ins.category === 'Algorithm Invariant'
                          ? 'primary'
                          : ins.category === 'Pattern Rule'
                          ? 'success'
                          : ins.category === 'Common Edge Cases'
                          ? 'warning'
                          : 'default'
                      }
                      size="sm"
                    >
                      {ins.category || 'Insight'}
                    </Badge>

                    {ins.topicName && (
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        {ins.topicName}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button
                      onClick={() => handleOpenEdit(ins)}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '5px' }}
                      title="Edit Insight"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => setDeletingInsight(ins)}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '5px', color: 'var(--color-danger)' }}
                      title="Delete Insight"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h3
                  onClick={() => setViewingInsight(ins)}
                  style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    margin: 0,
                    color: 'var(--text-primary)',
                    cursor: 'pointer',
                    lineHeight: 1.4,
                  }}
                >
                  {ins.title}
                </h3>

                {/* Content / Rule */}
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.6,
                    backgroundColor: 'var(--bg-subtle)',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    borderLeft: '3px solid var(--color-primary)',
                    whiteSpace: 'pre-wrap',
                    maxHeight: '130px',
                    overflowY: 'auto',
                  }}
                >
                  {ins.content}
                </div>

                {/* Associated Questions Strip */}
                {linkedQuestions.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Associated Questions ({linkedQuestions.length}):
                    </span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {linkedQuestions.map((q) => (
                        <span
                          key={q.id}
                          className="badge badge-default"
                          style={{ fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          title={`Difficulty: ${q.difficulty}`}
                        >
                          <BookOpen size={11} color="var(--color-primary)" />
                          <span>{q.title}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags & Date Footer */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid var(--border-subtle)',
                    paddingTop: 10,
                    marginTop: 4,
                  }}
                >
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {ins.tags.map((t, idx) => (
                      <span key={idx} style={{ fontSize: '11.5px', color: 'var(--color-primary)' }}>
                        #{t}
                      </span>
                    ))}
                  </div>

                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {new Date(ins.updatedAt || ins.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ADD / EDIT INSIGHT MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={editingInsight ? 'Edit Knowledge Insight' : 'Add Knowledge Vault Insight'}
        subtitle="Capture algorithmic invariants, mental models, and personal rules."
        maxWidth="640px"
      >
        <form onSubmit={handleSaveInsight} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Title */}
          <div>
            <label className="form-label">Insight Title / Rule Headline *</label>
            <Input
              placeholder="e.g. When I see X, consider Y / Monotonic Predicate Invariant"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              required
            />
          </div>

          {/* Category & Topic */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            <div>
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as InsightCategory)}
              >
                {INSIGHT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="form-label">Topic</label>
              <select
                className="form-select"
                value={formTopicId}
                onChange={(e) => setFormTopicId(e.target.value)}
              >
                <option value="">General / None</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Content / Invariant Body */}
          <div>
            <label className="form-label">Rule / Mental Model Observation *</label>
            <textarea
              className="form-input"
              style={{ minHeight: '130px', resize: 'vertical', fontSize: '13.5px', lineHeight: 1.6 }}
              placeholder="Explain the intuition, invariants, time/space trade-offs, and mental triggers..."
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              required
            />
          </div>

          {/* Tags */}
          <div>
            <label className="form-label">Tags (comma-separated)</label>
            <Input
              placeholder="e.g. Binary Search, Invariant, Optimization"
              value={formTags}
              onChange={(e) => setFormTags(e.target.value)}
            />
          </div>

          {/* Associated Questions Selector */}
          <div>
            <label className="form-label">Associate with Questions (Optional)</label>
            <div
              style={{
                maxHeight: '140px',
                overflowY: 'auto',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '8px',
                backgroundColor: 'var(--bg-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              {questions.map((q) => {
                const isChecked = formSelectedQIds.includes(q.id);
                return (
                  <label
                    key={q.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '4px 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isChecked ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                      cursor: 'pointer',
                      fontSize: '12.5px',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleQuestionLink(q.id)}
                    />
                    <span style={{ fontWeight: isChecked ? 600 : 400, color: 'var(--text-primary)' }}>
                      {q.title}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      ({q.topicName})
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <Button variant="secondary" size="md" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="md" type="submit">
              {editingInsight ? 'Save Changes' : 'Save Insight'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* VIEW INSIGHT FULL MODAL */}
      {viewingInsight && (
        <Modal
          isOpen={Boolean(viewingInsight)}
          onClose={() => setViewingInsight(null)}
          title={viewingInsight.title}
          subtitle={`${viewingInsight.category || 'Insight'} • ${viewingInsight.topicName || 'General'}`}
          maxWidth="640px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div
              style={{
                fontSize: '14px',
                color: 'var(--text-primary)',
                lineHeight: 1.7,
                backgroundColor: 'var(--bg-subtle)',
                padding: '16px 18px',
                borderRadius: 'var(--radius-md)',
                whiteSpace: 'pre-wrap',
                borderLeft: '4px solid var(--color-primary)',
              }}
            >
              {viewingInsight.content}
            </div>

            {viewingInsight.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {viewingInsight.tags.map((t, idx) => (
                  <span key={idx} className="badge badge-default">
                    #{t}
                  </span>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button variant="secondary" size="md" onClick={() => setViewingInsight(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      <ConfirmationDialog
        isOpen={Boolean(deletingInsight)}
        title="Delete Knowledge Insight?"
        description={`Are you sure you want to delete "${deletingInsight?.title}" from the Knowledge Vault?`}
        confirmText="Delete Insight"
        cancelText="Cancel"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingInsight(null)}
      />
    </div>
  );
};
