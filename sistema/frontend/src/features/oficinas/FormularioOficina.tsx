import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError, mensagem } from "../../api";
import { Icon } from "../../Icon";
import {
  Alternancias,
  FormFooter,
  FormProgressHeader,
  FormSection,
  Segmentado,
  useTocados,
  ValidatedFormField,
} from "../../forms";
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
type Chave = keyof DadosOficina;
const textos: Record<
  "nome" | "turma" | "tipo" | "educador" | "unidade",
  { rotulo: string; max: number; exemplo: string }
> = {
  nome: { rotulo: "Nome da oficina", max: 120, exemplo: "Ex.: Robótica" },
  turma: { rotulo: "Nome da turma", max: 80, exemplo: "Ex.: Turma A, manhã" },
  tipo: {
    rotulo: "Área ou tipo de atividade",
    max: 60,
    exemplo: "Ex.: Tecnologia",
  },
  educador: {
    rotulo: "Educador responsável",
    max: 160,
    exemplo: "Nome completo",
  },
  unidade: {
    rotulo: "Unidade ou local",
    max: 120,
    exemplo: "Ex.: Sede, sala 2",
  },
};
function validar(d: DadosOficina): Partial<Record<Chave, string>> {
  const e: Partial<Record<Chave, string>> = {};
  for (const k of Object.keys(textos) as (keyof typeof textos)[])
    if (!d[k].trim()) e[k] = `Informe ${textos[k].rotulo.toLowerCase()}.`;
  if (!d.dias_semana.length) e.dias_semana = "Selecione pelo menos um dia.";
  if (!d.inicio) e.inicio = "Informe o horário de início.";
  if (!d.fim) e.fim = "Informe o horário de término.";
  else if (d.inicio && d.fim <= d.inicio)
    e.fim = "O término deve ser depois do início, no mesmo dia.";
  if (!(d.limite_vagas >= 1 && d.limite_vagas <= 1000))
    e.limite_vagas = "Informe de 1 a 1000 vagas.";
  return e;
}
const obrigatorios: Chave[] = [
  "nome",
  "turma",
  "tipo",
  "educador",
  "unidade",
  "dias_semana",
  "inicio",
  "fim",
  "limite_vagas",
];
const curto = (i: number) => dias[i].slice(0, 3);
function duracao(inicio: string, fim: string) {
  const [h1, m1] = inicio.split(":").map(Number);
  const [h2, m2] = fim.split(":").map(Number);
  const min = h2 * 60 + m2 - (h1 * 60 + m1);
  if (!(min > 0)) return "";
  const h = Math.floor(min / 60);
  return h
    ? `${h}h${min % 60 ? String(min % 60).padStart(2, "0") : ""}`
    : `${min} min`;
}

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
  const tocados = useTocados();
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
  const locais = validar(data);
  const mudaSituacao = !!initial && data.ativa !== initial.ativa;
  const exigidos = obrigatorios.length + (mudaSituacao ? 1 : 0);
  const prontos =
    obrigatorios.filter((k) => !locais[k]).length +
    (mudaSituacao && motivo.trim() ? 1 : 0);
  function change<K extends Chave>(key: K, value: DadosOficina[K]) {
    setData((d) => ({ ...d, [key]: value }));
    setFields((f) => {
      const resto = { ...f };
      delete resto[key];
      return resto;
    });
    setDirty(true);
  }
  const erro = (k: Chave) =>
    fields[k]?.join(" ") || (tocados.foi(k) ? locais[k] : undefined);
  const ok = (k: Chave) => !locais[k] && !fields[k];
  function back() {
    if (!dirty || window.confirm("Descartar as alterações ainda não salvas?"))
      onBack();
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    tocados.tocarTodos();
    setError("");
    if (Object.keys(locais).length || (mudaSituacao && !motivo.trim())) {
      setError("Revise os campos destacados antes de salvar.");
      return;
    }
    setBusy(true);
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
  const texto = (k: keyof typeof textos, largo = false) => (
    <ValidatedFormField
      key={k}
      rotulo={textos[k].rotulo}
      obrigatorio
      largo={largo}
      erro={erro(k)}
      ok={ok(k)}
    >
      {(p) => (
        <input
          {...p}
          onBlur={() => tocados.tocar(k)}
          maxLength={textos[k].max}
          placeholder={textos[k].exemplo}
          value={data[k]}
          onChange={(e) => change(k, e.target.value)}
        />
      )}
    </ValidatedFormField>
  );
  const agenda =
    data.dias_semana.length && data.inicio && data.fim && !locais.fim
      ? `${data.dias_semana.map(curto).join(", ")} · ${data.inicio} às ${data.fim} (${duracao(data.inicio, data.fim)} por encontro)`
      : "";
  return (
    <div className="form-page">
      <FormProgressHeader
        voltar="Voltar para oficinas"
        onVoltar={back}
        busy={busy}
        icone="book"
        tom="tone-blue"
        eyebrow="Atividades e convivência"
        titulo={initial ? "Editar oficina e turma" : "Criar oficina e turma"}
        descricao="Cada cadastro representa uma turma de uma oficina: atividade, encontros e vagas."
        preenchidos={prontos}
        total={exigidos}
      />
      <form
        className="form-stack"
        data-dirty={dirty}
        onSubmit={save}
        noValidate
      >
        {error && (
          <div className="error" role="alert">
            {error}
            {fields.__all__ && <p>{fields.__all__.join(" ")}</p>}
          </div>
        )}
        <fieldset disabled={busy}>
          <FormSection
            icone="book"
            titulo="Oficina e turma"
            descricao="Como a atividade aparece nas listas e na chamada."
          >
            {texto("nome")}
            {texto("turma")}
            {texto("tipo", true)}
            <ValidatedFormField
              rotulo="Descrição"
              largo
              dica="Opcional. Objetivos, público e materiais necessários."
              contador={[data.descricao.length, 2000]}
              erro={erro("descricao")}
            >
              {(p) => (
                <textarea
                  {...p}
                  maxLength={2000}
                  rows={3}
                  value={data.descricao}
                  onChange={(e) => change("descricao", e.target.value)}
                />
              )}
            </ValidatedFormField>
          </FormSection>
          <FormSection
            icone="mapPin"
            titulo="Responsável e local"
            descricao="Quem conduz a turma e onde acontecem os encontros."
          >
            {texto("educador")}
            {texto("unidade")}
          </FormSection>
          <FormSection
            icone="calendar"
            titulo="Agenda dos encontros"
            descricao="Dias e horário fixos da turma."
          >
            <Alternancias
              rotulo="Dias da semana"
              obrigatorio
              opcoes={dias}
              marcados={data.dias_semana}
              onChange={(v) => {
                change("dias_semana", v);
                tocados.tocar("dias_semana");
              }}
              erro={erro("dias_semana")}
            />
            <ValidatedFormField
              rotulo="Horário de início"
              obrigatorio
              erro={erro("inicio")}
              ok={ok("inicio")}
            >
              {(p) => (
                <input
                  {...p}
                  onBlur={() => tocados.tocar("inicio")}
                  type="time"
                  value={data.inicio}
                  onChange={(e) => change("inicio", e.target.value)}
                />
              )}
            </ValidatedFormField>
            <ValidatedFormField
              rotulo="Horário de término"
              obrigatorio
              erro={erro("fim")}
              ok={ok("fim")}
            >
              {(p) => (
                <input
                  {...p}
                  onBlur={() => tocados.tocar("fim")}
                  type="time"
                  value={data.fim}
                  onChange={(e) => change("fim", e.target.value)}
                />
              )}
            </ValidatedFormField>
            {agenda && (
              <p className="form-summary full" role="status">
                <Icon name="clock" />
                {agenda}
              </p>
            )}
          </FormSection>
          <FormSection
            icone="users"
            titulo="Vagas e situação"
            descricao="Matrículas param quando a turma atinge o limite."
          >
            <ValidatedFormField
              rotulo="Limite de vagas"
              obrigatorio
              dica="De 1 a 1000 alunos."
              erro={erro("limite_vagas")}
              ok={ok("limite_vagas")}
            >
              {(p) => (
                <input
                  {...p}
                  onBlur={() => tocados.tocar("limite_vagas")}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={1000}
                  step={1}
                  value={data.limite_vagas || ""}
                  onChange={(e) =>
                    change("limite_vagas", Number(e.target.value))
                  }
                />
              )}
            </ValidatedFormField>
            <Segmentado
              rotulo="Situação da turma"
              opcoes={[
                { valor: "true", rotulo: "Ativa", icone: "check" },
                { valor: "false", rotulo: "Inativa", icone: "close" },
              ]}
              valor={String(data.ativa) as "true" | "false"}
              onChange={(v) => change("ativa", v === "true")}
            />
            {mudaSituacao && (
              <ValidatedFormField
                rotulo="Motivo da alteração"
                obrigatorio
                largo
                erro={
                  tocados.foi("motivo") && !motivo.trim()
                    ? "Explique o motivo da mudança de situação."
                    : undefined
                }
                ok={!!motivo.trim()}
              >
                {(p) => (
                  <input
                    {...p}
                    onBlur={() => tocados.tocar("motivo")}
                    maxLength={300}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                  />
                )}
              </ValidatedFormField>
            )}
          </FormSection>
        </fieldset>
        <FormFooter faltam={exigidos - prontos}>
          <button
            className="btn-outline"
            type="button"
            disabled={busy}
            onClick={back}
          >
            Cancelar
          </button>
          <button className="btn-primary" disabled={busy}>
            <Icon name="save" />
            {busy ? "Salvando…" : "Salvar oficina"}
          </button>
        </FormFooter>
      </form>
    </div>
  );
}
