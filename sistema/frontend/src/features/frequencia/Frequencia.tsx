import { useEffect, useState } from "react";
import { api, mensagem } from "../../api";
import type { User } from "../../api";
import type { Pagina } from "../oficinas/types";
import type { Turma } from "./types";
import { Diario } from "./Diario";
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
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">PRESENÇA E ACOMPANHAMENTO</p>
          <h1>Frequência</h1>
          <p>
            Abra uma turma para registrar a aula ou consultar chamadas
            anteriores.
          </p>
        </div>
      </div>
      <section className="card">
        <label>
          Buscar turma
          <input
            type="search"
            placeholder="Nome da oficina ou turma"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </label>
        {error ? (
          <p className="error" role="alert">
            {error}
            <button className="link" onClick={() => setRevision((v) => v + 1)}>
              Tentar novamente
            </button>
          </p>
        ) : !data ? (
          <p className="empty" role="status">
            Carregando turmas…
          </p>
        ) : (
          <>
            {!data.items.length ? (
              <div className="empty">
                <h2>Nenhuma turma disponível</h2>
                <p>
                  Confira a busca. Educadores precisam ser vinculados às turmas
                  pela secretaria ou coordenação.
                </p>
              </div>
            ) : (
              <div className="workshop-cards">
                {data.items.map((t) => (
                  <article className="workshop-card" key={t.id}>
                    <span className={`badge ${t.ativa ? "ativo" : "inativo"}`}>
                      {t.ativa ? "Ativa" : "Inativa"}
                    </span>
                    <h2>{t.nome}</h2>
                    <p>
                      {t.turma} · {t.unidade}
                    </p>
                    <button
                      className="secondary"
                      onClick={() => setSelected(t)}
                      aria-label={`Abrir frequência de ${t.nome} ${t.turma}`}
                    >
                      Abrir frequência →
                    </button>
                  </article>
                ))}
              </div>
            )}
            <div className="pagination">
              <span>{data.total} turmas</span>
              <div>
                <button
                  className="secondary"
                  disabled={data.page <= 1}
                  onClick={() => setPage(data.page - 1)}
                >
                  Anterior
                </button>
                <span>
                  {data.page} de {data.pages}
                </span>
                <button
                  className="secondary"
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
    </>
  );
}
