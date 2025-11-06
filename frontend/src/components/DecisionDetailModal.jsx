import { useEffect } from 'react';

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
};

const formatConfidence = (value) => {
  if (typeof value !== 'number') return '-';
  return `${Math.round(value * 100)}%`;
};

const formatDuration = (value) => {
  if (value === null || value === undefined) return '-';
  return `${value}ms`;
};

const DecisionDetailModal = ({
  open,
  decision,
  loading,
  error,
  manualsByLlm = {},
  manualsLoading = false,
  onClose,
}) => {
  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const approveCount =
    decision?.approvals?.filter((approval) => approval.decision === 'APPROVE').length ?? 0;
  const rejectCount =
    decision?.approvals?.filter((approval) => approval.decision === 'REJECT').length ?? 0;
  const headerTitle = decision?.title || '의결 상세';
  const requesterLabel = decision?.requester || '신청자 정보 없음';

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <header className="modal__header">
          <div>
            <h3>{headerTitle}</h3>
            <p className="modal__subtitle">
              {decision
                ? `${decision.reference} · 신청자 ${requesterLabel} · ${formatDateTime(
                    decision.submittedAt,
                  )}`
                : '상세 정보를 불러오는 중...'}
            </p>
          </div>
          <button className="modal__close" type="button" onClick={onClose} aria-label="닫기">
            ×
          </button>
        </header>

        {loading && (
          <section className="modal__section">
            <p className="modal__loading">LLM 의결 결과를 불러오는 중입니다...</p>
          </section>
        )}

        {error && (
          <section className="modal__section">
            <div className="alert alert--error">{error}</div>
          </section>
        )}

        {decision && (
          <>
            <section className="modal__section">
              <h4>요약</h4>
              <p>{decision.summary}</p>
            </section>

            <section className="modal__section">
              <div className="modal__stats">
                <div className="modal__stat">
                  <span className="modal__stat-label">최종 결정</span>
                  <span className={`badge badge--${decision.finalDecision.toLowerCase()}`}>
                    {decision.finalDecision}
                  </span>
                </div>
                <div className="modal__stat">
                  <span className="modal__stat-label">Approve</span>
                  <strong>{approveCount}</strong>
                </div>
                <div className="modal__stat">
                  <span className="modal__stat-label">Reject</span>
                  <strong>{rejectCount}</strong>
                </div>
              </div>
            </section>

            <section className="modal__section">
              <h4>LLM 검토 상세</h4>
              {manualsLoading && (
                <p className="modal__manual-loading">검토 매뉴얼 정보를 불러오는 중입니다...</p>
              )}
              <ul className="modal__approvals">
                {decision.approvals.map((approval) => {
                  const manual = manualsByLlm[approval.llmName];
                  const share = approval.share;
                  return (
                    <li key={`${approval.llmName}-${approval.id ?? ''}`} className="modal__approval">
                      <header>
                        <h5>{approval.llmName}</h5>
                        <span className={`badge badge--${approval.decision.toLowerCase()}`}>
                          {approval.decision}
                        </span>
                      </header>
                      <p>{approval.summary}</p>
                      <div className="modal__approval-meta">
                        <span>
                          신뢰도 <strong>{formatConfidence(approval.confidence)}</strong>
                        </span>
                        <span>처리 시간 {formatDuration(approval.durationMs)}</span>
                      </div>
                      {approval.issues?.length > 0 && (
                        <details className="modal__issues">
                          <summary>발견된 이슈 {approval.issues.length}건</summary>
                          <ul>
                            {approval.issues.map((issue, index) => (
                              <li key={index}>{issue}</li>
                            ))}
                          </ul>
                        </details>
                      )}
                      {manual && (
                        <details className="modal__manual">
                          <summary>LLM 전용 매뉴얼</summary>
                          <pre>{manual.content}</pre>
                        </details>
                      )}
                      {share?.x && share?.y && (
                        <details className="modal__share">
                          <summary>복구용 부분키</summary>
                          <pre>{`x: ${share.x}\ny: ${share.y}`}</pre>
                        </details>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default DecisionDetailModal;
