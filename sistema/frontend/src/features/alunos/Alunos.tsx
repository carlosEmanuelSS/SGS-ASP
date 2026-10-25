import { useEffect, useState } from "react";
import { api, mensagem, situacoes } from "../../api";
import type { Ficha, Lista, Status, User } from "../../api";
import { Icon } from "../../Icon";
import { Contador, Esqueleto, iniciais, tomAvatar } from "../../ui";
import { labels, dataLocal, nascimento } from "./campos";
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
  const [contagem, setContagem] = useState<Record<Status, number> | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const situacoesLista: Status[] = ["ativo", "lista_espera", "inativo"];
    void Promise.all(
      situacoesLista.map((s) =>
        api<Lista>(
          `alunos/?status=${s}`,
          "GET",
          undefined,
          controller.signal,
        ).then((r) => [s, r.total] as const),
      ),
    )
      .then((totais) =>
        setContagem(Object.fromEntries(totais) as Record<Status, number>),
      )
      .catch(() => {
        // O resumo é complementar; a lista principal já exibe o erro.
      });
    return () => controller.abort();
  }, [revision]);
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
      <div className="profile-page">
        <button className="back-link" onClick={voltar}>
          <Icon name="arrowLeft" />
          Voltar para alunos
        </button>

        <header className="profile-head">
          <div className="profile-id">
            <span
              className={`avatar avatar-lg avatar-${tomAvatar(selected.nome)}`}
              aria-hidden="true"
            >
              {iniciais(selected.nome)}
            </span>
            <div>
              <div className="profile-title">
                <h1>{selected.nome}</h1>
                <span className={`status-badge badge-${selected.status}`}>
                  <span
                    className={`status-dot dot-${selected.status}`}
                    aria-hidden="true"
                  />
                  {situacoes[selected.status]}
                </span>
              </div>
              <p>
                {selected.matricula_escolar && (
                  <>
                    Matrícula escolar{" "}
                    <strong>#{selected.matricula_escolar}</strong> ·{" "}
                  </>
                )}
                {idade(selected.data_nascimento)} anos (
                {nascimento(selected.data_nascimento)})
              </p>
            </div>
          </div>
          {user.pode_editar && (
            <button className="btn-primary" onClick={() => setView("form")}>
              <Icon name="pencil" />
              Editar cadastro
            </button>
          )}
        </header>

        <div className="profile-grid">
          <div className="profile-main">
            <section className="card profile-card">
              <h2>Dados cadastrais</h2>
              <p className="card-sub">
                Informações pessoais, contato e perfil socioeconômico.
              </p>
              <div className="info-group">
                <h3>
                  <Icon name="user" />
                  Informações pessoais
                </h3>
                <dl className="info-grid">
                  <div>
                    <dt>Nome completo</dt>
                    <dd>{selected.nome}</dd>
                  </div>
                  <div>
                    <dt>Data de nascimento</dt>
                    <dd>
                      {nascimento(selected.data_nascimento)}{" "}
                      <span className="muted">
                        ({idade(selected.data_nascimento)} anos)
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt>Matrícula escolar</dt>
                    <dd>{selected.matricula_escolar || <Vazio />}</dd>
                  </div>
                  <div>
                    <dt>CPF</dt>
                    <dd>{selected.cpf ? cpfBR(selected.cpf) : <Vazio />}</dd>
                  </div>
                </dl>
              </div>
              <div className="info-group">
                <h3>
                  <Icon name="phone" />
                  Responsável e contato
                </h3>
                <dl className="info-grid">
                  <div>
                    <dt>Nome do responsável</dt>
                    <dd>{selected.responsavel}</dd>
                  </div>
                  <div>
                    <dt>Parentesco</dt>
                    <dd>{selected.parentesco}</dd>
                  </div>
                  <div>
                    <dt>Telefone com DDD</dt>
                    <dd className="phone-line">
                      {telefoneBR(selected.telefone)}
                      <a
                        className="icon-link"
                        href={`tel:+55${selected.telefone.replace(/\D/g, "")}`}
                        aria-label={`Ligar para ${selected.responsavel}`}
                      >
                        <Icon name="phone" />
                      </a>
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="info-group">
                <h3>
                  <Icon name="wallet" />
                  Perfil socioeconômico
                </h3>
                <dl className="info-grid">
                  <div>
                    <dt>Renda familiar mensal</dt>
                    <dd>
                      {selected.renda_familiar ? (
                        Number(selected.renda_familiar).toLocaleString(
                          "pt-BR",
                          { style: "currency", currency: "BRL" },
                        )
                      ) : (
                        <Vazio />
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Programas sociais</dt>
                    <dd>
                      {selected.programas_sociais
                        ? "Participa"
                        : "Não participa"}
                    </dd>
                  </div>
                  <div className="wide">
                    <dt>Observações cadastrais</dt>
                    <dd>
                      {selected.observacoes || (
                        <span className="muted">
                          Nenhuma observação informada.
                        </span>
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
            </section>

            <div className="profile-pair">
              <section className="card profile-card">
                <div className="card-title-row">
                  <h2>Frequência</h2>
                  {selected.frequencia?.total > 0 && (
                    <span
                      className={`presence-pill ${presencaTom(selected.frequencia.presentes, selected.frequencia.total)}`}
                    >
                      {Math.round(
                        (selected.frequencia.presentes /
                          selected.frequencia.total) *
                          100,
                      )}
                      % de presença
                    </span>
                  )}
                </div>
                {!selected.frequencia?.total ? (
                  <p className="dashed-note">
                    Nenhuma chamada registrada para este aluno.
                  </p>
                ) : (
                  <>
                    <p className="card-sub">
                      {selected.frequencia.presentes}{" "}
                      {selected.frequencia.presentes === 1
                        ? "presença"
                        : "presenças"}{" "}
                      · {selected.frequencia.faltas}{" "}
                      {selected.frequencia.faltas === 1 ? "falta" : "faltas"} em{" "}
                      {selected.frequencia.total} aulas
                    </p>
                    <ul className="mini-list">
                      {selected.frequencia.registros.map((r, i) => (
                        <li key={i}>
                          <div>
                            <strong>{r.oficina}</strong>
                            <span> · {r.turma}</span>
                            <small>
                              {r.data.split("-").reverse().join("/")}
                              {r.justificativa && ` · ${r.justificativa}`}
                            </small>
                          </div>
                          <span
                            className={`mark ${r.presente ? "mark-ok" : "mark-falta"}`}
                            aria-label={r.presente ? "Presente" : "Falta"}
                            title={r.presente ? "Presente" : "Falta"}
                          >
                            <Icon name={r.presente ? "check" : "close"} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>

              <section className="card profile-card">
                <h2>Oficinas matriculadas</h2>
                <p className="card-sub">
                  {selected.matriculas.filter((m) => m.ativa).length} em
                  andamento
                </p>
                {!selected.matriculas?.length ? (
                  <p className="dashed-note">
                    O aluno ainda não possui matrículas.
                  </p>
                ) : (
                  <ul className="mini-list">
                    {selected.matriculas.map((m) => (
                      <li key={m.id}>
                        <div>
                          <strong>
                            {m.oficina} · {m.turma}
                          </strong>
                          <small>
                            Inscrito em {dataLocal(m.criado_em)}
                            {m.cancelado_em &&
                              ` · cancelada em ${dataLocal(m.cancelado_em)}`}
                          </small>
                        </div>
                        <span
                          className={`status-badge ${m.ativa ? "badge-ativo" : "badge-inativo"}`}
                        >
                          {m.ativa ? "Matriculado" : "Cancelada"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>

          <section className="card profile-card history-card">
            <h2>Histórico do cadastro</h2>
            <p className="card-sub">Trilha de alterações e auditoria.</p>
            <ol className="tl">
              {selected.historico.map((h, i) => (
                <li key={i} className={`tl-${h.acao}`}>
                  <span className="tl-dot" aria-hidden="true" />
                  <div>
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
                    {h.acao === "situacao" && h.situacao_anterior && (
                      <div className="tl-transition">
                        <span
                          className={`status-badge badge-${h.situacao_anterior}`}
                        >
                          {situacoes[h.situacao_anterior]}
                        </span>
                        <Icon name="arrowRight" />
                        <span
                          className={`status-badge badge-${h.situacao_nova}`}
                        >
                          {situacoes[h.situacao_nova]}
                        </span>
                      </div>
                    )}
                    {h.acao === "edicao" && h.campos.length > 0 && (
                      <p>
                        Alterou:{" "}
                        {h.campos.map((c) => labels[c] || c).join(", ")}
                      </p>
                    )}
                    {h.motivo && (
                      <p>
                        <span className="muted">Motivo:</span> {h.motivo}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            <p className="record-id">ID: {selected.id}</p>
          </section>
        </div>

        {user.pode_ver_atendimentos && (
          <Registros
            tipo="atendimentos"
            user={user}
            aluno={{ id: selected.id, nome: selected.nome }}
          />
        )}
      </div>
    );
  const totalCadastrados = contagem
    ? contagem.ativo + contagem.lista_espera + contagem.inativo
    : null;
  return (
    <div className="students-page">
      <header className="page-head">
        <div className="page-head-main">
          <span className="page-icon" aria-hidden="true">
            <Icon name="users" />
          </span>
          <div>
            <div className="page-head-title">
              <h1>Alunos</h1>
              {totalCadastrados !== null && (
                <span className="count-badge">
                  <Contador valor={totalCadastrados} />{" "}
                  {totalCadastrados === 1 ? "cadastrado" : "cadastrados"}
                </span>
              )}
            </div>
            <p>Um lugar para conhecer e acompanhar cada história.</p>
          </div>
        </div>
        {user.pode_cadastrar && (
          <button
            className="btn-primary"
            onClick={() => {
              setSelected(null);
              setView("form");
              setNotice("");
            }}
          >
            <Icon name="plus" />
            Cadastrar aluno
          </button>
        )}
      </header>
      {contagem && (
        <ul className="status-pills" aria-label="Alunos por situação">
          {(["ativo", "lista_espera", "inativo"] as Status[]).map((s) => (
            <li key={s}>
              <button
                type="button"
                className={status === s ? "selected" : undefined}
                aria-pressed={status === s}
                onClick={() => {
                  setStatus(status === s ? "" : s);
                  setPage(1);
                }}
              >
                <span className={`status-dot dot-${s}`} aria-hidden="true" />
                {situacoes[s]}
                <strong>
                  <Contador valor={contagem[s]} />
                </strong>
              </button>
            </li>
          ))}
        </ul>
      )}
      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}
      <section className="card table-card data-card">
        <div className="data-toolbar">
          <label className="search-field">
            <span className="sr-only">Buscar aluno</span>
            <Icon name="search" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Buscar por nome, CPF ou responsável"
            />
          </label>
          <label className="select-field">
            <span className="sr-only">Situação</span>
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
          <Esqueleto tipo="tabela" linhas={6} />
        ) : list?.items.length ? (
          <>
            <div className="table-scroll">
              <table className="data-table">
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
                        <div className="person">
                          <span
                            className={`avatar avatar-${tomAvatar(aluno.nome)}`}
                            aria-hidden="true"
                          >
                            {iniciais(aluno.nome)}
                          </span>
                          <span className="person-name">{aluno.nome}</span>
                        </div>
                      </td>
                      <td className="muted-cell">
                        {nascimento(aluno.data_nascimento)}
                      </td>
                      <td>
                        <span className="cell-main">{aluno.responsavel}</span>
                        <small className="cell-sub">
                          {telefoneBR(aluno.telefone)}
                        </small>
                      </td>
                      <td>
                        <span className={`status-badge badge-${aluno.status}`}>
                          <span
                            className={`status-dot dot-${aluno.status}`}
                            aria-hidden="true"
                          />
                          {situacoes[aluno.status]}
                        </span>
                      </td>
                      <td className="actions-cell">
                        <button
                          className="btn-ghost"
                          disabled={busy}
                          onClick={() => void abrir(aluno.id)}
                          aria-label={`Ver ficha de ${aluno.nome}`}
                        >
                          Ver ficha
                          <Icon name="arrowRight" />
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
    </div>
  );
}

/** (61) 98554-0229 ou (61) 3333-4444 a partir dos dígitos salvos. */
function telefoneBR(valor: string) {
  const d = valor.replace(/\D/g, "");
  if (d.length === 11)
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return valor;
}

/** Campo vazio na ficha, em cinza para não competir com os dados preenchidos. */
function Vazio() {
  return <span className="muted">Não informado</span>;
}

/** Idade completa em anos a partir de AAAA-MM-DD. */
function idade(nascimentoIso: string) {
  const [a, m, d] = nascimentoIso.split("-").map(Number);
  const hoje = new Date();
  let anos = hoje.getFullYear() - a;
  if (
    hoje.getMonth() + 1 < m ||
    (hoje.getMonth() + 1 === m && hoje.getDate() < d)
  )
    anos -= 1;
  return anos;
}

/** 529.982.247-25 a partir dos 11 dígitos salvos. */
function cpfBR(valor: string) {
  const d = valor.replace(/\D/g, "");
  return d.length === 11
    ? `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
    : valor;
}

const presencaTom = (presentes: number, total: number) => {
  const p = total ? (presentes / total) * 100 : 0;
  return p >= 85 ? "tom-ok" : p >= 75 ? "tom-warn" : "tom-baixo";
};
