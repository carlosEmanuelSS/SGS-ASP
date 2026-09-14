import { useEffect, useState } from "react";
import { api, mensagem } from "../../api";
import type { User } from "../../api";
import { dias, horario } from "./types";
import type { Oficina, Pagina } from "./types";
import { FormularioOficina } from "./FormularioOficina";
import { DetalheOficina } from "./DetalheOficina";

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
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">ATIVIDADES E CONVIVÊNCIA</p>
          <h1>Oficinas e turmas</h1>
          <p>Organize os encontros e conecte cada aluno às atividades.</p>
        </div>
        {user.pode_criar_oficinas && (
          <button
            onClick={() => {
              setSelected(null);
              setView("form");
              setNotice("");
            }}
          >
            + Criar oficina
          </button>
        )}
      </div>
      {notice && (
        <p role="status" className="success">
          {notice}
        </p>
      )}
      <section className="card">
        <div className="toolbar">
          <label className="search">
            Buscar oficina
            <input
              type="search"
              value={query}
              placeholder="Oficina, turma, educador ou unidade"
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            Situação
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
          <p className="empty" role="status">
            Buscando oficinas…
          </p>
        ) : (
          <>
            {!data.items.length ? (
              <div className="empty">
                <h2>Nenhuma oficina encontrada</h2>
                <p>Crie uma turma ou ajuste os filtros para começar.</p>
              </div>
            ) : (
              <div className="workshop-cards">
                {data.items.map((o) => (
                  <article className="workshop-card" key={o.id}>
                    <span className={`badge ${o.ativa ? "ativo" : "inativo"}`}>
                      {o.ativa ? "Ativa" : "Inativa"}
                    </span>
                    <h2>{o.nome}</h2>
                    <strong>{o.turma}</strong>
                    <p>
                      {o.unidade} · {o.educador}
                    </p>
                    <small>
                      {o.dias_semana.map((d) => dias[d]).join(", ")} ·{" "}
                      {horario(o)}
                    </small>
                    <progress
                      aria-label={`Ocupação de ${o.nome}`}
                      value={o.ocupadas}
                      max={o.limite_vagas}
                    />
                    <p>
                      {o.ocupadas} de {o.limite_vagas} vagas ocupadas
                    </p>
                    <button
                      className="secondary"
                      onClick={() => {
                        setSelected(o);
                        setView("detail");
                        setNotice("");
                      }}
                      aria-label={`Ver turma ${o.nome} ${o.turma}`}
                    >
                      Ver turma e matrículas →
                    </button>
                  </article>
                ))}
              </div>
            )}
            <div className="pagination">
              <span>{data.total} turmas encontradas</span>
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
