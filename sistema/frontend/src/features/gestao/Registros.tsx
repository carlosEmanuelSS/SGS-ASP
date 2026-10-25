import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { api, ApiError, mensagem } from "../../api";
import type { Lista, User } from "../../api";
import { Icon } from "../../Icon";
import type { IconName } from "../../Icon";
import { Contador, Esqueleto, iniciais, tomAvatar } from "../../ui";

export const tiposAtendimento: Record<string, string> = {
  social: "Social",
  psicologico: "Psicológico",
  visita_domiciliar: "Visita domiciliar",
  encaminhamento: "Encaminhamento",
  outro: "Outro",
};
const tiposDoacao = {
  dinheiro: "Dinheiro",
  alimentos: "Alimentos",
  roupas: "Roupas",
  materiais: "Materiais",
  outro: "Outro",
};
const niveis = {
  publico: "Equipe autorizada",
  restrito: "Equipe técnica",
  confidencial: "Somente o autor",
};
const labels: Record<string, string> = {
  data: "Data",
  tipo: "Tipo",
  aluno_nome: "Aluno",
  nivel: "Sigilo",
  descricao: "Descrição",
  encaminhamento: "Encaminhamento",
  doador: "Doador",
  valor: "Valor (R$)",
  quantidade: "Quantidade",
  unidade: "Unidade",
  cancelado: "Cancelado",
};
type Registro = {
  id: string;
  data: string;
  tipo: string;
  aluno?: string;
  aluno_nome?: string;
  nivel?: string;
  descricao?: string;
  encaminhamento?: string;
  doador?: string;
  valor?: string | null;
  quantidade?: string | null;
  unidade?: string;
  autor: string;
  cancelado: boolean;
  versao: number;
  pode_editar: boolean;
  revisoes?: {
    versao: number;
    motivo: string;
    autor: string;
    criado_em: string;
    dados: Record<string, unknown>;
  }[];
};
type ResumoDoacoes = {
  total_dinheiro: string;
  dinheiro_mes: string;
  doacoes_dinheiro: number;
  doacoes_bens: number;
  doadores: number;
};
type Pagina = {
  items: Registro[];
  total: number;
  page: number;
  pages: number;
  /** Doações e atendimentos devolvem resumos diferentes; cada tela lê só os seus campos. */
  resumo?: ResumoDoacoes & ResumoAtendimentos;
};
type ResumoAtendimentos = {
  total: number;
  mes: number;
  alunos: number;
  sigilosos: number;
};
const iconesAtendimento: Record<string, IconName> = {
  social: "users",
  psicologico: "heart",
  visita_domiciliar: "home",
  encaminhamento: "arrowRight",
  outro: "info",
};
const sigiloTom: Record<string, string> = {
  publico: "seal-publico",
  restrito: "seal-restrito",
  confidencial: "seal-confidencial",
};
const sigiloExplica: Record<string, string> = {
  publico: "Visível para as equipes autorizadas a consultar atendimentos.",
  restrito: "Visível apenas para a equipe técnica.",
  confidencial:
    "Visível somente para quem registrou — nem administradores leem este relato.",
};
type Categoria = "" | "dinheiro" | "bens";
const brl = (v: string | number | null | undefined) =>
  Number(v ?? 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
const quantidade = (q: string | null | undefined, unidade?: string) =>
  `${Number(q ?? 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })} ${unidade ?? ""}`.trim();
const dia = () => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
};
const data = (v: string) => v.split("-").reverse().join("/");

