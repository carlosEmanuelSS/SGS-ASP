import { useEffect, useState } from "react";
import { api, ApiError, mensagem } from "../../api";
import { Icon } from "../../Icon";
import { FormSection, ValidatedFormField } from "../../forms";

/** Campo de senha com botão para mostrar ou esconder o que foi digitado. */
function CampoSenha({
  rotulo,
  valor,
  onChange,
  autoComplete,
  erro,
  ok,
}: {
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
  autoComplete: string;
  erro?: string;
  ok?: boolean;
}) {
  const [visivel, setVisivel] = useState(false);
  return (
    <ValidatedFormField rotulo={rotulo} largo erro={erro} ok={ok}>
      {(p) => (
        <div className="password-input">
          <input
            {...p}
            type={visivel ? "text" : "password"}
            required
            maxLength={1024}
            autoComplete={autoComplete}
            value={valor}
            onChange={(e) => onChange(e.target.value)}
          />
          <button
            type="button"
            className="password-toggle"
            aria-label={
              (visivel ? "Esconder " : "Mostrar ") + rotulo.toLowerCase()
            }
            aria-pressed={visivel}
            onClick={() => setVisivel(!visivel)}
          >
            <Icon name={visivel ? "eyeOff" : "eye"} />
            {visivel ? "Esconder" : "Mostrar"}
          </button>
        </div>
      )}
    </ValidatedFormField>
  );
}

export function Senha() {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [erroAtual, setErroAtual] = useState("");
  const [erroNova, setErroNova] = useState("");
  const [notice, setNotice] = useState("");
  const dirty = !!(atual || nova || confirmacao);
  useEffect(() => {
    if (!dirty) return;
    const leave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty]);
  // Regras que dá para conferir na hora; "senha comum" e "parecida com seus dados"
  // só o servidor sabe, e aparecem embaixo do campo ao salvar.
  const regras = [
    { ok: nova.length >= 12, texto: "Pelo menos 12 caracteres" },
    { ok: !!nova && !/^\d+$/.test(nova), texto: "Não pode ter só números" },
    { ok: !!nova && nova !== atual, texto: "Diferente da senha atual" },
    {
      ok: !!nova && nova === confirmacao,
      texto: "Confirmação igual à nova senha",
    },
  ];
  const pronta = !!atual && regras.every((r) => r.ok);
  function limparErros() {
    setError("");
    setErroAtual("");
    setErroNova("");
    setNotice("");
  }
  return (
    <div className="form-page">
      <header className="page-head form-head">
        <div className="page-head-main">
          <span className="page-icon" aria-hidden="true">
            <Icon name="lock" />
          </span>
          <div>
            <h1>Alterar senha</h1>
            <p>
              Escolha uma senha exclusiva para este sistema. Ao salvar, outras
              sessões abertas com a sua conta são encerradas.
            </p>
          </div>
        </div>
      </header>
      <form
        className="form-stack"
        data-dirty={dirty}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          limparErros();
          if (!pronta) {
            setError("Confira os itens da lista antes de salvar.");
            return;
          }
          setBusy(true);
          void api("senha/", "POST", { atual, nova })
            .then(() => {
              setAtual("");
              setNova("");
              setConfirmacao("");
              setNotice(
                "Senha alterada. Outras sessões deverão entrar novamente.",
              );
            })
            .catch((e) => {
              if (!(e instanceof ApiError)) return setError(mensagem(e));
              const regrasServidor = Object.values(e.fields).flat().join(" ");
              if (regrasServidor) setErroNova(regrasServidor);
              else if (/atual/i.test(e.message)) {
                if (/diferente/i.test(e.message)) setErroNova(e.message);
                else setErroAtual(e.message);
              } else setError(e.message);
            })
            .finally(() => setBusy(false));
        }}
      >
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
        <fieldset disabled={busy}>
          <FormSection
            icone="user"
            titulo="Confirme que é você"
            descricao="Digite a senha que você usa hoje."
          >
            <CampoSenha
              rotulo="Senha atual"
              valor={atual}
              autoComplete="current-password"
              erro={erroAtual}
              onChange={(v) => {
                setAtual(v);
                setErroAtual("");
              }}
            />
          </FormSection>
          <FormSection
            icone="lock"
            titulo="Escolha a nova senha"
            descricao="Uma frase com palavras soltas é fácil de lembrar e difícil de adivinhar."
          >
            <CampoSenha
              rotulo="Nova senha"
              valor={nova}
              autoComplete="new-password"
              erro={erroNova}
              ok={regras[0].ok && regras[1].ok && regras[2].ok}
              onChange={(v) => {
                setNova(v);
                setErroNova("");
              }}
            />
            <CampoSenha
              rotulo="Confirmar nova senha"
              valor={confirmacao}
              autoComplete="new-password"
              ok={regras[3].ok}
              onChange={setConfirmacao}
            />
            <ul
              className="password-rules full"
              aria-label="Regras da nova senha"
            >
              {regras.map((r) => (
                <li key={r.texto} className={r.ok ? "ok" : undefined}>
                  <Icon name={r.ok ? "check" : "info"} />
                  {r.texto}
                  <span className="sr-only">
                    {r.ok ? " (atendida)" : " (pendente)"}
                  </span>
                </li>
              ))}
              <li className="note">
                <Icon name="lock" />
                Ao salvar, o sistema também recusa senhas muito comuns ou
                parecidas com seu nome de usuário.
              </li>
            </ul>
          </FormSection>
        </fieldset>
        <div className="form-actions-bar">
          <button className="btn-primary" disabled={busy}>
            <Icon name="save" />
            {busy ? "Salvando…" : "Salvar nova senha"}
          </button>
        </div>
      </form>
    </div>
  );
}
