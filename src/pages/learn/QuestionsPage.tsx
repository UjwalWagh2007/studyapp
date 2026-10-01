import React, { useState, useMemo } from 'react';
import {
  FileText,
  Plus,
  Search,
  ExternalLink,
  Edit2,
  Archive,
  Trash2,
  X,
  Lightbulb,
  AlertTriangle,
  History,
  Tag as TagIcon,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import { Badge } from '../../components/ui/Badge';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { ConfirmationDialog } from '../../components/ui/ConfirmationDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAppStore } from '../../context/AppContext';
import { useToast } from '../../context/ToastContext';
import type {
  Question,
  Difficulty,
  QuestionSource,
  QuestionStatus,
  StandardPattern,
  MistakeCategory,
} from '../../types';

const PATTERNS_LIST: StandardPattern[] = [
  'Two Pointers',
  'Sliding Window',
  'Fast & Slow Pointers',
  'Merge Intervals',
  'Cyclic Sort',
  'In-place Reversal of LinkedList',
  'Tree BFS',
  'Tree DFS',
  'Two Heaps',
  'Subsets & Backtracking',
  'Modified Binary Search',
  'Top K Elements',
  'K-way Merge',
  '0/1 Knapsack',
  'Unbounded Knapsack',
  'Fibonacci DP',
  'Longest Common Subsequence DP',
  'Palindromic DP',
  'Topological Sort',
  'Union Find / Disjoint Set',
  'Prefix Sum / Monotonic Stack',
  'Bit Manipulation',
  'Trie',
  'Graph Shortest Paths',
  'Other',
];

export const QuestionsPage: React.FC = () => {
  const {
    questions,
    topics,
    addQuestion,
    updateQuestion,
    archiveQuestion,
    deleteQuestion,
    allSubjects,
    allTags,
    selectedTopicFilter,
    setSelectedTopicFilter,
    mistakes,
    addMistake,
    toggleMistakeResolved,
    insights,
  } = useAppStore();

  const { showToast } = useToast();

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All');
  const selectedTopicId = selectedTopicFilter;
  const setSelectedTopicId = setSelectedTopicFilter;
  const [selectedDifficulty, setSelectedDifficulty] = useState('All');
  const [selectedPattern, setSelectedPattern] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedTag, setSelectedTag] = useState('All');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [viewingQuestion, setViewingQuestion] = useState<Question | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState<Question | null>(null);

  // Mistake quick logger modal inside detail
  const [isQuickMistakeOpen, setIsQuickMistakeOpen] = useState(false);
  const [quickMistakeCategory, setQuickMistakeCategory] = useState<MistakeCategory>("Logic error");
  const [quickMistakeNotes, setQuickMistakeNotes] = useState('');

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formSubject, setFormSubject] = useState('Data Structures & Algorithms');
  const [formTopicId, setFormTopicId] = useState('');
  const [formDifficulty, setFormDifficulty] = useState<Difficulty>('Medium');
  const [formPattern, setFormPattern] = useState<string>('Two Pointers');
  const [formSource, setFormSource] = useState<QuestionSource>('LeetCode');
  const [formUrl, setFormUrl] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formTimeEst, setFormTimeEst] = useState('25');
  const [formNotes, setFormNotes] = useState('');
  const [formInsight, setFormInsight] = useState('');
  const [formStatus, setFormStatus] = useState<QuestionStatus>('NEW');
  const [formMastery, setFormMastery] = useState<number>(0);

  const activeTopics = useMemo(() => topics.filter((t) => !t.isArchived), [topics]);

  // Check if any filters are active
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedSubject !== 'All' ||
    selectedTopicId !== 'All' ||
    selectedDifficulty !== 'All' ||
    selectedPattern !== 'All' ||
    selectedStatus !== 'All' ||
    selectedTag !== 'All';

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedSubject('All');
    setSelectedTopicId('All');
    setSelectedDifficulty('All');
    setSelectedPattern('All');
    setSelectedStatus('All');
    setSelectedTag('All');
  };

  // Filtered questions computation
  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const qTitle = q.title.toLowerCase();
      const qNotes = (q.notes || '').toLowerCase();
      const qInsight = (q.importantInsight || '').toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      const matchSearch =
        !query ||
        qTitle.includes(query) ||
        qNotes.includes(query) ||
        qInsight.includes(query) ||
        q.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        q.pattern.toLowerCase().includes(query);

      const matchSubject = selectedSubject === 'All' || q.subject === selectedSubject;
      const matchTopic = selectedTopicId === 'All' || q.topicId === selectedTopicId;
      const matchDifficulty = selectedDifficulty === 'All' || q.difficulty === selectedDifficulty;
      const matchPattern = selectedPattern === 'All' || q.pattern === selectedPattern;
      const matchStatus = selectedStatus === 'All' || q.status === selectedStatus;
      const matchTag = selectedTag === 'All' || q.tags.includes(selectedTag);

      return (
        matchSearch &&
        matchSubject &&
        matchTopic &&
        matchDifficulty &&
        matchPattern &&
        matchStatus &&
        matchTag
      );
    });
  }, [
    questions,
    searchQuery,
    selectedSubject,
    selectedTopicId,
    selectedDifficulty,
    selectedPattern,
    selectedStatus,
    selectedTag,
  ]);

  // Open Add modal
  const handleOpenAdd = () => {
    setFormTitle('');
    setFormSubject(allSubjects[0] || 'Data Structures & Algorithms');
    setFormTopicId(activeTopics[0]?.id || '');
    setFormDifficulty('Medium');
    setFormPattern('Two Pointers');
    setFormSource('LeetCode');
    setFormUrl('');
    setFormTags('');
    setFormTimeEst('25');
    setFormNotes('');
    setFormInsight('');
    setFormStatus('NEW');
    setFormMastery(0);
    setIsAddModalOpen(true);
  };

  // Submit Add
  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const matchedTopic = topics.find((t) => t.id === formTopicId);
    const parsedTags = formTags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => Boolean(t));

    addQuestion({
      title: formTitle.trim(),
      subject: formSubject.trim() || 'Data Structures & Algorithms',
      topicId: formTopicId,
      topicName: matchedTopic ? matchedTopic.name : 'Uncategorized',
      difficulty: formDifficulty,
      pattern: formPattern,
      source: formSource,
      url: formUrl.trim() || undefined,
      tags: parsedTags.length > 0 ? parsedTags : [formPattern],
      estimatedSolvingTimeMinutes: parseInt(formTimeEst) || 25,
      notes: formNotes.trim(),
      importantInsight: formInsight.trim() || undefined,
      status: formStatus,
      mastery: formMastery,
      isArchived: formStatus === 'ARCHIVED',
    });

    showToast('Question Enrolled', `"${formTitle.trim()}" added to question bank.`, 'success');
    setIsAddModalOpen(false);
  };

  // Open Edit modal
  const handleOpenEdit = (q: Question) => {
    setEditingQuestion(q);
    setFormTitle(q.title);
    setFormSubject(q.subject);
    setFormTopicId(q.topicId);
    setFormDifficulty(q.difficulty);
    setFormPattern(q.pattern);
    setFormSource(q.source);
    setFormUrl(q.url || '');
    setFormTags(q.tags.join(', '));
    setFormTimeEst(String(q.estimatedSolvingTimeMinutes || 25));
    setFormNotes(q.notes);
    setFormInsight(q.importantInsight || '');
    setFormStatus(q.status);
    setFormMastery(q.mastery);
  };

  // Submit Edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion || !formTitle.trim()) return;

    const matchedTopic = topics.find((t) => t.id === formTopicId);
    const parsedTags = formTags
      .split(',')
      .map((t) => t.trim())
      .filter((t) => Boolean(t));

    const updates: Partial<Question> = {
      title: formTitle.trim(),
      subject: formSubject.trim(),
      topicId: formTopicId,
      topicName: matchedTopic ? matchedTopic.name : 'Uncategorized',
      difficulty: formDifficulty,
      pattern: formPattern,
      source: formSource,
      url: formUrl.trim() || undefined,
      tags: parsedTags,
      estimatedSolvingTimeMinutes: parseInt(formTimeEst) || 25,
      notes: formNotes.trim(),
      importantInsight: formInsight.trim() || undefined,
      status: formStatus,
      mastery: formMastery,
      isArchived: formStatus === 'ARCHIVED',
    };

    updateQuestion(editingQuestion.id, updates);

    // Update active viewing detail modal if currently open
    if (viewingQuestion && viewingQuestion.id === editingQuestion.id) {
      setViewingQuestion({ ...viewingQuestion, ...updates } as Question);
    }

    showToast('Question Updated', `Saved changes to "${formTitle.trim()}".`, 'success');
    setEditingQuestion(null);
  };

  // Toggle archive
  const handleToggleArchive = (q: Question) => {
    const nextArchive = !q.isArchived;
    archiveQuestion(q.id, nextArchive);
    showToast(
      nextArchive ? 'Question Archived' : 'Question Restored',
      `"${q.title}" marked as ${nextArchive ? 'Archived' : 'Active'}.`,
      'info'
    );
    if (viewingQuestion && viewingQuestion.id === q.id) {
      setViewingQuestion({ ...viewingQuestion, isArchived: nextArchive, status: nextArchive ? 'ARCHIVED' : 'LEARNING' });
    }
  };

  // Confirm delete
  const handleConfirmDelete = () => {
    if (!deletingQuestion) return;
    deleteQuestion(deletingQuestion.id);
    showToast('Question Deleted', `"${deletingQuestion.title}" permanently removed.`, 'warning');
    if (viewingQuestion && viewingQuestion.id === deletingQuestion.id) {
      setViewingQuestion(null);
    }
    setDeletingQuestion(null);
  };

  const getDifficultyBadge = (diff: Difficulty) => {
    switch (diff) {
      case 'Easy':
        return <Badge variant="success">Easy</Badge>;
      case 'Medium':
        return <Badge variant="warning">Medium</Badge>;
      case 'Hard':
        return <Badge variant="danger">Hard</Badge>;
    }
  };

  const getStatusBadge = (status: QuestionStatus) => {
    switch (status) {
      case 'NEW':
        return <Badge variant="info">NEW</Badge>;
      case 'LEARNING':
        return <Badge variant="purple">LEARNING</Badge>;
      case 'REVIEWING':
        return <Badge variant="warning">REVIEWING</Badge>;
      case 'MASTERED':
        return <Badge variant="success">MASTERED</Badge>;
      case 'ARCHIVED':
        return <Badge variant="default">ARCHIVED</Badge>;
    }
  };

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Page Header */}
      <PageHeader
        title="Question Database"
        description="Searchable, filterable personal algorithmic question bank with key invariants and personal notes."
        actions={
          <Button
            variant="primary"
            size="md"
            iconLeft={<Plus size={16} />}
            onClick={handleOpenAdd}
          >
            Add Question
          </Button>
        }
      />

      {/* FILTER CONTROLS BAR */}
      <Card style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Search row */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px' }}>
            <Input
              placeholder="Search by title, notes, insight, or tag..."
              iconLeft={<Search size={15} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              iconLeft={<X size={14} />}
              onClick={resetFilters}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Dropdowns Row: Subject, Topic, Difficulty, Pattern, Status, Tag */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 10,
          }}
        >
          {/* Subject Filter */}
          <select
            className="form-select"
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            style={{ fontSize: '12.5px', padding: '6px 10px' }}
          >
            <option value="All">All Subjects</option>
            {allSubjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Topic Filter */}
          <select
            className="form-select"
            value={selectedTopicId}
            onChange={(e) => setSelectedTopicId(e.target.value)}
            style={{ fontSize: '12.5px', padding: '6px 10px' }}
          >
            <option value="All">All Topics</option>
            {activeTopics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {/* Difficulty Filter */}
          <select
            className="form-select"
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            style={{ fontSize: '12.5px', padding: '6px 10px' }}
          >
            <option value="All">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>

          {/* Pattern Filter */}
          <select
            className="form-select"
            value={selectedPattern}
            onChange={(e) => setSelectedPattern(e.target.value)}
            style={{ fontSize: '12.5px', padding: '6px 10px' }}
          >
            <option value="All">All Patterns</option>
            {PATTERNS_LIST.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className="form-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            style={{ fontSize: '12.5px', padding: '6px 10px' }}
          >
            <option value="All">All Statuses</option>
            <option value="NEW">NEW</option>
            <option value="LEARNING">LEARNING</option>
            <option value="REVIEWING">REVIEWING</option>
            <option value="MASTERED">MASTERED</option>
            <option value="ARCHIVED">ARCHIVED</option>
          </select>

          {/* Tag Filter */}
          {allTags.length > 0 && (
            <select
              className="form-select"
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              style={{ fontSize: '12.5px', padding: '6px 10px' }}
            >
              <option value="All">All Tags</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>
          )}
        </div>
      </Card>

      {/* RESULTS COUNT & TABLE */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Showing <strong>{filteredQuestions.length}</strong> of <strong>{questions.length}</strong> questions
        </span>
      </div>

      {filteredQuestions.length === 0 ? (
        <EmptyState
          icon={<FileText size={24} />}
          title="No questions match your filters"
          description={
            hasActiveFilters
              ? 'Try clearing some of your search filters or tags to find questions.'
              : 'Add your first personal study question to start building your knowledge base.'
          }
          actionText={hasActiveFilters ? 'Clear Filters' : 'Add First Question'}
          onAction={hasActiveFilters ? resetFilters : handleOpenAdd}
        />
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Title & Key Invariant</th>
                <th>Topic</th>
                <th>Difficulty</th>
                <th>Pattern</th>
                <th>Source</th>
                <th>Status</th>
                <th>Mastery</th>
                <th>Created</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuestions.map((q) => (
                <tr
                  key={q.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setViewingQuestion(q)}
                >
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13.5px' }}>
                        {q.title}
                      </span>
                      {q.importantInsight && (
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          💡 {q.importantInsight}
                        </span>
                      )}
                    </div>
                  </td>

                  <td>
                    <Badge variant="default">{q.topicName}</Badge>
                  </td>

                  <td>{getDifficultyBadge(q.difficulty)}</td>

                  <td>
                    <Badge variant="purple">{q.pattern}</Badge>
                  </td>

                  <td>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {q.source}
                    </span>
                  </td>

                  <td>{getStatusBadge(q.status)}</td>

                  <td style={{ minWidth: '90px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: '12px', fontWeight: 600 }}>Lv. {q.mastery}/5</span>
                    </div>
                  </td>

                  <td>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {new Date(q.createdAt).toLocaleDateString()}
                    </span>
                  </td>

                  <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                    <div style={{ display: 'inline-flex', gap: 4 }}>
                      {q.url && (
                        <a
                          href={q.url}
                          target="_blank"
                          rel="noreferrer"
                          className="icon-btn icon-btn-sm"
                          title="Open problem link"
                          aria-label="Open problem link"
                        >
                          <ExternalLink size={14} />
                        </a>
                      )}
                      <IconButton
                        icon={<Edit2 size={14} />}
                        label="Edit question"
                        size="sm"
                        onClick={() => handleOpenEdit(q)}
                      />
                      <IconButton
                        icon={<Archive size={14} />}
                        label={q.isArchived ? 'Restore question' : 'Archive question'}
                        size="sm"
                        onClick={() => handleToggleArchive(q)}
                      />
                      <IconButton
                        icon={<Trash2 size={14} color="var(--color-danger)" />}
                        label="Delete question"
                        size="sm"
                        onClick={() => setDeletingQuestion(q)}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ADD QUESTION MODAL */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        size="lg"
        title="Add Question to Personal Study Bank"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveAdd}>
              Save Question
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveAdd} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="Question Title"
            required
            placeholder="e.g. Longest Substring Without Repeating Characters"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            autoFocus
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Subject"
              value={formSubject}
              onChange={(e) => setFormSubject(e.target.value)}
              placeholder="e.g. Data Structures & Algorithms"
              required
            />

            <Select
              label="Topic"
              value={formTopicId}
              onChange={(e) => setFormTopicId(e.target.value)}
              required
              options={[
                { value: '', label: '-- Select Topic --' },
                ...activeTopics.map((t) => ({ value: t.id, label: t.name })),
              ]}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Select
              label="Difficulty"
              value={formDifficulty}
              onChange={(e) => setFormDifficulty(e.target.value as Difficulty)}
              options={[
                { value: 'Easy', label: 'Easy' },
                { value: 'Medium', label: 'Medium' },
                { value: 'Hard', label: 'Hard' },
              ]}
            />

            <Select
              label="Pattern"
              value={formPattern}
              onChange={(e) => setFormPattern(e.target.value)}
              options={PATTERNS_LIST.map((p) => ({ value: p, label: p }))}
            />

            <Select
              label="Source Platform"
              value={formSource}
              onChange={(e) => setFormSource(e.target.value as QuestionSource)}
              options={[
                { value: 'LeetCode', label: 'LeetCode' },
                { value: 'GeeksforGeeks', label: 'GeeksforGeeks' },
                { value: 'CodeChef', label: 'CodeChef' },
                { value: 'Codeforces', label: 'Codeforces' },
                { value: 'Other', label: 'Other' },
                { value: 'Custom', label: 'Custom / Textbook' },
              ]}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <Input
              label="Problem URL"
              placeholder="https://leetcode.com/problems/..."
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
            />

            <Input
              label="Estimated Time (mins)"
              type="number"
              value={formTimeEst}
              onChange={(e) => setFormTimeEst(e.target.value)}
            />
          </div>

          <Input
            label="Tags (Comma-separated)"
            placeholder="Array, Hash Table, Sliding Window"
            value={formTags}
            onChange={(e) => setFormTags(e.target.value)}
          />

          <div className="form-group">
            <label className="form-label">
              <span>Personal Notes & Derivation</span>
            </label>
            <textarea
              className="form-textarea"
              rows={3}
              placeholder="Explain the optimal invariant, key state transitions, and common pitfalls..."
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
            />
          </div>

          <Input
            label="Important Insight / Trigger Invariant"
            placeholder="e.g. When asked for continuous subarray with sum K, use prefix sums hashmap."
            value={formInsight}
            onChange={(e) => setFormInsight(e.target.value)}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select
              label="Status"
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value as QuestionStatus)}
              options={[
                { value: 'NEW', label: 'NEW' },
                { value: 'LEARNING', label: 'LEARNING' },
                { value: 'REVIEWING', label: 'REVIEWING' },
                { value: 'MASTERED', label: 'MASTERED' },
                { value: 'ARCHIVED', label: 'ARCHIVED' },
              ]}
            />

            <div className="form-group">
              <label className="form-label">
                <span>Initial Mastery: Lv. {formMastery}/5</span>
              </label>
              <input
                type="range"
                min="0"
                max="5"
                step="1"
                value={formMastery}
                onChange={(e) => setFormMastery(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-primary)' }}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* EDIT QUESTION MODAL */}
      <Modal
        isOpen={Boolean(editingQuestion)}
        onClose={() => setEditingQuestion(null)}
        size="lg"
        title="Edit Study Question"
        footer={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={() => setEditingQuestion(null)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveEdit}>
              Update Question
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="Question Title"
            required
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            autoFocus
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Subject"
              value={formSubject}
              onChange={(e) => setFormSubject(e.target.value)}
              required
            />

            <Select
              label="Topic"
              value={formTopicId}
              onChange={(e) => setFormTopicId(e.target.value)}
              required
              options={[
                { value: '', label: '-- Select Topic --' },
                ...activeTopics.map((t) => ({ value: t.id, label: t.name })),
              ]}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Select
              label="Difficulty"
              value={formDifficulty}
              onChange={(e) => setFormDifficulty(e.target.value as Difficulty)}
              options={[
                { value: 'Easy', label: 'Easy' },
                { value: 'Medium', label: 'Medium' },
                { value: 'Hard', label: 'Hard' },
              ]}
            />

            <Select
              label="Pattern"
              value={formPattern}
              onChange={(e) => setFormPattern(e.target.value)}
              options={PATTERNS_LIST.map((p) => ({ value: p, label: p }))}
            />

            <Select
              label="Source Platform"
              value={formSource}
              onChange={(e) => setFormSource(e.target.value as QuestionSource)}
              options={[
                { value: 'LeetCode', label: 'LeetCode' },
                { value: 'GeeksforGeeks', label: 'GeeksforGeeks' },
                { value: 'CodeChef', label: 'CodeChef' },
                { value: 'Codeforces', label: 'Codeforces' },
                { value: 'Other', label: 'Other' },
                { value: 'Custom', label: 'Custom / Textbook' },
              ]}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <Input
              label="Problem URL"
              value={formUrl}
              onChange={(e) => setFormUrl(e.target.value)}
            />

            <Input
              label="Estimated Time (mins)"
              type="number"
              value={formTimeEst}
              onChange={(e) => setFormTimeEst(e.target.value)}
            />
          </div>

          <Input
            label="Tags (Comma-separated)"
            value={formTags}
            onChange={(e) => setFormTags(e.target.value)}
          />

          <div className="form-group">
            <label className="form-label">
              <span>Personal Notes & Derivation</span>
            </label>
            <textarea
              className="form-textarea"
              rows={3}
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
            />
          </div>

          <Input
            label="Important Insight / Trigger Invariant"
            value={formInsight}
            onChange={(e) => setFormInsight(e.target.value)}
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select
              label="Status"
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value as QuestionStatus)}
              options={[
                { value: 'NEW', label: 'NEW' },
                { value: 'LEARNING', label: 'LEARNING' },
                { value: 'REVIEWING', label: 'REVIEWING' },
                { value: 'MASTERED', label: 'MASTERED' },
                { value: 'ARCHIVED', label: 'ARCHIVED' },
              ]}
            />

            <div className="form-group">
              <label className="form-label">
                <span>Mastery Level: Lv. {formMastery}/5</span>
              </label>
              <input
                type="range"
                min="0"
                max="5"
                step="1"
                value={formMastery}
                onChange={(e) => setFormMastery(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-primary)' }}
              />
            </div>
          </div>
        </form>
      </Modal>

      {/* QUESTION DETAIL MODAL */}
      {viewingQuestion && (
        <Modal
          isOpen={Boolean(viewingQuestion)}
          onClose={() => setViewingQuestion(null)}
          size="lg"
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileText size={18} color="var(--color-primary)" />
              <span>Question Details</span>
            </div>
          }
          footer={
            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  variant="outline"
                  size="sm"
                  iconLeft={<Archive size={14} />}
                  onClick={() => handleToggleArchive(viewingQuestion)}
                >
                  {viewingQuestion.isArchived ? 'Restore' : 'Archive'}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  iconLeft={<Trash2 size={14} />}
                  onClick={() => setDeletingQuestion(viewingQuestion)}
                >
                  Delete
                </Button>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <Button
                  variant="secondary"
                  size="sm"
                  iconLeft={<Edit2 size={14} />}
                  onClick={() => {
                    handleOpenEdit(viewingQuestion);
                  }}
                >
                  Edit Details
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setViewingQuestion(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Header info */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                {getDifficultyBadge(viewingQuestion.difficulty)}
                <Badge variant="purple">{viewingQuestion.pattern}</Badge>
                {getStatusBadge(viewingQuestion.status)}
                <Badge variant="default">{viewingQuestion.source}</Badge>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Topic: <strong>{viewingQuestion.topicName}</strong> ({viewingQuestion.subject})
                </span>
              </div>

              <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                {viewingQuestion.title}
              </h2>

              {viewingQuestion.url && (
                <a
                  href={viewingQuestion.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '13px', color: 'var(--color-primary)' }}
                >
                  <span>Open Problem Source Link</span>
                  <ExternalLink size={13} />
                </a>
              )}
            </div>

            {/* Important Insight Banner */}
            {viewingQuestion.importantInsight && (
              <div
                style={{
                  padding: '14px 16px',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  borderLeft: '4px solid var(--color-primary)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <Lightbulb size={18} color="var(--color-primary)" style={{ marginTop: 2, flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                    Key Invariant / Important Insight:
                  </span>
                  <span style={{ fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {viewingQuestion.importantInsight}
                  </span>
                </div>
              </div>
            )}

            {/* Personal Notes */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Personal Notes & Solution Approach:
              </span>
              <div
                style={{
                  padding: '14px 16px',
                  backgroundColor: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13.5px',
                  lineHeight: 1.6,
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {viewingQuestion.notes || 'No notes added for this question yet.'}
              </div>
            </div>

            {/* Metadata strip: Mastery, Est time, Tags */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: 12,
                padding: '12px 16px',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
              }}
            >
              <div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Mastery Level</span>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                  Level {viewingQuestion.mastery} of 5
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Est. Solving Time</span>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                  {viewingQuestion.estimatedSolvingTimeMinutes || 25} minutes
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Created Date</span>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: 2 }}>
                  {new Date(viewingQuestion.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>

            {/* Tags */}
            {viewingQuestion.tags.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <TagIcon size={14} color="var(--text-muted)" />
                {viewingQuestion.tags.map((t, idx) => (
                  <span key={idx} className="badge badge-default">
                    #{t}
                  </span>
                ))}
              </div>
            )}

            {/* Spaced Repetition Performance Strip */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                gap: 10,
                padding: '12px 16px',
                backgroundColor: 'var(--bg-subtle)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Next Review
                </span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: viewingQuestion.nextReviewAt ? 'var(--color-primary)' : 'var(--text-muted)', marginTop: 2 }}>
                  {viewingQuestion.nextReviewAt || 'Not Scheduled'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Current Interval
                </span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                  {viewingQuestion.currentIntervalDays ?? 0} {viewingQuestion.currentIntervalDays === 1 ? 'day' : 'days'}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Ease Factor
                </span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                  {Number(viewingQuestion.easeFactor ?? 2.5).toFixed(2)}
                </div>
              </div>

              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                  Reviews
                </span>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginTop: 2 }}>
                  {viewingQuestion.successfulReviews ?? 0} / {viewingQuestion.reviewCount ?? 0} passed
                </div>
              </div>
            </div>

            {/* Review History Logs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px solid var(--border-subtle)', paddingTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <History size={15} color="var(--color-primary)" />
                  Revision History & SM-2 Performance Logs
                </span>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                  {viewingQuestion.reviewHistory?.length || 0} event(s)
                </span>
              </div>

              {viewingQuestion.reviewHistory && viewingQuestion.reviewHistory.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '200px', overflowY: 'auto' }}>
                  {viewingQuestion.reviewHistory.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        backgroundColor: 'var(--bg-canvas)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          className={`badge ${
                            log.rating === 'EASY'
                              ? 'badge-success'
                              : log.rating === 'GOOD'
                              ? 'badge-primary'
                              : log.rating === 'HARD'
                              ? 'badge-warning'
                              : 'badge-danger'
                          }`}
                          style={{ fontSize: '11px', padding: '2px 6px' }}
                        >
                          {log.rating}
                        </span>
                        <span style={{ color: 'var(--text-secondary)' }}>
                          Interval: {log.previousInterval}d → <strong>{log.newInterval}d</strong>
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>
                          (EF: {log.newEaseFactor.toFixed(2)})
                        </span>
                      </div>
                      <span style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>
                        {new Date(log.reviewedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: '10px 14px',
                    backgroundColor: 'var(--bg-subtle)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '12px',
                    color: 'var(--text-muted)',
                  }}
                >
                  No revision sessions recorded yet. Next review is scheduled for {viewingQuestion.nextReviewAt || 'soon'}.
                </div>
              )}

              {/* Mistake History Section */}
              {(() => {
                const questionMistakes = mistakes.filter((m) => m.questionId === viewingQuestion.id);
                const questionInsights = insights.filter((ins) =>
                  (ins.associatedQuestionIds || []).includes(viewingQuestion.id)
                );

                return (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <AlertTriangle size={15} color="var(--color-danger)" />
                          Mistake Bank History ({questionMistakes.length})
                        </span>
                        <button
                          onClick={() => {
                            setQuickMistakeCategory("Logic error");
                            setQuickMistakeNotes('');
                            setIsQuickMistakeOpen(true);
                          }}
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: '11.5px', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <Plus size={12} />
                          <span>Log Mistake</span>
                        </button>
                      </div>

                      {questionMistakes.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '180px', overflowY: 'auto' }}>
                          {questionMistakes.map((m) => (
                            <div
                              key={m.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '8px 12px',
                                backgroundColor: 'var(--bg-canvas)',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-subtle)',
                                borderLeft: m.isResolved ? '3px solid var(--color-success)' : '3px solid var(--color-danger)',
                                fontSize: '12px',
                                gap: 10,
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span className="badge badge-danger" style={{ fontSize: '10.5px' }}>
                                    {m.category}
                                  </span>
                                  {m.isResolved && (
                                    <span style={{ color: 'var(--color-success)', fontSize: '11px', fontWeight: 600 }}>
                                      ✓ Resolved
                                    </span>
                                  )}
                                </div>
                                <span style={{ color: 'var(--text-primary)', lineHeight: 1.4 }}>
                                  {m.notes}
                                </span>
                              </div>

                              <button
                                onClick={() => {
                                  toggleMistakeResolved(m.id);
                                  showToast('Status Updated', `Mistake marked as ${m.isResolved ? 'unresolved' : 'resolved'}.`, 'info');
                                }}
                                className="btn btn-ghost btn-sm"
                                style={{ fontSize: '11px', padding: '3px 8px', flexShrink: 0 }}
                              >
                                {m.isResolved ? 'Reopen' : 'Resolve'}
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div
                          style={{
                            padding: '10px 14px',
                            backgroundColor: 'var(--bg-subtle)',
                            borderRadius: 'var(--radius-md)',
                            fontSize: '12px',
                            color: 'var(--text-muted)',
                          }}
                        >
                          No mistakes logged for this question yet.
                        </div>
                      )}
                    </div>

                    {/* Associated Knowledge Vault Insights */}
                    {questionInsights.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Lightbulb size={15} color="var(--color-primary)" />
                          Linked Knowledge Vault Insights ({questionInsights.length})
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {questionInsights.map((ins) => (
                            <div
                              key={ins.id}
                              style={{
                                padding: '8px 12px',
                                backgroundColor: 'var(--bg-canvas)',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-subtle)',
                                borderLeft: '3px solid var(--color-primary)',
                                fontSize: '12px',
                              }}
                            >
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {ins.title}
                              </span>
                              <div style={{ color: 'var(--text-secondary)', marginTop: 2, fontSize: '11.5px', lineHeight: 1.4 }}>
                                {ins.content.slice(0, 140)}...
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </Modal>
      )}

      {/* QUICK LOG MISTAKE MODAL */}
      {viewingQuestion && (
        <Modal
          isOpen={isQuickMistakeOpen}
          onClose={() => setIsQuickMistakeOpen(false)}
          title={`Log Mistake for "${viewingQuestion.title}"`}
          subtitle="Diagnose root-cause errors and track them in the Mistake Bank."
          maxWidth="500px"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!quickMistakeNotes.trim()) return;
              addMistake({
                questionId: viewingQuestion.id,
                questionTitle: viewingQuestion.title,
                topicId: viewingQuestion.topicId,
                topicName: viewingQuestion.topicName,
                category: quickMistakeCategory,
                notes: quickMistakeNotes.trim(),
                isResolved: false,
              });
              showToast('Mistake Logged', 'Added to question mistake bank.', 'success');
              setQuickMistakeNotes('');
              setIsQuickMistakeOpen(false);
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <div>
              <label className="form-label">Mistake Category</label>
              <select
                className="form-select"
                value={quickMistakeCategory}
                onChange={(e) => setQuickMistakeCategory(e.target.value as MistakeCategory)}
              >
                <option value="Didn't understand problem">Didn't understand problem</option>
                <option value="Didn't recognize pattern">Didn't recognize pattern</option>
                <option value="Concept gap">Concept gap</option>
                <option value="Logic error">Logic error</option>
                <option value="Coding error">Coding error</option>
                <option value="Edge case">Edge case</option>
                <option value="Complexity mistake">Complexity mistake</option>
                <option value="Time pressure">Time pressure</option>
                <option value="Forgot technique">Forgot technique</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="form-label">Diagnosis / Root-Cause Notes *</label>
              <textarea
                className="form-input"
                style={{ minHeight: '90px', resize: 'vertical', fontSize: '13px' }}
                placeholder="Explain what went wrong or which condition was overlooked..."
                value={quickMistakeNotes}
                onChange={(e) => setQuickMistakeNotes(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="secondary" size="sm" onClick={() => setIsQuickMistakeOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" type="submit">
                Log Mistake
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* DELETE CONFIRMATION DIALOG */}
      <ConfirmationDialog
        isOpen={Boolean(deletingQuestion)}
        title={`Delete Question "${deletingQuestion?.title}"?`}
        description={`This will permanently remove "${deletingQuestion?.title}" from your personal study bank. Are you sure?`}
        confirmText="Delete Question"
        cancelText="Keep Question"
        allowArchiveAlternative={true}
        onArchiveInstead={() => {
          if (deletingQuestion) {
            handleToggleArchive(deletingQuestion);
            setDeletingQuestion(null);
          }
        }}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingQuestion(null)}
      />
    </div>
  );
};
