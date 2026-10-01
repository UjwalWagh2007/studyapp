import React, { useState } from 'react';
import { AlertTriangle, Archive, Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean;
  requireInputConfirmation?: string; // If provided, user must type this exact text to confirm
  allowArchiveAlternative?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onArchiveInstead?: () => void;
  isLoading?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = true,
  requireInputConfirmation,
  allowArchiveAlternative = false,
  onConfirm,
  onCancel,
  onArchiveInstead,
  isLoading = false,
}) => {
  const [typedConfirm, setTypedConfirm] = useState('');

  const isConfirmDisabled =
    requireInputConfirmation && typedConfirm.trim().toLowerCase() !== requireInputConfirmation.trim().toLowerCase();

  const handleClose = () => {
    setTypedConfirm('');
    onCancel();
  };

  const handleConfirm = () => {
    setTypedConfirm('');
    onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="sm"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: isDangerous ? 'var(--color-danger)' : 'var(--text-primary)' }}>
          <AlertTriangle size={20} />
          <span>{title}</span>
        </div>
      }
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          {allowArchiveAlternative && onArchiveInstead ? (
            <Button
              variant="outline"
              size="sm"
              iconLeft={<Archive size={14} />}
              onClick={() => {
                setTypedConfirm('');
                onArchiveInstead();
              }}
            >
              Archive Instead
            </Button>
          ) : (
            <div />
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={handleClose} disabled={isLoading}>
              {cancelText}
            </Button>
            <Button
              variant={isDangerous ? 'danger' : 'primary'}
              size="sm"
              iconLeft={isDangerous ? <Trash2 size={14} /> : undefined}
              onClick={handleConfirm}
              disabled={Boolean(isConfirmDisabled)}
              isLoading={isLoading}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {description}
        </p>

        {requireInputConfirmation && (
          <div style={{ marginTop: 4 }}>
            <Input
              label={`Type "${requireInputConfirmation}" to confirm:`}
              placeholder={requireInputConfirmation}
              value={typedConfirm}
              onChange={(e) => setTypedConfirm(e.target.value)}
              autoFocus
            />
          </div>
        )}
      </div>
    </Modal>
  );
};
