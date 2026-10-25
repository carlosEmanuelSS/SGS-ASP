import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { api, mensagem } from "../../api";
import { Icon } from "../../Icon";
import type { IconName } from "../../Icon";
import { Contador, Esqueleto, nivel, Proporcao } from "../../ui";
import { tiposAtendimento } from "./Registros";
import { diaMes, diasAtras, isoLocal, percentual } from "./resumo";
import type { Resumo } from "./resumo";

const atalhos: [string, () => string][] = [
  ["Este mês", () => isoLocal().slice(0, 8) + "01"],
  ["Últimos 3 meses", () => diasAtras(89)],
  ["Últimos 6 meses", () => diasAtras(182)],
  ["Últimos 12 meses", () => diasAtras(364)],
];
const dataBR = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

/** Estado vazio dos blocos do relatório: ícone, título e orientação. */
function Vazio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="report-empty">
      <span aria-hidden="true">
        <Icon name="inbox" />
      </span>
      <strong>{titulo}</strong>
      <p>{texto}</p>
    </div>
  );
}

function Kpi({
  rotulo,
  icone,
  children,
  detalhe,
  tom,
}: {
  rotulo: string;
  icone: IconName;
  children: ReactNode;
  detalhe: string;
  tom?: string;
}) {
  return (
    <article className="card metric-card stat">
      <div className="stat-head">
        <p>{rotulo}</p>
        <span className={`stat-icon ${tom ?? ""}`}>
          <Icon name={icone} />
        </span>
      </div>
      <strong className="stat-value">{children}</strong>
      <small>{detalhe}</small>
    </article>
  );
}

