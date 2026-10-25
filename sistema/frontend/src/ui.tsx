import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "./Icon";
import type { IconName } from "./Icon";

const movimentoReduzido = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Anima de forma suave do valor anterior até `alvo`; sem animação se o usuário pede movimento reduzido. */
export function useContagem(alvo: number, duracao = 900) {
  const [atual, setAtual] = useState(() => (movimentoReduzido() ? alvo : 0));
  const anterior = useRef(atual);
  useEffect(() => {
    const inicio = anterior.current;
    if (movimentoReduzido() || inicio === alvo || !Number.isFinite(alvo)) {
      anterior.current = alvo;
      setAtual(alvo);
      return;
    }
    let quadro = 0;
    const t0 = performance.now();
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - t0) / duracao);
      const suave = 1 - Math.pow(1 - t, 3);
      const valor = inicio + (alvo - inicio) * suave;
      anterior.current = valor;
      setAtual(t < 1 ? valor : alvo);
      if (t < 1) quadro = requestAnimationFrame(passo);
    };
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [alvo, duracao]);
  return atual;
}

/** Iniciais para avatar (ignora "da", "de", "dos"…). */
export const iniciais = (nome: string) =>
  nome
    .trim()
    .split(/\s+/)
    .filter((parte) => parte.length > 2 || /^[A-ZÀ-Ú]/.test(parte))
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase() ||
  nome.trim().charAt(0).toUpperCase() ||
  "?";

/** Cor estável por nome: a mesma pessoa mantém a mesma cor de avatar. */
export const tomAvatar = (nome: string) =>
  [...nome].reduce((soma, c) => soma + c.charCodeAt(0), 0) % 5;

/** Anel de progresso minimalista em SVG que se preenche até o percentual. */
export function Anel({ percentual }: { percentual: number }) {
  const atual = useContagem(Math.min(Math.max(percentual, 0), 100));
  const raio = 22;
  const volta = 2 * Math.PI * raio;
  return (
    <svg
      className="ring-svg"
      viewBox="0 0 56 56"
      width="56"
      height="56"
      role="img"
      aria-label={`Ocupação de ${percentual}%`}
    >
      <circle className="ring-track" cx="28" cy="28" r={raio} />
      <circle
        className="ring-value"
        cx="28"
        cy="28"
        r={raio}
        strokeDasharray={volta}
        strokeDashoffset={volta * (1 - atual / 100)}
        transform="rotate(-90 28 28)"
      />
    </svg>
  );
}

/** Número que conta até o valor final. Leitores de tela recebem só o valor final. */
export function Contador({
  valor,
  sufixo = "",
}: {
  valor: number;
  sufixo?: string;
}) {
  const atual = useContagem(valor);
  return (
    <>
      <span aria-hidden="true">
        {Math.round(atual).toLocaleString("pt-BR")}
        {sufixo}
      </span>
      <span className="sr-only">
        {valor.toLocaleString("pt-BR")}
        {sufixo}
      </span>
    </>
  );
}

export type Modulo =
  | "painel"
  | "alunos"
  | "oficinas"
  | "frequencia"
  | "atendimentos"
  | "doacoes"
  | "relatorios";

const icones: Record<Modulo, IconName> = {
  painel: "home",
  alunos: "users",
  oficinas: "book",
  frequencia: "calendar",
  atendimentos: "heart",
  doacoes: "gift",
  relatorios: "chart",
};

export type ItemResumo = { rotulo: string; valor: ReactNode; tom?: string };

