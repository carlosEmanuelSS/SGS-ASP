import { useEffect, useState } from "react";
import { api, mensagem } from "../../api";
import { Icon } from "../../Icon";
import { mascaraTelefone } from "../../forms";
import { Esqueleto, iniciais, tomAvatar } from "../../ui";

type Educador = {
  id: number;
  nome: string;
  usuario: string;
  email: string;
  ativo: boolean;
  telefone: string;
  observacoes: string;
  oficinas: { id: string; nome: string; turma: string; ativa: boolean }[];
};

/** Consulta de educadores (só administradores). A edição fica no painel ADM. */
export function Educadores() {
  const [busca, setBusca] = useState("");
  const [lista, setLista] = useState<Educador[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    const timer = setTimeout(() => {
      void api<{ items: Educador[] }>(
        "educadores/?q=" + encodeURIComponent(busca),
        "GET",
        undefined,
        controller.signal,
      )
        .then((r) => setLista(r.items))
        .catch((e) => {
          if (!controller.signal.aborted) setError(mensagem(e));
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [busca]);
  return (
    <div className="educators-page">
      <header className="page-head">
        <div className="page-head-main">
          <span className="page-icon tone-blue" aria-hidden="true">
            <Icon name="school" />
          </span>
          <div>
            <span className="eyebrow-chip chip-neutral">Painel ADM</span>
            <h1>Educadores</h1>
            <p>
              Contato e oficinas de cada educador. Para incluir ou editar, use
              Administrar usuários.
            </p>
          </div>
        </div>
      </header>
      <section className="card data-card toolbar-card">
        <div className="data-toolbar">
          <label className="search-field">
            <span className="sr-only">Buscar educador</span>
            <Icon name="search" />
            <input
              type="search"
              value={busca}
              maxLength={160}
              placeholder="Buscar por nome, usuário ou e-mail"
              onChange={(e) => setBusca(e.target.value)}
            />
          </label>
          {lista && (
            <span className="count-badge">
              {lista.length} {lista.length === 1 ? "educador" : "educadores"}
            </span>
          )}
        </div>
      </section>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!lista ? (
        !error && <Esqueleto tipo="tabela" linhas={3} />
      ) : !lista.length ? (
        <div className="card report-empty">
          <span aria-hidden="true">
            <Icon name="inbox" />
          </span>
          <strong>Nenhum educador encontrado.</strong>
          <p>
            Confira a busca, ou cadastre a conta em Administrar usuários e
            coloque-a no grupo Educador.
          </p>
        </div>
      ) : (
        <div className="educator-grid">
          {lista.map((e) => (
            <article className="card educator-card" key={e.id}>
              <header className="educator-head">
                <span
                  className={`avatar avatar-${tomAvatar(e.nome)}`}
                  aria-hidden="true"
                >
                  {iniciais(e.nome)}
                </span>
                <div>
                  <h2>{e.nome}</h2>
                  <small>{e.usuario}</small>
                </div>
                <span
                  className={`status-badge ${e.ativo ? "badge-ativo" : "badge-inativo"}`}
                >
                  <span
                    className={`status-dot ${e.ativo ? "dot-ativo" : "dot-inativo"}`}
                    aria-hidden="true"
                  />
                  {e.ativo ? "Ativo" : "Inativo"}
                </span>
              </header>
              <dl className="educator-contact">
                <div>
                  <dt>E-mail</dt>
                  <dd>
                    {e.email || <span className="muted">Não informado</span>}
                  </dd>
                </div>
                <div>
                  <dt>Telefone</dt>
                  <dd>
                    {e.telefone ? (
                      mascaraTelefone(e.telefone)
                    ) : (
                      <span className="muted">Não informado</span>
                    )}
                  </dd>
                </div>
              </dl>
              {e.observacoes && (
                <p className="educator-notes">{e.observacoes}</p>
              )}
              <div className="educator-workshops">
                <h3>Oficinas vinculadas</h3>
                {e.oficinas.length ? (
                  <ul>
                    {e.oficinas.map((o) => (
                      <li key={o.id}>
                        <span>{o.nome}</span>
                        <small>
                          {o.turma}
                          {!o.ativa && " · inativa"}
                        </small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">Nenhuma oficina vinculada.</p>
                )}
              </div>
              <a
                className="btn-outline educator-edit"
                href={`/admin/auth/user/${e.id}/change/`}
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="pencil" />
                Editar cadastro
              </a>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
