import { useEffect, useState } from "react";
import { api, mensagem } from "../../api";
import type { User } from "../../api";
import { Barra } from "../../ui";
import { dias, horario } from "./types";
import type { Candidato, DetalheOficina as Ficha, Pagina } from "./types";

export function DetalheOficina({
  id,
  user,
  onBack,
  onEdit,
}: {
  id: string;
  user: User;
  onBack: () => void;
  onEdit: (oficina: Ficha) => void;
}) {
  const [ficha, setFicha] = useState<Ficha | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [candidatos, setCandidatos] = useState<Pagina<Candidato> | null>(null);
  const [candidateError, setCandidateError] = useState("");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void api<Ficha>(`oficinas/${id}/`, "GET", undefined, controller.signal)
      .then(setFicha)
      .catch((e) => {
        if (!controller.signal.aborted) setError(mensagem(e));
      });
    return () => controller.abort();
  }, [id, revision]);
  useEffect(() => {
    if (!user.pode_matricular) return;
    const controller = new AbortController();
    setCandidatos(null);
    setCandidateError("");
    const timeout = setTimeout(() => {
      void api<Pagina<Candidato>>(
        `oficinas/${id}/candidatos/?${new URLSearchParams({ q: query, page: String(page) })}`,
        "GET",
        undefined,
        controller.signal,
      )
        .then(setCandidatos)
        .catch((e) => {
          if (!controller.signal.aborted) setCandidateError(mensagem(e));
        });
    }, 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [id, query, page, revision, user.pode_matricular]);
  async function action(path: string, body: unknown, success: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api(`oficinas/${id}/${path}`, "POST", body);
      setNotice(success);
      setCancelId(null);
      setMotivo("");
      setPage(1);
    } catch (e) {
      setError(mensagem(e));
    } finally {
      setBusy(false);
      setRevision((v) => v + 1);
    }
  }
  // API errors from writes remain visible when the refreshed detail is loaded.
  return (
    <>
      <button className="link" disabled={busy} onClick={onBack}>
        ← Voltar para oficinas
      </button>
      {error && (
        <div className="error" role="alert">
          {error}
          <button
            className="link"
            onClick={() => {
              setError("");
              setRevision((v) => v + 1);
            }}
          >
            Atualizar ficha
          </button>
        </div>
      )}
      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}
      {!ficha ? (
        <p role="status">
          {error
            ? "Não foi possível carregar a oficina."
            : "Carregando oficina…"}
        </p>
      ) : (
        <>
          <div className="page-title">
            <div>
              <p className="eyebrow">OFICINAS E MATRÍCULAS</p>
              <h1>{ficha.nome}</h1>
              <p>
                {ficha.turma} · {ficha.unidade}
              </p>
            </div>
            {user.pode_editar_oficinas && (
              <button disabled={busy} onClick={() => onEdit(ficha)}>
                Editar oficina
              </button>
            )}
          </div>
          <section className="card">
            <div className="workshop-summary">
              <div>
                <span className={`badge ${ficha.ativa ? "ativo" : "inativo"}`}>
                  {ficha.ativa ? "Ativa" : "Inativa"}
                </span>
                <h2>{ficha.tipo}</h2>
                <p>Educador: {ficha.educador}</p>
                <p>
                  {ficha.dias_semana.map((d) => dias[d]).join(", ")} ·{" "}
                  {horario(ficha)}
                </p>
                {ficha.descricao && <p>{ficha.descricao}</p>}
              </div>
              <div>
                <strong className="vacancy-count">
                  {ficha.ocupadas} / {ficha.limite_vagas}
                </strong>
                <p>
                  {ficha.disponiveis
                    ? `${ficha.disponiveis} vagas disponíveis`
                    : "Turma lotada"}
                </p>
                <Barra
                  valor={ficha.ocupadas}
                  max={ficha.limite_vagas}
                  rotulo="Ocupação da turma"
                />
              </div>
            </div>
          </section>
          <div className="enrollment-grid">
            <section className="card">
              <h2>Alunos matriculados</h2>
              <p>
                Cancelar uma matrícula preserva o histórico e libera a vaga.
              </p>
              {!ficha.matriculas.length && (
                <p>Nenhuma matrícula nesta turma.</p>
              )}
              <ul className="people-list">
                {ficha.matriculas.map((m) => (
                  <li key={m.id}>
                    <div>
                      <strong>{m.nome}</strong>
                      <small>
                        Nascimento:{" "}
                        {m.data_nascimento.split("-").reverse().join("/")}
                      </small>
                      <span
                        className={`badge ${m.ativa ? "ativo" : "inativo"}`}
                      >
                        {m.ativa ? "Matriculado" : "Cancelada"}
                      </span>
                    </div>
                    {m.ativa && user.pode_cancelar_matricula && (
                      <button
                        aria-label={`Cancelar matrícula de ${m.nome}`}
                        disabled={busy}
                        className="link"
                        onClick={() => {
                          setCancelId(m.id);
                          setMotivo("");
                        }}
                      >
                        Cancelar matrícula
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {cancelId && (
                <form
                  className="cancel-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void action(
                      `matriculas/${cancelId}/cancelar/`,
                      { motivo },
                      "Matrícula cancelada. A vaga foi liberada.",
                    );
                  }}
                >
                  <label>
                    Motivo do cancelamento *
                    <input
                      required
                      maxLength={300}
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      disabled={busy}
                    />
                  </label>
                  <div className="form-actions">
                    <button
                      type="button"
                      className="secondary"
                      disabled={busy}
                      onClick={() => setCancelId(null)}
                    >
                      Voltar
                    </button>
                    <button disabled={busy}>Confirmar cancelamento</button>
                  </div>
                </form>
              )}
            </section>
            {user.pode_matricular && (
              <section className="card">
                <h2>Matricular aluno</h2>
                <p>
                  Selecione um aluno ativo. Quem já está matriculado nesta turma
                  não aparece na busca.
                </p>
                {!ficha.ativa || !ficha.disponiveis ? (
                  <p className="error">
                    {!ficha.ativa
                      ? "Reative a turma para receber matrículas."
                      : "A turma está lotada."}
                  </p>
                ) : (
                  <>
                    <label>
                      Buscar aluno ativo
                      <input
                        type="search"
                        placeholder="Nome do aluno"
                        value={query}
                        onChange={(e) => {
                          setQuery(e.target.value);
                          setPage(1);
                        }}
                      />
                    </label>
                    {candidateError ? (
                      <p className="error" role="alert">
                        {candidateError}
                      </p>
                    ) : !candidatos ? (
                      <p role="status">Buscando alunos…</p>
                    ) : (
                      <>
                        <ul className="people-list">
                          {candidatos.items.map((a) => (
                            <li key={a.id}>
                              <div>
                                <strong>{a.nome}</strong>
                                <small>
                                  {a.data_nascimento
                                    .split("-")
                                    .reverse()
                                    .join("/")}
                                </small>
                              </div>
                              <button
                                className="secondary"
                                disabled={busy}
                                onClick={() =>
                                  void action(
                                    "matriculas/",
                                    { aluno_id: a.id },
                                    "Matrícula realizada com sucesso.",
                                  )
                                }
                                aria-label={`Matricular ${a.nome}`}
                              >
                                Matricular
                              </button>
                            </li>
                          ))}
                        </ul>
                        {!candidatos.items.length && (
                          <p>
                            Nenhum aluno disponível. Ative o cadastro do aluno
                            no módulo Alunos, se necessário.
                          </p>
                        )}
                        <div className="pagination">
                          <button
                            className="secondary"
                            disabled={busy || candidatos.page <= 1}
                            onClick={() => setPage(candidatos.page - 1)}
                          >
                            Anterior
                          </button>
                          <span>
                            {candidatos.page} de {candidatos.pages}
                          </span>
                          <button
                            className="secondary"
                            disabled={
                              busy || candidatos.page >= candidatos.pages
                            }
                            onClick={() => setPage(candidatos.page + 1)}
                          >
                            Próxima
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}
              </section>
            )}
          </div>
          <section className="card">
            <h2>Histórico da oficina</h2>
            <ol className="timeline">
              {ficha.historico.map((h, i) => (
                <li key={i}>
                  <strong>
                    {{
                      cadastro: "Turma criada",
                      edicao: "Turma atualizada",
                      matricula: "Matrícula realizada",
                      cancelamento: "Matrícula cancelada",
                    }[h.acao] || h.acao}
                  </strong>
                  <small>
                    {new Date(h.criado_em).toLocaleString("pt-BR")} ·{" "}
                    {h.usuario}
                  </small>
                  {h.aluno && <p>{h.aluno}</p>}
                  {h.motivo && <p>{h.motivo}</p>}
                </li>
              ))}
            </ol>
          </section>
        </>
      )}
    </>
  );
}
