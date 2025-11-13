import { useCallback, useEffect, useMemo, useState } from 'react';
import LlmStatusCards from './components/LlmStatusCards.jsx';
import DecisionTable from './components/DecisionTable.jsx';
import DecisionDetailModal from './components/DecisionDetailModal.jsx';
import ManualEditorModal from './components/ManualEditorModal.jsx';
import {
  fetchDecisionDetail,
  fetchDecisionList,
  fetchLlmStatus,
  fetchManuals,
  saveManual,
} from './api/dashboard.js';
import rotatingAiPoster from './assets/rotating_ai.avif';
import rotatingAiWebm from './assets/rotating_ai.webm';

const DEFAULT_TASK_TYPE = 'research_budget_increase';

const App = () => {
  const [llms, setLlms] = useState([]);
  const [llmsLoading, setLlmsLoading] = useState(true);

  const [decisions, setDecisions] = useState([]);
  const [decisionsTotal, setDecisionsTotal] = useState(0);
  const [decisionsLoading, setDecisionsLoading] = useState(true);

  const [manuals, setManuals] = useState([]);
  const [manualsLoading, setManualsLoading] = useState(true);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);

  const [errorMessage, setErrorMessage] = useState(null);

  const [selectedDecisionId, setSelectedDecisionId] = useState(null);
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [selectedDecisionLoading, setSelectedDecisionLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [manualEditorTarget, setManualEditorTarget] = useState(null);

  const loadDashboardData = useCallback(async () => {
    setErrorMessage(null);
    setLlmsLoading(true);
    setDecisionsLoading(true);
    setManualsLoading(true);

    try {
      const [llmItems, decisionResult, manualItems] = await Promise.all([
        fetchLlmStatus(),
        fetchDecisionList({ limit: 20 }),
        fetchManuals({ taskType: DEFAULT_TASK_TYPE }),
      ]);

      setLlms(llmItems);
      setDecisions(decisionResult.items);
      setDecisionsTotal(decisionResult.total);
      setManuals(manualItems);
      setLastSyncedAt(new Date());
    } catch (error) {
      console.error('[dashboard] Failed to load data', error);
      setErrorMessage(error.message || '대시보드 데이터를 불러오지 못했습니다.');
    } finally {
      setLlmsLoading(false);
      setDecisionsLoading(false);
      setManualsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (selectedDecisionId === null) {
      setSelectedDecision(null);
      setDetailError(null);
      setSelectedDecisionLoading(false);
      return;
    }

    let isCancelled = false;

    setSelectedDecision(null);
    setDetailError(null);
    setSelectedDecisionLoading(true);

    fetchDecisionDetail(selectedDecisionId)
      .then((result) => {
        if (isCancelled) return;
        setSelectedDecision(result);
      })
      .catch((error) => {
        if (isCancelled) return;
        console.error('[dashboard] Failed to load decision detail', error);
        setDetailError(error.message || '의결 상세 정보를 불러오지 못했습니다.');
        setSelectedDecision(null);
      })
      .finally(() => {
        if (!isCancelled) {
          setSelectedDecisionLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedDecisionId]);

  const manualsByLlm = useMemo(() => {
    const map = {};
    manuals.forEach((manual) => {
      if (manual.llmName) {
        map[manual.llmName] = manual;
      }
    });
    return map;
  }, [manuals]);

  const manualEditorLlmName = manualEditorTarget?.llmDisplayName ?? null;
  const selectedManual =
    manualEditorLlmName && manualsByLlm[manualEditorLlmName]
      ? manualsByLlm[manualEditorLlmName]
      : null;

  const handleManualEditorOpen = useCallback((llm) => {
    if (!llm) return;
    const llmDisplayName = llm.displayName || llm.identifier;
    setManualEditorTarget({
      llmDisplayName,
      llmIdentifier: llm.identifier,
    });
  }, []);

  const handleManualEditorClose = useCallback(() => {
    setManualEditorTarget(null);
  }, []);

  const handleManualSave = async (content, llmDisplayName) => {
    if (!llmDisplayName) {
      throw new Error('선택된 LLM이 없습니다.');
    }

    try {
      await saveManual({
        taskType: DEFAULT_TASK_TYPE,
        llmName: llmDisplayName,
        content,
      });

      setManualsLoading(true);
      const refreshedManuals = await fetchManuals({ taskType: DEFAULT_TASK_TYPE });
      setManuals(refreshedManuals);
    } catch (error) {
      console.error('[dashboard] Failed to save manual', error);
      throw error;
    } finally {
      setManualsLoading(false);
    }
  };

  const handleRowClick = (decisionId) => {
    setSelectedDecisionId(decisionId);
  };

  const closeModal = () => {
    setSelectedDecisionId(null);
  };

  const llmMetrics = useMemo(() => {
    if (!llms.length) {
      return { healthy: 0, degraded: 0, offline: 0, avgLatency: null };
    }

    const initial = {
      healthy: 0,
      degraded: 0,
      offline: 0,
      latencySum: 0,
      latencyCount: 0,
    };

    const totals = llms.reduce((acc, item) => {
      if (item.status === 'HEALTHY') acc.healthy += 1;
      if (item.status === 'DEGRADED') acc.degraded += 1;
      if (item.status === 'OFFLINE') acc.offline += 1;

      if (typeof item.avgLatencyMs === 'number') {
        acc.latencySum += item.avgLatencyMs;
        acc.latencyCount += 1;
      }

      return acc;
    }, initial);

    return {
      healthy: totals.healthy,
      degraded: totals.degraded,
      offline: totals.offline,
      avgLatency:
        totals.latencyCount > 0 ? Math.round(totals.latencySum / totals.latencyCount) : null,
    };
  }, [llms]);

  const decisionMetrics = useMemo(() => {
    if (!decisions.length) {
      return {
        approveCount: 0,
        rejectCount: 0,
        approvalRate: null,
        contested: 0,
        avgPanel: null,
      };
    }

    const base = decisions.reduce(
      (acc, decision) => {
        if (decision.finalDecision === 'APPROVE') {
          acc.approveCount += 1;
        }
        if (decision.finalDecision === 'REJECT') {
          acc.rejectCount += 1;
        }

        const votes = Array.isArray(decision.approvals) ? decision.approvals : [];
        const approveVotes = votes.filter((vote) => vote.decision === 'APPROVE').length;
        const rejectVotes = votes.filter((vote) => vote.decision === 'REJECT').length;
        if (approveVotes > 0 && rejectVotes > 0) {
          acc.contested += 1;
        }
        acc.totalVotes += votes.length;
        return acc;
      },
      {
        approveCount: 0,
        rejectCount: 0,
        contested: 0,
        totalVotes: 0,
      },
    );

    const approvalRate = Math.round((base.approveCount / decisions.length) * 100);
    const avgPanel = base.totalVotes > 0 ? Number((base.totalVotes / decisions.length).toFixed(1)) : null;

    return {
      approveCount: base.approveCount,
      rejectCount: base.rejectCount,
      contested: base.contested,
      approvalRate,
      avgPanel,
    };
  }, [decisions]);

  const formattedSyncTime = useMemo(() => {
    if (!lastSyncedAt) {
      return 'N/A';
    }

    try {
      return lastSyncedAt.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch (error) {
      console.error('[dashboard] Failed to format sync time', error);
      return 'N/A';
    }
  }, [lastSyncedAt]);

  const activeAlerts = llmMetrics.degraded + llmMetrics.offline;

  const isModalOpen = selectedDecisionId !== null;

  return (
    <div className="page page--hud">
      <div className="page__grid" aria-hidden="true" />
      <header className="page__header">
        <div className="page__title-block">
          <div className="page__signal">
            <span className="page__signal-dot" />
            <span>PROTOCOL LINK · HYPERION</span>
          </div>
          <h1>AI 이사회 의결 현황</h1>
          <p className="page__subtitle">LLM 기반 자동 의결 시스템 모니터링 대시보드</p>
        </div>
        <div className="page__actions">
          <span className="page__timestamp">LAST SYNC · {formattedSyncTime}</span>
          <button className="refresh-button" type="button" onClick={loadDashboardData}>
            새로고침
          </button>
        </div>
      </header>

      <section className="hud-holo" aria-label="AI 코어 시각화">
        <div className="hud-holo__grid" role="presentation">
          <video
            className="hud-holo__image"
            autoPlay
            loop
            muted
            playsInline
            poster={rotatingAiPoster}
            aria-label="AI hologram"
          >
            <source src={rotatingAiWebm} type="video/webm" />
            <img src={rotatingAiPoster} alt="AI hologram" />
          </video>
          <span className="hud-holo__ring hud-holo__ring--outer" aria-hidden="true" />
          <span className="hud-holo__ring hud-holo__ring--inner" aria-hidden="true" />
          <span className="hud-holo__pulse" aria-hidden="true" />
        </div>
        <div className="hud-holo__meta">
          <div>
            <span className="hud-holo__meta-label">CORE STATUS</span>
            <strong>{llmsLoading ? 'SYNCHRONIZING' : 'ONLINE'}</strong>
            <small>LLM CLUSTER</small>
          </div>
          <div>
            <span className="hud-holo__meta-label">COUNCIL LOAD</span>
            <strong>
              {decisionsLoading ? '--' : `${Math.min(decisionsTotal, 999).toString().padStart(3, '0')}`}
            </strong>
            <small>TOTAL DECISIONS</small>
          </div>
          <div>
            <span className="hud-holo__meta-label">LATENCY</span>
            <strong>{llmMetrics.avgLatency !== null ? `${llmMetrics.avgLatency} MS` : '--'}</strong>
            <small>AVG RESPONSE</small>
          </div>
        </div>
      </section>

      <section className="hud-metrics" aria-label="실시간 운영 지표">
        <article className="hud-metric">
          <span className="hud-metric__label">ACTIVE MODELS</span>
          <strong>{llmsLoading ? '--' : llms.length}</strong>
          <span className="hud-metric__hint">
            HEALTHY {llmMetrics.healthy} · DEG {llmMetrics.degraded}
          </span>
        </article>
        <article className="hud-metric">
          <span className="hud-metric__label">AVG LATENCY</span>
          <strong>{llmMetrics.avgLatency !== null ? `${llmMetrics.avgLatency} ms` : '--'}</strong>
          <span className="hud-metric__hint">모델 전체 기준</span>
        </article>
        <article className="hud-metric">
          <span className="hud-metric__label">APPROVAL RATE</span>
          <strong>
            {decisionMetrics.approvalRate !== null ? `${decisionMetrics.approvalRate}%` : '--'}
          </strong>
          <span className="hud-metric__hint">
            승인 {decisionMetrics.approveCount} · 반려 {decisionMetrics.rejectCount}
          </span>
        </article>
        <article className="hud-metric">
          <span className="hud-metric__label">AVG PANEL SIZE</span>
          <strong>{decisionMetrics.avgPanel !== null ? decisionMetrics.avgPanel : '--'}</strong>
          <span className="hud-metric__hint">의결당 참여 LLM</span>
        </article>
        <article className="hud-metric">
          <span className="hud-metric__label">ALERT STATE</span>
          <strong className={activeAlerts > 0 ? 'hud-metric__critical' : undefined}>
            {llmsLoading ? '--' : activeAlerts}
          </strong>
          <span className="hud-metric__hint">OFFLINE {llmMetrics.offline}</span>
        </article>
      </section>

      {errorMessage && <div className="alert alert--error">{errorMessage}</div>}

      <main className="page__content">
        <section className="panel">
          <div className="panel__header">
            <h2>전체 LLM 현황</h2>
            <span className="panel__hint">
              {llmsLoading ? '데이터를 불러오는 중...' : `참여 모델 ${llms.length}종`}
            </span>
          </div>
          <LlmStatusCards llms={llms} loading={llmsLoading} onCardClick={handleManualEditorOpen} />
        </section>

        <section className="panel">
          <div className="panel__header">
            <h2>의결 목록 및 처리 기록</h2>
            <span className="panel__hint">
              {decisionsLoading
                ? '의결 데이터를 불러오는 중...'
                : `총 ${decisionsTotal}건 · 최근 ${decisions.length}건`}
            </span>
          </div>
          <DecisionTable
            decisions={decisions}
            loading={decisionsLoading}
            onRowClick={handleRowClick}
          />
        </section>
      </main>

      <DecisionDetailModal
        open={isModalOpen}
        decision={selectedDecision}
        loading={selectedDecisionLoading}
        error={detailError}
        manualsByLlm={manualsByLlm}
        manualsLoading={manualsLoading}
        onClose={closeModal}
      />
      <ManualEditorModal
        open={manualEditorTarget !== null}
        llmName={manualEditorLlmName}
        manual={selectedManual}
        loading={manualsLoading}
        onClose={handleManualEditorClose}
        onSubmit={(content) => handleManualSave(content, manualEditorLlmName)}
      />
    </div>
  );
};

export default App;
