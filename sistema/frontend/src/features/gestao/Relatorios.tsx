import { useEffect, useState } from "react";
import { api, mensagem } from "../../api";
import { tiposAtendimento } from "./Registros";
type Resumo = {
  inicio: string;
  fim: string;
  gerado_em: string;
  alunos: { total: number; ativos: number; espera: number; inativos: number };
  ocupacao: {
    id: string;
    nome: string;
    turma: string;
    unidade: string;
    educador: string;
    vagas: number;
    ocupadas: number;
  }[];
  frequencia: {
    total: number;
    presentes: number;
    faltas: number;
    percentual: number | null;
  };
  alertas: { aluno: string; nome: string; faltas: number; aulas: number }[];
  faixas: Record<string, number>;
  atendimentos: { tipo: string; total: number }[];
  doacoes: { total: number; valor: string | number } | null;
};
const hoje = () => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
};
export function Relatorios({ painel = false }: { painel?: boolean }) {
  const [inicio, setInicio] = useState(() => hoje().slice(0, 8) + "01");
  const [fim, setFim] = useState(hoje);
  const [educador, setEducador] = useState("");
  const [params, setParams] = useState(() =>
    new URLSearchParams({ inicio, fim }).toString(),
  );
  const [result, setResult] = useState<Resumo | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError("");
    void api<Resumo>(
      "relatorios/?" + params,
      "GET",
      undefined,
      controller.signal,
    )
      .then(setResult)
      .catch((e) => {
        if (!controller.signal.aborted) setError(mensagem(e));
      });
    return () => controller.abort();
  }, [params, revision]);
  async function exportar() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        "/api/relatorios/?" + params + "&formato=csv",
        { credentials: "same-origin" },
      );
      if (!response.ok) {
        if (response.status === 401)
          window.dispatchEvent(new Event("session-expired"));
        throw new Error("Não foi possível exportar o relatório.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "relatorio-sgs.csv";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(mensagem(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">ACOMPANHAMENTO DA INSTITUIÇÃO</p>
          <h1>{painel ? "Visão geral" : "Relatórios"}</h1>
          <p>Indicadores calculados a partir dos registros do sistema.</p>
        </div>
        {!painel && (
          <button disabled={!result || busy} onClick={() => void exportar()}>
            Exportar CSV
          </button>
        )}
      </div>
      <form
        className="card report-filters"
        onSubmit={(e) => {
          e.preventDefault();
          setParams(new URLSearchParams({ inicio, fim, educador }).toString());
          setRevision((v) => v + 1);
        }}
      >
        <label>
          Data inicial
          <input
            type="date"
            required
            max={fim}
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
          />
        </label>
        <label>
          Data final
          <input
            type="date"
            required
            min={inicio}
            max={hoje()}
            value={fim}
            onChange={(e) => setFim(e.target.value)}
          />
        </label>
        <label>
          Educador da oficina
          <input
            value={educador}
            maxLength={160}
            onChange={(e) => setEducador(e.target.value)}
          />
        </label>
        <button>Atualizar indicadores</button>
      </form>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!result ? (
        <p role="status">
          {error
            ? "Não foi possível carregar os indicadores."
            : "Calculando indicadores…"}
        </p>
      ) : (
        <>
          <p className="report-note">
            Dados atualizados em{" "}
            {new Date(result.gerado_em).toLocaleString("pt-BR")}. Alunos e
            ocupação mostram a situação atual; frequência, atendimentos e
            doações usam o período selecionado, de até 366 dias. O filtro de
            educador aplica-se às oficinas e à frequência.
          </p>
          <div className="metric-grid">
            {[
              ["Alunos ativos", result.alunos.ativos],
              ["Lista de espera", result.alunos.espera],
              ["Turmas ativas", result.ocupacao.length],
              [
                "Presença no período",
                result.frequencia.percentual === null
                  ? "Sem chamadas"
                  : result.frequencia.percentual + "%",
              ],
            ].map(([label, value]) => (
              <section className="card" key={label}>
                <p>{label}</p>
                <strong className="metric-value">{value}</strong>
              </section>
            ))}
          </div>
          <section className="card report-section">
            <h2>Ocupação das oficinas</h2>
            <p>Matrículas ativas e limite de vagas das turmas ativas.</p>
            {!result.ocupacao.length ? (
              <p>Nenhuma turma encontrada.</p>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Oficina / turma</th>
                      <th>Unidade</th>
                      <th>Educador</th>
                      <th>Ocupação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.ocupacao.map((o) => (
                      <tr key={o.id}>
                        <td>
                          {o.nome}
                          <small>{o.turma}</small>
                        </td>
                        <td>{o.unidade}</td>
                        <td>{o.educador}</td>
                        <td>
                          {o.ocupadas} de {o.vagas}
                          <progress
                            aria-label={"Ocupação de " + o.nome + " " + o.turma}
                            max={o.vagas}
                            value={o.ocupadas}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          <div className="details-grid report-section">
            <section className="card">
              <h2>Frequência no período</h2>
              <dl>
                <div>
                  <dt>Marcações em chamadas</dt>
                  <dd>{result.frequencia.total}</dd>
                </div>
                <div>
                  <dt>Presenças</dt>
                  <dd>{result.frequencia.presentes}</dd>
                </div>
                <div>
                  <dt>Faltas</dt>
                  <dd>{result.frequencia.faltas}</dd>
                </div>
              </dl>
              <p>
                Inclui faltas justificadas. Não representa o número de alunos
                únicos.
              </p>
            </section>
            <section className="card">
              <h2>Faixas etárias</h2>
              <p>Idades atuais dos alunos ativos.</p>
              <dl>
                {Object.entries(result.faixas).map(([faixa, total]) => (
                  <div key={faixa}>
                    <dt>{faixa}</dt>
                    <dd>{total}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section className="card">
              <h2>Atendimentos acessíveis</h2>
              <p>
                Registros não cancelados que seu perfil pode consultar. Relatos
                não são incluídos no relatório.
              </p>
              {result.atendimentos.length ? (
                <dl>
                  {result.atendimentos.map((a) => (
                    <div key={a.tipo}>
                      <dt>{tiposAtendimento[a.tipo]}</dt>
                      <dd>{a.total}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p>Nenhum atendimento acessível no período.</p>
              )}
            </section>
            {result.doacoes && (
              <section className="card">
                <h2>Doações recebidas</h2>
                <p>
                  {result.doacoes.total} registros não cancelados no período.
                </p>
                <strong className="metric-value">
                  {Number(result.doacoes.valor).toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </strong>
                <p>
                  Somente doações em dinheiro. Quantidades de bens não são
                  somadas entre unidades diferentes.
                </p>
              </section>
            )}
          </div>
          <section className="card report-section">
            <h2>Alunos com três ou mais faltas</h2>
            <p>
              Até 100 alunos ativos, ordenados pelo total de faltas no período.
              As faltas podem pertencer a turmas distintas e não precisam ser
              consecutivas.
            </p>
            {!result.alertas.length ? (
              <p>Nenhum aluno nesse critério.</p>
            ) : (
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Aluno</th>
                      <th>Faltas</th>
                      <th>Aulas registradas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.alertas.map((a) => (
                      <tr key={a.aluno}>
                        <td>{a.nome}</td>
                        <td>{a.faltas}</td>
                        <td>{a.aulas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
