import { useEffect, useState } from "react";
import { api, mensagem } from "../../api";
import type { User } from "../../api";
import { Icon } from "../../Icon";
import { Anel, Barra, Contador, Esqueleto } from "../../ui";
import type { Modulo } from "../../ui";
import { diasAtras, isoLocal, percentual } from "./resumo";
import type { Resumo } from "./resumo";

type Alerta = {
  nivel: "critico" | "atencao";
  titulo: string;
  texto: string;
  acao?: { rotulo: string; modulo: Modulo };
};

function saudacao() {
  const h = new Date().getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}

export function VisaoGeral({
  user,
  onNavegar,
}: {
  user: User;
  onNavegar: (modulo: Modulo) => void;
}) {
  const [result, setResult] = useState<Resumo | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null);
    setError("");
    const params = new URLSearchParams({
      inicio: diasAtras(29),
      fim: isoLocal(),
    });
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
  }, [revision]);

  const atualizar = (
    <button
      className="secondary hero-refresh"
      onClick={() => setRevision((v) => v + 1)}
      disabled={!result && !error}
    >
      <Icon name="refresh" />
      Atualizar indicadores
    </button>
  );
  if (error)
    return (
      <div className="empty-state card">
        <span className="empty-icon tone-danger">
          <Icon name="info" />
        </span>
        <h2>Não foi possível carregar a visão geral</h2>
        <p role="alert">{error}</p>
        <button className="secondary" onClick={() => setRevision((v) => v + 1)}>
          Tentar novamente
        </button>
      </div>
    );
  if (!result) return <Esqueleto tipo="painel" />;

  const ativas = result.ocupacao;
  const vagas = ativas.reduce((s, o) => s + o.vagas, 0);
  const ocupadas = ativas.reduce((s, o) => s + o.ocupadas, 0);
  const ocupacao = percentual(ocupadas, vagas);
  const lotadas = ativas.filter((o) => o.vagas > 0 && o.ocupadas >= o.vagas);
  const quaseCheias = ativas.filter(
    (o) => o.vagas > 0 && o.ocupadas < o.vagas && o.ocupadas / o.vagas >= 0.8,
  );
  const semanas = result.semanas.slice(-6);
  const alertas: Alerta[] = [];
  if (result.alertas.length)
    alertas.push({
      nivel: "critico",
      titulo: `${result.alertas.length} ${result.alertas.length === 1 ? "aluno" : "alunos"} com 3 ou mais faltas nos últimos 30 dias`,
      texto:
        result.alertas
          .slice(0, 3)
          .map((a) => a.nome)
          .join(", ") +
        (result.alertas.length > 3 ? " e outros" : "") +
        ". Vale um contato com as famílias.",
      acao: user.pode_ver_indicadores
        ? { rotulo: "Ver no relatório", modulo: "relatorios" }
        : undefined,
    });
  for (const o of lotadas.slice(0, 2))
    alertas.push({
      nivel: "atencao",
      titulo: `${o.nome} · ${o.turma} está lotada`,
      texto: `${o.ocupadas} de ${o.vagas} vagas ocupadas. Novos alunos precisarão de outra turma.`,
      acao: user.pode_ver_oficinas
        ? { rotulo: "Ver oficinas", modulo: "oficinas" }
        : undefined,
    });
  if (quaseCheias.length)
    alertas.push({
      nivel: "atencao",
      titulo: `${quaseCheias.length} ${quaseCheias.length === 1 ? "turma está quase cheia" : "turmas estão quase cheias"} (80% ou mais)`,
      texto: quaseCheias
        .slice(0, 3)
        .map((o) => `${o.nome} · ${o.turma} (${o.ocupadas}/${o.vagas})`)
        .join(", "),
      acao: user.pode_ver_oficinas
        ? { rotulo: "Ver oficinas", modulo: "oficinas" }
        : undefined,
    });
  if (result.alunos.espera_30_dias)
    alertas.push({
      nivel: "atencao",
      titulo: `${result.alunos.espera_30_dias} ${result.alunos.espera_30_dias === 1 ? "aluno aguarda" : "alunos aguardam"} na lista de espera há mais de 30 dias`,
      texto:
        ativas.length > lotadas.length
          ? "Há turmas com vagas livres que podem receber esses alunos."
          : "Todas as turmas ativas estão lotadas no momento.",
      acao: user.pode_ver_alunos
        ? { rotulo: "Ver alunos", modulo: "alunos" }
        : undefined,
    });
  if (!result.frequencia.total && ativas.length)
    alertas.push({
      nivel: "atencao",
      titulo: "Nenhuma chamada registrada nos últimos 30 dias",
      texto:
        "Sem chamadas, a presença dos alunos e os alertas de faltas não podem ser acompanhados.",
      acao: user.pode_ver_frequencia
        ? { rotulo: "Registrar chamada", modulo: "frequencia" }
        : undefined,
    });
  // O que está em dia também aparece, para o painel mostrar a situação completa.
  const emDia = [
    !result.alertas.length &&
      result.frequencia.total > 0 &&
      "Nenhum aluno com 3 ou mais faltas nos últimos 30 dias",
    result.frequencia.total > 0 &&
      `${result.frequencia.total} marcações de presença nos últimos 30 dias`,
    ativas.length > 0 && !lotadas.length && "Nenhuma turma lotada",
    ativas.length > 0 && !quaseCheias.length && "Nenhuma turma quase cheia",
    !result.alunos.espera_30_dias &&
      "Ninguém aguardando há mais de 30 dias na lista de espera",
    vagas > ocupadas &&
      `${vagas - ocupadas} ${vagas - ocupadas === 1 ? "vaga livre" : "vagas livres"} nas turmas ativas`,
  ].filter((item): item is string => Boolean(item));
  const ranking = [...ativas]
    .sort((a, b) => b.ocupadas / (b.vagas || 1) - a.ocupadas / (a.vagas || 1))
    .slice(0, 5);
  const totalSituacao = result.alunos.total || 1;
  const situacao = [
    { rotulo: "Ativos", total: result.alunos.ativos, classe: "s-ativo" },
    {
      rotulo: "Lista de espera",
      total: result.alunos.espera,
      classe: "s-espera",
    },
    { rotulo: "Inativos", total: result.alunos.inativos, classe: "s-inativo" },
  ];
  const maiorFaixa = Math.max(1, ...Object.values(result.faixas));
  const data = new Date().toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="overview">
      <div className="overview-title">
        <h1>Visão geral</h1>
        <span>Situação atual da instituição</span>
      </div>
      <section className="overview-hero">
        <div>
          <p className="hero-date">{data}</p>
          <h2>
            {saudacao()}, {user.nome}
          </h2>
          <p>
            Hoje a ASP acompanha <strong>{result.alunos.ativos} alunos</strong>{" "}
            em <strong>{ativas.length} turmas</strong>.{" "}
            {alertas.length ? (
              <>
                Há{" "}
                <strong className="hero-alert">
                  {alertas.length} {alertas.length === 1 ? "ponto" : "pontos"}
                </strong>{" "}
                pedindo atenção.
              </>
            ) : (
              "Nenhum ponto pedindo atenção."
            )}
          </p>
        </div>
        {atualizar}
      </section>

      <section className="kpi-grid" aria-label="Indicadores principais">
        <article className="card metric-card stat">
          <div className="stat-head">
            <p>Alunos ativos</p>
            <span className="stat-icon">
              <Icon name="users" />
            </span>
          </div>
          <strong className="stat-value">
            <Contador valor={result.alunos.ativos} />
          </strong>
          <small>de {result.alunos.total} cadastrados</small>
        </article>
        <article className="card metric-card stat">
          <div className="stat-head">
            <p>Lista de espera</p>
            <span className="stat-icon">
              <Icon name="wait" />
            </span>
          </div>
          <strong className="stat-value">
            <Contador valor={result.alunos.espera} />
          </strong>
          <small className={result.alunos.espera_30_dias ? "warn-text" : ""}>
            {result.alunos.espera_30_dias
              ? `${result.alunos.espera_30_dias} há mais de 30 dias`
              : "aguardando vaga"}
          </small>
        </article>
        <article className="card metric-card stat">
          <div className="stat-head">
            <p>Ocupação das turmas</p>
            <span className="stat-icon">
              <Icon name="book" />
            </span>
          </div>
          <div className="stat-row">
            <strong className="stat-value">
              <Contador valor={ocupacao} sufixo="%" />
            </strong>
            <Anel percentual={ocupacao} />
          </div>
          <small>
            {ocupadas} de {vagas} vagas · {ativas.length}{" "}
            {ativas.length === 1 ? "turma ativa" : "turmas ativas"}
          </small>
        </article>
        {result.frequencia.percentual === null ? (
          <article className="card metric-card stat">
            <div className="stat-head">
              <p>Presença · 30 dias</p>
              <span className="stat-icon">
                <Icon name="calendar" />
              </span>
            </div>
            <strong className="stat-value stat-empty">Sem chamadas</strong>
            {user.pode_ver_frequencia ? (
              <button
                className="btn-outline"
                onClick={() => onNavegar("frequencia")}
              >
                Registrar chamada
                <span className="arrow" aria-hidden="true">
                  →
                </span>
              </button>
            ) : (
              <small>Nenhuma chamada registrada no período.</small>
            )}
          </article>
        ) : (
          <article className="card metric-card stat">
            <div className="stat-head">
              <p>Presença · 30 dias</p>
              <span className="stat-icon">
                <Icon name="calendar" />
              </span>
            </div>
            <strong className="stat-value">
              <Contador
                valor={Math.round(result.frequencia.percentual)}
                sufixo="%"
              />
            </strong>
            {semanas.length > 0 && (
              <div
                className="spark"
                role="img"
                aria-label={`Presença semanal: ${semanas.map((s) => percentual(s.presentes, s.total) + "%").join(", ")}`}
              >
                {semanas.map((s, i) => (
                  <span
                    key={s.inicio}
                    className={i === semanas.length - 1 ? "atual" : ""}
                    style={{
                      height: `${Math.max(8, percentual(s.presentes, s.total))}%`,
                      ["--i" as string]: i,
                    }}
                  />
                ))}
              </div>
            )}
            <small>{result.frequencia.total} marcações em chamadas</small>
          </article>
        )}
      </section>

      <div className="overview-row">
        <section className="card attention">
          <div className="section-head">
            <h2>Pontos de atenção</h2>
            <span>
              {alertas.length} pedindo atenção · {emDia.length} em dia
            </span>
          </div>
          {alertas.length ? (
            <ul>
              {alertas.map((a) => (
                <li key={a.titulo} className={`attention-item ${a.nivel}`}>
                  <div>
                    <span className={`attention-badge ${a.nivel}`}>
                      <Icon name={a.nivel === "critico" ? "alert" : "clock"} />
                      {a.nivel === "critico" ? "Crítico" : "Atenção"}
                    </span>
                    <strong>{a.titulo}</strong>
                    <p>{a.texto}</p>
                  </div>
                  {a.acao && (
                    <button
                      className="btn-outline"
                      onClick={() => onNavegar(a.acao!.modulo)}
                    >
                      {a.acao.rotulo}
                      <span className="arrow" aria-hidden="true">
                        →
                      </span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="attention-ok">
              <Icon name="heart" />
              <p>Nenhum ponto pedindo atenção agora.</p>
            </div>
          )}
          {emDia.length > 0 && (
            <>
              <h3 className="ok-title">Em dia</h3>
              <ul className="ok-list">
                {emDia.map((item) => (
                  <li key={item}>
                    <span className="ok-check" aria-hidden="true">
                      <Icon name="check" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="card situation">
          <h2>Alunos por situação</h2>
          <div
            className="stack-bar"
            role="img"
            aria-label={situacao
              .map((s) => `${s.total} ${s.rotulo.toLowerCase()}`)
              .join(", ")}
          >
            {situacao
              .filter((s) => s.total > 0)
              .map((s) => (
                <span
                  key={s.classe}
                  className={s.classe}
                  style={{ flexGrow: s.total }}
                  title={`${s.rotulo}: ${s.total} (${percentual(s.total, totalSituacao)}%)`}
                />
              ))}
          </div>
          <dl className="legend">
            {situacao.map((s) => (
              <div key={s.classe}>
                <dt>
                  <span className={`dot ${s.classe}`} aria-hidden="true" />
                  {s.rotulo}
                </dt>
                <dd>
                  {s.total}
                  <small>{percentual(s.total, totalSituacao)}%</small>
                </dd>
              </div>
            ))}
          </dl>
          <h3>Faixas etárias (ativos)</h3>
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
                        style={{ width: `${(total / maiorFaixa) * 100}%` }}
                      />
                    )}
                  </span>
                  <strong>{total}</strong>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card occupancy-list">
        <div className="section-head">
          <h2>Ocupação das oficinas</h2>
          {user.pode_ver_oficinas && (
            <button className="link" onClick={() => onNavegar("oficinas")}>
              Ver todas →
            </button>
          )}
        </div>
        {ranking.length ? (
          <ul>
            {ranking.map((o, i) => (
              <li key={o.id} style={{ ["--i" as string]: i }}>
                <span>
                  <strong>{o.nome}</strong> · {o.turma}
                </span>
                <Barra
                  valor={o.ocupadas}
                  max={o.vagas}
                  rotulo={`Ocupação de ${o.nome} ${o.turma}`}
                  texto={`${o.ocupadas} de ${o.vagas} vagas`}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p>Nenhuma turma ativa no momento.</p>
        )}
      </section>
    </div>
  );
}
