import React, { useState, useMemo } from 'react';
import {
  FolderTree,
  Plus,
  Edit2,
  Trash2,
  ExternalLink,
  Calendar,
  Layers,
  FolderPlus,
  FileCode,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Button } from '../components/ui/Button';
import { IconButton } from '../components/ui/IconButton';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { ConfirmationDialog } from '../components/ui/ConfirmationDialog';
import { EmptyState } from '../components/ui/EmptyState';
import { useAppStore } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { addDays, normalizeDate } from '../services/spacedRepetition';
import type { Topic, Problem, Difficulty } from '../types';

export const TopicsPage: React.FC = () => {
  const {
    topics,
    problems,
    addTopic,
    updateTopic,
    deleteTopic,
    selectedTopicId,
    setSelectedTopicId,
    addProblem,
    updateProblem,
    deleteProblem,
  } = useAppStore();

  const { showToast } = useToast();

  // Topic modals
  const [isAddTopicModalOpen, setIsAddTopicModalOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [deletingTopic, setDeletingTopic] = useState<Topic | null>(null);
  const [topicNameInput, setTopicNameInput] = useState('');

  // Problem modals
  const [isAddProblemModalOpen, setIsAddProblemModalOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<Problem | null>(null);
  const [deletingProblem, setDeletingProblem] = useState<Problem | null>(null);

  // Problem Form state
  const [problemTitle, setProblemTitle] = useState('');
  const [problemLink, setProblemLink] = useState('');
  const [problemDifficulty, setProblemDifficulty] = useState<Difficulty>('Medium');
  const [problemPattern, setProblemPattern] = useState('');
  const [problemSolvedDate, setProblemSolvedDate] = useState(() => normalizeDate(new Date()));
  const [problemSolvedTime, setProblemSolvedTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [problemNextReviewDate, setProblemNextReviewDate] = useState(() => addDays(new Date(), 1));

  // Sort topics chronologically (newly added topics appear at the bottom)
  const sortedTopics = useMemo(() => {
    return [...topics].sort(
      (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
    );
  }, [topics]);

  // Effective selected topic (defaults to the first topic if available, or currently selected)
  const currentTopic = sortedTopics.find((t) => t.id === selectedTopicId) || (sortedTopics.length > 0 ? sortedTopics[0] : null);
  const currentTopicProblems = currentTopic ? problems.filter((p) => p.topicId === currentTopic.id) : [];

  // ------------------------------------------------------------------------
  // TOPIC HANDLERS
  // ------------------------------------------------------------------------
  const handleOpenAddTopic = () => {
    setTopicNameInput('');
    setIsAddTopicModalOpen(true);
  };

  const handleSaveAddTopic = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = topicNameInput.trim();
    if (!trimmed) return;

    const newTopic = addTopic(trimmed);
    setSelectedTopicId(newTopic.id);
    showToast('Topic Created', `"${trimmed}" topic created.`, 'success');
    setIsAddTopicModalOpen(false);
  };

  const handleOpenEditTopic = (topic: Topic) => {
    setEditingTopic(topic);
    setTopicNameInput(topic.name);
  };

  const handleSaveEditTopic = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTopic || !topicNameInput.trim()) return;

    updateTopic(editingTopic.id, topicNameInput.trim());
    showToast('Topic Updated', `Renamed to "${topicNameInput.trim()}".`, 'success');
    setEditingTopic(null);
  };

  const handleConfirmDeleteTopic = () => {
    if (!deletingTopic) return;
    deleteTopic(deletingTopic.id);
    showToast('Topic Deleted', `"${deletingTopic.name}" removed.`, 'warning');
    setDeletingTopic(null);
  };

  // ------------------------------------------------------------------------
  // PROBLEM HANDLERS
  // ------------------------------------------------------------------------
  const handleOpenAddProblem = () => {
    if (!currentTopic) return;
    const now = new Date();
    const todayStr = normalizeDate(now);
    setProblemTitle('');
    setProblemLink('');
    setProblemDifficulty('Medium');
    setProblemPattern('');
    setProblemSolvedDate(todayStr);
    setProblemSolvedTime(
      `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    );
    setProblemNextReviewDate(addDays(todayStr, 1));
    setIsAddProblemModalOpen(true);
  };

  const handleSaveAddProblem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTopic || !problemTitle.trim()) return;

    const combinedIso = new Date(`${problemSolvedDate}T${problemSolvedTime}:00`).toISOString();

    addProblem({
      topicId: currentTopic.id,
      topicName: currentTopic.name,
      title: problemTitle.trim(),
      link: problemLink.trim() || undefined,
      difficulty: problemDifficulty,
      pattern: problemPattern.trim() || undefined,
      solvedAt: combinedIso,
      nextReviewAt: problemNextReviewDate || addDays(problemSolvedDate, 1),
    });

    showToast('Problem Added', `"${problemTitle.trim()}" logged and revision scheduled.`, 'success');
    setIsAddProblemModalOpen(false);
  };

  const handleOpenEditProblem = (problem: Problem) => {
    setEditingProblem(problem);
    setProblemTitle(problem.title);
    setProblemLink(problem.link || '');
    setProblemDifficulty(problem.difficulty);
    setProblemPattern(problem.pattern || '');

    const d = new Date(problem.solvedAt);
    const validDate = !isNaN(d.getTime());
    setProblemSolvedDate(validDate ? normalizeDate(d) : normalizeDate(new Date()));
    setProblemSolvedTime(
      validDate
        ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
        : '12:00'
    );
    setProblemNextReviewDate(problem.nextReviewAt || addDays(new Date(), 1));
  };

  const handleSaveEditProblem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProblem || !problemTitle.trim()) return;

    const combinedIso = new Date(`${problemSolvedDate}T${problemSolvedTime}:00`).toISOString();

    updateProblem(editingProblem.id, {
      title: problemTitle.trim(),
      link: problemLink.trim() || undefined,
      difficulty: problemDifficulty,
      pattern: problemPattern.trim() || undefined,
      solvedAt: combinedIso,
      nextReviewAt: problemNextReviewDate || editingProblem.nextReviewAt,
    });

    showToast('Problem Updated', `Changes to "${problemTitle.trim()}" saved.`, 'success');
    setEditingProblem(null);
  };

  const handleConfirmDeleteProblem = () => {
    if (!deletingProblem) return;
    deleteProblem(deletingProblem.id);
    showToast('Problem Deleted', `"${deletingProblem.title}" removed.`, 'warning');
    setDeletingProblem(null);
  };

  const getDifficultyVariant = (diff: Difficulty) => {
    switch (diff) {
      case 'Easy':
        return 'success';
      case 'Medium':
        return 'warning';
      case 'Hard':
        return 'danger';
      default:
        return 'default';
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <PageHeader
        title="Topics & Problems"
        description="Organize your curriculum by topics and manage coding problems with automatic spaced-repetition revision."
        actions={
          <Button
            variant="primary"
            size="md"
            iconLeft={<Plus size={16} />}
            onClick={handleOpenAddTopic}
          >
            New Topic
          </Button>
        }
      />

      {topics.length === 0 ? (
        <EmptyState
          icon={<FolderTree size={28} />}
          title="No topics yet"
          description="Create your first topic to start logging problems."
          actionText="Create First Topic"
          actionIcon={<FolderPlus size={16} />}
          onAction={handleOpenAddTopic}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20, alignItems: 'start' }}>
          {/* Left Column: Topics List Sidebar */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '14px 16px',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-subtle)',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Topics ({topics.length})
              </span>
              <IconButton
                icon={<Plus size={14} />}
                label="Add Topic"
                size="sm"
                onClick={handleOpenAddTopic}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
              {sortedTopics.map((t) => {
                const count = problems.filter((p) => p.topicId === t.id).length;
                const isSelected = currentTopic?.id === t.id;

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTopicId(t.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-subtle)',
                      backgroundColor: isSelected ? 'var(--bg-subtle)' : 'transparent',
                      borderLeft: isSelected ? '3px solid var(--color-primary)' : '3px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, overflow: 'hidden' }}>
                      <FolderTree size={16} color={isSelected ? 'var(--color-primary)' : 'var(--text-muted)'} />
                      <span
                        style={{
                          fontSize: '13.5px',
                          fontWeight: isSelected ? 600 : 500,
                          color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {t.name}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span
                        style={{
                          fontSize: '11.5px',
                          fontWeight: 600,
                          color: 'var(--text-muted)',
                          backgroundColor: 'var(--bg-main)',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        {count}
                      </span>
                      <IconButton
                        icon={<Edit2 size={13} />}
                        label="Rename topic"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditTopic(t);
                        }}
                      />
                      <IconButton
                        icon={<Trash2 size={13} color="var(--color-danger)" />}
                        label="Delete topic"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingTopic(t);
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Problems in Selected Topic */}
          <div
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              padding: 20,
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            {currentTopic ? (
              <>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 10,
                    borderBottom: '1px solid var(--border-color)',
                    paddingBottom: 16,
                  }}
                >
                  <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                      {currentTopic.name}
                    </h2>
                    <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                      {currentTopicProblems.length} problem{currentTopicProblems.length === 1 ? '' : 's'} logged
                    </span>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    iconLeft={<Plus size={14} />}
                    onClick={handleOpenAddProblem}
                  >
                    Add Problem
                  </Button>
                </div>

                {currentTopicProblems.length === 0 ? (
                  <EmptyState
                    icon={<FileCode size={24} />}
                    title="No problems in this topic yet"
                    description="Add your first problem to schedule its revision."
                    actionText="Add Problem"
                    actionIcon={<Plus size={15} />}
                    onAction={handleOpenAddProblem}
                  />
                ) : (
                  <div className="table-container">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Problem</th>
                          <th>Difficulty</th>
                          <th>Pattern</th>
                          <th>Date & Time Solved</th>
                          <th>Next Revision</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentTopicProblems.map((problem) => {
                          const solvedDateObj = new Date(problem.solvedAt);
                          const formattedSolvedDate = !isNaN(solvedDateObj.getTime())
                            ? solvedDateObj.toLocaleDateString()
                            : problem.solvedAt;
                          const formattedSolvedTime = !isNaN(solvedDateObj.getTime())
                            ? solvedDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            : '';

                          return (
                            <tr key={problem.id}>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13.5px' }}>
                                    {problem.title}
                                  </span>
                                  {problem.link && (
                                    <a
                                      href={problem.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{ color: 'var(--color-primary)', display: 'inline-flex' }}
                                      title="Open problem link"
                                    >
                                      <ExternalLink size={13} />
                                    </a>
                                  )}
                                </div>
                              </td>

                              <td>
                                <Badge variant={getDifficultyVariant(problem.difficulty)}>
                                  {problem.difficulty}
                                </Badge>
                              </td>

                              <td>
                                {problem.pattern ? (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: 5,
                                      fontSize: '12px',
                                      fontWeight: 500,
                                      color: 'var(--text-secondary)',
                                    }}
                                  >
                                    <Layers size={13} color="var(--color-primary)" />
                                    {problem.pattern}
                                  </span>
                                ) : (
                                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>-</span>
                                )}
                              </td>

                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <span style={{ fontSize: '12.5px', color: 'var(--text-primary)' }}>
                                    {formattedSolvedDate}
                                  </span>
                                  {formattedSolvedTime && (
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                      {formattedSolvedTime}
                                    </span>
                                  )}
                                </div>
                              </td>

                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <Calendar size={13} color="var(--text-muted)" />
                                  <span style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--text-primary)' }}>
                                    {problem.nextReviewAt || 'Scheduled'}
                                  </span>
                                </div>
                              </td>

                              <td style={{ textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: 4 }}>
                                  <IconButton
                                    icon={<Edit2 size={14} />}
                                    label="Edit problem"
                                    size="sm"
                                    onClick={() => handleOpenEditProblem(problem)}
                                  />
                                  <IconButton
                                    icon={<Trash2 size={14} color="var(--color-danger)" />}
                                    label="Delete problem"
                                    size="sm"
                                    onClick={() => setDeletingProblem(problem)}
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
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* CREATE TOPIC MODAL */}
      <Modal
        isOpen={isAddTopicModalOpen}
        onClose={() => setIsAddTopicModalOpen(false)}
        title="Create Topic"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={() => setIsAddTopicModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveAddTopic}>
              Create Topic
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveAddTopic} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="Topic Name"
            placeholder="e.g. Dynamic Programming, Graphs, Two Pointers"
            value={topicNameInput}
            onChange={(e) => setTopicNameInput(e.target.value)}
            required
            autoFocus
          />
        </form>
      </Modal>

      {/* EDIT / RENAME TOPIC MODAL */}
      <Modal
        isOpen={Boolean(editingTopic)}
        onClose={() => setEditingTopic(null)}
        title="Rename Topic"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={() => setEditingTopic(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveEditTopic}>
              Save Name
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveEditTopic} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="Topic Name"
            value={topicNameInput}
            onChange={(e) => setTopicNameInput(e.target.value)}
            required
            autoFocus
          />
        </form>
      </Modal>

      {/* DELETE TOPIC DIALOG */}
      <ConfirmationDialog
        isOpen={Boolean(deletingTopic)}
        title={`Delete Topic "${deletingTopic?.name}"?`}
        description={`Are you sure you want to delete "${deletingTopic?.name}" and all problems inside it? This cannot be undone.`}
        confirmText="Delete Topic"
        cancelText="Cancel"
        onConfirm={handleConfirmDeleteTopic}
        onCancel={() => setDeletingTopic(null)}
      />

      {/* ADD PROBLEM MODAL */}
      <Modal
        isOpen={isAddProblemModalOpen}
        onClose={() => setIsAddProblemModalOpen(false)}
        title={`Add Problem to "${currentTopic?.name}"`}
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={() => setIsAddProblemModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveAddProblem}>
              Save Problem
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveAddProblem} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="Problem Title"
            placeholder="e.g. Two Sum, Longest Substring Without Repeating Characters"
            value={problemTitle}
            onChange={(e) => setProblemTitle(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Problem Link (Optional)"
            placeholder="https://leetcode.com/problems/..."
            value={problemLink}
            onChange={(e) => setProblemLink(e.target.value)}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">
                <span>Difficulty</span>
              </label>
              <select
                className="form-select"
                value={problemDifficulty}
                onChange={(e) => setProblemDifficulty(e.target.value as Difficulty)}
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <Input
              label="Pattern (Optional)"
              placeholder="e.g. Sliding Window, Two Pointers"
              value={problemPattern}
              onChange={(e) => setProblemPattern(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              type="date"
              label="Date Solved"
              value={problemSolvedDate}
              onChange={(e) => {
                const newSolvedDate = e.target.value;
                setProblemSolvedDate(newSolvedDate);
                if (newSolvedDate) {
                  setProblemNextReviewDate(addDays(newSolvedDate, 1));
                }
              }}
              required
            />

            <Input
              type="time"
              label="Time Solved"
              value={problemSolvedTime}
              onChange={(e) => setProblemSolvedTime(e.target.value)}
              required
            />
          </div>

          <Input
            type="date"
            label="Scheduled First Revision Date (Editable)"
            value={problemNextReviewDate}
            onChange={(e) => setProblemNextReviewDate(e.target.value)}
            required
          />
        </form>
      </Modal>

      {/* EDIT PROBLEM MODAL */}
      <Modal
        isOpen={Boolean(editingProblem)}
        onClose={() => setEditingProblem(null)}
        title="Edit Problem"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={() => setEditingProblem(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveEditProblem}>
              Update Problem
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveEditProblem} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="Problem Title"
            value={problemTitle}
            onChange={(e) => setProblemTitle(e.target.value)}
            required
            autoFocus
          />

          <Input
            label="Problem Link (Optional)"
            value={problemLink}
            onChange={(e) => setProblemLink(e.target.value)}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">
                <span>Difficulty</span>
              </label>
              <select
                className="form-select"
                value={problemDifficulty}
                onChange={(e) => setProblemDifficulty(e.target.value as Difficulty)}
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>

            <Input
              label="Pattern (Optional)"
              placeholder="e.g. Sliding Window, Two Pointers"
              value={problemPattern}
              onChange={(e) => setProblemPattern(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              type="date"
              label="Date Solved"
              value={problemSolvedDate}
              onChange={(e) => setProblemSolvedDate(e.target.value)}
              required
            />

            <Input
              type="time"
              label="Time Solved"
              value={problemSolvedTime}
              onChange={(e) => setProblemSolvedTime(e.target.value)}
              required
            />
          </div>

          <Input
            type="date"
            label="Scheduled Revision Date (Editable)"
            value={problemNextReviewDate}
            onChange={(e) => setProblemNextReviewDate(e.target.value)}
            required
          />
        </form>
      </Modal>

      {/* DELETE PROBLEM DIALOG */}
      <ConfirmationDialog
        isOpen={Boolean(deletingProblem)}
        title={`Delete Problem "${deletingProblem?.title}"?`}
        description={`Are you sure you want to delete "${deletingProblem?.title}"? Its revision history will also be removed.`}
        confirmText="Delete Problem"
        cancelText="Cancel"
        onConfirm={handleConfirmDeleteProblem}
        onCancel={() => setDeletingProblem(null)}
      />
    </div>
  );
};
