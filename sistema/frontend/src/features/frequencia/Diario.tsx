import { useEffect, useState } from "react";
import { api, mensagem } from "../../api";
import type { User } from "../../api";
import { Icon } from "../../Icon";
import { iniciais, tomAvatar } from "../../ui";
import type { Pagina } from "../oficinas/types";
import { dias, iconeOficina, rotuloTurma } from "../oficinas/types";
import { hoje } from "./types";
import type { Chamada, Registro, Resumo, Turma } from "./types";
import { AcessosTurma } from "./AcessosTurma";

const dataBR = (iso: string) => iso.split("-").reverse().join("/");

export function Diario({
  turma,
  user,
  onBack,
}: {
  turma: Turma;
  user: User;
  onBack: () => void;
}) {
  const [data, setData] = useState(hoje());
  const [ficha, setFicha] = useState<Chamada | null>(null);
  const [rows, setRows] = useState<Registro[]>([]);
  const [motivo, setMotivo] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const [hist, setHist] = useState<Pagina<Resumo> | null>(null);
  const [histError, setHistError] = useState("");
  const [histPage, setHistPage] = useState(1);
  const [histRevision, setHistRevision] = useState(0);
  const path = `frequencia/turmas/${turma.id}/chamada/?data=${data}`;
  useEffect(() => {
    const ctrl = new AbortController();
    setFicha(null);
    setRows([]);
    setError("");
    setDirty(false);
    setMotivo("");
    void api<Chamada>(path, "GET", undefined, ctrl.signal)
      .then((d) => {
        setFicha(d);
        setRows(d.registros);
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) setError(mensagem(e));
      });
    return () => ctrl.abort();
  }, [path, revision]);
  useEffect(() => {
    const ctrl = new AbortController();
    setHistError("");
    void api<Pagina<Resumo>>(
      `frequencia/turmas/${turma.id}/historico/?page=${histPage}`,
      "GET",
      undefined,
      ctrl.signal,
    )
      .then(setHist)
      .catch((e) => {
        if (!ctrl.signal.aborted) setHistError(mensagem(e));
      });
    return () => ctrl.abort();
  }, [turma.id, histPage, histRevision]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function podeSair() {
    return (
      !document.querySelector('form[data-dirty="true"]') ||
      window.confirm("Descartar as alterações ainda não salvas?")
    );
  }
  function abrir(value: string) {
    if (podeSair()) {
      setNotice("");
      setData(value);
      setRevision((v) => v + 1);
    }
  }
  function marcar(index: number, value: Partial<Registro>) {
    setRows((r) => r.map((a, i) => (i === index ? { ...a, ...value } : a)));
    setDirty(true);
  }
  async function save() {
    if (!ficha) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api<Chamada>(path, ficha.id ? "PUT" : "POST", {
        versao: ficha.versao,
        motivo,
        registros: rows.map(({ matricula_id, presente, justificativa }) => ({
          matricula_id,
          presente,
          justificativa,
        })),
      });
      setFicha(result);
      setRows(result.registros);
      setDirty(false);
      setMotivo("");
      setNotice(
        ficha.id
          ? "Correção salva com histórico."
          : "Chamada registrada com sucesso.",
      );
      setHistRevision((v) => v + 1);
    } catch (e) {
      setError(mensagem(e));
    } finally {
      setBusy(false);
    }
  }
  const presentes = rows.filter((r) => r.presente === true).length;
  const faltas = rows.filter((r) => r.presente === false).length;
  const pendentes = rows.length - presentes - faltas;
  const marcados = rows.length - pendentes;
  const canWrite =
    ficha &&
    (ficha.id
      ? user.pode_corrigir_chamada
      : user.pode_criar_chamada && ficha.oficina.ativa);
  const foraDoDia =
    ficha &&
    !ficha.id &&
    ficha.oficina.ativa &&
    !ficha.oficina.dias_semana.includes(
      (new Date(data + "T12:00:00").getDay() + 6) % 7,
    );
  return (
    <div className="diary-page">
      <button
        className="back-link"
        disabled={busy}
        onClick={() => {
          if (podeSair()) onBack();
        }}
      >
        <Icon name="arrowLeft" />
        Voltar para frequência
      </button>

      <header className="diary-head">
        <div className="page-head-main">
          <span className="page-icon tone-teal" aria-hidden="true">
            <Icon name={iconeOficina(turma)} />
          </span>
          <div>
            <p className="diary-eyebrow">Diário de frequência</p>
            <h1>{turma.nome}</h1>
            <p>
              {rotuloTurma(turma.turma)} · {turma.unidade}
              {ficha &&
                ` · ${rows.length} ${rows.length === 1 ? "aluno" : "alunos"}`}
            </p>
          </div>
        </div>
        <label className="date-field">
          <span>Data da aula</span>
          <input
            type="date"
            required
            max={hoje()}
            value={data}
            disabled={busy}
            onChange={(e) => abrir(e.target.value)}
          />
        </label>
      </header>

      {error && (
        <div className="error" role="alert">
          {error}{" "}
          <button className="link" disabled={busy} onClick={() => abrir(data)}>
            Recarregar chamada
          </button>
        </div>
      )}
      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}

      {!ficha ? (
        error ? (
          <p className="dashed-note">Não foi possível abrir a chamada.</p>
        ) : (
          <div className="skeleton" role="status">
            <span className="sr-only">Carregando chamada…</span>
            <span className="sk sk-card" />
            <span className="sk sk-row" />
            <span className="sk sk-row" />
            <span className="sk sk-row" />
          </div>
        )
      ) : (
        <form
          className="card attendance-card"
          data-dirty={dirty}
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="attendance-top">
            <div>
              <h2>{ficha.id ? "Chamada salva" : "Nova chamada"}</h2>
              <p>
                {ficha.id
                  ? `Versão ${ficha.versao}. Correções preservam o histórico.`
                  : "Toque em Presente ou Falta para cada aluno e salve."}
              </p>
            </div>
            <span className="count-badge">{dataBR(data)}</span>
          </div>

          {!ficha.id && !ficha.oficina.ativa && (
            <div className="notice-box notice-danger" role="note">
              <Icon name="alert" />
              <p>
                Turma inativa. As chamadas já registradas continuam disponíveis
                no histórico.
              </p>
            </div>
          )}
          {foraDoDia && (
            <div className="notice-box notice-warn" role="note">
              <Icon name="alert" />
              <div>
                <strong>Data fora dos dias habituais</strong>
                <p>
                  Esta turma tem aula em{" "}
                  {ficha.oficina.dias_semana.map((i) => dias[i]).join(", ")}.
                  Confira se houve uma aula extra antes de registrar.
                </p>
              </div>
            </div>
          )}

          {!rows.length ? (
            <p className="dashed-note">
              Não há matrículas válidas para esta data. Confira a data e as
              matrículas da turma.
            </p>
          ) : (
            <>
              <div className="attendance-summary">
                <div className="att-stats">
                  <span className="att-stat stat-ok">
                    <Icon name="check" />
                    <strong>{presentes}</strong>
                    {presentes === 1 ? "presença" : "presenças"}
                  </span>
                  <span className="att-stat stat-falta">
                    <Icon name="close" />
                    <strong>{faltas}</strong>
                    {faltas === 1 ? "falta" : "faltas"}
                  </span>
                  <span className="att-stat stat-pend">
                    <Icon name="clock" />
                    <strong>{pendentes}</strong>
                    {pendentes === 1 ? "pendente" : "pendentes"}
                  </span>
                </div>
                {canWrite && (
                  <button
                    type="button"
                    className="btn-outline"
                    disabled={busy}
                    onClick={() => {
                      setRows((r) =>
                        r.map((a) => ({
                          ...a,
                          presente: true,
                          justificativa: "",
                        })),
                      );
                      setDirty(true);
                    }}
                  >
                    <Icon name="checkCheck" />
                    Marcar todos presentes
                  </button>
                )}
                <div
                  className="att-progress"
                  role="progressbar"
                  aria-label="Alunos marcados"
                  aria-valuemin={0}
                  aria-valuemax={rows.length}
                  aria-valuenow={marcados}
                >
                  <span
                    className="att-progress-ok"
                    style={{ width: `${(presentes / rows.length) * 100}%` }}
                  />
                  <span
                    className="att-progress-falta"
                    style={{ width: `${(faltas / rows.length) * 100}%` }}
                  />
                </div>
              </div>

              <fieldset className="att-list" disabled={busy || !canWrite}>
                <legend className="sr-only">Presença dos alunos</legend>
                {rows.map((r, i) => {
                  const estado =
                    r.presente === null
                      ? "pendente"
                      : r.presente
                        ? "presente"
                        : "falta";
                  return (
                    <div
                      className={`att-row att-${estado}`}
                      key={r.matricula_id}
                    >
                      <div className="att-person">
                        <span
                          className={`avatar avatar-${tomAvatar(r.nome)}`}
                          aria-hidden="true"
                        >
                          {iniciais(r.nome)}
                        </span>
                        <div>
                          <strong>{r.nome}</strong>
                          <small>
                            {estado === "pendente"
                              ? "Aguardando marcação"
                              : estado === "presente"
                                ? "Presente"
                                : "Falta"}
                          </small>
                        </div>
                      </div>
                      <div
                        className="att-toggle"
                        role="radiogroup"
                        aria-label={`Situação de ${r.nome}`}
                      >
                        <button
                          type="button"
                          role="radio"
                          aria-checked={r.presente === true}
                          className="att-option opt-presente"
                          onClick={() =>
                            marcar(i, { presente: true, justificativa: "" })
                          }
                        >
                          <Icon name="check" />
                          Presente
                        </button>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={r.presente === false}
                          className="att-option opt-falta"
                          onClick={() => marcar(i, { presente: false })}
                        >
                          <Icon name="close" />
                          Falta
                        </button>
                      </div>
                      {r.presente === false && (
                        <label className="att-justification">
                          <span>Justificativa de {r.nome} (opcional)</span>
                          <input
                            maxLength={500}
                            placeholder="Ex.: atestado médico, viagem da família…"
                            value={r.justificativa}
                            onChange={(e) =>
                              marcar(i, { justificativa: e.target.value })
                            }
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </fieldset>

              {canWrite && (
                <div className="att-footer">
                  {ficha.id && (
                    <label className="att-reason">
                      <span>Motivo da correção *</span>
                      <input
                        required
                        maxLength={300}
                        value={motivo}
                        disabled={busy}
                        onChange={(e) => {
                          setMotivo(e.target.value);
                          setDirty(true);
                        }}
                      />
                    </label>
                  )}
                  <div className="att-footer-row">
                    <span>
                      <strong>{marcados}</strong> de {rows.length} alunos
                      marcados
                      {pendentes > 0 && ` · faltam ${pendentes}`}
                    </span>
                    <button
                      className="btn-primary"
                      disabled={busy || pendentes > 0 || (!dirty && !!ficha.id)}
                    >
                      <Icon name="save" />
                      {busy
                        ? "Salvando…"
                        : ficha.id
                          ? "Salvar correção"
                          : "Salvar chamada"}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </form>
      )}

      {ficha && ficha.historico.length > 0 && (
        <section className="card profile-card">
          <h2>Histórico de correções</h2>
          <p className="card-sub">
            Quem registrou e o que mudou em cada versão.
          </p>
          <ol className="tl">
            {ficha.historico.map((h) => (
              <li
                key={h.versao}
                className={h.versao === 1 ? "tl-cadastro" : "tl-situacao"}
              >
                <span className="tl-dot" aria-hidden="true" />
                <div>
                  <strong>
                    {h.versao === 1
                      ? "Chamada registrada"
                      : `Correção · versão ${h.versao}`}
                  </strong>
                  <small>
                    {new Date(h.criado_em).toLocaleString("pt-BR")} · {h.autor}
                  </small>
                  {h.motivo && (
                    <p>
                      <span className="muted">Motivo:</span> {h.motivo}
                    </p>
                  )}
                  <details className="tl-details">
                    <summary>
                      {h.alteracoes.length} registros{" "}
                      {h.versao === 1 ? "incluídos" : "alterados"}
                    </summary>
                    {h.alteracoes.map((a, i) => (
                      <div key={i}>
                        <p>
                          <strong>{a.nome}</strong>:{" "}
                          {a.antes
                            ? `${a.antes.presente ? "Presente" : "Falta"} → `
                            : ""}
                          {a.depois.presente ? "Presente" : "Falta"}
                        </p>
                        {a.antes?.justificativa && (
                          <p>Justificativa anterior: {a.antes.justificativa}</p>
                        )}
                        {a.depois.justificativa && (
                          <p>
                            Justificativa registrada: {a.depois.justificativa}
                          </p>
                        )}
                      </div>
                    ))}
                  </details>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      <section className="card profile-card">
        <h2>Chamadas da turma</h2>
        <p className="card-sub">Abra uma data para consultar ou corrigir.</p>
        {histError ? (
          <p className="error" role="alert">
            {histError}
            <button
              className="link"
              onClick={() => setHistRevision((v) => v + 1)}
            >
              Tentar novamente
            </button>
          </p>
        ) : !hist ? (
          <p className="dashed-note">Carregando histórico…</p>
        ) : (
          <>
            {!hist.items.length && (
              <p className="dashed-note">Nenhuma chamada registrada.</p>
            )}
            <ul className="mini-list">
              {hist.items.map((h) => {
                const p = h.total
                  ? Math.round((h.presentes / h.total) * 100)
                  : 0;
                return (
                  <li key={h.data}>
                    <div>
                      <strong>{dataBR(h.data)}</strong>
                      <small>
                        {h.presentes} presenças · {h.faltas} faltas · versão{" "}
                        {h.versao}
                      </small>
                    </div>
                    <span
                      className={`presence-pill ${p >= 85 ? "tom-ok" : p >= 75 ? "tom-warn" : "tom-baixo"}`}
                    >
                      {p}%
                    </span>
                    <button
                      type="button"
                      className="btn-ghost"
                      disabled={busy}
                      onClick={() => abrir(h.data)}
                      aria-label={`Abrir chamada de ${dataBR(h.data)}`}
                    >
                      Abrir
                      <Icon name="arrowRight" />
                    </button>
                  </li>
                );
              })}
            </ul>
            {hist.pages > 1 && (
              <div className="page-footer">
                <span>
                  Página {hist.page} de {hist.pages}
                </span>
                <div className="pager">
                  <button
                    className="pager-btn"
                    disabled={hist.page <= 1}
                    onClick={() => setHistPage(hist.page - 1)}
                  >
                    Anterior
                  </button>
                  <button
                    className="pager-btn"
                    disabled={hist.page >= hist.pages}
                    onClick={() => setHistPage(hist.page + 1)}
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
      {user.pode_gerir_educadores && <AcessosTurma id={turma.id} />}
    </div>
  );
}
