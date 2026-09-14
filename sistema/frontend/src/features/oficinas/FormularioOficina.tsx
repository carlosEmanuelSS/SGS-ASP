import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError, mensagem } from "../../api";
import { dias } from "./types";
import type { DadosOficina, Oficina } from "./types";

const vazio: DadosOficina = {
  nome: "",
  turma: "",
  tipo: "",
  educador: "",
  unidade: "",
  dias_semana: [],
  inicio: "",
  fim: "",
  limite_vagas: 20,
  descricao: "",
  ativa: true,
};
const campos = [
  ["nome", "Nome da oficina", 120],
  ["turma", "Nome da turma", 80],
  ["tipo", "Área ou tipo de atividade", 60],
  ["educador", "Educador responsável", 160],
  ["unidade", "Unidade ou local", 120],
] as const;
export function FormularioOficina({
  initial,
  onBack,
  onSave,
}: {
  initial: Oficina | null;
  onBack: () => void;
  onSave: () => void;
}) {
  const [data, setData] = useState<DadosOficina>(() =>
    initial
      ? (Object.fromEntries(
          Object.keys(vazio).map((k) => [k, initial[k as keyof DadosOficina]]),
        ) as DadosOficina)
      : { ...vazio },
  );
  const [motivo, setMotivo] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});
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
  function change<K extends keyof DadosOficina>(
    key: K,
    value: DadosOficina[K],
  ) {
    setData((d) => ({ ...d, [key]: value }));
    setDirty(true);
  }
  function back() {
    if (!dirty || window.confirm("Descartar as alterações ainda não salvas?"))
      onBack();
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setFields({});
    try {
      await api(
        initial ? `oficinas/${initial.id}/` : "oficinas/",
        initial ? "PUT" : "POST",
        { ...data, ...(initial ? { versao: initial.versao, motivo } : {}) },
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
  return (
    <>
      <button className="link" onClick={back} disabled={busy}>
        ← Voltar para oficinas
      </button>
      <div className="page-title">
        <div>
          <p className="eyebrow">ATIVIDADES E CONVIVÊNCIA</p>
          <h1>
            {initial ? "Editar oficina e turma" : "Criar oficina e turma"}
          </h1>
          <p>Organize a atividade, os encontros e as vagas da turma.</p>
        </div>
      </div>
      <form className="card form-card" data-dirty={dirty} onSubmit={save}>
        <p>
          Campos com * são obrigatórios. Cada cadastro representa uma turma de
          uma oficina.
        </p>
        {error && (
          <div className="error" role="alert">
            {error}
            {Object.entries(fields).map(([key, errors]) => (
              <p key={key}>{errors.join(" ")}</p>
            ))}
          </div>
        )}
        <fieldset disabled={busy}>
          <legend>Dados da turma</legend>
          <div className="form-grid">
            {campos.map(([key, label, max]) => (
              <label key={key}>
                {label} *
                <input
                  required
                  maxLength={max}
                  value={data[key]}
                  onChange={(e) => change(key, e.target.value)}
                  aria-invalid={!!fields[key]}
                />
              </label>
            ))}
            <label>
              Limite de vagas *
              <input
                type="number"
                required
                min={1}
                max={1000}
                step={1}
                value={data.limite_vagas || ""}
                onChange={(e) => change("limite_vagas", Number(e.target.value))}
              />
            </label>
            <label>
              Horário de início *
              <input
                type="time"
                required
                value={data.inicio}
                onChange={(e) => change("inicio", e.target.value)}
              />
            </label>
            <label>
              Horário de término *
              <input
                type="time"
                required
                value={data.fim}
                onChange={(e) => change("fim", e.target.value)}
              />
            </label>
            <div className="full">
              <p>Dias da semana *</p>
              <div className="weekdays">
                {dias.map((dia, i) => (
                  <label className="checkbox" key={dia}>
                    <input
                      type="checkbox"
                      checked={data.dias_semana.includes(i)}
                      onChange={(e) =>
                        change(
                          "dias_semana",
                          e.target.checked
                            ? [...data.dias_semana, i]
                            : data.dias_semana.filter((d) => d !== i),
                        )
                      }
                    />
                    {dia}
                  </label>
                ))}
              </div>
            </div>
            <label className="full">
              Descrição (opcional)
              <textarea
                maxLength={2000}
                value={data.descricao}
                onChange={(e) => change("descricao", e.target.value)}
              />
            </label>
            <label>
              Situação
              <select
                aria-label="Situação da turma"
                value={String(data.ativa)}
                onChange={(e) => change("ativa", e.target.value === "true")}
              >
                <option value="true">Ativa</option>
                <option value="false">Inativa</option>
              </select>
            </label>
            {initial && data.ativa !== initial.ativa && (
              <label>
                Motivo da alteração *
                <input
                  required
                  maxLength={300}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                />
              </label>
            )}
          </div>
        </fieldset>
        <div className="form-actions">
          <button
            className="secondary"
            type="button"
            disabled={busy}
            onClick={back}
          >
            Cancelar
          </button>
          <button disabled={busy}>
            {busy ? "Salvando…" : "Salvar oficina"}
          </button>
        </div>
      </form>
    </>
  );
}
