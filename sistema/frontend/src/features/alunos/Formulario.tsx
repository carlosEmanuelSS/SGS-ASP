import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, ApiError, mensagem, situacoes } from "../../api";
import type { Aluno, Cadastro, Status } from "../../api";
import { Icon } from "../../Icon";
import {
  cpfValido,
  FormFooter,
  FormProgressHeader,
  FormSection,
  hoje,
  mascaraCpf,
  mascaraTelefone,
  moedaDigitada,
  moedaExibida,
  Segmentado,
  soDigitos,
  useTocados,
  ValidatedFormField,
} from "../../forms";
import { vazio } from "./campos";

type Chave = keyof Cadastro;
/** Regras locais, iguais às do backend; o servidor continua sendo a palavra final. */
function validar(d: Cadastro): Partial<Record<Chave, string>> {
  const e: Partial<Record<Chave, string>> = {};
  if (d.nome.trim().replace(/\s+/g, " ").length < 3)
    e.nome = "Informe o nome do aluno com pelo menos 3 caracteres.";
  if (!d.data_nascimento) e.data_nascimento = "Informe a data de nascimento.";
  else if (d.data_nascimento > hoje())
    e.data_nascimento = "A data de nascimento não pode estar no futuro.";
  if (d.cpf && !cpfValido(d.cpf)) e.cpf = "CPF inválido.";
  if (!d.responsavel.trim()) e.responsavel = "Informe o nome do responsável.";
  if (!d.parentesco.trim()) e.parentesco = "Informe o parentesco ou vínculo.";
  if (![10, 11].includes(soDigitos(d.telefone).length))
    e.telefone = "Informe DDD e telefone, com 10 ou 11 dígitos.";
  if (d.renda_familiar && Number(d.renda_familiar) < 0)
    e.renda_familiar = "A renda não pode ser negativa.";
  return e;
}
const obrigatorios: Chave[] = [
  "nome",
  "data_nascimento",
  "responsavel",
  "parentesco",
  "telefone",
];

