import { useEffect, useState } from "react";
import { api, mensagem, situacoes } from "../../api";
import type { Ficha, Lista, User } from "../../api";
import { campos, labels, dataLocal, nascimento } from "./campos";
import { Formulario } from "./Formulario";
import { Registros } from "../gestao/Registros";
export function Alunos({ user }: { user: User }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [list, setList] = useState<Lista | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<Ficha | null>(null);
  const [view, setView] = useState<"list" | "form" | "details">("list");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timeout = setTimeout(() => {
      void api<Lista>(
        `alunos/?${new URLSearchParams({ q: query, status, page: String(page) })}`,
        "GET",
        undefined,
        controller.signal,
      )
        .then(setList)
        .catch((e) => {
          if (!controller.signal.aborted) setError(mensagem(e));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [query, status, page, revision]);
  async function abrir(id: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setSelected(await api<Ficha>(`alunos/${id}/`));
      setView("details");
    } catch (e) {
      setError(mensagem(e));
    } finally {
      setBusy(false);
    }
  }
  function voltar() {
    setView("list");
    setSelected(null);
    setError("");
  }
  if (view === "form")
    return (
      <Formulario
        initial={selected}
        onCancel={voltar}
        onSave={() => {
          setNotice(
            selected
              ? "Cadastro atualizado com sucesso."
              : "Aluno cadastrado na lista de espera.",
          );
          voltar();
          setRevision((v) => v + 1);
          setPage(1);
          setQuery("");
          setStatus("");
        }}
      />
    );
  if (view === "details" && selected)
    return (
      <>
        <button className="link" onClick={voltar}>
          ← Voltar para alunos
        </button>
        <div className="page-title">
          <div>
            <p className="eyebrow">FICHA DO ALUNO</p>
            <h1>{selected.nome}</h1>
            <span className={`badge ${selected.status}`}>
              {situacoes[selected.status]}
            </span>
          </div>
          {user.pode_editar && (
            <button onClick={() => setView("form")}>Editar cadastro</button>
          )}
        </div>
        <div className="details-grid">
          <section className="card">
            <h2>Dados cadastrais</h2>
            <dl>
              {campos.map((c) => (
                <div key={c.key}>
                  <dt>{c.label}</dt>
                  <dd>
                    {c.key === "data_nascimento"
                      ? nascimento(selected.data_nascimento)
                      : selected[c.key] || "Não informado"}
                  </dd>
                </div>
              ))}
              <div>
                <dt>Participa de programas sociais</dt>
                <dd>{selected.programas_sociais ? "Sim" : "Não"}</dd>
              </div>
            </dl>
          </section>
          <section className="card">
            <h2>Histórico do cadastro</h2>
            <p>Registro das alterações feitas pela equipe.</p>
            <ol className="timeline">
              {selected.historico.map((h, i) => (
                <li key={i}>
                  <strong>
                    {{
                      cadastro: "Cadastro realizado",
                      edicao: "Dados atualizados",
                      situacao: "Situação alterada",
                    }[h.acao] || h.acao}
                  </strong>
                  <small>
                    {dataLocal(h.criado_em)} · {h.usuario}
                  </small>
                  {h.acao !== "cadastro" && (
                    <p>{h.campos.map((c) => labels[c] || c).join(", ")}</p>
                  )}
                  {h.acao === "situacao" && h.situacao_anterior && (
                    <p>
                      {situacoes[h.situacao_anterior]} →{" "}
                      {situacoes[h.situacao_nova]}
                    </p>
                  )}
                  {h.motivo && <p>Motivo: {h.motivo}</p>}
                </li>
              ))}
            </ol>
            <small>Identificação: {selected.id}</small>
          </section>
          <section className="card">
            <h2>Frequência do aluno</h2>
            {!selected.frequencia?.total ? (
              <p>Nenhuma chamada registrada para este aluno.</p>
            ) : (
              <>
                <p>
                  {selected.frequencia.presentes} presenças ·{" "}
                  {selected.frequencia.faltas} faltas em{" "}
                  {selected.frequencia.total} aulas.
                </p>
                <p>
                  Presença em{" "}
                  {Math.round(
                    (selected.frequencia.presentes /
                      selected.frequencia.total) *
                      100,
                  )}
                  % das aulas registradas. Últimos 50 registros abaixo.
                </p>
                <ul className="people-list">
                  {selected.frequencia.registros.map((r, i) => (
                    <li key={i}>
                      <div>
                        <strong>
                          {r.data.split("-").reverse().join("/")} · {r.oficina}
                        </strong>
                        <small>{r.turma}</small>
                        {r.justificativa && <p>{r.justificativa}</p>}
                      </div>
                      <span
                        className={`badge ${r.presente ? "ativo" : "inativo"}`}
                      >
                        {r.presente ? "Presente" : "Falta"}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
          <section className="card">
            <h2>Oficinas e matrículas</h2>
            {!selected.matriculas?.length ? (
              <p>O aluno ainda não possui matrículas.</p>
            ) : (
              <ul className="people-list">
                {selected.matriculas.map((m) => (
                  <li key={m.id}>
                    <div>
                      <strong>
                        {m.oficina} · {m.turma}
                      </strong>
                      <small>Inscrição: {dataLocal(m.criado_em)}</small>
                      {m.cancelado_em && (
                        <small>Cancelamento: {dataLocal(m.cancelado_em)}</small>
                      )}
                    </div>
                    <span className={`badge ${m.ativa ? "ativo" : "inativo"}`}>
                      {m.ativa ? "Matriculado" : "Cancelada"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        {user.pode_ver_atendimentos && (
          <Registros
            tipo="atendimentos"
            user={user}
            aluno={{ id: selected.id, nome: selected.nome }}
          />
        )}
      </>
    );
  return (
    <>
      <div className="page-title">
        <div>
          <p className="eyebrow">ACOLHIMENTO E ACOMPANHAMENTO</p>
          <h1>Alunos</h1>
          <p>Um lugar para conhecer e acompanhar cada história.</p>
        </div>
        {user.pode_cadastrar && (
          <button
            onClick={() => {
              setSelected(null);
              setView("form");
              setNotice("");
            }}
          >
            + Cadastrar aluno
          </button>
        )}
      </div>
      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}
      <section className="card table-card">
        <div className="toolbar">
          <label className="search">
            Buscar aluno
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Nome, CPF ou responsável"
            />
          </label>
          <label>
            Situação
            <select
              aria-label="Situação"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Todas as situações</option>
              {Object.entries(situacoes).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {error ? (
          <div className="empty">
            <p className="error" role="alert">
              {error}
            </p>
            <button
              className="secondary"
              onClick={() => setRevision((v) => v + 1)}
            >
              Tentar novamente
            </button>
          </div>
        ) : loading ? (
          <p className="empty" role="status">
            Buscando alunos…
          </p>
        ) : list?.items.length ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Aluno</th>
                    <th>Nascimento</th>
                    <th>Responsável</th>
                    <th>Situação</th>
                    <th>
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((aluno) => (
                    <tr key={aluno.id}>
                      <td>
                        <strong>{aluno.nome}</strong>
                      </td>
                      <td>{nascimento(aluno.data_nascimento)}</td>
                      <td>
                        {aluno.responsavel}
                        <small>{aluno.telefone}</small>
                      </td>
                      <td>
                        <span className={`badge ${aluno.status}`}>
                          {situacoes[aluno.status]}
                        </span>
                      </td>
                      <td>
                        <button
                          className="link"
                          disabled={busy}
                          onClick={() => void abrir(aluno.id)}
                          aria-label={`Ver ficha de ${aluno.nome}`}
                        >
                          Ver ficha →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <span>
                {list.total}{" "}
                {list.total === 1 ? "aluno encontrado" : "alunos encontrados"}
              </span>
              <div>
                <button
                  className="secondary"
                  disabled={list.page <= 1}
                  onClick={() => setPage(list.page - 1)}
                >
                  Anterior
                </button>
                <span>
                  {list.page} de {list.pages}
                </span>
                <button
                  className="secondary"
                  disabled={list.page >= list.pages}
                  onClick={() => setPage(list.page + 1)}
                >
                  Próxima
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty">
            <div className="empty-symbol">A</div>
            <h2>
              {query || status
                ? "Nenhum aluno encontrado"
                : "O primeiro cadastro começa aqui"}
            </h2>
            <p>
              {query || status
                ? "Ajuste a busca ou a situação para encontrar um aluno."
                : "Cadastre os dados do aluno e do responsável para iniciar o acompanhamento."}
            </p>
          </div>
        )}
      </section>
    </>
  );
}
