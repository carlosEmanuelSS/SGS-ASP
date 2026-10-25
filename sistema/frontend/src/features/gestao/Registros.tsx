import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError, mensagem } from "../../api";
import type { Lista, User } from "../../api";
import { CabecalhoModulo, Esqueleto } from "../../ui";

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
type Pagina = { items: Registro[]; total: number; page: number; pages: number };
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
  }, [tipo, query, status, page, revision, aluno?.id]);
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
  const title = atendimento
    ? aluno
      ? "Atendimentos do aluno"
      : "Atendimentos"
    : "Doações";
  const descricao = atendimento
    ? "Acompanhamento com sigilo e histórico preservado."
    : "Registro das doações recebidas pela instituição.";
  const acoes = (
    <>
      {view === "list" && podeCriar && (
        <button
          onClick={() => {
            setSelected(null);
            setNotice("");
            setView("form");
          }}
        >
          + {atendimento ? "Registrar atendimento" : "Registrar doação"}
        </button>
      )}
      {view === "details" && selected?.pode_editar && (
        <button onClick={() => setView("form")}>Corrigir ou cancelar</button>
      )}
    </>
  );
  return (
    <section className={aluno ? "attendance-section" : undefined}>
      {view === "details" && (
        <button className="link" onClick={voltar}>
          ← Voltar para {title.toLowerCase()}
        </button>
      )}
      {aluno ? (
        <div className="page-title">
          <div>
            <h2>{title}</h2>
            <p>{descricao}</p>
          </div>
          {acoes}
        </div>
      ) : (
        <CabecalhoModulo
          modulo={tipo}
          eyebrow={
            atendimento
              ? "ACOMPANHAMENTO SOCIOASSISTENCIAL"
              : "APOIO À INSTITUIÇÃO"
          }
          titulo={title}
          descricao={descricao}
          acao={acoes}
          resumo={
            view === "list" && list
              ? [
                  {
                    rotulo: atendimento
                      ? "Registros acessíveis"
                      : "Doações registradas",
                    valor: list.total,
                  },
                ]
              : undefined
          }
        />
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
                <div className={k === "descricao" ? "full" : undefined} key={k}>
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
          {selected.revisoes?.map((r) => (
            <details className="record-revision" key={r.versao}>
              <summary>
                Versão {r.versao} · {r.autor} ·{" "}
                {new Date(r.criado_em).toLocaleString("pt-BR")}
              </summary>
              {r.motivo && <p>Motivo: {r.motivo}</p>}
              <dl>
                {Object.entries(labels)
                  .filter(([k]) => k in r.dados)
                  .map(([k, label]) => (
                    <div
                      key={k}
                      className={k === "descricao" ? "full" : undefined}
                    >
                      <dt>{label}</dt>
                      <dd>{exibir(k, r.dados[k], tipos)}</dd>
                    </div>
                  ))}
              </dl>
            </details>
          ))}
        </div>
      ) : (
        <div className="card table-card">
          <div className="toolbar">
            <label className="search">
              Buscar {atendimento ? "por aluno" : "por doador ou descrição"}
              <input
                value={query}
                maxLength={160}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <label>
              Situação
              <select
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">Todas</option>
                <option value="ativo">Ativos</option>
                <option value="cancelado">Cancelados</option>
              </select>
            </label>
          </div>
          {!list ? (
            error ? (
              <p className="empty" role="status">
                Não foi possível carregar os registros.
              </p>
            ) : (
              <Esqueleto tipo="tabela" linhas={4} />
            )
          ) : !list.total ? (
            <p className="empty">Nenhum registro encontrado.</p>
          ) : (
            <>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Data</th>
                      <th>{atendimento ? "Aluno" : "Doador"}</th>
                      <th>Tipo</th>
                      <th>{atendimento ? "Sigilo" : "Valor / quantidade"}</th>
                      <th>Situação</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.items.map((r) => (
                      <tr key={r.id}>
                        <td>{data(r.data)}</td>
                        <td>
                          <strong>
                            {r.aluno_nome || r.doador || "Não informado"}
                          </strong>
                          <small>{r.autor}</small>
                        </td>
                        <td>{tipos[r.tipo]}</td>
                        <td>
                          {atendimento
                            ? niveis[r.nivel as keyof typeof niveis]
                            : r.tipo === "dinheiro"
                              ? Number(r.valor).toLocaleString("pt-BR", {
                                  style: "currency",
                                  currency: "BRL",
                                })
                              : r.quantidade + " " + r.unidade}
                        </td>
                        <td>
                          <span
                            className={
                              "badge " + (r.cancelado ? "inativo" : "ativo")
                            }
                          >
                            {r.cancelado ? "Cancelado" : "Ativo"}
                          </span>
                        </td>
                        <td>
                          <button
                            className="link"
                            disabled={busy}
                            onClick={() => void abrir(r.id)}
                            aria-label={
                              "Ver registro de " +
                              data(r.data) +
                              " " +
                              (r.aluno_nome || r.doador || "")
                            }
                          >
                            Ver registro →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pagination">
                <span>{list.total} registros encontrados</span>
                <div>
                  <button
                    className="secondary"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Anterior
                  </button>
                  <span>
                    {list.page} de {list.pages}
                  </span>
                  <button
                    className="secondary"
                    disabled={page >= list.pages}
                    onClick={() => setPage(page + 1)}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </section>
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