export function Formulario({
  initial,
  onCancel,
  onSave,
}: {
  initial: Aluno | null;
  onCancel: () => void;
  onSave: () => void;
}) {
  const [data, setData] = useState<Cadastro>(() => {
    const base = initial
      ? (Object.fromEntries(
          Object.keys(vazio).map((key) => [
            key,
            initial[key as keyof Cadastro],
          ]),
        ) as Cadastro)
      : { ...vazio };
    return {
      ...base,
      cpf: base.cpf ? mascaraCpf(base.cpf) : "",
      telefone: mascaraTelefone(base.telefone),
    };
  });
  const [status, setStatus] = useState<Status>(
    initial?.status || "lista_espera",
  );
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
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
  const mudaSituacao = !!initial && status !== initial.status;
  const exigidos = obrigatorios.length + (mudaSituacao ? 1 : 0);
  const prontos =
    obrigatorios.filter((k) => !locais[k]).length +
    (mudaSituacao && motivo.trim() ? 1 : 0);
  function mudar<K extends Chave>(key: K, value: Cadastro[K]) {
    setData((d) => ({ ...d, [key]: value }));
    setFields((f) => {
      const resto = { ...f };
      delete resto[key];
      return resto;
    });
    setDirty(true);
  }
  /** Erro visível: o do servidor primeiro; o local só depois de sair do campo. */
  const erro = (k: Chave) =>
    fields[k]?.join(" ") || (tocados.foi(k) ? locais[k] : undefined);
  const ok = (k: Chave) => !locais[k] && !!data[k] && !fields[k];
  const blur = (k: Chave) => ({ onBlur: () => tocados.tocar(k) });
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    tocados.tocarTodos();
    setError("");
    if (Object.keys(locais).length) {
      setError("Revise os campos destacados antes de salvar.");
      return;
    }
    setBusy(true);
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
    <div className="form-page">
      <FormProgressHeader
        voltar="Voltar para alunos"
        onVoltar={cancel}
        busy={busy}
        icone="user"
        eyebrow="Cadastro de alunos"
        titulo={initial ? "Editar cadastro" : "Novo aluno"}
        descricao={
          initial
            ? "Mantenha as informações atualizadas para o acompanhamento."
            : "O novo aluno entra na lista de espera até ser matriculado em uma oficina."
        }
        preenchidos={prontos}
        total={exigidos}
      />
      <form
        onSubmit={save}
        className="form-stack"
        data-dirty={dirty}
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
            icone="user"
            titulo="Identificação do aluno"
            descricao="Dados pessoais usados para localizar e acompanhar o aluno."
          >
            <ValidatedFormField
              rotulo="Nome completo do aluno"
              obrigatorio
              largo
              erro={erro("nome")}
              ok={ok("nome")}
            >
              {(p) => (
                <input
                  {...p}
                  {...blur("nome")}
                  maxLength={160}
                  autoComplete="off"
                  placeholder="Ex.: Ana Beatriz Souza"
                  value={data.nome}
                  onChange={(e) => mudar("nome", e.target.value)}
                />
              )}
            </ValidatedFormField>
            <ValidatedFormField
              rotulo="Data de nascimento"
              obrigatorio
              erro={erro("data_nascimento")}
              ok={ok("data_nascimento")}
            >
              {(p) => (
                <input
                  {...p}
                  {...blur("data_nascimento")}
                  type="date"
                  max={hoje()}
                  value={data.data_nascimento}
                  onChange={(e) => mudar("data_nascimento", e.target.value)}
                />
              )}
            </ValidatedFormField>
            <ValidatedFormField
              rotulo="CPF"
              dica="Opcional. Só números; a pontuação entra sozinha."
              erro={erro("cpf")}
              ok={ok("cpf")}
            >
              {(p) => (
                <input
                  {...p}
                  {...blur("cpf")}
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={data.cpf || ""}
                  onChange={(e) => mudar("cpf", mascaraCpf(e.target.value))}
                />
              )}
            </ValidatedFormField>
            <ValidatedFormField
              rotulo="Matrícula escolar"
              dica="Opcional. Número da matrícula na escola."
              largo
              erro={erro("matricula_escolar")}
            >
              {(p) => (
                <input
                  {...p}
                  maxLength={80}
                  value={data.matricula_escolar}
                  onChange={(e) => mudar("matricula_escolar", e.target.value)}
                />
              )}
            </ValidatedFormField>
          </FormSection>
          <FormSection
            icone="users"
            titulo="Responsável e contato"
            descricao="Quem responde pelo aluno e como falar com a família."
          >
            <ValidatedFormField
              rotulo="Nome do responsável"
              obrigatorio
              largo
              erro={erro("responsavel")}
              ok={ok("responsavel")}
            >
              {(p) => (
                <input
                  {...p}
                  {...blur("responsavel")}
                  maxLength={160}
                  value={data.responsavel}
                  onChange={(e) => mudar("responsavel", e.target.value)}
                />
              )}
            </ValidatedFormField>
            <ValidatedFormField
              rotulo="Parentesco ou vínculo"
              obrigatorio
              erro={erro("parentesco")}
              ok={ok("parentesco")}
            >
              {(p) => (
                <input
                  {...p}
                  {...blur("parentesco")}
                  maxLength={60}
                  list="parentescos"
                  placeholder="Mãe, pai, avó…"
                  value={data.parentesco}
                  onChange={(e) => mudar("parentesco", e.target.value)}
                />
              )}
            </ValidatedFormField>
            <datalist id="parentescos">
              {["Mãe", "Pai", "Avó", "Avô", "Tia", "Tio", "Irmã", "Irmão"].map(
                (v) => (
                  <option key={v} value={v} />
                ),
              )}
            </datalist>
            <ValidatedFormField
              rotulo="Telefone com DDD"
              obrigatorio
              erro={erro("telefone")}
              ok={ok("telefone")}
            >
              {(p) => (
                <input
                  {...p}
                  {...blur("telefone")}
                  type="tel"
                  inputMode="tel"
                  placeholder="(61) 99999-9999"
                  value={data.telefone}
                  onChange={(e) =>
                    mudar("telefone", mascaraTelefone(e.target.value))
                  }
                />
              )}
            </ValidatedFormField>
          </FormSection>
          <FormSection
            icone="wallet"
            titulo="Situação socioeconômica"
            descricao="Ajuda a priorizar vagas e encaminhamentos. Tudo opcional."
          >
            <ValidatedFormField
              rotulo="Renda familiar mensal (R$)"
              dica="Soma da renda de quem mora na casa."
              erro={erro("renda_familiar")}
            >
              {(p) => (
                <input
                  {...p}
                  {...blur("renda_familiar")}
                  inputMode="numeric"
                  placeholder="R$ 0,00"
                  value={moedaExibida(data.renda_familiar)}
                  onChange={(e) =>
                    mudar("renda_familiar", moedaDigitada(e.target.value, 10))
                  }
                />
              )}
            </ValidatedFormField>
            <Segmentado
              rotulo="Família participa de programas sociais?"
              opcoes={[
                { valor: "sim", rotulo: "Sim" },
                { valor: "nao", rotulo: "Não" },
              ]}
              valor={data.programas_sociais ? "sim" : "nao"}
              onChange={(v) => mudar("programas_sociais", v === "sim")}
            />
          </FormSection>
          <FormSection
            icone="book"
            titulo="Observações"
            descricao="Informações cadastrais úteis para a equipe."
          >
            <ValidatedFormField
              rotulo="Observações cadastrais"
              largo
              dica="Opcional. Não registre aqui relatos de atendimento."
              contador={[data.observacoes.length, 2000]}
              erro={erro("observacoes")}
            >
              {(p) => (
                <textarea
                  {...p}
                  maxLength={2000}
                  rows={4}
                  value={data.observacoes}
                  onChange={(e) => mudar("observacoes", e.target.value)}
                />
              )}
            </ValidatedFormField>
          </FormSection>
          {initial && (
            <FormSection
              icone="refresh"
              titulo="Situação do aluno"
              descricao="Inativar preserva o cadastro e todo o histórico."
            >
              <Segmentado
                rotulo="Situação"
                largo
                opcoes={(Object.keys(situacoes) as Status[]).map((k) => ({
                  valor: k,
                  rotulo: situacoes[k],
                }))}
                valor={status}
                onChange={(v) => {
                  setStatus(v);
                  setDirty(true);
                }}
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
          )}
        </fieldset>
        <FormFooter faltam={exigidos - prontos}>
          <button
            type="button"
            className="btn-outline"
            disabled={busy}
            onClick={cancel}
          >
            Cancelar
          </button>
          <button className="btn-primary" disabled={busy}>
            <Icon name="save" />
            {busy
              ? "Salvando…"
              : initial
                ? "Salvar alterações"
                : "Cadastrar aluno"}
          </button>
        </FormFooter>
      </form>
    </div>
  );
}
