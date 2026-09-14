import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, mensagem } from "./api";
import type { User } from "./api";
import { Alunos } from "./features/alunos/Alunos";
import { Oficinas } from "./features/oficinas/Oficinas";
import { Frequencia } from "./features/frequencia/Frequencia";
import { Registros } from "./features/gestao/Registros";
import { Relatorios } from "./features/gestao/Relatorios";
import { Senha } from "./features/gestao/Senha";
type Modulo =
  | "alunos"
  | "oficinas"
  | "frequencia"
  | "atendimentos"
  | "doacoes"
  | "painel"
  | "relatorios"
  | "senha";
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [modulo, setModulo] = useState<Modulo>("alunos");
  function navegar(next: Modulo) {
    if (next === modulo) {
      setMenuAberto(false);
      return;
    }
    if (
      document.querySelector('form[data-dirty="true"]') &&
      !window.confirm("Descartar as alterações ainda não salvas?")
    )
      return;
    setModulo(next);
    setMenuAberto(false);
  }
  async function check() {
    setChecking(true);
    setError("");
    try {
      const current = (await api<{ user: User | null }>("session/")).user;
      setUser(current);
      if (current && !current.pode_ver_alunos && current.pode_ver_frequencia)
        setModulo("frequencia");
    } catch (e) {
      setError(mensagem(e));
    } finally {
      setChecking(false);
    }
  }
  useEffect(() => {
    void check();
    const expired = () => {
      setUser(null);
      setError("Sua sessão expirou. Entre novamente.");
    };
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, []);
  async function entrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await api("session/");
      const result = await api<{ user: User }>(
        "login/",
        "POST",
        Object.fromEntries(form),
      );
      setUser(result.user);
      if (!result.user.pode_ver_alunos && result.user.pode_ver_frequencia)
        setModulo("frequencia");
    } catch (e) {
      setError(mensagem(e));
    } finally {
      setBusy(false);
    }
  }
  async function sair() {
    if (
      document.querySelector('form[data-dirty="true"]') &&
      !window.confirm("Descartar as alterações ainda não salvas e sair?")
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api("logout/", "POST");
      setUser(null);
      setMenuAberto(false);
    } catch (e) {
      setError(mensagem(e));
    } finally {
      setBusy(false);
    }
  }
  if (checking)
    return (
      <main className="login">
        <p role="status">Carregando o sistema…</p>
      </main>
    );
  if (!user)
    return (
      <main className="login">
        <div className="login-intro">
          <span className="brand-mark">A</span>
          <p className="eyebrow">AÇÃO SOCIAL DO PLANALTO</p>
          <h1>
            Cuidar começa
            <br />
            por conhecer.
          </h1>
          <p>
            Informações organizadas para acompanhar cada aluno e sua família.
          </p>
        </div>
        <form className="card login-form" onSubmit={entrar}>
          <p className="eyebrow">SGS ASP</p>
          <h2>Acesse sua conta</h2>
          <p>Use o acesso fornecido pela administração.</p>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <label>
            Usuário
            <input
              name="username"
              autoComplete="username"
              required
              maxLength={150}
            />
          </label>
          <label>
            Senha
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={1024}
            />
          </label>
          <button disabled={busy}>
            {busy ? "Entrando…" : "Entrar no sistema"}
          </button>
          <button
            type="button"
            className="link"
            disabled={busy}
            onClick={() => void check()}
          >
            Verificar conexão
          </button>
        </form>
      </main>
    );
  return (
    <div className="app-shell">
      <header className="app-header">
        <button
          className="secondary menu-toggle"
          aria-expanded={menuAberto}
          aria-controls="navigation-sidebar"
          onClick={() => setMenuAberto(!menuAberto)}
        >
          {menuAberto ? "Fechar menu" : "Menu"}
        </button>
        <span className="app-caption">Sistema de Gestão Social</span>
        <div className="user">
          <span>{user.nome}</span>
        </div>
      </header>
      <aside
        id="navigation-sidebar"
        className={`sidebar${menuAberto ? " is-open" : ""}`}
        onKeyDown={(event) => {
          if (event.key === "Escape" && menuAberto) {
            setMenuAberto(false);
            document.querySelector<HTMLButtonElement>(".menu-toggle")?.focus();
          }
        }}
      >
        <a className="brand" href="/">
          <span className="brand-mark">A</span>
          <span>
            ASP <small>Gestão Social</small>
          </span>
        </a>
        <nav className="module-nav" aria-label="Módulos do sistema">
          {user.pode_ver_indicadores && (
            <button
              className={modulo === "painel" ? "selected" : ""}
              aria-current={modulo === "painel" ? "page" : undefined}
              onClick={() => navegar("painel")}
            >
              Visão geral
            </button>
          )}
          {user.pode_ver_alunos && (
            <button
              className={modulo === "alunos" ? "selected" : ""}
              aria-current={modulo === "alunos" ? "page" : undefined}
              onClick={() => navegar("alunos")}
            >
              Alunos
            </button>
          )}
          {user.pode_ver_oficinas && (
            <button
              className={modulo === "oficinas" ? "selected" : ""}
              aria-current={modulo === "oficinas" ? "page" : undefined}
              onClick={() => navegar("oficinas")}
            >
              Oficinas e matrículas
            </button>
          )}
          {user.pode_ver_frequencia && (
            <button
              className={modulo === "frequencia" ? "selected" : ""}
              aria-current={modulo === "frequencia" ? "page" : undefined}
              onClick={() => navegar("frequencia")}
            >
              Frequência
            </button>
          )}
          {user.pode_ver_atendimentos && (
            <button
              className={modulo === "atendimentos" ? "selected" : ""}
              aria-current={modulo === "atendimentos" ? "page" : undefined}
              onClick={() => navegar("atendimentos")}
            >
              Atendimentos
            </button>
          )}
          {user.pode_ver_doacoes && (
            <button
              className={modulo === "doacoes" ? "selected" : ""}
              aria-current={modulo === "doacoes" ? "page" : undefined}
              onClick={() => navegar("doacoes")}
            >
              Doações
            </button>
          )}
          {user.pode_ver_indicadores && (
            <button
              className={modulo === "relatorios" ? "selected" : ""}
              aria-current={modulo === "relatorios" ? "page" : undefined}
              onClick={() => navegar("relatorios")}
            >
              Relatórios
            </button>
          )}
        </nav>
        <div className="sidebar-actions">
          {user.administrador && (
            <a href="/admin/" target="_blank" rel="noreferrer">
              Administrar usuários
            </a>
          )}
          <button className="secondary" onClick={() => navegar("senha")}>
            Alterar senha
          </button>
          <button
            className="secondary"
            onClick={() => void sair()}
            disabled={busy}
          >
            Sair
          </button>
        </div>
      </aside>
      <main className="workspace">
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {modulo === "senha" ? (
          <Senha />
        ) : modulo === "painel" && user.pode_ver_indicadores ? (
          <Relatorios painel />
        ) : modulo === "relatorios" && user.pode_ver_indicadores ? (
          <Relatorios />
        ) : modulo === "atendimentos" && user.pode_ver_atendimentos ? (
          <Registros key="atendimentos" tipo="atendimentos" user={user} />
        ) : modulo === "doacoes" && user.pode_ver_doacoes ? (
          <Registros key="doacoes" tipo="doacoes" user={user} />
        ) : modulo === "oficinas" && user.pode_ver_oficinas ? (
          <Oficinas user={user} />
        ) : modulo === "frequencia" && user.pode_ver_frequencia ? (
          <Frequencia user={user} />
        ) : user.pode_ver_alunos ? (
          <Alunos user={user} />
        ) : (
          <p>
            Seu usuário não possui acesso aos módulos disponíveis. Consulte a
            administração.
          </p>
        )}
      </main>
      <footer>Ação Social do Planalto · Sistema de Gestão Social</footer>
    </div>
  );
}
