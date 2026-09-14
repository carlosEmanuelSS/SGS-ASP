import { useEffect, useState } from "react";
import { api, mensagem } from "../../api";
import type { User } from "../../api";
import type { Pagina } from "../oficinas/types";
import { dias } from "../oficinas/types";
import { hoje } from "./types";
import type { Chamada, Registro, Resumo, Turma } from "./types";
import { AcessosTurma } from "./AcessosTurma";

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
  const canWrite =
    ficha &&
    (ficha.id
      ? user.pode_corrigir_chamada
      : user.pode_criar_chamada && ficha.oficina.ativa);
  return (
    <>
      <button
        className="link"
        disabled={busy}
        onClick={() => {
          if (podeSair()) onBack();
        }}
      >
        ← Voltar para frequência
      </button>
      <div className="page-title">
        <div>
          <p className="eyebrow">DIÁRIO DE FREQUÊNCIA</p>
          <h1>{turma.nome}</h1>
          <p>
            {turma.turma} · {turma.unidade}
          </p>
        </div>
        <label>
          Data da aula
          <input
            type="date"
            required
            max={hoje()}
            value={data}
            disabled={busy}
            onChange={(e) => abrir(e.target.value)}
          />
        </label>
      </div>
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
        <p role="status">
          {error ? "Não foi possível abrir a chamada." : "Carregando chamada…"}
        </p>
      ) : (
        <form
          className="card"
          data-dirty={dirty}
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <div className="attendance-heading">
            <div>
              <h2>{ficha.id ? "Chamada salva" : "Nova chamada"}</h2>
              <p>
                {ficha.id
                  ? `Versão ${ficha.versao}. Correções preservam o histórico.`
                  : "Marque presença ou falta para todos os alunos antes de salvar."}
              </p>
            </div>
            <span className="badge ativo">{rows.length} alunos</span>
          </div>
          {!ficha.id && !ficha.oficina.ativa && (
            <p className="error">
              Turma inativa. As chamadas já registradas continuam disponíveis no
              histórico.
            </p>
          )}
          {!ficha.id &&
            ficha.oficina.ativa &&
            !ficha.oficina.dias_semana.includes(
              (new Date(data + "T12:00:00").getDay() + 6) % 7,
            ) && (
              <p>
                A data está fora dos dias habituais (
                {ficha.oficina.dias_semana.map((i) => dias[i]).join(", ")}).
                Confira se houve uma aula extra.
              </p>
            )}
          {!rows.length ? (
            <p className="empty">
              Não há matrículas válidas para esta data. Confira a data e as
              matrículas da turma.
            </p>
          ) : (
            <>
              <div className="attendance-totals">
                <span>
                  <strong>{presentes}</strong> presenças
                </span>
                <span>
                  <strong>{faltas}</strong> faltas
                </span>
                <span>
                  <strong>{pendentes}</strong> pendentes
                </span>
                {canWrite && (
                  <button
                    type="button"
                    className="secondary"
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
                    Marcar todos presentes
                  </button>
                )}
              </div>
              <fieldset disabled={busy || !canWrite}>
                <legend className="sr-only">Presença dos alunos</legend>
                {rows.map((r, i) => (
                  <div className="attendance-row" key={r.matricula_id}>
                    <strong>{r.nome}</strong>
                    <label>
                      Situação de {r.nome}
                      <select
                        aria-label={`Situação de ${r.nome}`}
                        value={
                          r.presente === null
                            ? ""
                            : r.presente
                              ? "presente"
                              : "falta"
                        }
                        required
                        onChange={(e) =>
                          marcar(i, {
                            presente:
                              e.target.value === "presente"
                                ? true
                                : e.target.value === "falta"
                                  ? false
                                  : null,
                            justificativa:
                              e.target.value === "falta" ? r.justificativa : "",
                          })
                        }
                      >
                        <option value="">Selecione</option>
                        <option value="presente">Presente</option>
                        <option value="falta">Falta</option>
                      </select>
                    </label>
                    {r.presente === false && (
                      <label className="attendance-justification">
                        Justificativa de {r.nome} (opcional)
                        <input
                          maxLength={500}
                          value={r.justificativa}
                          onChange={(e) =>
                            marcar(i, { justificativa: e.target.value })
                          }
                        />
                      </label>
                    )}
                  </div>
                ))}
              </fieldset>
              {canWrite && (
                <>
                  {ficha.id && (
                    <label>
                      Motivo da correção *
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
                  <div className="form-actions">
                    <button
                      disabled={busy || pendentes > 0 || (!dirty && !!ficha.id)}
                    >
                      {busy
                        ? "Salvando…"
                        : ficha.id
                          ? "Salvar correção"
                          : "Salvar chamada"}
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </form>
      )}
      {ficha && ficha.historico.length > 0 && (
        <section className="card attendance-section">
          <h2>Histórico de correções</h2>
          <ol className="timeline">
            {ficha.historico.map((h) => (
              <li key={h.versao}>
                <strong>
                  {h.versao === 1
                    ? "Chamada registrada"
                    : `Correção · versão ${h.versao}`}
                </strong>
                <small>
                  {new Date(h.criado_em).toLocaleString("pt-BR")} · {h.autor}
                </small>
                {h.motivo && <p>{h.motivo}</p>}
                <details>
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
              </li>
            ))}
          </ol>
        </section>
      )}
      <section className="card attendance-section">
        <h2>Chamadas da turma</h2>
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
          <p>Carregando histórico…</p>
        ) : (
          <>
            {!hist.items.length && <p>Nenhuma chamada registrada.</p>}
            <ul className="people-list">
              {hist.items.map((h) => (
                <li key={h.data}>
                  <div>
                    <strong>{h.data.split("-").reverse().join("/")}</strong>
                    <small>
                      {h.presentes} presenças · {h.faltas} faltas · versão{" "}
                      {h.versao}
                    </small>
                  </div>
                  <button
                    type="button"
                    className="secondary"
                    disabled={busy}
                    onClick={() => abrir(h.data)}
                  >
                    Abrir chamada de {h.data.split("-").reverse().join("/")}
                  </button>
                </li>
              ))}
            </ul>
            <div className="pagination">
              <button
                className="secondary"
                disabled={hist.page <= 1}
                onClick={() => setHistPage(hist.page - 1)}
              >
                Anterior
              </button>
              <span>
                {hist.page} de {hist.pages}
              </span>
              <button
                className="secondary"
                disabled={hist.page >= hist.pages}
                onClick={() => setHistPage(hist.page + 1)}
              >
                Próxima
              </button>
            </div>
          </>
        )}
      </section>
      {user.pode_gerir_educadores && <AcessosTurma id={turma.id} />}
    </>
  );
}
