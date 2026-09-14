import { useEffect, useState } from "react";
import { api, ApiError, mensagem } from "../../api";
export function Senha() {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const dirty = !!(atual || nova || confirmacao);
  useEffect(() => {
    if (!dirty) return;
    const leave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [dirty]);
  return (
    <>
      <div className="page-title">
        <div>
          <h1>Alterar senha</h1>
          <p>
            Use pelo menos 12 caracteres e uma senha exclusiva para este
            sistema.
          </p>
        </div>
      </div>
      <form
        className="card login-form form-card"
        data-dirty={dirty}
        onSubmit={(e) => {
          e.preventDefault();
          setError("");
          setNotice("");
          if (nova !== confirmacao) {
            setError("A confirmação não corresponde à nova senha.");
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
              setError(
                e instanceof ApiError
                  ? [e.message, ...Object.values(e.fields).flat()].join(" ")
                  : mensagem(e),
              );
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
        <label>
          Senha atual
          <input
            type="password"
            required
            autoComplete="current-password"
            maxLength={1024}
            value={atual}
            onChange={(e) => setAtual(e.target.value)}
          />
        </label>
        <label>
          Nova senha
          <input
            type="password"
            required
            minLength={12}
            maxLength={1024}
            autoComplete="new-password"
            value={nova}
            onChange={(e) => setNova(e.target.value)}
          />
        </label>
        <label>
          Confirmar nova senha
          <input
            type="password"
            required
            minLength={12}
            maxLength={1024}
            autoComplete="new-password"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
          />
        </label>
        <button disabled={busy}>
          {busy ? "Salvando…" : "Salvar nova senha"}
        </button>
      </form>
    </>
  );
}
