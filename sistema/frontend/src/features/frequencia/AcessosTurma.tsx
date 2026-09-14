import { useEffect, useState } from "react";
import { api, mensagem } from "../../api";
import type { Acessos } from "./types";
export function AcessosTurma({ id }: { id: string }) {
  const [dados, setDados] = useState<Acessos | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const ctrl = new AbortController();
    void api<Acessos>(
      `frequencia/turmas/${id}/responsaveis/`,
      "GET",
      undefined,
      ctrl.signal,
    )
      .then((d) => {
        setDados(d);
        setSelected(d.usuarios);
      })
      .catch((e) => {
        if (!ctrl.signal.aborted) setError(mensagem(e));
      });
    return () => ctrl.abort();
  }, [id, revision]);
  async function save() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const d = await api<Acessos>(
        `frequencia/turmas/${id}/responsaveis/`,
        "PUT",
        { usuarios: selected, anteriores: dados?.usuarios },
      );
      setDados(d);
      setSelected(d.usuarios);
      setNotice("Acessos dos educadores atualizados.");
    } catch (e) {
      setError(mensagem(e));
    } finally {
      setBusy(false);
    }
  }
  const dirty =
    !!dados &&
    [...selected].sort().join(",") !== [...dados.usuarios].sort().join(",");
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  return (
    <details className="card attendance-access">
      <summary>Educadores com acesso a esta turma</summary>
      <p>
        Vincule as contas que poderão consultar e registrar chamadas. Crie as
        contas e atribua o grupo Educador na administração de usuários.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}{" "}
          <button
            className="link"
            onClick={() => {
              setError("");
              setRevision((v) => v + 1);
            }}
          >
            Recarregar vínculos
          </button>
        </p>
      )}
      {notice && (
        <p className="success" role="status">
          {notice}
        </p>
      )}
      {!dados ? (
        <p>Carregando contas…</p>
      ) : (
        <form
          data-dirty={dirty}
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          <fieldset disabled={busy}>
            <legend>Contas de educadores</legend>
            {!dados.opcoes.length && (
              <p>Nenhuma conta do grupo Educador cadastrada.</p>
            )}
            <div className="access-options">
              {dados.opcoes.map((u) => (
                <label className="checkbox" key={u.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(u.id)}
                    disabled={!u.disponivel && !selected.includes(u.id)}
                    onChange={(e) =>
                      setSelected((s) =>
                        e.target.checked
                          ? [...s, u.id]
                          : s.filter((i) => i !== u.id),
                      )
                    }
                  />
                  {u.nome} ({u.usuario})
                  {!u.disponivel
                    ? " — conta indisponível; remova o vínculo"
                    : ""}
                </label>
              ))}
            </div>
          </fieldset>
          <button disabled={busy || !dirty}>
            {busy ? "Salvando…" : "Salvar acessos"}
          </button>
        </form>
      )}
    </details>
  );
}
