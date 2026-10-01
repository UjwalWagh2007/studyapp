import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Plus,
  Edit2,
  Archive,
  Trash2,
  FolderPlus,
  ArrowRight,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { useAppStore } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import type { Topic } from '../../types';

export const TopicsPage: React.FC = () => {
  const {
    topics,
    questions,
    addTopic,
    updateTopic,
    archiveTopic,
    deleteTopicSafely,
    navigateTo,
    allSubjects,
    setSelectedTopicFilter,
  } = useAppStore();

  const { showToast } = useToast();

  // Filters & Tabs (Active vs Archived)
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [selectedSubject, setSelectedSubject] = useState<string>('All');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [deletingTopic, setDeletingTopic] = useState<Topic | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formSubject, setFormSubject] = useState('Data Structures & Algorithms');
  const [formDesc, setFormDesc] = useState('');
  const [formColor, setFormColor] = useState('#6366f1');

  // Filtered topics
  const filteredTopics = useMemo(() => {
    return topics.filter((t) => {
      const matchArchived = activeTab === 'archived' ? t.isArchived : !t.isArchived;
      const matchSubject = selectedSubject === 'All' || t.subject === selectedSubject;
      return matchArchived && matchSubject;
    });
  }, [topics, activeTab, selectedSubject]);

  // Handle open add modal
  const handleOpenAdd = () => {
    setFormName('');
    setFormSubject(allSubjects[0] || 'Data Structures & Algorithms');
    setFormDesc('');
    setFormColor('#6366f1');
    setIsAddModalOpen(true);
  };

  // Handle submit add
  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    addTopic({
      name: formName.trim(),
      subject: formSubject.trim() || 'Data Structures & Algorithms',
      description: formDesc.trim() || undefined,
      color: formColor,
      isArchived: false,
    });

    showToast('Topic Created', `"${formName.trim()}" added to syllabus.`, 'success');
    setIsAddModalOpen(false);
  };

  // Handle open edit
  const handleOpenEdit = (topic: Topic) => {
    setEditingTopic(topic);
    setFormName(topic.name);
    setFormSubject(topic.subject);
    setFormDesc(topic.description || '');
    setFormColor(topic.color || '#6366f1');
  };

  // Handle submit edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTopic || !formName.trim()) return;

    updateTopic(editingTopic.id, {
      name: formName.trim(),
      subject: formSubject.trim() || 'Data Structures & Algorithms',
      description: formDesc.trim() || undefined,
      color: formColor,
    });

    showToast('Topic Updated', `Changes to "${formName.trim()}" saved.`, 'success');
    setEditingTopic(null);
  };

  // Handle archive toggle
  const handleToggleArchive = (topic: Topic) => {
    const nextState = !topic.isArchived;
    archiveTopic(topic.id, nextState);
    showToast(
      nextState ? 'Topic Archived' : 'Topic Restored',
      `"${topic.name}" moved to ${nextState ? 'archived' : 'active'} list.`,
      'info'
    );
  };

  // Handle confirm delete
  const handleConfirmDelete = () => {
    if (!deletingTopic) return;
    const result = deleteTopicSafely(deletingTopic.id);
    showToast(
      'Topic Deleted',
      result.questionsPreserved > 0
        ? `"${deletingTopic.name}" deleted. ${result.questionsPreserved} linked question(s) preserved in Uncategorized.`
        : `"${deletingTopic.name}" removed.`,
      'warning'
    );
    setDeletingTopic(null);
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <PageHeader
        title="Curriculum Topics"
        description="Structured syllabus topics hierarchy (Subject → Topic → Questions) with mastery tracking."
        actions={
          <Button
            variant="primary"
            size="md"
            iconLeft={<Plus size={16} />}
            onClick={handleOpenAdd}
          >
            Add Topic
          </Button>
        }
      />

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
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <button
            className={`btn btn-sm ${activeTab === 'active' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('active')}
          >
            Active Topics ({topics.filter((t) => !t.isArchived).length})
          </button>
          <button
            className={`btn btn-sm ${activeTab === 'archived' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('archived')}
          >
            Archived ({topics.filter((t) => t.isArchived).length})
          </button>
        </div>

        {allSubjects.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>Subject:</span>
            <select
              className="form-select"
              style={{ width: 'auto', padding: '5px 10px', fontSize: '12.5px' }}
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
            >
              <option value="All">All Subjects</option>
              {allSubjects.map((sub) => (
                <option key={sub} value={sub}>
                  {sub}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Topics Table / List View */}
      {filteredTopics.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={24} />}
          title={activeTab === 'archived' ? 'No archived topics' : 'No curriculum topics yet'}
          description={
            activeTab === 'archived'
              ? 'Topics you archive will appear here safely for recovery.'
              : 'Create topics like Sliding Window, Dynamic Programming, or Graphs to categorize questions.'
          }
          actionText={activeTab === 'active' ? 'Create First Topic' : undefined}
          actionIcon={<FolderPlus size={15} />}
          onAction={activeTab === 'active' ? handleOpenAdd : undefined}
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Topic Name</th>
                <th>Subject</th>
                <th>Questions</th>
                <th>Due / In Review</th>
                <th>Mastery</th>
                <th>Last Activity</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTopics.map((topic) => {
                const topicQuestions = questions.filter((q) => q.topicId === topic.id);
                const dueCount = topicQuestions.filter(
                  (q) => q.status === 'REVIEWING' || q.status === 'LEARNING' || q.status === 'NEW'
                ).length;
                const totalMastery = topicQuestions.reduce((sum, q) => sum + q.mastery, 0);
                const avgMasteryPercent =
                  topicQuestions.length > 0
                    ? Math.round((totalMastery / (topicQuestions.length * 5)) * 100)
                    : 0;

                const lastActivity = topicQuestions.length > 0
                  ? new Date(
                      Math.max(...topicQuestions.map((q) => new Date(q.updatedAt || q.createdAt).getTime()))
                    ).toLocaleDateString()
                  : new Date(topic.updatedAt || topic.createdAt).toLocaleDateString();

                return (
                  <tr key={topic.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            backgroundColor: topic.color || 'var(--color-primary)',
                            flexShrink: 0,
                          }}
                        />
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13.5px' }}>
                            {topic.name}
                          </span>
                          {topic.description && (
                            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                              {topic.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>
                      <Badge variant="default">{topic.subject}</Badge>
                    </td>

                    <td>
                      <button
                        onClick={() => {
                          setSelectedTopicFilter(topic.id);
                          navigateTo('learn/questions');
                        }}
                        style={{
                          fontWeight: 600,
                          color: 'var(--color-primary)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontSize: '13px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                        }}
                        title={`View ${topicQuestions.length} questions in ${topic.name}`}
                      >
                        <span>{topicQuestions.length}</span>
                        <ArrowRight size={12} />
                      </button>
                    </td>

                    <td>
                      {dueCount > 0 ? (
                        <Badge variant="warning">{dueCount} Due</Badge>
                      ) : (
                        <Badge variant="success">All caught up</Badge>
                      )}
                    </td>

                    <td style={{ minWidth: '130px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {avgMasteryPercent}%
                        </span>
                        <ProgressBar value={avgMasteryPercent} max={100} size="sm" variant="primary" />
                      </div>
                    </td>

                    <td>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {lastActivity}
                      </span>
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 4 }}>
                        <IconButton
                          icon={<Edit2 size={14} />}
                          label="Rename & Edit topic"
                          size="sm"
                          onClick={() => handleOpenEdit(topic)}
                        />
                        <IconButton
                          icon={<Archive size={14} />}
                          label={topic.isArchived ? 'Restore topic' : 'Archive topic'}
                          size="sm"
                          onClick={() => handleToggleArchive(topic)}
                        />
                        <IconButton
                          icon={<Trash2 size={14} color="var(--color-danger)" />}
                          label="Delete topic"
                          size="sm"
                          onClick={() => setDeletingTopic(topic)}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE TOPIC MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Curriculum Topic"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveAdd}>
              Save Topic
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveAdd} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="Topic Name"
            placeholder="e.g. Sliding Window, Modified Binary Search"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Subject Area"
            placeholder="e.g. Data Structures & Algorithms, System Design"
            value={formSubject}
            onChange={(e) => setFormSubject(e.target.value)}
            required
          />

          <Input
            label="Topic Description"
            placeholder="Brief overview of constraints, patterns, or formulas..."
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
          />

          <div className="form-group">
            <label className="form-label">
              <span>Accent Color Tag</span>
            </label>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              {['#6366f1', '#38bdf8', '#10b981', '#f59e0b', '#ec4899', '#a855f7'].map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setFormColor(col)}
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    backgroundColor: col,
                    border: formColor === col ? '2px solid var(--text-primary)' : '2px solid transparent',
                    cursor: 'pointer',
                  }}
                  aria-label={`Select color ${col}`}
                />
              ))}
            </div>
          </div>
        </form>
      </Modal>

      {/* EDIT / RENAME TOPIC MODAL */}
      <Modal
        isOpen={Boolean(editingTopic)}
        onClose={() => setEditingTopic(null)}
        title="Rename & Edit Topic"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={() => setEditingTopic(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveEdit}>
              Update Topic
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="Topic Name"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Subject Area"
            value={formSubject}
            onChange={(e) => setFormSubject(e.target.value)}
            required
          />

          <Input
            label="Topic Description"
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
          />
        </form>
      </Modal>

      {/* SAFETY CONFIRMATION DIALOG FOR DELETE */}
      <ConfirmationDialog
        isOpen={Boolean(deletingTopic)}
        title={`Delete Topic "${deletingTopic?.name}"?`}
        description={`Are you sure you want to delete "${deletingTopic?.name}"? Any linked questions will NOT be destroyed — they will be safely preserved and moved to "Uncategorized".`}
        confirmText="Delete Topic"
        cancelText="Keep Topic"
        allowArchiveAlternative={true}
        onArchiveInstead={() => {
          if (deletingTopic) {
            handleToggleArchive(deletingTopic);
            setDeletingTopic(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingTopic(null)}
      />
    </div>
  );
};