export function CabecalhoModulo({
  modulo,
  eyebrow,
  titulo,
  descricao,
  acao,
  resumo,
}: {
  modulo: Modulo;
  eyebrow: string;
  titulo: string;
  descricao: string;
  acao?: ReactNode;
  resumo?: ItemResumo[];
}) {
  return (
    <header className={`module-header tone-${modulo}`}>
      <div className="module-header-main">
        <span className="module-icon">
          <Icon name={icones[modulo]} />
        </span>
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{titulo}</h1>
          <p>{descricao}</p>
        </div>
        {acao && <div className="module-actions">{acao}</div>}
      </div>
      {resumo && resumo.length > 0 && (
        <dl className="module-summary">
          {resumo.map((r, i) => (
            <div key={r.rotulo} style={{ ["--i" as string]: i }}>
              <dt>
                {r.tom && (
                  <span className={`dot ${r.tom}`} aria-hidden="true" />
                )}
                {r.rotulo}
              </dt>
              <dd>
                {typeof r.valor === "number" ? (
                  <Contador valor={r.valor} />
                ) : (
                  r.valor
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </header>
  );
}

/** Nível de ocupação: normal até 79%, atenção de 80% a 99%, lotada em 100%. */
export function nivel(percentual: number) {
  return percentual >= 100 ? "full" : percentual >= 80 ? "warn" : "ok";
}

export function Barra({
  valor,
  max,
  rotulo,
  texto,
}: {
  valor: number;
  max: number;
  rotulo: string;
  texto?: string;
}) {
  const p = max > 0 ? Math.round((valor / max) * 100) : 0;
  const n = nivel(p);
  const situacao = situacoesOcupacao[n];
  return (
    <div
      className={`meter meter-${n}`}
      data-tip={`${rotulo}: ${valor} de ${max} vagas (${p}%)`}
    >
      <div
        className="meter-track"
        role="meter"
        aria-label={rotulo}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={valor}
        aria-valuetext={`${valor} de ${max} vagas, ${situacao.rotulo}`}
      >
        <span
          className="meter-fill"
          style={{ width: `${Math.min(p, 100)}%` }}
        />
        <i className="meter-mark" aria-hidden="true" />
      </div>
      <div className="meter-info">
        <span className="meter-value">
          {texto ?? `${valor} de ${max}`}
          <small> · {p}%</small>
        </span>
        <span className={`status-chip status-${n}`}>
          <Icon name={situacao.icone} />
          {situacao.rotulo}
        </span>
      </div>
    </div>
  );
}

const situacoesOcupacao: Record<
  "ok" | "warn" | "full",
  { rotulo: string; icone: IconName }
> = {
  ok: { rotulo: "Com vagas", icone: "check" },
  warn: { rotulo: "Quase cheia", icone: "clock" },
  full: { rotulo: "Lotada", icone: "alert" },
};

/** Barra simples de proporção, sem semântica de lotação (frequência, tipos). */
export function Proporcao({
  valor,
  max,
  rotulo,
  tom = "ok",
}: {
  valor: number;
  max: number;
  rotulo: string;
  tom?: string;
}) {
  const p = max > 0 ? Math.round((valor / max) * 100) : 0;
  return (
    <div
      className={`bar-track mini tone-bar-${tom}${valor ? "" : " vazia"}`}
      role="img"
      aria-label={`${rotulo}: ${valor}`}
      data-tip={`${rotulo}: ${valor}`}
    >
      <span style={{ width: `${Math.min(p, 100)}%` }} />
    </div>
  );
}

export function BarraTopo() {
  return (
    <div className="top-loader" aria-hidden="true">
      <span />
    </div>
  );
}

export function Esqueleto({
  tipo,
  linhas = 5,
}: {
  tipo: "painel" | "tabela" | "cartoes";
  linhas?: number;
}) {
  return (
    <div className={`skeleton skeleton-${tipo}`} role="status">
      <span className="sr-only">Carregando…</span>
      <BarraTopo />
      {tipo === "painel" && (
        <>
          <span className="sk sk-hero" />
          <div className="sk-grid-4">
            {[0, 1, 2, 3].map((i) => (
              <span className="sk sk-card" key={i} />
            ))}
          </div>
          <div className="sk-grid-3">
            <span className="sk sk-block wide" />
            <span className="sk sk-block" />
          </div>
        </>
      )}
      {tipo === "tabela" &&
        Array.from({ length: linhas }, (_, i) => (
          <span className="sk sk-row" key={i} />
        ))}
      {tipo === "cartoes" && (
        <div className="sk-grid-3">
          {Array.from({ length: linhas }, (_, i) => (
            <span className="sk sk-card tall" key={i} />
          ))}
        </div>
      )}
    </div>
  );
}
