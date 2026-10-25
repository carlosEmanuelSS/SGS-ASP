import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { api, mensagem } from "./api";
import type { User } from "./api";
import { Alunos } from "./features/alunos/Alunos";
import { Oficinas } from "./features/oficinas/Oficinas";
import { Frequencia } from "./features/frequencia/Frequencia";
import { Registros } from "./features/gestao/Registros";
import { Relatorios } from "./features/gestao/Relatorios";
import { VisaoGeral } from "./features/gestao/VisaoGeral";
import { Icon } from "./Icon";
import logoAsp from "./assets/logo-asp.png";
import mascoteAsp from "./assets/mascote-asp.png";
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
/** Primeira tela após o login: Visão geral para quem vê indicadores. */
function inicial(user: User): Modulo {
  if (user.pode_ver_indicadores) return "painel";
  if (!user.pode_ver_alunos && user.pode_ver_frequencia) return "frequencia";
  return "alunos";
}
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [ajudaSenha, setAjudaSenha] = useState(false);
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
  useEffect(() => {
    if (!menuAberto) return;
    const sidebar = document.getElementById("navigation-sidebar");
    const toggle = document.querySelector<HTMLButtonElement>(".menu-toggle");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebar?.querySelector<HTMLButtonElement>(".drawer-close")?.focus();
    const close = () => {
      setMenuAberto(false);
      toggle?.focus();
    };
    const media = window.matchMedia("(min-width: 961px)");
    const resize = () => {
      if (media.matches) setMenuAberto(false);
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
      if (event.key === "Tab") {
        const items = sidebar?.querySelectorAll<HTMLElement>(
          "a[href], button:not(:disabled)",
        );
        if (!items?.length) return;
        const first = items[0],
          last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", keyboard);
    media.addEventListener("change", resize);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", keyboard);
      media.removeEventListener("change", resize);
      if (!media.matches) toggle?.focus();
    };
  }, [menuAberto]);
  async function check() {
    setChecking(true);
    setError("");
    try {
      const current = (await api<{ user: User | null }>("session/")).user;
      setUser(current);
      if (current) setModulo(inicial(current));
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
      setMenuAberto(false);
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
      setModulo(inicial(result.user));
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
        <form className="login-card" onSubmit={entrar}>
          <img
            className="login-mascote"
            src={mascoteAsp}
            alt=""
            width={380}
            height={354}
          />
          <h1>Bem-vindo ao Portal ASP</h1>
          <p className="login-subtitle">Ação Social do Planalto · Desde 1963</p>
          {error && (
            <div className="error" role="alert">
              {error}
            </div>
          )}
          <label className="login-field">
            <span className="login-field-icon" aria-hidden="true">
              <Icon name="user" />
            </span>
            <span className="login-field-label">Usuário</span>
            <input
              name="username"
              autoComplete="username"
              placeholder="Nome de usuário"
              required
              maxLength={150}
            />
          </label>
          <label className="login-field">
            <span className="login-field-icon" aria-hidden="true">
              <Icon name="lock" />
            </span>
            <span className="login-field-label">Senha</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Sua senha"
              required
              maxLength={1024}
            />
          </label>
          <button
            type="button"
            className="link login-forgot"
            aria-expanded={ajudaSenha}
            onClick={() => setAjudaSenha(!ajudaSenha)}
          >
            Esqueci minha senha?
          </button>
          {ajudaSenha && (
            <p className="login-hint" role="status">
              Peça ao administrador do sistema para redefinir sua senha.
            </p>
          )}
          <button className="login-submit" disabled={busy}>
            {busy ? "Entrando…" : "Entrar"}
          </button>
          <p className="login-help">
            Não tem acesso? Solicite à administração da ASP.
          </p>
          <button
            type="button"
            className="link login-check"
            disabled={busy}
            onClick={() => void check()}
          >
            Verificar conexão
          </button>
        </form>
        <p className="login-footer">
          <img src={logoAsp} alt="" width={28} height={28} />
          SGS ASP · Sistema de Gestão Social
        </p>
      </main>
    );
  return (
    <div className="app-shell">
      <header
        className="app-header"
        inert={menuAberto}
        aria-hidden={menuAberto || undefined}
      >
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
          <span className="user-avatar" aria-hidden="true">
            <Icon name="user" />
          </span>
          <span className="user-name">{user.nome}</span>
        </div>
      </header>
      {menuAberto && (
        <div
          className="sidebar-backdrop"
          aria-hidden="true"
          onClick={() => setMenuAberto(false)}
        />
      )}
      <aside
        id="navigation-sidebar"
        className={`sidebar${menuAberto ? " is-open" : ""}`}
        role={menuAberto ? "dialog" : undefined}
        aria-modal={menuAberto || undefined}
        aria-label={menuAberto ? "Navegação do sistema" : undefined}
      >
        <button
          className="secondary drawer-close"
          onClick={() => setMenuAberto(false)}
          aria-label="Fechar menu"
        >
          <Icon name="close" />
        </button>
        <a className="brand" href="/">
          <span className="brand-mark">
            <img src={logoAsp} alt="" width={40} height={40} />
          </span>
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
              <Icon name="home" />
              Visão geral
            </button>
          )}
          {user.pode_ver_alunos && (
            <button
              className={modulo === "alunos" ? "selected" : ""}
              aria-current={modulo === "alunos" ? "page" : undefined}
              onClick={() => navegar("alunos")}
            >
              <Icon name="users" />
              Alunos
            </button>
          )}
          {user.pode_ver_oficinas && (
            <button
              className={modulo === "oficinas" ? "selected" : ""}
              aria-current={modulo === "oficinas" ? "page" : undefined}
              onClick={() => navegar("oficinas")}
            >
              <Icon name="book" />
              Oficinas e matrículas
            </button>
          )}
          {user.pode_ver_frequencia && (
            <button
              className={modulo === "frequencia" ? "selected" : ""}
              aria-current={modulo === "frequencia" ? "page" : undefined}
              onClick={() => navegar("frequencia")}
            >
              <Icon name="calendar" />
              Frequência
            </button>
          )}
          {user.pode_ver_atendimentos && (
            <button
              className={modulo === "atendimentos" ? "selected" : ""}
              aria-current={modulo === "atendimentos" ? "page" : undefined}
              onClick={() => navegar("atendimentos")}
            >
              <Icon name="heart" />
              Atendimentos
            </button>
          )}
          {user.pode_ver_doacoes && (
            <button
              className={modulo === "doacoes" ? "selected" : ""}
              aria-current={modulo === "doacoes" ? "page" : undefined}
              onClick={() => navegar("doacoes")}
            >
              <Icon name="gift" />
              Doações
            </button>
          )}
          {user.pode_ver_indicadores && (
            <button
              className={modulo === "relatorios" ? "selected" : ""}
              aria-current={modulo === "relatorios" ? "page" : undefined}
              onClick={() => navegar("relatorios")}
            >
              <Icon name="chart" />
              Relatórios
            </button>
          )}
        </nav>
        <div className="sidebar-actions">
          {user.administrador && (
            <a href="/admin/" target="_blank" rel="noreferrer">
              <Icon name="user" />
              Administrar usuários
            </a>
          )}
          <button className="secondary" onClick={() => navegar("senha")}>
            <Icon name="lock" />
            Alterar senha
          </button>
          <button
            className="secondary"
            onClick={() => void sair()}
            disabled={busy}
          >
            <Icon name="logout" />
            Sair
          </button>
        </div>
      </aside>
      <main
        className="workspace"
        inert={menuAberto}
        aria-hidden={menuAberto || undefined}
      >
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        {modulo === "senha" ? (
          <Senha />
        ) : modulo === "painel" && user.pode_ver_indicadores ? (
          <VisaoGeral user={user} onNavegar={navegar} />
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
      <footer inert={menuAberto} aria-hidden={menuAberto || undefined}>
        Ação Social do Planalto · Sistema de Gestão Social
      </footer>
    </div>
  );
}
