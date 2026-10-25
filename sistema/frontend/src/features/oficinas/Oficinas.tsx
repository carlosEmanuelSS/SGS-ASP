import { useEffect, useState } from "react";
import { api, mensagem } from "../../api";
import type { User } from "../../api";
import { dias, horario, iconeOficina, rotuloTurma } from "./types";
import type { Oficina, Pagina } from "./types";
import { FormularioOficina } from "./FormularioOficina";
import { DetalheOficina } from "./DetalheOficina";
import { Esqueleto, nivel } from "../../ui";
import type { ItemResumo } from "../../ui";
import { Icon } from "../../Icon";
import type { Resumo } from "../gestao/resumo";

export function Oficinas({ user }: { user: User }) {
  const [view, setView] = useState<"list" | "form" | "detail">("list");
  const [selected, setSelected] = useState<Oficina | null>(null);
  const [query, setQuery] = useState("");
  const [ativa, setAtiva] = useState("true");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Pagina<Oficina> | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError("");
    const timeout = setTimeout(() => {
      void api<Pagina<Oficina>>(
        `oficinas/?${new URLSearchParams({ q: query, ativa, page: String(page) })}`,
        "GET",
        undefined,
        controller.signal,
      )
        .then(setData)
        .catch((e) => {
          if (!controller.signal.aborted) setError(mensagem(e));
        });
    }, 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, ativa, page, revision]);
  const [resumo, setResumo] = useState<ItemResumo[] | undefined>();
  useEffect(() => {
    // O resumo usa os indicadores; perfis sem essa permissão veem só a lista.
    if (!user.pode_ver_indicadores) return;
    const controller = new AbortController();
    void api<Resumo>("relatorios/", "GET", undefined, controller.signal)
      .then(({ ocupacao }) => {
        const vagas = ocupacao.reduce((s, o) => s + o.vagas, 0);
        const ocupadas = ocupacao.reduce((s, o) => s + o.ocupadas, 0);
        const lotadas = ocupacao.filter(
          (o) => o.vagas > 0 && o.ocupadas >= o.vagas,
        ).length;
        const quase = ocupacao.filter(
          (o) =>
            o.vagas > 0 && o.ocupadas < o.vagas && o.ocupadas / o.vagas >= 0.8,
        ).length;
        setResumo([
          { rotulo: "Turmas ativas", valor: ocupacao.length },
          { rotulo: "Vagas ocupadas", valor: `${ocupadas} / ${vagas}` },
          { rotulo: "Quase cheias", valor: quase, tom: "s-espera" },
          { rotulo: "Lotadas", valor: lotadas, tom: "s-lotada" },
        ]);
      })
      .catch(() => {
        // Complementar: sem o resumo, a lista continua funcionando.
      });
    return () => controller.abort();
  }, [user.pode_ver_indicadores, revision]);
  function back() {
    setView("list");
    setSelected(null);
    setRevision((v) => v + 1);
  }
  if (view === "form")
    return (
      <FormularioOficina
        initial={selected}
        onBack={back}
        onSave={() => {
          setNotice("Oficina salva com sucesso.");
          setQuery("");
          setAtiva("");
          setPage(1);
          back();
        }}
      />
    );
  if (view === "detail" && selected)
    return (
      <DetalheOficina
        id={selected.id}
        user={user}
        onBack={back}
        onEdit={(o) => {
          setSelected(o);
          setView("form");
        }}
      />
    );
  return (
    <div className="workshops-page">
      <header className="page-head">
        <div className="page-head-main">
          <span className="page-icon tone-blue" aria-hidden="true">
            <Icon name="book" />
          </span>
          <div>
            <div className="page-head-title">
              <h1>Oficinas e Turmas</h1>
              {data && (
                <span className="count-badge">
                  {data.total} {data.total === 1 ? "turma" : "turmas"}
                </span>
              )}
            </div>
            <p>Organize os encontros e conecte cada aluno às atividades.</p>
          </div>
        </div>
        {user.pode_criar_oficinas && (
          <button
            className="btn-primary"
            onClick={() => {
              setSelected(null);
              setView("form");
              setNotice("");
            }}
          >
            <Icon name="plus" />
            Nova oficina
          </button>
        )}
      </header>
      {resumo && (
        <ul className="metric-pills" aria-label="Resumo das turmas">
          {resumo.map((r) => (
            <li key={r.rotulo}>
              {r.tom && <span className={`dot ${r.tom}`} aria-hidden="true" />}
              {r.rotulo}
              <strong>{r.valor}</strong>
            </li>
          ))}
        </ul>
      )}
      {notice && (
        <p role="status" className="success">
          {notice}
        </p>
      )}
      <section className="card data-card toolbar-card">
        <div className="data-toolbar">
          <label className="search-field">
            <span className="sr-only">Buscar oficina</span>
            <Icon name="search" />
            <input
              type="search"
              value={query}
              placeholder="Buscar por oficina, turma, educador ou unidade"
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label className="select-field compact">
            <span className="sr-only">Situação</span>
            <select
              aria-label="Filtrar oficinas"
              value={ativa}
              onChange={(e) => {
                setAtiva(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas</option>
              <option value="true">Ativas</option>
              <option value="false">Inativas</option>
            </select>
          </label>
        </div>
      </section>
      <section aria-label="Turmas">
        {error ? (
          <div className="empty">
            <p className="error" role="alert">
              {error}
            </p>
            <button onClick={() => setRevision((v) => v + 1)}>
              Tentar novamente
            </button>
          </div>
        ) : !data ? (
          <Esqueleto tipo="cartoes" linhas={3} />
        ) : (
          <>
            {!data.items.length ? (
              <div className="empty">
                <h2>Nenhuma oficina encontrada</h2>
                <p>Crie uma turma ou ajuste os filtros para começar.</p>
              </div>
            ) : (
              <div className="class-grid">
                {data.items.map((o, i) => (
                  <article
                    className="class-card"
                    key={o.id}
                    style={{ ["--i" as string]: i }}
                  >
                    <div className="class-head">
                      <span className="class-icon" aria-hidden="true">
                        <Icon name={iconeOficina(o)} />
                      </span>
                      <div className="class-title">
                        <h2>{o.nome}</h2>
                        <span>{rotuloTurma(o.turma)}</span>
                      </div>
                      <span
                        className={`status-badge ${o.ativa ? "badge-ativo" : "badge-inativo"}`}
                      >
                        <span
                          className={`status-dot ${o.ativa ? "dot-ativo" : "dot-inativo"}`}
                          aria-hidden="true"
                        />
                        {o.ativa ? "Ativa" : "Inativa"}
                      </span>
                    </div>
                    <ul className="class-info">
                      <li>
                        <Icon name="mapPin" />
                        {o.unidade}
                      </li>
                      <li>
                        <Icon name="user" />
                        {o.educador}
                      </li>
                    </ul>
                    <div className="class-chips">
                      <span>
                        <Icon name="calendar" />
                        {o.dias_semana
                          .map((d) => dias[d].slice(0, 3))
                          .join(", ")}
                      </span>
                      <span>
                        <Icon name="clock" />
                        {horario(o)}
                      </span>
                    </div>
                    <Vagas oficina={o} />
                    <button
                      className="class-action"
                      onClick={() => {
                        setSelected(o);
                        setView("detail");
                        setNotice("");
                      }}
                      aria-label={`Ver turma ${o.nome} ${o.turma}`}
                    >
                      Ver turma e matrículas
                      <Icon name="arrowRight" />
                    </button>
                  </article>
                ))}
              </div>
            )}
            <div className="page-footer">
              <span>
                {data.total}{" "}
                {data.total === 1 ? "turma encontrada" : "turmas encontradas"}
              </span>
              <div className="pager">
                <button
                  className="pager-btn"
                  disabled={data.page <= 1}
                  onClick={() => setPage(data.page - 1)}
                >
                  Anterior
                </button>
                <span>
                  Página {data.page} de {data.pages}
                </span>
                <button
                  className="pager-btn"
                  disabled={data.page >= data.pages}
                  onClick={() => setPage(data.page + 1)}
                >
                  Próxima
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

/** Ocupação da turma: barra fina e selo com as vagas restantes. */
function Vagas({ oficina: o }: { oficina: Oficina }) {
  const p = o.limite_vagas
    ? Math.round((o.ocupadas / o.limite_vagas) * 100)
    : 0;
  const n = nivel(p);
  const restantes = Math.max(o.limite_vagas - o.ocupadas, 0);
  const selo =
    n === "full"
      ? "Turma lotada"
      : n === "warn"
        ? `Quase cheia · ${restantes} ${restantes === 1 ? "vaga" : "vagas"}`
        : `${restantes} ${restantes === 1 ? "vaga restante" : "vagas restantes"}`;
  return (
    <div className={`slots slots-${n}`}>
      <div className="slots-head">
        <span>Ocupação</span>
        <strong>
          {o.ocupadas} de {o.limite_vagas} vagas
        </strong>
      </div>
      <div
        className="slots-track"
        role="meter"
        aria-label={`Ocupação de ${o.nome}`}
        aria-valuemin={0}
        aria-valuemax={o.limite_vagas}
        aria-valuenow={o.ocupadas}
        aria-valuetext={`${o.ocupadas} de ${o.limite_vagas} vagas, ${selo}`}
      >
        <span style={{ width: `${Math.min(p, 100)}%` }} />
      </div>
      <span className="slots-badge">{selo}</span>
    </div>
  );
}
