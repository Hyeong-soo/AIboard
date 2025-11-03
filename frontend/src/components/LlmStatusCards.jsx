const statusLabels = {
  HEALTHY: { label: '정상', tone: 'status--healthy' },
  DEGRADED: { label: '주의', tone: 'status--degraded' },
  OFFLINE: { label: '오프라인', tone: 'status--offline' },
};

const formatLatency = (value) => {
  if (value === null || value === undefined) return '-';
  return `${value} ms`;
};

const formatApprovalRate = (value) => {
  if (typeof value !== 'number') return '-';
  return `${Math.round(value * 100)}%`;
};

const formatTimestamp = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;
};

const placeholderCards = Array.from({ length: 3 });

const LlmStatusCards = ({ llms, loading, onCardClick }) => {
  if (loading) {
    return (
      <div className="llm-grid">
        {placeholderCards.map((_, index) => (
          <article key={index} className="llm-card llm-card--placeholder">
            <div className="llm-card__skeleton" />
          </article>
        ))}
      </div>
    );
  }

  if (!llms.length) {
    return <div className="empty-state">LLM 상태 데이터가 없습니다.</div>;
  }
  return (
    <div className="llm-grid">
      {llms.map((llm) => {
        const status = statusLabels[llm.status] ?? statusLabels.HEALTHY;
        const interactive = typeof onCardClick === 'function';
        const classNames = ['llm-card'];
        if (interactive) {
          classNames.push('llm-card--interactive');
        }

        const handleClick = () => {
          if (interactive) {
            onCardClick(llm);
          }
        };

        const handleKeyDown = (event) => {
          if (!interactive) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onCardClick(llm);
          }
        };

        return (
          <article
            key={llm.id}
            className={classNames.join(' ')}
            onClick={interactive ? handleClick : undefined}
            onKeyDown={interactive ? handleKeyDown : undefined}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={
              interactive
                ? `${llm.displayName || llm.identifier} 매뉴얼 편집`
                : undefined
            }
          >
            <header className="llm-card__header">
              <h3>{llm.displayName || llm.identifier}</h3>
              <span className={`status-pill ${status.tone}`}>{status.label}</span>
            </header>
            <dl className="llm-card__meta">
              <div>
                <dt>모델</dt>
                <dd>{llm.model}</dd>
              </div>
              <div>
                <dt>응답 지연</dt>
                <dd>{formatLatency(llm.avgLatencyMs)}</dd>
              </div>
              <div>
                <dt>24시간 승인율</dt>
                <dd>{formatApprovalRate(llm.approvalRate)}</dd>
              </div>
              <div>
                <dt>최근 업데이트</dt>
                <dd>{formatTimestamp(llm.lastUpdatedAt)}</dd>
              </div>
            </dl>
            <footer className="llm-card__footer">
              <span>
                처리 건수 <strong>{llm.totalDecisions?.toLocaleString?.() ?? '-'}</strong>
              </span>
              <span>
                승인/반려{' '}
                <strong>{llm.approvedCount?.toLocaleString?.() ?? '-'}</strong> /{' '}
                {llm.rejectedCount?.toLocaleString?.() ?? '-'}
              </span>
            </footer>
          </article>
        );
      })}
    </div>
  );
};

export default LlmStatusCards;
