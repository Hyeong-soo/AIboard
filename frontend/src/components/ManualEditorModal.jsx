import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import useScrollLock from '../hooks/useScrollLock.js';
import useModalDrag from '../hooks/useModalDrag.js';

const MODAL_ANIMATION_DURATION = 320;

const formatDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
};

const ManualEditorModal = ({ open, llmName, manual, loading = false, onClose, onSubmit }) => {
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [hasEdited, setHasEdited] = useState(false);
  const [visible, setVisible] = useState(open);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (!open) {
      setDraft('');
      setSaving(false);
      setError(null);
      setHasEdited(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open || hasEdited) {
      return;
    }

    if (manual && typeof manual.content === 'string') {
      setDraft(manual.content);
    } else {
      setDraft('');
    }
  }, [open, manual, hasEdited]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !saving) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, saving, onClose]);

  const manualVersion = manual?.version || null;
  const manualUpdatedAt = formatDateTime(manual?.updatedAt);

  const subtitle = useMemo(() => {
    if (!llmName) {
      return '선택된 LLM의 매뉴얼을 수정합니다.';
    }
    return `${llmName} 매뉴얼을 수정합니다. 저장 즉시 다음 의결부터 반영됩니다.`;
  }, [llmName]);

  useEffect(() => {
    let timer;
    if (open) {
      setVisible(true);
      setClosing(false);
    } else if (visible) {
      setClosing(true);
      timer = setTimeout(() => {
        setVisible(false);
        setClosing(false);
      }, MODAL_ANIMATION_DURATION);
    }

    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [open, visible]);

  useScrollLock(visible);
  const { dragStyle, handlePointerDown, isDragging } = useModalDrag(visible);

  const handleHeaderPointerDown = (event) => {
    if (event.target.closest('button')) {
      return;
    }
    handlePointerDown(event);
  };

  if (!visible) {
    return null;
  }

  const isManualLoading = loading && !manual;

  const handleChange = (event) => {
    if (!hasEdited) {
      setHasEdited(true);
    }
    setDraft(event.target.value);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) {
      return;
    }

    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      setError('매뉴얼 내용을 입력해주세요.');
      return;
    }

    if (typeof onSubmit !== 'function') {
      setError('매뉴얼 저장 기능이 비활성화되어 있습니다.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSubmit(draft);
      setSaving(false);
      onClose();
    } catch (submitError) {
      console.error('[ManualEditorModal] Failed to save manual', submitError);
      setSaving(false);
      setError(
        submitError?.message || '매뉴얼 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      );
    }
  };

  const handleCancel = () => {
    if (!saving) {
      onClose();
    }
  };

  const overlayClass = closing ? 'modal-overlay modal-overlay--closing' : 'modal-overlay';
  const modalClassNames = ['modal', 'manual-editor'];
  if (closing) {
    modalClassNames.push('modal--closing');
  }

  const shellClasses = ['modal-shell'];
  if (isDragging) {
    shellClasses.push('modal-shell--dragging');
  }

  const modalContent = (
    <div className={overlayClass} role="dialog" aria-modal="true">
      <div className={shellClasses.join(' ')} style={dragStyle}>
        <div className={modalClassNames.join(' ')}>
          <header className="modal__header" onPointerDown={handleHeaderPointerDown}>
            <div>
              <h3>{llmName ? `${llmName} 매뉴얼 편집` : 'LLM 매뉴얼 편집'}</h3>
              <p className="modal__subtitle">{subtitle}</p>
            </div>
            <button
              className="modal__close"
              type="button"
              onClick={handleCancel}
              aria-label="닫기"
              disabled={saving}
            >
              ×
            </button>
          </header>

          <form className="manual-editor__form" onSubmit={handleSubmit}>
            <section className="modal__section">
              <div className="manual-editor__meta">
                {manualVersion && <span>현재 버전 {manualVersion}</span>}
                {manualUpdatedAt && <span>최근 수정 {manualUpdatedAt}</span>}
                {!manualVersion && !manualUpdatedAt && !isManualLoading && (
                  <span>등록된 버전 정보가 없습니다. 새 버전으로 저장됩니다.</span>
                )}
              </div>

              {isManualLoading && (
                <p className="manual-editor__hint">매뉴얼을 불러오는 중입니다...</p>
              )}
              {!isManualLoading && !manual && (
                <p className="manual-editor__hint">등록된 매뉴얼이 없습니다. 새로 작성해주세요.</p>
              )}

              <textarea
                className="manual-editor__textarea"
                value={draft}
                onChange={handleChange}
                placeholder="LLM 검토 매뉴얼 내용을 입력하세요."
                disabled={saving || isManualLoading}
              />

              {error && <p className="manual-editor__error">{error}</p>}
            </section>

            <footer className="manual-editor__actions">
              <button
                type="button"
                className="manual-editor__button manual-editor__button--ghost"
                onClick={handleCancel}
                disabled={saving}
              >
                취소
              </button>
              <button
                type="submit"
                className="manual-editor__button manual-editor__button--primary"
                disabled={saving || isManualLoading}
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </footer>
          </form>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return modalContent;
  }

  return createPortal(modalContent, document.body);
};

export default ManualEditorModal;
