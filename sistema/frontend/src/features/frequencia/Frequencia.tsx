import { useEffect, useState } from "react";
import { api, mensagem } from "../../api";
import type { User } from "../../api";
import { Icon } from "../../Icon";
import type { IconName } from "../../Icon";
import { Contador, Esqueleto } from "../../ui";
import { dias, horario, iconeOficina, rotuloTurma } from "../oficinas/types";
import type { Pagina } from "../oficinas/types";
import type { Turma } from "./types";
import { Diario } from "./Diario";

type SituacaoChamada = {
  chave: "feita" | "pendente" | "sem-aula";
  rotulo: string;
  icone: IconName;
};

function situacaoHoje(t: Turma): SituacaoChamada {
  if (t.chamada_hoje)
    return {
      chave: "feita",
      rotulo: "Chamada de hoje concluída",
      icone: "check",
    };
  if (t.aula_hoje)
    return {
      chave: "pendente",
      rotulo: "Chamada de hoje pendente",
      icone: "alert",
    };
  return { chave: "sem-aula", rotulo: "Sem aula hoje", icone: "calendar" };
}

export function Frequencia({ user }: { user: User }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Pagina<Turma> | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<Turma | null>(null);
  useEffect(() => {
    const ctrl = new AbortController();
    setData(null);
    setError("");
    const timer = setTimeout(() => {
      void api<Pagina<Turma>>(
        `frequencia/turmas/?${new URLSearchParams({ q: query, page: String(page) })}`,
        "GET",
        undefined,
        ctrl.signal,
      )
        .then(setData)
        .catch((e) => {
          if (!ctrl.signal.aborted) setError(mensagem(e));
        });
    }, 200);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query, page, revision]);
  if (selected)
    return (
      <Diario
        turma={selected}
        user={user}
        onBack={() => {
          setSelected(null);
          setRevision((v) => v + 1);
        }}
      />
    );
  const itens = data?.items ?? [];
  const comAula = itens.filter((t) => t.aula_hoje || t.chamada_hoje).length;
  const feitas = itens.filter((t) => t.chamada_hoje).length;
  const pendentes = itens.filter((t) => t.aula_hoje && !t.chamada_hoje).length;
  return (
    <div className="frequency-page">
      <header className="page-head">
        <div className="page-head-main">
          <span className="page-icon tone-teal" aria-hidden="true">
            <Icon name="calendar" />
          </span>
          <div>
            <div className="page-head-title">
              <h1>Frequência</h1>
              {data && (
                <span className="count-badge">
                  {data.total} {data.total === 1 ? "turma" : "turmas"}
                </span>
              )}
            </div>
            <p>
              Abra uma turma para registrar a aula ou consultar chamadas
              anteriores.
            </p>
          </div>
        </div>
      </header>

      {data && (
        <section className="freq-stats" aria-label="Chamadas de hoje">
          <div className="freq-stat">
            <span className="freq-stat-icon tone-slate">
              <Icon name="users" />
            </span>
            <div>
              <p>Turmas disponíveis</p>
              <strong>
                <Contador valor={data.total} />
              </strong>
            </div>
          </div>
          <div className="freq-stat">
            <span className="freq-stat-icon tone-blue-soft">
              <Icon name="calendar" />
            </span>
            <div>
              <p>Com aula hoje</p>
              <strong>
                <Contador valor={comAula} />
              </strong>
            </div>
          </div>
          <div className="freq-stat">
            <span className="freq-stat-icon tone-green-soft">
              <Icon name="check" />
            </span>
            <div>
              <p>Chamadas concluídas</p>
              <strong>
                <Contador valor={feitas} />
              </strong>
            </div>
          </div>
          <div className="freq-stat">
            <span className="freq-stat-icon tone-amber-soft">
              <Icon name="alert" />
            </span>
            <div>
              <p>Chamadas pendentes</p>
              <strong className={pendentes ? "warn-text" : undefined}>
                <Contador valor={pendentes} />
              </strong>
            </div>
          </div>
        </section>
      )}

      <section className="card data-card toolbar-card">
        <div className="data-toolbar">
          <label className="search-field">
            <span className="sr-only">Buscar turma</span>
            <Icon name="search" />
            <input
              type="search"
              placeholder="Buscar por oficina ou turma"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </label>
        </div>
      </section>

      <section aria-label="Turmas">
        {error ? (
          <div className="empty-state card">
            <p className="error" role="alert">
              {error}
            </p>
            <button
              className="pager-btn"
              onClick={() => setRevision((v) => v + 1)}
            >
              Tentar novamente
            </button>
          </div>
        ) : !data ? (
          <Esqueleto tipo="cartoes" linhas={3} />
        ) : (
          <>
            {!data.items.length ? (
              <div className="empty-state card">
                <h2>Nenhuma turma disponível</h2>
                <p>
                  Confira a busca. Educadores precisam ser vinculados às turmas
                  pela secretaria ou coordenação.
                </p>
              </div>
            ) : (
              <div className="class-grid">
                {data.items.map((t, i) => {
                  const hojeSituacao = situacaoHoje(t);
                  return (
                    <article
                      className="class-card"
                      key={t.id}
                      style={{ ["--i" as string]: i }}
                    >
                      <div className="class-head">
                        <span className="class-icon" aria-hidden="true">
                          <Icon name={iconeOficina(t)} />
                        </span>
                        <div className="class-title">
                          <h2>{t.nome}</h2>
                          <span>{rotuloTurma(t.turma)}</span>
                        </div>
                        <span
                          className={`status-badge ${t.ativa ? "badge-ativo" : "badge-inativo"}`}
                        >
                          <span
                            className={`status-dot ${t.ativa ? "dot-ativo" : "dot-inativo"}`}
                            aria-hidden="true"
                          />
                          {t.ativa ? "Ativa" : "Inativa"}
                        </span>
                      </div>
                      <ul className="class-info">
                        <li>
                          <Icon name="mapPin" />
                          {t.unidade}
                        </li>
                        {t.educador && (
                          <li>
                            <Icon name="user" />
                            {t.educador}
                          </li>
                        )}
                        {t.alunos !== undefined && (
                          <li>
                            <Icon name="users" />
                            {t.alunos} {t.alunos === 1 ? "aluno" : "alunos"}
                          </li>
                        )}
                      </ul>
                      <div className="class-chips">
                        <span>
                          <Icon name="calendar" />
                          {t.dias_semana
                            .map((d) => dias[d].slice(0, 3))
                            .join(", ")}
                        </span>
                        <span>
                          <Icon name="clock" />
                          {horario(t)}
                        </span>
                      </div>
                      <div className={`call-status call-${hojeSituacao.chave}`}>
                        <Icon name={hojeSituacao.icone} />
                        {hojeSituacao.rotulo}
                      </div>
                      <button
                        className={`class-action${hojeSituacao.chave === "pendente" && t.ativa ? " primary" : ""}`}
                        onClick={() => setSelected(t)}
                        aria-label={`Abrir frequência de ${t.nome} ${t.turma}`}
                      >
                        {hojeSituacao.chave === "pendente" && t.ativa
                          ? "Registrar chamada de hoje"
                          : "Abrir frequência"}
                        <Icon name="arrowRight" />
                      </button>
                    </article>
                  );
                })}
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
