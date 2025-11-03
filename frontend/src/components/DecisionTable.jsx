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

const getRequestTitle = (decision) => decision.title || '제목 정보 없음';
const getRequesterName = (decision) => decision.requester || '신청자 정보 없음';

const DecisionTable = ({ decisions, loading, onRowClick }) => {
  return (
    <div className="table-wrapper">
      <table className="decision-table">
        <thead>
          <tr>
            <th>의결 번호</th>
            <th>신청 제목</th>
            <th>신청자</th>
            <th>신청일</th>
            <th>결과</th>
            <th>승인 LLM</th>
            <th>반려 LLM</th>
          </tr>
        </thead>
        <tbody>
          {loading && (
            <tr>
              <td colSpan={7}>의결 데이터를 불러오는 중입니다...</td>
            </tr>
          )}
          {!loading &&
            decisions.map((decision) => (
              <tr key={decision.id} onClick={() => onRowClick(decision.id)}>
                <td>{decision.reference}</td>
                <td>
                  <div className="decision-table__title">
                    <span>{getRequestTitle(decision)}</span>
                    <small>{decision.summary}</small>
                  </div>
                </td>
                <td>{getRequesterName(decision)}</td>
                <td>{formatDateTime(decision.submittedAt)}</td>
                <td>
                  <span className={`badge badge--${decision.finalDecision.toLowerCase()}`}>
                    {decision.finalDecision}
                  </span>
                </td>
                <td>
                  {decision.approvals?.filter((item) => item.decision === 'APPROVE').length ?? 0}
                </td>
                <td>
                  {decision.approvals?.filter((item) => item.decision === 'REJECT').length ?? 0}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      {!loading && decisions.length === 0 && (
        <div className="empty-state">표시할 의결 데이터가 없습니다.</div>
      )}
    </div>
  );
};

export default DecisionTable;