export function Relatorios() {
  const [inicio, setInicio] = useState(atalhos[0][1]);
  const [fim, setFim] = useState(isoLocal);
  const [educador, setEducador] = useState("");
  const [educadores, setEducadores] = useState<string[]>([]);
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
      .then((r) => {
        setResult(r);
        // A lista de educadores vem de uma consulta sem filtro de educador.
        if (!new URLSearchParams(params).get("educador"))
          setEducadores(
            [
              ...new Set(r.ocupacao.map((o) => o.educador).filter(Boolean)),
            ].sort((a, b) => a.localeCompare(b, "pt-BR")),
          );
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(mensagem(e));
      });
    return () => controller.abort();
  }, [params, revision]);
  function aplicar(
    novoInicio = inicio,
    novoFim = fim,
    novoEducador = educador,
  ) {
    setParams(
      new URLSearchParams({
        inicio: novoInicio,
        fim: novoFim,
        educador: novoEducador,
      }).toString(),
    );
    setRevision((v) => v + 1);
  }
  async function exportar() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        "/api/relatorios/?" + params + "&formato=csv",
        {
          credentials: "same-origin",
        },
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
  const aulas = result?.por_turma.reduce((s, t) => s + t.aulas, 0) ?? 0;
  const maiorAtendimento = Math.max(
    1,
    ...(result?.atendimentos.map((a) => a.total) ?? []),
  );
  const maiorFaixa = Math.max(1, ...Object.values(result?.faixas ?? {}));
  return (
    <div className="reports-page">
      <header className="page-head">
        <div className="page-head-main">
          <span className="page-icon tone-navy" aria-hidden="true">
            <Icon name="chart" />
          </span>
          <div>
            <h1>Relatórios &amp; Indicadores</h1>
            <p>
              Acompanhe frequência, turmas, atendimentos e doações do período
              selecionado.
            </p>
          </div>
        </div>
        <button
          className="btn-outline btn-lg"
          disabled={!result || busy}
          onClick={() => void exportar()}
        >
          <Icon name="download" />
          Exportar CSV
        </button>
      </header>

      <form
        className="card report-toolbar"
        onSubmit={(e) => {
          e.preventDefault();
          aplicar();
        }}
      >
        <div className="segmented" role="group" aria-label="Atalhos de período">
          {atalhos.map(([nome, calc]) => {
            const ativo = inicio === calc() && fim === isoLocal();
            return (
              <button
                type="button"
                key={nome}
                className={ativo ? "active" : undefined}
                aria-pressed={ativo}
                onClick={() => {
                  const novoInicio = calc();
                  setInicio(novoInicio);
                  setFim(isoLocal());
                  aplicar(novoInicio, isoLocal());
                }}
              >
                {nome}
              </button>
            );
          })}
        </div>
        <div className="report-fields">
          <label className="mini-field">
            <span>De</span>
            <input
              type="date"
              required
              max={fim}
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
            />
          </label>
          <label className="mini-field">
            <span>Até</span>
            <input
              type="date"
              required
              min={inicio}
              max={isoLocal()}
              value={fim}
              onChange={(e) => setFim(e.target.value)}
            />
          </label>
          <label className="select-field mini">
            <span className="sr-only">Educador da oficina</span>
            <select
              value={educador}
              onChange={(e) => {
                setEducador(e.target.value);
                aplicar(inicio, fim, e.target.value);
              }}
            >
              <option value="">Todos os educadores</option>
              {educadores.map((nome) => (
                <option key={nome} value={nome}>
                  {nome}
                </option>
              ))}
            </select>
          </label>
          <button className="btn-primary">
            <Icon name="refresh" />
            Aplicar
          </button>
        </div>
        {result && (
          <p className="report-caption">
            Mostrando dados de {dataBR(result.inicio)} a {dataBR(result.fim)} ·
            atualizado às{" "}
            {new Date(result.gerado_em).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            . Alunos e ocupação mostram a situação atual.
          </p>
        )}
      </form>

      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {!result ? (
        error ? null : (
          <Esqueleto tipo="painel" />
        )
      ) : (
        <>
          <section className="report-kpis" aria-label="Resumo do período">
            <Kpi
              rotulo="Presença média"
              icone="check"
              tom="tone-green-soft"
              detalhe={`${result.frequencia.total} marcações em chamadas`}
            >
              {result.frequencia.percentual === null ? (
                "—"
              ) : (
                <Contador
                  valor={Math.round(result.frequencia.percentual)}
                  sufixo="%"
                />
              )}
            </Kpi>
            <Kpi
              rotulo="Aulas registradas"
              icone="school"
              tom="tone-blue-soft"
              detalhe={`${result.por_turma.length} ${result.por_turma.length === 1 ? "turma" : "turmas"} com chamada`}
            >
              <Contador valor={aulas} />
            </Kpi>
            <Kpi
              rotulo="Faltas"
              icone="calendar"
              tom="tone-slate"
              detalhe="inclui faltas justificadas"
            >
              <Contador valor={result.frequencia.faltas} />
            </Kpi>
            <Kpi
              rotulo="Alunos com 3+ faltas"
              icone="alert"
              tom="tone-amber-soft"
              detalhe={
                result.alertas.length ? "acompanhar" : "nenhum no período"
              }
            >
              <Contador valor={result.alertas.length} />
            </Kpi>
          </section>

          <div className="report-body">
            <div className="report-main">
              <section className="card report-block">
                <div className="block-head">
                  <h2>Frequência semana a semana</h2>
                  <span className="chart-legend">
                    <span>
                      <i className="lg-presenca" aria-hidden="true" />
                      Presenças
                    </span>
                    <span>
                      <i className="lg-falta" aria-hidden="true" />
                      Faltas
                    </span>
                  </span>
                </div>
                {!result.semanas.length ? (
                  <Vazio
                    titulo="Sem chamadas no período filtrado"
                    texto="Selecione outro intervalo de datas ou confira se os educadores registraram as aulas."
                  />
                ) : (
                  <div
                    className="week-chart"
                    role="img"
                    aria-label={`Presença por semana: ${result.semanas.map((s) => `${diaMes(s.inicio)} ${percentual(s.presentes, s.total)}%`).join(", ")}`}
                  >
                    <div className="week-axis" aria-hidden="true">
                      <span>100%</span>
                      <span>50%</span>
                      <span>0%</span>
                    </div>
                    <div className="week-bars">
                      {result.semanas.map((s, i) => {
                        const p = percentual(s.presentes, s.total);
                        return (
                          <div
                            className="week"
                            key={s.inicio}
                            title={`${p}% de presença`}
                            style={{ ["--i" as string]: i }}
                          >
                            <div className="week-col">
                              <span
                                className="falta"
                                style={{ height: `${100 - p}%` }}
                              />
                              <span
                                className="presenca"
                                style={{ height: `${p}%` }}
                              />
                            </div>
                            <small>{diaMes(s.inicio)}</small>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              <section className="card report-block">
                <div className="block-head">
                  <div>
                    <h2>Ocupação das oficinas</h2>
                    <p>Matrículas ativas e limite de vagas por turma.</p>
                  </div>
                </div>
                {!result.ocupacao.length ? (
                  <Vazio
                    titulo="Nenhuma turma ativa"
                    texto="Cadastre turmas em Oficinas e Turmas para acompanhar a ocupação."
                  />
                ) : (
                  <ul className="occ-list">
                    {result.ocupacao.map((o, i) => {
                      const p = percentual(o.ocupadas, o.vagas);
                      const n = nivel(p);
                      return (
                        <li
                          key={o.id}
                          className={`occ-row slots-${n}`}
                          style={{ ["--i" as string]: i }}
                        >
                          <div className="occ-name">
                            <strong>
                              {o.nome} · {o.turma}
                            </strong>
                            <span>
                              {o.unidade} · {o.educador}
                            </span>
                          </div>
                          <div className="occ-bar">
                            <div className="occ-numbers">
                              <span>
                                {o.ocupadas} de {o.vagas} vagas
                              </span>
                              <strong>{p}%</strong>
                            </div>
                            <div
                              className="slots-track"
                              role="meter"
                              aria-label={`Ocupação de ${o.nome} ${o.turma}`}
                              aria-valuemin={0}
                              aria-valuemax={o.vagas}
                              aria-valuenow={o.ocupadas}
                            >
                              <span style={{ width: `${Math.min(p, 100)}%` }} />
                            </div>
                          </div>
                          <span className="slots-badge">
                            {n === "full"
                              ? "Lotada"
                              : n === "warn"
                                ? "Quase cheia"
                                : "Com vagas"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>

              <section className="card report-block">
                <div className="block-head">
                  <h2>Frequência por turma</h2>
                </div>
                {!result.por_turma.length ? (
                  <Vazio
                    titulo="Nenhuma chamada no período"
                    texto="Quando houver chamadas, a presença de cada turma aparece aqui."
                  />
                ) : (
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Oficina / turma</th>
                          <th>Educador</th>
                          <th>Aulas</th>
                          <th>Faltas</th>
                          <th>Presença</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.por_turma.map((t, i) => {
                          const p = percentual(t.presentes, t.total);
                          return (
                            <tr key={t.id} style={{ ["--i" as string]: i }}>
                              <td>
                                <span className="cell-main">{t.nome}</span>
                                <small className="cell-sub">{t.turma}</small>
                              </td>
                              <td className="muted-cell">{t.educador}</td>
                              <td>{t.aulas}</td>
                              <td>{t.total - t.presentes}</td>
                              <td>
                                <div className="presence-cell">
                                  <Proporcao
                                    valor={t.presentes}
                                    max={t.total}
                                    rotulo={`Presença em ${t.nome} ${t.turma}`}
                                    tom={
                                      p >= 85 ? "ok" : p >= 75 ? "warn" : "full"
                                    }
                                  />
                                  <strong>{p}%</strong>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>

            <aside className="report-side">
              {result.doacoes && (
                <section className="card report-block donation-block">
                  <div className="block-head">
                    <h2>Doações recebidas</h2>
                    <span
                      className="stat-icon tone-green-soft"
                      aria-hidden="true"
                    >
                      <Icon name="gift" />
                    </span>
                  </div>
                  <strong className="donation-value">
                    {Number(result.doacoes.valor).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </strong>
                  <p>
                    {result.doacoes.total
                      ? `${result.doacoes.total} ${result.doacoes.total === 1 ? "registro" : "registros"} no período, somando apenas doações em dinheiro.`
                      : "Nenhum registro financeiro no período."}
                  </p>
                </section>
              )}

              <section className="card report-block situation">
                <div className="block-head">
                  <h2>Faixas etárias dos alunos</h2>
                </div>
                <ul className="age-bars">
                  {Object.entries(result.faixas).map(([faixa, total], i) => (
                    <li
                      key={faixa}
                      className={total ? undefined : "zero"}
                      style={{ ["--i" as string]: i }}
                    >
                      <span>{faixa}</span>
                      <div className="age-bar" data-tip={`${faixa}: ${total}`}>
                        <span className="age-track">
                          {total > 0 && (
                            <span
                              className="age-fill"
                              style={{
                                width: `${(total / maiorFaixa) * 100}%`,
                              }}
                            />
                          )}
                        </span>
                        <strong>{total}</strong>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section className="card report-block">
                <div className="block-head">
                  <div>
                    <h2>Atendimentos por tipo</h2>
                    <p>Registros acessíveis ao seu perfil.</p>
                  </div>
                </div>
                {result.atendimentos.length ? (
                  <ul className="type-bars">
                    {result.atendimentos.map((a, i) => (
                      <li key={a.tipo} style={{ ["--i" as string]: i }}>
                        <span>{tiposAtendimento[a.tipo]}</span>
                        <strong>{a.total}</strong>
                        <Proporcao
                          valor={a.total}
                          max={maiorAtendimento}
                          rotulo={tiposAtendimento[a.tipo]}
                          tom="atendimentos"
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="dashed-note">
                    Nenhum atendimento registrado no período.
                  </p>
                )}
              </section>
            </aside>
          </div>

          <section className="card report-block">
            <div className="block-head">
              <div>
                <h2>Alunos com três ou mais faltas</h2>
                <p>
                  Até 100 alunos ativos, ordenados pelo total de faltas no
                  período. As faltas podem ser de turmas diferentes e não
                  precisam ser seguidas.
                </p>
              </div>
            </div>
            {!result.alertas.length ? (
              <p className="dashed-note">Nenhum aluno nesse critério.</p>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
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
                        <td className="person-name">{a.nome}</td>
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
    </div>
  );
}
