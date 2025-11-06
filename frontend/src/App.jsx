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

const DEFAULT_TASK_TYPE = 'research_budget_increase';

const App = () => {
  const [llms, setLlms] = useState([]);
  const [llmsLoading, setLlmsLoading] = useState(true);

  const [decisions, setDecisions] = useState([]);
  const [decisionsTotal, setDecisionsTotal] = useState(0);
  const [decisionsLoading, setDecisionsLoading] = useState(true);

  const [manuals, setManuals] = useState([]);
  const [manualsLoading, setManualsLoading] = useState(true);

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

  const isModalOpen = selectedDecisionId !== null;

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>AI 이사회 의결 현황</h1>
          <p className="page__subtitle">LLM 기반 자동 의결 시스템 모니터링 대시보드</p>
        </div>
        <button className="refresh-button" type="button" onClick={loadDashboardData}>
          새로고침
        </button>
      </header>

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