export function Registros({
  tipo,
  user,
  aluno,
}: {
  tipo: "atendimentos" | "doacoes";
  user: User;
  aluno?: { id: string; nome: string };
}) {
  const atendimento = tipo === "atendimentos";
  const tipos: Record<string, string> = atendimento
    ? tiposAtendimento
    : tiposDoacao;
  const podeCriar = atendimento
    ? user.pode_criar_atendimentos
    : user.pode_criar_doacoes;
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [categoria, setCategoria] = useState<Categoria>("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [list, setList] = useState<Pagina | null>(null);
  const [selected, setSelected] = useState<Registro | null>(null);
  const [view, setView] = useState<"list" | "details" | "form">("list");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setList(null);
    setError("");
    const timer = setTimeout(() => {
      const params = new URLSearchParams({
        q: query,
        status,
        page: String(page),
        ...(aluno ? { aluno: aluno.id } : {}),
        ...(!atendimento && categoria ? { categoria } : {}),
        ...(atendimento && tipoFiltro ? { tipo: tipoFiltro } : {}),
      });
      void api<Pagina>(
        tipo + "/?" + params,
        "GET",
        undefined,
        controller.signal,
      )
        .then(setList)
        .catch((e) => {
          if (!controller.signal.aborted) setError(mensagem(e));
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    tipo,
    query,
    status,
    categoria,
    tipoFiltro,
    page,
    revision,
    aluno?.id,
    atendimento,
  ]);
  async function abrir(id: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      setSelected(await api<Registro>(tipo + "/" + id + "/"));
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
      <RegistroForm
        tipo={tipo}
        initial={selected}
        user={user}
        aluno={aluno}
        onCancel={() => setView(selected ? "details" : "list")}
        onSave={(r) => {
          setSelected(r);
          setView("details");
          setRevision((v) => v + 1);
          setNotice(
            r.cancelado
              ? "Registro cancelado, com histórico preservado."
              : "Registro salvo com sucesso.",
          );
        }}
      />
    );
  const doacoesPage = !atendimento && !aluno;
  const atendimentosPage = atendimento && !aluno;
  const title = atendimento
    ? aluno
      ? "Atendimentos do aluno"
      : "Atendimentos"
    : "Doações";
  const novo = () => {
    setSelected(null);
    setNotice("");
    setView("form");
  };
  function filtrar<T>(set: (v: T) => void) {
    return (v: T) => {
      set(v);
      setPage(1);
    };
  }
  return (
    <section
      className={
        aluno
          ? "attendance-section"
          : doacoesPage
            ? "donations-page"
            : "appointments-page"
      }
    >
      {view === "details" && (
        <button className="link back-link" onClick={voltar}>
          <Icon name="arrowLeft" />
          Voltar para {title.toLowerCase()}
        </button>
      )}
      {aluno ? (
        <div className="page-title">
          <div>
            <h2>{title}</h2>
            <p>Acompanhamento com sigilo e histórico preservado.</p>
          </div>
          {view === "list" && podeCriar && (
            <button className="btn-primary" onClick={novo}>
              <Icon name="plus" />
              Registrar atendimento
            </button>
          )}
          {view === "details" && selected?.pode_editar && (
            <button className="btn-outline" onClick={() => setView("form")}>
              Corrigir ou cancelar
            </button>
          )}
        </div>
      ) : (
        <>
          <header className="page-head">
            <div className="page-head-main">
              <span
                className={`page-icon ${doacoesPage ? "tone-amber" : "tone-violet"}`}
                aria-hidden="true"
              >
                <Icon name={doacoesPage ? "gift" : "heart"} />
              </span>
              <div>
                <span className="head-chips">
                  <span
                    className={`eyebrow-chip${atendimentosPage ? " chip-violet" : ""}`}
                  >
                    {doacoesPage
                      ? "Apoio institucional"
                      : "Acompanhamento socioassistencial"}
                  </span>
                  {atendimentosPage && (
                    <span className="eyebrow-chip chip-lock">
                      <Icon name="lock" />
                      Prontuário restrito
                    </span>
                  )}
                </span>
                <h1>
                  {doacoesPage
                    ? "Doações & Recursos"
                    : "Atendimentos Individuais"}
                </h1>
                <p>
                  {doacoesPage
                    ? "Gestão e rastreabilidade das contribuições financeiras e dos donativos recebidos."
                    : "Histórico de escutas, suporte psicológico e visitas de campo, com prontuário protegido por nível de sigilo."}
                </p>
              </div>
            </div>
            {view === "list" && podeCriar && (
              <button className="btn-primary" onClick={novo}>
                <Icon name="plus" />
                {doacoesPage ? "Registrar doação" : "Registrar atendimento"}
              </button>
            )}
            {view === "details" && selected?.pode_editar && (
              <button
                className="btn-outline btn-lg"
                onClick={() => setView("form")}
              >
                <Icon name="pencil" />
                Corrigir ou cancelar
              </button>
            )}
          </header>
          {view === "list" && list?.resumo && (
            <section
              className="report-kpis"
              aria-label={
                doacoesPage ? "Resumo das doações" : "Resumo dos atendimentos"
              }
            >
              {doacoesPage ? (
                <>
                  <Kpi
                    rotulo="Total em dinheiro"
                    icone="wallet"
                    tom="tone-green-soft"
                    valor={brl(list.resumo.total_dinheiro)}
                    nota={`${list.resumo.doacoes_dinheiro} ${list.resumo.doacoes_dinheiro === 1 ? "doação em dinheiro" : "doações em dinheiro"}`}
                  />
                  <Kpi
                    rotulo="Arrecadado no mês"
                    icone="chart"
                    tom="tone-blue-soft"
                    valor={brl(list.resumo.dinheiro_mes)}
                    nota="somente valores em dinheiro"
                  />
                  <Kpi
                    rotulo="Itens e materiais"
                    icone="gift"
                    tom="tone-amber-soft"
                    valor={<Contador valor={list.resumo.doacoes_bens} />}
                    nota="doações de alimentos, roupas e materiais"
                  />
                  <Kpi
                    rotulo="Doadores"
                    icone="users"
                    tom="tone-slate"
                    valor={<Contador valor={list.resumo.doadores} />}
                    nota="pessoas ou empresas identificadas"
                  />
                </>
              ) : (
                <>
                  <Kpi
                    rotulo="Total registrado"
                    icone="book"
                    tom="tone-violet-soft"
                    valor={<Contador valor={list.resumo.total} />}
                    nota="atendimentos ativos que você pode ver"
                  />
                  <Kpi
                    rotulo="Neste mês"
                    icone="calendar"
                    tom="tone-blue-soft"
                    valor={<Contador valor={list.resumo.mes} />}
                    nota="desde o dia 1º"
                  />
                  <Kpi
                    rotulo="Alunos acompanhados"
                    icone="users"
                    tom="tone-green-soft"
                    valor={<Contador valor={list.resumo.alunos} />}
                    nota="com ao menos um atendimento"
                  />
                  <Kpi
                    rotulo="Com sigilo"
                    icone="lock"
                    tom="tone-rose-soft"
                    valor={<Contador valor={list.resumo.sigilosos} />}
                    nota="restritos à equipe técnica ou ao autor"
                  />
                </>
              )}
            </section>
          )}
        </>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}
      {view === "details" && selected ? (
        atendimento ? (
          <DetalheAtendimento r={selected} />
        ) : (
          <div className="card">
            <span
              className={"badge " + (selected.cancelado ? "inativo" : "ativo")}
            >
              {selected.cancelado ? "Cancelado" : "Ativo"}
            </span>
            <dl>
              {Object.entries(labels)
                .filter(([k]) => k in selected && k !== "cancelado")
                .map(([k, label]) => (
                  <div
                    className={k === "descricao" ? "full" : undefined}
                    key={k}
                  >
                    <dt>{label}</dt>
                    <dd>
                      {exibir(
                        k,
                        (selected as unknown as Record<string, unknown>)[k],
                        tipos,
                      )}
                    </dd>
                  </div>
                ))}
            </dl>
            <p>
              Registrado por {selected.autor} · Versão {selected.versao}
            </p>
            <h2>Histórico do registro</h2>
            <Revisoes r={selected} tipos={tipos} />
          </div>
        )
      ) : doacoesPage ? (
        <ListaDoacoes
          list={list}
          error={error}
          busy={busy}
          query={query}
          status={status}
          categoria={categoria}
          page={page}
          tipos={tipos}
          onQuery={filtrar(setQuery)}
          onStatus={filtrar(setStatus)}
          onCategoria={filtrar(setCategoria)}
          onPage={setPage}
          onAbrir={(id) => void abrir(id)}
        />
      ) : (
        <ListaAtendimentos
          list={list}
          error={error}
          busy={busy}
          query={query}
          status={status}
          tipoFiltro={tipoFiltro}
          page={page}
          doAluno={!!aluno}
          onQuery={filtrar(setQuery)}
          onStatus={filtrar(setStatus)}
          onTipo={filtrar(setTipoFiltro)}
          onPage={setPage}
          onAbrir={(id) => void abrir(id)}
        />
      )}
    </section>
  );
}
function Kpi({
  rotulo,
  icone,
  tom,
  valor,
  nota,
}: {
  rotulo: string;
  icone: IconName;
  tom: string;
  valor: ReactNode;
  nota: string;
}) {
  return (
    <article className="card metric-card stat">
      <div className="stat-head">
        <p>{rotulo}</p>
        <span className={`stat-icon ${tom}`}>
          <Icon name={icone} />
        </span>
      </div>
      <strong className="stat-value">{valor}</strong>
      <small>{nota}</small>
    </article>
  );
}
/** Selo de sigilo: cadeado + quem pode ler, com cor por nível. */
function SeloSigilo({ nivel }: { nivel?: string }) {
  const n = nivel || "publico";
  return (
    <span className={`seal ${sigiloTom[n] || ""}`}>
      <Icon name="lock" />
      {niveis[n as keyof typeof niveis] || n}
    </span>
  );
}
function Situacao({ cancelado }: { cancelado: boolean }) {
  return (
    <span
      className={`status-badge ${cancelado ? "badge-inativo" : "badge-ativo"}`}
    >
      <span
        className={`status-dot ${cancelado ? "dot-inativo" : "dot-ativo"}`}
        aria-hidden="true"
      />
      {cancelado ? "Cancelado" : "Ativo"}
    </span>
  );
}
function Revisoes({
  r,
  tipos,
}: {
  r: Registro;
  tipos: Record<string, string>;
}) {
  return (
    <>
      {r.revisoes?.map((rev) => (
        <details className="record-revision" key={rev.versao}>
          <summary>
            Versão {rev.versao} · {rev.autor} ·{" "}
            {new Date(rev.criado_em).toLocaleString("pt-BR")}
          </summary>
          {rev.motivo && <p>Motivo: {rev.motivo}</p>}
          <dl>
            {Object.entries(labels)
              .filter(([k]) => k in rev.dados)
              .map(([k, label]) => (
                <div key={k} className={k === "descricao" ? "full" : undefined}>
                  <dt>{label}</dt>
                  <dd>{exibir(k, rev.dados[k], tipos)}</dd>
                </div>
              ))}
          </dl>
        </details>
      ))}
    </>
  );
}
/** Prontuário do atendimento: identidade, sigilo, relato, encaminhamentos e auditoria. */
function DetalheAtendimento({ r }: { r: Registro }) {
  const nome = r.aluno_nome || "Aluno";
  const nivel = r.nivel || "publico";
  return (
    <div className="record-page">
      <article className="card record-head">
        <div className="record-chips">
          <SeloSigilo nivel={nivel} />
          <Situacao cancelado={r.cancelado} />
        </div>
        <h2 className="record-title">
          <span className="record-kind" aria-hidden="true">
            <Icon name={iconesAtendimento[r.tipo] || "info"} />
          </span>
          {tiposAtendimento[r.tipo] || r.tipo}
        </h2>
        <p className="record-meta">
          <Icon name="calendar" />
          Realizado em {data(r.data)}
          <span aria-hidden="true">•</span>
          Versão {r.versao}
        </p>
        <div className="record-people">
          <div className="person">
            <span
              className={`avatar avatar-${tomAvatar(nome)}`}
              aria-hidden="true"
            >
              {iniciais(nome)}
            </span>
            <div>
              <small className="cell-sub">Aluno acompanhado</small>
              <span className="cell-main">{nome}</span>
            </div>
          </div>
          <div className="person">
            <span className="avatar avatar-pro" aria-hidden="true">
              <Icon name="user" />
            </span>
            <div>
              <small className="cell-sub">Profissional responsável</small>
              <span className="cell-main">{r.autor}</span>
            </div>
          </div>
        </div>
        <p className={`privacy-note ${sigiloTom[nivel] || ""}`}>
          <Icon name="lock" />
          <span>
            <strong>Informação sigilosa.</strong> {sigiloExplica[nivel]}
          </span>
        </p>
      </article>
      <div className="record-body">
        <section className="card record-block">
          <h3>
            <Icon name="book" />
            Relato e evolução
          </h3>
          <p className="record-text">
            {r.descricao || "Sem relato registrado."}
          </p>
        </section>
        <section className="card record-block">
          <h3>
            <Icon name="arrowRight" />
            Encaminhamentos
          </h3>
          {r.encaminhamento ? (
            <p className="record-text">{r.encaminhamento}</p>
          ) : (
            <p className="dashed-note">
              Nenhum encaminhamento registrado neste atendimento.
            </p>
          )}
        </section>
      </div>
      <section className="card record-block">
        <h3>
          <Icon name="clock" />
          Trilha de auditoria
        </h3>
        <p className="card-sub">
          Cada correção gera uma nova versão; as anteriores ficam preservadas.
        </p>
        <Revisoes r={r} tipos={tiposAtendimento} />
      </section>
    </div>
  );
}
/** Lista de atendimentos no estilo prontuário: busca, filtros e selos de sigilo. */
function ListaAtendimentos({
  list,
  error,
  busy,
  query,
  status,
  tipoFiltro,
  page,
  doAluno,
  onQuery,
  onStatus,
  onTipo,
  onPage,
  onAbrir,
}: {
  list: Pagina | null;
  error: string;
  busy: boolean;
  query: string;
  status: string;
  tipoFiltro: string;
  page: number;
  doAluno: boolean;
  onQuery: (v: string) => void;
  onStatus: (v: string) => void;
  onTipo: (v: string) => void;
  onPage: (v: number) => void;
  onAbrir: (id: string) => void;
}) {
  return (
    <section className="card data-card">
      <div className="data-toolbar in-card">
        {!doAluno && (
          <label className="search-field">
            <span className="sr-only">Buscar por aluno</span>
            <Icon name="search" />
            <input
              type="search"
              value={query}
              maxLength={160}
              placeholder="Buscar por aluno"
              onChange={(e) => onQuery(e.target.value)}
            />
          </label>
        )}
        <label className="select-field compact">
          <span className="sr-only">Modalidade</span>
          <select value={tipoFiltro} onChange={(e) => onTipo(e.target.value)}>
            <option value="">Todas as modalidades</option>
            {Object.entries(tiposAtendimento).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className="select-field compact">
          <span className="sr-only">Situação</span>
          <select value={status} onChange={(e) => onStatus(e.target.value)}>
            <option value="">Todas as situações</option>
            <option value="ativo">Ativos</option>
            <option value="cancelado">Cancelados</option>
          </select>
        </label>
      </div>
      {!list ? (
        error ? (
          <p className="dashed-note">Não foi possível carregar os registros.</p>
        ) : (
          <Esqueleto tipo="tabela" linhas={4} />
        )
      ) : !list.total ? (
        <div className="report-empty borderless">
          <span aria-hidden="true">
            <Icon name="inbox" />
          </span>
          <strong>Nenhum registro encontrado.</strong>
          <p>
            Você só vê os atendimentos que seu perfil pode acessar. Ajuste os
            filtros ou registre um novo atendimento.
          </p>
        </div>
      ) : (
        <>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  {!doAluno && <th>Aluno</th>}
                  <th>Modalidade</th>
                  <th>Nível de sigilo</th>
                  <th>Situação</th>
                  <th>
                    <span className="sr-only">Ação</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((r) => {
                  const nome = r.aluno_nome || "Aluno";
                  return (
                    <tr key={r.id}>
                      <td className="muted-cell">
                        <span className="date-cell">
                          <Icon name="calendar" />
                          {data(r.data)}
                        </span>
                      </td>
                      {!doAluno && (
                        <td>
                          <div className="person">
                            <span
                              className={`avatar avatar-${tomAvatar(nome)}`}
                              aria-hidden="true"
                            >
                              {iniciais(nome)}
                            </span>
                            <div>
                              <span className="cell-main">{nome}</span>
                              <small className="cell-sub">
                                Atendido por {r.autor}
                              </small>
                            </div>
                          </div>
                        </td>
                      )}
                      <td>
                        <span className="kind-badge kind-care">
                          <Icon name={iconesAtendimento[r.tipo] || "info"} />
                          {tiposAtendimento[r.tipo] || r.tipo}
                        </span>
                      </td>
                      <td>
                        <SeloSigilo nivel={r.nivel} />
                      </td>
                      <td>
                        <Situacao cancelado={r.cancelado} />
                      </td>
                      <td className="actions-cell">
                        <button
                          className="btn-ghost"
                          disabled={busy}
                          onClick={() => onAbrir(r.id)}
                          aria-label={
                            "Ver registro de " +
                            data(r.data) +
                            " " +
                            (r.aluno_nome || "")
                          }
                        >
                          Abrir prontuário
                          <Icon name="arrowRight" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="page-footer in-card">
            <span>
              {list.total}{" "}
              {list.total === 1
                ? "registro encontrado"
                : "registros encontrados"}
            </span>
            {list.pages > 1 && (
              <div className="pager">
                <button
                  className="pager-btn"
                  disabled={page <= 1}
                  onClick={() => onPage(page - 1)}
                >
                  Anterior
                </button>
                <span>
                  Página {list.page} de {list.pages}
                </span>
                <button
                  className="pager-btn"
                  disabled={page >= list.pages}
                  onClick={() => onPage(page + 1)}
                >
                  Próxima
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
/** Lista de doações: abas por categoria, busca com ícone e tabela no padrão data table. */
function ListaDoacoes({
  list,
  error,
  busy,
  query,
  status,
  categoria,
  page,
  tipos,
  onQuery,
  onStatus,
  onCategoria,
  onPage,
  onAbrir,
}: {
  list: Pagina | null;
  error: string;
  busy: boolean;
  query: string;
  status: string;
  categoria: Categoria;
  page: number;
  tipos: Record<string, string>;
  onQuery: (v: string) => void;
  onStatus: (v: string) => void;
  onCategoria: (v: Categoria) => void;
  onPage: (v: number) => void;
  onAbrir: (id: string) => void;
}) {
  const abas: [Categoria, string][] = [
    ["", "Todas as doações"],
    ["dinheiro", "Dinheiro"],
    ["bens", "Itens e materiais"],
  ];
  return (
    <>
      <section className="card data-card toolbar-card">
        <div className="data-toolbar">
          <div className="segmented" role="group" aria-label="Categoria">
            {abas.map(([valor, rotulo]) => (
              <button
                type="button"
                key={rotulo}
                className={categoria === valor ? "active" : undefined}
                aria-pressed={categoria === valor}
                onClick={() => onCategoria(valor)}
              >
                {rotulo}
              </button>
            ))}
          </div>
          <label className="search-field">
            <span className="sr-only">Buscar por doador ou descrição</span>
            <Icon name="search" />
            <input
              type="search"
              value={query}
              maxLength={160}
              placeholder="Buscar por doador ou descrição"
              onChange={(e) => onQuery(e.target.value)}
            />
          </label>
          <label className="select-field compact">
            <span className="sr-only">Situação</span>
            <select value={status} onChange={(e) => onStatus(e.target.value)}>
              <option value="">Todas as situações</option>
              <option value="ativo">Ativas</option>
              <option value="cancelado">Canceladas</option>
            </select>
          </label>
        </div>
      </section>
      <section className="card data-card">
        {!list ? (
          error ? (
            <p className="dashed-note">Não foi possível carregar as doações.</p>
          ) : (
            <Esqueleto tipo="tabela" linhas={4} />
          )
        ) : !list.total ? (
          <div className="report-empty borderless">
            <span aria-hidden="true">
              <Icon name="inbox" />
            </span>
            <strong>Nenhum registro encontrado.</strong>
            <p>Ajuste a busca ou a categoria, ou registre uma nova doação.</p>
          </div>
        ) : (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Doador</th>
                    <th>Tipo</th>
                    <th>Valor / quantidade</th>
                    <th>Situação</th>
                    <th>
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.items.map((r) => {
                    const dinheiro = r.tipo === "dinheiro";
                    const nome = r.doador || "Doador não informado";
                    return (
                      <tr key={r.id}>
                        <td className="muted-cell">
                          <span className="date-cell">
                            <Icon name="calendar" />
                            {data(r.data)}
                          </span>
                        </td>
                        <td>
                          <div className="person">
                            <span
                              className={`avatar avatar-${tomAvatar(nome)}`}
                              aria-hidden="true"
                            >
                              {r.doador ? iniciais(r.doador) : "?"}
                            </span>
                            <div>
                              <span className="cell-main">{nome}</span>
                              <small className="cell-sub">
                                registrado por {r.autor}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`kind-badge ${dinheiro ? "kind-money" : "kind-goods"}`}
                          >
                            <Icon name={dinheiro ? "wallet" : "gift"} />
                            {tipos[r.tipo]}
                          </span>
                        </td>
                        <td>
                          <span
                            className={dinheiro ? "money-value" : "qty-value"}
                          >
                            {dinheiro
                              ? brl(r.valor)
                              : quantidade(r.quantidade, r.unidade)}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`status-badge ${r.cancelado ? "badge-inativo" : "badge-ativo"}`}
                          >
                            <span
                              className={`status-dot ${r.cancelado ? "dot-inativo" : "dot-ativo"}`}
                              aria-hidden="true"
                            />
                            {r.cancelado ? "Cancelada" : "Ativa"}
                          </span>
                        </td>
                        <td className="actions-cell">
                          <button
                            className="btn-ghost"
                            disabled={busy}
                            onClick={() => onAbrir(r.id)}
                            aria-label={
                              "Ver registro de " +
                              data(r.data) +
                              " " +
                              (r.doador || "")
                            }
                          >
                            Ver registro
                            <Icon name="arrowRight" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="page-footer in-card">
              <span>
                {list.total}{" "}
                {list.total === 1
                  ? "registro encontrado"
                  : "registros encontrados"}
              </span>
              <div className="pager">
                <button
                  className="pager-btn"
                  disabled={page <= 1}
                  onClick={() => onPage(page - 1)}
                >
                  Anterior
                </button>
                <span>
                  Página {list.page} de {list.pages}
                </span>
                <button
                  className="pager-btn"
                  disabled={page >= list.pages}
                  onClick={() => onPage(page + 1)}
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

function exibir(key: string, value: unknown, tipos: Record<string, string>) {
  if (key === "cancelado") return value ? "Sim" : "Não";
  if (value === null || value === "") return "Não informado";
  if (key === "data") return data(String(value));
  if (key === "tipo") return tipos[String(value)] || String(value);
  if (key === "nivel")
    return niveis[value as keyof typeof niveis] || String(value);
  return String(value);
}

function RegistroForm({
  tipo,
  initial,
  user,
  aluno,
  onCancel,
  onSave,
}: {
  tipo: "atendimentos" | "doacoes";
  initial: Registro | null;
  user: User;
  aluno?: { id: string; nome: string };
  onCancel: () => void;
  onSave: (r: Registro) => void;
}) {
  const atendimento = tipo === "atendimentos";
  const [form, setForm] = useState<Record<string, string>>(
    (): Record<string, string> =>
      atendimento
        ? {
            aluno: initial?.aluno || aluno?.id || "",
            data: initial?.data || dia(),
            tipo: initial?.tipo || "social",
            nivel: initial?.nivel || "confidencial",
            descricao: initial?.descricao || "",
            encaminhamento: initial?.encaminhamento || "",
          }
        : {
            data: initial?.data || dia(),
            tipo: initial?.tipo || "dinheiro",
            doador: initial?.doador || "",
            descricao: initial?.descricao || "",
            valor: initial?.valor || "",
            quantidade: initial?.quantidade || "",
            unidade: initial?.unidade || "",
          },
  );
  const [dirty, setDirty] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [cancelado, setCancelado] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [search, setSearch] = useState("");
  const [options, setOptions] = useState<Lista | null>(null);
  useEffect(() => {
    if (!dirty) return;
    const leave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty]);
  useEffect(() => {
    if (!atendimento || initial || aluno) return;
    const controller = new AbortController();
    setOptions(null);
    const timer = setTimeout(() => {
      void api<Lista>(
        "alunos/?q=" + encodeURIComponent(search),
        "GET",
        undefined,
        controller.signal,
      )
        .then(setOptions)
        .catch((e) => {
          if (!controller.signal.aborted) setError(mensagem(e));
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [atendimento, initial, aluno?.id, search]);
  function mudar(key: string, value: string) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
      ...(!atendimento && key === "tipo"
        ? { valor: "", quantidade: "", unidade: "" }
        : {}),
    }));
    setDirty(true);
  }
  async function salvar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setFields({});
    const payload = {
      ...form,
      ...(atendimento
        ? {}
        : form.tipo === "dinheiro"
          ? { quantidade: null, unidade: "" }
          : { valor: null }),
      ...(initial ? { versao: initial.versao, motivo, cancelado } : {}),
    };
    try {
      const saved = await api<Registro>(
        tipo + "/" + (initial ? initial.id + "/" : ""),
        initial ? "PUT" : "POST",
        payload,
      );
      setDirty(false);
      onSave(saved);
    } catch (e) {
      setError(mensagem(e));
      if (e instanceof ApiError) setFields(e.fields);
    } finally {
      setBusy(false);
    }
  }
  const input = (
    key: string,
    type = "text",
    required = true,
    maxLength = 160,
  ) => (
    <label key={key}>
      {labels[key]}
      {required ? " *" : ""}
      <input
        type={type}
        value={form[key]}
        required={required}
        maxLength={maxLength}
        max={type === "date" ? dia() : undefined}
        min={type === "number" ? "0.01" : undefined}
        step={type === "number" ? "0.01" : undefined}
        aria-invalid={!!fields[key]}
        onChange={(e) => mudar(key, e.target.value)}
      />
      {fields[key] && (
        <span className="field-error">{fields[key].join(" ")}</span>
      )}
    </label>
  );
  return (
    <form
      className="card form-card"
      data-dirty={dirty}
      onSubmit={(e) => void salvar(e)}
    >
      <h2>
        {initial ? "Corrigir ou cancelar" : "Registrar"}{" "}
        {atendimento ? "atendimento" : "doação"}
      </h2>
      <p>
        {atendimento
          ? "O aluno e o sigilo são preservados após o primeiro registro. Somente o autor pode corrigir ou cancelar."
          : "Informe valor em reais para dinheiro ou quantidade e unidade para bens."}
      </p>
      {error && (
        <div role="alert" className="error">
          {error}
          {fields.__all__ && <p>{fields.__all__.join(" ")}</p>}
        </div>
      )}
      <fieldset disabled={busy}>
        <div className="form-grid">
          {atendimento &&
            (initial || aluno ? (
              <div className="full">
                <strong>Aluno: {initial?.aluno_nome || aluno?.nome}</strong>
              </div>
            ) : (
              <>
                <label>
                  Buscar aluno
                  <input
                    value={search}
                    maxLength={160}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <label>
                  Aluno *
                  <select
                    value={form.aluno}
                    aria-label="Aluno *"
                    required
                    onChange={(e) => mudar("aluno", e.target.value)}
                  >
                    <option value="">Selecione o aluno</option>
                    {form.aluno &&
                      !options?.items.some((a) => a.id === form.aluno) && (
                        <option value={form.aluno}>Aluno selecionado</option>
                      )}
                    {options?.items.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nome} · {data(a.data_nascimento)}
                      </option>
                    ))}
                  </select>
                  <small>
                    Exibindo até 20 resultados. Refine a busca pelo nome.
                  </small>
                  {fields.aluno && (
                    <span className="field-error">
                      {fields.aluno.join(" ")}
                    </span>
                  )}
                </label>
              </>
            ))}
          {input("data", "date")}
          <label>
            Tipo *
            <select
              value={form.tipo}
              onChange={(e) => mudar("tipo", e.target.value)}
            >
              {Object.entries(atendimento ? tiposAtendimento : tiposDoacao).map(
                ([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ),
              )}
            </select>
          </label>
          {atendimento ? (
            <>
              <label>
                Sigilo *
                <select
                  disabled={!!initial}
                  value={form.nivel}
                  aria-label="Sigilo *"
                  onChange={(e) => mudar("nivel", e.target.value)}
                >
                  {Object.entries(niveis)
                    .filter(
                      ([v]) =>
                        v !== "restrito" ||
                        user.pode_ler_restritos ||
                        initial?.nivel === "restrito",
                    )
                    .map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                </select>
                <small>
                  “Equipe autorizada” nunca significa acesso público pela
                  internet.
                </small>
              </label>
              {input("encaminhamento", "text", false, 500)}
            </>
          ) : (
            <>
              {input("doador", "text", false)}
              {form.tipo === "dinheiro" ? (
                input("valor", "number")
              ) : (
                <>
                  {input("quantidade", "number")}
                  {input("unidade", "text", true, 40)}
                </>
              )}
            </>
          )}
          <label className="full">
            Descrição *
            <textarea
              required
              maxLength={atendimento ? 10000 : 1000}
              value={form.descricao}
              aria-label="Descrição *"
              aria-invalid={!!fields.descricao}
              onChange={(e) => mudar("descricao", e.target.value)}
            />
            {fields.descricao && (
              <span className="field-error">{fields.descricao.join(" ")}</span>
            )}
          </label>
          {initial && (
            <>
              <label className="checkbox full">
                <input
                  type="checkbox"
                  checked={cancelado}
                  onChange={(e) => {
                    setCancelado(e.target.checked);
                    setDirty(true);
                  }}
                />
                Cancelar registro e impedir novas alterações
              </label>
              <label className="full">
                Motivo da alteração *
                <textarea
                  required
                  maxLength={300}
                  value={motivo}
                  aria-label="Motivo da alteração *"
                  onChange={(e) => {
                    setMotivo(e.target.value);
                    setDirty(true);
                  }}
                />
              </label>
            </>
          )}
        </div>
      </fieldset>
      <div className="form-actions">
        <button
          type="button"
          className="secondary"
          disabled={busy}
          onClick={() => {
            if (
              !dirty ||
              window.confirm("Descartar as alterações ainda não salvas?")
            )
              onCancel();
          }}
        >
          Voltar
        </button>
        <button disabled={busy}>
          {busy
            ? "Salvando…"
            : cancelado
              ? "Confirmar cancelamento"
              : "Salvar registro"}
        </button>
      </div>
    </form>
  );
}
