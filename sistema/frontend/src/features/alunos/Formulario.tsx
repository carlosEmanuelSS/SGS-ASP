import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError, mensagem, situacoes } from "../../api";
import type { Aluno, Cadastro, Status } from "../../api";
import { campos, vazio } from "./campos";
export function Formulario({
  initial,
  onCancel,
  onSave,
}: {
  initial: Aluno | null;
  onCancel: () => void;
  onSave: () => void;
}) {
  const [data, setData] = useState<Cadastro>(() =>
    initial
      ? (Object.fromEntries(
          Object.keys(vazio).map((key) => [
            key,
            initial[key as keyof Cadastro],
          ]),
        ) as Cadastro)
      : { ...vazio },
  );
  const [status, setStatus] = useState<Status>(
    initial?.status || "lista_espera",
  );
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    const prevent = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty]);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setFields({});
    try {
      await api(
        initial ? `alunos/${initial.id}/` : "alunos/",
        initial ? "PUT" : "POST",
        {
          ...data,
          cpf: data.cpf || null,
          renda_familiar: data.renda_familiar || null,
          ...(initial ? { versao: initial.versao, status, motivo } : {}),
        },
      );
      setDirty(false);
      onSave();
    } catch (e) {
      setError(mensagem(e));
      if (e instanceof ApiError) setFields(e.fields);
    } finally {
      setBusy(false);
    }
  }
  function cancel() {
    if (!dirty || window.confirm("Descartar as alterações ainda não salvas?"))
      onCancel();
  }
  return (
    <>
      <button className="link" onClick={cancel} disabled={busy}>
        ← Voltar para alunos
      </button>
      <div className="page-title">
        <div>
          <p className="eyebrow">CADASTRO DE ALUNOS</p>
          <h1>{initial ? "Editar cadastro" : "Receber um novo aluno"}</h1>
          <p>
            {initial
              ? "Mantenha as informações atualizadas para o acompanhamento."
              : "O novo aluno será incluído na lista de espera."}
          </p>
        </div>
      </div>
      <form onSubmit={save} className="card form-card" data-dirty={dirty}>
        <p>Campos com * são obrigatórios.</p>
        {error && (
          <div className="error" role="alert">
            {error}
            {fields.__all__ && <p>{fields.__all__.join(" ")}</p>}
          </div>
        )}
        <fieldset disabled={busy}>
          <legend>Dados do aluno e da família</legend>
          <div className="form-grid">
            {campos.map((c) => (
              <label
                className={c.key === "observacoes" ? "full" : ""}
                key={c.key}
                htmlFor={c.key}
              >
                {c.label}
                {c.required ? " *" : ""}
                {c.key === "observacoes" ? (
                  <textarea
                    id={c.key}
                    maxLength={c.max}
                    value={data[c.key] || ""}
                    onChange={(e) => {
                      setData({ ...data, [c.key]: e.target.value });
                      setDirty(true);
                    }}
                  />
                ) : (
                  <input
                    id={c.key}
                    type={c.type || "text"}
                    maxLength={c.max}
                    required={c.required}
                    value={data[c.key] || ""}
                    step={c.type === "number" ? "0.01" : undefined}
                    min={c.type === "number" ? "0" : undefined}
                    max={
                      c.type === "date"
                        ? new Date().toLocaleDateString("en-CA")
                        : undefined
                    }
                    aria-invalid={!!fields[c.key]}
                    aria-describedby={
                      fields[c.key] ? `${c.key}-error` : undefined
                    }
                    onChange={(e) => {
                      setData({ ...data, [c.key]: e.target.value });
                      setDirty(true);
                    }}
                  />
                )}
                {fields[c.key] && (
                  <span className="field-error" id={`${c.key}-error`}>
                    {fields[c.key].join(" ")}
                  </span>
                )}
              </label>
            ))}
            <label className="checkbox full">
              <input
                type="checkbox"
                checked={data.programas_sociais}
                onChange={(e) => {
                  setData({ ...data, programas_sociais: e.target.checked });
                  setDirty(true);
                }}
              />
              Família participa de programas sociais
            </label>
          </div>
        </fieldset>
        {initial && (
          <fieldset disabled={busy}>
            <legend>Situação do aluno</legend>
            <p>A inativação preserva o cadastro e seu histórico.</p>
            <div className="form-grid">
              <label>
                Situação
                <select
                  aria-label="Situação"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as Status);
                    setDirty(true);
                  }}
                >
                  {Object.entries(situacoes).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {status !== initial.status && (
                <label>
                  Motivo da alteração *
                  <input
                    value={motivo}
                    required
                    maxLength={300}
                    onChange={(e) => setMotivo(e.target.value)}
                  />
                </label>
              )}
            </div>
          </fieldset>
        )}
        <div className="form-actions">
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={cancel}
          >
            Cancelar
          </button>
          <button disabled={busy}>
            {busy
              ? "Salvando…"
              : initial
                ? "Salvar alterações"
                : "Cadastrar aluno"}
          </button>
        </div>
      </form>
    </>
  );
}
